"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env, phoneLoginEnabled } from "@/lib/env";
import { run, UserError, type ActionResult } from "@/lib/action";
import { hashPassword, otpCode, sha256, safeEqual, verifyPassword } from "@/lib/crypto";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { actionUser, createSession, destroySession } from "@/lib/auth/session";
import {
  assertCanLogIn,
  consumeToken,
  createAccount,
  createToken,
  sendVerificationEmail,
} from "@/lib/auth/accounts";
import { clearPendingSignup, getPendingSignup, setPendingSignup } from "@/lib/auth/pending";
import { emails } from "@/lib/mail";
import { sendSms } from "@/lib/sms";
import { dobSchema, emailSchema, nameSchema, passwordSchema, phoneSchema, urlSchema, usernameSchema } from "@/lib/validation";

/** Only allow redirects to paths on this site. */
function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

const signupSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  dateOfBirth: dobSchema,
  inviteCode: z.string().trim().max(32).optional(),
  agree: z.literal(true, { message: "Please accept the terms and community guidelines." }),
});

export async function signUp(input: z.input<typeof signupSchema>): Promise<ActionResult> {
  const result = await run(async () => {
    await rateLimit(`signup:${await clientIp()}`, 10, 3600);
    const data = signupSchema.parse(input);
    const user = await createAccount({
      name: data.name,
      username: data.username,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      dateOfBirth: data.dateOfBirth,
      inviteCode: data.inviteCode,
    });
    await sendVerificationEmail({ id: user.id, email: data.email, name: data.name });
    await createSession(user.id);
    return null;
  });
  if (result.ok) redirect("/welcome");
  return result;
}

const loginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export async function logIn(input: z.input<typeof loginSchema>): Promise<ActionResult> {
  const result = await run(async () => {
    const data = loginSchema.parse(input);
    await rateLimit(`login:${await clientIp()}`, 30, 900);
    await rateLimit(`login-id:${data.identifier}`, 10, 900);
    const identifier = data.identifier.replace(/^@/, "");
    const user = await db.user.findFirst({
      where: identifier.includes("@") ? { email: identifier } : { username: identifier },
    });
    const ok = user?.passwordHash ? await verifyPassword(data.password, user.passwordHash) : false;
    if (!user || !ok) {
      if (user && !user.passwordHash) {
        throw new UserError("This account uses Google or phone login. Use that option, or reset your password.");
      }
      throw new UserError("Incorrect email/username or password.");
    }
    await assertCanLogIn(user);
    await createSession(user.id);
    return safeNext(data.next);
  });
  if (result.ok) redirect(result.data);
  return result;
}

export async function logOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function resendVerification(): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    await rateLimit(`resend-verify:${me.id}`, 3, 3600);
    const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!user.email) throw new UserError("Add an email address in Settings first.");
    if (user.emailVerifiedAt) throw new UserError("Your email is already verified.");
    await sendVerificationEmail({ id: user.id, email: user.email, name: user.name });
    return null;
  });
}

export async function requestPasswordReset(input: { email: string }): Promise<ActionResult> {
  return run(async () => {
    const email = emailSchema.parse(input.email);
    await rateLimit(`reset:${await clientIp()}`, 10, 3600);
    await rateLimit(`reset-email:${email}`, 3, 3600);
    const user = await db.user.findUnique({ where: { email } });
    if (user && !user.bannedAt) {
      const token = await createToken(user.id, "RESET_PASSWORD");
      await emails.reset(email, `${env.appUrl}/reset-password?token=${token}`);
    }
    return null;
  });
}

export async function resetPassword(input: { token: string; password: string }): Promise<ActionResult> {
  const result = await run(async () => {
    const password = passwordSchema.parse(input.password);
    await rateLimit(`reset-submit:${await clientIp()}`, 20, 3600);
    const token = await consumeToken(input.token, "RESET_PASSWORD");
    if (!token) throw new UserError("This reset link is invalid or has expired. Please request a new one.");
    const user = await db.user.update({
      where: { id: token.userId },
      data: { passwordHash: await hashPassword(password) },
    });
    await db.session.deleteMany({ where: { userId: user.id } });
    await assertCanLogIn(user);
    await createSession(user.id);
    return null;
  });
  if (result.ok) redirect("/");
  return result;
}

