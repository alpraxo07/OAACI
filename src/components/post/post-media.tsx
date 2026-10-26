"use client";

import { useEffect, useRef, useState } from "react";
import { EyeOff, Music2, Pause, Play } from "lucide-react";
import { imageUrl, streamUrl } from "@/lib/media-url";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import type { MediaDTO } from "@/lib/types";

function formatTime(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** A song player with optional cover art. */
export function AudioPlayer({ media, cover, title, artist }: { media: MediaDTO; cover: MediaDTO | null; title: string; artist: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(media.duration ?? 0);

  useEffect(() => {
    // Pause other players when this one starts.
    const onOtherPlay = (e: Event) => {
      if (e.target !== audio.current) audio.current?.pause();
    };
    document.addEventListener("play", onOtherPlay, true);
    return () => document.removeEventListener("play", onOtherPlay, true);
  }, []);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3" onClick={(e) => e.stopPropagation()}>
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary to-amber-500">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(cover.url, 200, true)} alt="" className="h-full w-full object-cover" />
        ) : (
          <Music2 className="absolute inset-0 m-auto h-8 w-8 text-white/90" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        <p className="truncate text-sm text-muted">{artist}</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={toggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
          </button>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            onChange={(e) => {
              const t = Number(e.target.value);
              if (audio.current) audio.current.currentTime = t;
              setTime(t);
            }}
            className="h-1 min-w-0 flex-1 accent-[var(--primary)]"
            aria-label="Seek"
          />
          <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted">
            {formatTime(time)} / {formatTime(duration)}
          </span>
        </div>
      </div>
      <audio
        ref={audio}
        src={streamUrl(media.url)}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
      />
    </div>
  );
}

/** Blurs content until the viewer chooses to see it. */
function SensitiveCover({ onReveal }: { onReveal: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onReveal();
      }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/30 p-4 text-center text-white backdrop-blur-2xl"
    >
      <EyeOff className="h-7 w-7" />
      <span className="font-semibold">Sensitive content</span>
      <span className="text-sm text-white/80">This may include nudity or mature themes. Tap to view.</span>
    </button>
  );
}

export function PostMedia({
  media,
  cover,
  trackTitle,
  artist,
  sensitive,
  className,
}: {
  media: MediaDTO;
  cover: MediaDTO | null;
  trackTitle: string | null;
  artist: string;
  sensitive: boolean;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(!sensitive);
  const [zoom, setZoom] = useState(false);

  if (media.kind === "AUDIO") {
    return (
      <div className={cn("relative overflow-hidden rounded-2xl", className)}>
        {!revealed && <SensitiveCover onReveal={() => setRevealed(true)} />}
        <AudioPlayer media={media} cover={cover} title={trackTitle ?? "Untitled"} artist={artist} />
      </div>
    );
  }

  const ratio = media.width && media.height ? Math.min(Math.max(media.width / media.height, 0.6), 2) : media.kind === "VIDEO" ? 16 / 9 : 1;

  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl border border-border bg-surface-2", className)}
      style={{ aspectRatio: ratio }}
      onClick={(e) => e.stopPropagation()}
    >
      {!revealed && <SensitiveCover onReveal={() => setRevealed(true)} />}
      {media.kind === "IMAGE" ? (
        <>
          <button className="block h-full w-full cursor-zoom-in" onClick={() => revealed && setZoom(true)} aria-label="View full image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(media.url, 1080)}
              alt=""
              loading="lazy"
              className={cn("h-full w-full object-cover", !revealed && "scale-110 blur-2xl")}
            />
          </button>
          <Modal open={zoom} onClose={() => setZoom(false)} wide className="bg-black sm:max-w-5xl" title="">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(media.url, 2048)} alt="" className="max-h-[80dvh] w-full object-contain" />
          </Modal>
        </>
      ) : (
        <video
          src={revealed ? streamUrl(media.url) : undefined}
          poster={media.thumbnailUrl ?? undefined}
          controls={revealed}
          playsInline
          preload="metadata"
          className={cn("h-full w-full bg-black object-contain", !revealed && "blur-2xl")}
        />
      )}
    </div>
  );
}
