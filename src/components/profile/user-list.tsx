import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, VerifiedBadge } from "@/components/ui/misc";
import { FollowButton } from "@/components/follow-button";
import type { UserMini } from "@/lib/types";

export function UserList({
  users,
  followingIds,
  emptyTitle,
}: {
  users: (UserMini & { headline?: string | null })[];
  followingIds: Set<string>;
  emptyTitle: string;
}) {
  if (!users.length) return <EmptyState title={emptyTitle} />;
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
          <FollowButton userId={u.id} initialFollowing={followingIds.has(u.id)} size="sm" />
        </li>
      ))}
    </ul>
  );
}
