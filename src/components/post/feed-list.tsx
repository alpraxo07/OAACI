"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard } from "./post-card";
import { SponsoredCard } from "@/components/sponsored-card";
import { EmptyState, Spinner } from "@/components/ui/misc";
import type { AdDTO, FeedItem, Page } from "@/lib/types";

const AD_EVERY = 8;

/** Batches "this post was on screen" pings and sends them every few seconds. */
const viewQueue = new Set<string>();
const seen = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function queueView(id: string) {
  if (seen.has(id)) return;
  seen.add(id);
  viewQueue.add(id);
  flushTimer ??= setTimeout(() => {
    const ids = [...viewQueue].slice(0, 50);
    viewQueue.clear();
    flushTimer = null;
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
      keepalive: true,
    }).catch(() => {});
  }, 3000);
}

/** Watches posts in a container and records a view after they're visible for a second. */
export function useViewTracking(container: React.RefObject<HTMLElement | null>, deps: unknown[]) {
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.postId;
          if (!id) continue;
          if (entry.isIntersecting) {
            timers.set(entry.target, setTimeout(() => queueView(id), 1000));
          } else {
            clearTimeout(timers.get(entry.target));
            timers.delete(entry.target);
          }
        }
      },
      { threshold: 0.5 },
    );
    root.querySelectorAll("[data-post-id]").forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function FeedList({
  initial,
  endpoint,
  ads = [],
  empty,
}: {
  initial: Page<FeedItem>;
  /** e.g. "/api/feed?scope=home" — the cursor is appended. */
  endpoint: string;
  ads?: AdDTO[];
  empty?: React.ReactNode;
}) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const sep = endpoint.includes("?") ? "&" : "?";
      const res = await fetch(`${endpoint}${sep}cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error();
      const page = (await res.json()) as Page<FeedItem>;
      setItems((prev) => {
        const keys = new Set(prev.map((i) => i.key));
        return [...prev, ...page.items.filter((i) => !keys.has(i.key))];
      });
      setCursor(page.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [cursor, endpoint, loading]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), { rootMargin: "800px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  useViewTracking(list, [items.length]);

  if (!items.length) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;

  // Mix sponsored posts into the feed every few items.
  const rows: FeedItem[] = [];
  items.forEach((item, i) => {
    rows.push(item);
    const ad = ads.length ? ads[Math.floor(i / AD_EVERY) % ads.length] : null;
    if (ad && (i + 1) % AD_EVERY === 0) rows.push({ kind: "ad", key: `ad-${ad.id}-${i}`, ad });
  });

  return (
    <div ref={list}>
      {rows.map((item) =>
        item.kind === "ad" ? (
          <SponsoredCard key={item.key} ad={item.ad} variant="feed" />
        ) : (
          <PostCard key={item.key} post={item.post} repostedBy={item.repostedBy} />
        ),
      )}
      <div ref={sentinel} className="flex justify-center py-6">
        {loading && <Spinner className="h-5 w-5 text-muted" />}
        {failed && (
          <button className="btn btn-secondary btn-sm" onClick={loadMore}>
            Couldn&apos;t load more — retry
          </button>
        )}
        {!cursor && items.length > 3 && <p className="text-sm text-muted">You&apos;re all caught up ✦</p>}
      </div>
    </div>
  );
}
