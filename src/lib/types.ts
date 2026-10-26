// Plain data shapes passed from the server to client components.

export type UserMini = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  headline?: string | null;
};

export type MediaDTO = {
  id: string;
  kind: "IMAGE" | "VIDEO" | "AUDIO";
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
};

export type PostDTO = {
  id: string;
  text: string;
  createdAt: string;
  editedAt: string | null;
  sensitive: boolean;
  status: "PUBLISHED" | "HIDDEN" | "REMOVED";
  author: UserMini;
  media: MediaDTO | null;
  cover: MediaDTO | null;
  trackTitle: string | null;
  starCount: number;
  commentCount: number;
  repostCount: number;
  viewCount: number;
  starred: boolean;
  reposted: boolean;
};

export type AdDTO = {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  advertiser: string;
  linkUrl: string;
};

export type FeedItem =
  | { kind: "post"; key: string; repostedBy: UserMini | null; post: PostDTO }
  | { kind: "ad"; key: string; ad: AdDTO };

export type Page<T> = { items: T[]; nextCursor: string | null };

export type CommentDTO = {
  id: string;
  text: string;
  createdAt: string;
  author: UserMini;
  canDelete: boolean;
};

export type ListingDTO = {
  id: string;
  title: string;
  description: string;
  priceInr: number;
  category: string;
  medium: string | null;
  dimensions: string | null;
  status: "ACTIVE" | "SOLD" | "ARCHIVED" | "REMOVED";
  createdAt: string;
  seller: UserMini;
  images: MediaDTO[];
};

export type MessageDTO = {
  id: string;
  senderId: string;
  text: string;
  media: MediaDTO | null;
  createdAt: string;
  deleted: boolean;
};

export type RealtimeEvent =
  | { type: "message"; conversationId: string }
  | { type: "read"; conversationId: string; userId: string; at: string }
  | { type: "typing"; conversationId: string; userId: string }
  | { type: "notification" };

export type Me = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  isStaff: boolean;
  contactVerified: boolean;
};
