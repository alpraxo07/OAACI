import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata: Metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const me = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: me.id },
    select: { name: true, username: true, headline: true, bio: true, website: true, avatarUrl: true, coverUrl: true, disciplines: true, openToCommissions: true },
  });
  return (
    <Columns aside={<SettingsNav variant="rail" />}>
      <PageHeader title="Edit profile" back="/settings" />
      <ProfileForm user={user} canUpload={me.contactVerified} />
    </Columns>
  );
}
