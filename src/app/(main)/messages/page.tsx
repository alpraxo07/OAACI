import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <div className="hidden min-h-dvh flex-1 flex-col items-center justify-center p-8 text-center md:flex">
      <div className="rounded-full bg-surface-2 p-5 text-muted">
        <MessageCircle className="h-8 w-8" />
      </div>
      <p className="mt-4 font-display text-2xl font-semibold">Your messages</p>
      <p className="mt-1 max-w-sm text-muted">
        Choose a conversation, or open an artist&apos;s profile and tap Message to start one.
      </p>
    </div>
  );
}
