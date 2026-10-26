"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { createListing, updateListing } from "@/actions/market";
import { FormError, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { uploadFile, validateFile } from "@/components/upload";
import { imageUrl } from "@/lib/media-url";
import { LISTING_CATEGORIES, MEDIA_LIMITS } from "@/lib/constants";
import type { ListingDTO } from "@/lib/types";

type Img = { key: string; preview: string; mediaId: string | null; error: string | null };

export function ListingForm({ listing }: { listing?: ListingDTO }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    priceInr: listing ? String(listing.priceInr) : "",
    category: listing?.category ?? "",
    medium: listing?.medium ?? "",
    dimensions: listing?.dimensions ?? "",
  });
  const [images, setImages] = useState<Img[]>(
    listing?.images.map((m) => ({ key: m.id, preview: imageUrl(m.url, 300, true), mediaId: m.id, error: null })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList) => {
    const room = 6 - images.length;
    for (const file of [...files].slice(0, room)) {
      const invalid = validateFile(file, "IMAGE");
      if (invalid) {
        toast.error(invalid);
        continue;
      }
      const key = `${file.name}-${Date.now()}-${Math.random()}`;
      setImages((all) => [...all, { key, preview: URL.createObjectURL(file), mediaId: null, error: null }]);
      uploadFile(file, "IMAGE", "listing")
        .then((r) => setImages((all) => all.map((i) => (i.key === key ? { ...i, mediaId: r.media.id } : i))))
        .catch((e: Error) => setImages((all) => all.map((i) => (i.key === key ? { ...i, error: e.message } : i))));
    }
  };

  const uploading = images.some((i) => !i.mediaId && !i.error);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const imageIds = images.filter((i) => i.mediaId).map((i) => i.mediaId!);
    const payload = { ...form, priceInr: Number(form.priceInr), imageIds, category: form.category as (typeof LISTING_CATEGORIES)[number] };
    setSaving(true);
    const r = listing ? await updateListing({ ...payload, id: listing.id }) : await createListing(payload);
    setSaving(false);
    if (!r.ok) return setError(r.error);
    toast.success(listing ? "Listing updated" : "Your listing is live!");
    router.push(`/market/${r.data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-5 p-4">
      <FormError message={error} />
      <div>
        <p className="label">Photos (up to 6) — the first one is the cover</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img, i) => (
            <div key={img.key} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt="" className="h-full w-full object-cover" />
              {!img.mediaId && !img.error && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Spinner className="text-white" />
                </span>
              )}
              {img.error && <span className="absolute inset-x-0 bottom-0 bg-danger p-1 text-[10px] text-white">{img.error}</span>}
              {i === 0 && <span className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
              <button
                type="button"
                onClick={() => setImages((all) => all.filter((x) => x.key !== img.key))}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {images.length < 6 && (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-sm text-muted hover:border-primary hover:text-primary-text"
            >
              <ImagePlus className="h-6 w-6" />
              Add photo
            </button>
          )}
        </div>
        <p className="hint">{MEDIA_LIMITS.IMAGE.label}. Show the whole piece, close-ups and the back or signature.</p>
        <input
          ref={input}
          type="file"
          hidden
          multiple
          accept={MEDIA_LIMITS.IMAGE.accept}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input id="title" className="input" maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Madhubani fish couple, acrylic on handmade paper" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="price">
            Price (₹)
          </label>
          <input
            id="price"
            type="number"
            inputMode="numeric"
            min={1}
            className="input"
            value={form.priceInr}
            onChange={(e) => setForm({ ...form, priceInr: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <select id="category" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
            <option value="" disabled>
              Choose…
            </option>
            {LISTING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="medium">
            Medium / material <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="medium" className="input" maxLength={100} value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })} placeholder="e.g. Terracotta, Oil on canvas" />
        </div>
        <div>
          <label className="label" htmlFor="dimensions">
            Size <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="dimensions" className="input" maxLength={100} value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} placeholder="e.g. 24 × 36 in" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          className="input min-h-36"
          maxLength={3000}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="The story behind the piece, technique, condition, framing, shipping options…"
          required
        />
      </div>
      <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
        Buyers will contact you by message. Agree on payment and delivery directly, and only sell work that is your own.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={saving || uploading}>
          {(saving || uploading) && <Spinner />} {uploading ? "Uploading photos…" : listing ? "Save changes" : "Publish listing"}
        </button>
      </div>
    </form>
  );
}
