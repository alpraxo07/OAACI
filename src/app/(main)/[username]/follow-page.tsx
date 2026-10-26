import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getHiddenAuthorIds } from "@/lib/social";
import { userMiniSelect } from "@/lib/posts";
import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";
import { UserList } from "@/components/profile/user-list";
import { cn } from "@/lib/cn";

export async function FollowPage({ username, mode }: { username: string; mode: "followers" | "following" }) {
  const me = await getCurrentUser();
  const user = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, name: true, username: true, bannedAt: true, deactivatedAt: true },
  });
  if (!user || user.bannedAt || user.deactivatedAt) notFound();
  const hidden = await getHiddenAuthorIds(me?.id);
  if (hidden.includes(user.id)) notFound();

  const active = { bannedAt: null, deactivatedAt: null, ...(hidden.length ? { id: { notIn: hidden } } : {}) };
  const rows =
    mode === "followers"
      ? (
          await db.follow.findMany({
            where: { followingId: user.id, follower: active },
            select: { follower: { select: { ...userMiniSelect, headline: true } } },
            orderBy: { createdAt: "desc" },
            take: 200,
          })
        ).map((r) => r.follower)
      : (
          await db.follow.findMany({
            where: { followerId: user.id, following: active },
            select: { following: { select: { ...userMiniSelect, headline: true } } },
            orderBy: { createdAt: "desc" },
            take: 200,
          })
        ).map((r) => r.following);

  const myFollowing = me
    ? new Set((await db.follow.findMany({ where: { followerId: me.id }, select: { followingId: true } })).map((f) => f.followingId))
    : new Set<string>();

  return (
    <Columns>
      <PageHeader title={user.name} back={`/${user.username}`} />
      <nav className="flex border-b border-border">
        {(["followers", "following"] as const).map((m) => (
          <Link
            key={m}
            href={`/${user.username}/${m}`}
            className={cn("relative flex-1 py-3 text-center text-sm font-medium capitalize hover:bg-surface-2", mode === m ? "text-fg" : "text-muted")}
          >
            {m}
            {mode === m && <span className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-primary" />}
          </Link>
        ))}
      </nav>
      <UserList
        users={rows}
        followingIds={myFollowing}
        emptyTitle={mode === "followers" ? `@${user.username} has no followers yet` : `@${user.username} isn't following anyone yet`}
      />
    </Columns>
  );
}
