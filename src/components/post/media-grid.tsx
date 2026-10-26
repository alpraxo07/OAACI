import Link from "next/link";
import { EyeOff, MessageCircle, Music2, Play, Star } from "lucide-react";
import { imageUrl } from "@/lib/media-url";
import { formatCount } from "@/components/ui/misc";
import type { PostDTO } from "@/lib/types";

/** Instagram-style square grid of photo, video and song posts. */
export function MediaGrid({ posts }: { posts: PostDTO[] }) {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((p) => {
        const media = p.media!;
        const thumb =
          media.kind === "IMAGE" ? media.url : media.kind === "VIDEO" ? media.thumbnailUrl : (p.cover?.url ?? null);
        return (
          <Link
            key={p.id}
            href={`/p/${p.id}`}
            data-post-id={p.id}
            className="group relative aspect-square overflow-hidden bg-surface-2"
            aria-label={p.trackTitle ?? (p.text.slice(0, 60) || "View post")}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(thumb, 400, true)}
                alt=""
                loading="lazy"
                className={`h-full w-full object-cover transition-transform group-hover:scale-[1.03] ${p.sensitive ? "scale-110 blur-xl" : ""}`}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary to-amber-500 p-2 text-center text-white">
                {media.kind === "AUDIO" ? <Music2 className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                {p.trackTitle && <span className="line-clamp-2 text-xs font-semibold">{p.trackTitle}</span>}
              </div>
            )}
            {p.sensitive && <EyeOff className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow" />}
            {media.kind !== "IMAGE" && (
              <span className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white">
                {media.kind === "VIDEO" ? <Play className="h-3.5 w-3.5 fill-current" /> : <Music2 className="h-3.5 w-3.5" />}
              </span>
            )}
            <span className="absolute inset-0 hidden items-center justify-center gap-4 bg-black/40 text-sm font-semibold text-white group-hover:flex">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-current" /> {formatCount(p.starCount)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4 fill-current" /> {formatCount(p.commentCount)}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
