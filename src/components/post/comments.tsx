"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag, Trash2 } from "lucide-react";
import { addComment, deleteComment } from "@/actions/posts";
import { useMe } from "@/components/providers";
import { Avatar } from "@/components/ui/avatar";
import { Menu } from "@/components/ui/menu";
import { EmptyState, Spinner, VerifiedBadge } from "@/components/ui/misc";
import { TimeAgo } from "@/components/ui/time-ago";
import { toast } from "@/components/ui/toaster";
import { ReportDialog } from "@/components/report-dialog";
import { RichText } from "./rich-text";
import { COMMENT_MAX_LENGTH } from "@/lib/constants";
import type { CommentDTO, Page } from "@/lib/types";

function CommentRow({ comment, onDeleted }: { comment: CommentDTO; onDeleted: () => void }) {
  const me = useMe();
  const [reporting, setReporting] = useState(false);

  return (
    <div className="flex gap-3 border-b border-border px-4 py-3">
      <Link href={`/${comment.author.username}`} className="shrink-0">
        <Avatar user={comment.author} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-sm">
            <Link href={`/${comment.author.username}`} className="font-semibold hover:underline">
              {comment.author.name}
            </Link>
            {comment.author.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
            <span className="text-muted">@{comment.author.username}</span>
            <span className="text-muted">·</span>
            <TimeAgo date={comment.createdAt} className="text-muted" />
          </p>
          <Menu
            className="-mt-1.5 -mr-2"
            items={[
              {
                label: "Delete comment",
                icon: <Trash2 />,
                danger: true,
                hidden: !comment.canDelete,
                onSelect: async () => {
                  const r = await deleteComment({ id: comment.id });
                  if (r.ok) onDeleted();
                  else toast.error(r.error);
                },
              },
              {
                label: "Report comment",
                icon: <Flag />,
                danger: true,
                hidden: !me || me.id === comment.author.id,
                onSelect: () => setReporting(true),
              },
            ]}
          />
        </div>
        <RichText text={comment.text} className="text-[15px] leading-relaxed" />
      </div>
      {me && <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="COMMENT" targetId={comment.id} />}
    </div>
  );
}

export function Comments({ postId, initial, canComment }: { postId: string; initial: Page<CommentDTO>; canComment: boolean }) {
  const me = useMe();
  const [comments, setComments] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    const r = await addComment({ postId, text });
    setPosting(false);
    if (!r.ok) return toast.error(r.error);
    setComments((c) => [...c, r.data]);
    setText("");
  };

  const loadMore = async () => {
    if (!cursor) return;
    setLoading(true);
    const res = await fetch(`/api/posts/${postId}/comments?cursor=${encodeURIComponent(cursor)}`);
    setLoading(false);
    if (!res.ok) return toast.error("Couldn't load more comments");
    const page = (await res.json()) as Page<CommentDTO>;
    setComments((c) => [...c, ...page.items]);
    setCursor(page.nextCursor);
  };

  return (
    <section aria-label="Comments">
      {me && canComment && (
        <form onSubmit={submit} className="flex items-start gap-3 border-b border-border px-4 py-3">
          <Avatar user={me} size="sm" className="mt-1" />
          <div className="min-w-0 flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={me.contactVerified ? "Write a comment…" : "Verify your email to comment"}
              disabled={!me.contactVerified}
              maxLength={COMMENT_MAX_LENGTH}
              rows={2}
              className="input resize-none"
              aria-label="Comment"
            />
            <div className="mt-2 flex justify-end">
              <button className="btn btn-primary btn-sm" disabled={posting || !text.trim()}>
                {posting && <Spinner />} Comment
              </button>
            </div>
          </div>
        </form>
      )}
      {!me && (
        <p className="border-b border-border px-4 py-4 text-sm text-muted">
          <Link href={`/login?next=/p/${postId}`} className="link">
            Log in
          </Link>{" "}
          to join the conversation.
        </p>
      )}
      {comments.length === 0 ? (
        <EmptyState title="No comments yet" className="py-10">
          Be the first to say something kind.
        </EmptyState>
      ) : (
        comments.map((c) => <CommentRow key={c.id} comment={c} onDeleted={() => setComments((all) => all.filter((x) => x.id !== c.id))} />)
      )}
      {cursor && (
        <div className="flex justify-center py-4">
          <button className="btn btn-secondary btn-sm" onClick={loadMore} disabled={loading}>
            {loading && <Spinner />} Load more comments
          </button>
        </div>
      )}
    </section>
  );
}
