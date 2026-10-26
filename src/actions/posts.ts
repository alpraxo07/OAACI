"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError, type ActionResult } from "@/lib/action";
import { actionUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/settings";
import { deleteMediaIfUnused, ownedMedia } from "@/lib/media";
import { extractHashtags, extractMentions } from "@/lib/text";
import { getPostsByIds, syncHashtags } from "@/lib/posts";
import { audit, isBlockedBetween, notify, notifyMentions } from "@/lib/social";
import { commentTextSchema, idSchema, postTextSchema } from "@/lib/validation";
import type { CommentDTO, PostDTO } from "@/lib/types";

const createSchema = z.object({
  text: postTextSchema,
  mediaId: idSchema.nullish(),
  coverMediaId: idSchema.nullish(),
  trackTitle: z.string().trim().max(100, "Song title can be at most 100 characters.").nullish(),
  sensitive: z.boolean().default(false),
});

export async function createPost(input: z.input<typeof createSchema>): Promise<ActionResult<{ id: string; held: boolean }>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    await rateLimit(`post:${me.id}`, 30, 3600);
    const data = createSchema.parse(input);
    const text = await cleanText(data.text);

    const media = data.mediaId ? await ownedMedia(data.mediaId, me.id, ["IMAGE", "VIDEO", "AUDIO"]) : null;
    if (!text && !media) throw new UserError("Write something or add a photo, video or song.");
    if (media && (await db.post.count({ where: { mediaId: media.id } }))) {
      throw new UserError("That file is already used in another post.");
    }
    const cover = media?.kind === "AUDIO" && data.coverMediaId ? await ownedMedia(data.coverMediaId, me.id, ["IMAGE"]) : null;
    const trackTitle = media?.kind === "AUDIO" ? (await cleanText(data.trackTitle ?? "")) || "Untitled" : null;
    const held = Boolean(media?.flagged || cover?.flagged);

    const post = await db.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          authorId: me.id,
          text,
          mediaId: media?.id ?? null,
          coverMediaId: cover?.id ?? null,
          trackTitle,
          sensitive: data.sensitive || Boolean(media?.sensitive || cover?.sensitive),
          status: held ? "HIDDEN" : "PUBLISHED",
        },
      });
      await syncHashtags(created.id, extractHashtags(text), tx);
      if (held) {
        await tx.report.create({
          data: {
            targetType: "POST",
            targetId: created.id,
            reason: "NUDITY",
            details: "Held automatically: image moderation detected explicit content.",
          },
        });
      }
      return created;
    });

    if (!held) await notifyMentions(extractMentions(text), me.id, post.id);
    return { id: post.id, held };
  });
}

const editSchema = z.object({ id: idSchema, text: postTextSchema, sensitive: z.boolean() });

export async function editPost(input: z.input<typeof editSchema>): Promise<ActionResult<PostDTO>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    await rateLimit(`edit:${me.id}`, 60, 3600);
    const data = editSchema.parse(input);
    const post = await db.post.findUnique({ where: { id: data.id } });
    if (!post || post.authorId !== me.id || post.repostOfId) throw new UserError("You can only edit your own posts.");
    if (post.status === "REMOVED") throw new UserError("This post was removed by a moderator.");
    const text = await cleanText(data.text);
    if (!text && !post.mediaId) throw new UserError("A post without a photo, video or song needs some text.");

    const before = new Set(extractMentions(post.text));
    await db.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: post.id },
        data: { text, sensitive: data.sensitive, editedAt: text !== post.text ? new Date() : post.editedAt },
      });
      await syncHashtags(post.id, extractHashtags(text), tx);
    });
    if (post.status === "PUBLISHED") {
      await notifyMentions(extractMentions(text).filter((u) => !before.has(u)), me.id, post.id);
    }
    const [fresh] = await getPostsByIds([post.id], me.id);
    return fresh;
  });
}

export async function deletePost(input: { id: string }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    const post = await db.post.findUnique({ where: { id: idSchema.parse(input.id) } });
    if (!post) throw new UserError("This post no longer exists.");
    const isOwner = post.authorId === me.id;
    if (!isOwner && !me.isStaff) throw new UserError("You can only delete your own posts.");

    await db.$transaction(async (tx) => {
      await tx.post.delete({ where: { id: post.id } });
      if (post.repostOfId) {
        await tx.post.updateMany({ where: { id: post.repostOfId, repostCount: { gt: 0 } }, data: { repostCount: { decrement: 1 } } });
      }
      await tx.notification.deleteMany({ where: { postId: post.id } });
    });
    await deleteMediaIfUnused([post.mediaId, post.coverMediaId]);
    if (!isOwner) await audit(me.id, "post.delete", "POST", post.id, { authorId: post.authorId });
    return null;
  });
}

