"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { run, UserError, type ActionResult } from "@/lib/action";
import { actionAdmin, actionStaff } from "@/lib/auth/session";
import { inviteCode } from "@/lib/crypto";
import { emails } from "@/lib/mail";
import { saveSettings } from "@/lib/settings";
import { ownedMedia } from "@/lib/media";
import { audit, notify } from "@/lib/social";
import { idSchema, urlSchema } from "@/lib/validation";

// ─── Reports & content ──────────────────────────────────────────────────

async function closeReports(targetType: "POST" | "COMMENT" | "USER" | "LISTING" | "MESSAGE", targetId: string, staffId: string, resolution: string, status: "ACTIONED" | "DISMISSED") {
  await db.report.updateMany({
    where: { targetType, targetId, status: "OPEN" },
    data: { status, resolution, resolvedById: staffId, resolvedAt: new Date() },
  });
}

export async function dismissReport(input: { id: string }): Promise<ActionResult> {
  return run(async () => {
    const staff = await actionStaff();
    const report = await db.report.findUnique({ where: { id: idSchema.parse(input.id) } });
    if (!report) throw new UserError("Report not found.");
    await closeReports(report.targetType, report.targetId, staff.id, "Dismissed", "DISMISSED");
    await audit(staff.id, "report.dismiss", report.targetType, report.targetId);
    return null;
  });
}

const removeSchema = z.object({
  targetType: z.enum(["POST", "COMMENT", "LISTING", "MESSAGE"]),
  targetId: idSchema,
  reason: z.string().trim().max(300).optional(),
});

/** Takes down a piece of content and tells the author why. */
export async function removeContent(input: z.input<typeof removeSchema>): Promise<ActionResult> {
  return run(async () => {
    const staff = await actionStaff();
    const { targetType, targetId, reason } = removeSchema.parse(input);
    const note = reason || "It breaks our community guidelines.";

    if (targetType === "POST") {
      const post = await db.post.update({ where: { id: targetId }, data: { status: "REMOVED" } });
      await notify({ userId: post.authorId, type: "CONTENT_REMOVED", postId: post.id, text: note });
    } else if (targetType === "COMMENT") {
      const comment = await db.comment.findUnique({ where: { id: targetId } });
      if (comment) {
        await db.$transaction([
          db.comment.delete({ where: { id: comment.id } }),
          db.post.updateMany({ where: { id: comment.postId, commentCount: { gt: 0 } }, data: { commentCount: { decrement: 1 } } }),
        ]);
        await notify({ userId: comment.authorId, type: "CONTENT_REMOVED", text: `Your comment “${comment.text.slice(0, 60)}” was removed. ${note}` });
      }
    } else if (targetType === "LISTING") {
      const listing = await db.listing.update({ where: { id: targetId }, data: { status: "REMOVED" } });
      await notify({ userId: listing.sellerId, type: "CONTENT_REMOVED", text: `Your listing “${listing.title}” was removed. ${note}` });
    } else {
      await db.message.update({ where: { id: targetId }, data: { deletedAt: new Date(), text: "", mediaId: null } });
    }
    await closeReports(targetType, targetId, staff.id, `Removed: ${note}`, "ACTIONED");
    await audit(staff.id, "content.remove", targetType, targetId, { reason: note });
    return null;
  });
}

/** Publishes a post that was held by automatic moderation. */
export async function approvePost(input: { id: string; sensitive: boolean }): Promise<ActionResult> {
  return run(async () => {
    const staff = await actionStaff();
    const post = await db.post.update({
      where: { id: idSchema.parse(input.id) },
      data: { status: "PUBLISHED", sensitive: input.sensitive },
    });
    await closeReports("POST", post.id, staff.id, "Approved", "DISMISSED");
    await audit(staff.id, "post.approve", "POST", post.id, { sensitive: input.sensitive });
    return null;
  });
}

// ─── Users ──────────────────────────────────────────────────────────────

