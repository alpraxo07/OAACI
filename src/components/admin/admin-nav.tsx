"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/ads", label: "Ads", adminOnly: true },
  { href: "/admin/settings", label: "Site settings", adminOnly: true },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar flex overflow-x-auto px-2" aria-label="Admin sections">
      {LINKS.filter((l) => isAdmin || !l.adminOnly).map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn("relative px-3 py-2.5 text-sm font-medium whitespace-nowrap hover:text-fg", active ? "text-fg" : "text-muted")}
          >
            {l.label}
            {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}
