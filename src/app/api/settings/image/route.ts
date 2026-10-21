import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import {
  MAX_SCHOOL_IMAGE_BYTES,
  SCHOOL_IMAGE_BUCKET,
  SCHOOL_IMAGE_TYPES,
  removeSchoolImages,
  schoolImageExt,
  schoolImagePath,
  signedSchoolImageUrl,
} from "@/lib/supabase/school-image";

export async function POST(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN"]);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new ApiError("Choose a school image to upload.");
    }
    if (file.size > MAX_SCHOOL_IMAGE_BYTES) {
      throw new ApiError("Use an image smaller than 5 MB.");
    }
    const ext = schoolImageExt(file.type);
    if (!ext || !SCHOOL_IMAGE_TYPES.includes(file.type as (typeof SCHOOL_IMAGE_TYPES)[number])) {
      throw new ApiError("Use a JPG, PNG, or WebP image.");
    }
    const path = schoolImagePath(session.tenantId, ext);
    await removeSchoolImages(supabase, session.tenantId);
    const { error } = await supabase.storage.from(SCHOOL_IMAGE_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    throwIfError(error, "Could not save the school image.");
    const schoolImageUrl = await signedSchoolImageUrl(supabase, session.tenantId);
    return json({ schoolImageUrl });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN"]);
    await removeSchoolImages(supabase, session.tenantId);
    return json({ schoolImageUrl: null });
  } catch (err) {
    return handleApiError(err);
  }
}
