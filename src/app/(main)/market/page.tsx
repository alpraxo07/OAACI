import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Store } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getListings } from "@/lib/listings";
import { LISTING_CATEGORIES } from "@/lib/constants";
import { Columns } from "@/components/shell/right-rail";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ListingGrid } from "@/components/market/listing-grid";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Marketplace" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function MarketPage({ searchParams }: PageProps<"/market">) {
  const params = await searchParams;
  const me = await getCurrentUser();
  const category = LISTING_CATEGORIES.find((c) => c === str(params.category)) ?? null;
  const q = str(params.q)?.trim().slice(0, 100) || null;
  const min = Number(str(params.min)) || null;
  const max = Number(str(params.max)) || null;
  const sort = (["newest", "price_asc", "price_desc"] as const).find((s) => s === str(params.sort)) ?? "newest";
  const page = Math.max(Number(str(params.page)) || 1, 1);
  const take = 24;
  const listings = await getListings({ viewerId: me?.id, category, q, minPrice: min, maxPrice: max, sort, cursor: String((page - 1) * take), take });

  const href = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const base = { category, q, min: min ? String(min) : null, max: max ? String(max) : null, sort: sort === "newest" ? null : sort, ...patch };
    for (const [k, v] of Object.entries(base)) if (v) next.set(k, v);
    const s = next.toString();
    return `/market${s ? `?${s}` : ""}`;
  };

  return (
    <Columns>
      <PageHeader title="Marketplace">
        {me && (
          <Link href="/market/new" className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" /> Sell
          </Link>
        )}
      </PageHeader>

      <div className="border-b border-border p-4">
        <p className="text-sm text-muted">
          Original artworks and handmade crafts, sold directly by the artists. Message a seller to ask questions and arrange payment
          and delivery.
        </p>
        <form action="/market" className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          {category && <input type="hidden" name="category" value={category} />}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={q ?? ""} className="input pl-10" placeholder="Search listings" aria-label="Search listings" />
          </div>
          <input name="min" type="number" min={0} defaultValue={min ?? ""} className="input sm:w-28" placeholder="Min ₹" aria-label="Minimum price" />
          <input name="max" type="number" min={0} defaultValue={max ?? ""} className="input sm:w-28" placeholder="Max ₹" aria-label="Maximum price" />
          <select name="sort" defaultValue={sort} className="input sm:w-auto" aria-label="Sort">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
          <button className="btn btn-secondary sm:hidden">Search</button>
        </form>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border p-3">
        <Link href={href({ category: null, page: null })} className={cn("chip shrink-0", !category && "border-primary bg-primary-soft text-primary-text")}>
          All
        </Link>
        {LISTING_CATEGORIES.map((c) => (
          <Link key={c} href={href({ category: c, page: null })} className={cn("chip shrink-0", category === c && "border-primary bg-primary-soft text-primary-text")}>
            {c}
          </Link>
        ))}
      </div>

      <div className="p-4">
        {listings.items.length ? (
          <ListingGrid listings={listings.items} />
        ) : (
          <EmptyState icon={<Store className="h-6 w-6" />} title="No listings found">
            {q || category || min || max ? "Try different filters." : "Be the first to list an original work."}
          </EmptyState>
        )}
        {(page > 1 || listings.nextCursor) && (
          <div className="mt-6 flex justify-center gap-2">
            {page > 1 && (
              <Link href={href({ page: String(page - 1) })} className="btn btn-secondary btn-sm">
                Previous
              </Link>
            )}
            {listings.nextCursor && (
              <Link href={href({ page: String(page + 1) })} className="btn btn-secondary btn-sm">
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </Columns>
  );
}
