"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { joinWaitlist } from "@/actions/auth";
import { useAction } from "@/components/use-action";
import { FormError, Spinner } from "@/components/ui/misc";

export default function WaitlistPage() {
  const [form, setForm] = useState({ name: "", email: "", portfolioUrl: "", message: "" });
  const [done, setDone] = useState(false);
  const { execute, pending, error } = useAction(joinWaitlist);

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 inline-flex rounded-full bg-success-soft p-4 text-success">
          <CircleCheck className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-semibold">You&apos;re on the list</h1>
        <p className="mt-2 text-muted">
          Thanks, {form.name.split(" ")[0]}! We review requests by hand and will email your invite code to {form.email}.
        </p>
        <Link href="/" className="btn btn-secondary mt-8">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Request an invite</h1>
      <p className="mt-1.5 text-muted">
        OAACI is opening slowly to keep the community genuine. Tell us a little about your work.
      </p>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await execute(form);
          if (r?.ok) setDone(true);
        }}
      >
        <FormError message={error} />
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input id="name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="portfolio">
            Portfolio or Instagram link <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="portfolio"
            className="input"
            placeholder="instagram.com/yourname"
            value={form.portfolioUrl}
            onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="message">
            What do you create? <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="message"
            className="input min-h-24"
            maxLength={500}
            placeholder="I'm a Madhubani painter from Darbhanga…"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        <button className="btn btn-primary btn-lg w-full" disabled={pending}>
          {pending && <Spinner />} Request invite
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Have a code already?{" "}
        <Link href="/signup" className="link">
          Sign up
        </Link>
      </p>
    </div>
  );
}
