import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { searchPosts, userMiniSelect } from "@/lib/posts";
import { getHiddenAuthorIds } from "@/lib/social";
import { Columns, RightRail } from "@/components/shell/right-rail";
import { EmptyState, VerifiedBadge, formatCount } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { FollowButton } from "@/components/follow-button";
import { FeedList } from "@/components/post/feed-list";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Search" };

const TABS = [
  { key: "people", label: "People" },
  { key: "posts", label: "Posts" },
  { key: "tags", label: "Hashtags" },
] as const;

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const tab = TABS.find((t) => t.key === params.tab)?.key ?? "people";
  const me = await getCurrentUser();

  return (
    <Columns aside={<RightRail showSearch={false} />}>
      <div className="sticky top-14 z-20 border-b border-border bg-bg/90 backdrop-blur md:top-0">
        <form action="/search" className="relative p-3">
          <Search className="pointer-events-none absolute top-1/2 left-6.5 h-4 w-4 -translate-y-1/2 text-muted" />
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={q}
            autoFocus={!q}
            className="input rounded-full pl-10"
            placeholder="Search artists, posts and #hashtags"
            aria-label="Search"
          />
        </form>
        <nav className="flex" aria-label="Search results">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/search?tab=${t.key}&q=${encodeURIComponent(q)}`}
              className={cn("relative flex-1 py-3 text-center text-sm font-medium hover:bg-surface-2", tab === t.key ? "text-fg" : "text-muted")}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-primary" />}
            </Link>
          ))}
        </nav>
      </div>

      {!q ? (
        <EmptyState icon={<Search className="h-6 w-6" />} title="Search OAACI">
          Find artists by name or username, posts by keyword, or browse #hashtags.
        </EmptyState>
      ) : tab === "people" ? (
        <People q={q} viewerId={me?.id ?? null} />
      ) : tab === "posts" ? (
        <FeedList
          initial={await searchPosts(q, me?.id ?? null)}
          endpoint={`/api/feed?scope=search&q=${encodeURIComponent(q)}`}
          empty={<EmptyState title={`No posts match "${q}"`} />}
        />
      ) : (
        <Tags q={q} />
      )}
    </Columns>
  );
}

async function People({ q, viewerId }: { q: string; viewerId: string | null }) {
  const hidden = await getHiddenAuthorIds(viewerId);
  const term = q.replace(/^@/, "");
  const [users, following] = await Promise.all([
    db.user.findMany({
      where: {
        bannedAt: null,
        deactivatedAt: null,
        ...(hidden.length ? { id: { notIn: hidden } } : {}),
        OR: [
          { username: { contains: term.toLowerCase() } },
          { name: { contains: term, mode: "insensitive" } },
          { headline: { contains: term, mode: "insensitive" } },
          { disciplines: { has: term } },
        ],
      },
      select: { ...userMiniSelect, headline: true },
      orderBy: [{ verified: "desc" }, { followers: { _count: "desc" } }],
      take: 40,
    }),
    viewerId ? db.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }) : [],
  ]);
  const followingSet = new Set(following.map((f) => f.followingId));
  if (!users.length) return <EmptyState title={`No artists match "${q}"`} />;
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id} className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Link href={`/${u.username}`}>
            <Avatar user={u} size="md" />
          </Link>
          <Link href={`/${u.username}`} className="min-w-0 flex-1">
            <p className="flex items-center gap-1 font-semibold">
              <span className="truncate">{u.name}</span>
              {u.verified && <VerifiedBadge />}
            </p>
            <p className="truncate text-sm text-muted">@{u.username}</p>
            {u.headline && <p className="truncate text-sm">{u.headline}</p>}
          </Link>
          <FollowButton userId={u.id} initialFollowing={followingSet.has(u.id)} size="sm" />
        </li>
      ))}
    </ul>
  );
}

async function Tags({ q }: { q: string }) {
  const term = q.replace(/^#/, "").toLowerCase();
  const tags = await db.hashtag.findMany({
    where: { name: { contains: term } },
    select: { name: true, _count: { select: { posts: true } } },
    orderBy: { posts: { _count: "desc" } },
    take: 40,
  });
  if (!tags.length) return <EmptyState title={`No hashtags match "${q}"`} />;
  return (
    <ul>
      {tags.map((t) => (
        <li key={t.name}>
          <Link href={`/tag/${encodeURIComponent(t.name)}`} className="block border-b border-border px-4 py-3 hover:bg-surface-2">
            <p className="font-semibold">#{t.name}</p>
            <p className="text-sm text-muted">{formatCount(t._count.posts)} posts</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
