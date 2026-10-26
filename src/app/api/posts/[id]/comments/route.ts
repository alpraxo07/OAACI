import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getComments } from "@/lib/comments";

/** Comments on a post, oldest first, 50 at a time. */
export async function GET(request: Request, ctx: RouteContext<"/api/posts/[id]/comments">) {
  const { id } = await ctx.params;
  const cursor = new URL(request.url).searchParams.get("cursor");
  const me = await getCurrentUser();
  return NextResponse.json(await getComments(id, me, cursor));
}
