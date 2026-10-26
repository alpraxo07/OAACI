import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { googleLoginEnabled, phoneLoginEnabled } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  if (await getCurrentUser()) redirect("/");
  const params = await searchParams;
  const invite = typeof params.invite === "string" ? params.invite.toUpperCase() : "";
  const { inviteOnly } = await getSettings();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Join OAACI</h1>
      <p className="mt-1.5 text-muted">
        {inviteOnly
          ? "OAACI is invite-only for now. You'll need an invite code from a member or from us."
          : "Create your artist account. It's free."}
      </p>
      <div className="mt-8">
        <SignupForm
          inviteOnly={inviteOnly}
          initialInvite={invite}
          googleEnabled={googleLoginEnabled()}
          phoneEnabled={phoneLoginEnabled()}
        />
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="link">
          Log in
        </Link>
        {inviteOnly && (
          <>
            {" · "}
            No invite?{" "}
            <Link href="/waitlist" className="link">
              Request one
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
