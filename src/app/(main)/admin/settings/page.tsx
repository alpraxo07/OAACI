import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";

export const metadata: Metadata = { title: "Site settings · Admin" };

export default async function AdminSettingsPage() {
  const me = await requireStaffPage();
  if (me.role !== "ADMIN") redirect("/admin");
  const settings = await getSettings();
  const services = [
    { name: "Media uploads (Cloudinary)", on: Boolean(env.cloudinary), note: "Required in production." },
    { name: "Email (SMTP)", on: Boolean(env.smtp), note: "Verification, password reset, invites." },
    { name: "Google login", on: Boolean(env.google) },
    { name: "Phone OTP (Twilio)", on: Boolean(env.twilio), note: "SMS is a paid service." },
    { name: "Real-time chat (Pusher)", on: Boolean(env.pusher), note: "Without it, the app polls every few seconds." },
    { name: "Image moderation (Sightengine)", on: Boolean(env.sightengine) },
  ];
  return (
    <div className="space-y-6">
      <SiteSettingsForm
        initial={{
          inviteOnly: settings.inviteOnly,
          userInviteQuota: String(settings.userInviteQuota),
          blockedWords: settings.blockedWords.join(", "),
          announcement: settings.announcement,
        }}
      />
      <section className="card p-4">
        <h2 className="section-title">Connected services</h2>
        <p className="text-sm text-muted">Set these with environment variables on your host (see README).</p>
        <ul className="mt-3 divide-y divide-border">
          <li className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>
              Site address
              <span className="block text-xs text-muted">
                {env.appUrlSource === "APP_URL"
                  ? "From APP_URL. Email and Google login links use this."
                  : env.appUrlSource === "vercel"
                    ? "Detected from Vercel. Set APP_URL to override."
                    : "APP_URL is not set, so email links point to localhost."}
              </span>
            </span>
            <span className={`min-w-0 break-all text-right ${env.appUrlSource === "default" ? "text-muted" : "font-semibold text-success"}`}>
              {env.appUrl}
            </span>
          </li>
          {services.map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                {s.name}
                {s.note && <span className="block text-xs text-muted">{s.note}</span>}
              </span>
              <span className={s.on ? "font-semibold text-success" : "text-muted"}>{s.on ? "Connected" : "Not set"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
