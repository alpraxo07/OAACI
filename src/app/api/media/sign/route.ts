import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getUploadTarget, UPLOAD_PURPOSES } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { UserError } from "@/lib/action";

const bodySchema = z.object({ kind: z.enum(["IMAGE", "VIDEO", "AUDIO"]), purpose: z.enum(UPLOAD_PURPOSES) });

/** Tells the browser where (and with which signature) to upload a file. */
export async function POST(request: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (!me.contactVerified) return NextResponse.json({ error: "Please verify your email first." }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    await rateLimit(`upload:${me.id}`, 60, 3600);
    return NextResponse.json(getUploadTarget(parsed.data.kind, parsed.data.purpose));
  } catch (error) {
    if (error instanceof UserError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
