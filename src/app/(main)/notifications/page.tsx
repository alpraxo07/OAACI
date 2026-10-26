import type { Metadata } from "next";
import Link from "next/link";
import { AtSign, BadgeCheck, Bell, CircleX, Info, MessageCircle, Repeat2, ShieldAlert, Star, UserPlus } from "lucide-react";
import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { mediaSelect, userMiniSelect } from "@/lib/posts";
import { imageUrl } from "@/lib/media-url";
import { Columns } from "@/components/shell/right-rail";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, PageHeader, VerifiedBadge } from "@/components/ui/misc";
import { TimeAgo } from "@/components/ui/time-ago";
import { MarkNotificationsRead } from "./mark-read";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Notifications" };

const ICONS: Record<NotificationType, { icon: typeof Star; className: string }> = {
  STAR: { icon: Star, className: "fill-star text-star" },
  COMMENT: { icon: MessageCircle, className: "text-primary-text" },
  REPOST: { icon: Repeat2, className: "text-success" },
  FOLLOW: { icon: UserPlus, className: "text-primary-text" },
  MENTION: { icon: AtSign, className: "text-primary-text" },
  VERIFIED: { icon: BadgeCheck, className: "text-verified" },
  VERIFICATION_REJECTED: { icon: CircleX, className: "text-danger" },
  CONTENT_REMOVED: { icon: ShieldAlert, className: "text-danger" },
  SYSTEM: { icon: Info, className: "text-primary-text" },
};

function describe(type: NotificationType, text: string | null): string {
  switch (type) {
    case "STAR":
      return "starred your post";
    case "COMMENT":
      return "commented on your post";
    case "REPOST":
      return "reposted your post";
    case "FOLLOW":
      return "started following you";
    case "MENTION":
      return "mentioned you";
    case "VERIFIED":
      return "Congratulations! You're now a verified artist on OAACI.";
    case "VERIFICATION_REJECTED":
      return `Your verification request wasn't approved${text ? `: ${text}` : "."}`;
    case "CONTENT_REMOVED":
      return `A moderator removed your content${text ? `: ${text}` : "."}`;
    default:
      return text ?? "";
  }
}

export default async function NotificationsPage() {
  const me = await requireUser();
  const notifications = await db.notification.findMany({
    where: { userId: me.id, OR: [{ actorId: null }, { actor: { bannedAt: null, deactivatedAt: null } }] },
    include: { actor: { select: userMiniSelect } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const postIds = [...new Set(notifications.map((n) => n.postId).filter((id): id is string => Boolean(id)))];
  const posts = await db.post.findMany({
    where: { id: { in: postIds } },
    select: { id: true, text: true, trackTitle: true, media: { select: mediaSelect } },
  });
  const postMap = new Map(posts.map((p) => [p.id, p]));

  return (
    <Columns>
      <PageHeader title="Notifications" />
      <MarkNotificationsRead hasUnread={notifications.some((n) => !n.readAt)} />
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6" />} title="No notifications yet">
          When people star, comment on or repost your work, or follow you, you&apos;ll see it here.
        </EmptyState>
      ) : (
        <ul>
          {notifications.map((n) => {
            const { icon: Icon, className } = ICONS[n.type];
            const post = n.postId ? postMap.get(n.postId) : undefined;
            const href =
              n.type === "FOLLOW" && n.actor
                ? `/${n.actor.username}`
                : post
                  ? `/p/${post.id}`
                  : n.type === "VERIFIED" || n.type === "VERIFICATION_REJECTED"
                    ? "/settings/verification"
                    : "#";
            const thumb = post?.media?.kind === "IMAGE" ? post.media.url : (post?.media?.thumbnailUrl ?? null);
            return (
              <li key={n.id}>
                <Link href={href} className={cn("flex gap-3 border-b border-border px-4 py-3 hover:bg-surface/60", !n.readAt && "bg-primary-soft/40")}>
                  <Icon className={cn("mt-1 h-6 w-6 shrink-0", className)} />
                  <div className="min-w-0 flex-1">
                    {n.actor && <Avatar user={n.actor} size="sm" />}
                    <p className="mt-1 text-[15px]">
                      {n.actor && (
                        <span className="font-semibold">
                          {n.actor.name}
                          {n.actor.verified && <VerifiedBadge className="ml-0.5 inline h-3.5 w-3.5 align-[-2px]" />}{" "}
                        </span>
                      )}
                      {describe(n.type, n.text)} <TimeAgo date={n.createdAt.toISOString()} className="text-sm text-muted" />
                    </p>
                    {n.type === "COMMENT" && n.text && <p className="mt-1 line-clamp-2 text-sm text-muted">“{n.text}”</p>}
                    {post && n.type !== "COMMENT" && (post.text || post.trackTitle) && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{post.trackTitle ? `♪ ${post.trackTitle}` : post.text}</p>
                    )}
                  </div>
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(thumb, 120, true)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Columns>
  );
}
