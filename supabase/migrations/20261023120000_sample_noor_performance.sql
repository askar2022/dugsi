-- Four-week Noor demo for Admin → Performance. Paste in the production SQL Editor
-- after the sample Noor school SQL. Logins still come from /api/demo/ensure-noor.

INSERT INTO "Class" (id, "tenantId", name, level, "dayOfWeek", "startTime", "endTime", room)
SELECT
  'sample-noor-class-2',
  t.id,
  'Class 2',
  'Year 2',
  'Saturday',
  '09:00',
  '11:30',
  'Room B'
FROM "Tenant" t
WHERE t.slug = 'noor'
  AND NOT EXISTS (SELECT 1 FROM "Class" c WHERE c.id = 'sample-noor-class-2');

UPDATE "Class" SET name = 'Weekend Quran' WHERE id = 'sample-noor-class';

INSERT INTO "Student" (id, "tenantId", "firstName", "lastName", gender, "classId", status)
SELECT v.id, t.id, v.first, v.last, v.gender, v.class_id, 'enrolled'
FROM "Tenant" t
CROSS JOIN (
  VALUES
    ('sample-noor-hodan-1', 'Layla', 'Hodan', 'girl', 'sample-noor-class-2'),
    ('sample-noor-hodan-2', 'Bilal', 'Hodan', 'boy', 'sample-noor-class-2'),
    ('sample-noor-hodan-3', 'Safa', 'Hodan', 'girl', 'sample-noor-class-2'),
    ('sample-noor-hassan-1', 'Aisha', 'Hassan', 'girl', 'sample-noor-class'),
    ('sample-noor-hassan-2', 'Omar', 'Hassan', 'boy', 'sample-noor-class'),
    ('sample-noor-hassan-3', 'Maryam', 'Hassan', 'girl', 'sample-noor-class')
) AS v(id, first, last, gender, class_id)
WHERE t.slug = 'noor'
  AND NOT EXISTS (SELECT 1 FROM "Student" s WHERE s.id = v.id);

UPDATE "Student" SET "classId" = 'sample-noor-class-2', status = 'enrolled'
WHERE id IN (
  'sample-noor-1','sample-noor-2','sample-noor-3','sample-noor-4','sample-noor-5',
  'sample-noor-6','sample-noor-7','sample-noor-8','sample-noor-9'
);

UPDATE "Student" SET "classId" = 'sample-noor-class', status = 'enrolled'
WHERE id IN ('sample-noor-10','sample-noor-11','sample-noor-12');

-- Last four Saturdays, including today when it is Saturday.
WITH sats AS (
  SELECT
    (CURRENT_DATE - (((EXTRACT(DOW FROM CURRENT_DATE)::int + 1) % 7) + ((4 - g.n) * 7)))::date AS day,
    g.n AS week
  FROM generate_series(1, 4) AS g(n)
),
kids AS (
  SELECT id, 'sample-noor-class-2'::text AS class_id,
    CASE
      WHEN id IN ('sample-noor-9') THEN 'support'
      WHEN id IN ('sample-noor-8', 'sample-noor-hodan-2') THEN 'medium'
      ELSE 'strong'
    END AS profile
  FROM "Student"
  WHERE id IN (
    'sample-noor-1','sample-noor-2','sample-noor-3','sample-noor-4','sample-noor-5',
    'sample-noor-6','sample-noor-7','sample-noor-8','sample-noor-9',
    'sample-noor-hodan-1','sample-noor-hodan-2','sample-noor-hodan-3'
  )
  UNION ALL
  SELECT id, 'sample-noor-class',
    CASE
      WHEN id IN ('sample-noor-10','sample-noor-11','sample-noor-12') THEN 'support'
      ELSE 'strong'
    END
  FROM "Student"
  WHERE id IN (
    'sample-noor-10','sample-noor-11','sample-noor-12',
    'sample-noor-hassan-1','sample-noor-hassan-2','sample-noor-hassan-3'
  )
)
INSERT INTO "Attendance" (id, "tenantId", "studentId", "classId", date, status)
SELECT
  'sample-noor-att-' || k.id || '-' || s.week,
  t.id,
  k.id,
  k.class_id,
  to_char(s.day, 'YYYY-MM-DD'),
  CASE
    WHEN k.profile = 'support' AND k.class_id = 'sample-noor-class-2' AND s.week = 4 THEN 'absent'
    WHEN k.profile = 'support' AND k.class_id = 'sample-noor-class-2' THEN 'late'
    WHEN k.profile = 'medium' AND s.week = 2 THEN 'late'
    WHEN k.profile = 'support' AND s.week IN (1, 3) THEN 'late'
    ELSE 'present'
  END
FROM "Tenant" t
CROSS JOIN sats s
CROSS JOIN kids k
WHERE t.slug = 'noor'
ON CONFLICT ("tenantId", "studentId", "classId", date) DO UPDATE
SET status = EXCLUDED.status;

