"use server";

import { db } from "@/lib/db";
import { run, type ActionResult } from "@/lib/action";
import { actionUser } from "@/lib/auth/session";

export async function markAllNotificationsRead(): Promise<ActionResult> {
  return run(async () => {
    const me = await actionUser();
    await db.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
    return null;
  });
}
