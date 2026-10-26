import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";
import { ListingForm } from "@/components/market/listing-form";

export const metadata: Metadata = { title: "List an artwork" };

export default async function NewListingPage() {
  const me = await requireUser();
  return (
    <Columns>
      <PageHeader title="List an artwork" back="/market" />
      {me.contactVerified ? (
        <ListingForm />
      ) : (
        <p className="p-4 text-muted">Please confirm your email address before listing items for sale.</p>
      )}
    </Columns>
  );
}
