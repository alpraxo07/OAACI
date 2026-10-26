"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError, type ActionResult } from "@/lib/action";
import { actionUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { isBlockedBetween, notify } from "@/lib/social";
import { idSchema } from "@/lib/validation";

async function activeTarget(userId: string) {
  const user = await db.user.findUnique({
    where: { id: idSchema.parse(userId) },
    select: { id: true, bannedAt: true, deactivatedAt: true },
  });
  if (!user || user.bannedAt || user.deactivatedAt) throw new UserError("This account isn't available.");
  return user;
}

export async function toggleFollow(input: { userId: string }): Promise<ActionResult<{ following: boolean }>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    await rateLimit(`follow:${me.id}`, 200, 3600);
    const target = await activeTarget(input.userId);
    if (target.id === me.id) throw new UserError("You can't follow yourself.");
    if (await isBlockedBetween(me.id, target.id)) throw new UserError("You can't follow this account.");

    const key = { followerId_followingId: { followerId: me.id, followingId: target.id } };
    const existing = await db.follow.findUnique({ where: key });
    if (existing) {
      await db.follow.delete({ where: key });
      return { following: false };
    }
    await db.follow.upsert({ where: key, create: { followerId: me.id, followingId: target.id }, update: {} });
    await notify({ userId: target.id, actorId: me.id, type: "FOLLOW" });
    return { following: true };
  });
}

/** Removes someone from my followers. */
export async function removeFollower(input: { userId: string }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    await db.follow.deleteMany({ where: { followerId: idSchema.parse(input.userId), followingId: me.id } });
    return null;
  });
}

export async function setBlocked(input: { userId: string; blocked: boolean }): Promise<ActionResult<{ blocked: boolean }>> {
  return run(async () => {
    const me = await actionUser();
    const targetId = idSchema.parse(input.userId);
    if (targetId === me.id) throw new UserError("You can't block yourself.");
    if (input.blocked) {
      await db.$transaction([
        db.block.upsert({
          where: { blockerId_blockedId: { blockerId: me.id, blockedId: targetId } },
          create: { blockerId: me.id, blockedId: targetId },
          update: {},
        }),
        db.follow.deleteMany({
          where: { OR: [{ followerId: me.id, followingId: targetId }, { followerId: targetId, followingId: me.id }] },
        }),
      ]);
    } else {
      await db.block.deleteMany({ where: { blockerId: me.id, blockedId: targetId } });
    }
    return { blocked: input.blocked };
  });
}

export async function setMuted(input: { userId: string; muted: boolean }): Promise<ActionResult<{ muted: boolean }>> {
  return run(async () => {
    const me = await actionUser();
    const targetId = idSchema.parse(input.userId);
    if (targetId === me.id) throw new UserError("You can't mute yourself.");
    if (input.muted) {
      await db.mute.upsert({
        where: { muterId_mutedId: { muterId: me.id, mutedId: targetId } },
        create: { muterId: me.id, mutedId: targetId },
        update: {},
      });
    } else {
      await db.mute.deleteMany({ where: { muterId: me.id, mutedId: targetId } });
    }
    return { muted: input.muted };
  });
}

const reportSchema = z.object({
  targetType: z.enum(["POST", "COMMENT", "USER", "LISTING", "MESSAGE"]),
  targetId: idSchema,
  reason: z.enum(["SPAM", "HARASSMENT", "HATE", "NUDITY", "VIOLENCE", "COPYRIGHT", "IMPERSONATION", "SCAM", "UNDERAGE", "OTHER"]),
  details: z.string().trim().max(1000, "Please keep details under 1000 characters.").optional(),
});

export async function createReport(input: z.input<typeof reportSchema>): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    await rateLimit(`report:${me.id}`, 20, 3600);
    const data = reportSchema.parse(input);
    const exists = await db.report.count({
      where: { reporterId: me.id, targetType: data.targetType, targetId: data.targetId, status: "OPEN" },
    });
    if (exists) throw new UserError("You've already reported this. Our moderators will review it.");
    await db.report.create({
      data: {
        reporterId: me.id,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        details: data.details || null,
      },
    });
    return null;
  });
}
