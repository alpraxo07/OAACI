import type { Metadata } from "next";
import Link from "next/link";
import type { ReportTarget } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { mediaSelect, userMiniSelect } from "@/lib/posts";
import { imageUrl } from "@/lib/media-url";
import { REPORT_REASONS } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { TimeAgo } from "@/components/ui/time-ago";
import { ReportActions } from "@/components/admin/report-actions";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Reports · Admin" };

const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

type Preview = {
  title: string;
  body?: string;
  image?: string | null;
  href?: string;
  owner?: { id: string; username: string; name: string; avatarUrl: string | null; verified: boolean; bannedAt: Date | null } | null;
  status?: string;
};

async function loadPreview(type: ReportTarget, id: string): Promise<Preview | null> {
  const owner = { select: { ...userMiniSelect, bannedAt: true } };
  switch (type) {
    case "POST": {
      const p = await db.post.findUnique({ where: { id }, include: { author: owner, media: { select: mediaSelect } } });
      if (!p) return null;
      return {
        title: p.trackTitle ? `Song: ${p.trackTitle}` : "Post",
        body: p.text,
        image: p.media?.kind === "IMAGE" ? p.media.url : (p.media?.thumbnailUrl ?? null),
        href: `/p/${p.id}`,
        owner: p.author,
        status: p.status,
      };
    }
    case "COMMENT": {
      const c = await db.comment.findUnique({ where: { id }, include: { author: owner } });
      return c ? { title: "Comment", body: c.text, href: `/p/${c.postId}`, owner: c.author } : null;
    }
    case "USER": {
      const u = await db.user.findUnique({ where: { id }, select: { ...userMiniSelect, bannedAt: true, headline: true, bio: true } });
      return u ? { title: "Account", body: [u.headline, u.bio].filter(Boolean).join(" — "), href: `/${u.username}`, owner: u } : null;
    }
    case "LISTING": {
      const l = await db.listing.findUnique({
        where: { id },
        include: { seller: owner, images: { include: { media: { select: mediaSelect } }, orderBy: { position: "asc" }, take: 1 } },
      });
      return l
        ? { title: `Listing: ${l.title}`, body: l.description, image: l.images[0]?.media.url ?? null, href: `/market/${l.id}`, owner: l.seller, status: l.status }
        : null;
    }
    case "MESSAGE": {
      const m = await db.message.findUnique({ where: { id }, include: { sender: owner, media: { select: mediaSelect } } });
      return m ? { title: "Direct message", body: m.deletedAt ? "(deleted)" : m.text, image: m.media?.url ?? null, owner: m.sender } : null;
    }
  }
}

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const { show } = await searchParams;
  const resolved = show === "resolved";
  const me = (await getCurrentUser())!;
  const reports = await db.report.findMany({
    where: resolved ? { status: { not: "OPEN" } } : { status: "OPEN" },
    include: { reporter: { select: userMiniSelect }, resolvedBy: { select: { username: true } } },
    orderBy: { createdAt: resolved ? "desc" : "asc" },
    take: 200,
  });

  // Group reports about the same thing together.
  const groups = new Map<string, typeof reports>();
  for (const r of reports) {
    const key = `${r.targetType}:${r.targetId}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const entries = await Promise.all(
    [...groups.entries()].slice(0, 60).map(async ([key, list]) => ({ key, list, preview: await loadPreview(list[0].targetType, list[0].targetId) })),
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Link href="/admin/reports" className={cn("chip", !resolved && "border-primary bg-primary-soft text-primary-text")}>
          Open
        </Link>
        <Link href="/admin/reports?show=resolved" className={cn("chip", resolved && "border-primary bg-primary-soft text-primary-text")}>
          Resolved
        </Link>
      </div>
      {entries.length === 0 && <EmptyState title={resolved ? "No resolved reports yet" : "All clear — no open reports"} />}
      {entries.map(({ key, list, preview }) => {
        const first = list[0];
        return (
          <article key={key} className="card p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded bg-surface-2 px-2 py-0.5 font-semibold">{first.targetType}</span>
              <span className="text-muted">
                {list.length} {list.length === 1 ? "report" : "reports"} · first <TimeAgo date={first.createdAt.toISOString()} />
              </span>
              {preview?.status && preview.status !== "PUBLISHED" && preview.status !== "ACTIVE" && (
                <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-text">{preview.status}</span>
              )}
              {preview?.owner?.bannedAt && <span className="rounded bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">Owner banned</span>}
            </div>

            {preview ? (
              <div className="mt-3 flex gap-3 rounded-xl bg-surface-2 p-3">
                {preview.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl(preview.image, 200, true)} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  {preview.owner && (
                    <Link href={`/${preview.owner.username}`} className="mb-1 flex items-center gap-2 text-sm font-semibold hover:underline">
                      <Avatar user={preview.owner} size="xs" /> {preview.owner.name} <span className="font-normal text-muted">@{preview.owner.username}</span>
                    </Link>
                  )}
                  <p className="text-xs font-semibold text-muted uppercase">{preview.title}</p>
                  {preview.body && <p className="mt-1 line-clamp-4 text-sm whitespace-pre-wrap">{preview.body}</p>}
                  {preview.href && (
                    <Link href={preview.href} className="mt-1 inline-block text-xs link" target="_blank">
                      Open in new tab
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">This content no longer exists.</p>
            )}

            <ul className="mt-3 space-y-1 text-sm">
              {list.map((r) => (
                <li key={r.id}>
                  <strong>{reasonLabel(r.reason)}</strong>
                  {r.reporter ? <span className="text-muted"> by @{r.reporter.username}</span> : <span className="text-muted"> (automatic)</span>}
                  {r.details && <span className="text-muted"> — “{r.details}”</span>}
                  {r.status !== "OPEN" && (
                    <span className="text-muted">
                      {" "}
                      · {r.status.toLowerCase()} {r.resolvedBy ? `by @${r.resolvedBy.username}` : ""} {r.resolution ? `(${r.resolution})` : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {!resolved && (
              <ReportActions
                reportId={first.id}
                targetType={first.targetType}
                targetId={first.targetId}
                ownerId={preview?.owner && preview.owner.id !== me.id ? preview.owner.id : null}
                ownerBanned={Boolean(preview?.owner?.bannedAt)}
                held={preview?.status === "HIDDEN"}
                exists={Boolean(preview)}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}
