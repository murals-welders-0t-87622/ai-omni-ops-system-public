-- S3-02C: Ontology orchestration draft storage.
-- These tables store workflow-map drafts and snapshots only. They do not copy
-- expert, skill, connector, task, or material source records.

CREATE TABLE "ontology_orchestration_flows" (
  "id" TEXT NOT NULL,
  "flow_key" VARCHAR(128) NOT NULL,
  "name" VARCHAR(256) NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "brand_id" VARCHAR(128),
  "workspace_scope" VARCHAR(128) NOT NULL DEFAULT 'all_network_growth',
  "target_kind" VARCHAR(64) NOT NULL DEFAULT 'expert_team',
  "target_id" VARCHAR(256) NOT NULL DEFAULT '',
  "target_name" VARCHAR(256) NOT NULL DEFAULT '',
  "source_refs_json" JSONB NOT NULL,
  "routing_rules_json" JSONB NOT NULL,
  "confirmation_gates_json" JSONB NOT NULL,
  "evidence_rules_json" JSONB NOT NULL,
  "created_by" VARCHAR(128) NOT NULL DEFAULT 'system',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ontology_orchestration_flows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ontology_orchestration_nodes" (
  "id" TEXT NOT NULL,
  "flow_id" TEXT NOT NULL,
  "node_key" VARCHAR(128) NOT NULL,
  "node_type" VARCHAR(64) NOT NULL,
  "title" VARCHAR(256) NOT NULL,
  "subtitle" VARCHAR(256) NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "position_x" INTEGER NOT NULL DEFAULT 0,
  "position_y" INTEGER NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 100,
  "object_json" JSONB NOT NULL,
  "link_json" JSONB NOT NULL,
  "function_json" JSONB NOT NULL,
  "action_json" JSONB NOT NULL,
  "interface_json" JSONB NOT NULL,
  "references_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ontology_orchestration_nodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ontology_orchestration_edges" (
  "id" TEXT NOT NULL,
  "flow_id" TEXT NOT NULL,
  "edge_key" VARCHAR(128) NOT NULL,
  "from_node_key" VARCHAR(128) NOT NULL,
  "to_node_key" VARCHAR(128) NOT NULL,
  "label" VARCHAR(256) NOT NULL DEFAULT '',
  "condition_json" JSONB NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 100,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ontology_orchestration_edges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ontology_orchestration_versions" (
  "id" TEXT NOT NULL,
  "flow_id" TEXT NOT NULL,
  "version_no" INTEGER NOT NULL,
  "status" VARCHAR(64) NOT NULL DEFAULT 'draft_snapshot',
  "snapshot_json" JSONB NOT NULL,
  "created_by" VARCHAR(128) NOT NULL DEFAULT 'system',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMP(3),

  CONSTRAINT "ontology_orchestration_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ontology_orchestration_flows_flow_key_key" ON "ontology_orchestration_flows"("flow_key");
CREATE INDEX "ontology_orchestration_flows_brand_id_status_updated_at_idx" ON "ontology_orchestration_flows"("brand_id", "status", "updated_at");
CREATE INDEX "ontology_orchestration_flows_target_kind_target_id_idx" ON "ontology_orchestration_flows"("target_kind", "target_id");

CREATE UNIQUE INDEX "ontology_orchestration_nodes_flow_id_node_key_key" ON "ontology_orchestration_nodes"("flow_id", "node_key");
CREATE INDEX "ontology_orchestration_nodes_flow_id_node_type_sort_order_idx" ON "ontology_orchestration_nodes"("flow_id", "node_type", "sort_order");

CREATE UNIQUE INDEX "ontology_orchestration_edges_flow_id_edge_key_key" ON "ontology_orchestration_edges"("flow_id", "edge_key");
CREATE INDEX "ontology_orchestration_edges_flow_id_from_node_key_to_node_key_idx" ON "ontology_orchestration_edges"("flow_id", "from_node_key", "to_node_key");

CREATE UNIQUE INDEX "ontology_orchestration_versions_flow_id_version_no_key" ON "ontology_orchestration_versions"("flow_id", "version_no");
CREATE INDEX "ontology_orchestration_versions_flow_id_created_at_idx" ON "ontology_orchestration_versions"("flow_id", "created_at");

ALTER TABLE "ontology_orchestration_nodes"
  ADD CONSTRAINT "ontology_orchestration_nodes_flow_id_fkey"
  FOREIGN KEY ("flow_id") REFERENCES "ontology_orchestration_flows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ontology_orchestration_edges"
  ADD CONSTRAINT "ontology_orchestration_edges_flow_id_fkey"
  FOREIGN KEY ("flow_id") REFERENCES "ontology_orchestration_flows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ontology_orchestration_versions"
  ADD CONSTRAINT "ontology_orchestration_versions_flow_id_fkey"
  FOREIGN KEY ("flow_id") REFERENCES "ontology_orchestration_flows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
