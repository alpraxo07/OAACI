"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Ban,
  Clock,
  Flag,
  Link2,
  MessageCircle,
  Pencil,
  Repeat2,
  Share,
  Star,
  Trash2,
  VolumeX,
} from "lucide-react";
import { deletePost, toggleRepost, toggleStar } from "@/actions/posts";
import { setBlocked, setMuted } from "@/actions/social";
import { useMe } from "@/components/providers";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmModal } from "@/components/ui/modal";
import { Menu } from "@/components/ui/menu";
import { VerifiedBadge, formatCount } from "@/components/ui/misc";
import { TimeAgo } from "@/components/ui/time-ago";
import { toast } from "@/components/ui/toaster";
import { ReportDialog } from "@/components/report-dialog";
import { shareLink } from "@/components/share";
import { RichText } from "./rich-text";
import { PostMedia } from "./post-media";
import { EditPostModal } from "./edit-post-modal";
import { cn } from "@/lib/cn";
import type { PostDTO, UserMini } from "@/lib/types";

export function PostCard({
  post: initial,
  repostedBy,
  onRemoved,
  detail = false,
}: {
  post: PostDTO;
  repostedBy?: UserMini | null;
  onRemoved?: () => void;
  detail?: boolean;
}) {
  const me = useMe();
  const router = useRouter();
  const [post, setPost] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [gone, setGone] = useState(false);

  const isMine = me?.id === post.author.id;
  const href = `/p/${post.id}`;
  if (gone) return null;

  const needLogin = () => {
    if (me) return false;
    router.push(`/login?next=${encodeURIComponent(href)}`);
    return true;
  };

  const star = async () => {
    if (needLogin()) return;
    const prev = post;
    setPost({ ...post, starred: !post.starred, starCount: post.starCount + (post.starred ? -1 : 1) });
    const r = await toggleStar({ postId: post.id });
    if (r.ok) setPost((p) => ({ ...p, starred: r.data.starred, starCount: r.data.count }));
    else {
      setPost(prev);
      toast.error(r.error);
    }
  };

  const repost = async () => {
    if (needLogin()) return;
    const prev = post;
    setPost({ ...post, reposted: !post.reposted, repostCount: post.repostCount + (post.reposted ? -1 : 1) });
    const r = await toggleRepost({ postId: post.id });
    if (r.ok) {
      setPost((p) => ({ ...p, reposted: r.data.reposted, repostCount: r.data.count }));
      toast.success(r.data.reposted ? "Reposted to your followers" : "Repost removed");
    } else {
      setPost(prev);
      toast.error(r.error);
    }
  };

  const remove = async () => {
    setBusy(true);
    const r = await deletePost({ id: post.id });
    setBusy(false);
    setConfirmDelete(false);
    if (!r.ok) return toast.error(r.error);
    toast.success("Post deleted");
    setGone(true);
    onRemoved?.();
    if (detail) router.push("/");
  };

  const mute = async () => {
    const r = await setMuted({ userId: post.author.id, muted: true });
    if (!r.ok) return toast.error(r.error);
    toast.success(`Muted @${post.author.username}. You won't see their posts in your feed.`);
    setGone(true);
  };

  const block = async () => {
    const r = await setBlocked({ userId: post.author.id, blocked: true });
    setConfirmBlock(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(`Blocked @${post.author.username}`);
    setGone(true);
  };

  const openPost = (e: React.MouseEvent) => {
    if (detail || !e.currentTarget.contains(e.target as Node)) return;
    if ((e.target as HTMLElement).closest("a,button,video,audio,input,textarea,[role=menu]")) return;
    if (window.getSelection()?.toString()) return;
    router.push(href);
  };

  return (
    <article
      data-post-id={post.id}
      onClick={openPost}
      className={cn("border-b border-border px-4 py-3 transition-colors", !detail && "cursor-pointer hover:bg-surface/60")}
    >
      {repostedBy && (
        <p className="mb-1 flex items-center gap-1.5 pl-8 text-xs font-medium text-muted">
          <Repeat2 className="h-3.5 w-3.5" />
          <Link href={`/${repostedBy.username}`} className="hover:underline">
            {repostedBy.id === me?.id ? "You" : repostedBy.name} reposted
          </Link>
        </p>
      )}
      <div className="flex gap-3">
        <Link href={`/${post.author.username}`} className="shrink-0">
          <Avatar user={post.author} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-[15px] leading-5">
              <Link href={`/${post.author.username}`} className="truncate font-semibold hover:underline">
                {post.author.name}
              </Link>
              {post.author.verified && <VerifiedBadge />}
              <span className="truncate text-muted">@{post.author.username}</span>
              <span className="text-muted">·</span>
              <Link href={href} className="text-sm text-muted hover:underline">
                <TimeAgo date={post.createdAt} />
              </Link>
              {post.editedAt && <span className="text-xs text-muted">(edited)</span>}
            </div>
            <Menu
              className="-mt-1.5 -mr-2"
              items={[
                { label: "Copy link", icon: <Link2 />, onSelect: () => shareLink(href, "OAACI post") },
                { label: "Edit post", icon: <Pencil />, onSelect: () => setEditing(true), hidden: !isMine || post.status === "REMOVED" },
                { label: "Delete post", icon: <Trash2 />, onSelect: () => setConfirmDelete(true), danger: true, hidden: !isMine && !me?.isStaff },
                { label: `Mute @${post.author.username}`, icon: <VolumeX />, onSelect: mute, hidden: !me || isMine },
                { label: `Block @${post.author.username}`, icon: <Ban />, onSelect: () => setConfirmBlock(true), danger: true, hidden: !me || isMine },
                { label: "Report post", icon: <Flag />, onSelect: () => setReporting(true), danger: true, hidden: !me || isMine },
              ]}
            />
          </div>

          {post.status === "HIDDEN" && (
            <p className="mt-2 flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary-text">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Under review — only you can see this post until a moderator approves it.
            </p>
          )}

          <RichText text={post.text} className={cn("mt-0.5", detail ? "text-lg leading-relaxed" : "text-[15px] leading-relaxed")} />

          {post.media && (
            <PostMedia
              media={post.media}
              cover={post.cover}
              trackTitle={post.trackTitle}
              artist={post.author.name}
              sensitive={post.sensitive}
              className="mt-3"
            />
          )}

          <div className="-ml-2 mt-2 flex max-w-md items-center justify-between text-muted">
            <Link href={href} className="group flex items-center gap-1 text-sm" aria-label="Comments">
              <span className="icon-btn group-hover:bg-primary-soft group-hover:text-primary-text">
                <MessageCircle className="h-[18px] w-[18px]" />
              </span>
              {post.commentCount > 0 && formatCount(post.commentCount)}
            </Link>
            <button
              onClick={repost}
              className={cn("group flex items-center gap-1 text-sm", post.reposted && "text-success")}
              aria-label={post.reposted ? "Undo repost" : "Repost"}
              aria-pressed={post.reposted}
              disabled={post.status !== "PUBLISHED"}
            >
              <span className="icon-btn group-hover:bg-success-soft group-hover:text-success">
                <Repeat2 className={cn("h-[18px] w-[18px]", post.reposted && "text-success")} />
              </span>
              {post.repostCount > 0 && formatCount(post.repostCount)}
            </button>
            <button
              onClick={star}
              className={cn("group flex items-center gap-1 text-sm", post.starred && "text-star")}
              aria-label={post.starred ? "Remove star" : "Star"}
              aria-pressed={post.starred}
              disabled={post.status !== "PUBLISHED"}
            >
              <span className="icon-btn group-hover:bg-amber-500/10 group-hover:text-star">
                <Star className={cn("h-[18px] w-[18px]", post.starred && "fill-star text-star")} />
              </span>
              {post.starCount > 0 && formatCount(post.starCount)}
            </button>
            <span className="flex items-center gap-1 text-sm" title="Views">
              <span className="inline-flex h-9 w-9 items-center justify-center">
                <BarChart3 className="h-[18px] w-[18px]" />
              </span>
              {post.viewCount > 0 && formatCount(post.viewCount)}
            </span>
            <button onClick={() => shareLink(href, `${post.author.name} on OAACI`)} className="icon-btn" aria-label="Share">
              <Share className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {editing && <EditPostModal post={post} onClose={() => setEditing(false)} onSaved={(p) => setPost(p)} />}
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Delete this post?"
        body="This can't be undone. Stars, comments and reposts will be removed too."
        confirmLabel="Delete"
        danger
        pending={busy}
      />
      <ConfirmModal
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={block}
        title={`Block @${post.author.username}?`}
        body="They won't be able to see your profile, follow you or message you, and you won't see their posts. They won't be notified."
        confirmLabel="Block"
        danger
      />
      {me && <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="POST" targetId={post.id} />}
    </article>
  );
}
