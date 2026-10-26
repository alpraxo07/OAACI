import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getInbox } from "@/lib/messages";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.json(await getInbox(me.id));
}
