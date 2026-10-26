"use client";

import Link from "next/link";
import { MailWarning } from "lucide-react";
import { resendVerification } from "@/actions/auth";
import { useAction } from "@/components/use-action";
import { toast } from "@/components/ui/toaster";

export function VerifyEmailBanner({ hasEmail }: { hasEmail: boolean }) {
  const { execute, pending } = useAction(resendVerification);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-border bg-surface-2 px-4 py-2 text-sm">
      <MailWarning className="h-4 w-4 text-primary-text" />
      <span>
        {hasEmail ? "Confirm your email to start posting and messaging." : "Add an email address to your account to start posting."}
      </span>
      {hasEmail ? (
        <button
          className="font-semibold text-primary-text hover:underline disabled:opacity-60"
          disabled={pending}
          onClick={async () => {
            const r = await execute();
            if (r?.ok) toast.success("Sent! Check your inbox.");
            else if (r) toast.error(r.error);
          }}
        >
          Resend email
        </button>
      ) : (
        <Link href="/settings/account" className="font-semibold text-primary-text hover:underline">
          Add email
        </Link>
      )}
    </div>
  );
}
