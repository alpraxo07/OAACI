import "server-only";
import type { AdPlacement } from "@prisma/client";
import { db } from "./db";
import type { AdDTO } from "./types";

/** Currently running ads for a placement, in random order. */
export async function getActiveAds(placement: AdPlacement, limit = 5): Promise<AdDTO[]> {
  const now = new Date();
  const ads = await db.ad.findMany({
    where: {
      active: true,
      placement,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    select: { id: true, title: true, body: true, imageUrl: true, ctaLabel: true, advertiser: true, linkUrl: true },
    take: 20,
  });
  return ads.sort(() => Math.random() - 0.5).slice(0, limit);
}
