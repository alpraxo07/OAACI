import Link from "next/link";
import { Logo } from "@/components/ui/misc";
import { APP_FULL_NAME } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#1c1310] lg:block">
        <ArtBackdrop />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-[#fbf4ea]">
          <Link href="/" className="inline-flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-9 w-9" />
            <span className="font-display text-2xl font-bold">OAACI</span>
          </Link>
          <div>
            <p className="font-display text-5xl leading-tight font-semibold">
              Every original piece
              <br />
              deserves an introduction.
            </p>
            <p className="mt-5 max-w-md text-lg text-[#e9dccb]">
              {APP_FULL_NAME} — a home for India&apos;s painters, potters, weavers, musicians and makers to show their
              work, build a portfolio and find buyers.
            </p>
          </div>
          <p className="text-sm text-[#cdbba5]">Invite-only community · 18+ · Made in India</p>
        </div>
      </aside>
      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <Link href="/" className="mb-8 lg:hidden">
          <Logo />
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

/** Abstract "paint strokes" artwork for the auth pages. */
function ArtBackdrop() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="g1" cx="0.75" cy="0.2" r="0.6">
          <stop offset="0" stopColor="#c2410c" stopOpacity="0.9" />
          <stop offset="1" stopColor="#c2410c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="g2" cx="0.15" cy="0.85" r="0.55">
          <stop offset="0" stopColor="#f59e0b" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="g3" cx="0.6" cy="0.7" r="0.4">
          <stop offset="0" stopColor="#0e7490" stopOpacity="0.45" />
          <stop offset="1" stopColor="#0e7490" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="1000" fill="url(#g1)" />
      <rect width="800" height="1000" fill="url(#g2)" />
      <rect width="800" height="1000" fill="url(#g3)" />
      <g fill="none" stroke="#fbf4ea" strokeLinecap="round" opacity="0.12">
        <path d="M-50 300 C 150 200, 300 420, 520 300 S 820 180, 900 260" strokeWidth="36" />
        <path d="M-80 560 C 120 480, 260 680, 480 560 S 760 440, 880 520" strokeWidth="18" />
        <path d="M-40 780 C 200 700, 340 900, 560 780 S 840 660, 920 740" strokeWidth="10" />
      </g>
      <g fill="#fbf4ea" opacity="0.18">
        <circle cx="640" cy="160" r="6" />
        <circle cx="140" cy="420" r="4" />
        <circle cx="700" cy="640" r="5" />
        <circle cx="260" cy="880" r="3" />
      </g>
    </svg>
  );
}
