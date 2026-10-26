"use client";

import { useState } from "react";
import { createReport } from "@/actions/social";
import { useAction } from "@/components/use-action";
import { Modal } from "@/components/ui/modal";
import { FormError, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { REPORT_REASONS } from "@/lib/constants";

type Target = "POST" | "COMMENT" | "USER" | "LISTING" | "MESSAGE";
type Reason = (typeof REPORT_REASONS)[number]["value"];

const NOUN: Record<Target, string> = {
  POST: "post",
  COMMENT: "comment",
  USER: "account",
  LISTING: "listing",
  MESSAGE: "message",
};

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  targetType: Target;
  targetId: string;
}) {
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const { execute, pending, error } = useAction(createReport);

  return (
    <Modal open={open} onClose={onClose} title={`Report this ${NOUN[targetType]}`}>
      <form
        className="space-y-4 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!reason) return;
          const r = await execute({ targetType, targetId, reason, details });
          if (r?.ok) {
            toast.success("Thanks — our moderators will review it.");
            setReason(null);
            setDetails("");
            onClose();
          }
        }}
      >
        <p className="text-sm text-muted">Reports are private. The person won&apos;t know who reported them.</p>
        <FormError message={error} />
        <div className="grid gap-1.5">
          {REPORT_REASONS.map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-sm hover:bg-surface-2 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-[var(--primary)]"
              />
              {r.label}
            </label>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="report-details">
            More details <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="report-details"
            className="input min-h-20"
            maxLength={1000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={reason === "COPYRIGHT" ? "Link to your original work, if you can" : ""}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-danger" disabled={!reason || pending}>
            {pending && <Spinner />} Submit report
          </button>
        </div>
      </form>
    </Modal>
  );
}
