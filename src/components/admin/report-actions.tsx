"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approvePost, dismissReport, removeContent, setBanned } from "@/actions/admin";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import type { ActionResult } from "@/lib/action";

/** Asks for a short reason before running a moderation action. */
export function ReasonModal({
  open,
  title,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        className="space-y-3 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await onConfirm(reason);
          setBusy(false);
          setReason("");
        }}
      >
        <label className="label" htmlFor="mod-reason">
          Reason (shown to the person)
        </label>
        <textarea id="mod-reason" className="input min-h-20" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-danger" disabled={busy}>
            {busy && <Spinner />} {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ReportActions({
  reportId,
  targetType,
  targetId,
  ownerId,
  ownerBanned,
  held,
  exists,
}: {
  reportId: string;
  targetType: "POST" | "COMMENT" | "USER" | "LISTING" | "MESSAGE";
  targetId: string;
  ownerId: string | null;
  ownerBanned: boolean;
  held: boolean;
  exists: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<"remove" | "ban" | null>(null);

  const go = async (fn: () => Promise<ActionResult<unknown>>, done: string) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(done);
    setPrompt(null);
    router.refresh();
  };

  const noun = { POST: "post", COMMENT: "comment", USER: "account", LISTING: "listing", MESSAGE: "message" }[targetType];

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
      {held && (
        <>
          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => go(() => approvePost({ id: targetId, sensitive: false }), "Post approved")}>
            Approve
          </button>
          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => go(() => approvePost({ id: targetId, sensitive: true }), "Approved with blur")}>
            Approve as sensitive
          </button>
        </>
      )}
      {exists && targetType !== "USER" && (
        <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => setPrompt("remove")}>
          Remove {noun}
        </button>
      )}
      {ownerId && !ownerBanned && (
        <button className="btn btn-secondary btn-sm text-danger" disabled={busy} onClick={() => setPrompt("ban")}>
          Ban {targetType === "USER" ? "account" : "owner"}
        </button>
      )}
      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => go(() => dismissReport({ id: reportId }), "Dismissed")}>
        Dismiss
      </button>
      <ReasonModal
        open={prompt === "remove"}
        title={`Remove this ${noun}?`}
        confirmLabel="Remove"
        onClose={() => setPrompt(null)}
        onConfirm={(reason) => go(() => removeContent({ targetType: targetType as "POST", targetId, reason }), "Removed")}
      />
      <ReasonModal
        open={prompt === "ban"}
        title="Ban this account?"
        confirmLabel="Ban"
        onClose={() => setPrompt(null)}
        onConfirm={(reason) => go(() => setBanned({ userId: ownerId!, banned: true, reason }), "Account banned")}
      />
    </div>
  );
}
