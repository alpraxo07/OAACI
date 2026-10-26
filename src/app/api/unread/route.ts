import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

/** Unread notification and message counts for the nav badges. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ notifications: 0, messages: 0 });
  const [notifications, conversations] = await Promise.all([
    db.notification.count({ where: { userId: me.id, readAt: null } }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS "count" FROM "ConversationMember" cm
      JOIN "Conversation" c ON c."id" = cm."conversationId"
      WHERE cm."userId" = ${me.id}
        AND EXISTS (
          SELECT 1 FROM "Message" m
          WHERE m."conversationId" = c."id" AND m."senderId" <> ${me.id} AND m."deletedAt" IS NULL
            AND m."createdAt" > COALESCE(cm."lastReadAt", 'epoch'::timestamp)
            AND m."createdAt" > COALESCE(cm."clearedAt", 'epoch'::timestamp)
        )`,
  ]);
  return NextResponse.json({ notifications, messages: Number(conversations[0]?.count ?? 0) });
}