/** Loads a post that the user is allowed to interact with. */
async function interactablePost(postId: string, userId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, status: true, repostOfId: true, author: { select: { bannedAt: true, deactivatedAt: true } } },
  });
  if (!post || post.status !== "PUBLISHED" || post.author.bannedAt || post.author.deactivatedAt) {
    throw new UserError("This post isn't available.");
  }
  if (await isBlockedBetween(userId, post.authorId)) throw new UserError("You can't interact with this post.");
  return post;
}

export async function toggleStar(input: { postId: string }): Promise<ActionResult<{ starred: boolean; count: number }>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    await rateLimit(`star:${me.id}`, 300, 3600);
    const post = await interactablePost(idSchema.parse(input.postId), me.id);
    const existing = await db.star.findUnique({ where: { userId_postId: { userId: me.id, postId: post.id } } });

    if (existing) {
      const [, updated] = await db.$transaction([
        db.star.delete({ where: { userId_postId: { userId: me.id, postId: post.id } } }),
        db.post.update({ where: { id: post.id }, data: { starCount: { decrement: 1 } }, select: { starCount: true } }),
      ]);
      return { starred: false, count: Math.max(updated.starCount, 0) };
    }
    try {
      const [, updated] = await db.$transaction([
        db.star.create({ data: { userId: me.id, postId: post.id } }),
        db.post.update({ where: { id: post.id }, data: { starCount: { increment: 1 } }, select: { starCount: true } }),
      ]);
      await notify({ userId: post.authorId, actorId: me.id, type: "STAR", postId: post.id });
      return { starred: true, count: updated.starCount };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const p = await db.post.findUniqueOrThrow({ where: { id: post.id }, select: { starCount: true } });
        return { starred: true, count: p.starCount };
      }
      throw error;
    }
  });
}

export async function toggleRepost(input: { postId: string }): Promise<ActionResult<{ reposted: boolean; count: number }>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    await rateLimit(`repost:${me.id}`, 100, 3600);
    let post = await interactablePost(idSchema.parse(input.postId), me.id);
    if (post.repostOfId) post = await interactablePost(post.repostOfId, me.id);

    const existing = await db.post.findUnique({
      where: { authorId_repostOfId: { authorId: me.id, repostOfId: post.id } },
      select: { id: true },
    });
    if (existing) {
      const [, updated] = await db.$transaction([
        db.post.delete({ where: { id: existing.id } }),
        db.post.update({ where: { id: post.id }, data: { repostCount: { decrement: 1 } }, select: { repostCount: true } }),
      ]);
      return { reposted: false, count: Math.max(updated.repostCount, 0) };
    }
    try {
      const [, updated] = await db.$transaction([
        db.post.create({ data: { authorId: me.id, repostOfId: post.id } }),
        db.post.update({ where: { id: post.id }, data: { repostCount: { increment: 1 } }, select: { repostCount: true } }),
      ]);
      await notify({ userId: post.authorId, actorId: me.id, type: "REPOST", postId: post.id });
      return { reposted: true, count: updated.repostCount };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const p = await db.post.findUniqueOrThrow({ where: { id: post.id }, select: { repostCount: true } });
        return { reposted: true, count: p.repostCount };
      }
      throw error;
    }
  });
}

export async function addComment(input: { postId: string; text: string }): Promise<ActionResult<CommentDTO>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    await rateLimit(`comment:${me.id}`, 60, 3600);
    const post = await interactablePost(idSchema.parse(input.postId), me.id);
    const text = await cleanText(commentTextSchema.parse(input.text));

    const [comment] = await db.$transaction([
      db.comment.create({
        data: { postId: post.id, authorId: me.id, text },
        include: { author: { select: { id: true, username: true, name: true, avatarUrl: true, verified: true } } },
      }),
      db.post.update({ where: { id: post.id }, data: { commentCount: { increment: 1 } } }),
    ]);
    await notify({ userId: post.authorId, actorId: me.id, type: "COMMENT", postId: post.id, commentId: comment.id, text: text.slice(0, 140) });
    // The post author already gets a COMMENT notification, so don't also send a MENTION.
    await notifyMentions(extractMentions(text), me.id, post.id, comment.id, [post.authorId]);
    return {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
      author: comment.author,
      canDelete: true,
    };
  });
}

export async function deleteComment(input: { id: string }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    const comment = await db.comment.findUnique({
      where: { id: idSchema.parse(input.id) },
      include: { post: { select: { authorId: true } } },
    });
    if (!comment) throw new UserError("This comment no longer exists.");
    const allowed = comment.authorId === me.id || comment.post.authorId === me.id || me.isStaff;
    if (!allowed) throw new UserError("You can't delete this comment.");
    await db.$transaction([
      db.comment.delete({ where: { id: comment.id } }),
      db.post.updateMany({ where: { id: comment.postId, commentCount: { gt: 0 } }, data: { commentCount: { decrement: 1 } } }),
      db.notification.deleteMany({ where: { commentId: comment.id } }),
    ]);
    if (comment.authorId !== me.id && comment.post.authorId !== me.id) {
      await audit(me.id, "comment.delete", "COMMENT", comment.id, { authorId: comment.authorId });
    }
    return null;
  });
}
