import "server-only";
import Pusher from "pusher";
import { env } from "./env";

import type { RealtimeEvent } from "./types";

let pusher: Pusher | null = null;

export function getPusher(): Pusher | null {
  if (!env.pusher) return null;
  pusher ??= new Pusher({
    appId: env.pusher.appId,
    key: env.pusher.key,
    secret: env.pusher.secret,
    cluster: env.pusher.cluster,
    useTLS: true,
  });
  return pusher;
}

export const userChannel = (userId: string) => `private-user-${userId}`;

/**
 * Pushes a small "something changed" event to users. Clients then fetch the
 * actual data through authenticated endpoints, so nothing private travels
 * through Pusher. Without Pusher configured, clients poll instead.
 */
export async function emit(userIds: string[], event: RealtimeEvent): Promise<void> {
  const p = getPusher();
  if (!p || userIds.length === 0) return;
  try {
    await p.trigger(userIds.map(userChannel), "event", event);
  } catch (error) {
    console.error("[oaaci:realtime] trigger failed", error);
  }
}
