import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Community guidelines" };

export default function GuidelinesPage() {
  return (
    <ProsePage title="Community guidelines" updated="October 2026">
      <p>OAACI exists to celebrate original art and craft. These guidelines keep it a place where artists feel safe sharing their work.</p>
      <h2>1. Share only your own work</h2>
      <ul>
        <li>Post and sell only work you created, or clearly credit collaborators.</li>
        <li>Don&apos;t pass off copies, prints or mass-produced items as handmade originals.</li>
        <li>If someone has stolen your work, report it with the “Stolen artwork / copyright” option.</li>
      </ul>
      <h2>2. Be kind</h2>
      <ul>
        <li>Critique the work, never the person. No harassment, bullying, threats or hate speech.</li>
        <li>No discrimination based on religion, caste, gender, sexuality, region, language or disability.</li>
        <li>Abusive language is automatically masked, and repeated abuse leads to a ban.</li>
      </ul>
      <h2>3. Nudity and mature themes</h2>
      <ul>
        <li>Artistic nudity (figure studies, classical sculpture and so on) is allowed but must be marked as sensitive content.</li>
        <li>Sexually explicit or pornographic content is not allowed. Our filters may hold such images for review.</li>
        <li>Nothing that sexualises minors, ever. Such content is removed and reported to authorities.</li>
      </ul>
      <h2>4. Be honest in the marketplace</h2>
      <ul>
        <li>Describe pieces accurately, including size, material and condition.</li>
        <li>Agree payment and delivery clearly with buyers, and honour your agreements.</li>
        <li>No scams, fake listings or requests to pay outside agreed terms.</li>
      </ul>
      <h2>5. Be yourself</h2>
      <ul>
        <li>Don&apos;t impersonate other people, artists or organisations.</li>
        <li>You must be at least 18 years old.</li>
        <li>No spam, fake engagement or misleading links.</li>
      </ul>
      <h2>Enforcement</h2>
      <p>
        Moderators review reports and may remove content, remove the verified badge, or suspend accounts. Serious or repeated
        violations lead to a permanent ban.
      </p>
    </ProsePage>
  );
}
