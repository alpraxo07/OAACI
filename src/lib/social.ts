import "server-only";
import { cache } from "react";
import type { NotificationType } from "@prisma/client";
import { db } from "./db";
import { emit } from "./realtime";

/** Users I blocked plus users who blocked me — we hide each other completely. */
export const getBlockedIds = cache(async (userId: string): Promise<string[]> => {
  const rows = await db.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)))];
});

export const getMutedIds = cache(async (userId: string): Promise<string[]> => {
  const rows = await db.mute.findMany({ where: { muterId: userId }, select: { mutedId: true } });
  return rows.map((r) => r.mutedId);
});

/** Authors whose content should not appear in this viewer's feeds. */
export async function getHiddenAuthorIds(viewerId: string | null | undefined): Promise<string[]> {
  if (!viewerId) return [];
  const [blocked, muted] = await Promise.all([getBlockedIds(viewerId), getMutedIds(viewerId)]);
  return [...new Set([...blocked, ...muted])];
}

export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const count = await db.block.count({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
  });
  return count > 0;
}

/** Filter for users that are visible to everyone (not banned or deactivated). */
export const activeUserWhere = { bannedAt: null, deactivatedAt: null } as const;

export async function notify(input: {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
  text?: string | null;
}): Promise<void> {
  const { userId, actorId = null } = input;
  if (actorId && actorId === userId) return;
  if (actorId) {
    const [blocked, muted] = await Promise.all([
      isBlockedBetween(userId, actorId),
      db.mute.count({ where: { muterId: userId, mutedId: actorId } }),
    ]);
    if (blocked || muted) return;
  }
  // Toggling a star or follow on and off shouldn't spam the same notification.
  if (actorId && (input.type === "STAR" || input.type === "FOLLOW" || input.type === "REPOST")) {
    await db.notification.deleteMany({
      where: { userId, actorId, type: input.type, postId: input.postId ?? null },
    });
  }
  await db.notification.create({
    data: {
      userId,
      actorId,
      type: input.type,
      postId: input.postId ?? null,
      commentId: input.commentId ?? null,
      text: input.text ?? null,
    },
  });
  await emit([userId], { type: "notification" });
}

/** Sends MENTION notifications to existing users named in the text. */
export async function notifyMentions(usernames: string[], actorId: string, postId: string, commentId?: string, excludeIds: string[] = []) {
  if (!usernames.length) return;
  const users = await db.user.findMany({
    where: { username: { in: usernames }, id: { notIn: excludeIds }, ...activeUserWhere },
    select: { id: true },
  });
  for (const u of users) {
    await notify({ userId: u.id, actorId, type: "MENTION", postId, commentId: commentId ?? null });
  }
}

export async function audit(actorId: string, action: string, targetType?: string, targetId?: string, details?: object) {
  await db.auditLog.create({
    data: { actorId, action, targetType: targetType ?? null, targetId: targetId ?? null, details: details ?? undefined },
  });
}
