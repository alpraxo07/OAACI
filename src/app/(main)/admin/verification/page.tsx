import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { userMiniSelect } from "@/lib/posts";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { TimeAgo } from "@/components/ui/time-ago";
import { VerificationReview } from "@/components/admin/verification-review";

export const metadata: Metadata = { title: "Verification · Admin" };

export default async function AdminVerificationPage() {
  const requests = await db.verificationRequest.findMany({
    where: { status: "PENDING" },
    include: {
      user: {
        select: {
          ...userMiniSelect,
          headline: true,
          bio: true,
          website: true,
          disciplines: true,
          createdAt: true,
          _count: { select: { posts: true, followers: true, profileEntries: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  if (!requests.length) return <EmptyState title="No pending verification requests" />;

  return (
    <ul className="space-y-4">
      {requests.map((r) => (
        <li key={r.id} className="card p-4">
          <div className="flex items-center gap-3">
            <Avatar user={r.user} size="lg" />
            <div className="min-w-0 flex-1">
              <Link href={`/${r.user.username}`} target="_blank" className="font-semibold hover:underline">
                {r.user.name} <span className="font-normal text-muted">@{r.user.username}</span>
              </Link>
              {r.user.headline && <p className="text-sm">{r.user.headline}</p>}
              <p className="text-xs text-muted">
                {r.user._count.posts} posts · {r.user._count.followers} followers · {r.user._count.profileEntries} portfolio entries · joined{" "}
                {r.user.createdAt.toLocaleDateString("en-IN")} · requested <TimeAgo date={r.createdAt.toISOString()} />
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm whitespace-pre-wrap">{r.message}</p>
          {(r.links.length > 0 || r.user.website) && (
            <ul className="mt-2 space-y-0.5 text-sm">
              {[...r.links, ...(r.user.website ? [r.user.website] : [])].map((l) => (
                <li key={l}>
                  <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="link break-all">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <VerificationReview id={r.id} />
        </li>
      ))}
    </ul>
  );
}
