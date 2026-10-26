"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

type Toast = { id: number; message: string; type: "success" | "error" | "info" };

const listeners = new Set<(t: Toast) => void>();
let counter = 0;

/** Shows a short message at the bottom of the screen. */
export function toast(message: string, type: Toast["type"] = "info") {
  const t = { id: ++counter, message, type };
  listeners.forEach((l) => l(t));
}
toast.success = (m: string) => toast(m, "success");
toast.error = (m: string) => toast(m, "error");

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const add = (t: Toast) => {
      setToasts((prev) => [...prev.slice(-2), t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="animate-fade-in pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl bg-fg px-4 py-3 text-sm text-bg shadow-lg"
        >
          {t.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
          {t.type === "error" && <CircleAlert className="h-4 w-4 shrink-0 text-danger" />}
          <span>{t.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="ml-1 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
