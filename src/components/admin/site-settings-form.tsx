"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSiteSettings } from "@/actions/admin";
import { useAction } from "@/components/use-action";
import { FormError, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";

export function SiteSettingsForm({
  initial,
}: {
  initial: { inviteOnly: boolean; userInviteQuota: string; blockedWords: string; announcement: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const { execute, pending, error } = useAction(updateSiteSettings);

  return (
    <form
      className="card space-y-5 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await execute(form);
        if (r?.ok) {
          toast.success("Settings saved");
          router.refresh();
        }
      }}
    >
      <h2 className="section-title">Community</h2>
      <FormError message={error} />
      <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
        <span>
          <span className="block font-medium">Invite-only sign-up</span>
          <span className="text-sm text-muted">When off, anyone 18+ can create an account (going mainstream).</span>
        </span>
        <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={form.inviteOnly} onChange={(e) => setForm({ ...form, inviteOnly: e.target.checked })} />
      </label>
      <div>
        <label className="label" htmlFor="quota">
          Invites per member
        </label>
        <input id="quota" type="number" min={0} className="input w-32" value={form.userInviteQuota} onChange={(e) => setForm({ ...form, userInviteQuota: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="announcement">
          Announcement banner
        </label>
        <input
          id="announcement"
          className="input"
          maxLength={200}
          value={form.announcement}
          placeholder="e.g. Welcome to the OAACI beta! Share feedback with @oaaci_team"
          onChange={(e) => setForm({ ...form, announcement: e.target.value })}
        />
        <p className="hint">Shown at the top of every page. Leave empty to hide.</p>
      </div>
      <div>
        <label className="label" htmlFor="words">
          Extra blocked words
        </label>
        <textarea
          id="words"
          className="input min-h-24"
          value={form.blockedWords}
          onChange={(e) => setForm({ ...form, blockedWords: e.target.value })}
          placeholder="Separate with commas or new lines"
        />
        <p className="hint">Added to the built-in English, Hindi and Bengali list. Matching words are masked with *** in posts, comments and messages.</p>
      </div>
      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={pending}>
          {pending && <Spinner />} Save settings
        </button>
      </div>
    </form>
  );
}
