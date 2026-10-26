"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ImageIcon, MessageCircle } from "lucide-react";
import { useRealtime, useRealtimeEvent } from "@/components/providers";
import { INBOX_REFRESH_EVENT } from "./chat";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, VerifiedBadge } from "@/components/ui/misc";
import { TimeAgo } from "@/components/ui/time-ago";
import { cn } from "@/lib/cn";
import type { UserMini } from "@/lib/types";

export type InboxItem = {
  id: string;
  other: UserMini;
  lastMessage: { text: string; hasMedia: boolean; fromMe: boolean; createdAt: string; deleted: boolean } | null;
  unread: boolean;
  lastMessageAt: string;
};

export function Inbox({ initial }: { initial: InboxItem[] }) {
  const pathname = usePathname();
  const { connected } = useRealtime();
  const [items, setItems] = useState(initial);
  const activeId = pathname.startsWith("/messages/") ? pathname.split("/")[2] : null;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (res.ok) setItems(await res.json());
    } catch {}
  }, []);

  useRealtimeEvent((e) => {
    if (e.type === "message" || e.type === "read") refresh();
  });

  useEffect(() => {
    const t = setInterval(refresh, connected ? 60_000 : 10_000);
    window.addEventListener(INBOX_REFRESH_EVENT, refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener(INBOX_REFRESH_EVENT, refresh);
    };
  }, [connected, refresh]);

  // Refresh when switching conversations (e.g. after reading one).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches from the server; state is set after the response
    refresh();
  }, [activeId, refresh]);

  return (
    <aside
      className={cn(
        "min-h-[calc(100dvh-3.5rem)] w-full shrink-0 border-border md:min-h-dvh md:w-80 md:border-r lg:w-96",
        activeId && "hidden md:block",
      )}
    >
      <div className="sticky top-14 z-10 flex h-14 items-center border-b border-border bg-bg/90 px-4 backdrop-blur md:top-0">
        <h1 className="font-display text-xl font-semibold">Messages</h1>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<MessageCircle className="h-6 w-6" />} title="No messages yet">
          Start a conversation from any artist&apos;s profile with the Message button.
        </EmptyState>
      ) : (
        <ul>
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                className={cn("flex items-center gap-3 px-4 py-3 hover:bg-surface-2", activeId === c.id && "bg-surface-2")}
              >
                <Avatar user={c.other} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className={cn("truncate", c.unread ? "font-bold" : "font-semibold")}>{c.other.name}</p>
                    {c.other.verified && <VerifiedBadge />}
                    {c.lastMessage && <TimeAgo date={c.lastMessage.createdAt} className="ml-auto shrink-0 text-xs text-muted" />}
                  </div>
                  <p className={cn("flex items-center gap-1 truncate text-sm", c.unread ? "font-semibold text-fg" : "text-muted")}>
                    {c.lastMessage?.fromMe && <span>You:</span>}
                    {c.lastMessage?.deleted ? (
                      <em>Message deleted</em>
                    ) : c.lastMessage?.text ? (
                      <span className="truncate">{c.lastMessage.text}</span>
                    ) : c.lastMessage?.hasMedia ? (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5" /> Photo
                      </span>
                    ) : null}
                  </p>
                </div>
                {c.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
