import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Palette } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getExplorePosts, getLatestPosts, getTrendingHashtags, getTrendingPosts, userMiniSelect } from "@/lib/posts";
import { getHiddenAuthorIds } from "@/lib/social";
import { ART_DISCIPLINES } from "@/lib/constants";
import { Columns } from "@/components/shell/right-rail";
import { EmptyState, PageHeader, VerifiedBadge, formatCount } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { FollowButton } from "@/components/follow-button";
import { FeedList } from "@/components/post/feed-list";
import { MediaGridList } from "@/components/post/media-grid-list";
import { PostCard } from "@/components/post/post-card";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Explore" };

const TABS = [
  { key: "foryou", label: "Popular" },
  { key: "latest", label: "Latest" },
  { key: "trending", label: "Trending" },
  { key: "artists", label: "Artists" },
] as const;

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const params = await searchParams;
  const tab = TABS.find((t) => t.key === params.tab)?.key ?? "foryou";
  const me = await getCurrentUser();

  return (
    <Columns>
      <PageHeader title="Explore" />
      <nav className="no-scrollbar flex overflow-x-auto border-b border-border" aria-label="Explore sections">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/explore?tab=${t.key}`}
            className={cn(
              "relative flex-1 px-4 py-3 text-center text-sm font-medium whitespace-nowrap hover:bg-surface-2",
              tab === t.key ? "text-fg" : "text-muted",
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-primary" />}
          </Link>
        ))}
      </nav>
      {tab === "foryou" && <Popular viewerId={me?.id ?? null} />}
      {tab === "latest" && <Latest viewerId={me?.id ?? null} />}
      {tab === "trending" && <Trending viewerId={me?.id ?? null} />}
      {tab === "artists" && (
        <Artists
          viewerId={me?.id ?? null}
          discipline={typeof params.d === "string" ? params.d : null}
          commissions={params.commissions === "1"}
          page={Number(params.page) || 1}
        />
      )}
    </Columns>
  );
}

async function Popular({ viewerId }: { viewerId: string | null }) {
  const initial = await getExplorePosts(viewerId);
  return (
    <MediaGridList
      initial={initial}
      endpoint="/api/feed?scope=explore"
      empty={
        <EmptyState icon={<Compass className="h-6 w-6" />} title="Nothing to explore yet">
          When artists share photos, videos and songs, the most loved ones show up here.
        </EmptyState>
      }
    />
  );
}

async function Latest({ viewerId }: { viewerId: string | null }) {
  const initial = await getLatestPosts(viewerId);
  return <FeedList initial={initial} endpoint="/api/feed?scope=latest" empty={<EmptyState title="No posts yet" />} />;
}

async function Trending({ viewerId }: { viewerId: string | null }) {
  const [tags, posts] = await Promise.all([getTrendingHashtags(10), getTrendingPosts(viewerId, 15)]);
  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-border p-4">
          {tags.map((t, i) => (
            <Link key={t.name} href={`/tag/${encodeURIComponent(t.name)}`} className="chip hover:border-primary">
              <span className="text-muted">{i + 1}</span> #{t.name}
              <span className="text-muted">· {formatCount(t.count)}</span>
            </Link>
          ))}
        </div>
      )}
      {posts.length ? (
        posts.map((item) => item.kind === "post" && <PostCard key={item.key} post={item.post} repostedBy={item.repostedBy} />)
      ) : (
        <EmptyState title="Nothing is trending right now">Posts with lots of stars, comments and reposts in the last 3 days appear here.</EmptyState>
      )}
    </div>
  );
}

const ARTISTS_PER_PAGE = 24;

async function Artists({
  viewerId,
  discipline,
  commissions,
  page,
}: {
  viewerId: string | null;
  discipline: string | null;
  commissions: boolean;
  page: number;
}) {
  const hidden = await getHiddenAuthorIds(viewerId);
  const where: Prisma.UserWhereInput = {
    bannedAt: null,
    deactivatedAt: null,
    ...(hidden.length ? { id: { notIn: hidden } } : {}),
    ...(discipline ? { disciplines: { has: discipline } } : {}),
    ...(commissions ? { openToCommissions: true } : {}),
  };
  const [artists, following] = await Promise.all([
    db.user.findMany({
      where,
      select: { ...userMiniSelect, headline: true, disciplines: true, openToCommissions: true, _count: { select: { followers: true } } },
      orderBy: [{ verified: "desc" }, { followers: { _count: "desc" } }, { createdAt: "desc" }],
      skip: (page - 1) * ARTISTS_PER_PAGE,
      take: ARTISTS_PER_PAGE + 1,
    }),
    viewerId ? db.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }) : [],
  ]);
  const followingSet = new Set(following.map((f) => f.followingId));
  const hasMore = artists.length > ARTISTS_PER_PAGE;

  const filterHref = (d: string | null, c = commissions) => {
    const q = new URLSearchParams({ tab: "artists" });
    if (d) q.set("d", d);
    if (c) q.set("commissions", "1");
    return `/explore?${q}`;
  };

  return (
    <div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border p-3">
        <Link href={filterHref(discipline, !commissions)} className={cn("chip shrink-0", commissions && "border-primary bg-primary-soft text-primary-text")}>
          Open to commissions
        </Link>
        <Link href={filterHref(null)} className={cn("chip shrink-0", !discipline && "border-primary bg-primary-soft text-primary-text")}>
          All
        </Link>
        {ART_DISCIPLINES.map((d) => (
          <Link key={d} href={filterHref(d)} className={cn("chip shrink-0", discipline === d && "border-primary bg-primary-soft text-primary-text")}>
            {d}
          </Link>
        ))}
      </div>
      {artists.length === 0 ? (
        <EmptyState icon={<Palette className="h-6 w-6" />} title="No artists found">
          Try a different discipline.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 p-4 sm:grid-cols-2">
          {artists.slice(0, ARTISTS_PER_PAGE).map((a) => (
            <li key={a.id} className="card flex flex-col p-4">
              <div className="flex items-start gap-3">
                <Link href={`/${a.username}`}>
                  <Avatar user={a} size="lg" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/${a.username}`} className="flex items-center gap-1 font-semibold hover:underline">
                    <span className="truncate">{a.name}</span>
                    {a.verified && <VerifiedBadge />}
                  </Link>
                  <p className="truncate text-sm text-muted">@{a.username}</p>
                  <p className="text-xs text-muted">{formatCount(a._count.followers)} followers</p>
                </div>
              </div>
              {a.headline && <p className="mt-3 line-clamp-2 text-sm">{a.headline}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {a.openToCommissions && <span className="chip border-success/30 bg-success-soft text-success">Commissions open</span>}
                {a.disciplines.slice(0, 3).map((d) => (
                  <span key={d} className="chip">
                    {d}
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-4">
                <FollowButton userId={a.id} initialFollowing={followingSet.has(a.id)} size="sm" className="w-full" />
              </div>
            </li>
          ))}
        </ul>
      )}
      {(page > 1 || hasMore) && (
        <div className="flex justify-center gap-2 pb-8">
          {page > 1 && (
            <Link href={`${filterHref(discipline)}&page=${page - 1}`} className="btn btn-secondary btn-sm">
              Previous
            </Link>
          )}
          {hasMore && (
            <Link href={`${filterHref(discipline)}&page=${page + 1}`} className="btn btn-secondary btn-sm">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
