import { z } from "zod";
import {
  BIO_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
  HEADLINE_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  MIN_AGE,
  POST_MAX_LENGTH,
  RESERVED_USERNAMES,
} from "./constants";
import { containsProfanity } from "./profanity";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(20, "Username can be at most 20 characters.")
  .regex(/^[a-z0-9_]+$/, "Username can only contain letters, numbers and underscores.")
  .refine((u) => !/^\d+$/.test(u), "Username can't be only numbers.")
  .refine((u) => !RESERVED_USERNAMES.has(u), "That username is reserved.")
  .refine((u) => !containsProfanity(u), "Please choose a different username.");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Please enter your name.")
  .max(50, "Name can be at most 50 characters.")
  .refine((n) => !containsProfanity(n), "Please use a different name.");

export const emailSchema = z.string().trim().toLowerCase().max(254).email("Please enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.");

export const phoneSchema = z
  .string()
  .trim()
  .transform((p) => p.replace(/[\s()-]/g, ""))
  .transform((p) => (/^\d{10}$/.test(p) ? `+91${p}` : p.startsWith("91") && p.length === 12 ? `+${p}` : p))
  .refine((p) => /^\+[1-9]\d{7,14}$/.test(p), "Please enter a valid phone number, e.g. 98765 43210.");

export function ageOn(dob: Date, on = new Date()): number {
  let age = on.getFullYear() - dob.getFullYear();
  const m = on.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < dob.getDate())) age--;
  return age;
}

export const dobSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter your date of birth.")
  .transform((s) => new Date(`${s}T00:00:00Z`))
  .refine((d) => !Number.isNaN(d.getTime()), "Please enter a valid date of birth.")
  .refine((d) => ageOn(d) >= MIN_AGE, `You must be at least ${MIN_AGE} years old to join OAACI.`)
  .refine((d) => ageOn(d) <= 120, "Please enter a valid date of birth.");

export const urlSchema = z
  .string()
  .trim()
  .max(200, "Link is too long.")
  .transform((u) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u))
  .refine((u) => {
    if (!u) return true;
    try {
      const url = new URL(u);
      return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
    } catch {
      return false;
    }
  }, "Please enter a valid link.");

export const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be at most ${max} characters.`)
    .transform((s) => s || null);

export const postTextSchema = z.string().trim().max(POST_MAX_LENGTH, `Posts can be at most ${POST_MAX_LENGTH} characters.`);
export const commentTextSchema = z
  .string()
  .trim()
  .min(1, "Comment can't be empty.")
  .max(COMMENT_MAX_LENGTH, `Comments can be at most ${COMMENT_MAX_LENGTH} characters.`);
export const messageTextSchema = z.string().trim().max(MESSAGE_MAX_LENGTH, "Message is too long.");
export const headlineSchema = optionalText(HEADLINE_MAX_LENGTH, "Headline");
export const bioSchema = optionalText(BIO_MAX_LENGTH, "Bio");

export const idSchema = z.string().min(1).max(40);
