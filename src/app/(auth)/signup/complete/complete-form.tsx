"use client";

import { useState } from "react";
import Link from "next/link";
import { completeSignup } from "@/actions/auth";
import { useAction } from "@/components/use-action";
import { FormError, Spinner } from "@/components/ui/misc";
import { maxBirthDate } from "../../auth-ui";

export function CompleteSignupForm({
  inviteOnly,
  initialName,
  initialUsername,
}: {
  inviteOnly: boolean;
  initialName: string;
  initialUsername: string;
}) {
  const [form, setForm] = useState({
    name: initialName,
    username: initialUsername,
    dateOfBirth: "",
    inviteCode: "",
    agree: false,
  });
  const { execute, pending, error } = useAction(completeSignup);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        execute({ ...form, agree: form.agree as true });
      }}
    >
      <FormError message={error} />
      {inviteOnly && (
        <div>
          <label className="label" htmlFor="inviteCode">
            Invite code
          </label>
          <input
            id="inviteCode"
            className="input font-mono uppercase tracking-widest placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
            value={form.inviteCode}
            onChange={(e) => setForm((f) => ({ ...f, inviteCode: e.target.value }))}
          />
          <p className="hint">
            Don&apos;t have one?{" "}
            <Link href="/waitlist" className="link">
              Request an invite
            </Link>
          </p>
        </div>
      )}
      <div>
        <label className="label" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          className="input"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="username">
          Username
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">@</span>
          <input
            id="username"
            className="input pl-8"
            value={form.username}
            maxLength={20}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
            required
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="dob">
          Date of birth
        </label>
        <input
          id="dob"
          type="date"
          className="input"
          max={maxBirthDate()}
          value={form.dateOfBirth}
          onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
          required
        />
        <p className="hint">You must be 18 or older. This stays private.</p>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
          checked={form.agree}
          onChange={(e) => setForm((f) => ({ ...f, agree: e.target.checked }))}
        />
        <span>
          I&apos;m 18 or older and I agree to the{" "}
          <Link href="/terms" className="link" target="_blank">
            Terms
          </Link>
          ,{" "}
          <Link href="/privacy" className="link" target="_blank">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/guidelines" className="link" target="_blank">
            Community Guidelines
          </Link>
          .
        </span>
      </label>
      <button className="btn btn-primary btn-lg w-full" disabled={pending}>
        {pending && <Spinner />} Create account
      </button>
    </form>
  );
}
