import Link from "next/link";
import { ImageOff } from "lucide-react";
import { imageUrl } from "@/lib/media-url";
import { Avatar } from "@/components/ui/avatar";
import { VerifiedBadge, formatInr } from "@/components/ui/misc";
import type { ListingDTO } from "@/lib/types";

export function ListingCard({ listing }: { listing: ListingDTO }) {
  const cover = listing.images[0];
  return (
    <Link href={`/market/${listing.id}`} className="group card block overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/5] bg-surface-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl(cover.url, 600, false)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <ImageOff className="absolute inset-0 m-auto h-8 w-8 text-muted" />
        )}
        {listing.status === "SOLD" && (
          <span className="absolute top-2 left-2 rounded-full bg-fg px-2.5 py-1 text-xs font-bold tracking-wide text-bg">SOLD</span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-semibold">{listing.title}</p>
        <p className="font-display text-lg font-semibold text-primary-text">{formatInr(listing.priceInr)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <Avatar user={listing.seller} size="xs" />
          <span className="truncate">{listing.seller.name}</span>
          {listing.seller.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
        </p>
      </div>
    </Link>
  );
}

export function ListingGrid({ listings }: { listings: ListingDTO[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}
