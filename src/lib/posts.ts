import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { PAGE_SIZE } from "./constants";
import { getHiddenAuthorIds } from "./social";
import type { FeedItem, MediaDTO, Page, PostDTO, UserMini } from "./types";

export const userMiniSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  verified: true,
} satisfies Prisma.UserSelect;

export const mediaSelect = {
  id: true,
  kind: true,
  url: true,
  thumbnailUrl: true,
  width: true,
  height: true,
  duration: true,
} satisfies Prisma.MediaSelect;

const NOBODY = "__nobody__";

function basePostInclude(viewerId: string | null | undefined) {
  return {
    author: { select: userMiniSelect },
    media: { select: mediaSelect },
    coverMedia: { select: mediaSelect },
    stars: { where: { userId: viewerId ?? NOBODY }, select: { userId: true }, take: 1 },
    reposts: { where: { authorId: viewerId ?? NOBODY }, select: { id: true }, take: 1 },
  } satisfies Prisma.PostInclude;
}

export function postInclude(viewerId: string | null | undefined) {
  return {
    ...basePostInclude(viewerId),
    repostOf: { include: basePostInclude(viewerId) },
  } satisfies Prisma.PostInclude;
}

type BasePost = Prisma.PostGetPayload<{ include: ReturnType<typeof basePostInclude> }>;
export type PostWithRelations = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>;

export const toUserMini = (u: UserMini): UserMini => ({
  id: u.id,
  username: u.username,
  name: u.name,
  avatarUrl: u.avatarUrl,
  verified: u.verified,
});

export const toMediaDTO = (m: MediaDTO | null): MediaDTO | null =>
  m
    ? {
        id: m.id,
        kind: m.kind,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        width: m.width,
        height: m.height,
        duration: m.duration,
      }
    : null;

export function serializePost(p: BasePost): PostDTO {
  return {
    id: p.id,
    text: p.text,
    createdAt: p.createdAt.toISOString(),
    editedAt: p.editedAt?.toISOString() ?? null,
    sensitive: p.sensitive,
    status: p.status,
    author: toUserMini(p.author),
    media: toMediaDTO(p.media),
    cover: toMediaDTO(p.coverMedia),
    trackTitle: p.trackTitle,
    starCount: p.starCount,
    commentCount: p.commentCount,
    repostCount: p.repostCount,
    viewCount: p.viewCount,
    starred: p.stars.length > 0,
    reposted: p.reposts.length > 0,
  };
}

export function toFeedItem(p: PostWithRelations): FeedItem {
  if (p.repostOf) {
    return { kind: "post", key: p.id, repostedBy: toUserMini(p.author), post: serializePost(p.repostOf) };
  }
  return { kind: "post", key: p.id, repostedBy: null, post: serializePost(p) };
}

/** Posts the viewer is allowed to see: published (or their own held posts), by active, non-hidden authors. */
export function visiblePostWhere(viewerId: string | null | undefined, hiddenIds: string[]): Prisma.PostWhereInput {
  const own: Prisma.PostWhereInput[] = viewerId ? [{ status: "HIDDEN", authorId: viewerId }] : [];
  const authorOk: Prisma.PostWhereInput = {
    author: { bannedAt: null, deactivatedAt: null },
    ...(hiddenIds.length ? { authorId: { notIn: hiddenIds } } : {}),
  };
  return {
    AND: [
      authorOk,
      { OR: [{ status: "PUBLISHED" }, ...own] },
      {
        OR: [
          { repostOfId: null },
          {
            repostOf: {
              status: "PUBLISHED",
              author: { bannedAt: null, deactivatedAt: null },
              ...(hiddenIds.length ? { authorId: { notIn: hiddenIds } } : {}),
            },
          },
        ],
      },
    ],
  };
}

function paginate<T extends { id: string }>(rows: T[], size = PAGE_SIZE): { rows: T[]; nextCursor: string | null } {
  const hasMore = rows.length > size;
  const sliced = hasMore ? rows.slice(0, size) : rows;
  return { rows: sliced, nextCursor: hasMore ? sliced[sliced.length - 1].id : null };
}

const cursorArgs = (cursor?: string | null): { cursor?: { id: string }; skip?: number } =>
  cursor ? { cursor: { id: cursor }, skip: 1 } : {};
const newestFirst = [{ createdAt: "desc" as const }, { id: "desc" as const }];

