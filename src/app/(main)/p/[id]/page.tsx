import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getPost } from "@/lib/posts";
import { getComments } from "@/lib/comments";
import { imageUrl } from "@/lib/media-url";
import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";
import { PostCard } from "@/components/post/post-card";
import { Comments } from "@/components/post/comments";
import { ViewPing } from "@/components/post/view-ping";

export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id, null);
  if (!post) return { title: "Post not found" };
  const image = post.media?.kind === "IMAGE" ? post.media.url : (post.media?.thumbnailUrl ?? post.cover?.url ?? null);
  const title = `${post.author.name} (@${post.author.username})`;
  return {
    title,
    description: post.text || post.trackTitle || "A post on OAACI",
    openGraph: {
      title,
      description: post.text || post.trackTitle || undefined,
      images: image && !post.sensitive ? [imageUrl(image, 1200)] : undefined,
    },
  };
}

export default async function PostPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const me = await getCurrentUser();
  const post = await getPost(id, me?.id ?? null);
  if (!post) notFound();
  const comments = await getComments(post.id, me);

  return (
    <Columns>
      <PageHeader title="Post" back="/" />
      <PostCard post={post} detail />
      <ViewPing postId={post.id} />
      <Comments postId={post.id} initial={comments} canComment={post.status === "PUBLISHED"} />
    </Columns>
  );
}
