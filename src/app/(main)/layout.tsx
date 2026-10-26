import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { AppProviders } from "@/components/providers";
import { MobileTabBar, MobileTopBar, SideNav } from "@/components/shell/nav";
import { ComposerModal } from "@/components/post/composer-modal";
import { VerifyEmailBanner } from "@/components/shell/verify-banner";
import type { Me } from "@/lib/types";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const me: Me | null = user
    ? {
        id: user.id,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        verified: user.verified,
        isStaff: user.isStaff,
        contactVerified: user.contactVerified,
      }
    : null;

  return (
    <AppProviders me={me}>
      <div className="mx-auto flex max-w-[1300px]">
        <SideNav />
        <div className="min-w-0 flex-1">
          <MobileTopBar />
          {settings.announcement && (
            <div className="border-b border-border bg-primary-soft px-4 py-2 text-center text-sm text-primary-text">{settings.announcement}</div>
          )}
          {user && !user.contactVerified && <VerifyEmailBanner hasEmail={Boolean(user.email)} />}
          <main>{children}</main>
          <div className="h-16 md:hidden" aria-hidden />
        </div>
      </div>
      <MobileTabBar />
      {me && <ComposerModal />}
    </AppProviders>
  );
}
