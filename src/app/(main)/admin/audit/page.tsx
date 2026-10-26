import type { Metadata } from "next";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Audit log · Admin" };

export default async function AuditPage() {
  const logs = await db.auditLog.findMany({
    include: { actor: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  if (!logs.length) return <EmptyState title="No moderator actions yet" />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs text-muted uppercase">
          <tr>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">Who</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Target</th>
            <th className="px-3 py-2">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="px-3 py-2 whitespace-nowrap text-muted">{l.createdAt.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
              <td className="px-3 py-2">{l.actor ? `@${l.actor.username}` : "—"}</td>
              <td className="px-3 py-2 font-mono text-xs">{l.action}</td>
              <td className="px-3 py-2 text-xs text-muted">
                {l.targetType ?? ""} {l.targetId ?? ""}
              </td>
              <td className="max-w-xs truncate px-3 py-2 text-xs text-muted">{l.details ? JSON.stringify(l.details) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
