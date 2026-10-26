import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPendingSignup } from "@/lib/auth/pending";
import { getSettings } from "@/lib/settings";
import { CompleteSignupForm } from "./complete-form";

export const metadata: Metadata = { title: "Finish signing up" };

function suggestUsername(seed: string): string {
  return seed
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

export default async function CompleteSignupPage() {
  const pending = await getPendingSignup();
  if (!pending) redirect("/signup");
  const { inviteOnly } = await getSettings();

  const name = pending.provider === "google" ? pending.name : "";
  const username = pending.provider === "google" ? suggestUsername(pending.email?.split("@")[0] ?? pending.name) : "";

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Almost there</h1>
      <p className="mt-1.5 text-muted">
        {pending.provider === "google"
          ? `Signed in with Google${pending.email ? ` as ${pending.email}` : ""}.`
          : `Phone number ${pending.phone} verified.`}{" "}
        Finish setting up your account.
      </p>
      <div className="mt-8">
        <CompleteSignupForm inviteOnly={inviteOnly} initialName={name} initialUsername={username} />
      </div>
    </div>
  );
}
