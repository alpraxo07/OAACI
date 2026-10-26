import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getTrendingHashtags, userMiniSelect } from "@/lib/posts";
import { getHiddenAuthorIds } from "@/lib/social";
import { getActiveAds } from "@/lib/ads";
import { Avatar } from "@/components/ui/avatar";
import { VerifiedBadge, formatCount } from "@/components/ui/misc";
import { FollowButton } from "@/components/follow-button";
import { SponsoredCard } from "@/components/sponsored-card";

export async function getSuggestedArtists(viewerId: string | null, take = 4) {
  const exclude = viewerId
    ? [
        viewerId,
        ...(await db.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } })).map((f) => f.followingId),
        ...(await getHiddenAuthorIds(viewerId)),
      ]
    : [];
  return db.user.findMany({
    where: { id: { notIn: exclude }, bannedAt: null, deactivatedAt: null },
    select: { ...userMiniSelect, headline: true },
    orderBy: [{ verified: "desc" }, { followers: { _count: "desc" } }, { createdAt: "desc" }],
    take,
  });
}

export async function RightRail({ showSearch = true }: { showSearch?: boolean }) {
  const me = await getCurrentUser();
  const [tags, suggested, ads] = await Promise.all([getTrendingHashtags(6), getSuggestedArtists(me?.id ?? null), getActiveAds("SIDEBAR", 1)]);

  return (
    <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 space-y-4 overflow-y-auto px-5 py-4 lg:block scroll-thin">
      {showSearch && (
        <form action="/search" className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" className="input rounded-full pl-10" placeholder="Search artists, posts, #tags" aria-label="Search" />
        </form>
      )}

      {tags.length > 0 && (
        <section className="card p-4">
          <h2 className="section-title mb-2">Trending in OAACI</h2>
          <ul>
            {tags.map((t) => (
              <li key={t.name}>
                <Link href={`/tag/${encodeURIComponent(t.name)}`} className="-mx-2 block rounded-lg px-2 py-1.5 hover:bg-surface-2">
                  <p className="font-semibold">#{t.name}</p>
                  <p className="text-xs text-muted">
                    {formatCount(t.count)} {t.count === 1 ? "post" : "posts"} this week
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {suggested.length > 0 && (
        <section className="card p-4">
          <h2 className="section-title mb-3">Artists to follow</h2>
          <ul className="space-y-3">
            {suggested.map((u) => (
              <li key={u.id} className="flex items-center gap-3">
                <Link href={`/${u.username}`}>
                  <Avatar user={u} size="md" />
                </Link>
                <Link href={`/${u.username}`} className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold">
                    <span className="truncate">{u.name}</span>
                    {u.verified && <VerifiedBadge />}
                  </p>
                  <p className="truncate text-xs text-muted">{u.headline || `@${u.username}`}</p>
                </Link>
                <FollowButton userId={u.id} initialFollowing={false} size="sm" />
              </li>
            ))}
          </ul>
          <Link href="/explore?tab=artists" className="mt-3 block text-sm link">
            See more artists
          </Link>
        </section>
      )}

      {ads[0] && <SponsoredCard ad={ads[0]} variant="sidebar" />}

      <footer className="flex flex-wrap gap-x-3 gap-y-1 px-1 pb-6 text-xs text-muted">
        <Link href="/about" className="hover:underline">
          About
        </Link>
        <Link href="/guidelines" className="hover:underline">
          Community guidelines
        </Link>
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        <span>© {new Date().getFullYear()} OAACI</span>
      </footer>
    </aside>
  );
}

/** The usual page layout: a center column plus the right rail on large screens. */
export function Columns({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex">
      <div className="min-h-dvh min-w-0 flex-1 border-border md:border-r lg:max-w-[640px]">{children}</div>
      {aside ?? <RightRail />}
    </div>
  );
}
