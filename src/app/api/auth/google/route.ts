import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { randomToken, signPayload } from "@/lib/crypto";
import { googleAuthUrl } from "@/lib/auth/google";

export async function GET(request: NextRequest) {
  if (!env.google) return NextResponse.redirect(new URL("/login?error=google_disabled", env.appUrl));
  const state = randomToken(16);
  const verifier = randomToken(48);
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const response = NextResponse.redirect(googleAuthUrl(state, verifier));
  response.cookies.set("oaaci_oauth", signPayload({ state, verifier, next }, 600), {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
