import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getListing } from "@/lib/listings";
import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";
import { ListingForm } from "@/components/market/listing-form";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: PageProps<"/market/[id]/edit">) {
  const { id } = await params;
  const me = await requireUser();
  const listing = await getListing(id);
  if (!listing || listing.seller.id !== me.id || listing.status === "REMOVED") notFound();
  return (
    <Columns>
      <PageHeader title="Edit listing" back={`/market/${id}`} />
      <ListingForm listing={listing} />
    </Columns>
  );
}
