import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getListing, getListings } from "@/lib/listings";
import { getHiddenAuthorIds } from "@/lib/social";
import { imageUrl } from "@/lib/media-url";
import { Columns } from "@/components/shell/right-rail";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader, VerifiedBadge, formatInr } from "@/components/ui/misc";
import { TimeAgo } from "@/components/ui/time-ago";
import { FollowButton } from "@/components/follow-button";
import { ListingGallery } from "@/components/market/listing-gallery";
import { ListingActions } from "@/components/market/listing-actions";
import { ListingGrid } from "@/components/market/listing-grid";

export async function generateMetadata({ params }: PageProps<"/market/[id]">): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing || listing.status === "REMOVED") return { title: "Listing not found" };
  return {
    title: `${listing.title} — ${formatInr(listing.priceInr)}`,
    description: listing.description.slice(0, 160),
    openGraph: { images: listing.images[0] ? [imageUrl(listing.images[0].url, 1200)] : undefined },
  };
}

export default async function ListingPage({ params }: PageProps<"/market/[id]">) {
  const { id } = await params;
  const me = await getCurrentUser();
  const listing = await getListing(id);
  if (!listing) notFound();
  const isMine = me?.id === listing.seller.id;
  const hidden = await getHiddenAuthorIds(me?.id);
  if ((listing.status === "REMOVED" || listing.status === "ARCHIVED") && !isMine && !me?.isStaff) notFound();
  if (hidden.includes(listing.seller.id)) notFound();

  const [seller, following, more] = await Promise.all([
    db.user.findUnique({ where: { id: listing.seller.id }, select: { headline: true, bannedAt: true, deactivatedAt: true } }),
    me ? db.follow.count({ where: { followerId: me.id, followingId: listing.seller.id } }) : 0,
    getListings({ sellerId: listing.seller.id, take: 7 }),
  ]);
  if (!seller || seller.bannedAt || seller.deactivatedAt) notFound();
  const others = more.items.filter((l) => l.id !== listing.id).slice(0, 6);

  return (
    <Columns>
      <PageHeader title="Listing" back="/market" />
      <div className="p-4">
        <ListingGallery images={listing.images} sold={listing.status === "SOLD"} />
        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary-text">{listing.category}</p>
            <h1 className="mt-1 font-display text-2xl font-semibold">{listing.title}</h1>
            <p className="mt-1 font-display text-3xl font-semibold">{formatInr(listing.priceInr)}</p>
          </div>
        </div>

        {listing.status !== "ACTIVE" && (
          <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">
            {listing.status === "SOLD"
              ? "This piece has been sold."
              : listing.status === "ARCHIVED"
                ? "This listing is hidden from the marketplace."
                : "This listing was removed by a moderator."}
          </p>
        )}

        <ListingActions listing={{ id: listing.id, title: listing.title, status: listing.status, sellerName: listing.seller.name }} isMine={isMine} />

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          {listing.medium && (
            <div className="card p-3">
              <dt className="text-muted">Medium</dt>
              <dd className="font-medium">{listing.medium}</dd>
            </div>
          )}
          {listing.dimensions && (
            <div className="card p-3">
              <dt className="text-muted">Size</dt>
              <dd className="font-medium">{listing.dimensions}</dd>
            </div>
          )}
        </dl>

        <h2 className="section-title mt-6">About this piece</h2>
        <p className="mt-2 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
        <p className="mt-3 text-xs text-muted">
          Listed <TimeAgo date={listing.createdAt} />
        </p>

        <div className="card mt-6 flex items-center gap-3 p-4">
          <Link href={`/${listing.seller.username}`}>
            <Avatar user={listing.seller} size="lg" />
          </Link>
          <Link href={`/${listing.seller.username}`} className="min-w-0 flex-1">
            <p className="flex items-center gap-1 font-semibold">
              <span className="truncate">{listing.seller.name}</span>
              {listing.seller.verified && <VerifiedBadge />}
            </p>
            <p className="truncate text-sm text-muted">{seller.headline || `@${listing.seller.username}`}</p>
          </Link>
          <FollowButton userId={listing.seller.id} initialFollowing={following > 0} size="sm" />
        </div>

        {others.length > 0 && (
          <section className="mt-8">
            <h2 className="section-title mb-3">More from {listing.seller.name}</h2>
            <ListingGrid listings={others} />
          </section>
        )}
      </div>
    </Columns>
  );
}
