-- Parent demo: Amina Hassan sees only four children, with homework, attendance, and progress.
-- Paste this in the production (and staging) Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.homework_in_tenant(hid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Homework"
    WHERE id = hid AND "tenantId" = public.current_tenant_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.homework_in_tenant(text) TO authenticated, service_role;

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
    public.homework_in_tenant("homeworkId")
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
      OR (
        public.current_app_role() = 'PARENT'
        AND "studentId" IN (SELECT public.parent_student_ids())
      )
    )
  )
  WITH CHECK (
    public.homework_in_tenant("homeworkId")
    AND (
      public.current_app_role() IN ('ADMIN', 'STAFF', 'TEACHER', 'PLATFORM')
      OR (
        public.current_app_role() = 'PARENT'
        AND "studentId" IN (SELECT public.parent_student_ids())
      )
    )
  );

DO $$
DECLARE
  v_tenant text;
  v_parent text;
  v_due text;
  v_assigned text;
  v_sat text;
  v_week int;
BEGIN
  SELECT id INTO v_tenant FROM "Tenant" WHERE slug = 'noor';
  SELECT id INTO v_parent FROM "User"
    WHERE "tenantId" = v_tenant AND lower(email) = 'parent@noor.dugsi';
  IF v_tenant IS NULL OR v_parent IS NULL THEN
    RAISE NOTICE 'Noor parent demo skipped (school or parent login missing).';
    RETURN;
  END IF;

  INSERT INTO "Class" (id, "tenantId", name, level, "dayOfWeek", "startTime", "endTime", room)
  VALUES ('sample-noor-class', v_tenant, 'Weekend Quran', 'Mixed', 'Saturday', '09:00', '11:30', 'Main hall')
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name;

  INSERT INTO "Student" (id, "tenantId", "firstName", "lastName", gender, "classId", "parentId", status)
  VALUES
    ('sample-noor-hassan-1', v_tenant, 'Aisha', 'Hassan', 'girl', 'sample-noor-class', v_parent, 'enrolled'),
    ('sample-noor-hassan-2', v_tenant, 'Omar', 'Hassan', 'boy', 'sample-noor-class', v_parent, 'enrolled'),
    ('sample-noor-hassan-3', v_tenant, 'Maryam', 'Hassan', 'girl', 'sample-noor-class', v_parent, 'enrolled'),
    ('sample-noor-hassan-4', v_tenant, 'Ibrahim', 'Hassan', 'boy', 'sample-noor-class', v_parent, 'enrolled')
  ON CONFLICT (id) DO UPDATE
  SET "parentId" = EXCLUDED."parentId",
      "classId" = EXCLUDED."classId",
      status = 'enrolled',
      "firstName" = EXCLUDED."firstName",
      "lastName" = EXCLUDED."lastName",
      gender = EXCLUDED.gender;

  UPDATE "Student"
  SET "parentId" = NULL
  WHERE "tenantId" = v_tenant
    AND "parentId" = v_parent
    AND id NOT IN (
      'sample-noor-hassan-1',
      'sample-noor-hassan-2',
      'sample-noor-hassan-3',
      'sample-noor-hassan-4'
    );

  FOR v_week IN 1..4 LOOP
    v_sat := to_char(
      (CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int + 1) % 7))::date
        - ((4 - v_week) * 7),
      'YYYY-MM-DD'
    );

    INSERT INTO "Attendance" (id, "tenantId", "studentId", "classId", date, status)
    SELECT
      'sample-noor-att-' || k.id || '-' || v_week,
      v_tenant,
      k.id,
      'sample-noor-class',
      v_sat,
      CASE WHEN k.id = 'sample-noor-hassan-2' AND v_week = 4 THEN 'absent' ELSE 'present' END
    FROM (
      VALUES
        ('sample-noor-hassan-1'),
        ('sample-noor-hassan-2'),
        ('sample-noor-hassan-3'),
        ('sample-noor-hassan-4')
    ) AS k(id)
    ON CONFLICT ("tenantId", "studentId", "classId", date) DO UPDATE
    SET status = EXCLUDED.status;

    INSERT INTO "QuranProgress" (id, "tenantId", "studentId", surah, "ayahFrom", "ayahTo", juz, date, notes, status)
    SELECT
      'sample-noor-perf-' || k.id || '-' || v_week,
      v_tenant,
      k.id,
      'Al-Baqarah',
      1,
      7 + ((v_week - 1) * 6),
      1,
      v_sat,
      'Demo progress',
      'on_track'
    FROM (
      VALUES
        ('sample-noor-hassan-1'),
        ('sample-noor-hassan-2'),
        ('sample-noor-hassan-3'),
        ('sample-noor-hassan-4')
    ) AS k(id)
    ON CONFLICT (id) DO UPDATE
    SET surah = EXCLUDED.surah,
        "ayahFrom" = EXCLUDED."ayahFrom",
        "ayahTo" = EXCLUDED."ayahTo",
        juz = EXCLUDED.juz,
        date = EXCLUDED.date,
        status = EXCLUDED.status;

    INSERT INTO "Homework" (
      id, "tenantId", "classId", kind, surah, "ayahFrom", "ayahTo", juz,
      title, description, "assignedDate", "dueDate"
    )
    VALUES (
      'sample-noor-hw-c1-w' || v_week,
      v_tenant,
      'sample-noor-class',
      'reading',
      'Al-Baqarah',
      1,
      5 + ((v_week - 1) * 2),
      1,
      'Reading · Al-Baqarah 1–' || (5 + ((v_week - 1) * 2)),
      'Recite at home with a parent before the next class.',
      v_sat,
      v_sat
    )
    ON CONFLICT (id) DO UPDATE
    SET description = EXCLUDED.description,
        "assignedDate" = EXCLUDED."assignedDate",
        "dueDate" = EXCLUDED."dueDate";

    INSERT INTO "HomeworkCompletion" ("homeworkId", "studentId", status)
    SELECT
      'sample-noor-hw-c1-w' || v_week,
      k.id,
      'done'
    FROM (
      VALUES
        ('sample-noor-hassan-1'),
        ('sample-noor-hassan-2'),
        ('sample-noor-hassan-3'),
        ('sample-noor-hassan-4')
    ) AS k(id)
    ON CONFLICT ("homeworkId", "studentId") DO UPDATE
    SET status = EXCLUDED.status;
  END LOOP;

  v_assigned := to_char(CURRENT_DATE, 'YYYY-MM-DD');
  v_due := to_char(
    (CURRENT_DATE + ((6 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7))::date,
    'YYYY-MM-DD'
  );

  INSERT INTO "Homework" (
    id, "tenantId", "classId", kind, surah, "ayahFrom", "ayahTo", juz,
    title, description, "assignedDate", "dueDate"
  )
  VALUES (
    'sample-noor-hw-parent-now',
    v_tenant,
    'sample-noor-class',
    'reading',
    'Al-Baqarah',
    1,
    7,
    1,
    'Reading · Al-Baqarah 1–7',
    'Recite at home with a parent before the next class.',
    v_assigned,
    v_due
  )
  ON CONFLICT (id) DO UPDATE
  SET description = EXCLUDED.description,
      "assignedDate" = EXCLUDED."assignedDate",
      "dueDate" = EXCLUDED."dueDate",
      surah = EXCLUDED.surah,
      "ayahFrom" = EXCLUDED."ayahFrom",
      "ayahTo" = EXCLUDED."ayahTo",
      juz = EXCLUDED.juz,
      title = EXCLUDED.title;

  INSERT INTO "HomeworkCompletion" ("homeworkId", "studentId", status)
  VALUES
    ('sample-noor-hw-parent-now', 'sample-noor-hassan-1', 'assigned'),
    ('sample-noor-hw-parent-now', 'sample-noor-hassan-4', 'assigned'),
    ('sample-noor-hw-parent-now', 'sample-noor-hassan-2', 'done'),
    ('sample-noor-hw-parent-now', 'sample-noor-hassan-3', 'needs_help')
  ON CONFLICT ("homeworkId", "studentId") DO UPDATE
  SET status = EXCLUDED.status;

  INSERT INTO "Invoice" (id, "tenantId", "studentId", "parentId", amount, "dueDate", "paidDate", status, period)
  VALUES
    ('sample-noor-inv-hassan-1', v_tenant, 'sample-noor-hassan-1', v_parent, 80, v_due, v_assigned, 'paid', 'October'),
    ('sample-noor-inv-hassan-2', v_tenant, 'sample-noor-hassan-2', v_parent, 80, v_due, NULL, 'due', 'October'),
    ('sample-noor-inv-hassan-3', v_tenant, 'sample-noor-hassan-3', v_parent, 80, v_due, NULL, 'due', 'October'),
    ('sample-noor-inv-hassan-4', v_tenant, 'sample-noor-hassan-4', v_parent, 80, '2026-09-01', NULL, 'late', 'September')
  ON CONFLICT (id) DO UPDATE
  SET "parentId" = EXCLUDED."parentId",
      amount = EXCLUDED.amount,
      status = EXCLUDED.status;
END $$;
