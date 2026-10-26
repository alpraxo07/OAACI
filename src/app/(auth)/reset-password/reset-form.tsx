"use client";

import { useState } from "react";
import { resetPassword } from "@/actions/auth";
import { useAction } from "@/components/use-action";
import { FormError, Spinner } from "@/components/ui/misc";
import { PasswordInput } from "../auth-ui";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { execute, pending, error, setError } = useAction(resetPassword);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (password !== confirm) return setError("The two passwords don't match.");
        execute({ token, password });
      }}
    >
      <FormError message={error} />
      <div>
        <label className="label" htmlFor="password">
          New password
        </label>
        <PasswordInput id="password" autoComplete="new-password" value={password} onChange={setPassword} placeholder="At least 8 characters" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          Confirm new password
        </label>
        <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={setConfirm} />
      </div>
      <button className="btn btn-primary btn-lg w-full" disabled={pending}>
        {pending && <Spinner />} Save password and log in
      </button>
    </form>
  );
}
