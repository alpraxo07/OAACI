"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth";
import { useAction } from "@/components/use-action";
import { FormError, FormSuccess, Spinner } from "@/components/ui/misc";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { execute, pending, error } = useAction(requestPasswordReset);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Forgot your password?</h1>
      <p className="mt-1.5 text-muted">Enter your account email and we&apos;ll send you a link to choose a new one.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await execute({ email });
          if (r?.ok) setSent(true);
        }}
      >
        <FormError message={error} />
        <FormSuccess message={sent ? "If an account exists for that email, a reset link is on its way. Check your inbox and spam folder." : null} />
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button className="btn btn-primary btn-lg w-full" disabled={pending}>
          {pending && <Spinner />} Send reset link
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Signed up with your phone? Log in with a code on the{" "}
        <Link href="/login" className="link">
          login page
        </Link>
        .
      </p>
    </div>
  );
}
