"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteProfileEntry, saveProfileEntry } from "@/actions/account";
import { useAction } from "@/components/use-action";
import { Modal } from "@/components/ui/modal";
import { EmptyState, FormError, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { PROFILE_ENTRY_KINDS } from "@/lib/constants";

type Kind = (typeof PROFILE_ENTRY_KINDS)[number]["value"];
type Entry = {
  id?: string;
  kind: Kind;
  title: string;
  organization: string;
  startYear: string;
  endYear: string;
  current: boolean;
  description: string;
  url: string;
};

const PLACEHOLDERS: Record<Kind, { title: string; org: string }> = {
  EXHIBITION: { title: "e.g. Solo show — “Rivers of Clay”", org: "e.g. Jehangir Art Gallery, Mumbai" },
  EXPERIENCE: { title: "e.g. Resident artist", org: "e.g. Kalakshetra Foundation" },
  EDUCATION: { title: "e.g. BFA, Painting", org: "e.g. Faculty of Fine Arts, M.S. University, Baroda" },
  AWARD: { title: "e.g. National Award for Handicrafts", org: "e.g. Ministry of Textiles" },
};

const blank = (kind: Kind): Entry => ({ kind, title: "", organization: "", startYear: "", endYear: "", current: false, description: "", url: "" });

export function PortfolioEditor({ entries, username }: { entries: Entry[]; username: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Entry | null>(null);
  const save = useAction(saveProfileEntry);

  const remove = async (id: string) => {
    const r = await deleteProfileEntry({ id });
    if (!r.ok) return toast.error(r.error);
    toast.success("Removed");
    router.refresh();
  };

  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-muted">
        Your portfolio appears on the About tab of{" "}
        <Link href={`/${username}?tab=about`} className="link">
          your profile
        </Link>
        . Think of it as your artist CV.
      </p>
      {PROFILE_ENTRY_KINDS.map(({ value, label }) => {
        const items = entries.filter((e) => e.kind === value);
        return (
          <section key={value} className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">{label}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(blank(value))}>
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {items.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing added yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {items.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{e.title}</p>
                      {e.organization && <p className="text-sm">{e.organization}</p>}
                      {(e.startYear || e.current) && (
                        <p className="text-sm text-muted">
                          {e.startYear}
                          {e.current ? " – Present" : e.endYear && e.endYear !== e.startYear ? ` – ${e.endYear}` : ""}
                        </p>
                      )}
                    </div>
                    <button className="icon-btn" onClick={() => setEditing(e)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="icon-btn hover:text-danger" onClick={() => remove(e.id!)} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {entries.length === 0 && <EmptyState title="Start your artist CV" className="py-4" />}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? "Edit entry" : `Add to ${PROFILE_ENTRY_KINDS.find((k) => k.value === editing.kind)?.label}`}>
          <form
            className="space-y-4 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await save.execute(editing);
              if (r?.ok) {
                toast.success("Saved");
                setEditing(null);
                router.refresh();
              }
            }}
          >
            <FormError message={save.error} />
            <div>
              <label className="label" htmlFor="entry-kind">
                Section
              </label>
              <select id="entry-kind" className="input" value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as Kind })}>
                {PROFILE_ENTRY_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="entry-title">
                Title
              </label>
              <input
                id="entry-title"
                className="input"
                maxLength={120}
                value={editing.title}
                placeholder={PLACEHOLDERS[editing.kind].title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="entry-org">
                {editing.kind === "EDUCATION" ? "Institution" : editing.kind === "AWARD" ? "Awarded by" : "Venue / organisation"}
              </label>
              <input
                id="entry-org"
                className="input"
                maxLength={120}
                value={editing.organization}
                placeholder={PLACEHOLDERS[editing.kind].org}
                onChange={(e) => setEditing({ ...editing, organization: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="entry-start">
                  {editing.kind === "AWARD" || editing.kind === "EXHIBITION" ? "Year" : "From (year)"}
                </label>
                <input
                  id="entry-start"
                  className="input"
                  inputMode="numeric"
                  maxLength={4}
                  value={editing.startYear}
                  onChange={(e) => setEditing({ ...editing, startYear: e.target.value.replace(/\D/g, "") })}
                />
              </div>
              {editing.kind !== "AWARD" && (
                <div>
                  <label className="label" htmlFor="entry-end">
                    To (year)
                  </label>
                  <input
                    id="entry-end"
                    className="input"
                    inputMode="numeric"
                    maxLength={4}
                    value={editing.current ? "" : editing.endYear}
                    disabled={editing.current}
                    placeholder={editing.current ? "Present" : ""}
                    onChange={(e) => setEditing({ ...editing, endYear: e.target.value.replace(/\D/g, "") })}
                  />
                </div>
              )}
            </div>
            {editing.kind !== "AWARD" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-[var(--primary)]"
                  checked={editing.current}
                  onChange={(e) => setEditing({ ...editing, current: e.target.checked })}
                />
                {editing.kind === "EXHIBITION" ? "Currently showing" : "I'm currently here"}
              </label>
            )}
            <div>
              <label className="label" htmlFor="entry-desc">
                Description <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="entry-desc"
                className="input min-h-20"
                maxLength={1000}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="entry-url">
                Link <span className="font-normal text-muted">(optional)</span>
              </label>
              <input id="entry-url" className="input" value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={save.pending}>
                {save.pending && <Spinner />} Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
