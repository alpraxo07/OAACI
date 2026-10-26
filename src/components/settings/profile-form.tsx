"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { setProfileImage, updateProfile } from "@/actions/account";
import { useAction } from "@/components/use-action";
import { Avatar } from "@/components/ui/avatar";
import { FormError, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { uploadFile } from "@/components/upload";
import { imageUrl } from "@/lib/media-url";
import { ART_DISCIPLINES, BIO_MAX_LENGTH, HEADLINE_MAX_LENGTH, MEDIA_LIMITS } from "@/lib/constants";
import { cn } from "@/lib/cn";

type Discipline = (typeof ART_DISCIPLINES)[number];

export function ProfileForm({
  user,
  canUpload,
}: {
  user: {
    name: string;
    username: string;
    headline: string | null;
    bio: string | null;
    website: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    disciplines: string[];
    openToCommissions: boolean;
  };
  canUpload: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: user.name,
    headline: user.headline ?? "",
    bio: user.bio ?? "",
    website: user.website ?? "",
    disciplines: user.disciplines.filter((d): d is Discipline => (ART_DISCIPLINES as readonly string[]).includes(d)),
    openToCommissions: user.openToCommissions,
  });
  const [avatar, setAvatar] = useState(user.avatarUrl);
  const [cover, setCover] = useState(user.coverUrl);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const { execute, pending, error } = useAction(updateProfile);

  const upload = async (kind: "avatar" | "cover", file: File) => {
    setUploading(kind);
    try {
      const { media } = await uploadFile(file, "IMAGE", kind);
      const r = await setProfileImage({ kind, mediaId: media.id });
      if (!r.ok) throw new Error(r.error);
      if (kind === "avatar") setAvatar(r.data.url);
      else setCover(r.data.url);
      toast.success(kind === "avatar" ? "Profile photo updated" : "Cover updated");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const removeImage = async (kind: "avatar" | "cover") => {
    const r = await setProfileImage({ kind, mediaId: null });
    if (!r.ok) return toast.error(r.error);
    if (kind === "avatar") setAvatar(null);
    else setCover(null);
    router.refresh();
  };

  const toggleDiscipline = (d: Discipline) =>
    setForm((f) => ({
      ...f,
      disciplines: f.disciplines.includes(d) ? f.disciplines.filter((x) => x !== d) : [...f.disciplines, d].slice(0, 8),
    }));

  return (
    <div>
      <div className="relative">
        <div className="relative aspect-[3/1] bg-gradient-to-br from-primary/80 via-amber-600/60 to-teal-700/60">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(cover, 1280)} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/20">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
              onClick={() => coverInput.current?.click()}
              disabled={!canUpload || Boolean(uploading)}
              aria-label="Change cover photo"
            >
              {uploading === "cover" ? <Spinner /> : <Camera className="h-5 w-5" />}
            </button>
            {cover && (
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                onClick={() => removeImage("cover")}
                aria-label="Remove cover photo"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        <div className="px-4">
          <div className="relative -mt-12 inline-block">
            <Avatar user={{ name: form.name || user.name, username: user.username, avatarUrl: avatar }} size="xl" className="border-4 border-bg" />
            <button
              type="button"
              className="absolute inset-1 flex items-center justify-center rounded-full bg-black/40 text-white opacity-90 hover:bg-black/60 disabled:opacity-50"
              onClick={() => avatarInput.current?.click()}
              disabled={!canUpload || Boolean(uploading)}
              aria-label="Change profile photo"
            >
              {uploading === "avatar" ? <Spinner /> : <Camera className="h-6 w-6" />}
            </button>
          </div>
          {avatar && (
            <button type="button" className="ml-3 text-sm text-danger hover:underline" onClick={() => removeImage("avatar")}>
              Remove photo
            </button>
          )}
          {!canUpload && <p className="mt-2 text-xs text-muted">Confirm your email to upload photos.</p>}
        </div>
        <input
          ref={avatarInput}
          type="file"
          hidden
          accept={MEDIA_LIMITS.IMAGE.accept}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) upload("avatar", f);
          }}
        />
        <input
          ref={coverInput}
          type="file"
          hidden
          accept={MEDIA_LIMITS.IMAGE.accept}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) upload("cover", f);
          }}
        />
      </div>

      <form
        className="space-y-5 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await execute(form);
          if (r?.ok) {
            toast.success("Profile saved");
            router.refresh();
          }
        }}
      >
        <FormError message={error} />
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input id="name" className="input" maxLength={50} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="headline">
            Headline
          </label>
          <input
            id="headline"
            className="input"
            maxLength={HEADLINE_MAX_LENGTH}
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
            placeholder="e.g. Pattachitra artist · Raghurajpur, Odisha"
          />
          <p className="hint">One line that sums up what you do — shown under your name, like on LinkedIn.</p>
        </div>
        <div>
          <label className="label" htmlFor="bio">
            Bio
          </label>
          <textarea
            id="bio"
            className="input min-h-28"
            maxLength={BIO_MAX_LENGTH}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Your story, your craft, your influences…"
          />
          <p className="hint text-right">
            {form.bio.length}/{BIO_MAX_LENGTH}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="website">
            Website or portfolio link
          </label>
          <input
            id="website"
            className="input"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="yourname.com or instagram.com/yourname"
          />
        </div>
        <div>
          <p className="label">Disciplines (up to 8)</p>
          <div className="flex flex-wrap gap-2">
            {ART_DISCIPLINES.map((d) => {
              const on = form.disciplines.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDiscipline(d)}
                  className={cn("chip px-3 py-1.5 text-sm", on && "border-primary bg-primary-soft text-primary-text")}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
          <span>
            <span className="block font-medium">Open to commissions</span>
            <span className="text-sm text-muted">Shows a badge on your profile and in the artist directory.</span>
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--primary)]"
            checked={form.openToCommissions}
            onChange={(e) => setForm({ ...form, openToCommissions: e.target.checked })}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Link href={`/${user.username}`} className="btn btn-secondary">
            View profile
          </Link>
          <button className="btn btn-primary" disabled={pending}>
            {pending && <Spinner />} Save
          </button>
        </div>
      </form>
    </div>
  );
}
