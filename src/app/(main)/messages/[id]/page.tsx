import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getConversation, getMessages } from "@/lib/messages";
import { isBlockedBetween } from "@/lib/social";
import { Chat } from "@/components/messages/chat";

export const metadata: Metadata = { title: "Messages" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const me = await requireUser();
  const convo = await getConversation(id, me.id);
  if (!convo) notFound();
  const { other, otherMember } = convo;

  let cannotSendReason: string | undefined;
  if (other.bannedAt || other.deactivatedAt) cannotSendReason = "This account isn't available.";
  else if (await isBlockedBetween(me.id, other.id)) cannotSendReason = "You can't message this account.";
  else if (other.dmPolicy === "FOLLOWING") {
    const allowed =
      (await db.follow.count({ where: { followerId: other.id, followingId: me.id } })) > 0 ||
      (await db.message.count({ where: { conversationId: id, senderId: other.id } })) > 0;
    if (!allowed) cannotSendReason = `@${other.username} only accepts messages from people they follow.`;
  }

  const messages = await getMessages(id, { clearedAt: convo.me.clearedAt });
  const typingUntil = otherMember.typingUntil;

  return (
    <Chat
      key={id}
      conversationId={id}
      other={{ id: other.id, username: other.username, name: other.name, avatarUrl: other.avatarUrl, verified: other.verified }}
      canSend={!cannotSendReason}
      cannotSendReason={cannotSendReason}
      initial={{
        messages,
        otherLastReadAt: otherMember.lastReadAt?.toISOString() ?? null,
        otherTyping: Boolean(typingUntil && typingUntil > new Date()),
      }}
    />
  );
}
