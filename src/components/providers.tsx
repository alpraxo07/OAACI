"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Me, RealtimeEvent } from "@/lib/types";

// ─── Current user ───────────────────────────────────────────────────────

const MeContext = createContext<Me | null>(null);
export const useMe = () => useContext(MeContext);

// ─── Real-time events & unread counts ──────────────────────────────────

type Unread = { notifications: number; messages: number };

type RealtimeValue = {
  /** True when Pusher is connected; otherwise components should poll. */
  connected: boolean;
  subscribe: (fn: (e: RealtimeEvent) => void) => () => void;
  unread: Unread;
  refreshUnread: () => void;
};

const RealtimeContext = createContext<RealtimeValue>({
  connected: false,
  subscribe: () => () => {},
  unread: { notifications: 0, messages: 0 },
  refreshUnread: () => {},
});
export const useRealtime = () => useContext(RealtimeContext);

/** Subscribes to real-time events for the signed-in user. */
export function useRealtimeEvent(handler: (e: RealtimeEvent) => void) {
  const { subscribe } = useRealtime();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => subscribe((e) => ref.current(e)), [subscribe]);
}

function RealtimeProvider({ me, children }: { me: Me | null; children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [unread, setUnread] = useState<Unread>({ notifications: 0, messages: 0 });
  const listeners = useRef(new Set<(e: RealtimeEvent) => void>());

  const subscribe = useCallback((fn: (e: RealtimeEvent) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!me) return;
    try {
      const res = await fetch("/api/unread", { cache: "no-store" });
      if (res.ok) setUnread(await res.json());
    } catch {}
  }, [me]);

  // Pusher connection (optional).
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!me || !key) return;
    let disposed = false;
    let cleanup = () => {};
    import("pusher-js").then(({ default: Pusher }) => {
      if (disposed) return;
      const pusher = new Pusher(key, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2",
        channelAuthorization: { endpoint: "/api/realtime/auth", transport: "ajax" },
      });
      const channel = pusher.subscribe(`private-user-${me.id}`);
      channel.bind("event", (e: RealtimeEvent) => listeners.current.forEach((l) => l(e)));
      channel.bind("pusher:subscription_succeeded", () => setConnected(true));
      pusher.connection.bind("state_change", ({ current }: { current: string }) => setConnected(current === "connected"));
      cleanup = () => pusher.disconnect();
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [me]);

  // Unread badge counts: refresh on events, focus and on a timer.
  useEffect(() => {
    if (!me) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches from the server; state is set after the response
    refreshUnread();
    const timer = setInterval(refreshUnread, connected ? 120_000 : 30_000);
    const onFocus = () => refreshUnread();
    window.addEventListener("focus", onFocus);
    const unsubscribe = subscribe((e) => {
      if (e.type === "notification" || e.type === "message") refreshUnread();
    });
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      unsubscribe();
    };
  }, [me, connected, refreshUnread, subscribe]);

  const value = useMemo(() => ({ connected, subscribe, unread, refreshUnread }), [connected, subscribe, unread, refreshUnread]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

// ─── Global "create post" dialog ───────────────────────────────────────

const ComposeContext = createContext<{ open: boolean; setOpen: (open: boolean) => void }>({
  open: false,
  setOpen: () => {},
});
export const useCompose = () => useContext(ComposeContext);

function ComposeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <ComposeContext.Provider value={value}>{children}</ComposeContext.Provider>;
}

export function AppProviders({ me, children }: { me: Me | null; children: React.ReactNode }) {
  return (
    <MeContext.Provider value={me}>
      <RealtimeProvider me={me}>
        <ComposeProvider>{children}</ComposeProvider>
      </RealtimeProvider>
    </MeContext.Provider>
  );
}
