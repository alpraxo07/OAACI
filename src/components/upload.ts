"use client";

import { MEDIA_LIMITS, type MediaKindName } from "@/lib/constants";
import type { MediaDTO } from "@/lib/types";

export type UploadPurpose = "post" | "avatar" | "cover" | "message" | "listing" | "ad";

export type UploadResult = { media: MediaDTO; flagged: boolean; sensitive: boolean };

export function kindForFile(file: File): MediaKindName | null {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/")) return "VIDEO";
  if (file.type.startsWith("audio/")) return "AUDIO";
  return null;
}

/** Reads width/height/duration in the browser so we can check limits before uploading. */
async function readMeta(file: File, kind: MediaKindName): Promise<{ width?: number; height?: number; duration?: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (kind === "IMAGE") {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      return { width: img.naturalWidth, height: img.naturalHeight };
    }
    const el = document.createElement(kind === "VIDEO" ? "video" : "audio");
    el.preload = "metadata";
    await new Promise((resolve, reject) => {
      el.onloadedmetadata = resolve;
      el.onerror = reject;
      el.src = url;
    });
    const video = el as HTMLVideoElement;
    return {
      duration: Number.isFinite(el.duration) ? el.duration : undefined,
      width: video.videoWidth || undefined,
      height: video.videoHeight || undefined,
    };
  } catch {
    return {};
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function validateFile(file: File, kind: MediaKindName): string | null {
  const limits = MEDIA_LIMITS[kind];
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!limits.formats.includes(ext)) return `That file type isn't supported. Allowed: ${limits.label}.`;
  if (file.size > limits.maxBytes) return `That file is too big. Allowed: ${limits.label}.`;
  return null;
}

function xhrUpload(url: string, form: FormData, onProgress?: (p: number) => void): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else {
        const msg =
          (data as { error?: string | { message?: string } })?.error;
        reject(new Error(typeof msg === "string" ? msg : msg?.message || "Upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Please check your connection."));
    xhr.send(form);
  });
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed. Please try again.");
  return data as T;
}

/**
 * Uploads a file: asks our server where to send it, sends it straight to
 * storage (Cloudinary) with progress, then has our server verify and record it.
 */
export async function uploadFile(
  file: File,
  kind: MediaKindName,
  purpose: UploadPurpose,
  onProgress?: (p: number) => void,
): Promise<UploadResult> {
  const invalid = validateFile(file, kind);
  if (invalid) throw new Error(invalid);
  const meta = await readMeta(file, kind);
  const maxDuration = MEDIA_LIMITS[kind].maxDuration;
  if (maxDuration && meta.duration && meta.duration > maxDuration + 1) {
    throw new Error(`That file is too long. Allowed: ${MEDIA_LIMITS[kind].label}.`);
  }

  const target = await postJson<{ provider: "cloudinary" | "local"; url: string; fields: Record<string, string> }>(
    "/api/media/sign",
    { kind, purpose },
  );
  const form = new FormData();
  for (const [k, v] of Object.entries(target.fields)) form.append(k, v);
  if (target.provider === "local") {
    for (const [k, v] of Object.entries(meta)) if (v !== undefined) form.append(k, String(v));
  }
  form.append("file", file);
  const uploaded = await xhrUpload(target.url, form, onProgress);

  if (target.provider === "local") return uploaded as UploadResult;
  return postJson<UploadResult>("/api/media/confirm", { kind, result: uploaded });
}
