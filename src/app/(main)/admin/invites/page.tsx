import type { Metadata } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { InviteAdmin } from "@/components/admin/invite-admin";

export const metadata: Metadata = { title: "Invites · Admin" };

export default async function AdminInvitesPage() {
  const invites = await db.invite.findMany({
    include: { createdBy: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <InviteAdmin
      appUrl={env.appUrl}
      invites={invites.map((i) => ({
        id: i.id,
        code: i.code,
        usedCount: i.usedCount,
        maxUses: i.maxUses,
        expiresAt: i.expiresAt?.toISOString() ?? null,
        note: i.note,
        disabled: i.disabled,
        createdBy: i.createdBy?.username ?? null,
        createdAt: i.createdAt.toISOString(),
      }))}
    />
  );
}
