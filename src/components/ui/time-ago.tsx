"use client";

import { useEffect, useState } from "react";

export function relativeTime(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const s = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (s < 45) return "now";
  if (s < 3600) return `${Math.floor(s / 60) || 1}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

/** "5m", "3h", "2d" or a date. Updates every minute. */
export function TimeAgo({ date, className }: { date: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const full = new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  return (
    <time dateTime={date} title={full} className={className} suppressHydrationWarning>
      {relativeTime(date, now)}
    </time>
  );
}
