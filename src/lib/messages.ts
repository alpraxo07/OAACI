import "server-only";
import { db } from "./db";
import { toMediaDTO, mediaSelect, userMiniSelect } from "./posts";
import type { MessageDTO, UserMini } from "./types";

export const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

export async function getOrCreateConversation(meId: string, otherId: string): Promise<string> {
  const key = pairKey(meId, otherId);
  const convo = await db.conversation.upsert({ where: { pairKey: key }, create: { pairKey: key }, update: {} });
  await db.conversationMember.createMany({
    data: [
      { conversationId: convo.id, userId: meId },
      { conversationId: convo.id, userId: otherId },
    ],
    skipDuplicates: true,
  });
  return convo.id;
}

export type InboxItem = {
  id: string;
  other: UserMini;
  lastMessage: { text: string; hasMedia: boolean; fromMe: boolean; createdAt: string; deleted: boolean } | null;
  unread: boolean;
  lastMessageAt: string;
};

/** Conversations for the inbox, most recent first. */
export async function getInbox(userId: string): Promise<InboxItem[]> {
  const memberships = await db.conversationMember.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          members: { where: { userId: { not: userId } }, include: { user: { select: { ...userMiniSelect, bannedAt: true, deactivatedAt: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    take: 100,
  });

  const items: InboxItem[] = [];
  for (const m of memberships) {
    const other = m.conversation.members[0]?.user;
    if (!other || other.bannedAt || other.deactivatedAt) continue;
    const last = m.conversation.messages[0];
    // Hide empty conversations and ones the user cleared (until a new message arrives).
    if (!last || (m.clearedAt && last.createdAt <= m.clearedAt)) continue;
    items.push({
      id: m.conversationId,
      other: { id: other.id, username: other.username, name: other.name, avatarUrl: other.avatarUrl, verified: other.verified },
      lastMessage: {
        text: last.deletedAt ? "" : last.text,
        hasMedia: Boolean(last.mediaId),
        fromMe: last.senderId === userId,
        createdAt: last.createdAt.toISOString(),
        deleted: Boolean(last.deletedAt),
      },
      unread: last.senderId !== userId && (!m.lastReadAt || last.createdAt > m.lastReadAt),
      lastMessageAt: m.conversation.lastMessageAt.toISOString(),
    });
  }
  return items;
}

/** The conversation if the user is a member, with the other participant. */
export async function getConversation(conversationId: string, userId: string) {
  const member = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: {
      conversation: {
        include: {
          members: {
            where: { userId: { not: userId } },
            include: { user: { select: { ...userMiniSelect, bannedAt: true, deactivatedAt: true, dmPolicy: true } } },
          },
        },
      },
    },
  });
  if (!member) return null;
  const otherMember = member.conversation.members[0];
  if (!otherMember) return null;
  return { me: member, otherMember, other: otherMember.user };
}

export function toMessageDTO(m: {
  id: string;
  senderId: string;
  text: string;
  createdAt: Date;
  deletedAt: Date | null;
  media: Parameters<typeof toMediaDTO>[0];
}): MessageDTO {
  return {
    id: m.id,
    senderId: m.senderId,
    text: m.deletedAt ? "" : m.text,
    media: m.deletedAt ? null : toMediaDTO(m.media),
    createdAt: m.createdAt.toISOString(),
    deleted: Boolean(m.deletedAt),
  };
}

/** Messages in a conversation (newest page first, returned oldest→newest). */
export async function getMessages(
  conversationId: string,
  opts: { after?: Date; before?: Date; clearedAt?: Date | null; take?: number } = {},
): Promise<MessageDTO[]> {
  const take = opts.take ?? 50;
  const createdAt = {
    ...(opts.after ? { gt: opts.after } : {}),
    ...(opts.before ? { lt: opts.before } : {}),
    ...(opts.clearedAt && (!opts.after || opts.after < opts.clearedAt) ? { gt: opts.clearedAt } : {}),
  };
  const rows = await db.message.findMany({
    where: { conversationId, ...(Object.keys(createdAt).length ? { createdAt } : {}) },
    include: { media: { select: mediaSelect } },
    orderBy: { createdAt: opts.after ? "asc" : "desc" },
    take: opts.after ? 200 : take,
  });
  const list = opts.after ? rows : rows.reverse();
  return list.map(toMessageDTO);
}
