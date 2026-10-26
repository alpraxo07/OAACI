import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatCount } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Admin" };

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

export default async function AdminDashboard() {
  const week = daysAgo(7);
  const [users, newUsers, posts, newPosts, listings, openReports, heldPosts, pendingVerifications, waitlist, messages, settings] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: week } } }),
    db.post.count({ where: { repostOfId: null } }),
    db.post.count({ where: { repostOfId: null, createdAt: { gte: week } } }),
    db.listing.count({ where: { status: "ACTIVE" } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.post.count({ where: { status: "HIDDEN" } }),
    db.verificationRequest.count({ where: { status: "PENDING" } }),
    db.waitlistEntry.count({ where: { status: "PENDING" } }),
    db.message.count({ where: { createdAt: { gte: week } } }),
    getSettings(),
  ]);

  const stats = [
    { label: "Members", value: users, sub: `+${newUsers} this week`, href: "/admin/users" },
    { label: "Posts", value: posts, sub: `+${newPosts} this week`, href: "/explore?tab=latest" },
    { label: "Active listings", value: listings, href: "/market" },
    { label: "Messages this week", value: messages },
  ];
  const todo = [
    { label: "Open reports", value: openReports, href: "/admin/reports" },
    { label: "Posts held for review", value: heldPosts, href: "/admin/reports" },
    { label: "Verification requests", value: pendingVerifications, href: "/admin/verification" },
    { label: "Waitlist requests", value: waitlist, href: "/admin/waitlist" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
        Sign-ups are <strong>{settings.inviteOnly ? "invite-only" : "open to everyone"}</strong>.{" "}
        <Link href="/admin/settings" className="link">
          Change
        </Link>
      </div>
      <section>
        <h2 className="section-title mb-3">Needs attention</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {todo.map((t) => (
            <Link key={t.label} href={t.href} className="card p-4 hover:border-primary">
              <p className={`font-display text-3xl font-semibold ${t.value ? "text-primary-text" : ""}`}>{t.value}</p>
              <p className="text-sm text-muted">{t.label}</p>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="section-title mb-3">Community</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => {
            const body = (
              <>
                <p className="font-display text-3xl font-semibold">{formatCount(s.value)}</p>
                <p className="text-sm text-muted">{s.label}</p>
                {s.sub && <p className="mt-1 text-xs text-success">{s.sub}</p>}
              </>
            );
            return s.href ? (
              <Link key={s.label} href={s.href} className="card p-4 hover:border-primary">
                {body}
              </Link>
            ) : (
              <div key={s.label} className="card p-4">
                {body}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
