-- Parents may only see homework assigned to their own children, and only those children's completions.
-- Paste this in the Supabase SQL Editor for each project that is already live.

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
        AND (
          ("studentId" IS NOT NULL AND "studentId" IN (SELECT public.parent_student_ids()))
          OR "classId" IN (SELECT public.parent_class_ids())
        )
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.current_tenant_id()
    AND public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
  );

DROP POLICY IF EXISTS homework_completion_isolation ON "HomeworkCompletion";
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
        AND "studentId" IN (SELECT public.parent_student_ids())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Homework"
      WHERE "Homework".id = "HomeworkCompletion"."homeworkId"
        AND "Homework"."tenantId" = public.current_tenant_id()
    )
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
      OR (
        public.current_app_role() = 'PARENT'
        AND "studentId" IN (SELECT public.parent_student_ids())
      )
    )
  );

-- Demo-only cleanup: keep Amina Hassan's Hassan children, unlink other sample kids.
UPDATE "Student"
SET "parentId" = NULL
WHERE id LIKE 'sample-noor-%'
  AND id NOT LIKE 'sample-noor-hassan-%'
  AND "parentId" IN (
    SELECT p.id
    FROM "User" p
    JOIN "Tenant" t ON t.id = p."tenantId"
    WHERE t.slug = 'noor'
      AND lower(p.email) = 'parent@noor.dugsi'
  );
