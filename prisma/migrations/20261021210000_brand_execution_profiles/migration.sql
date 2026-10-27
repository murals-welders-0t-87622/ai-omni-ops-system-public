ALTER TABLE "BrandThirdPartyPlatformSecret" ADD COLUMN IF NOT EXISTS "encryptedApiKey" TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS "BrandExecutionProfile" (
 "id" TEXT PRIMARY KEY, "brandId" TEXT NOT NULL UNIQUE REFERENCES "Brand"("id") ON DELETE CASCADE,
 "revision" INTEGER NOT NULL DEFAULT 0, "activeVersionId" TEXT NULL, "draftJson" JSONB NOT NULL,
 "updatedByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "BrandExecutionProfileVersion" (
 "id" TEXT PRIMARY KEY, "profileId" TEXT NOT NULL REFERENCES "BrandExecutionProfile"("id") ON DELETE CASCADE,
 "brandId" TEXT NOT NULL, "version" INTEGER NOT NULL, "configJson" JSONB NOT NULL, "contentHash" TEXT NOT NULL,
 "restoredFromId" TEXT NULL, "createdByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BrandExecutionProfileVersion_profileId_version_key" UNIQUE ("profileId","version")
);
CREATE INDEX IF NOT EXISTS "BrandExecutionProfileVersion_brandId_createdAt_idx" ON "BrandExecutionProfileVersion"("brandId","createdAt");
