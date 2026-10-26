import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Briefcase, CalendarDays, ExternalLink, GraduationCap, Images, Landmark, Rows3, ShoppingBag, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfile, type Profile } from "@/lib/profiles";
import { getUserGallery, getUserPosts } from "@/lib/posts";
import { getListings } from "@/lib/listings";
import { imageUrl } from "@/lib/media-url";
import { Columns } from "@/components/shell/right-rail";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, PageHeader, VerifiedBadge, formatCount } from "@/components/ui/misc";
import { FeedList } from "@/components/post/feed-list";
import { MediaGridList } from "@/components/post/media-grid-list";
import { RichText } from "@/components/post/rich-text";
import { ProfileActions } from "@/components/profile/profile-actions";
import { ListingGrid } from "@/components/market/listing-grid";
import { cn } from "@/lib/cn";

export async function generateMetadata({ params }: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(decodeURIComponent(username), null);
  if (!profile || profile.user.bannedAt || profile.user.deactivatedAt) return { title: "Profile not found" };
  const { user } = profile;
  return {
    title: `${user.name} (@${user.username})`,
    description: user.headline || user.bio || `${user.name}'s portfolio on OAACI`,
    openGraph: { images: user.avatarUrl ? [imageUrl(user.avatarUrl, 400, true)] : undefined },
  };
}

const TABS = [
  { key: "posts", label: "Posts", icon: Rows3 },
  { key: "gallery", label: "Gallery", icon: Images },
  { key: "about", label: "About", icon: UserRound },
  { key: "shop", label: "Shop", icon: ShoppingBag },
] as const;

