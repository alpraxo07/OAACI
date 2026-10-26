import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/misc";
import { TimeAgo } from "@/components/ui/time-ago";
import { WaitlistActions } from "@/components/admin/waitlist-actions";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Waitlist · Admin" };

export default async function AdminWaitlistPage({ searchParams }: PageProps<"/admin/waitlist">) {
  const { status: s } = await searchParams;
  const status = s === "INVITED" || s === "REJECTED" ? s : "PENDING";
  const entries = await db.waitlistEntry.findMany({ where: { status }, orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" }, take: 200 });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["PENDING", "INVITED", "REJECTED"] as const).map((x) => (
          <Link key={x} href={`/admin/waitlist?status=${x}`} className={cn("chip capitalize", status === x && "border-primary bg-primary-soft text-primary-text")}>
            {x.toLowerCase()}
          </Link>
        ))}
      </div>
      {entries.length === 0 ? (
        <EmptyState title="Nobody here" />
      ) : (
        <ul className="card divide-y divide-border">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {e.name} <span className="font-normal text-muted">{e.email}</span>
                </p>
                {e.portfolioUrl && (
                  <a href={e.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-sm link break-all">
                    {e.portfolioUrl}
                  </a>
                )}
                {e.message && <p className="mt-1 text-sm whitespace-pre-wrap text-muted">{e.message}</p>}
                <p className="mt-1 text-xs text-muted">
                  Requested <TimeAgo date={e.createdAt.toISOString()} />
                  {e.invitedAt && ` · invited ${e.invitedAt.toLocaleDateString("en-IN")}`}
                </p>
              </div>
              {status === "PENDING" && <WaitlistActions id={e.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
