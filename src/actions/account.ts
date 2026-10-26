"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { run, UserError, type ActionResult } from "@/lib/action";
import { actionUser, createSession, destroySession } from "@/lib/auth/session";
import { createToken } from "@/lib/auth/accounts";
import { hashPassword, inviteCode, verifyPassword } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { cleanText, getSettings } from "@/lib/settings";
import { deleteStoredFile, ownedMedia } from "@/lib/media";
import { emails } from "@/lib/mail";
import { ART_DISCIPLINES } from "@/lib/constants";
import { bioSchema, emailSchema, headlineSchema, idSchema, nameSchema, passwordSchema, urlSchema, usernameSchema } from "@/lib/validation";

// ─── Profile ────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: nameSchema,
  headline: headlineSchema,
  bio: bioSchema,
  website: urlSchema,
  disciplines: z.array(z.enum(ART_DISCIPLINES)).max(8, "Choose up to 8 disciplines."),
  openToCommissions: z.boolean(),
});

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    await rateLimit(`profile:${me.id}`, 60, 3600);
    const data = profileSchema.parse(input);
    await db.user.update({
      where: { id: me.id },
      data: {
        name: data.name,
        headline: data.headline ? await cleanText(data.headline) : null,
        bio: data.bio ? await cleanText(data.bio) : null,
        website: data.website || null,
        disciplines: [...new Set(data.disciplines)],
        openToCommissions: data.openToCommissions,
      },
    });
    return null;
  });
}

export async function setProfileImage(input: { kind: "avatar" | "cover"; mediaId: string | null }): Promise<ActionResult<{ url: string | null }>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    const field = input.kind === "avatar" ? "avatarUrl" : "coverUrl";
    if (!input.mediaId) {
      await db.user.update({ where: { id: me.id }, data: { [field]: null } });
      return { url: null };
    }
    const media = await ownedMedia(idSchema.parse(input.mediaId), me.id, ["IMAGE"]);
    if (media.flagged || media.sensitive) throw new UserError("Please choose a different image for your profile.");
    await db.user.update({ where: { id: me.id }, data: { [field]: media.url } });
    return { url: media.url };
  });
}

// ─── Portfolio entries ──────────────────────────────────────────────────

const year = z
  .union([z.coerce.number().int().min(1900, "Enter a valid year.").max(new Date().getFullYear() + 5, "Enter a valid year."), z.literal("")])
  .transform((v) => (v === "" ? null : v));

const entrySchema = z
  .object({
    id: idSchema.optional(),
    kind: z.enum(["EXHIBITION", "EXPERIENCE", "EDUCATION", "AWARD"]),
    title: z.string().trim().min(2, "Enter a title.").max(120),
    organization: z.string().trim().max(120).optional(),
    startYear: year,
    endYear: year,
    current: z.boolean(),
    description: z.string().trim().max(1000).optional(),
    url: urlSchema.optional(),
  })
  .refine((e) => !e.startYear || !e.endYear || e.endYear >= e.startYear, { message: "End year can't be before the start year." });

export async function saveProfileEntry(input: z.input<typeof entrySchema>): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    const data = entrySchema.parse(input);
    if (!data.id && (await db.profileEntry.count({ where: { userId: me.id } })) >= 60) {
      throw new UserError("You've reached the maximum number of portfolio entries.");
    }
    const values = {
      kind: data.kind,
      title: await cleanText(data.title),
      organization: data.organization ? await cleanText(data.organization) : null,
      startYear: data.startYear,
      endYear: data.current ? null : data.endYear,
      current: data.current,
      description: data.description ? await cleanText(data.description) : null,
      url: data.url || null,
    };
    if (data.id) {
      const updated = await db.profileEntry.updateMany({ where: { id: data.id, userId: me.id }, data: values });
      if (!updated.count) throw new UserError("Entry not found.");
    } else {
      await db.profileEntry.create({ data: { ...values, userId: me.id } });
    }
    return null;
  });
}

export async function deleteProfileEntry(input: { id: string }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    await db.profileEntry.deleteMany({ where: { id: idSchema.parse(input.id), userId: me.id } });
    return null;
  });
}

// ─── Account ────────────────────────────────────────────────────────────

export async function changeUsername(input: { username: string }): Promise<ActionResult<{ username: string }>> {
  return run(async () => {
    const me = await actionUser();
    const username = usernameSchema.parse(input.username);
    if (username === me.username) return { username };
    const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { usernameChangedAt: true } });
    if (user.usernameChangedAt && Date.now() - user.usernameChangedAt.getTime() < 14 * 86_400_000) {
      throw new UserError("You can change your username once every 14 days.");
    }
    if (await db.user.count({ where: { username } })) throw new UserError("That username is taken.");
    await db.user.update({ where: { id: me.id }, data: { username, usernameChangedAt: new Date() } });
    return { username };
  });
}

export async function changeEmail(input: { email: string }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    await rateLimit(`change-email:${me.id}`, 5, 3600);
    const email = emailSchema.parse(input.email);
    if (email === me.email) throw new UserError("That's already your email address.");
    if (await db.user.count({ where: { email } })) throw new UserError("That email is used by another account.");
    const token = await createToken(me.id, "CHANGE_EMAIL", email);
    await emails.changeEmail(email, `${env.appUrl}/verify-email?token=${token}`);
    return null;
  });
}