/** Home feed: posts and reposts from people I follow, plus my own, newest first. */
export async function getHomeFeed(viewerId: string, cursor?: string | null): Promise<Page<FeedItem>> {
  const hidden = await getHiddenAuthorIds(viewerId);
  const rows = await db.post.findMany({
    where: {
      AND: [
        { OR: [{ authorId: viewerId }, { author: { followers: { some: { followerId: viewerId } } } }] },
        visiblePostWhere(viewerId, hidden),
      ],
    },
    include: postInclude(viewerId),
    orderBy: newestFirst,
    take: PAGE_SIZE + 1,
    ...cursorArgs(cursor),
  });
  const { rows: page, nextCursor } = paginate(rows);
  return { items: page.map(toFeedItem), nextCursor };
}

/** A member's posts and reposts, for their profile. */
export async function getUserPosts(authorId: string, viewerId: string | null, cursor?: string | null): Promise<Page<FeedItem>> {
  const hidden = await getHiddenAuthorIds(viewerId);
  const rows = await db.post.findMany({
    where: { AND: [{ authorId }, visiblePostWhere(viewerId, hidden)] },
    include: postInclude(viewerId),
    orderBy: newestFirst,
    take: PAGE_SIZE + 1,
    ...cursorArgs(cursor),
  });
  const { rows: page, nextCursor } = paginate(rows);
  return { items: page.map(toFeedItem), nextCursor };
}

/** A member's photos, videos and songs (no reposts), for the gallery grid. */
export async function getUserGallery(authorId: string, viewerId: string | null, cursor?: string | null): Promise<Page<PostDTO>> {
  const hidden = await getHiddenAuthorIds(viewerId);
  const rows = await db.post.findMany({
    where: { AND: [{ authorId, repostOfId: null, mediaId: { not: null } }, visiblePostWhere(viewerId, hidden)] },
    include: basePostInclude(viewerId),
    orderBy: newestFirst,
    take: 30 + 1,
    ...cursorArgs(cursor),
  });
  const { rows: page, nextCursor } = paginate(rows, 30);
  return { items: page.map(serializePost), nextCursor };
}

