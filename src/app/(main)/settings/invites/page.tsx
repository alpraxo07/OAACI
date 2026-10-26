import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";
import { SettingsNav } from "@/components/settings/settings-nav";
import { InviteManager } from "@/components/settings/invite-manager";

export const metadata: Metadata = { title: "Invite artists" };

export default async function InvitesPage() {
  const me = await requireUser();
  const [{ userInviteQuota, inviteOnly }, invites] = await Promise.all([
    getSettings(),
    db.invite.findMany({
      where: { createdById: me.id },
      select: { code: true, usedCount: true, maxUses: true, createdAt: true, usedBy: { select: { username: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <Columns aside={<SettingsNav variant="rail" />}>
      <PageHeader title="Invite artists" back="/settings" />
      <InviteManager
        appUrl={env.appUrl}
        quota={userInviteQuota}
        inviteOnly={inviteOnly}
        canCreate={me.contactVerified}
        invites={invites.map((i) => ({ code: i.code, used: i.usedCount >= i.maxUses, usedBy: i.usedBy[0] ?? null }))}
      />
    </Columns>
  );
}
