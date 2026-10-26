"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewVerification } from "@/actions/admin";
import { Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";

export function VerificationReview({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const review = async (approve: boolean) => {
    setBusy(true);
    const r = await reviewVerification({ id, approve, note });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(approve ? "Approved — badge granted" : "Request declined");
    router.refresh();
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <input className="input flex-1" placeholder="Note to the artist (optional, shown if declined)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => review(true)}>
        {busy && <Spinner />} Approve
      </button>
      <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => review(false)}>
        Decline
      </button>
    </div>
  );
}
