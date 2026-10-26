// Parsing of hashtags, mentions and links. Safe to import on the client.

const HASHTAG = /(^|[^\p{L}\p{M}\p{N}_&#])#([\p{L}\p{M}\p{N}_]{1,50})/gu;
const MENTION = /(^|[^\p{L}\p{N}_@])@([a-zA-Z0-9_]{3,20})/gu;

export function extractHashtags(text: string): string[] {
  const tags = new Set<string>();
  for (const m of text.matchAll(HASHTAG)) {
    const tag = m[2].toLowerCase();
    if (!/^\d+$/.test(tag)) tags.add(tag);
  }
  return [...tags].slice(0, 15);
}

export function extractMentions(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(MENTION)) names.add(m[2].toLowerCase());
  return [...names].slice(0, 15);
}

export type TextToken =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string }
  | { type: "hashtag"; value: string; tag: string }
  | { type: "mention"; value: string; username: string };

const TOKEN =
  /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])|(?<=^|[^\p{L}\p{M}\p{N}_&#])#([\p{L}\p{M}\p{N}_]{1,50})|(?<=^|[^\p{L}\p{N}_@])@([a-zA-Z0-9_]{3,20})/gu;

/** Splits text into plain text, links, hashtags and mentions for safe rendering. */
export function tokenize(text: string): TextToken[] {
  const out: TextToken[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ type: "text", value: text.slice(last, start) });
    if (m[1]) out.push({ type: "link", value: m[1], href: m[1] });
    else if (m[2] && /^\d+$/.test(m[2])) out.push({ type: "text", value: m[0] });
    else if (m[2]) out.push({ type: "hashtag", value: `#${m[2]}`, tag: m[2].toLowerCase() });
    else if (m[3]) out.push({ type: "mention", value: `@${m[3]}`, username: m[3].toLowerCase() });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}
