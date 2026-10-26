"use client";

import { useState } from "react";
import { imageUrl } from "@/lib/media-url";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import type { MediaDTO } from "@/lib/types";

export function ListingGallery({ images, sold }: { images: MediaDTO[]; sold: boolean }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = images[index];
  if (!current) return null;

  return (
    <div>
      <button className="relative block w-full overflow-hidden rounded-2xl border border-border bg-surface-2" onClick={() => setZoom(true)} aria-label="View full size">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(current.url, 1080)} alt="" className="max-h-[70dvh] w-full object-contain" />
        {sold && <span className="absolute top-3 left-3 rounded-full bg-fg px-3 py-1 text-sm font-bold text-bg">SOLD</span>}
      </button>
      {images.length > 1 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setIndex(i)}
              className={cn("h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2", i === index ? "border-primary" : "border-transparent opacity-70")}
              aria-label={`Photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(img.url, 160, true)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <Modal open={zoom} onClose={() => setZoom(false)} title="" wide className="bg-black sm:max-w-5xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(current.url, 2048)} alt="" className="max-h-[85dvh] w-full object-contain" />
      </Modal>
    </div>
  );
}
