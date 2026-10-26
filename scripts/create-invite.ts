// Creates invite codes from the command line (handy for the very first sign-ups).
// Usage: npm run create-invite -- [count] [usesPerCode]
import { randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(0, ALPHABET.length)]).join("");

async function main() {
  const count = Math.min(Number(process.argv[2]) || 1, 100);
  const maxUses = Math.max(Number(process.argv[3]) || 1, 1);
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const invite = await db.invite.create({ data: { code: code(), maxUses, note: "Created from the command line" } });
    codes.push(invite.code);
  }
  console.log(`Created ${codes.length} invite code(s), ${maxUses} use(s) each:\n${codes.join("\n")}`);
}

main().finally(() => db.$disconnect());
