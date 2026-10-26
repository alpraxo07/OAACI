import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ProsePage title="About OAACI">
      <p className="text-lg">
        <strong>OAACI — Original Art and Craft Introduction</strong> is a social network and portfolio platform for artists and
        craftspeople in India.
      </p>
      <p>
        Painters, potters, weavers, sculptors, photographers, musicians and makers of every kind use OAACI to share their work, build a
        professional portfolio, connect with each other and sell original pieces directly to people who value them.
      </p>
      <h2>What you can do</h2>
      <ul>
        <li>Post photos, videos and songs, and collect stars, comments and reposts.</li>
        <li>Build a LinkedIn-style artist CV with exhibitions, experience, training and awards.</li>
        <li>Follow artists, discover new work through hashtags, trends and the artist directory.</li>
        <li>Message other members one-to-one.</li>
        <li>List artworks and crafts for sale in the marketplace.</li>
        <li>Earn the verified artist badge.</li>
      </ul>
      <h2>Invite-only, for now</h2>
      <p>
        We&apos;re growing slowly to keep the community genuine and kind. Members can invite fellow artists, or you can{" "}
        <Link href="/waitlist">request an invite</Link>. OAACI is for adults aged 18 and over.
      </p>
      <p>
        Please read our <Link href="/guidelines">Community Guidelines</Link>, <Link href="/terms">Terms</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </ProsePage>
  );
}
