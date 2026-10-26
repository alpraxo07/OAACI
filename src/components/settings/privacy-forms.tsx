"use client";

import { useState } from "react";
import Link from "next/link";
import { setDmPolicy } from "@/actions/account";
import { setBlocked, setMuted } from "@/actions/social";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import type { UserMini } from "@/lib/types";

function PeopleList({ users, action, onAction }: { users: UserMini[]; action: string; onAction: (u: UserMini) => Promise<boolean> }) {
  const [list, setList] = useState(users);
  if (!list.length) return <p className="text-sm text-muted">Nobody here.</p>;
  return (
    <ul className="divide-y divide-border">
      {list.map((u) => (
        <li key={u.id} className="flex items-center gap-3 py-2.5">
          <Avatar user={u} size="sm" />
          <Link href={`/${u.username}`} className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{u.name}</p>
            <p className="truncate text-xs text-muted">@{u.username}</p>
          </Link>
          <button
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              if (await onAction(u)) setList((l) => l.filter((x) => x.id !== u.id));
            }}
          >
            {action}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function PrivacyForms({ dmPolicy, blocked, muted }: { dmPolicy: "EVERYONE" | "FOLLOWING"; blocked: UserMini[]; muted: UserMini[] }) {
  const [policy, setPolicy] = useState(dmPolicy);

  const choose = async (p: "EVERYONE" | "FOLLOWING") => {
    const prev = policy;
    setPolicy(p);
    const r = await setDmPolicy({ policy: p });
    if (!r.ok) {
      setPolicy(prev);
      toast.error(r.error);
    } else toast.success("Saved");
  };

  return (
    <div>
      <section className="border-b border-border p-4">
        <h2 className="font-semibold">Who can message you</h2>
        <p className="mt-0.5 text-sm text-muted">Buyers can always contact you about a marketplace listing.</p>
        <div className="mt-3 grid gap-2">
          {(
            [
              ["EVERYONE", "Everyone on OAACI"],
              ["FOLLOWING", "Only people I follow"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3", policy === value ? "border-primary bg-primary-soft" : "border-border")}
            >
              <input type="radio" name="dm" checked={policy === value} onChange={() => choose(value)} className="accent-[var(--primary)]" />
              {label}
            </label>
          ))}
        </div>
      </section>
      <section className="border-b border-border p-4">
        <h2 className="font-semibold">Blocked accounts</h2>
        <p className="mt-0.5 mb-2 text-sm text-muted">Blocked people can&apos;t see your profile, follow you or message you.</p>
        <PeopleList
          users={blocked}
          action="Unblock"
          onAction={async (u) => {
            const r = await setBlocked({ userId: u.id, blocked: false });
            if (!r.ok) toast.error(r.error);
            return r.ok;
          }}
        />
      </section>
      <section className="p-4">
        <h2 className="font-semibold">Muted accounts</h2>
        <p className="mt-0.5 mb-2 text-sm text-muted">You won&apos;t see posts or notifications from muted accounts. They aren&apos;t told.</p>
        <PeopleList
          users={muted}
          action="Unmute"
          onAction={async (u) => {
            const r = await setMuted({ userId: u.id, muted: false });
            if (!r.ok) toast.error(r.error);
            return r.ok;
          }}
        />
      </section>
    </div>
  );
}
