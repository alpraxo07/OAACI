import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { consumeToken, promoteIfAdminEmail } from "@/lib/auth/accounts";

export const metadata: Metadata = { title: "Confirm email" };

async function confirm(token: string): Promise<{ ok: boolean; message: string }> {
  const row = await db.token.findUnique({ where: { tokenHash: sha256(token) }, select: { type: true } });
  if (row?.type === "VERIFY_EMAIL") {
    const t = await consumeToken(token, "VERIFY_EMAIL");
    if (!t) return { ok: false, message: "This link has expired or was already used." };
    const user = await db.user.update({ where: { id: t.userId }, data: { emailVerifiedAt: new Date() } });
    await promoteIfAdminEmail(user.id, user.email);
    return { ok: true, message: "Your email is confirmed. You can now post, comment and message other artists." };
  }
  if (row?.type === "CHANGE_EMAIL") {
    const t = await consumeToken(token, "CHANGE_EMAIL");
    if (!t?.data) return { ok: false, message: "This link has expired or was already used." };
    if (await db.user.count({ where: { email: t.data, NOT: { id: t.userId } } })) {
      return { ok: false, message: "That email address is now used by another account." };
    }
    const user = await db.user.update({ where: { id: t.userId }, data: { email: t.data, emailVerifiedAt: new Date() } });
    await promoteIfAdminEmail(user.id, user.email);
    return { ok: true, message: `Your email is now ${t.data}.` };
  }
  return { ok: false, message: "This link is invalid. It may have expired or been replaced by a newer one." };
}

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token } = await searchParams;
  const result = typeof token === "string" && token ? await confirm(token) : { ok: false, message: "This link is missing its token." };

  return (
    <div className="text-center">
      <div className={`mx-auto mb-4 inline-flex rounded-full p-4 ${result.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
        {result.ok ? <CircleCheck className="h-8 w-8" /> : <CircleX className="h-8 w-8" />}
      </div>
      <h1 className="font-display text-3xl font-semibold">{result.ok ? "Email confirmed" : "Couldn't confirm email"}</h1>
      <p className="mt-2 text-muted">{result.message}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Go to OAACI
        </Link>
        {!result.ok && (
          <Link href="/settings/account" className="btn btn-secondary">
            Resend link
          </Link>
        )}
      </div>
    </div>
  );
}
