-- Each dugsi can pick a page color. Green is the default, like Noor.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "pageColor" TEXT NOT NULL DEFAULT 'green';
