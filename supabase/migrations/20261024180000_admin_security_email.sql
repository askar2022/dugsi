-- Paste in the production (and staging) SQL Editor.
-- Lets each admin receive their own 6-digit sign-in code.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "securityEmail" TEXT;
