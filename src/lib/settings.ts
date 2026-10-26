import "server-only";
import { cache } from "react";
import { db } from "./db";
import { maskProfanity } from "./profanity";

export type SiteSettings = {
  /** Sign-up needs an invite code. Turn off to open OAACI to everyone. */
  inviteOnly: boolean;
  /** How many single-use invite codes every member can create. */
  userInviteQuota: number;
  /** Extra words to filter, on top of the built-in list. */
  blockedWords: string[];
  /** Optional banner shown at the top of every page. */
  announcement: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  inviteOnly: true,
  userInviteQuota: 5,
  blockedWords: [],
  announcement: "",
};

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await db.siteSetting.findMany();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULT_SETTINGS, ...stored } as SiteSettings;
});

export async function saveSettings(patch: Partial<SiteSettings>): Promise<void> {
  await db.$transaction(
    Object.entries(patch).map(([key, value]) =>
      db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } }),
    ),
  );
}

/** Masks bad words using the built-in list plus the admin-defined list. */
export async function cleanText(text: string): Promise<string> {
  const { blockedWords } = await getSettings();
  return maskProfanity(text, blockedWords);
}
