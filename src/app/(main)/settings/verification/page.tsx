import type { Metadata } from "next";
import { BadgeCheck, Clock, CircleX } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";
import { SettingsNav } from "@/components/settings/settings-nav";
import { VerificationForm } from "@/components/settings/verification-form";

export const metadata: Metadata = { title: "Verified artist badge" };

export default async function VerificationPage() {
  const me = await requireUser();
  const last = await db.verificationRequest.findFirst({ where: { userId: me.id }, orderBy: { createdAt: "desc" } });

  return (
    <Columns aside={<SettingsNav variant="rail" />}>
      <PageHeader title="Verified artist badge" back="/settings" />
      <div className="space-y-4 p-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-8 w-8 fill-verified text-surface" />
            <h2 className="font-display text-xl font-semibold">What the badge means</h2>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>You are a real, practising artist or craftsperson, and the account is really you.</li>
            <li>The work you post and sell is your own original work.</li>
            <li>Your profile is complete: photo, headline, bio and some posts or portfolio entries.</li>
          </ul>
          <p className="mt-3 text-sm text-muted">
            Our team reviews every request by hand. Links to exhibitions, press, a website or established social accounts help a lot.
          </p>
        </div>

        {me.verified ? (
          <div className="card flex items-center gap-3 p-5 text-success">
            <BadgeCheck className="h-6 w-6" />
            <p className="font-semibold">You&apos;re a verified artist. Thank you for being part of OAACI!</p>
          </div>
        ) : last?.status === "PENDING" ? (
          <div className="card flex items-center gap-3 p-5">
            <Clock className="h-6 w-6 text-primary-text" />
            <div>
              <p className="font-semibold">Your request is being reviewed</p>
              <p className="text-sm text-muted">Submitted {last.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}. We&apos;ll notify you.</p>
            </div>
          </div>
        ) : (
          <>
            {last?.status === "REJECTED" && (
              <div className="card flex items-start gap-3 p-5">
                <CircleX className="mt-0.5 h-6 w-6 text-danger" />
                <div>
                  <p className="font-semibold">Your last request wasn&apos;t approved</p>
                  {last.reviewNote && <p className="text-sm text-muted">Reviewer&apos;s note: {last.reviewNote}</p>}
                  <p className="text-sm text-muted">You can apply again 30 days after the review.</p>
                </div>
              </div>
            )}
            <VerificationForm disabled={!me.contactVerified} />
          </>
        )}
      </div>
    </Columns>
  );
}
