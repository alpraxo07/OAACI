// Shared constants. Safe to import from both server and client code.

export const APP_NAME = "OAACI";
export const APP_FULL_NAME = "Original Art and Craft Introduction";
export const APP_TAGLINE = "Where Indian artists show their work, connect and sell.";

export const MIN_AGE = 18;
export const POST_MAX_LENGTH = 280;
export const COMMENT_MAX_LENGTH = 500;
export const MESSAGE_MAX_LENGTH = 1000;
export const BIO_MAX_LENGTH = 500;
export const HEADLINE_MAX_LENGTH = 100;
export const PAGE_SIZE = 20;

const MB = 1024 * 1024;

export type MediaKindName = "IMAGE" | "VIDEO" | "AUDIO";

export const MEDIA_LIMITS: Record<
  MediaKindName,
  { maxBytes: number; maxDuration?: number; formats: string[]; accept: string; label: string }
> = {
  IMAGE: {
    maxBytes: 10 * MB,
    formats: ["jpg", "jpeg", "png", "webp"],
    accept: "image/jpeg,image/png,image/webp",
    label: "JPG, PNG or WebP up to 10 MB",
  },
  VIDEO: {
    maxBytes: 100 * MB,
    maxDuration: 180,
    formats: ["mp4", "mov", "webm"],
    accept: "video/mp4,video/quicktime,video/webm",
    label: "MP4, MOV or WebM up to 100 MB and 3 minutes",
  },
  AUDIO: {
    maxBytes: 25 * MB,
    maxDuration: 600,
    formats: ["mp3", "m4a", "mp4", "wav", "aac", "ogg", "flac"],
    accept: "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,audio/aac,audio/ogg,audio/flac",
    label: "MP3, M4A, WAV, AAC, OGG or FLAC up to 25 MB and 10 minutes",
  },
};

export const ART_DISCIPLINES = [
  "Painting",
  "Drawing & Illustration",
  "Sculpture",
  "Pottery & Ceramics",
  "Photography",
  "Digital Art",
  "Printmaking",
  "Textile & Embroidery",
  "Handloom & Weaving",
  "Woodcraft",
  "Metalcraft",
  "Jewellery",
  "Folk & Tribal Art",
  "Madhubani",
  "Warli",
  "Pattachitra",
  "Kalamkari",
  "Calligraphy",
  "Music",
  "Singing",
  "Dance",
  "Theatre",
  "Film & Animation",
  "Street Art & Murals",
  "Paper Craft",
  "Mixed Media",
] as const;

export const LISTING_CATEGORIES = [
  "Painting",
  "Drawing",
  "Sculpture",
  "Pottery & Ceramics",
  "Photography Print",
  "Digital Art",
  "Textile & Embroidery",
  "Handloom",
  "Jewellery",
  "Woodcraft",
  "Metalcraft",
  "Home Decor",
  "Folk & Tribal Art",
  "Commission",
  "Other",
] as const;

export const REPORT_REASONS = [
  { value: "SPAM", label: "Spam or misleading" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "HATE", label: "Hate speech" },
  { value: "NUDITY", label: "Sexual content" },
  { value: "VIOLENCE", label: "Violence or threats" },
  { value: "COPYRIGHT", label: "Stolen artwork / copyright" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "SCAM", label: "Scam or fraud" },
  { value: "UNDERAGE", label: "User may be under 18" },
  { value: "OTHER", label: "Something else" },
] as const;

export const PROFILE_ENTRY_KINDS = [
  { value: "EXHIBITION", label: "Exhibitions & shows" },
  { value: "EXPERIENCE", label: "Experience" },
  { value: "EDUCATION", label: "Education & training" },
  { value: "AWARD", label: "Awards & recognition" },
] as const;

/** Usernames that would clash with app routes or impersonate the platform. */
export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "api", "about", "help", "support", "settings", "login", "logout",
  "signup", "register", "explore", "search", "tag", "tags", "notifications", "messages", "market",
  "marketplace", "p", "post", "posts", "u", "user", "users", "terms", "privacy", "guidelines",
  "forgot-password", "reset-password", "verify-email", "waitlist", "invite", "invites", "oaaci",
  "official", "moderator", "mod", "staff", "team", "root", "system", "null", "undefined", "home",
  "feed", "compose", "new", "edit", "uploads", "static", "public", "_next", "favicon", "robots",
  "sitemap", "security", "contact", "careers", "blog", "press", "shop", "store", "ads", "verified",
]);
