"use client";

import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { imageUrl } from "@/lib/media-url";
import type { AdDTO } from "@/lib/types";

const counted = new Set<string>();

/** A clearly-labelled sponsored placement, in the feed or the sidebar. */
export function SponsoredCard({ ad, variant }: { ad: AdDTO; variant: "feed" | "sidebar" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || counted.has(ad.id)) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !counted.has(ad.id)) {
        counted.add(ad.id);
        fetch("/api/ads/impression", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [ad.id] }),
        }).catch(() => {});
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ad.id]);

  const href = `/api/ads/${ad.id}/click`;

  if (variant === "sidebar") {
    return (
      <div ref={ref} className="card overflow-hidden">
        <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Sponsored</p>
        <a href={href} target="_blank" rel="noopener sponsored" className="block p-4 pt-2 hover:bg-surface-2">
          {ad.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(ad.imageUrl, 600)} alt="" className="mb-3 aspect-[16/9] w-full rounded-xl object-cover" loading="lazy" />
          )}
          <p className="font-semibold">{ad.title}</p>
          {ad.body && <p className="mt-1 line-clamp-3 text-sm text-muted">{ad.body}</p>}
          <p className="mt-2 flex items-center gap-1 text-sm font-medium text-primary-text">
            {ad.ctaLabel || "Learn more"} <ExternalLink className="h-3.5 w-3.5" />
          </p>
        </a>
      </div>
    );
  }

  return (
    <div ref={ref} className="border-b border-border px-4 py-3">
      <p className="mb-2 text-xs font-medium text-muted">
        Sponsored · <span className="text-fg">{ad.advertiser}</span>
      </p>
      <a href={href} target="_blank" rel="noopener sponsored" className="block overflow-hidden rounded-2xl border border-border hover:bg-surface-2">
        {ad.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(ad.imageUrl, 1080)} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
        )}
        <div className="flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{ad.title}</p>
            {ad.body && <p className="line-clamp-2 text-sm text-muted">{ad.body}</p>}
          </div>
          <span className="btn btn-secondary btn-sm shrink-0">{ad.ctaLabel || "Learn more"}</span>
        </div>
      </a>
    </div>
  );
}
