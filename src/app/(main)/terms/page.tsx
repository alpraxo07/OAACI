import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <ProsePage title="Terms of service" updated="October 2026">
      <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
        This is a starting template. Have it reviewed by a lawyer familiar with Indian law (including the Information Technology
        Act, 2000 and the IT Rules, 2021) before launching publicly.
      </p>
      <h2>1. Who can use OAACI</h2>
      <p>You must be at least 18 years old and able to form a binding contract. One person may hold one personal account.</p>
      <h2>2. Your content</h2>
      <p>
        You keep ownership of everything you post. By posting, you give OAACI a non-exclusive, royalty-free licence to host,
        display and distribute your content on the service so others can see it. You can delete your content at any time.
      </p>
      <p>You promise that you own, or have permission to share, everything you post or list for sale.</p>
      <h2>3. Acceptable use</h2>
      <p>
        You agree to follow the <Link href="/guidelines">Community Guidelines</Link>. We may remove content or suspend accounts that
        break them.
      </p>
      <h2>4. Marketplace</h2>
      <p>
        OAACI lets artists list items and lets buyers contact them. Sales happen directly between buyer and seller; OAACI is not a
        party to the sale and does not handle payments or delivery. Use good judgement and report suspicious behaviour.
      </p>
      <h2>5. Sponsored content</h2>
      <p>Some posts are paid placements and are always labelled “Sponsored”.</p>
      <h2>6. Ending your account</h2>
      <p>You can deactivate or permanently delete your account from Settings. We may suspend accounts that violate these terms.</p>
      <h2>7. Disclaimers</h2>
      <p>OAACI is provided “as is”. We do our best to keep it available and secure but cannot guarantee it will always be error-free.</p>
      <h2>8. Grievances</h2>
      <p>For complaints about content or these terms, contact the OAACI grievance officer at the email published on this page.</p>
    </ProsePage>
  );
}
