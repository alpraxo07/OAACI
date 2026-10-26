import Link from "next/link";
import { BadgeCheck, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { UserMini } from "@/lib/types";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span title="Verified artist" role="img" aria-label="Verified artist" className="inline-flex shrink-0">
      <BadgeCheck className={cn("h-4 w-4 fill-verified text-surface", className)} aria-hidden />
    </span>
  );
}

/** Name with verified badge, linking to the profile. */
export function UserName({ user, showUsername = true, className }: { user: UserMini; showUsername?: boolean; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1", className)}>
      <Link href={`/${user.username}`} className="truncate font-semibold hover:underline">
        {user.name}
      </Link>
      {user.verified && <VerifiedBadge />}
      {showUsername && <span className="truncate text-sm text-muted">@{user.username}</span>}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("h-4 w-4 animate-spin", className)} aria-label="Loading" />;
}

export function EmptyState({
  icon,
  title,
  children,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {icon && <div className="mb-3 rounded-full bg-surface-2 p-4 text-muted">{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" className="h-8 w-8" width={32} height={32} />
      {withText && <span className="font-display text-2xl font-bold tracking-tight text-primary-text">OAACI</span>}
    </span>
  );
}

export function PageHeader({ title, children, back }: { title: React.ReactNode; children?: React.ReactNode; back?: string }) {
  return (
    <div className="sticky top-14 z-20 flex min-h-14 items-center gap-3 border-b border-border bg-bg/85 px-4 py-2 backdrop-blur md:top-0">
      {back && (
        <Link href={back} className="icon-btn -ml-2" aria-label="Back">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
      )}
      <h1 className="min-w-0 flex-1 truncate font-display text-xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-xl bg-success-soft px-3.5 py-2.5 text-sm text-success">
      {message}
    </p>
  );
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  if (n < 10_000_000) return `${(n / 100_000).toFixed(1).replace(/\.0$/, "")}L`;
  return `${(n / 10_000_000).toFixed(1).replace(/\.0$/, "")}Cr`;
}

export const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
