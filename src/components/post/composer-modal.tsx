"use client";

import { useCompose } from "@/components/providers";
import { Modal } from "@/components/ui/modal";
import { Composer } from "./composer";

export function ComposerModal() {
  const { open, setOpen } = useCompose();
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Create a post" wide>
      <Composer autoFocus onPosted={() => setOpen(false)} className="border-b-0" />
    </Modal>
  );
}
