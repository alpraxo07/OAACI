"use client";

import { useState } from "react";
import { editPost } from "@/actions/posts";
import { useAction } from "@/components/use-action";
import { Modal } from "@/components/ui/modal";
import { FormError, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { POST_MAX_LENGTH } from "@/lib/constants";
import type { PostDTO } from "@/lib/types";

export function EditPostModal({ post, onClose, onSaved }: { post: PostDTO; onClose: () => void; onSaved: (p: PostDTO) => void }) {
  const [text, setText] = useState(post.text);
  const [sensitive, setSensitive] = useState(post.sensitive);
  const { execute, pending, error } = useAction(editPost);

  return (
    <Modal open onClose={onClose} title="Edit post">
      <form
        className="space-y-3 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await execute({ id: post.id, text, sensitive });
          if (r?.ok) {
            onSaved(r.data);
            toast.success("Post updated");
            onClose();
          }
        }}
      >
        <FormError message={error} />
        <textarea
          className="input min-h-32 text-[16px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Post text"
          autoFocus
        />
        <div className="flex items-center justify-between text-sm">
          {post.media ? (
            <label className="flex items-center gap-2 text-muted">
              <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} className="accent-[var(--primary)]" />
              Mark as sensitive content
            </label>
          ) : (
            <span />
          )}
          <span className={text.length > POST_MAX_LENGTH ? "text-danger" : "text-muted"}>
            {text.length}/{POST_MAX_LENGTH}
          </span>
        </div>
        <p className="text-xs text-muted">Photos, videos and songs can&apos;t be changed after posting.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={pending || text.length > POST_MAX_LENGTH}>
            {pending && <Spinner />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
