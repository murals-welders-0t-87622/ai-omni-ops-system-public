CREATE TABLE IF NOT EXISTS "WorkAnalysisRequest" (
 "id" TEXT PRIMARY KEY,"brandId" TEXT NOT NULL,"platform" TEXT NOT NULL,"sourceId" TEXT NOT NULL,"snapshotJson" TEXT NOT NULL,"formsJson" TEXT NOT NULL,"goal" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'pending',"revision" INTEGER NOT NULL DEFAULT 1,"generation" INTEGER NOT NULL DEFAULT 1,"actorId" TEXT NOT NULL,"claimedBy" TEXT NOT NULL DEFAULT '',"eventsJson" TEXT NOT NULL DEFAULT '[]',"idempotencyKey" TEXT NOT NULL,"payloadHash" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "WorkAnalysisRequest_brandId_actorId_idempotencyKey_key" ON "WorkAnalysisRequest"("brandId","actorId","idempotencyKey");
CREATE INDEX IF NOT EXISTS "WorkAnalysisRequest_brandId_platform_updatedAt_idx" ON "WorkAnalysisRequest"("brandId","platform","updatedAt");
CREATE TABLE IF NOT EXISTS "WorkAnalysisResult" (
 "id" TEXT PRIMARY KEY,"requestId" TEXT NOT NULL REFERENCES "WorkAnalysisRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"brandId" TEXT NOT NULL,"platform" TEXT NOT NULL,"generation" INTEGER NOT NULL,"actorId" TEXT NOT NULL,"title" TEXT NOT NULL,"reportMarkdown" TEXT NOT NULL,"reportHtml" TEXT NOT NULL,"profilesJson" TEXT NOT NULL,"snapshotJson" TEXT NOT NULL,"methodVersionsJson" TEXT NOT NULL,"tagsText" TEXT NOT NULL,"idempotencyKey" TEXT NOT NULL,"payloadHash" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "WorkAnalysisResult_requestId_generation_key" ON "WorkAnalysisResult"("requestId","generation");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkAnalysisResult_requestId_idempotencyKey_key" ON "WorkAnalysisResult"("requestId","idempotencyKey");
CREATE INDEX IF NOT EXISTS "WorkAnalysisResult_brandId_platform_createdAt_idx" ON "WorkAnalysisResult"("brandId","platform","createdAt");
