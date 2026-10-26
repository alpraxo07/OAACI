"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Flag, Link2, Mail, VolumeX, Volume2 } from "lucide-react";
import { startConversation } from "@/actions/messages";
import { setBlocked, setMuted } from "@/actions/social";
import { useMe } from "@/components/providers";
import { FollowButton } from "@/components/follow-button";
import { Menu } from "@/components/ui/menu";
import { ConfirmModal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";
import { ReportDialog } from "@/components/report-dialog";
import { shareLink } from "@/components/share";

export function ProfileActions({
  user,
  relation,
}: {
  user: { id: string; username: string; name: string };
  relation: { isMe: boolean; following: boolean; blocked: boolean; muted: boolean; canMessage: boolean };
}) {
  const me = useMe();
  const router = useRouter();
  const [muted, setMutedState] = useState(relation.muted);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [opening, setOpening] = useState(false);

  if (relation.isMe) {
    return (
      <div className="flex gap-2">
        <Link href="/settings/profile" className="btn btn-secondary">
          Edit profile
        </Link>
        <button className="btn btn-secondary px-3" onClick={() => shareLink(`/${user.username}`, `${user.name} on OAACI`)} aria-label="Share profile">
          <Link2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const message = async () => {
    if (!me) return router.push(`/login?next=/${user.username}`);
    setOpening(true);
    const r = await startConversation({ userId: user.id });
    setOpening(false);
    if (r.ok) router.push(`/messages/${r.data.id}`);
    else toast.error(r.error);
  };

  const block = async () => {
    const r = await setBlocked({ userId: user.id, blocked: !relation.blocked });
    setConfirmBlock(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(r.data.blocked ? `Blocked @${user.username}` : `Unblocked @${user.username}`);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <Menu
        items={[
          { label: "Copy profile link", icon: <Link2 />, onSelect: () => shareLink(`/${user.username}`, `${user.name} on OAACI`) },
          {
            label: muted ? `Unmute @${user.username}` : `Mute @${user.username}`,
            icon: muted ? <Volume2 /> : <VolumeX />,
            hidden: !me,
            onSelect: async () => {
              const r = await setMuted({ userId: user.id, muted: !muted });
              if (!r.ok) return toast.error(r.error);
              setMutedState(r.data.muted);
              toast.success(r.data.muted ? "Muted. Their posts won't appear in your feed." : "Unmuted");
            },
          },
          {
            label: relation.blocked ? `Unblock @${user.username}` : `Block @${user.username}`,
            icon: <Ban />,
            danger: !relation.blocked,
            hidden: !me,
            onSelect: () => (relation.blocked ? block() : setConfirmBlock(true)),
          },
          { label: "Report account", icon: <Flag />, danger: true, hidden: !me, onSelect: () => setReporting(true) },
        ]}
      />
      {!relation.blocked && relation.canMessage && (
        <button className="btn btn-secondary px-3" onClick={message} disabled={opening} aria-label="Message" title="Message">
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Message</span>
        </button>
      )}
      {!relation.blocked && <FollowButton userId={user.id} initialFollowing={relation.following} onChange={() => router.refresh()} />}
      <ConfirmModal
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={block}
        title={`Block @${user.username}?`}
        body="They won't be able to see your profile or posts, follow you or message you. You'll both stop following each other."
        confirmLabel="Block"
        danger
      />
      {me && <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="USER" targetId={user.id} />}
    </div>
  );
}
