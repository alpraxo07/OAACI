import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { env } from "../env";
import { randomToken, sha256 } from "../crypto";
import { UserError } from "../action";

export const SESSION_COOKIE = "oaaci_session";
const SESSION_DAYS = 30;

const sessionUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
  phone: true,
  phoneVerifiedAt: true,
  passwordHash: true,
  avatarUrl: true,
  role: true,
  verified: true,
  dmPolicy: true,
  bannedAt: true,
  deactivatedAt: true,
} as const;

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: "USER" | "MODERATOR" | "ADMIN";
  verified: boolean;
  dmPolicy: "EVERYONE" | "FOLLOWING";
  hasPassword: boolean;
  /** Email or phone has been confirmed, so the user may post and message. */
  contactVerified: boolean;
  emailVerified: boolean;
  isStaff: boolean;
};

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 250) ?? null;
  await db.session.create({ data: { id: sha256(token), userId, expiresAt, userAgent } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    select: { expiresAt: true, user: { select: sessionUserSelect } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  if (u.bannedAt || u.deactivatedAt) return null;
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    role: u.role,
    verified: u.verified,
    dmPolicy: u.dmPolicy,
    hasPassword: Boolean(u.passwordHash),
    emailVerified: Boolean(u.emailVerifiedAt),
    contactVerified: Boolean(u.emailVerifiedAt || u.phoneVerifiedAt),
    isStaff: u.role === "ADMIN" || u.role === "MODERATOR",
  };
});

/** For pages: redirects to the login page when nobody is signed in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStaffPage(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isStaff) redirect("/");
  return user;
}

/** For server actions: throws a user-facing error instead of redirecting. */
export async function actionUser(opts: { verified?: boolean } = {}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UserError("Please log in first.");
  if (opts.verified && !user.contactVerified) {
    throw new UserError("Please verify your email address first. Check your inbox for the link.");
  }
  return user;
}

export async function actionStaff(): Promise<SessionUser> {
  const user = await actionUser();
  if (!user.isStaff) throw new UserError("You don't have permission to do that.");
  return user;
}

export async function actionAdmin(): Promise<SessionUser> {
  const user = await actionUser();
  if (user.role !== "ADMIN") throw new UserError("Only admins can do that.");
  return user;
}
