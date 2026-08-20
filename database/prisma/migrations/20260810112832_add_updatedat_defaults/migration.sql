-- Add DEFAULT CURRENT_TIMESTAMP to updatedAt columns that Prisma's @updatedAt
-- created as NOT NULL without a DB-level default. This allows non-Prisma clients
-- (e.g. the FastAPI backend via SQLAlchemy) to INSERT rows without explicitly
-- setting updatedAt.
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Application" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "NocRequest" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
