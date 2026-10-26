import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getConversation, getMessages } from "@/lib/messages";

/**
 * Latest messages in a conversation plus the other person's read/typing state.
 * Pass ?before=<ISO date> to load older messages.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/conversations/[id]">) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { id } = await ctx.params;
  const convo = await getConversation(id, me.id);
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const before = request.nextUrl.searchParams.get("before");
  const messages = await getMessages(id, {
    before: before ? new Date(before) : undefined,
    clearedAt: convo.me.clearedAt,
  });
  const typingUntil = convo.otherMember.typingUntil;
  return NextResponse.json({
    messages,
    otherLastReadAt: convo.otherMember.lastReadAt?.toISOString() ?? null,
    otherTyping: Boolean(typingUntil && typingUntil > new Date()),
  });
}
