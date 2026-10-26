import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Link missing</h1>
        <p className="mt-2 text-muted">
          This page needs the link from your email.{" "}
          <Link className="link" href="/forgot-password">
            Request a new link
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Choose a new password</h1>
      <p className="mt-1.5 text-muted">You&apos;ll be logged out on all other devices.</p>
      <div className="mt-8">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
