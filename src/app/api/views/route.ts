import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { randomToken } from "@/lib/crypto";
import { env } from "@/lib/env";
import { recordViews } from "@/lib/posts";

const bodySchema = z.object({ ids: z.array(z.string().min(1).max(40)).max(50) });

/** Records that posts were on screen. One view per person per post. */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const me = await getCurrentUser();
  let anon = request.cookies.get("oaaci_anon")?.value;
  const response = NextResponse.json({ ok: true });
  if (!me && !anon) {
    anon = randomToken(12);
    response.cookies.set("oaaci_anon", anon, { httpOnly: true, sameSite: "lax", secure: env.isProd, maxAge: 365 * 86400, path: "/" });
  }
  await recordViews(parsed.data.ids, me ? me.id : `anon:${anon}`, me?.id ?? null);
  return response;
}
