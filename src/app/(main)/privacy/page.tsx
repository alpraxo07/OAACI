import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy policy" updated="October 2026">
      <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
        This is a starting template. Review it with a lawyer for compliance with India&apos;s Digital Personal Data Protection Act, 2023
        before launching publicly.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, username, email and/or phone number, and a password hash (never the password itself).</li>
        <li>Your date of birth, used only to confirm you are 18 or older. It is never shown publicly.</li>
        <li>Content you create: posts, photos, videos, songs, comments, messages, listings and portfolio entries.</li>
        <li>Basic usage data: which posts were viewed (to show view counts) and login sessions.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To run OAACI: show your profile and posts, deliver messages and notifications.</li>
        <li>To keep the community safe: moderation, spam prevention and enforcing our guidelines.</li>
        <li>To send account emails such as verification and password resets. We don&apos;t send marketing emails without consent.</li>
      </ul>
      <h2>Who can see what</h2>
      <ul>
        <li>Your profile, posts and listings are public.</li>
        <li>Direct messages are visible only to you and the other person, and to moderators if a message is reported.</li>
        <li>Your email, phone number and date of birth are private.</li>
      </ul>
      <h2>Service providers</h2>
      <p>
        We use trusted providers to host the site and database, store media (Cloudinary), send email and SMS, deliver real-time
        updates and check images for explicit content. They process data only on our behalf.
      </p>
      <h2>Your choices</h2>
      <ul>
        <li>Edit your profile or delete posts at any time.</li>
        <li>Deactivate your account, or permanently delete it and your content, from Settings.</li>
        <li>Block or mute anyone, and choose who can message you.</li>
      </ul>
      <h2>Contact</h2>
      <p>Questions about your data? Contact the OAACI team at the email published on this page.</p>
    </ProsePage>
  );
}
