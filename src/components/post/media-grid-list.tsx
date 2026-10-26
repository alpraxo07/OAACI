"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MediaGrid } from "./media-grid";
import { useViewTracking } from "./feed-list";
import { Spinner } from "@/components/ui/misc";
import type { Page, PostDTO } from "@/lib/types";

/** Media grid that loads more as you scroll. */
export function MediaGridList({ initial, endpoint, empty }: { initial: Page<PostDTO>; endpoint: string; empty: React.ReactNode }) {
  const [posts, setPosts] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const sep = endpoint.includes("?") ? "&" : "?";
      const res = await fetch(`${endpoint}${sep}cursor=${encodeURIComponent(cursor)}`);
      const page = (await res.json()) as Page<PostDTO>;
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...page.items.filter((p) => !ids.has(p.id))];
      });
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, endpoint, loading]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), { rootMargin: "600px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  useViewTracking(grid, [posts.length]);

  if (!posts.length) return <>{empty}</>;
  return (
    <div ref={grid}>
      <MediaGrid posts={posts} />
      <div ref={sentinel} className="flex justify-center py-6">
        {loading && <Spinner className="h-5 w-5 text-muted" />}
      </div>
    </div>
  );
}
