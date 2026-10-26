import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertKindAllowed, saveLocalUpload, UPLOAD_PURPOSES, type UploadPurpose } from "@/lib/media";
import { toMediaDTO } from "@/lib/posts";
import { UserError } from "@/lib/action";
import type { MediaKind } from "@prisma/client";

const num = (v: FormDataEntryValue | null) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

/** Development-only upload endpoint used when Cloudinary isn't configured. */
export async function POST(request: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind")) as MediaKind;
  const purpose = String(form.get("purpose")) as UploadPurpose;
  if (!(file instanceof File) || !["IMAGE", "VIDEO", "AUDIO"].includes(kind) || !UPLOAD_PURPOSES.includes(purpose)) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  try {
    assertKindAllowed(kind, purpose);
    const media = await saveLocalUpload(me.id, kind, file, {
      width: num(form.get("width")),
      height: num(form.get("height")),
      duration: num(form.get("duration")),
    });
    return NextResponse.json({ media: toMediaDTO(media), flagged: false, sensitive: false });
  } catch (error) {
    if (error instanceof UserError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
