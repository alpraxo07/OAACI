"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { createInvites, setInviteDisabled } from "@/actions/admin";
import { useAction } from "@/components/use-action";
import { FormError, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";

type Invite = {
  id: string;
  code: string;
  usedCount: number;
  maxUses: number;
  expiresAt: string | null;
  note: string | null;
  disabled: boolean;
  createdBy: string | null;
  createdAt: string;
};

export function InviteAdmin({ invites, appUrl }: { invites: Invite[]; appUrl: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ count: "5", maxUses: "1", expiresInDays: "30", note: "" });
  const [created, setCreated] = useState<string[]>([]);
  const { execute, pending, error } = useAction(createInvites);

  const copy = (text: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied"),
      () => toast.error("Couldn't copy"),
    );

  return (
    <div className="space-y-4">
      <form
        className="card grid gap-3 p-4 sm:grid-cols-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await execute(form);
          if (r?.ok) {
            setCreated(r.data.codes);
            router.refresh();
          }
        }}
      >
        <div>
          <label className="label" htmlFor="inv-count">
            How many
          </label>
          <input id="inv-count" type="number" min={1} max={100} className="input" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="inv-uses">
            Uses each
          </label>
          <input id="inv-uses" type="number" min={1} className="input" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="inv-exp">
            Expires (days, 0 = never)
          </label>
          <input id="inv-exp" type="number" min={0} className="input" value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="inv-note">
            Note
          </label>
          <input id="inv-note" className="input" value={form.note} placeholder="e.g. Kolkata art fair" onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="flex items-end">
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending && <Spinner />} Create codes
          </button>
        </div>
        <div className="sm:col-span-5">
          <FormError message={error} />
        </div>
      </form>

      {created.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">New codes</p>
            <button className="btn btn-secondary btn-sm" onClick={() => copy(created.map((c) => `${c} — ${appUrl}/signup?invite=${c}`).join("\n"))}>
              <Copy className="h-3.5 w-3.5" /> Copy all with links
            </button>
          </div>
          <p className="mt-2 font-mono text-lg tracking-widest">{created.join("  ")}</p>
        </div>
      )}

      <ul className="card divide-y divide-border">
        {invites.map((i) => {
          const expired = i.expiresAt && new Date(i.expiresAt) < new Date();
          const usedUp = i.usedCount >= i.maxUses;
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <code className={cn("font-mono text-base tracking-widest", (i.disabled || expired || usedUp) && "text-muted line-through")}>{i.code}</code>
              <span className="text-muted">
                {i.usedCount}/{i.maxUses} used
              </span>
              <span className="min-w-0 flex-1 truncate text-muted">
                {i.createdBy ? `by @${i.createdBy}` : "by staff"}
                {i.note ? ` · ${i.note}` : ""}
                {i.expiresAt ? ` · ${expired ? "expired" : "expires"} ${new Date(i.expiresAt).toLocaleDateString("en-IN")}` : ""}
              </span>
              <button className="icon-btn" onClick={() => copy(`${appUrl}/signup?invite=${i.code}`)} aria-label="Copy link">
                <Copy className="h-4 w-4" />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  const r = await setInviteDisabled({ id: i.id, disabled: !i.disabled });
                  if (!r.ok) return toast.error(r.error);
                  router.refresh();
                }}
              >
                {i.disabled ? "Enable" : "Disable"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
