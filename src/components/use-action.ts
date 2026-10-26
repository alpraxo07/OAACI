"use client";

import { useCallback, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action";

/**
 * Calls a server action inside a transition and keeps track of the pending
 * state and the last error message.
 */
export function useAction<Args extends unknown[], T>(fn: (...args: Args) => Promise<ActionResult<T>>) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    (...args: Args) =>
      new Promise<ActionResult<T> | undefined>((resolve) => {
        startTransition(async () => {
          setError(null);
          try {
            const result = await fn(...args);
            if (result && !result.ok) setError(result.error);
            resolve(result);
          } catch (e) {
            // Redirects thrown by the action are handled by Next.js navigation.
            if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) return resolve(undefined);
            setError("Something went wrong. Please check your connection and try again.");
            resolve(undefined);
          }
        });
      }),
    [fn],
  );

  return { execute, pending, error, setError };
}
