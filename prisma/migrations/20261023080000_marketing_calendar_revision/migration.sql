CREATE TABLE "MarketingCalendarRevision" (
"id" TEXT PRIMARY KEY, "brandId" TEXT NOT NULL, "reportId" TEXT NOT NULL, "revision" INTEGER NOT NULL,
"actorId" TEXT NOT NULL, "operation" TEXT NOT NULL, "idempotencyKey" TEXT, "commandHash" TEXT NOT NULL,
"snapshotJson" TEXT NOT NULL, "contentHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MarketingCalendarRevision_brand_report_revision" ON "MarketingCalendarRevision"("brandId","reportId","revision");
CREATE UNIQUE INDEX "MarketingCalendarRevision_brand_key" ON "MarketingCalendarRevision"("brandId","idempotencyKey");
CREATE INDEX "MarketingCalendarRevision_brandId_createdAt_idx" ON "MarketingCalendarRevision"("brandId","createdAt");
