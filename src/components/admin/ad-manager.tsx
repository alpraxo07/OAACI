"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteAd, saveAd } from "@/actions/admin";
import { useAction } from "@/components/use-action";
import { Modal } from "@/components/ui/modal";
import { EmptyState, FormError, Spinner, formatCount } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { uploadFile } from "@/components/upload";
import { imageUrl } from "@/lib/media-url";
import { MEDIA_LIMITS } from "@/lib/constants";

type Ad = {
  id?: string;
  title: string;
  body: string;
  advertiser: string;
  linkUrl: string;
  ctaLabel: string;
  placement: "FEED" | "SIDEBAR";
  active: boolean;
  startsAt: string;
  endsAt: string;
  imageUrl: string | null;
  impressions?: number;
  clicks?: number;
};

const blank: Ad = { title: "", body: "", advertiser: "", linkUrl: "", ctaLabel: "", placement: "FEED", active: true, startsAt: "", endsAt: "", imageUrl: null };

export function AdManager({ ads }: { ads: Ad[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Ad | null>(null);
  const [imageMediaId, setImageMediaId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const save = useAction(saveAd);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Sponsored posts appear every 8 posts in feeds (Feed) or in the right sidebar (Sidebar), always labelled “Sponsored”.</p>
        <button
          className="btn btn-primary btn-sm shrink-0"
          onClick={() => {
            setImageMediaId(null);
            setEditing(blank);
          }}
        >
          <Plus className="h-4 w-4" /> New ad
        </button>
      </div>
      {ads.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-6 w-6" />} title="No ads yet" />
      ) : (
        <ul className="card divide-y divide-border">
          {ads.map((a) => (
            <li key={a.id} className="flex items-center gap-3 p-3">
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(a.imageUrl, 160, true)} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface-2 text-muted">
                  <Megaphone className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.title}</p>
                <p className="truncate text-xs text-muted">
                  {a.advertiser} · {a.placement === "FEED" ? "Feed" : "Sidebar"} · {a.active ? "Active" : "Paused"} · {formatCount(a.impressions ?? 0)} views ·{" "}
                  {formatCount(a.clicks ?? 0)} clicks
                  {a.impressions ? ` (${(((a.clicks ?? 0) / a.impressions) * 100).toFixed(1)}% CTR)` : ""}
                </p>
              </div>
              <button
                className="icon-btn"
                onClick={() => {
                  setImageMediaId(null);
                  setEditing(a);
                }}
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                className="icon-btn hover:text-danger"
                aria-label="Delete"
                onClick={async () => {
                  if (!confirm("Delete this ad?")) return;
                  const r = await deleteAd({ id: a.id! });
                  if (!r.ok) return toast.error(r.error);
                  router.refresh();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? "Edit ad" : "New ad"}>
          <form
            className="space-y-3 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await save.execute({ ...editing, imageMediaId });
              if (r?.ok) {
                toast.success("Ad saved");
                setEditing(null);
                router.refresh();
              }
            }}
          >
            <FormError message={save.error} />
            <input className="input" placeholder="Headline" value={editing.title} maxLength={100} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
            <textarea className="input min-h-20" placeholder="Short text (optional)" maxLength={300} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Advertiser name" value={editing.advertiser} maxLength={80} onChange={(e) => setEditing({ ...editing, advertiser: e.target.value })} required />
              <input className="input" placeholder="Button text (e.g. Shop now)" value={editing.ctaLabel} maxLength={30} onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })} />
            </div>
            <input className="input" placeholder="Link (https://…)" value={editing.linkUrl} onChange={(e) => setEditing({ ...editing, linkUrl: e.target.value })} required />
            <div className="grid grid-cols-2 gap-3">
              <select className="input" value={editing.placement} onChange={(e) => setEditing({ ...editing, placement: e.target.value as Ad["placement"] })} aria-label="Placement">
                <option value="FEED">In the feed</option>
                <option value="SIDEBAR">Sidebar</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-[var(--primary)]" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="label">Starts (optional)</span>
                <input type="datetime-local" className="input" value={editing.startsAt} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} />
              </label>
              <label className="text-sm">
                <span className="label">Ends (optional)</span>
                <input type="datetime-local" className="input" value={editing.endsAt} onChange={(e) => setEditing({ ...editing, endsAt: e.target.value })} />
              </label>
            </div>
            <div className="flex items-center gap-3">
              {editing.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(editing.imageUrl, 200)} alt="" className="h-16 w-28 rounded-lg object-cover" />
              )}
              <label className="btn btn-secondary btn-sm cursor-pointer">
                {uploading && <Spinner />} {editing.imageUrl ? "Change image" : "Add image"}
                <input
                  type="file"
                  hidden
                  accept={MEDIA_LIMITS.IMAGE.accept}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setUploading(true);
                    try {
                      const r = await uploadFile(f, "IMAGE", "ad");
                      setImageMediaId(r.media.id);
                      setEditing((ad) => (ad ? { ...ad, imageUrl: r.media.url } : ad));
                    } catch (err) {
                      toast.error((err as Error).message);
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={save.pending || uploading}>
                {save.pending && <Spinner />} Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
