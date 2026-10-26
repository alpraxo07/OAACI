import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Media, MediaKind } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { sha1 } from "./crypto";
import { UserError } from "./action";
import { MEDIA_LIMITS } from "./constants";
import { checkImage } from "./moderation";

export const UPLOAD_PURPOSES = ["post", "avatar", "cover", "message", "listing", "ad"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export type UploadTarget =
  | { provider: "cloudinary"; url: string; fields: Record<string, string> }
  | { provider: "local"; url: string; fields: Record<string, string> };

const resourceType = (kind: MediaKind) => (kind === "IMAGE" ? "image" : "video");

function signCloudinary(params: Record<string, string | number>): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return sha1(toSign + env.cloudinary!.apiSecret);
}

export function assertKindAllowed(kind: MediaKind, purpose: UploadPurpose) {
  if (purpose !== "post" && kind !== "IMAGE") throw new UserError("Only images can be uploaded here.");
}

/** Where the browser should upload a file. Files go straight to Cloudinary, not through our server. */
export function getUploadTarget(kind: MediaKind, purpose: UploadPurpose): UploadTarget {
  assertKindAllowed(kind, purpose);
  if (env.cloudinary) {
    const params = {
      allowed_formats: MEDIA_LIMITS[kind].formats.join(","),
      folder: `oaaci/${purpose}`,
      timestamp: Math.floor(Date.now() / 1000),
    };
    return {
      provider: "cloudinary",
      url: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/${resourceType(kind)}/upload`,
      fields: {
        ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
        api_key: env.cloudinary.apiKey,
        signature: signCloudinary(params),
      },
    };
  }
  if (env.isProd) {
    throw new UserError("Uploads aren't set up yet. The site admin needs to add Cloudinary keys.");
  }
  return { provider: "local", url: "/api/media/local", fields: { kind, purpose } };
}

function checkLimits(kind: MediaKind, bytes: number, format: string | null, duration: number | null) {
  const limits = MEDIA_LIMITS[kind];
  if (bytes > limits.maxBytes) throw new UserError(`That file is too big. Allowed: ${limits.label}.`);
  if (format && !limits.formats.includes(format.toLowerCase())) {
    throw new UserError(`That file type isn't supported. Allowed: ${limits.label}.`);
  }
  if (limits.maxDuration && duration && duration > limits.maxDuration + 1) {
    throw new UserError(`That file is too long. Allowed: ${limits.label}.`);
  }
}

async function moderate(kind: MediaKind, url: string, thumbnailUrl: string | null) {
  const target = kind === "IMAGE" ? url : kind === "VIDEO" ? thumbnailUrl : null;
  if (!target) return { flagged: false, sensitive: false };
  const verdict = await checkImage(target);
  return { flagged: verdict.flagged, sensitive: verdict.sensitive };
}

export type CloudinaryUploadResult = {
  public_id: string;
  version: number;
  signature: string;
  resource_type: string;
  format?: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
};

/** Verifies an upload Cloudinary reported back to the browser, then records it. */
export async function confirmCloudinaryUpload(ownerId: string, kind: MediaKind, r: CloudinaryUploadResult): Promise<Media> {
  if (!env.cloudinary) throw new UserError("Uploads aren't set up.");
  const expected = sha1(`public_id=${r.public_id}&version=${r.version}${env.cloudinary.apiSecret}`);
  if (expected !== r.signature) throw new UserError("Upload could not be verified. Please try again.");
  if (r.resource_type !== resourceType(kind)) throw new UserError("Unexpected file type.");
  if (!r.public_id.startsWith("oaaci/")) throw new UserError("Upload could not be verified.");

  const format = r.format ?? null;
  const duration = r.duration ?? null;
  checkLimits(kind, r.bytes, format, duration);

  const base = `https://res.cloudinary.com/${env.cloudinary.cloudName}/${r.resource_type}/upload`;
  const url = `${base}/v${r.version}/${r.public_id}${format ? `.${format}` : ""}`;
  const thumbnailUrl = kind === "VIDEO" ? `${base}/so_0,f_jpg,q_auto,w_720/v${r.version}/${r.public_id}.jpg` : null;
  const verdict = await moderate(kind, url, thumbnailUrl);

  return db.media.create({
    data: {
      ownerId,
      kind,
      provider: "cloudinary",
      url,
      publicId: r.public_id,
      thumbnailUrl,
      width: r.width ?? null,
      height: r.height ?? null,
      duration,
      bytes: r.bytes,
      format,
      ...verdict,
    },
  });
}

/** Development-only: stores the file under public/uploads. */
export async function saveLocalUpload(
  ownerId: string,
  kind: MediaKind,
  file: File,
  meta: { width?: number; height?: number; duration?: number },
): Promise<Media> {
  if (env.isProd) throw new UserError("Local uploads are disabled in production.");
  const ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  checkLimits(kind, file.size, ext || null, meta.duration ?? null);
  const folder = path.join(process.cwd(), "public", "uploads");
  await mkdir(folder, { recursive: true });
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer()));
  return db.media.create({
    data: {
      ownerId,
      kind,
      provider: "local",
      url: `/uploads/${name}`,
      publicId: name,
      width: meta.width ?? null,
      height: meta.height ?? null,
      duration: meta.duration ?? null,
      bytes: file.size,
      format: ext,
    },
  });
}

/** Loads a media row the user owns and checks its kind, for attaching to content. */
export async function ownedMedia(mediaId: string, ownerId: string, kinds: MediaKind[]): Promise<Media> {
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media || media.ownerId !== ownerId) throw new UserError("That upload wasn't found. Please upload it again.");
  if (!kinds.includes(media.kind)) throw new UserError("That type of file can't be used here.");
  return media;
}

/** Best-effort removal of the stored file (Cloudinary or local). */
export async function deleteStoredFile(media: Pick<Media, "provider" | "publicId" | "kind">): Promise<void> {
  try {
    if (media.provider === "cloudinary" && env.cloudinary && media.publicId) {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = signCloudinary({ public_id: media.publicId, timestamp });
      await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/${resourceType(media.kind)}/destroy`, {
        method: "POST",
        body: new URLSearchParams({
          public_id: media.publicId,
          timestamp: String(timestamp),
          api_key: env.cloudinary.apiKey,
          signature,
        }),
      });
    } else if (media.provider === "local" && media.publicId && !env.isProd) {
      await unlink(path.join(process.cwd(), "public", "uploads", path.basename(media.publicId)));
    }
  } catch (error) {
    console.error("[oaaci:media] delete failed", error);
  }
}

/** Deletes media rows (and files) that are no longer attached to anything. */
export async function deleteMediaIfUnused(mediaIds: (string | null | undefined)[]): Promise<void> {
  const ids = mediaIds.filter((id): id is string => Boolean(id));
  if (!ids.length) return;
  const unused = await db.media.findMany({
    where: {
      id: { in: ids },
      posts: { none: {} },
      coverPosts: { none: {} },
      messages: { none: {} },
      listingImages: { none: {} },
    },
  });
  for (const m of unused) await deleteStoredFile(m);
  if (unused.length) await db.media.deleteMany({ where: { id: { in: unused.map((m) => m.id) } } });
}
