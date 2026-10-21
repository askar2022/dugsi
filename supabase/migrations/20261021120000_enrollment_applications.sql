-- Public enrollment applications. Paste this in the staging Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS "EnrollmentApplication" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "parentName" TEXT NOT NULL,
    "parentEmail" TEXT NOT NULL,
    "parentPhone" TEXT,
    "address" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "age" INTEGER,
    "dateOfBirth" TEXT,
    "gender" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "studentId" TEXT REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "EnrollmentApplication_tenantId_status_idx"
  ON "EnrollmentApplication"("tenantId", "status");

ALTER TABLE "EnrollmentApplication" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS application_isolation ON "EnrollmentApplication";
CREATE POLICY application_isolation ON "EnrollmentApplication"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON "EnrollmentApplication" TO authenticated;
GRANT ALL ON "EnrollmentApplication" TO service_role;
