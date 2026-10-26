import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/** An error whose message is safe to show to the user. */
export class UserError extends Error {}

/**
 * Wraps a server action body so that expected failures come back as
 * `{ ok: false, error }` instead of crashing the page.
 */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof UserError) return { ok: false, error: error.message };
    if (error instanceof ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
