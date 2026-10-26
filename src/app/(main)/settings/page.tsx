import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { logOut } from "@/actions/auth";
import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireUser();
  return (
    <Columns aside={<SettingsNav variant="rail" />}>
      <PageHeader title="Settings" />
      <SettingsNav variant="list" />
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div>
          <p className="font-semibold">Appearance</p>
          <p className="text-sm text-muted">Light, dark or match your device</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="flex items-center justify-between px-4 py-4">
        <p className="text-sm text-muted">
          Signed in as <Link href={`/${me.username}`} className="font-medium text-fg">@{me.username}</Link>
        </p>
        <form action={logOut}>
          <button className="btn btn-secondary btn-sm">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </form>
      </div>
    </Columns>
  );
}
