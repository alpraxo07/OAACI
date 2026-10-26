// URL helpers for media. Safe to import from client components.

/**
 * Returns a resized, auto-format/auto-quality version of a Cloudinary image.
 * Other URLs (e.g. local development uploads) are returned unchanged.
 */
export function imageUrl(url: string | null | undefined, width: number, square = false): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const transform = square ? `f_auto,q_auto,c_fill,g_auto,w_${width},h_${width}` : `f_auto,q_auto,c_limit,w_${width}`;
  return url.replace("/upload/", `/upload/${transform}/`);
}

/** Streams Cloudinary video/audio with automatic quality. */
export function streamUrl(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/q_auto/");
}
