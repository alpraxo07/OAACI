import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const bodySchema = z.object({ ids: z.array(z.string().min(1).max(40)).max(10) });

/** Counts how often sponsored posts were shown. */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await db.ad.updateMany({ where: { id: { in: parsed.data.ids } }, data: { impressions: { increment: 1 } } });
  return NextResponse.json({ ok: true });
}
