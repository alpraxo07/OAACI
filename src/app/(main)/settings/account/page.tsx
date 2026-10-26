import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";
import { SettingsNav } from "@/components/settings/settings-nav";
import { AccountForms } from "@/components/settings/account-forms";

export const metadata: Metadata = { title: "Account" };

export default async function AccountSettingsPage() {
  const me = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: me.id },
    select: {
      username: true,
      email: true,
      emailVerifiedAt: true,
      phone: true,
      googleId: true,
      passwordHash: true,
      usernameChangedAt: true,
      _count: { select: { sessions: true } },
    },
  });
  return (
    <Columns aside={<SettingsNav variant="rail" />}>
      <PageHeader title="Account" back="/settings" />
      <AccountForms
        account={{
          username: user.username,
          email: user.email,
          emailVerified: Boolean(user.emailVerifiedAt),
          phone: user.phone,
          google: Boolean(user.googleId),
          hasPassword: Boolean(user.passwordHash),
          sessions: user._count.sessions,
          usernameChangedAt: user.usernameChangedAt?.toISOString() ?? null,
        }}
      />
    </Columns>
  );
}
