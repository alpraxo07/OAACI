import "server-only";
import { cache } from "react";
import { db } from "./db";

/** A public profile with counts and the viewer's relationship to it. */
export const getProfile = cache(async (username: string, viewerId: string | null) => {
  const user = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      username: true,
      name: true,
      headline: true,
      bio: true,
      website: true,
      avatarUrl: true,
      coverUrl: true,
      disciplines: true,
      openToCommissions: true,
      verified: true,
      role: true,
      dmPolicy: true,
      bannedAt: true,
      deactivatedAt: true,
      createdAt: true,
      _count: {
        select: {
          followers: true,
          following: true,
          posts: { where: { status: "PUBLISHED", repostOfId: null } },
          listings: { where: { status: { in: ["ACTIVE", "SOLD"] } } },
        },
      },
    },
  });
  if (!user) return null;

  const [iFollow, followsMe, iBlocked, blockedMe, iMuted] = viewerId && viewerId !== user.id
    ? await Promise.all([
        db.follow.count({ where: { followerId: viewerId, followingId: user.id } }),
        db.follow.count({ where: { followerId: user.id, followingId: viewerId } }),
        db.block.count({ where: { blockerId: viewerId, blockedId: user.id } }),
        db.block.count({ where: { blockerId: user.id, blockedId: viewerId } }),
        db.mute.count({ where: { muterId: viewerId, mutedId: user.id } }),
      ])
    : [0, 0, 0, 0, 0];

  return {
    user,
    relation: {
      isMe: viewerId === user.id,
      following: iFollow > 0,
      followsMe: followsMe > 0,
      blocked: iBlocked > 0,
      blockedMe: blockedMe > 0,
      muted: iMuted > 0,
      /** Whether the viewer may start a conversation. */
      canMessage: Boolean(viewerId && viewerId !== user.id && !iBlocked && !blockedMe && (user.dmPolicy === "EVERYONE" || followsMe > 0)),
    },
  };
});

export type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
