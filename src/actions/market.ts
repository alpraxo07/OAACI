"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { run, UserError, type ActionResult } from "@/lib/action";
import { actionUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/settings";
import { deleteMediaIfUnused, ownedMedia } from "@/lib/media";
import { emit } from "@/lib/realtime";
import { isBlockedBetween } from "@/lib/social";
import { getOrCreateConversation } from "@/lib/messages";
import { LISTING_CATEGORIES } from "@/lib/constants";
import { audit } from "@/lib/social";
import { idSchema } from "@/lib/validation";

const listingSchema = z.object({
  title: z.string().trim().min(3, "Give your listing a title.").max(100, "Title can be at most 100 characters."),
  description: z.string().trim().min(10, "Describe the piece in a sentence or two.").max(3000, "Description is too long."),
  priceInr: z.coerce.number().int("Price must be a whole number of rupees.").min(1, "Enter a price.").max(10_000_000, "That price is too high."),
  category: z.enum(LISTING_CATEGORIES, { message: "Choose a category." }),
  medium: z.string().trim().max(100).optional(),
  dimensions: z.string().trim().max(100).optional(),
  imageIds: z.array(idSchema).min(1, "Add at least one photo.").max(6, "You can add up to 6 photos."),
});

async function checkImages(imageIds: string[], ownerId: string) {
  const media = [];
  for (const id of imageIds) {
    const m = await ownedMedia(id, ownerId, ["IMAGE"]);
    if (m.flagged) throw new UserError("One of the photos can't be used. Please choose another.");
    media.push(m);
  }
  return media;
}

export async function createListing(input: z.input<typeof listingSchema>): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    await rateLimit(`listing:${me.id}`, 20, 86400);
    const data = listingSchema.parse(input);
    await checkImages(data.imageIds, me.id);
    const listing = await db.listing.create({
      data: {
        sellerId: me.id,
        title: await cleanText(data.title),
        description: await cleanText(data.description),
        priceInr: data.priceInr,
        category: data.category,
        medium: data.medium ? await cleanText(data.medium) : null,
        dimensions: data.dimensions || null,
        images: { create: data.imageIds.map((mediaId, position) => ({ mediaId, position })) },
      },
    });
    return { id: listing.id };
  });
}

export async function updateListing(input: z.input<typeof listingSchema> & { id: string }): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    const listing = await db.listing.findUnique({ where: { id: idSchema.parse(input.id) }, include: { images: true } });
    if (!listing || listing.sellerId !== me.id) throw new UserError("You can only edit your own listings.");
    if (listing.status === "REMOVED") throw new UserError("This listing was removed by a moderator.");
    const data = listingSchema.parse(input);
    await checkImages(data.imageIds, me.id);
    const removed = listing.images.map((i) => i.mediaId).filter((id) => !data.imageIds.includes(id));
    await db.$transaction([
      db.listingImage.deleteMany({ where: { listingId: listing.id } }),
      db.listing.update({
        where: { id: listing.id },
        data: {
          title: await cleanText(data.title),
          description: await cleanText(data.description),
          priceInr: data.priceInr,
          category: data.category,
          medium: data.medium ? await cleanText(data.medium) : null,
          dimensions: data.dimensions || null,
          images: { create: data.imageIds.map((mediaId, position) => ({ mediaId, position })) },
        },
      }),
    ]);
    await deleteMediaIfUnused(removed);
    return { id: listing.id };
  });
}

export async function setListingStatus(input: { id: string; status: "ACTIVE" | "SOLD" | "ARCHIVED" }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    const status = z.enum(["ACTIVE", "SOLD", "ARCHIVED"]).parse(input.status);
    const listing = await db.listing.findUnique({ where: { id: idSchema.parse(input.id) } });
    if (!listing || listing.sellerId !== me.id) throw new UserError("You can only change your own listings.");
    if (listing.status === "REMOVED") throw new UserError("This listing was removed by a moderator.");
    await db.listing.update({ where: { id: listing.id }, data: { status } });
    return null;
  });
}

export async function deleteListing(input: { id: string }): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    const listing = await db.listing.findUnique({ where: { id: idSchema.parse(input.id) }, include: { images: true } });
    if (!listing) throw new UserError("This listing no longer exists.");
    if (listing.sellerId !== me.id && !me.isStaff) throw new UserError("You can only delete your own listings.");
    await db.listing.delete({ where: { id: listing.id } });
    await deleteMediaIfUnused(listing.images.map((i) => i.mediaId));
    if (listing.sellerId !== me.id) await audit(me.id, "listing.delete", "LISTING", listing.id, { sellerId: listing.sellerId });
    return null;
  });
}

/** Opens a conversation with the seller and sends a first message about the listing. */
export async function contactSeller(input: { listingId: string; message: string }): Promise<ActionResult<{ conversationId: string }>> {
  return run(async () => {
    const me = await actionUser({ verified: true });
    await rateLimit(`contact-seller:${me.id}`, 30, 3600);
    const listing = await db.listing.findUnique({
      where: { id: idSchema.parse(input.listingId) },
      include: { seller: { select: { id: true, bannedAt: true, deactivatedAt: true } } },
    });
    if (!listing || listing.status !== "ACTIVE" || listing.seller.bannedAt || listing.seller.deactivatedAt) {
      throw new UserError("This listing isn't available.");
    }
    if (listing.sellerId === me.id) throw new UserError("This is your own listing.");
    if (await isBlockedBetween(me.id, listing.sellerId)) throw new UserError("You can't contact this seller.");
    const text = await cleanText(z.string().trim().min(1, "Write a message.").max(1000).parse(input.message));
    const conversationId = await getOrCreateConversation(me.id, listing.sellerId);
    const now = new Date();
    await db.$transaction([
      db.message.create({
        data: {
          conversationId,
          senderId: me.id,
          text: `${text}\n\nRe: “${listing.title}” — ${env.appUrl}/market/${listing.id}`,
          createdAt: now,
        },
      }),
      db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
      db.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId: me.id } },
        data: { lastReadAt: now, clearedAt: null },
      }),
    ]);
    await emit([listing.sellerId], { type: "message", conversationId });
    return { conversationId };
  });
}
