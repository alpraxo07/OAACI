"use client";

import { useEffect } from "react";

/** Records a view when someone opens a post's own page. */
export function ViewPing({ postId }: { postId: string }) {
  useEffect(() => {
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [postId] }),
    }).catch(() => {});
  }, [postId]);
  return null;
}
