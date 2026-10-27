CREATE TABLE IF NOT EXISTS "AIControlCenterConnectionGrantRevision" (
 "id" TEXT PRIMARY KEY, "brandId" TEXT NOT NULL REFERENCES "Brand"("id") ON DELETE CASCADE, "connectionId" TEXT NOT NULL, "tokenId" TEXT NOT NULL,
 "actorUserId" TEXT NOT NULL, "policyVersion" TEXT NOT NULL, "previousToolsJson" TEXT NOT NULL,
 "nextToolsJson" TEXT NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AIControlCenterConnectionGrantRevision_brandId_connectionId_createdAt_idx"
 ON "AIControlCenterConnectionGrantRevision"("brandId","connectionId","createdAt");
