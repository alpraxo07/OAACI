"use client";

import { useEffect } from "react";
import { markAllNotificationsRead } from "@/actions/notifications";
import { useRealtime } from "@/components/providers";

/** Marks everything read once the page has been shown. */
export function MarkNotificationsRead({ hasUnread }: { hasUnread: boolean }) {
  const { refreshUnread } = useRealtime();
  useEffect(() => {
    if (!hasUnread) return;
    const t = setTimeout(() => markAllNotificationsRead().then(refreshUnread), 1500);
    return () => clearTimeout(t);
  }, [hasUnread, refreshUnread]);
  return null;
}
