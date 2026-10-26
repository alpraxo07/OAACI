"use client";

import { useState } from "react";
import { sendPhoneCode, verifyPhoneCode } from "@/actions/auth";
import { useAction } from "@/components/use-action";
import { FormError, Spinner } from "@/components/ui/misc";

export function PhoneOtpForm({ next = "/" }: { next?: string }) {
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const send = useAction(sendPhoneCode);
  const verify = useAction(verifyPhoneCode);

  if (!sentTo) {
    return (
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await send.execute({ phone });
          if (r?.ok) setSentTo(r.data.phone);
        }}
      >
        <FormError message={send.error} />
        <div>
          <label className="label" htmlFor="phone">
            Mobile number
          </label>
          <div className="flex gap-2">
            <span className="input w-auto shrink-0 bg-surface-2 text-muted">+91</span>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              className="input"
              placeholder="98765 43210"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <p className="hint">We&apos;ll text you a 6-digit code. Standard SMS rates may apply.</p>
        </div>
        <button className="btn btn-primary btn-lg w-full" disabled={send.pending}>
          {send.pending && <Spinner />} Send code
        </button>
      </form>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        verify.execute({ phone: sentTo, code, next });
      }}
    >
      <FormError message={verify.error ?? send.error} />
      <div>
        <label className="label" htmlFor="code">
          Enter the code sent to {sentTo}
        </label>
        <input
          id="code"
          className="input text-center text-2xl tracking-[0.5em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
        />
      </div>
      <button className="btn btn-primary btn-lg w-full" disabled={verify.pending || code.length !== 6}>
        {verify.pending && <Spinner />} Verify and continue
      </button>
      <div className="flex justify-between text-sm">
        <button type="button" className="link" onClick={() => setSentTo(null)}>
          Change number
        </button>
        <button type="button" className="link" disabled={send.pending} onClick={() => send.execute({ phone: sentTo })}>
          Resend code
        </button>
      </div>
    </form>
  );
}
