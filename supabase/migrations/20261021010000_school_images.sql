-- Paste this into the staging Supabase SQL Editor (dugsi-stage), then production later.
-- Private school photos live under {tenantId}/profile.* so one dugsi cannot see another.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-images',
  'school-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS school_images_select ON storage.objects;
DROP POLICY IF EXISTS school_images_insert ON storage.objects;
DROP POLICY IF EXISTS school_images_update ON storage.objects;
DROP POLICY IF EXISTS school_images_delete ON storage.objects;

CREATE POLICY school_images_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'school-images'
    AND split_part(name, '/', 1) = public.current_tenant_id()
  );

CREATE POLICY school_images_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'school-images'
    AND split_part(name, '/', 1) = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF')
  );

CREATE POLICY school_images_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'school-images'
    AND split_part(name, '/', 1) = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF')
  )
  WITH CHECK (
    bucket_id = 'school-images'
    AND split_part(name, '/', 1) = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF')
  );

CREATE POLICY school_images_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'school-images'
    AND split_part(name, '/', 1) = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF')
  );
