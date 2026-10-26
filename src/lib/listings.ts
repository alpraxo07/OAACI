import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { getHiddenAuthorIds } from "./social";
import { mediaSelect, toMediaDTO, userMiniSelect } from "./posts";
import type { ListingDTO, Page } from "./types";

const listingInclude = {
  seller: { select: userMiniSelect },
  images: { include: { media: { select: mediaSelect } }, orderBy: { position: "asc" } },
} satisfies Prisma.ListingInclude;

type ListingRow = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;

export function toListingDTO(l: ListingRow): ListingDTO {
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    priceInr: l.priceInr,
    category: l.category,
    medium: l.medium,
    dimensions: l.dimensions,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
    seller: l.seller,
    images: l.images.map((i) => toMediaDTO(i.media)!),
  };
}

export async function getListings(opts: {
  viewerId?: string | null;
  sellerId?: string;
  category?: string | null;
  q?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  includeSold?: boolean;
  sort?: "newest" | "price_asc" | "price_desc";
  cursor?: string | null;
  take?: number;
}): Promise<Page<ListingDTO>> {
  const take = opts.take ?? 24;
  const offset = Number(opts.cursor) || 0;
  const hidden = await getHiddenAuthorIds(opts.viewerId);
  const where: Prisma.ListingWhereInput = {
    status: opts.includeSold ? { in: ["ACTIVE", "SOLD"] } : "ACTIVE",
    seller: { bannedAt: null, deactivatedAt: null },
    ...(opts.sellerId ? { sellerId: opts.sellerId } : hidden.length ? { sellerId: { notIn: hidden } } : {}),
    ...(opts.category ? { category: opts.category } : {}),
    ...(opts.q
      ? {
          OR: [
            { title: { contains: opts.q, mode: "insensitive" } },
            { description: { contains: opts.q, mode: "insensitive" } },
            { medium: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(opts.minPrice || opts.maxPrice
      ? { priceInr: { ...(opts.minPrice ? { gte: opts.minPrice } : {}), ...(opts.maxPrice ? { lte: opts.maxPrice } : {}) } }
      : {}),
  };
  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    opts.sort === "price_asc"
      ? [{ priceInr: "asc" }, { createdAt: "desc" }]
      : opts.sort === "price_desc"
        ? [{ priceInr: "desc" }, { createdAt: "desc" }]
        : [{ status: "asc" }, { createdAt: "desc" }];
  const rows = await db.listing.findMany({ where, include: listingInclude, orderBy, skip: offset, take: take + 1 });
  return {
    items: rows.slice(0, take).map(toListingDTO),
    nextCursor: rows.length > take ? String(offset + take) : null,
  };
}

export async function getListing(id: string): Promise<ListingDTO | null> {
  const row = await db.listing.findUnique({ where: { id }, include: listingInclude });
  return row ? toListingDTO(row) : null;
}
