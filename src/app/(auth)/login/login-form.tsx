"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Smartphone } from "lucide-react";
import { logIn } from "@/actions/auth";
import { useAction } from "@/components/use-action";
import { FormError, Spinner } from "@/components/ui/misc";
import { GoogleButton, OrDivider, PasswordInput } from "../auth-ui";
import { PhoneOtpForm } from "../phone-otp-form";
import { cn } from "@/lib/cn";

export function LoginForm({
  next,
  googleEnabled,
  phoneEnabled,
  initialError,
}: {
  next: string;
  googleEnabled: boolean;
  phoneEnabled: boolean;
  initialError?: string;
}) {
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { execute, pending, error } = useAction(logIn);

  return (
    <div className="space-y-5">
      {googleEnabled && (
        <>
          <GoogleButton href={`/api/auth/google?next=${encodeURIComponent(next)}`} label="Continue with Google" />
          <OrDivider />
        </>
      )}

      {phoneEnabled && (
        <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1" role="tablist">
          {(
            [
              ["email", "Email or username", Mail],
              ["phone", "Phone number", Smartphone],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              role="tab"
              aria-selected={method === value}
              onClick={() => setMethod(value)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition-colors",
                method === value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      <FormError message={error ?? initialError} />

      {method === "email" ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            execute({ identifier, password, next });
          }}
        >
          <div>
            <label className="label" htmlFor="identifier">
              Email or username
            </label>
            <input
              id="identifier"
              className="input"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="password">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs link">
                Forgot password?
              </Link>
            </div>
            <PasswordInput id="password" autoComplete="current-password" value={password} onChange={setPassword} />
          </div>
          <button className="btn btn-primary btn-lg w-full" disabled={pending}>
            {pending && <Spinner />} Log in
          </button>
        </form>
      ) : (
        <PhoneOtpForm next={next} />
      )}
    </div>
  );
}
