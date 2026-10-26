"use client";

import Link from "next/link";
import { tokenize } from "@/lib/text";
import { cn } from "@/lib/cn";

/** Renders post/comment text with clickable #hashtags, @mentions and links. */
export function RichText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <p className={cn("whitespace-pre-wrap break-words", className)}>
      {tokenize(text).map((t, i) => {
        switch (t.type) {
          case "hashtag":
            return (
              <Link key={i} href={`/tag/${encodeURIComponent(t.tag)}`} className="text-primary-text hover:underline" onClick={(e) => e.stopPropagation()}>
                {t.value}
              </Link>
            );
          case "mention":
            return (
              <Link key={i} href={`/${t.username}`} className="text-primary-text hover:underline" onClick={(e) => e.stopPropagation()}>
                {t.value}
              </Link>
            );
          case "link":
            return (
              <a
                key={i}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="text-primary-text hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {t.value.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}
                {t.value.replace(/^https?:\/\/(www\.)?/, "").length > 40 ? "…" : ""}
              </a>
            );
          default:
            return <span key={i}>{t.value}</span>;
        }
      })}
    </p>
  );
}