// ─── Phone OTP ──────────────────────────────────────────────────────────

export async function sendPhoneCode(input: { phone: string }): Promise<ActionResult<{ phone: string }>> {
  return run(async () => {
    if (!phoneLoginEnabled()) throw new UserError("Phone login isn't available right now.");
    const phone = phoneSchema.parse(input.phone);
    await rateLimit(`otp-ip:${await clientIp()}`, 10, 3600);
    await rateLimit(`otp-phone:${phone}`, 3, 600);
    const code = otpCode();
    await db.phoneOtp.create({
      data: { phone, codeHash: sha256(`${phone}:${code}`), expiresAt: new Date(Date.now() + 10 * 60_000) },
    });
    await sendSms(phone, `${code} is your OAACI verification code. It expires in 10 minutes. Don't share it with anyone.`);
    return { phone };
  });
}

export async function verifyPhoneCode(input: { phone: string; code: string; next?: string }): Promise<ActionResult> {
  const result = await run(async () => {
    const phone = phoneSchema.parse(input.phone);
    const code = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.").parse(input.code);
    await rateLimit(`otp-verify:${await clientIp()}`, 30, 3600);
    const otp = await db.phoneOtp.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) throw new UserError("That code has expired. Please request a new one.");
    if (otp.attempts >= 5) throw new UserError("Too many wrong attempts. Please request a new code.");
    if (!safeEqual(otp.codeHash, sha256(`${phone}:${code}`))) {
      await db.phoneOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new UserError("That code is incorrect.");
    }
    await db.phoneOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    const user = await db.user.findUnique({ where: { phone } });
    if (user) {
      await assertCanLogIn(user);
      await createSession(user.id);
      return safeNext(input.next);
    }
    await setPendingSignup({ provider: "phone", phone });
    return "/signup/complete";
  });
  if (result.ok) redirect(result.data);
  return result;
}

// ─── Finishing a Google / phone sign-up ────────────────────────────────

const completeSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  dateOfBirth: dobSchema,
  inviteCode: z.string().trim().max(32).optional(),
  agree: z.literal(true, { message: "Please accept the terms and community guidelines." }),
});

export async function completeSignup(input: z.input<typeof completeSchema>): Promise<ActionResult> {
  const result = await run(async () => {
    const pending = await getPendingSignup();
    if (!pending) throw new UserError("Your sign-up session expired. Please start again.");
    const data = completeSchema.parse(input);
    await rateLimit(`signup:${await clientIp()}`, 10, 3600);
    const user = await createAccount({
      name: data.name,
      username: data.username,
      dateOfBirth: data.dateOfBirth,
      inviteCode: data.inviteCode,
      ...(pending.provider === "google"
        ? { googleId: pending.googleId, email: pending.email, emailVerified: Boolean(pending.email), avatarUrl: pending.picture }
        : { phone: pending.phone }),
    });
    await clearPendingSignup();
    await createSession(user.id);
    return null;
  });
  if (result.ok) redirect("/welcome");
  return result;
}

// ─── Waitlist ───────────────────────────────────────────────────────────

const waitlistSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  portfolioUrl: urlSchema.optional(),
  message: z.string().trim().max(500, "Please keep it under 500 characters.").optional(),
});

export async function joinWaitlist(input: z.input<typeof waitlistSchema>): Promise<ActionResult> {
  return run(async () => {
    await rateLimit(`waitlist:${await clientIp()}`, 5, 3600);
    const data = waitlistSchema.parse(input);
    if (await db.user.count({ where: { email: data.email } })) {
      throw new UserError("You already have an account. Please log in.");
    }
    await db.waitlistEntry.upsert({
      where: { email: data.email },
      create: { name: data.name, email: data.email, portfolioUrl: data.portfolioUrl || null, message: data.message || null },
      update: { name: data.name, portfolioUrl: data.portfolioUrl || null, message: data.message || null },
    });
    return null;
  });
}
