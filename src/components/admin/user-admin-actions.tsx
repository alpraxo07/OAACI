"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setBanned, setRole, setVerifiedBadge } from "@/actions/admin";
import { toast } from "@/components/ui/toaster";
import { ReasonModal } from "./report-actions";
import type { ActionResult } from "@/lib/action";

export function UserAdminActions({
  user,
  canChangeRole,
}: {
  user: { id: string; verified: boolean; banned: boolean; role: "USER" | "MODERATOR" | "ADMIN" };
  canChangeRole: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [banning, setBanning] = useState(false);

  const go = async (fn: () => Promise<ActionResult<unknown>>, done: string) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(done);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="btn btn-secondary btn-sm"
        disabled={busy}
        onClick={() => go(() => setVerifiedBadge({ userId: user.id, verified: !user.verified }), user.verified ? "Badge removed" : "Verified")}
      >
        {user.verified ? "Remove badge" : "Verify"}
      </button>
      {user.banned ? (
        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => go(() => setBanned({ userId: user.id, banned: false }), "Unbanned")}>
          Unban
        </button>
      ) : (
        <button className="btn btn-secondary btn-sm text-danger" disabled={busy} onClick={() => setBanning(true)}>
          Ban
        </button>
      )}
      {canChangeRole && (
        <select
          className="input w-auto py-1 text-xs"
          value={user.role}
          disabled={busy}
          onChange={(e) => go(() => setRole({ userId: user.id, role: e.target.value as typeof user.role }), "Role updated")}
          aria-label="Role"
        >
          <option value="USER">User</option>
          <option value="MODERATOR">Moderator</option>
          <option value="ADMIN">Admin</option>
        </select>
      )}
      <ReasonModal
        open={banning}
        title="Ban this account?"
        confirmLabel="Ban"
        onClose={() => setBanning(false)}
        onConfirm={async (reason) => {
          await go(() => setBanned({ userId: user.id, banned: true, reason }), "Account banned");
          setBanning(false);
        }}
      />
    </div>
  );
}
