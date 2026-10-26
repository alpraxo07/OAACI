"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/actions/auth";
import { useAction } from "@/components/use-action";
import { FormError, Spinner } from "@/components/ui/misc";
import { GoogleButton, OrDivider, PasswordInput, maxBirthDate } from "../auth-ui";
import { PhoneOtpForm } from "../phone-otp-form";

export function SignupForm({
  inviteOnly,
  initialInvite,
  googleEnabled,
  phoneEnabled,
}: {
  inviteOnly: boolean;
  initialInvite: string;
  googleEnabled: boolean;
  phoneEnabled: boolean;
}) {
  const [usePhone, setUsePhone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    dateOfBirth: "",
    inviteCode: initialInvite,
    agree: false,
  });
  const { execute, pending, error } = useAction(signUp);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  if (usePhone) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Verify your phone number first. Then you&apos;ll pick a username{inviteOnly ? " and enter your invite code" : ""}.
        </p>
        <PhoneOtpForm />
        <button className="btn btn-ghost w-full" onClick={() => setUsePhone(false)}>
          Sign up with email instead
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {(googleEnabled || phoneEnabled) && (
        <>
          <div className="grid gap-2">
            {googleEnabled && <GoogleButton href="/api/auth/google?next=/" label="Sign up with Google" />}
            {phoneEnabled && (
              <button className="btn btn-secondary btn-lg w-full" onClick={() => setUsePhone(true)}>
                Sign up with phone number
              </button>
            )}
          </div>
          <OrDivider />
        </>
      )}

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
              onChange={set("inviteCode")}
              placeholder="e.g. K7M2QX9P"
            />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input id="name" className="input" autoComplete="name" value={form.name} onChange={set("name")} required />
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
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                maxLength={20}
                required
              />
            </div>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" className="input" autoComplete="email" value={form.email} onChange={set("email")} required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            placeholder="At least 8 characters"
          />
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
            onChange={set("dateOfBirth")}
            required
          />
          <p className="hint">You must be 18 or older. This stays private and is never shown on your profile.</p>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--primary)]" checked={form.agree} onChange={set("agree")} />
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
    </div>
  );
}
