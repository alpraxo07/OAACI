"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError, type ActionResult } from "@/lib/action";
import { actionUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/settings";
import { deleteMediaIfUnused, ownedMedia } from "@/lib/media";
import { emit } from "@/lib/realtime";
import { isBlockedBetween } from "@/lib/social";
import { getConversation, getOrCreateConversation, toMessageDTO } from "@/lib/messages";
import { mediaSelect } from "@/lib/posts";
import { idSchema, messageTextSchema } from "@/lib/validation";
import type { MessageDTO } from "@/lib/types";

/** Whether `fromId` may message `to` under the recipient's privacy setting. */
async function allowedByPolicy(fromId: string, to: { id: string; dmPolicy: "EVERYONE" | "FOLLOWING" }, conversationId?: string) {
  if (to.dmPolicy === "EVERYONE") return true;
  if (await db.follow.count({ where: { followerId: to.id, followingId: fromId } })) return true;
  // They already replied in this conversation, so keep it open.
  if (conversationId && (await db.message.count({ where: { conversationId, senderId: to.id } }))) return true;
  return false;
}

export async function startConversation(input: { userId: string }): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    const otherId = idSchema.parse(input.userId);
    if (otherId === me.id) throw new UserError("You can't message yourself.");
    const other = await db.user.findUnique({ where: { id: otherId }, select: { id: true, dmPolicy: true, bannedAt: true, deactivatedAt: true } });
    if (!other || other.bannedAt || other.deactivatedAt) throw new UserError("This account isn't available.");
    if (await isBlockedBetween(me.id, other.id)) throw new UserError("You can't message this account.");
    const existing = await db.conversation.findUnique({ where: { pairKey: [me.id, other.id].sort().join(":") }, select: { id: true } });
    if (!(await allowedByPolicy(me.id, other, existing?.id))) {
      throw new UserError("This artist only accepts messages from people they follow.");
    }
    return { id: await getOrCreateConversation(me.id, other.id) };
  });
}

const sendSchema = z.object({ conversationId: idSchema, text: messageTextSchema, mediaId: idSchema.nullish() });

export async function sendMessage(input: z.input<typeof sendSchema>): Promise<ActionResult<MessageDTO>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    await rateLimit(`dm:${me.id}`, 200, 3600);
    const data = sendSchema.parse(input);
    const convo = await getConversation(data.conversationId, me.id);
    if (!convo) throw new UserError("Conversation not found.");
    const { other } = convo;
    if (other.bannedAt || other.deactivatedAt) throw new UserError("This account isn't available.");
    if (await isBlockedBetween(me.id, other.id)) throw new UserError("You can't message this account.");
    if (!(await allowedByPolicy(me.id, other, data.conversationId))) {
      throw new UserError("This artist only accepts messages from people they follow.");
    }

    const text = await cleanText(data.text);
    const media = data.mediaId ? await ownedMedia(data.mediaId, me.id, ["IMAGE"]) : null;
    if (media?.flagged) throw new UserError("That image can't be sent.");
    if (!text && !media) throw new UserError("Write a message first.");

    const now = new Date();
    const [message] = await db.$transaction([
      db.message.create({
        data: { conversationId: data.conversationId, senderId: me.id, text, mediaId: media?.id ?? null, createdAt: now },
        include: { media: { select: mediaSelect } },
      }),
      db.conversation.update({ where: { id: data.conversationId }, data: { lastMessageAt: now } }),
      db.conversationMember.update({
        where: { conversationId_userId: { conversationId: data.conversationId, userId: me.id } },
        data: { lastReadAt: now, typingUntil: null },
      }),
    ]);
    await emit([other.id], { type: "message", conversationId: data.conversationId });
    return toMessageDTO(message);
  });
}

export async function markConversationRead(input: { conversationId: string }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    const conversationId = idSchema.parse(input.conversationId);
    const now = new Date();
    const updated = await db.conversationMember.updateMany({ where: { conversationId, userId: me.id }, data: { lastReadAt: now } });
    if (updated.count) {
      const other = await db.conversationMember.findFirst({ where: { conversationId, userId: { not: me.id } }, select: { userId: true } });
      if (other) await emit([other.userId], { type: "read", conversationId, userId: me.id, at: now.toISOString() });
    }
    return null;
  });
}

export async function sendTyping(input: { conversationId: string }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    const conversationId = idSchema.parse(input.conversationId);
    await db.conversationMember.updateMany({
      where: { conversationId, userId: me.id },
      data: { typingUntil: new Date(Date.now() + 5000) },
    });
    const other = await db.conversationMember.findFirst({ where: { conversationId, userId: { not: me.id } }, select: { userId: true } });
    if (other) await emit([other.userId], { type: "typing", conversationId, userId: me.id });
    return null;
  });
}

export async function deleteMessage(input: { id: string }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    const message = await db.message.findUnique({ where: { id: idSchema.parse(input.id) } });
    if (!message || message.senderId !== me.id) throw new UserError("You can only delete your own messages.");
    await db.message.update({ where: { id: message.id }, data: { deletedAt: new Date(), text: "", mediaId: null } });
    await deleteMediaIfUnused([message.mediaId]);
    const other = await db.conversationMember.findFirst({
      where: { conversationId: message.conversationId, userId: { not: me.id } },
      select: { userId: true },
    });
    if (other) await emit([other.userId], { type: "message", conversationId: message.conversationId });
    return null;
  });
}

/** Hides a conversation's history for me only. It reappears if a new message arrives. */
export async function clearConversation(input: { conversationId: string }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    await db.conversationMember.updateMany({
      where: { conversationId: idSchema.parse(input.conversationId), userId: me.id },
      data: { clearedAt: new Date() },
    });
    return null;
  });
}
