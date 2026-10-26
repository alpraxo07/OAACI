"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Check, CheckCheck, Eraser, Flag, ImagePlus, SendHorizontal, Trash2, X } from "lucide-react";
import { clearConversation, deleteMessage, markConversationRead, sendMessage, sendTyping } from "@/actions/messages";
import { setBlocked } from "@/actions/social";
import { useMe, useRealtime, useRealtimeEvent } from "@/components/providers";
import { Avatar } from "@/components/ui/avatar";
import { Menu } from "@/components/ui/menu";
import { ConfirmModal, Modal } from "@/components/ui/modal";
import { Spinner, VerifiedBadge } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { ReportDialog } from "@/components/report-dialog";
import { RichText } from "@/components/post/rich-text";
import { uploadFile, validateFile } from "@/components/upload";
import { imageUrl } from "@/lib/media-url";
import { MEDIA_LIMITS, MESSAGE_MAX_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/cn";
import type { MessageDTO, UserMini } from "@/lib/types";

/** Tells the inbox list to reload (e.g. after sending the first message). */
export const INBOX_REFRESH_EVENT = "oaaci:inbox-refresh";

type Snapshot = { messages: MessageDTO[]; otherLastReadAt: string | null; otherTyping: boolean };

function merge(prev: MessageDTO[], incoming: MessageDTO[]): MessageDTO[] {
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export function Chat({
  conversationId,
  other,
  canSend,
  cannotSendReason,
  initial,
}: {
  conversationId: string;
  other: UserMini;
  canSend: boolean;
  cannotSendReason?: string;
  initial: Snapshot;
}) {
  const me = useMe()!;
  const router = useRouter();
  const { connected } = useRealtime();
  const [messages, setMessages] = useState(initial.messages);
  const [otherReadAt, setOtherReadAt] = useState(initial.otherLastReadAt);
  const [otherTyping, setOtherTyping] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [image, setImage] = useState<{ file: File; preview: string; mediaId: string | null; error: string | null } | null>(null);
  const [hasOlder, setHasOlder] = useState(initial.messages.length >= 50);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reporting, setReporting] = useState<{ type: "USER" | "MESSAGE"; id: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stickToBottom = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, { cache: "no-store" });
      if (!res.ok) return;
      const snap = (await res.json()) as Snapshot;
      setMessages((prev) => {
        const next = merge(prev, snap.messages);
        if (next.length !== prev.length) window.dispatchEvent(new Event(INBOX_REFRESH_EVENT));
        return next;
      });
      setOtherReadAt(snap.otherLastReadAt);
      if (!connected) setOtherTyping(snap.otherTyping);
    } catch {}
  }, [conversationId, connected]);

  // Real-time updates, or polling when Pusher isn't configured.
  useRealtimeEvent((e) => {
    if (!("conversationId" in e) || e.conversationId !== conversationId) return;
    if (e.type === "message") refresh();
    if (e.type === "read") setOtherReadAt(e.at);
    if (e.type === "typing") {
      setOtherTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setOtherTyping(false), 5000);
    }
  });
  useEffect(() => {
    const t = setInterval(refresh, connected ? 30_000 : 3_000);
    return () => clearInterval(t);
  }, [connected, refresh]);

  // Mark as read when new messages from the other person are visible.
  const lastIncoming = [...messages].reverse().find((m) => m.senderId !== me.id)?.id;
  useEffect(() => {
    if (!lastIncoming) return;
    const markRead = () => {
      if (document.visibilityState === "visible") markConversationRead({ conversationId });
    };
    markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
  }, [lastIncoming, conversationId]);

  // Keep the view pinned to the newest message.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, otherTyping]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingOlder(true);
    const el = scroller.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const res = await fetch(`/api/conversations/${conversationId}?before=${encodeURIComponent(oldest.createdAt)}`);
    setLoadingOlder(false);
    if (!res.ok) return;
    const snap = (await res.json()) as Snapshot;
    stickToBottom.current = false;
    setMessages((prev) => merge(prev, snap.messages));
    setHasOlder(snap.messages.length >= 50);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  };

  const onType = (value: string) => {
    setText(value);
    if (Date.now() - lastTypingSent.current > 3000 && value.trim()) {
      lastTypingSent.current = Date.now();
      sendTyping({ conversationId });
    }
  };

  const pickImage = (file: File) => {
    const invalid = validateFile(file, "IMAGE");
    if (invalid) return toast.error(invalid);
    const preview = URL.createObjectURL(file);
    setImage({ file, preview, mediaId: null, error: null });
    uploadFile(file, "IMAGE", "message")
      .then((r) => setImage((img) => (img?.preview === preview ? { ...img, mediaId: r.media.id } : img)))
      .catch((e: Error) => setImage((img) => (img?.preview === preview ? { ...img, error: e.message } : img)));
  };

  const send = async () => {
    if (sending || (!text.trim() && !image?.mediaId) || (image && !image.mediaId)) return;
    setSending(true);
    const r = await sendMessage({ conversationId, text, mediaId: image?.mediaId ?? null });
    setSending(false);
    if (!r.ok) return toast.error(r.error);
    stickToBottom.current = true;
    setMessages((prev) => merge(prev, [r.data]));
    window.dispatchEvent(new Event(INBOX_REFRESH_EVENT));
    setText("");
    if (image) URL.revokeObjectURL(image.preview);
    setImage(null);
  };

  const myLastMessage = [...messages].reverse().find((m) => m.senderId === me.id && !m.deleted);
  const seen = Boolean(myLastMessage && otherReadAt && otherReadAt >= myLastMessage.createdAt);

  return (
    <section className="fixed inset-0 z-40 flex min-w-0 flex-col bg-bg md:static md:z-auto md:h-dvh md:flex-1">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3">
        <Link href="/messages" className="icon-btn md:hidden" aria-label="Back to messages">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link href={`/${other.username}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar user={other} size="sm" />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate font-semibold">
              {other.name} {other.verified && <VerifiedBadge />}
            </p>
            <p className="truncate text-xs text-muted">{otherTyping ? "typing…" : `@${other.username}`}</p>
          </div>
        </Link>
        <Menu
          items={[
            {
              label: "Clear chat for me",
              icon: <Eraser />,
              onSelect: async () => {
                const r = await clearConversation({ conversationId });
                if (!r.ok) return toast.error(r.error);
                toast.success("Chat cleared");
                router.push("/messages");
              },
            },
            { label: `Block @${other.username}`, icon: <Ban />, danger: true, onSelect: () => setConfirmBlock(true) },
            { label: "Report account", icon: <Flag />, danger: true, onSelect: () => setReporting({ type: "USER", id: other.id }) },
          ]}
        />
      </header>

      <div ref={scroller} onScroll={onScroll} className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
        {hasOlder && (
          <div className="mb-4 flex justify-center">
            <button className="btn btn-secondary btn-sm" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder && <Spinner />} Load earlier messages
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Avatar user={other} size="xl" />
            <p className="mt-3 font-display text-xl font-semibold">{other.name}</p>
            <p className="text-sm text-muted">@{other.username}</p>
            <p className="mt-4 max-w-xs text-sm text-muted">Say hello — ask about their work, a commission or a piece you love.</p>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.senderId === me.id;
          const prev = messages[i - 1];
          const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          const grouped = prev && !newDay && prev.senderId === m.senderId && Date.parse(m.createdAt) - Date.parse(prev.createdAt) < 120_000;
          return (
            <div key={m.id}>
              {newDay && <p className="my-4 text-center text-xs font-medium text-muted">{dayLabel(m.createdAt)}</p>}
              <div className={cn("group flex items-end gap-1", mine ? "justify-end" : "justify-start", grouped ? "mt-0.5" : "mt-3")}>
                {mine && !m.deleted && (
                  <Menu
                    className="opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                    label="Message options"
                    items={[
                      {
                        label: "Delete for everyone",
                        icon: <Trash2 />,
                        danger: true,
                        onSelect: async () => {
                          const r = await deleteMessage({ id: m.id });
                          if (!r.ok) return toast.error(r.error);
                          setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, deleted: true, text: "", media: null } : x)));
                        },
                      },
                    ]}
                  />
                )}
                <div
                  className={cn(
                    "max-w-[78%] overflow-hidden rounded-2xl text-[15px] leading-snug",
                    m.deleted
                      ? "border border-dashed border-border px-3.5 py-2 text-sm text-muted italic"
                      : mine
                        ? "rounded-br-md bg-primary text-on-primary"
                        : "rounded-bl-md bg-surface-2 text-fg",
                  )}
                  title={timeLabel(m.createdAt)}
                >
                  {m.deleted ? (
                    "Message deleted"
                  ) : (
                    <>
                      {m.media && (
                        <button onClick={() => setZoom(m.media!.url)} className="block" aria-label="View image">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrl(m.media.url, 600)} alt="" className="max-h-80 w-full object-cover" />
                        </button>
                      )}
                      {m.text && <RichText text={m.text} className={cn("px-3.5 py-2", mine && "[&_a]:text-on-primary! [&_a]:underline")} />}
                    </>
                  )}
                </div>
                {!mine && !m.deleted && (
                  <Menu
                    className="opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                    label="Message options"
                    items={[{ label: "Report message", icon: <Flag />, danger: true, onSelect: () => setReporting({ type: "MESSAGE", id: m.id }) }]}
                  />
                )}
              </div>
              {mine && m.id === myLastMessage?.id && (
                <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted">
                  {timeLabel(m.createdAt)} ·{" "}
                  {seen ? (
                    <>
                      <CheckCheck className="h-3.5 w-3.5 text-primary-text" /> Seen
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Sent
                    </>
                  )}
                </p>
              )}
            </div>
          );
        })}
        {otherTyping && (
          <div className="mt-3 flex items-center gap-2">
            <span className="flex gap-1 rounded-2xl rounded-bl-md bg-surface-2 px-3.5 py-3" aria-label={`${other.name} is typing`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          </div>
        )}
      </div>

      {canSend ? (
        <div className="shrink-0 border-t border-border p-3">
          {image && (
            <div className="relative mb-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.preview} alt="" className="h-20 rounded-xl object-cover" />
              {!image.mediaId && !image.error && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                  <Spinner className="text-white" />
                </span>
              )}
              <button
                onClick={() => {
                  URL.revokeObjectURL(image.preview);
                  setImage(null);
                }}
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-fg text-bg"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {image.error && <p className="mt-1 text-xs text-danger">{image.error}</p>}
            </div>
          )}
          <div className="flex items-end gap-2">
            <button className="icon-btn shrink-0 text-primary-text" onClick={() => fileInput.current?.click()} aria-label="Attach photo">
              <ImagePlus className="h-5 w-5" />
            </button>
            <textarea
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder={me.contactVerified ? "Write a message…" : "Verify your email to send messages"}
              disabled={!me.contactVerified}
              className="input max-h-36 min-h-10 resize-none rounded-3xl py-2"
              aria-label="Message"
            />
            <button
              className="btn btn-primary h-10 w-10 shrink-0 p-0"
              onClick={send}
              disabled={sending || (!text.trim() && !image?.mediaId) || Boolean(image && !image.mediaId)}
              aria-label="Send"
            >
              {sending ? <Spinner /> : <SendHorizontal className="h-4 w-4" />}
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept={MEDIA_LIMITS.IMAGE.accept}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) pickImage(f);
            }}
          />
        </div>
      ) : (
        <p className="shrink-0 border-t border-border p-4 text-center text-sm text-muted">{cannotSendReason ?? "You can't reply to this conversation."}</p>
      )}

      <Modal open={Boolean(zoom)} onClose={() => setZoom(null)} title="" wide className="bg-black sm:max-w-4xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {zoom && <img src={imageUrl(zoom, 2048)} alt="" className="max-h-[80dvh] w-full object-contain" />}
      </Modal>
      <ConfirmModal
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={async () => {
          const r = await setBlocked({ userId: other.id, blocked: true });
          setConfirmBlock(false);
          if (!r.ok) return toast.error(r.error);
          toast.success(`Blocked @${other.username}`);
          router.push("/messages");
        }}
        title={`Block @${other.username}?`}
        body="They won't be able to message you or see your profile."
        confirmLabel="Block"
        danger
      />
      {reporting && <ReportDialog open onClose={() => setReporting(null)} targetType={reporting.type} targetId={reporting.id} />}
    </section>
  );
}
