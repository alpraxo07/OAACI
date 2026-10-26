import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { readSignedPayload } from "@/lib/crypto";
import { UserError } from "@/lib/action";
import { fetchGoogleProfile } from "@/lib/auth/google";
import { assertCanLogIn, promoteIfAdminEmail } from "@/lib/auth/accounts";
import { createSession } from "@/lib/auth/session";
import { setPendingSignup } from "@/lib/auth/pending";

const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, env.appUrl));

export async function GET(request: NextRequest) {
  const saved = readSignedPayload<{ state: string; verifier: string; next: string }>(
    request.cookies.get("oaaci_oauth")?.value,
  );
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!env.google || !saved || !code || state !== saved.state) return fail("google_failed");

  let profile;
  try {
    profile = await fetchGoogleProfile(code, saved.verifier);
  } catch (error) {
    console.error(error);
    return fail("google_failed");
  }
  const email = profile.email && profile.email_verified ? profile.email.toLowerCase() : null;

  let user = await db.user.findUnique({ where: { googleId: profile.sub } });
  if (!user && email) {
    const byEmail = await db.user.findUnique({ where: { email } });
    if (byEmail) {
      user = await db.user.update({
        where: { id: byEmail.id },
        data: { googleId: profile.sub, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() },
      });
      if (!byEmail.emailVerifiedAt) await promoteIfAdminEmail(user.id, email);
    }
  }

  if (user) {
    try {
      await assertCanLogIn(user);
    } catch (error) {
      if (error instanceof UserError) return fail("suspended");
      throw error;
    }
    await createSession(user.id);
    const next = saved.next.startsWith("/") && !saved.next.startsWith("//") ? saved.next : "/";
    const res = NextResponse.redirect(new URL(next, env.appUrl));
    res.cookies.delete("oaaci_oauth");
    return res;
  }

  await setPendingSignup({
    provider: "google",
    googleId: profile.sub,
    email,
    name: profile.name?.slice(0, 50) ?? "",
    picture: profile.picture ?? null,
  });
  const res = NextResponse.redirect(new URL("/signup/complete", env.appUrl));
  res.cookies.delete("oaaci_oauth");
  return res;
}
