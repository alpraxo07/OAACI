import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/session";
import { AdManager } from "@/components/admin/ad-manager";

export const metadata: Metadata = { title: "Ads · Admin" };

const toLocalInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");

export default async function AdminAdsPage() {
  const me = await requireStaffPage();
  if (me.role !== "ADMIN") redirect("/admin");
  const ads = await db.ad.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <AdManager
      ads={ads.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body ?? "",
        advertiser: a.advertiser,
        linkUrl: a.linkUrl,
        ctaLabel: a.ctaLabel ?? "",
        placement: a.placement,
        active: a.active,
        startsAt: toLocalInput(a.startsAt),
        endsAt: toLocalInput(a.endsAt),
        imageUrl: a.imageUrl,
        impressions: a.impressions,
        clicks: a.clicks,
      }))}
    />
  );
}
