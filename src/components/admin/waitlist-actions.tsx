"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteFromWaitlist, rejectWaitlist } from "@/actions/admin";
import { Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";

export function WaitlistActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex gap-2">
      <button
        className="btn btn-primary btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await inviteFromWaitlist({ id });
          setBusy(false);
          if (!r.ok) return toast.error(r.error);
          toast.success(`Invite ${r.data.code} emailed`);
          router.refresh();
        }}
      >
        {busy && <Spinner />} Send invite
      </button>
      <button
        className="btn btn-secondary btn-sm"
        disabled={busy}
        onClick={async () => {
          const r = await rejectWaitlist({ id });
          if (!r.ok) return toast.error(r.error);
          router.refresh();
        }}
      >
        Decline
      </button>
    </div>
  );
}
