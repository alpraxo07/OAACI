import "server-only";
import { db } from "./db";
import { getHiddenAuthorIds } from "./social";
import { userMiniSelect } from "./posts";
import type { CommentDTO, Page } from "./types";

const PAGE = 50;

/** Comments on a post, oldest first. */
export async function getComments(
  postId: string,
  viewer: { id: string; isStaff: boolean } | null,
  cursor?: string | null,
): Promise<Page<CommentDTO>> {
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) return { items: [], nextCursor: null };
  const hidden = await getHiddenAuthorIds(viewer?.id);
  const rows = await db.comment.findMany({
    where: {
      postId,
      author: { bannedAt: null, deactivatedAt: null },
      ...(hidden.length ? { authorId: { notIn: hidden } } : {}),
    },
    include: { author: { select: userMiniSelect } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, PAGE);
  return {
    items: page.map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
      canDelete: Boolean(viewer && (viewer.id === c.authorId || viewer.id === post.authorId || viewer.isStaff)),
    })),
    nextCursor: rows.length > PAGE ? page[page.length - 1].id : null,
  };
}
