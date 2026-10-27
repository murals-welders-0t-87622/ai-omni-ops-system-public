CREATE TABLE "MaterialArchiveRevision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "brandId" TEXT NOT NULL,
  "evidenceTable" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MaterialArchiveRevision_brandId_evidenceTable_recordId_revision_key" ON "MaterialArchiveRevision"("brandId","evidenceTable","recordId","revision");
CREATE INDEX "MaterialArchiveRevision_brandId_createdAt_idx" ON "MaterialArchiveRevision"("brandId","createdAt");
