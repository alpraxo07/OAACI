// Bad-word filter. Safe to import on the client (for instant feedback) and the server.
// Admins can add more words from the admin panel (Settings → Blocked words).

const BASE_WORDS = [
  // English
  "fuck", "motherfucker", "shit", "bullshit", "bitch", "bastard", "asshole", "dickhead", "cunt",
  "pussy", "whore", "slut", "wanker", "twat", "douchebag", "retard", "faggot", "fag",
  "nigger", "nigga", "chink", "kike", "tranny", "porn", "porno", "nude pics",
  "send nudes", "jerk off", "blowjob", "handjob", "dildo", "jizz",
  // Hindi / Urdu (romanised)
  "chutiya", "chutiye", "chootiya", "madarchod", "maderchod", "behenchod", "bhenchod", "bhanchod",
  "bhosdike", "bhosdi", "bhosda", "gandu", "gaandu", "randi", "harami", "haramzada", "haramkhor",
  "kutiya", "lavda", "lauda", "lodu", "loda", "lund", "jhaatu", "jhant",
  "chodu", "chudai", "bsdk", "mkc", "bkl",
  // Bengali (romanised)
  "bokachoda", "khanki", "khankir", "chudir", "shuorer bachcha", "haramjada",
  // Devanagari / Bengali script
  "चूतिया", "चुतिया", "मादरचोद", "बहनचोद", "भोसड़ी", "भोसडी", "गांडू", "रंडी", "हरामी", "लौड़ा", "लंड",
  "খানকি", "চুদ", "বোকাচোদা", "মাগি", "হারামি",
];

const LEET: Record<string, string> = {
  a: "[a@4]",
  e: "[e3]",
  i: "[i1!|]",
  o: "[o0]",
  s: "[s$5]",
  t: "[t7]",
  l: "[l1|]",
  b: "[b8]",
  g: "[g9]",
  u: "[uv]",
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function wordPattern(word: string): string {
  return [...word.toLowerCase()]
    .map((ch) => (ch === " " ? "[\\s_.-]*" : `${LEET[ch] ?? escape(ch)}+`))
    .join("");
}

const regexCache = new Map<string, RegExp>();

function buildRegex(extra: readonly string[]): RegExp {
  const key = extra.join("\u0000");
  const cached = regexCache.get(key);
  if (cached) return cached;
  const words = [...new Set([...BASE_WORDS, ...extra.map((w) => w.trim().toLowerCase()).filter(Boolean)])];
  // Longest first so "motherfucker" wins over "fuck".
  words.sort((a, b) => b.length - a.length);
  const body = words.map(wordPattern).join("|");
  const re = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(?:${body})(?:ing|in|er|ers|ed|s|es|y)?(?![\\p{L}\\p{M}\\p{N}])`, "giu");
  if (regexCache.size > 20) regexCache.clear();
  regexCache.set(key, re);
  return re;
}

export function containsProfanity(text: string, extra: readonly string[] = []): boolean {
  const re = buildRegex(extra);
  re.lastIndex = 0;
  return re.test(text);
}

/** Replaces bad words with their first letter followed by asterisks. */
export function maskProfanity(text: string, extra: readonly string[] = []): string {
  const re = buildRegex(extra);
  return text.replace(re, (match) => {
    const chars = [...match];
    return chars[0] + "*".repeat(Math.max(chars.length - 1, 1));
  });
}
