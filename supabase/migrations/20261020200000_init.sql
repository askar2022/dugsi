-- Dugsi schema + tenant RLS. Applied with `supabase db push` per environment.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TABLE "Tenant" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'active',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "welcomeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");

CREATE TABLE "Staff" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "userId" TEXT UNIQUE REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "title" TEXT NOT NULL,
    "startDate" TEXT,
    "salary" DOUBLE PRECISION,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Staff_tenantId_idx" ON "Staff"("tenantId");

CREATE TABLE "Class" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "dayOfWeek" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "room" TEXT,
    "teacherId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Class_tenantId_idx" ON "Class"("tenantId");

CREATE TABLE "Student" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TEXT,
    "gender" TEXT,
    "parentId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "classId" TEXT REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Student_tenantId_idx" ON "Student"("tenantId");
CREATE INDEX "Student_tenantId_parentId_idx" ON "Student"("tenantId", "parentId");

CREATE TABLE "Attendance" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Attendance_tenantId_idx" ON "Attendance"("tenantId");
CREATE UNIQUE INDEX "Attendance_tenantId_studentId_classId_date_key"
  ON "Attendance"("tenantId", "studentId", "classId", "date");

CREATE TABLE "Homework" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedDate" TEXT NOT NULL,
    "dueDate" TEXT,
    "assignedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Homework_tenantId_idx" ON "Homework"("tenantId");

CREATE TABLE "HomeworkCompletion" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "homeworkId" TEXT NOT NULL REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "HomeworkCompletion_homeworkId_studentId_key"
  ON "HomeworkCompletion"("homeworkId", "studentId");

CREATE TABLE "QuranProgress" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "surah" TEXT NOT NULL,
    "ayahFrom" INTEGER NOT NULL,
    "ayahTo" INTEGER NOT NULL,
    "juz" INTEGER,
    "notes" TEXT,
    "date" TEXT NOT NULL,
    "recordedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "QuranProgress_tenantId_studentId_idx" ON "QuranProgress"("tenantId", "studentId");

CREATE TABLE "Invoice" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "parentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TEXT NOT NULL,
    "paidDate" TEXT,
    "status" TEXT NOT NULL,
    "period" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

CREATE TABLE "Expense" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "vendor" TEXT,
    "description" TEXT,
    "staffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Expense_tenantId_idx" ON "Expense"("tenantId");

CREATE TABLE "EmailLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'logged',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "EmailLog_tenantId_idx" ON "EmailLog"("tenantId");

CREATE TRIGGER tenant_updated_at BEFORE UPDATE ON "Tenant" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER staff_updated_at BEFORE UPDATE ON "Staff" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER class_updated_at BEFORE UPDATE ON "Class" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER student_updated_at BEFORE UPDATE ON "Student" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER homework_completion_updated_at BEFORE UPDATE ON "HomeworkCompletion" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER invoice_updated_at BEFORE UPDATE ON "Invoice" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', ''),
    (SELECT "tenantId" FROM "User" WHERE id = auth.uid()::text)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    (SELECT role FROM "User" WHERE id = auth.uid()::text),
    ''
  );
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, PUBLIC;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated, service_role;

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Homework" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HomeworkCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuranProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Tenant"
  FOR ALL TO authenticated
  USING (id = public.current_tenant_id() OR public.current_app_role() = 'PLATFORM')
  WITH CHECK (id = public.current_tenant_id() OR public.current_app_role() = 'PLATFORM');

CREATE POLICY user_isolation ON "User"
  FOR ALL TO authenticated
  USING (
    id = auth.uid()::text
    OR public.current_app_role() = 'PLATFORM'
    OR (
      "tenantId" = public.current_tenant_id()
      AND public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PARENT')
    )
  )
  WITH CHECK (
    id = auth.uid()::text
    OR (
      "tenantId" = public.current_tenant_id()
      AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
    )
  );

CREATE POLICY staff_isolation ON "Staff"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  );

CREATE POLICY class_isolation ON "Class"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR "teacherId" = auth.uid()::text
      OR (
        public.current_app_role() = 'PARENT'
        AND id IN (
          SELECT "classId" FROM "Student"
          WHERE "parentId" = auth.uid()::text
            AND "tenantId" = public.current_tenant_id()
            AND "classId" IS NOT NULL
        )
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  );

CREATE POLICY student_isolation ON "Student"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR (public.current_app_role() = 'PARENT' AND "parentId" = auth.uid()::text)
      OR (
        public.current_app_role() = 'TEACHER'
        AND "classId" IN (
          SELECT id FROM "Class"
          WHERE "teacherId" = auth.uid()::text
            AND "tenantId" = public.current_tenant_id()
        )
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR (public.current_app_role() = 'PARENT' AND "parentId" = auth.uid()::text)
    )
  );

CREATE POLICY attendance_isolation ON "Attendance"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR (
        public.current_app_role() = 'TEACHER'
        AND "classId" IN (
          SELECT id FROM "Class"
          WHERE "teacherId" = auth.uid()::text
            AND "tenantId" = public.current_tenant_id()
        )
      )
      OR (
        public.current_app_role() = 'PARENT'
        AND "studentId" IN (
          SELECT id FROM "Student"
          WHERE "parentId" = auth.uid()::text
            AND "tenantId" = public.current_tenant_id()
        )
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
  );

CREATE POLICY homework_isolation ON "Homework"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR (
        public.current_app_role() = 'TEACHER'
        AND "classId" IN (
          SELECT id FROM "Class"
          WHERE "teacherId" = auth.uid()::text
            AND "tenantId" = public.current_tenant_id()
        )
      )
      OR (
        public.current_app_role() = 'PARENT'
        AND "classId" IN (
          SELECT "classId" FROM "Student"
          WHERE "parentId" = auth.uid()::text
            AND "tenantId" = public.current_tenant_id()
            AND "classId" IS NOT NULL
        )
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
  );

CREATE POLICY homework_completion_isolation ON "HomeworkCompletion"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Homework"
      WHERE "Homework".id = "HomeworkCompletion"."homeworkId"
        AND "Homework"."tenantId" = public.current_tenant_id()
    )
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
      OR (
        public.current_app_role() = 'PARENT'
        AND "studentId" IN (
          SELECT id FROM "Student"
          WHERE "parentId" = auth.uid()::text
            AND "tenantId" = public.current_tenant_id()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Homework"
      WHERE "Homework".id = "HomeworkCompletion"."homeworkId"
        AND "Homework"."tenantId" = public.current_tenant_id()
    )
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
  );

CREATE POLICY progress_isolation ON "QuranProgress"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR (
        public.current_app_role() = 'TEACHER'
        AND "studentId" IN (
          SELECT id FROM "Student"
          WHERE "classId" IN (
            SELECT id FROM "Class"
            WHERE "teacherId" = auth.uid()::text
              AND "tenantId" = public.current_tenant_id()
          )
        )
      )
      OR (
        public.current_app_role() = 'PARENT'
        AND "studentId" IN (
          SELECT id FROM "Student"
          WHERE "parentId" = auth.uid()::text
            AND "tenantId" = public.current_tenant_id()
        )
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
  );

CREATE POLICY invoice_isolation ON "Invoice"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR (public.current_app_role() = 'PARENT' AND "parentId" = auth.uid()::text)
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  );

CREATE POLICY expense_isolation ON "Expense"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  );

CREATE POLICY email_isolation ON "EmailLog"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  );
