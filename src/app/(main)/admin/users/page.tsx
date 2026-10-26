import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, VerifiedBadge } from "@/components/ui/misc";
import { UserAdminActions } from "@/components/admin/user-admin-actions";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Users · Admin" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "banned", label: "Banned" },
  { key: "staff", label: "Staff" },
  { key: "unverified-email", label: "Email not confirmed" },
] as const;

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const filter = FILTERS.find((f) => f.key === params.filter)?.key ?? "all";
  const me = (await getCurrentUser())!;

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { username: { contains: q.toLowerCase().replace(/^@/, "") } },
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q.toLowerCase() } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(filter === "verified" ? { verified: true } : {}),
    ...(filter === "banned" ? { bannedAt: { not: null } } : {}),
    ...(filter === "staff" ? { role: { in: ["ADMIN", "MODERATOR"] } } : {}),
    ...(filter === "unverified-email" ? { emailVerifiedAt: null, phoneVerifiedAt: null } : {}),
  };
  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      verified: true,
      email: true,
      emailVerifiedAt: true,
      phone: true,
      role: true,
      bannedAt: true,
      banReason: true,
      deactivatedAt: true,
      createdAt: true,
      invitedBy: { select: { username: true } },
      _count: { select: { posts: true, followers: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        <input type="hidden" name="filter" value={filter} />
        <input name="q" defaultValue={q} className="input" placeholder="Search name, username, email or phone" />
        <button className="btn btn-secondary">Search</button>
      </form>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/users?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={cn("chip shrink-0", filter === f.key && "border-primary bg-primary-soft text-primary-text")}
          >
            {f.label}
          </Link>
        ))}
      </div>
      {users.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <ul className="card divide-y divide-border">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar user={u} size="md" />
              <div className="min-w-0 flex-1">
                <Link href={`/${u.username}`} className="flex items-center gap-1 font-semibold hover:underline">
                  <span className="truncate">{u.name}</span>
                  {u.verified && <VerifiedBadge />}
                  {u.role !== "USER" && <span className="ml-1 rounded bg-primary-soft px-1.5 text-[10px] text-primary-text">{u.role}</span>}
                </Link>
                <p className="truncate text-xs text-muted">
                  @{u.username} · {u.email ?? u.phone ?? "no contact"}
                  {u.email && !u.emailVerifiedAt && " (unconfirmed)"} · joined {u.createdAt.toLocaleDateString("en-IN")}
                  {u.invitedBy && ` · invited by @${u.invitedBy.username}`} · {u._count.posts} posts · {u._count.followers} followers
                </p>
                {u.bannedAt && <p className="text-xs text-danger">Banned{u.banReason ? `: ${u.banReason}` : ""}</p>}
                {u.deactivatedAt && <p className="text-xs text-muted">Deactivated</p>}
              </div>
              {u.id !== me.id && (
                <UserAdminActions
                  user={{ id: u.id, verified: u.verified, banned: Boolean(u.bannedAt), role: u.role }}
                  canChangeRole={me.role === "ADMIN"}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
