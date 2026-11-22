-- Subjects this dugsi offers, and a teacher for each subject by class.
-- Paste this in the staging Supabase SQL Editor, then paste it again in production.

CREATE TABLE IF NOT EXISTS "TenantSubject" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "subjectKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("tenantId", "subjectKey")
);

CREATE INDEX IF NOT EXISTS "TenantSubject_tenantId_idx" ON "TenantSubject"("tenantId");

CREATE TABLE IF NOT EXISTS "ClassSubjectTeacher" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "subjectKey" TEXT NOT NULL,
    "teacherId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("tenantId", "classId", "subjectKey")
);

CREATE INDEX IF NOT EXISTS "ClassSubjectTeacher_tenantId_idx" ON "ClassSubjectTeacher"("tenantId");
CREATE INDEX IF NOT EXISTS "ClassSubjectTeacher_teacherId_idx" ON "ClassSubjectTeacher"("teacherId");

DROP TRIGGER IF EXISTS class_subject_teacher_updated_at ON "ClassSubjectTeacher";
CREATE TRIGGER class_subject_teacher_updated_at
  BEFORE UPDATE ON "ClassSubjectTeacher"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE "TenantSubject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassSubjectTeacher" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_subject_isolation ON "TenantSubject";
CREATE POLICY tenant_subject_isolation ON "TenantSubject"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PARENT', 'PLATFORM')
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  );

DROP POLICY IF EXISTS class_subject_teacher_isolation ON "ClassSubjectTeacher";
CREATE POLICY class_subject_teacher_isolation ON "ClassSubjectTeacher"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR "teacherId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON "TenantSubject" TO authenticated;
GRANT ALL ON "TenantSubject" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ClassSubjectTeacher" TO authenticated;
GRANT ALL ON "ClassSubjectTeacher" TO service_role;
