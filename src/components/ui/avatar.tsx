import { imageUrl } from "@/lib/media-url";
import { cn } from "@/lib/cn";

const PALETTE = ["#c2410c", "#b45309", "#a16207", "#4d7c0f", "#047857", "#0e7490", "#1d4ed8", "#6d28d9", "#a21caf", "#be123c"];

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-3xl",
  "2xl": "h-32 w-32 text-4xl",
} as const;

const PIXELS = { xs: 48, sm: 64, md: 80, lg: 112, xl: 192, "2xl": 256 } as const;

export function Avatar({
  user,
  size = "md",
  className,
}: {
  user: { name: string; username?: string; avatarUrl: string | null };
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const base = cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", SIZES[size], className);

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl(user.avatarUrl, PIXELS[size], true)} alt="" className={cn(base, "bg-surface-2 object-cover")} loading="lazy" />
    );
  }
  return (
    <span className={cn(base, "font-semibold text-white")} style={{ background: colorFor(user.username ?? user.name) }} aria-hidden>
      {initials || "?"}
    </span>
  );
}
