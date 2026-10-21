-- Public sample school for ourdugsi.com/s/noor. Paste in the production SQL Editor.
-- Counts only. No student names appear on the school page. No demo logins.

INSERT INTO "Tenant" (id, name, slug, status, city, welcomeNote)
SELECT
  'sample-noor',
  'Masjid Al-Noor Weekend Dugsi',
  'noor',
  'active',
  'Minneapolis',
  'Assalamu alaikum. Welcome to Masjid Al-Noor Weekend Dugsi.'
WHERE NOT EXISTS (SELECT 1 FROM "Tenant" WHERE slug = 'noor');

INSERT INTO "Class" (id, "tenantId", name, level, "dayOfWeek", "startTime", "endTime", room)
SELECT
  'sample-noor-class',
  t.id,
  'Weekend Quran',
  'Mixed',
  'Saturday',
  '09:00',
  '11:30',
  'Main hall'
FROM "Tenant" t
WHERE t.slug = 'noor'
  AND NOT EXISTS (SELECT 1 FROM "Class" c WHERE c."tenantId" = t.id);

INSERT INTO "Student" (id, "tenantId", "firstName", "lastName", gender, "classId", status)
SELECT
  'sample-noor-' || g.n,
  t.id,
  g.first,
  'Sample',
  g.gender,
  c.id,
  'enrolled'
FROM "Tenant" t
JOIN "Class" c ON c."tenantId" = t.id
CROSS JOIN (
  VALUES
    (1, 'Amina', 'girl'),
    (2, 'Yusuf', 'boy'),
    (3, 'Fatima', 'girl'),
    (4, 'Omar', 'boy'),
    (5, 'Khadija', 'girl'),
    (6, 'Ibrahim', 'boy'),
    (7, 'Maryam', 'girl'),
    (8, 'Hassan', 'boy'),
    (9, 'Aisha', 'girl'),
    (10, 'Musa', 'boy'),
    (11, 'Zainab', 'girl'),
    (12, 'Idris', 'boy')
) AS g(n, first, gender)
WHERE t.slug = 'noor'
  AND NOT EXISTS (SELECT 1 FROM "Student" s WHERE s."tenantId" = t.id);

INSERT INTO "QuranProgress" (id, "tenantId", "studentId", surah, "ayahFrom", "ayahTo", juz, date, notes, status)
SELECT
  'sample-noor-p-' || s.n || '-' || p.step,
  t.id,
  'sample-noor-' || s.n,
  p.surah,
  1,
  p.ayah,
  p.juz,
  p.day,
  'Sample progress',
  'on_track'
FROM "Tenant" t
CROSS JOIN (
  VALUES
    (1, 3),
    (2, 6),
    (3, 10),
    (4, 14),
    (5, 16),
    (6, 18),
    (7, 20),
    (8, 23),
    (9, 26),
    (10, 28),
    (11, 29),
    (12, 8)
) AS s(n, latest)
CROSS JOIN LATERAL (
  VALUES
    (1, 'Al-Baqarah', 40, GREATEST(1, s.latest - 10), to_char(CURRENT_DATE - INTERVAL '5 months', 'YYYY-MM-15')),
    (2, 'Al-Baqarah', 80, GREATEST(2, s.latest - 6), to_char(CURRENT_DATE - INTERVAL '3 months', 'YYYY-MM-15')),
    (3, 'Ali Imran', 20, s.latest, to_char(CURRENT_DATE - INTERVAL '10 days', 'YYYY-MM-DD'))
) AS p(step, surah, ayah, juz, day)
WHERE t.slug = 'noor'
  AND EXISTS (SELECT 1 FROM "Student" st WHERE st.id = 'sample-noor-' || s.n)
  AND NOT EXISTS (
    SELECT 1 FROM "QuranProgress" q
    WHERE q."tenantId" = t.id AND q.id LIKE 'sample-noor-p-%'
  );
