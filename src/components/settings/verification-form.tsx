"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestVerification } from "@/actions/account";
import { useAction } from "@/components/use-action";
import { FormError, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";

export function VerificationForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [links, setLinks] = useState(["", "", ""]);
  const { execute, pending, error } = useAction(requestVerification);

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await execute({ message, links: links.filter((l) => l.trim()) });
        if (r?.ok) {
          toast.success("Request sent! We'll review it soon.");
          router.refresh();
        }
      }}
    >
      <h2 className="font-semibold">Apply for verification</h2>
      <FormError message={error} />
      <div>
        <label className="label" htmlFor="v-message">
          Tell us about your practice
        </label>
        <textarea
          id="v-message"
          className="input min-h-32"
          maxLength={1500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What you create, how long you've been practising, where you've exhibited or sold…"
          required
        />
      </div>
      <div className="space-y-2">
        <p className="label">Links that show your work (optional)</p>
        {links.map((l, i) => (
          <input
            key={i}
            className="input"
            value={l}
            placeholder="https://"
            onChange={(e) => setLinks(links.map((x, j) => (j === i ? e.target.value : x)))}
            aria-label={`Link ${i + 1}`}
          />
        ))}
      </div>
      {disabled && <p className="text-sm text-muted">Confirm your email address before applying.</p>}
      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={pending || disabled}>
          {pending && <Spinner />} Submit request
        </button>
      </div>
    </form>
  );
}
