CREATE TABLE "GrowthPlan" (
  "id" TEXT PRIMARY KEY,
  "brandId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "goal" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'awaiting_expert',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "currentVersion" INTEGER NOT NULL DEFAULT 0,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "frequency" TEXT NOT NULL DEFAULT 'daily',
  "snapshotJson" TEXT NOT NULL,
  "eventsJson" TEXT NOT NULL DEFAULT '[]',
  "claimedBy" TEXT NOT NULL DEFAULT '',
  "leaseUntil" TIMESTAMP(3),
  "nextCheckAt" TIMESTAMP(3),
  "idempotencyKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "GrowthPlanVersion" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "GrowthPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "brandId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "bodyJson" TEXT NOT NULL,
  "reportMarkdown" TEXT NOT NULL,
  "methodVersionsJson" TEXT NOT NULL,
  "snapshotJson" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "GrowthPlanCheck" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "GrowthPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "brandId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "windowStart" TEXT NOT NULL,
  "windowEnd" TEXT NOT NULL,
  "snapshotHash" TEXT NOT NULL,
  "snapshotJson" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "claimedBy" TEXT NOT NULL DEFAULT '',
  "leaseUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "GrowthPlanProposal" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "GrowthPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "brandId" TEXT NOT NULL,
  "checkId" TEXT NOT NULL,
  "baseVersion" INTEGER NOT NULL,
  "actionsJson" TEXT NOT NULL,
  "reportMarkdown" TEXT NOT NULL,
  "methodVersionsJson" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "decision" TEXT NOT NULL DEFAULT 'pending',
  "idempotencyKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "GrowthMetricFact" (
  "id" TEXT PRIMARY KEY,
  "brandId" TEXT NOT NULL,
  "metricKey" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "sampleSize" INTEGER NOT NULL,
  "basis" TEXT NOT NULL,
  "sourceRef" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "GrowthPlan_brandId_createdBy_idempotencyKey_key" ON "GrowthPlan" ("brandId","createdBy","idempotencyKey");

CREATE UNIQUE INDEX "GrowthPlanVersion_planId_version_key" ON "GrowthPlanVersion" ("planId","version");

CREATE UNIQUE INDEX "GrowthPlanVersion_planId_idempotencyKey_key" ON "GrowthPlanVersion" ("planId","idempotencyKey");

CREATE UNIQUE INDEX "GrowthPlanCheck_planId_version_windowEnd_snapshotHash_key" ON "GrowthPlanCheck" ("planId","version","windowEnd","snapshotHash");

CREATE UNIQUE INDEX "GrowthPlanProposal_checkId_key" ON "GrowthPlanProposal" ("checkId");

CREATE UNIQUE INDEX "GrowthPlanProposal_planId_idempotencyKey_key" ON "GrowthPlanProposal" ("planId","idempotencyKey");

CREATE UNIQUE INDEX "GrowthMetricFact_brandId_metricKey_date_revision_key" ON "GrowthMetricFact" ("brandId","metricKey","date","revision");

CREATE UNIQUE INDEX "GrowthMetricFact_brandId_actorId_idempotencyKey_key" ON "GrowthMetricFact" ("brandId","actorId","idempotencyKey");

CREATE INDEX "GrowthPlan_brandId_updatedAt_idx" ON "GrowthPlan" ("brandId","updatedAt");

CREATE INDEX "GrowthPlan_status_nextCheckAt_idx" ON "GrowthPlan" ("status","nextCheckAt");

CREATE INDEX "GrowthPlanCheck_brandId_status_createdAt_idx" ON "GrowthPlanCheck" ("brandId","status","createdAt");

CREATE INDEX "GrowthMetricFact_brandId_metricKey_date_idx" ON "GrowthMetricFact" ("brandId","metricKey","date");
