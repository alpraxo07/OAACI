import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { userMiniSelect } from "@/lib/posts";
import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PrivacyForms } from "@/components/settings/privacy-forms";

export const metadata: Metadata = { title: "Privacy & safety" };

export default async function PrivacySettingsPage() {
  const me = await requireUser();
  const [blocked, muted] = await Promise.all([
    db.block.findMany({ where: { blockerId: me.id }, select: { blocked: { select: userMiniSelect } }, orderBy: { createdAt: "desc" } }),
    db.mute.findMany({ where: { muterId: me.id }, select: { muted: { select: userMiniSelect } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <Columns aside={<SettingsNav variant="rail" />}>
      <PageHeader title="Privacy & safety" back="/settings" />
      <PrivacyForms dmPolicy={me.dmPolicy} blocked={blocked.map((b) => b.blocked)} muted={muted.map((m) => m.muted)} />
    </Columns>
  );
}
