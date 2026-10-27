-- Incremental and idempotent: existing legacy credentials remain unchanged.
ALTER TABLE "AIControlCenterInstallToken" ADD COLUMN IF NOT EXISTS "connectionId" TEXT NULL;
ALTER TABLE "AIControlCenterInstallToken" ADD COLUMN IF NOT EXISTS "clientKind" TEXT NULL;
ALTER TABLE "AIControlCenterInstallToken" ADD COLUMN IF NOT EXISTS "toolAllowlistJson" TEXT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "AIControlCenterInstallToken_active_connection_key"
  ON "AIControlCenterInstallToken" ("brandId", "connectionId")
  WHERE "connectionId" IS NOT NULL AND "status" = 'ACTIVE';
