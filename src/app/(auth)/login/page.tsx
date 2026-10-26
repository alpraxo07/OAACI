import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { googleLoginEnabled, phoneLoginEnabled } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  google_failed: "Google sign-in didn't work. Please try again.",
  google_disabled: "Google sign-in isn't available right now.",
  suspended: "This account has been suspended.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  if (await getCurrentUser()) redirect(next.startsWith("/") ? next : "/");
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
      <p className="mt-1.5 text-muted">Log in to your OAACI account.</p>
      <div className="mt-8">
        <LoginForm next={next} googleEnabled={googleLoginEnabled()} phoneEnabled={phoneLoginEnabled()} initialError={error} />
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        New to OAACI?{" "}
        <Link href="/signup" className="link">
          Create an account
        </Link>{" "}
        or{" "}
        <Link href="/waitlist" className="link">
          request an invite
        </Link>
      </p>
    </div>
  );
}
