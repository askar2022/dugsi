-- Age and family address for enrollment. Paste in the staging SQL Editor.

ALTER TABLE "EnrollmentApplication"
  ADD COLUMN IF NOT EXISTS "age" INTEGER,
  ADD COLUMN IF NOT EXISTS "address" TEXT;

ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "age" INTEGER,
  ADD COLUMN IF NOT EXISTS "address" TEXT;
