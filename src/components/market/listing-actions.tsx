"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, CircleCheck, Flag, Link2, MessageCircle, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { contactSeller, deleteListing, setListingStatus } from "@/actions/market";
import { useMe } from "@/components/providers";
import { ConfirmModal, Modal } from "@/components/ui/modal";
import { FormError, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { ReportDialog } from "@/components/report-dialog";
import { shareLink } from "@/components/share";

export function ListingActions({
  listing,
  isMine,
}: {
  listing: { id: string; title: string; status: string; sellerName: string };
  isMine: boolean;
}) {
  const me = useMe();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState(`Hi ${listing.sellerName.split(" ")[0]}! Is this piece still available?`);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);

  const status = async (s: "ACTIVE" | "SOLD" | "ARCHIVED") => {
    const r = await setListingStatus({ id: listing.id, status: s });
    if (!r.ok) return toast.error(r.error);
    toast.success(s === "SOLD" ? "Marked as sold" : s === "ARCHIVED" ? "Listing hidden" : "Listing is live again");
    router.refresh();
  };

  const share = (
    <button className="btn btn-secondary" onClick={() => shareLink(`/market/${listing.id}`, listing.title)}>
      <Link2 className="h-4 w-4" /> Share
    </button>
  );

  if (isMine) {
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {listing.status !== "REMOVED" && (
          <Link href={`/market/${listing.id}/edit`} className="btn btn-secondary">
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        )}
        {listing.status === "ACTIVE" && (
          <>
            <button className="btn btn-secondary" onClick={() => status("SOLD")}>
              <CircleCheck className="h-4 w-4" /> Mark as sold
            </button>
            <button className="btn btn-secondary" onClick={() => status("ARCHIVED")}>
              <Archive className="h-4 w-4" /> Hide
            </button>
          </>
        )}
        {(listing.status === "SOLD" || listing.status === "ARCHIVED") && (
          <button className="btn btn-secondary" onClick={() => status("ACTIVE")}>
            <RotateCcw className="h-4 w-4" /> Make available
          </button>
        )}
        {share}
        <button className="btn btn-secondary text-danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4" /> Delete
        </button>
        <ConfirmModal
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            const r = await deleteListing({ id: listing.id });
            if (!r.ok) return toast.error(r.error);
            toast.success("Listing deleted");
            router.push("/market");
          }}
          title="Delete this listing?"
          body="This can't be undone."
          confirmLabel="Delete"
          danger
        />
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {listing.status === "ACTIVE" && (
        <button
          className="btn btn-primary btn-lg"
          onClick={() => (me ? setAsking(true) : router.push(`/login?next=/market/${listing.id}`))}
        >
          <MessageCircle className="h-4 w-4" /> Message seller
        </button>
      )}
      {share}
      {me && (
        <button className="btn btn-ghost text-muted" onClick={() => setReporting(true)}>
          <Flag className="h-4 w-4" /> Report
        </button>
      )}
      <Modal open={asking} onClose={() => setAsking(false)} title="Message the seller">
        <form
          className="space-y-3 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSending(true);
            setError(null);
            const r = await contactSeller({ listingId: listing.id, message });
            setSending(false);
            if (!r.ok) return setError(r.error);
            router.push(`/messages/${r.data.conversationId}`);
          }}
        >
          <FormError message={error} />
          <textarea className="input min-h-28" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} required />
          <p className="text-xs text-muted">
            A link to this listing is added automatically. Never pay before you&apos;ve agreed details with the artist — and report anything
            suspicious.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setAsking(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={sending || !me?.contactVerified}>
              {sending && <Spinner />} Send
            </button>
          </div>
        </form>
      </Modal>
      {me && <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="LISTING" targetId={listing.id} />}
    </div>
  );
}
