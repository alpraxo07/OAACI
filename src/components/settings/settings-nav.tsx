"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Briefcase, ChevronRight, KeyRound, Shield, Ticket, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

export const SETTINGS_SECTIONS = [
  { href: "/settings/profile", label: "Edit profile", description: "Photo, cover, headline, bio and disciplines", icon: UserRound },
  { href: "/settings/portfolio", label: "Portfolio", description: "Exhibitions, experience, education and awards", icon: Briefcase },
  { href: "/settings/account", label: "Account", description: "Username, email, password, deactivate or delete", icon: KeyRound },
  { href: "/settings/privacy", label: "Privacy & safety", description: "Who can message you, blocked and muted accounts", icon: Shield },
  { href: "/settings/invites", label: "Invite artists", description: "Share invite codes with fellow artists", icon: Ticket },
  { href: "/settings/verification", label: "Verified artist badge", description: "Apply for the ✓ badge", icon: BadgeCheck },
] as const;

export function SettingsNav({ variant }: { variant: "rail" | "list" }) {
  const pathname = usePathname();
  if (variant === "list") {
    return (
      <ul>
        {SETTINGS_SECTIONS.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-4 border-b border-border px-4 py-4 hover:bg-surface-2">
              <Icon className="h-5 w-5 text-primary-text" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{label}</p>
                <p className="truncate text-sm text-muted">{description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 px-5 py-4 lg:block">
      <p className="section-title mb-3 px-3">Settings</p>
      <ul className="space-y-1">
        {SETTINGS_SECTIONS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2",
                pathname === href ? "bg-surface-2 font-semibold" : "text-fg/80",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
