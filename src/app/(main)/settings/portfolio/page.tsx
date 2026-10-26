import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PortfolioEditor } from "@/components/settings/portfolio-editor";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioSettingsPage() {
  const me = await requireUser();
  const entries = await db.profileEntry.findMany({
    where: { userId: me.id },
    orderBy: [{ current: "desc" }, { startYear: "desc" }, { createdAt: "desc" }],
  });
  return (
    <Columns aside={<SettingsNav variant="rail" />}>
      <PageHeader title="Portfolio" back="/settings" />
      <PortfolioEditor
        username={me.username}
        entries={entries.map((e) => ({
          id: e.id,
          kind: e.kind,
          title: e.title,
          organization: e.organization ?? "",
          startYear: e.startYear ? String(e.startYear) : "",
          endYear: e.endYear ? String(e.endYear) : "",
          current: e.current,
          description: e.description ?? "",
          url: e.url ?? "",
        }))}
      />
    </Columns>
  );
}
