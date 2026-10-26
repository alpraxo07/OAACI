"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Ticket } from "lucide-react";
import { createMyInvite } from "@/actions/account";
import { useAction } from "@/components/use-action";
import { FormError, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";

type Invite = { code: string; used: boolean; usedBy: { username: string; name: string } | null };

export function InviteManager({
  appUrl,
  quota,
  inviteOnly,
  canCreate,
  invites: initial,
}: {
  appUrl: string;
  quota: number;
  inviteOnly: boolean;
  canCreate: boolean;
  invites: Invite[];
}) {
  const [invites, setInvites] = useState(initial);
  const { execute, pending, error } = useAction(createMyInvite);
  const left = Math.max(quota - invites.length, 0);

  const copy = async (code: string) => {
    const link = `${appUrl}/signup?invite=${code}`;
    try {
      await navigator.clipboard.writeText(`Join me on OAACI, a community for Indian artists: ${link} (invite code ${code})`);
      toast.success("Invite copied — paste it into WhatsApp, email or anywhere");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="card flex items-center gap-4 p-4">
        <span className="rounded-full bg-primary-soft p-3 text-primary-text">
          <Ticket className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <p className="font-semibold">
            {left} of {quota} invites left
          </p>
          <p className="text-sm text-muted">
            {inviteOnly
              ? "Each code lets one artist join. Invite people whose work you know and trust."
              : "OAACI is open to everyone right now, but invite links still help friends find you."}
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={pending || left === 0 || !canCreate}
          onClick={async () => {
            const r = await execute();
            if (r?.ok) {
              setInvites((all) => [{ code: r.data.code, used: false, usedBy: null }, ...all]);
              copy(r.data.code);
            }
          }}
        >
          {pending && <Spinner />} New invite
        </button>
      </div>
      {!canCreate && <p className="text-sm text-muted">Confirm your email address to create invites.</p>}
      <FormError message={error} />
      {invites.length > 0 && (
        <ul className="card divide-y divide-border">
          {invites.map((i) => (
            <li key={i.code} className="flex items-center gap-3 px-4 py-3">
              <code className={cn("font-mono text-lg tracking-widest", i.used && "text-muted line-through")}>{i.code}</code>
              <span className="flex-1 text-sm text-muted">
                {i.usedBy ? (
                  <>
                    Used by{" "}
                    <Link href={`/${i.usedBy.username}`} className="link">
                      {i.usedBy.name}
                    </Link>
                  </>
                ) : i.used ? (
                  "Used"
                ) : (
                  "Not used yet"
                )}
              </span>
              {!i.used && (
                <button className="btn btn-secondary btn-sm" onClick={() => copy(i.code)}>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
