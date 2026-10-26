import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  getExplorePosts,
  getHashtagPosts,
  getHomeFeed,
  getLatestPosts,
  getUserGallery,
  getUserPosts,
  searchPosts,
} from "@/lib/posts";

/** Pagination endpoint for every post list in the app. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const scope = params.get("scope");
  const cursor = params.get("cursor");
  const me = await getCurrentUser();
  const viewerId = me?.id ?? null;

  switch (scope) {
    case "home":
      if (!me) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
      return NextResponse.json(await getHomeFeed(me.id, cursor));
    case "latest":
      return NextResponse.json(await getLatestPosts(viewerId, cursor));
    case "explore":
      return NextResponse.json(await getExplorePosts(viewerId, cursor));
    case "tag":
      return NextResponse.json(await getHashtagPosts((params.get("tag") ?? "").toLowerCase(), viewerId, cursor));
    case "search":
      return NextResponse.json(await searchPosts((params.get("q") ?? "").slice(0, 100), viewerId, cursor));
    case "user":
    case "gallery": {
      const user = await db.user.findUnique({ where: { id: params.get("userId") ?? "" }, select: { id: true } });
      if (!user) return NextResponse.json({ items: [], nextCursor: null });
      return NextResponse.json(
        scope === "user" ? await getUserPosts(user.id, viewerId, cursor) : await getUserGallery(user.id, viewerId, cursor),
      );
    }
    default:
      return NextResponse.json({ error: "Unknown scope" }, { status: 400 });
  }
}
