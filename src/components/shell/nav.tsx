"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Compass,
  House,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { logOut } from "@/actions/auth";
import { useCompose, useMe, useRealtime } from "@/components/providers";
import { Avatar } from "@/components/ui/avatar";
import { Logo, VerifiedBadge } from "@/components/ui/misc";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/cn";

function Badge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
}

/** Left sidebar for tablets and desktops. */
export function SideNav() {
  const me = useMe();
  const { unread } = useRealtime();
  const { setOpen } = useCompose();
  const isActive = useActive();

  const items = me
    ? [
        { href: "/", label: "Home", icon: House },
        { href: "/explore", label: "Explore", icon: Compass },
        { href: "/search", label: "Search", icon: Search },
        { href: "/market", label: "Marketplace", icon: Store },
        { href: "/messages", label: "Messages", icon: MessageCircle, badge: unread.messages },
        { href: "/notifications", label: "Notifications", icon: Bell, badge: unread.notifications },
        { href: `/${me.username}`, label: "Profile", icon: UserRound },
        { href: "/settings", label: "Settings", icon: Settings },
        ...(me.isStaff ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
      ]
    : [
        { href: "/", label: "Home", icon: House },
        { href: "/explore", label: "Explore", icon: Compass },
        { href: "/search", label: "Search", icon: Search },
        { href: "/market", label: "Marketplace", icon: Store },
      ];

  return (
    <nav className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col border-r border-border px-3 py-4 md:flex xl:w-64">
      <Link href="/" className="mb-6 flex items-center px-2" aria-label="OAACI home">
        <Logo withText={false} className="xl:hidden" />
        <Logo className="hidden xl:inline-flex" />
      </Link>
      <ul className="flex flex-1 flex-col gap-1">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                title={label}
                className={cn(
                  "relative flex items-center gap-4 rounded-full px-3 py-2.5 text-[15px] transition-colors hover:bg-surface-2",
                  active ? "font-semibold text-fg" : "text-fg/80",
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-6 w-6", active && "text-primary-text")} strokeWidth={active ? 2.4 : 1.8} />
                  {badge ? <Badge count={badge} className="absolute -top-1.5 -right-2 xl:hidden" /> : null}
                </span>
                <span className="hidden flex-1 xl:inline">{label}</span>
                {badge ? <Badge count={badge} className="hidden xl:flex" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {me ? (
        <div className="space-y-3">
          <button onClick={() => setOpen(true)} className="btn btn-primary btn-lg w-full px-0 xl:px-6" title="Create post">
            <Plus className="h-5 w-5" />
            <span className="hidden xl:inline">Create</span>
          </button>
          <div className="hidden justify-center xl:flex">
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 rounded-full p-2">
            <Avatar user={me} size="md" />
            <div className="hidden min-w-0 flex-1 xl:block">
              <p className="flex items-center gap-1 truncate text-sm font-semibold">
                <span className="truncate">{me.name}</span>
                {me.verified && <VerifiedBadge />}
              </p>
              <p className="truncate text-xs text-muted">@{me.username}</p>
            </div>
            <form action={logOut} className="hidden xl:block">
              <button className="icon-btn" title="Log out" aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden space-y-2 xl:block">
          <Link href="/signup" className="btn btn-primary w-full">
            Join OAACI
          </Link>
          <Link href="/login" className="btn btn-secondary w-full">
            Log in
          </Link>
          <div className="flex justify-center pt-2">
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  );
}

/** Top bar on phones. */
export function MobileTopBar() {
  const me = useMe();
  const { unread } = useRealtime();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-border bg-bg/90 px-3 backdrop-blur md:hidden">
      <Link href="/" className="mr-auto" aria-label="OAACI home">
        <Logo className="[&_img]:h-7 [&_img]:w-7 [&_span]:text-xl" />
      </Link>
      {me ? (
        <>
          <Link href="/search" className="icon-btn" aria-label="Search">
            <Search className="h-5 w-5" />
          </Link>
          <Link href="/notifications" className="icon-btn relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <Badge count={unread.notifications} className="absolute top-0.5 right-0" />
          </Link>
          <Link href="/messages" className="icon-btn relative" aria-label="Messages">
            <MessageCircle className="h-5 w-5" />
            <Badge count={unread.messages} className="absolute top-0.5 right-0" />
          </Link>
        </>
      ) : (
        <>
          <Link href="/login" className="btn btn-ghost btn-sm">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary btn-sm">
            Join
          </Link>
        </>
      )}
    </header>
  );
}

/** Bottom tab bar on phones. */
export function MobileTabBar() {
  const me = useMe();
  const { setOpen } = useCompose();
  const isActive = useActive();
  const pathname = usePathname();
  // Open chats take over the whole screen on phones.
  if (!me || pathname.startsWith("/messages/")) return null;

  const tab = (href: string, label: string, Icon: typeof House) => (
    <Link
      href={href}
      aria-label={label}
      className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]", isActive(href) ? "text-primary-text" : "text-muted")}
    >
      <Icon className="h-6 w-6" strokeWidth={isActive(href) ? 2.4 : 1.8} />
      {label}
    </Link>
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {tab("/", "Home", House)}
      {tab("/explore", "Explore", Compass)}
      <button onClick={() => setOpen(true)} className="flex flex-1 items-center justify-center" aria-label="Create post">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary">
          <Plus className="h-6 w-6" />
        </span>
      </button>
      {tab("/market", "Market", Store)}
      {tab(`/${me.username}`, "Profile", UserRound)}
    </nav>
  );
}
