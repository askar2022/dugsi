-- Break Class <-> Student policy loops. Paste this in the staging Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.teacher_class_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM "Class"
  WHERE "teacherId" = auth.uid()::text
    AND "tenantId" = public.current_tenant_id();
$$;

CREATE OR REPLACE FUNCTION public.parent_class_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "classId" FROM "Student"
  WHERE "parentId" = auth.uid()::text
    AND "tenantId" = public.current_tenant_id()
    AND "classId" IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.parent_student_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM "Student"
  WHERE "parentId" = auth.uid()::text
    AND "tenantId" = public.current_tenant_id();
$$;

CREATE OR REPLACE FUNCTION public.teacher_student_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM "Student"
  WHERE "classId" IN (SELECT public.teacher_class_ids())
    AND "tenantId" = public.current_tenant_id();
$$;

GRANT EXECUTE ON FUNCTION public.teacher_class_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.parent_class_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.parent_student_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_student_ids() TO authenticated, service_role;

DROP POLICY IF EXISTS class_isolation ON "Class";
CREATE POLICY class_isolation ON "Class"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR "teacherId" = auth.uid()::text
      OR (
        public.current_app_role() = 'PARENT'
        AND id IN (SELECT public.parent_class_ids())
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
  );

DROP POLICY IF EXISTS student_isolation ON "Student";
CREATE POLICY student_isolation ON "Student"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR (public.current_app_role() = 'PARENT' AND "parentId" = auth.uid()::text)
      OR (
        public.current_app_role() = 'TEACHER'
        AND "classId" IN (SELECT public.teacher_class_ids())
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

DROP POLICY IF EXISTS attendance_isolation ON "Attendance";
CREATE POLICY attendance_isolation ON "Attendance"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR (
        public.current_app_role() = 'TEACHER'
        AND "classId" IN (SELECT public.teacher_class_ids())
      )
      OR (
        public.current_app_role() = 'PARENT'
        AND "studentId" IN (SELECT public.parent_student_ids())
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
  );

DROP POLICY IF EXISTS homework_isolation ON "Homework";
CREATE POLICY homework_isolation ON "Homework"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR (
        public.current_app_role() = 'TEACHER'
        AND "classId" IN (SELECT public.teacher_class_ids())
      )
      OR (
        public.current_app_role() = 'PARENT'
        AND "classId" IN (SELECT public.parent_class_ids())
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
  );

DROP POLICY IF EXISTS progress_isolation ON "QuranProgress";
CREATE POLICY progress_isolation ON "QuranProgress"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.current_tenant_id()
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'PLATFORM')
      OR (
        public.current_app_role() = 'TEACHER'
        AND "studentId" IN (SELECT public.teacher_student_ids())
      )
      OR (
        public.current_app_role() = 'PARENT'
        AND "studentId" IN (SELECT public.parent_student_ids())
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
  );