export async function setBanned(input: { userId: string; banned: boolean; reason?: string }): Promise<ActionResult> {
  return run(async () => {
    const staff = await actionStaff();
    const userId = idSchema.parse(input.userId);
    if (userId === staff.id) throw new UserError("You can't ban yourself.");
    const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) throw new UserError("User not found.");
    if (target.role === "ADMIN" && staff.role !== "ADMIN") throw new UserError("Only admins can ban admins.");
    const reason = z.string().trim().max(300).optional().parse(input.reason) || null;
    await db.user.update({
      where: { id: userId },
      data: input.banned ? { bannedAt: new Date(), banReason: reason } : { bannedAt: null, banReason: null },
    });
    if (input.banned) {
      await db.session.deleteMany({ where: { userId } });
      await closeReports("USER", userId, staff.id, `Banned${reason ? `: ${reason}` : ""}`, "ACTIONED");
    }
    await audit(staff.id, input.banned ? "user.ban" : "user.unban", "USER", userId, { reason });
    return null;
  });
}

export async function setVerifiedBadge(input: { userId: string; verified: boolean }): Promise<ActionResult> {
  return run(async () => {
    const staff = await actionStaff();
    const userId = idSchema.parse(input.userId);
    await db.user.update({ where: { id: userId }, data: { verified: input.verified, verifiedAt: input.verified ? new Date() : null } });
    if (input.verified) await notify({ userId, type: "VERIFIED" });
    await audit(staff.id, input.verified ? "user.verify" : "user.unverify", "USER", userId);
    return null;
  });
}

export async function setRole(input: { userId: string; role: "USER" | "MODERATOR" | "ADMIN" }): Promise<ActionResult> {
  return run(async () => {
    const admin = await actionAdmin();
    const userId = idSchema.parse(input.userId);
    if (userId === admin.id) throw new UserError("You can't change your own role.");
    const role = z.enum(["USER", "MODERATOR", "ADMIN"]).parse(input.role);
    await db.user.update({ where: { id: userId }, data: { role } });
    await audit(admin.id, "user.role", "USER", userId, { role });
    return null;
  });
}

// ─── Verification requests ──────────────────────────────────────────────

export async function reviewVerification(input: { id: string; approve: boolean; note?: string }): Promise<ActionResult> {
  return run(async () => {
    const staff = await actionStaff();
    const req = await db.verificationRequest.findUnique({ where: { id: idSchema.parse(input.id) } });
    if (!req || req.status !== "PENDING") throw new UserError("This request was already reviewed.");
    const note = z.string().trim().max(300).optional().parse(input.note) || null;
    await db.verificationRequest.update({
      where: { id: req.id },
      data: { status: input.approve ? "APPROVED" : "REJECTED", reviewNote: note, reviewedById: staff.id, reviewedAt: new Date() },
    });
    if (input.approve) {
      await db.user.update({ where: { id: req.userId }, data: { verified: true, verifiedAt: new Date() } });
      await notify({ userId: req.userId, type: "VERIFIED" });
    } else {
      await notify({ userId: req.userId, type: "VERIFICATION_REJECTED", text: note });
    }
    await audit(staff.id, input.approve ? "verification.approve" : "verification.reject", "USER", req.userId, { note });
    return null;
  });
}

// ─── Invites & waitlist ─────────────────────────────────────────────────

const inviteSchema = z.object({
  count: z.coerce.number().int().min(1).max(100),
  maxUses: z.coerce.number().int().min(1).max(10_000),
  expiresInDays: z.coerce.number().int().min(0).max(365),
  note: z.string().trim().max(200).optional(),
});

export async function createInvites(input: z.input<typeof inviteSchema>): Promise<ActionResult<{ codes: string[] }>> {
  return run(async () => {
    const staff = await actionStaff();
    const data = inviteSchema.parse(input);
    const expiresAt = data.expiresInDays ? new Date(Date.now() + data.expiresInDays * 86_400_000) : null;
    const codes: string[] = [];
    while (codes.length < data.count) {
      const code = inviteCode();
      if (await db.invite.count({ where: { code } })) continue;
      await db.invite.create({ data: { code, maxUses: data.maxUses, expiresAt, note: data.note || null, createdById: null } });
      codes.push(code);
    }
    await audit(staff.id, "invite.create", undefined, undefined, { count: data.count, maxUses: data.maxUses });
    return { codes };
  });
}

