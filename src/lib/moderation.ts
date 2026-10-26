import "server-only";
import { env } from "./env";

export type ImageVerdict = { flagged: boolean; sensitive: boolean; score: number | null };

const SAFE: ImageVerdict = { flagged: false, sensitive: false, score: null };

/**
 * Checks an image for sexual content with Sightengine (if configured).
 * - flagged: explicit content → the post is held for a moderator
 * - sensitive: suggestive or artistic nudity → shown blurred behind a warning
 * Nudity is common in fine art, so we blur rather than block where possible.
 */
export async function checkImage(url: string): Promise<ImageVerdict> {
  if (!env.sightengine || !url.startsWith("https://")) return SAFE;
  try {
    const params = new URLSearchParams({
      url,
      models: "nudity-2.1",
      api_user: env.sightengine.user,
      api_secret: env.sightengine.secret,
    });
    const res = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data?.status !== "success" || !data.nudity) return SAFE;
    const n = data.nudity as Record<string, number>;
    const explicit = Math.max(n.sexual_activity ?? 0, n.sexual_display ?? 0);
    const suggestive = Math.max(n.erotica ?? 0, n.very_suggestive ?? 0);
    return {
      flagged: explicit >= 0.85,
      sensitive: explicit >= 0.4 || suggestive >= 0.6,
      score: Math.max(explicit, suggestive),
    };
  } catch (error) {
    console.error("[oaaci:moderation] image check failed", error);
    return SAFE;
  }
}
