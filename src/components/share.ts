"use client";

import { toast } from "@/components/ui/toaster";

/** Opens the phone's share sheet, or copies the link on desktop. */
export async function shareLink(path: string, title: string) {
  const url = new URL(path, window.location.origin).toString();
  if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ title, url });
      return;
    } catch {
      // Cancelled — fall through to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  } catch {
    toast.error("Couldn't copy the link");
  }
}
