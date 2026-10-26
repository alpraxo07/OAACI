"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Music, Video, X } from "lucide-react";
import { createPost } from "@/actions/posts";
import { useMe } from "@/components/providers";
import { Avatar } from "@/components/ui/avatar";
import { FormError, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { uploadFile, validateFile, type UploadResult } from "@/components/upload";
import { MEDIA_LIMITS, POST_MAX_LENGTH, type MediaKindName } from "@/lib/constants";
import { cn } from "@/lib/cn";

type Attachment = {
  kind: MediaKindName;
  file: File;
  preview: string;
  progress: number;
  result: UploadResult | null;
  error: string | null;
};

function useAttachment() {
  const [att, setAtt] = useState<Attachment | null>(null);
  const current = useRef<Attachment | null>(null);

  const clear = () => {
    if (current.current) URL.revokeObjectURL(current.current.preview);
    current.current = null;
    setAtt(null);
  };

  const attach = (file: File, kind: MediaKindName, purpose: "post") => {
    const invalid = validateFile(file, kind);
    if (invalid) return toast.error(invalid);
    if (current.current) URL.revokeObjectURL(current.current.preview);
    const next: Attachment = { kind, file, preview: URL.createObjectURL(file), progress: 0, result: null, error: null };
    current.current = next;
    setAtt(next);
    uploadFile(file, kind, purpose, (progress) => {
      if (current.current === next) setAtt((a) => (a ? { ...a, progress } : a));
    })
      .then((result) => {
        if (current.current === next) setAtt((a) => (a ? { ...a, result, progress: 1 } : a));
      })
      .catch((e: Error) => {
        if (current.current === next) setAtt((a) => (a ? { ...a, error: e.message } : a));
      });
  };

  return { att, attach, clear };
}

function Progress({ value }: { value: number }) {
  return (
    <div className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-black/30">
      <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

function CharCounter({ length }: { length: number }) {
  const remaining = POST_MAX_LENGTH - length;
  const pct = Math.min(length / POST_MAX_LENGTH, 1);
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <span className="flex items-center gap-1.5">
      {remaining <= 20 && <span className={cn("text-xs tabular-nums", remaining < 0 ? "text-danger" : "text-muted")}>{remaining}</span>}
      <svg viewBox="0 0 24 24" className="h-6 w-6 -rotate-90" aria-hidden>
        <circle cx="12" cy="12" r={r} fill="none" stroke="var(--border)" strokeWidth="2.5" />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke={remaining < 0 ? "var(--danger)" : remaining <= 20 ? "var(--star)" : "var(--primary)"}
          strokeWidth="2.5"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function Composer({ onPosted, autoFocus = false, className }: { onPosted?: () => void; autoFocus?: boolean; className?: string }) {
  const me = useMe();
  const router = useRouter();
  const [text, setText] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const media = useAttachment();
  const cover = useAttachment();
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  if (!me) return null;

  if (!me.contactVerified) {
    return (
      <div className={cn("border-b border-border p-4 text-sm text-muted", className)}>
        Please confirm your email address to start posting. Check your inbox, or{" "}
        <Link href="/settings/account" className="link">
          resend the link
        </Link>
        .
      </div>
    );
  }

  const uploading = (media.att && !media.att.result && !media.att.error) || (cover.att && !cover.att.result && !cover.att.error);
  const tooLong = text.length > POST_MAX_LENGTH;
  const canPost = !posting && !uploading && !tooLong && !media.att?.error && (text.trim().length > 0 || media.att?.result);

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    const r = await createPost({
      text,
      mediaId: media.att?.result?.media.id ?? null,
      coverMediaId: media.att?.kind === "AUDIO" ? (cover.att?.result?.media.id ?? null) : null,
      trackTitle: media.att?.kind === "AUDIO" ? trackTitle : null,
      sensitive,
    });
    setPosting(false);
    if (!r.ok) return setError(r.error);
    setText("");
    setTrackTitle("");
    setSensitive(false);
    media.clear();
    cover.clear();
    toast.success(r.data.held ? "Posted — it will appear once a moderator reviews it." : "Posted!");
    onPosted?.();
    router.refresh();
  };

  const pick = (kind: MediaKindName) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    media.attach(file, kind, "post");
    if (kind !== "AUDIO") cover.clear();
  };

  return (
    <div className={cn("flex gap-3 border-b border-border p-4", className)}>
      <Avatar user={me} size="md" className="hidden sm:inline-flex" />
      <div className="min-w-0 flex-1">
        <textarea
          ref={textarea}
          autoFocus={autoFocus}
          disabled={posting}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Share your latest work, a story behind it, #hashtags…"
          rows={2}
          className="w-full resize-none bg-transparent py-1.5 text-[17px] leading-relaxed outline-none placeholder:text-muted/80"
          aria-label="Post text"
        />

        {media.att && (
          <div className="mt-2 space-y-2">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-2">
              {media.att.kind === "IMAGE" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.att.preview} alt="" className="max-h-96 w-full object-contain" />
              )}
              {media.att.kind === "VIDEO" && <video src={media.att.preview} className="max-h-96 w-full bg-black" controls muted />}
              {media.att.kind === "AUDIO" && (
                <div className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    onClick={() => coverInput.current?.click()}
                    className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-amber-500 text-white"
                    title="Add cover art"
                  >
                    {cover.att ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.att.preview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-6 w-6" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <input
                      className="input py-2"
                      placeholder="Song title"
                      maxLength={100}
                      value={trackTitle}
                      onChange={(e) => setTrackTitle(e.target.value)}
                    />
                    <p className="mt-1 truncate text-xs text-muted">
                      {media.att.file.name} · {cover.att ? "cover added" : "tap the square to add cover art"}
                    </p>
                  </div>
                </div>
              )}
              {!media.att.result && !media.att.error && <Progress value={media.att.progress} />}
              <button
                type="button"
                onClick={() => {
                  media.clear();
                  cover.clear();
                }}
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Remove attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {media.att.error && <FormError message={media.att.error} />}
            {cover.att?.error && <FormError message={`Cover: ${cover.att.error}`} />}
          </div>
        )}

        <FormError message={error} />

        <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border pt-2">
          <button type="button" className="icon-btn text-primary-text" title="Add photo" onClick={() => imageInput.current?.click()}>
            <ImagePlus className="h-5 w-5" />
          </button>
          <button type="button" className="icon-btn text-primary-text" title="Add video" onClick={() => videoInput.current?.click()}>
            <Video className="h-5 w-5" />
          </button>
          <button type="button" className="icon-btn text-primary-text" title="Add song" onClick={() => audioInput.current?.click()}>
            <Music className="h-5 w-5" />
          </button>
          {media.att && (
            <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} className="accent-[var(--primary)]" />
              Sensitive content
            </label>
          )}
          <div className="ml-auto flex items-center gap-3">
            <CharCounter length={text.length} />
            <button className="btn btn-primary" onClick={submit} disabled={!canPost}>
              {(posting || uploading) && <Spinner />}
              {uploading ? "Uploading…" : "Post"}
            </button>
          </div>
        </div>

        <input ref={imageInput} type="file" hidden accept={MEDIA_LIMITS.IMAGE.accept} onChange={pick("IMAGE")} />
        <input ref={videoInput} type="file" hidden accept={MEDIA_LIMITS.VIDEO.accept} onChange={pick("VIDEO")} />
        <input ref={audioInput} type="file" hidden accept={MEDIA_LIMITS.AUDIO.accept} onChange={pick("AUDIO")} />
        <input
          ref={coverInput}
          type="file"
          hidden
          accept={MEDIA_LIMITS.IMAGE.accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) cover.attach(file, "IMAGE", "post");
          }}
        />
      </div>
    </div>
  );
}