DELETE FROM "Homework" WHERE id LIKE 'sample-noor-hw-%';

WITH sats AS (
  SELECT
    (CURRENT_DATE - (((EXTRACT(DOW FROM CURRENT_DATE)::int + 1) % 7) + ((4 - g.n) * 7)))::date AS day,
    g.n AS week
  FROM generate_series(1, 4) AS g(n)
)
INSERT INTO "Homework" (id, "tenantId", "classId", kind, surah, "ayahFrom", "ayahTo", juz, title, description, "assignedDate", "dueDate")
SELECT
  'sample-noor-hw-' || c.prefix || '-w' || s.week,
  t.id,
  c.class_id,
  'reading',
  'Al-Baqarah',
  1,
  5 + ((s.week - 1) * 2),
  1,
  'Reading · Al-Baqarah 1–' || (5 + ((s.week - 1) * 2)),
  'Recite at home with a parent before next class.',
  to_char(s.day, 'YYYY-MM-DD'),
  to_char(s.day, 'YYYY-MM-DD')
FROM "Tenant" t
CROSS JOIN sats s
CROSS JOIN (
  VALUES ('sample-noor-class-2', 'c2'), ('sample-noor-class', 'c1')
) AS c(class_id, prefix)
WHERE t.slug = 'noor';

INSERT INTO "HomeworkCompletion" ("homeworkId", "studentId", status)
SELECT
  h.id,
  k.id,
  CASE
    WHEN k.profile = 'strong' THEN 'done'
    WHEN k.profile = 'medium' AND right(h.id, 1) = '1' THEN 'assigned'
    WHEN k.profile = 'medium' THEN 'needs_help'
    WHEN k.profile = 'support' AND right(h.id, 1) = '4' THEN 'needs_help'
    ELSE 'assigned'
  END
FROM "Homework" h
JOIN (
  SELECT id,
    CASE
      WHEN id IN ('sample-noor-9','sample-noor-10','sample-noor-11','sample-noor-12') THEN 'support'
      WHEN id IN ('sample-noor-8','sample-noor-hodan-2') THEN 'medium'
      ELSE 'strong'
    END AS profile,
    CASE
      WHEN id IN (
        'sample-noor-1','sample-noor-2','sample-noor-3','sample-noor-4','sample-noor-5',
        'sample-noor-6','sample-noor-7','sample-noor-8','sample-noor-9',
        'sample-noor-hodan-1','sample-noor-hodan-2','sample-noor-hodan-3'
      ) THEN 'sample-noor-class-2'
      ELSE 'sample-noor-class'
    END AS class_id
  FROM "Student"
  WHERE id IN (
    'sample-noor-1','sample-noor-2','sample-noor-3','sample-noor-4','sample-noor-5',
    'sample-noor-6','sample-noor-7','sample-noor-8','sample-noor-9',
    'sample-noor-10','sample-noor-11','sample-noor-12',
    'sample-noor-hodan-1','sample-noor-hodan-2','sample-noor-hodan-3',
    'sample-noor-hassan-1','sample-noor-hassan-2','sample-noor-hassan-3'
  )
) k ON k.class_id = h."classId"
WHERE h.id LIKE 'sample-noor-hw-%';

DELETE FROM "QuranProgress" WHERE id LIKE 'sample-noor-perf-%';

WITH sats AS (
  SELECT
    (CURRENT_DATE - (((EXTRACT(DOW FROM CURRENT_DATE)::int + 1) % 7) + ((4 - g.n) * 7)))::date AS day,
    g.n AS week
  FROM generate_series(1, 4) AS g(n)
)
INSERT INTO "QuranProgress" (id, "tenantId", "studentId", surah, "ayahFrom", "ayahTo", juz, date, notes, status)
SELECT
  'sample-noor-perf-' || k.id || '-' || s.week,
  t.id,
  k.id,
  'Al-Baqarah',
  1,
  10 + ((s.week - 1) * 8),
  1,
  to_char(s.day, 'YYYY-MM-DD'),
  'Demo progress for Performance',
  CASE
    WHEN k.id IN ('sample-noor-9','sample-noor-10','sample-noor-11','sample-noor-12') THEN 'contact_parent'
    WHEN k.id IN ('sample-noor-8','sample-noor-hodan-2') THEN 'needs_practice'
    ELSE 'on_track'
  END
FROM "Tenant" t
CROSS JOIN sats s
CROSS JOIN (
  SELECT id FROM "Student"
  WHERE id IN (
    'sample-noor-1','sample-noor-2','sample-noor-3','sample-noor-4','sample-noor-5',
    'sample-noor-6','sample-noor-7','sample-noor-8','sample-noor-9',
    'sample-noor-10','sample-noor-11','sample-noor-12',
    'sample-noor-hodan-1','sample-noor-hodan-2','sample-noor-hodan-3',
    'sample-noor-hassan-1','sample-noor-hassan-2','sample-noor-hassan-3'
  )
) k
WHERE t.slug = 'noor';
