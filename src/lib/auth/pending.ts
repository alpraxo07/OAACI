import "server-only";
import { cookies } from "next/headers";
import { env } from "../env";
import { readSignedPayload, signPayload } from "../crypto";

/** A Google or phone sign-in that still needs a username, birthday and invite. */
export type PendingSignup =
  | { provider: "google"; googleId: string; email: string | null; name: string; picture: string | null }
  | { provider: "phone"; phone: string };

const COOKIE = "oaaci_pending_signup";

export async function setPendingSignup(data: PendingSignup) {
  (await cookies()).set(COOKIE, signPayload(data, 1800), {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 1800,
  });
}

export async function getPendingSignup(): Promise<PendingSignup | null> {
  return readSignedPayload<PendingSignup>((await cookies()).get(COOKIE)?.value);
}

export async function clearPendingSignup() {
  (await cookies()).delete(COOKIE);
}
