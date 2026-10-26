import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getHashtagPosts } from "@/lib/posts";
import { db } from "@/lib/db";
import { Columns } from "@/components/shell/right-rail";
import { EmptyState, PageHeader, formatCount } from "@/components/ui/misc";
import { FeedList } from "@/components/post/feed-list";
import { Hash } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/tag/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage({ params }: PageProps<"/tag/[tag]">) {
  const tag = decodeURIComponent((await params).tag).toLowerCase();
  const me = await getCurrentUser();
  const [feed, count] = await Promise.all([
    getHashtagPosts(tag, me?.id ?? null),
    db.postHashtag.count({ where: { hashtag: { name: tag }, post: { status: "PUBLISHED" } } }),
  ]);

  return (
    <Columns>
      <PageHeader title={`#${tag}`} back="/explore">
        <span className="text-sm text-muted">
          {formatCount(count)} {count === 1 ? "post" : "posts"}
        </span>
      </PageHeader>
      <FeedList
        initial={feed}
        endpoint={`/api/feed?scope=tag&tag=${encodeURIComponent(tag)}`}
        empty={
          <EmptyState icon={<Hash className="h-6 w-6" />} title={`No posts with #${tag} yet`}>
            Use this hashtag in a post to start the conversation.
          </EmptyState>
        }
      />
    </Columns>
  );
}
