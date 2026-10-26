import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Counts a click on a sponsored post, then sends the visitor to the advertiser. */
export async function GET(_request: Request, ctx: RouteContext<"/api/ads/[id]/click">) {
  const { id } = await ctx.params;
  const ad = await db.ad.findUnique({ where: { id }, select: { linkUrl: true } });
  if (!ad) return NextResponse.redirect(new URL("/", env.appUrl));
  await db.ad.update({ where: { id }, data: { clicks: { increment: 1 } } });
  return NextResponse.redirect(ad.linkUrl);
}
