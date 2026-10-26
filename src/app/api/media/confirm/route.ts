import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { confirmCloudinaryUpload } from "@/lib/media";
import { toMediaDTO } from "@/lib/posts";
import { UserError } from "@/lib/action";

const bodySchema = z.object({
  kind: z.enum(["IMAGE", "VIDEO", "AUDIO"]),
  result: z.object({
    public_id: z.string().max(300),
    version: z.number(),
    signature: z.string().max(100),
    resource_type: z.string(),
    format: z.string().optional(),
    bytes: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
  }),
});

/** Verifies a finished Cloudinary upload and records it. */
export async function POST(request: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  try {
    const media = await confirmCloudinaryUpload(me.id, parsed.data.kind, parsed.data.result);
    return NextResponse.json({ media: toMediaDTO(media), flagged: media.flagged, sensitive: media.sensitive });
  } catch (error) {
    if (error instanceof UserError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
