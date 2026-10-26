// Gives an existing account the admin role.
// Usage: npm run make-admin -- someone@example.com   (or a username)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const who = process.argv[2]?.trim().toLowerCase();
  if (!who) {
    console.error("Usage: npm run make-admin -- <email or username>");
    process.exit(1);
  }
  const user = await db.user.findFirst({ where: who.includes("@") ? { email: who } : { username: who.replace(/^@/, "") } });
  if (!user) {
    console.error(`No account found for "${who}". Sign up first, then run this again.`);
    process.exit(1);
  }
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`@${user.username} is now an admin.`);
}

main().finally(() => db.$disconnect());