export default async function ProfilePage({ params, searchParams }: PageProps<"/[username]">) {
  const { username } = await params;
  const { tab: tabParam } = await searchParams;
  const me = await getCurrentUser();
  const profile = await getProfile(decodeURIComponent(username), me?.id ?? null);
  if (!profile || profile.user.deactivatedAt) notFound();
  const { user, relation } = profile;

  if (user.bannedAt) {
    return (
      <Columns>
        <PageHeader title={`@${user.username}`} back="/" />
        <EmptyState title="Account suspended">This account has been suspended for breaking OAACI&apos;s community guidelines.</EmptyState>
      </Columns>
    );
  }

  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "posts";
  const hiddenFromMe = relation.blockedMe;

  return (
    <Columns>
      <PageHeader title={user.name} back="/">
        <span className="text-sm text-muted">{formatCount(user._count.posts)} posts</span>
      </PageHeader>

      <ProfileHeader profile={profile} />

      {hiddenFromMe ? (
        <EmptyState title="You can't see this profile">@{user.username} has limited who can see their posts.</EmptyState>
      ) : relation.blocked ? (
        <EmptyState title={`You blocked @${user.username}`}>Unblock them from the menu above to see their posts.</EmptyState>
      ) : (
        <>
          <nav className="flex border-b border-border" aria-label="Profile sections">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/${user.username}${t.key === "posts" ? "" : `?tab=${t.key}`}`}
                scroll={false}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium hover:bg-surface-2",
                  tab === t.key ? "text-fg" : "text-muted",
                )}
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
                {t.key === "shop" && user._count.listings > 0 && <span className="text-xs text-muted">{user._count.listings}</span>}
                {tab === t.key && <span className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-primary" />}
              </Link>
            ))}
          </nav>
          {tab === "posts" && <PostsTab userId={user.id} viewerId={me?.id ?? null} name={user.name} />}
          {tab === "gallery" && <GalleryTab userId={user.id} viewerId={me?.id ?? null} />}
          {tab === "about" && <AboutTab profile={profile} />}
          {tab === "shop" && <ShopTab userId={user.id} isMe={relation.isMe} />}
        </>
      )}
    </Columns>
  );
}

function ProfileHeader({ profile }: { profile: Profile }) {
  const { user, relation } = profile;
  let websiteLabel = user.website;
  try {
    if (user.website) websiteLabel = new URL(user.website).host.replace(/^www\./, "");
  } catch {}

  return (
    <section className="border-b border-border pb-4">
      <div className="relative aspect-[3/1] bg-gradient-to-br from-primary/80 via-amber-600/60 to-teal-700/60">
        {user.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(user.coverUrl, 1280)} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="px-4">
        <div className="flex items-end justify-between gap-3">
          <Avatar user={user} size="2xl" className="-mt-12 border-4 border-bg sm:-mt-16" />
          <div className="pt-3">
            <ProfileActions user={user} relation={relation} />
          </div>
        </div>
        <div className="mt-3">
          <h1 className="flex items-center gap-1.5 font-display text-2xl font-semibold">
            {user.name}
            {user.verified && <VerifiedBadge className="h-5 w-5" />}
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-muted">
            @{user.username}
            {relation.followsMe && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">Follows you</span>}
            {user.role !== "USER" && <span className="rounded bg-primary-soft px-1.5 py-0.5 text-xs text-primary-text">OAACI team</span>}
          </p>
          {user.headline && <p className="mt-2 font-medium">{user.headline}</p>}
          {user.bio && <RichText text={user.bio} className="mt-2 text-[15px] leading-relaxed" />}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {user.website && (
              <a href={user.website} target="_blank" rel="noopener noreferrer nofollow ugc" className="flex items-center gap-1 text-primary-text hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />
                {websiteLabel}
              </a>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Joined {user.createdAt.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </span>
          </div>
          {(user.disciplines.length > 0 || user.openToCommissions) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {user.openToCommissions && <span className="chip border-success/30 bg-success-soft text-success">Open to commissions</span>}
              {user.disciplines.map((d) => (
                <Link key={d} href={`/explore?tab=artists&d=${encodeURIComponent(d)}`} className="chip hover:border-primary">
                  {d}
                </Link>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-4 text-sm">
            <Link href={`/${user.username}/following`} className="hover:underline">
              <span className="font-semibold">{formatCount(user._count.following)}</span> <span className="text-muted">Following</span>
            </Link>
            <Link href={`/${user.username}/followers`} className="hover:underline">
              <span className="font-semibold">{formatCount(user._count.followers)}</span>{" "}
              <span className="text-muted">{user._count.followers === 1 ? "Follower" : "Followers"}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

async function PostsTab({ userId, viewerId, name }: { userId: string; viewerId: string | null; name: string }) {
  const initial = await getUserPosts(userId, viewerId);
  return (
    <FeedList
      initial={initial}
      endpoint={`/api/feed?scope=user&userId=${userId}`}
      empty={<EmptyState title="No posts yet">{viewerId === userId ? "Share your first work with the community." : `${name} hasn't posted yet.`}</EmptyState>}
    />
  );
}

async function GalleryTab({ userId, viewerId }: { userId: string; viewerId: string | null }) {
  const initial = await getUserGallery(userId, viewerId);
  return (
    <MediaGridList
      initial={initial}
      endpoint={`/api/feed?scope=gallery&userId=${userId}`}
      empty={<EmptyState icon={<Images className="h-6 w-6" />} title="No photos, videos or songs yet" />}
    />
  );
}

const SECTION_META = {
  EXHIBITION: { label: "Exhibitions & shows", icon: Landmark },
  EXPERIENCE: { label: "Experience", icon: Briefcase },
  EDUCATION: { label: "Education & training", icon: GraduationCap },
  AWARD: { label: "Awards & recognition", icon: Award },
} as const;

async function AboutTab({ profile }: { profile: Profile }) {
  const { user, relation } = profile;
  const entries = await db.profileEntry.findMany({
    where: { userId: user.id },
    orderBy: [{ current: "desc" }, { startYear: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-4 p-4">
      <section className="card p-5">
        <h2 className="section-title">About</h2>
        {user.bio ? <RichText text={user.bio} className="mt-2 leading-relaxed" /> : <p className="mt-2 text-muted">No bio yet.</p>}
        {user.disciplines.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold text-muted">Disciplines</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.disciplines.map((d) => (
                <span key={d} className="chip">
                  {d}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {(Object.keys(SECTION_META) as (keyof typeof SECTION_META)[]).map((kind) => {
        const items = entries.filter((e) => e.kind === kind);
        if (!items.length) return null;
        const { label, icon: Icon } = SECTION_META[kind];
        return (
          <section key={kind} className="card p-5">
            <h2 className="section-title">{label}</h2>
            <ul className="mt-3 space-y-4">
              {items.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-primary-text">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {e.url ? (
                        <a href={e.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="hover:underline">
                          {e.title}
                        </a>
                      ) : (
                        e.title
                      )}
                    </p>
                    {e.organization && <p className="text-sm">{e.organization}</p>}
                    {(e.startYear || e.current) && (
                      <p className="text-sm text-muted">
                        {e.startYear}
                        {e.current ? " – Present" : e.endYear && e.endYear !== e.startYear ? ` – ${e.endYear}` : ""}
                      </p>
                    )}
                    {e.description && <p className="mt-1 text-sm whitespace-pre-wrap text-muted">{e.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {entries.length === 0 && relation.isMe && (
        <div className="card p-5 text-sm text-muted">
          Build your artist CV — add exhibitions, experience, training and awards.{" "}
          <Link href="/settings/portfolio" className="link">
            Add to your portfolio
          </Link>
        </div>
      )}
    </div>
  );
}

async function ShopTab({ userId, isMe }: { userId: string; isMe: boolean }) {
  const listings = await getListings({ sellerId: userId, includeSold: true, take: 60 });
  return (
    <div className="p-4">
      {isMe && (
        <div className="mb-4 flex justify-end">
          <Link href="/market/new" className="btn btn-primary btn-sm">
            List an artwork
          </Link>
        </div>
      )}
      {listings.items.length ? (
        <ListingGrid listings={listings.items} />
      ) : (
        <EmptyState icon={<ShoppingBag className="h-6 w-6" />} title="Nothing for sale yet">
          {isMe ? "List your artworks and crafts so buyers can find them." : "Check back later for original works."}
        </EmptyState>
      )}
    </div>
  );
}