/** Explore grid: popular media posts from the last 30 days. Uses offset paging (cursor = offset). */
export async function getExplorePosts(viewerId: string | null, cursor?: string | null): Promise<Page<PostDTO>> {
  const hidden = await getHiddenAuthorIds(viewerId);
  const offset = Number(cursor) || 0;
  const take = 30;
  const rows = await db.post.findMany({
    where: {
      AND: [
        { repostOfId: null, mediaId: { not: null }, status: "PUBLISHED", createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
        visiblePostWhere(viewerId, hidden),
      ],
    },
    include: basePostInclude(viewerId),
    orderBy: [{ starCount: "desc" }, { commentCount: "desc" }, { createdAt: "desc" }],
    skip: offset,
    take: take + 1,
  });
  const hasMore = rows.length > take;
  return { items: rows.slice(0, take).map(serializePost), nextCursor: hasMore ? String(offset + take) : null };
}

/** Latest posts from everyone, for the explore "Latest" tab. */
export async function getLatestPosts(viewerId: string | null, cursor?: string | null): Promise<Page<FeedItem>> {
  const hidden = await getHiddenAuthorIds(viewerId);
  const rows = await db.post.findMany({
    where: { AND: [{ repostOfId: null, status: "PUBLISHED" }, visiblePostWhere(viewerId, hidden)] },
    include: postInclude(viewerId),
    orderBy: newestFirst,
    take: PAGE_SIZE + 1,
    ...cursorArgs(cursor),
  });
  const { rows: page, nextCursor } = paginate(rows);
  return { items: page.map(toFeedItem), nextCursor };
}

export async function getHashtagPosts(tag: string, viewerId: string | null, cursor?: string | null): Promise<Page<FeedItem>> {
  const hidden = await getHiddenAuthorIds(viewerId);
  const rows = await db.post.findMany({
    where: { AND: [{ hashtags: { some: { hashtag: { name: tag } } } }, visiblePostWhere(viewerId, hidden)] },
    include: postInclude(viewerId),
    orderBy: newestFirst,
    take: PAGE_SIZE + 1,
    ...cursorArgs(cursor),
  });
  const { rows: page, nextCursor } = paginate(rows);
  return { items: page.map(toFeedItem), nextCursor };
}

export async function searchPosts(q: string, viewerId: string | null, cursor?: string | null): Promise<Page<FeedItem>> {
  const hidden = await getHiddenAuthorIds(viewerId);
  const rows = await db.post.findMany({
    where: {
      AND: [
        { repostOfId: null, OR: [{ text: { contains: q, mode: "insensitive" } }, { trackTitle: { contains: q, mode: "insensitive" } }] },
        visiblePostWhere(viewerId, hidden),
      ],
    },
    include: postInclude(viewerId),
    orderBy: newestFirst,
    take: PAGE_SIZE + 1,
    ...cursorArgs(cursor),
  });
  const { rows: page, nextCursor } = paginate(rows);
  return { items: page.map(toFeedItem), nextCursor };
}

/** Most-used hashtags over the past week. */
export async function getTrendingHashtags(limit = 8): Promise<{ name: string; count: number }[]> {
  const rows = await db.$queryRaw<{ name: string; count: bigint }[]>`
    SELECT h."name", COUNT(*) AS "count"
    FROM "PostHashtag" ph
    JOIN "Hashtag" h ON h."id" = ph."hashtagId"
    JOIN "Post" p ON p."id" = ph."postId"
    JOIN "User" u ON u."id" = p."authorId"
    WHERE ph."createdAt" > NOW() - INTERVAL '7 days'
      AND p."status" = 'PUBLISHED' AND u."bannedAt" IS NULL AND u."deactivatedAt" IS NULL
    GROUP BY h."name"
    ORDER BY "count" DESC, h."name" ASC
    LIMIT ${limit}`;
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}

/** Posts getting the most attention over the past three days. */
export async function getTrendingPosts(viewerId: string | null, limit = 10): Promise<FeedItem[]> {
  const hidden = await getHiddenAuthorIds(viewerId);
  const ranked = await db.$queryRaw<{ id: string }[]>`
    SELECT p."id"
    FROM "Post" p
    JOIN "User" u ON u."id" = p."authorId"
    WHERE p."createdAt" > NOW() - INTERVAL '3 days'
      AND p."status" = 'PUBLISHED' AND p."repostOfId" IS NULL
      AND u."bannedAt" IS NULL AND u."deactivatedAt" IS NULL
    ORDER BY (p."starCount" * 2 + p."commentCount" * 3 + p."repostCount" * 4 + p."viewCount" * 0.05) DESC, p."createdAt" DESC
    LIMIT ${limit * 2}`;
  if (!ranked.length) return [];
  const rows = await db.post.findMany({
    where: { AND: [{ id: { in: ranked.map((r) => r.id) } }, visiblePostWhere(viewerId, hidden)] },
    include: postInclude(viewerId),
  });
  const order = new Map(ranked.map((r, i) => [r.id, i]));
  return rows
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    .slice(0, limit)
    .map(toFeedItem);
}

/** A single post, if the viewer may see it. */
export async function getPost(id: string, viewerId: string | null): Promise<PostDTO | null> {
  const hidden = await getHiddenAuthorIds(viewerId);
  const post = await db.post.findFirst({
    where: { AND: [{ id, repostOfId: null }, visiblePostWhere(viewerId, hidden)] },
    include: basePostInclude(viewerId),
  });
  return post ? serializePost(post) : null;
}

/** Re-reads posts after a mutation so the client gets fresh counters. */
export async function getPostsByIds(ids: string[], viewerId: string | null): Promise<PostDTO[]> {
  const rows = await db.post.findMany({ where: { id: { in: ids } }, include: basePostInclude(viewerId) });
  return rows.map(serializePost);
}

/** Records unique views (one per viewer per post; authors don't count). */
export async function recordViews(postIds: string[], viewerKey: string, viewerId: string | null): Promise<void> {
  if (!postIds.length) return;
  const inserted = await db.$queryRaw<{ postId: string }[]>`
    INSERT INTO "PostView" ("postId", "viewerKey", "createdAt")
    SELECT p."id", ${viewerKey}, NOW() FROM "Post" p
    WHERE p."id" = ANY(${postIds}::text[]) AND p."authorId" <> ${viewerId ?? ""}
    ON CONFLICT DO NOTHING
    RETURNING "postId"`;
  if (inserted.length) {
    await db.$executeRaw`UPDATE "Post" SET "viewCount" = "viewCount" + 1 WHERE "id" = ANY(${inserted.map((r) => r.postId)}::text[])`;
  }
}

/** Replaces the hashtags linked to a post. */
export async function syncHashtags(postId: string, tags: string[], tx: Prisma.TransactionClient = db): Promise<void> {
  await tx.postHashtag.deleteMany({ where: { postId } });
  if (!tags.length) return;
  for (const name of tags) {
    await tx.hashtag.upsert({ where: { name }, create: { name }, update: {} });
  }
  const hashtags = await tx.hashtag.findMany({ where: { name: { in: tags } }, select: { id: true } });
  await tx.postHashtag.createMany({ data: hashtags.map((h) => ({ postId, hashtagId: h.id })), skipDuplicates: true });
}
