import Link from "next/link";
import { Briefcase, Images, MessageCircle, Store, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getExplorePosts, getHomeFeed } from "@/lib/posts";
import { getActiveAds } from "@/lib/ads";
import { getSettings } from "@/lib/settings";
import { APP_FULL_NAME } from "@/lib/constants";
import { Columns, RightRail, getSuggestedArtists } from "@/components/shell/right-rail";
import { Composer } from "@/components/post/composer";
import { FeedList } from "@/components/post/feed-list";
import { PageHeader } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { FollowButton } from "@/components/follow-button";
import { MediaGrid } from "@/components/post/media-grid";

export default async function HomePage() {
  const me = await getCurrentUser();
  if (!me) return <Landing />;

  const [feed, ads] = await Promise.all([getHomeFeed(me.id), getActiveAds("FEED")]);

  return (
    <Columns>
      <PageHeader title="Home" />
      <Composer />
      <FeedList key={feed.items[0]?.key ?? "empty"} initial={feed} endpoint="/api/feed?scope=home" ads={ads} empty={<EmptyFeed viewerId={me.id} />} />
    </Columns>
  );
}

async function EmptyFeed({ viewerId }: { viewerId: string }) {
  const suggested = await getSuggestedArtists(viewerId, 6);
  return (
    <div className="px-4 py-10">
      <div className="text-center">
        <p className="font-display text-2xl font-semibold">Welcome to your feed</p>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          Follow artists to see their new work here. Your own posts will show up here too.
        </p>
      </div>
      {suggested.length > 0 && (
        <ul className="mx-auto mt-8 max-w-md space-y-3">
          {suggested.map((u) => (
            <li key={u.id} className="card flex items-center gap-3 p-3">
              <Link href={`/${u.username}`}>
                <Avatar user={u} size="md" />
              </Link>
              <Link href={`/${u.username}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.name}</p>
                <p className="truncate text-sm text-muted">{u.headline || `@${u.username}`}</p>
              </Link>
              <FollowButton userId={u.id} initialFollowing={false} size="sm" />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 text-center">
        <Link href="/explore" className="btn btn-primary">
          Explore OAACI
        </Link>
      </div>
    </div>
  );
}

async function Landing() {
  const [{ items: works }, { inviteOnly }] = await Promise.all([getExplorePosts(null), getSettings()]);
  const features = [
    { icon: Images, title: "Share your work", text: "Post photos, videos and songs. Get stars, comments and reposts from people who care about craft." },
    { icon: Briefcase, title: "A portfolio that works for you", text: "Your profile doubles as an artist CV — exhibitions, training, awards and a gallery of your best pieces." },
    { icon: Users, title: "Find your people", text: "Follow painters, potters, weavers and musicians across India. Discover new work through hashtags and trends." },
    { icon: MessageCircle, title: "Talk directly", text: "Message artists and buyers one-to-one, with photos, typing indicators and read receipts." },
    { icon: Store, title: "Sell originals", text: "List artworks and crafts in the marketplace. Buyers contact you directly — no middlemen." },
  ];

  return (
    <Columns aside={<RightRail showSearch={false} />}>
      <section className="relative overflow-hidden border-b border-border px-6 pt-14 pb-12">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" aria-hidden />
        <p className="relative text-sm font-semibold tracking-wider text-primary-text uppercase">{APP_FULL_NAME}</p>
        <h1 className="relative mt-3 font-display text-4xl leading-tight font-semibold sm:text-5xl">
          Every original piece deserves an introduction.
        </h1>
        <p className="relative mt-4 max-w-xl text-lg text-muted">
          OAACI is a social home and portfolio for India&apos;s artists and craftspeople — show your work, grow your audience
          and sell directly to people who love it.
        </p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="btn btn-primary btn-lg">
            {inviteOnly ? "I have an invite" : "Join OAACI"}
          </Link>
          {inviteOnly && (
            <Link href="/waitlist" className="btn btn-secondary btn-lg">
              Request an invite
            </Link>
          )}
          <Link href="/login" className="btn btn-ghost btn-lg">
            Log in
          </Link>
        </div>
        <p className="relative mt-4 text-sm text-muted">Free to join · 18+ only · {inviteOnly ? "Currently invite-only" : "Open to all artists"}</p>
      </section>

      <section className="grid gap-px border-b border-border bg-border sm:grid-cols-2">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-bg p-6">
            <Icon className="h-6 w-6 text-primary-text" />
            <h2 className="mt-3 font-display text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
        <div className="bg-bg p-6">
          <p className="font-display text-lg font-semibold">Made for India</p>
          <p className="mt-1 text-sm text-muted">Prices in rupees, hashtags in any script — #मधुबनी works just as well as #madhubani.</p>
        </div>
      </section>

      {works.length > 0 && (
        <section>
          <div className="flex items-center justify-between px-4 py-4">
            <h2 className="section-title">Fresh from the community</h2>
            <Link href="/explore" className="text-sm link">
              Explore all
            </Link>
          </div>
          <MediaGrid posts={works.slice(0, 12)} />
        </section>
      )}
    </Columns>
  );
}
