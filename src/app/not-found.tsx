import Link from "next/link";
import { Logo } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo />
      <p className="font-display text-6xl font-semibold text-primary-text">404</p>
      <h1 className="font-display text-2xl font-semibold">This page doesn&apos;t exist</h1>
      <p className="max-w-sm text-muted">The link may be broken, or the post, profile or listing may have been removed.</p>
      <Link href="/" className="btn btn-primary">
        Back to OAACI
      </Link>
    </div>
  );
}
