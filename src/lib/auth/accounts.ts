import "server-only";
import { Prisma, type TokenType } from "@prisma/client";
import { db } from "../db";
import { env } from "../env";
import { randomToken, sha256 } from "../crypto";
import { UserError } from "../action";
import { getSettings } from "../settings";
import { emails } from "../mail";

const TOKEN_TTL: Record<TokenType, number> = {
  VERIFY_EMAIL: 48 * 3600,
  RESET_PASSWORD: 3600,
  CHANGE_EMAIL: 48 * 3600,
};

export async function createToken(userId: string, type: TokenType, data?: string): Promise<string> {
  const token = randomToken();
  await db.token.deleteMany({ where: { userId, type, usedAt: null } });
  await db.token.create({
    data: {
      userId,
      type,
      tokenHash: sha256(token),
      data: data ?? null,
      expiresAt: new Date(Date.now() + TOKEN_TTL[type] * 1000),
    },
  });
  return token;
}

/** Marks a token used and returns it, or null if it's unknown, used or expired. */
export async function consumeToken(token: string, type: TokenType) {
  const row = await db.token.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  const updated = await db.token.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return updated.count === 1 ? row : null;
}

export async function sendVerificationEmail(user: { id: string; email: string; name: string }) {
  const token = await createToken(user.id, "VERIFY_EMAIL");
  await emails.verify(user.email, user.name, `${env.appUrl}/verify-email?token=${token}`);
}

/** Emails listed in ADMIN_EMAILS become admins once the address is verified. */
export async function promoteIfAdminEmail(userId: string, email: string | null) {
  if (email && env.adminEmails.includes(email.toLowerCase())) {
    await db.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
  }
}

export type NewAccount = {
  name: string;
  username: string;
  dateOfBirth: Date;
  email?: string | null;
  emailVerified?: boolean;
  phone?: string | null;
  passwordHash?: string | null;
  googleId?: string | null;
  avatarUrl?: string | null;
  inviteCode?: string | null;
};

/** Creates an account, enforcing invite-only mode and uniqueness. */
export async function createAccount(input: NewAccount) {
  const settings = await getSettings();
  const code = input.inviteCode?.trim().toUpperCase() || null;
  const isAdminEmail = Boolean(input.email && env.adminEmails.includes(input.email));
  const needsInvite = settings.inviteOnly && !isAdminEmail;

  if (input.email && (await db.user.count({ where: { email: input.email } }))) {
    throw new UserError("An account with this email already exists. Try logging in.");
  }
  if (await db.user.count({ where: { username: input.username } })) {
    throw new UserError("That username is taken. Please choose another.");
  }

  try {
    return await db.$transaction(async (tx) => {
      let invite: { id: string; createdById: string | null } | null = null;
      if (code) {
        invite = await tx.invite.findUnique({ where: { code }, select: { id: true, createdById: true } });
        const claimed = invite
          ? await tx.invite.updateMany({
              where: {
                id: invite.id,
                disabled: false,
                usedCount: { lt: tx.invite.fields.maxUses },
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
              data: { usedCount: { increment: 1 } },
            })
          : { count: 0 };
        if (claimed.count !== 1) {
          if (needsInvite) throw new UserError("That invite code isn't valid or has already been used.");
          invite = null;
        }
      } else if (needsInvite) {
        throw new UserError("OAACI is invite-only right now. Please enter your invite code.");
      }

      return tx.user.create({
        data: {
          name: input.name,
          username: input.username,
          dateOfBirth: input.dateOfBirth,
          email: input.email ?? null,
          emailVerifiedAt: input.emailVerified ? new Date() : null,
          phone: input.phone ?? null,
          phoneVerifiedAt: input.phone ? new Date() : null,
          passwordHash: input.passwordHash ?? null,
          googleId: input.googleId ?? null,
          avatarUrl: input.avatarUrl ?? null,
          role: input.emailVerified && isAdminEmail ? "ADMIN" : "USER",
          inviteId: invite?.id ?? null,
          invitedById: invite?.createdById ?? null,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new UserError("That username, email or phone number is already in use.");
    }
    throw error;
  }
}

/** Login check for everyone: banned accounts are refused, deactivated ones come back. */
export async function assertCanLogIn(user: { id: string; bannedAt: Date | null; banReason: string | null; deactivatedAt: Date | null }) {
  if (user.bannedAt) {
    throw new UserError(`This account has been suspended${user.banReason ? `: ${user.banReason}` : "."}`);
  }
  if (user.deactivatedAt) {
    await db.user.update({ where: { id: user.id }, data: { deactivatedAt: null } });
  }
}
