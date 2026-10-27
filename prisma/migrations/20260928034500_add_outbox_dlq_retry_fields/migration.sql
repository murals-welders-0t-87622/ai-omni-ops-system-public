-- Outbox 6 new columns for P-01..P-08 pipeline worker + DLQ dead letter
ALTER TABLE "ontology_outboxes" ADD COLUMN IF NOT EXISTS "pipeline_assigned" VARCHAR(16);
ALTER TABLE "ontology_outboxes" ADD COLUMN IF NOT EXISTS "retry_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ontology_outboxes" ADD COLUMN IF NOT EXISTS "max_retry" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "ontology_outboxes" ADD COLUMN IF NOT EXISTS "last_error" TEXT;
ALTER TABLE "ontology_outboxes" ADD COLUMN IF NOT EXISTS "last_processed_at" TIMESTAMPTZ;
ALTER TABLE "ontology_outboxes" ADD COLUMN IF NOT EXISTS "dlq_moved_at" TIMESTAMPTZ;
ALTER TABLE "ontology_outboxes" ADD COLUMN IF NOT EXISTS "dlq_reason" VARCHAR(512);

-- Indexes for worker tick scan + DLQ visibility
CREATE INDEX IF NOT EXISTS "ontology_outboxes_retry_count_dlq_moved_at_idx" ON "ontology_outboxes" ("retry_count", "dlq_moved_at");
CREATE INDEX IF NOT EXISTS "ontology_outboxes_pipeline_assigned_dispatched_idx" ON "ontology_outboxes" ("pipeline_assigned", "dispatched");