export async function setInviteDisabled(input: { id: string; disabled: boolean }): Promise<ActionResult> {
  return run(async () => {
    const staff = await actionStaff();
    await db.invite.update({ where: { id: idSchema.parse(input.id) }, data: { disabled: input.disabled } });
    await audit(staff.id, input.disabled ? "invite.disable" : "invite.enable", "INVITE", input.id);
    return null;
  });
}

export async function inviteFromWaitlist(input: { id: string }): Promise<ActionResult<{ code: string }>> {
  return run(async () => {
    const staff = await actionStaff();
    const entry = await db.waitlistEntry.findUnique({ where: { id: idSchema.parse(input.id) } });
    if (!entry) throw new UserError("Entry not found.");
    let code = inviteCode();
    while (await db.invite.count({ where: { code } })) code = inviteCode();
    await db.invite.create({
      data: { code, maxUses: 1, expiresAt: new Date(Date.now() + 30 * 86_400_000), note: `Waitlist: ${entry.email}` },
    });
    await emails.invite(entry.email, entry.name.split(" ")[0], code, `${env.appUrl}/signup?invite=${code}`);
    await db.waitlistEntry.update({ where: { id: entry.id }, data: { status: "INVITED", invitedAt: new Date() } });
    await audit(staff.id, "waitlist.invite", "WAITLIST", entry.id, { email: entry.email });
    return { code };
  });
}

export async function rejectWaitlist(input: { id: string }): Promise<ActionResult> {
  return run(async () => {
    const staff = await actionStaff();
    await db.waitlistEntry.update({ where: { id: idSchema.parse(input.id) }, data: { status: "REJECTED" } });
    await audit(staff.id, "waitlist.reject", "WAITLIST", input.id);
    return null;
  });
}

// ─── Ads ────────────────────────────────────────────────────────────────

const adSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(2, "Add a title.").max(100),
  body: z.string().trim().max(300).optional(),
  advertiser: z.string().trim().min(1, "Who is the advertiser?").max(80),
  linkUrl: urlSchema.refine((u) => Boolean(u), "Add a link."),
  ctaLabel: z.string().trim().max(30).optional(),
  placement: z.enum(["FEED", "SIDEBAR"]),
  active: z.boolean(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  imageMediaId: idSchema.nullish(),
  imageUrl: z.string().nullish(),
});

export async function saveAd(input: z.input<typeof adSchema>): Promise<ActionResult> {
  return run(async () => {
    const admin = await actionAdmin();
    const data = adSchema.parse(input);
    let imageUrl = data.imageUrl ?? null;
    if (data.imageMediaId) imageUrl = (await ownedMedia(data.imageMediaId, admin.id, ["IMAGE"])).url;
    const values = {
      title: data.title,
      body: data.body || null,
      advertiser: data.advertiser,
      linkUrl: data.linkUrl,
      ctaLabel: data.ctaLabel || null,
      placement: data.placement,
      active: data.active,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      imageUrl,
    };
    if (data.id) await db.ad.update({ where: { id: data.id }, data: values });
    else await db.ad.create({ data: values });
    await audit(admin.id, data.id ? "ad.update" : "ad.create", "AD", data.id);
    return null;
  });
}

export async function deleteAd(input: { id: string }): Promise<ActionResult> {
  return run(async () => {
    const admin = await actionAdmin();
    await db.ad.delete({ where: { id: idSchema.parse(input.id) } });
    await audit(admin.id, "ad.delete", "AD", input.id);
    return null;
  });
}

// ─── Site settings ──────────────────────────────────────────────────────

const settingsSchema = z.object({
  inviteOnly: z.boolean(),
  userInviteQuota: z.coerce.number().int().min(0).max(1000),
  blockedWords: z.string().max(5000),
  announcement: z.string().trim().max(200),
});

export async function updateSiteSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  return run(async () => {
    const admin = await actionAdmin();
    const data = settingsSchema.parse(input);
    await saveSettings({
      inviteOnly: data.inviteOnly,
      userInviteQuota: data.userInviteQuota,
      blockedWords: [...new Set(data.blockedWords.split(/[,\n]/).map((w) => w.trim().toLowerCase()).filter(Boolean))],
      announcement: data.announcement,
    });
    await audit(admin.id, "settings.update", undefined, undefined, { inviteOnly: data.inviteOnly });
    return null;
  });
}