export async function changePassword(input: { current?: string; password: string }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    await rateLimit(`change-password:${me.id}`, 10, 3600);
    const password = passwordSchema.parse(input.password);
    const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true } });
    if (user.passwordHash && !(await verifyPassword(input.current ?? "", user.passwordHash))) {
      throw new UserError("Your current password is incorrect.");
    }
    await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(password) } });
    // Sign out everywhere else.
    await db.session.deleteMany({ where: { userId: me.id } });
    await createSession(me.id);
    return null;
  });
}

export async function setDmPolicy(input: { policy: "EVERYONE" | "FOLLOWING" }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    await db.user.update({ where: { id: me.id }, data: { dmPolicy: z.enum(["EVERYONE", "FOLLOWING"]).parse(input.policy) } });
    return null;
  });
}

export async function logOutEverywhere(): Promise<void> {
  const me = await actionUser();
  await db.session.deleteMany({ where: { userId: me.id } });
  await destroySession();
  redirect("/login");
}

// ─── Invites & verification ─────────────────────────────────────────────

export async function createMyInvite(): Promise<ActionResult<{ code: string }>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    const { userInviteQuota } = await getSettings();
    const used = await db.invite.count({ where: { createdById: me.id } });
    if (used >= userInviteQuota) throw new UserError(`You've used all ${userInviteQuota} of your invites.`);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = inviteCode();
      if (await db.invite.count({ where: { code } })) continue;
      await db.invite.create({ data: { code, createdById: me.id, maxUses: 1 } });
      return { code };
    }
    throw new UserError("Couldn't create an invite. Please try again.");
  });
}

const verificationSchema = z.object({
  message: z.string().trim().min(30, "Tell us a bit more (at least 30 characters).").max(1500),
  links: z.array(urlSchema).max(5),
});

export async function requestVerification(input: z.input<typeof verificationSchema>): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    if (me.verified) throw new UserError("You're already verified.");
    const data = verificationSchema.parse(input);
    const pending = await db.verificationRequest.count({ where: { userId: me.id, status: "PENDING" } });
    if (pending) throw new UserError("Your request is already being reviewed.");
    const recent = await db.verificationRequest.findFirst({
      where: { userId: me.id, status: "REJECTED", reviewedAt: { gt: new Date(Date.now() - 30 * 86_400_000) } },
    });
    if (recent) throw new UserError("You can apply again 30 days after your last request was reviewed.");
    await db.verificationRequest.create({
      data: { userId: me.id, message: await cleanText(data.message), links: data.links.filter(Boolean) },
    });
    return null;
  });
}

// ─── Deactivate / delete ────────────────────────────────────────────────

async function confirmIdentity(userId: string, confirm: { password?: string; username?: string }) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, username: true } });
  if (user.passwordHash) {
    if (!(await verifyPassword(confirm.password ?? "", user.passwordHash))) throw new UserError("Incorrect password.");
  } else if ((confirm.username ?? "").trim().toLowerCase().replace(/^@/, "") !== user.username) {
    throw new UserError("Type your username exactly to confirm.");
  }
}

export async function deactivateAccount(input: { password?: string; username?: string }): Promise<ActionResult> {
  const result = await run(async () => {
    const me = await actionUser();
    await rateLimit(`danger:${me.id}`, 10, 3600);
    await confirmIdentity(me.id, input);
    await db.user.update({ where: { id: me.id }, data: { deactivatedAt: new Date() } });
    await db.session.deleteMany({ where: { userId: me.id } });
    await destroySession();
    return null;
  });
  if (result.ok) redirect("/");
  return result;
}

export async function deleteAccount(input: { password?: string; username?: string }): Promise<ActionResult> {
  const result = await run(async () => {
    const me = await actionUser();
    await rateLimit(`danger:${me.id}`, 10, 3600);
    await confirmIdentity(me.id, input);
    const media = await db.media.findMany({ where: { ownerId: me.id }, select: { provider: true, publicId: true, kind: true }, take: 1000 });
    // Fix counters on posts this user starred or reposted, then delete everything.
    await db.$transaction([
      db.$executeRaw`UPDATE "Post" SET "starCount" = GREATEST("starCount" - 1, 0) WHERE "id" IN (SELECT "postId" FROM "Star" WHERE "userId" = ${me.id})`,
      db.$executeRaw`UPDATE "Post" SET "repostCount" = GREATEST("repostCount" - 1, 0) WHERE "id" IN (SELECT "repostOfId" FROM "Post" WHERE "authorId" = ${me.id} AND "repostOfId" IS NOT NULL)`,
      db.$executeRaw`UPDATE "Post" p SET "commentCount" = GREATEST(p."commentCount" - c.n, 0) FROM (SELECT "postId", COUNT(*)::int AS n FROM "Comment" WHERE "authorId" = ${me.id} GROUP BY "postId") c WHERE p."id" = c."postId"`,
      db.user.delete({ where: { id: me.id } }),
    ]);
    await destroySession();
    for (const m of media) await deleteStoredFile(m);
    return null;
  });
  if (result.ok) redirect("/");
  return result;
}
