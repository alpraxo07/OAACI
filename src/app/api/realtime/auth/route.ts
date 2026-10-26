import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPusher, userChannel } from "@/lib/realtime";

/** Authorizes the browser to listen on its own private Pusher channel only. */
export async function POST(request: NextRequest) {
  const me = await getCurrentUser();
  const pusher = getPusher();
  if (!me || !pusher) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const form = await request.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");
  if (channel !== userChannel(me.id) || !socketId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(pusher.authorizeChannel(socketId, channel));
}
