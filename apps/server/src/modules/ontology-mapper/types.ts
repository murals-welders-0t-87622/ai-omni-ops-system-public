import { BadRequestException } from "@nestjs/common";

export const ONT_SCHEMA_VERSION = "3.0.0";

export type OntPreconditionVerdict = "PASS" | "WEAK_WARNING" | "BLOCKED";
export type OntViewKind = "LOGICAL" | "PHYSICAL" | "RUNTIME";
export type OntOntologyKind = "BRAND" | "TASK" | "MEDIA";
export type OntOutboxEventType =
  | "task_created"
  | "task_status_changed"
  | "task_paused"
  | "task_resumed"
  | "task_canceled"
  | "task_closed"
  | "task_archived"
  | "task_reopened_archive"
  | "stage_claimed"
  | "stage_submitted"
  | "stage_accepted"
  | "stage_changes_requested"
  | "stage_blocked"
  | "approval_recorded"
  | "artifact_registered"
  | "version_used"
  | "release_created"
  | "release_verified"
  | "release_restored"
  | "domain_event_appended"
  | "guarded_tool_called"
  | "guarded_tool_completed";
export type OntReconcileSide = "PYTHON_SQLITE" | "TS_PRISMA" | "REFERENCE_TRUTH";

export interface OntPreconditionRule {
  rule_id: string;
  code: "BLOCKED_INSIGHTS_EMPTY" | "WARN_TOPICS_EMPTY" | "WARN_REVIEW_OVERDUE";
  resource_kind: "DOUYIN_TOPIC_LIBRARY" | "MARKETING_PLAN" | "BRAND_GROWTH_REPORT";
  resource_desc: (brandId: string, brandName?: string) => string;
  verdict_if_missing: OntPreconditionVerdict;
  action_hint: string;
}

/** OQ5 verbatim 对齐治理真值 3 条首条强约束规则 */
export const ONT_OQ5_RULES_3: OntPreconditionRule[] = [
  {
    rule_id: "OQ5-1",
    code: "BLOCKED_INSIGHTS_EMPTY",
    resource_kind: "DOUYIN_TOPIC_LIBRARY",
    resource_desc: (bid) => `BusinessAsset kind=DOUYIN_TOPIC_LIBRARY brand_id=${bid} count=0`,
    verdict_if_missing: "BLOCKED",
    action_hint: "BLOCK route strategy/stage execution — 采集库 0 条时阻塞选题",
  },
  {
    rule_id: "OQ5-2",
    code: "WARN_TOPICS_EMPTY",
    resource_kind: "MARKETING_PLAN",
    resource_desc: (bid) => `BusinessAsset kind=MARKETING_PLAN brand_id=${bid} count=0 during creation`,
    verdict_if_missing: "WEAK_WARNING",
    action_hint: "WEAK_WARNING（创作面板顶部 banner 提醒）— 选题库 0 条时创作仅弱提醒",
  },
  {
    rule_id: "OQ5-3",
    code: "WARN_REVIEW_OVERDUE",
    resource_kind: "BRAND_GROWTH_REPORT",
    resource_desc: () => "BRAND_GROWTH_REPORT.last_cycle not optimized 365+ 天",
    verdict_if_missing: "WEAK_WARNING",
    action_hint: "WEAK_WARNING（总控 KPI 卡片闪烁提醒）— 复盘周期未优化",
  },
];

/** 7×3 = BRAND/TASK/MEDIA（3 本体） × LOGICAL/PHYSICAL/RUNTIME（3 视图） × 7 管道字段映射 */
export const ONT_7x3_FIELD_MAPPER = {
  BRAND: {
    LOGICAL: [
      "brand_id",
      "brand_name",
      "industry",
      "store_count",
      "founded_at",
      "brand_intro",
      "company_intro",
    ],
    PHYSICAL: [
      "BusinessAsset.id",
      "BusinessAsset.title",
      "BusinessAsset.category",
      "BusinessAsset.metadataJson.store_count",
      "BusinessAsset.metadataJson.founded_at",
      "BusinessAsset.description",
      "BusinessAsset.metadataJson.company_intro",
    ],
    RUNTIME: [
      "workflow-core:brand_id",
      "openclaw-brands:title",
      "openclaw-brands:industry",
      "openclaw-brands:store_count",
      "openclaw-brands:founded_at",
      "brands.service.ts:description",
      "brands.service.ts:metadata.company_intro",
    ],
  },
  TASK: {
    LOGICAL: [
      "task_id",
      "command_id",
      "goal",
      "scope_end",
      "route_hint",
      "status",
      "revision",
    ],
    PHYSICAL: [
      "WfTask.taskId",
      "WfTask.commandId",
      "WfTask.goal",
      "WfTask.scopeEnd",
      "WfTask.routeHint",
      "WfTask.status (WfTaskStatus enum)",
      "WfTask.revision",
    ],
    RUNTIME: [
      "workflow-core.service.ts:taskId",
      "workflow-core:idempotencyKey.command_id",
      "workflow-core.createTask:goal",
      "workflow-core.idempotentApply:scope_end",
      "workflow-core.controller:route_hint",
      "wfTask.status DB value",
      "wfTask.revision DB value",
    ],
  },
  MEDIA: {
    LOGICAL: [
      "artifact_id",
      "revision_no",
      "sha256",
      "mime_type",
      "byte_length",
      "kind",
      "local_path",
    ],
    PHYSICAL: [
      "WfArtifact.artifactId",
      "WfArtifact.revisionNo",
      "WfArtifact.sha256",
      "WfArtifact.mimeType",
      "WfArtifact.byteLength",
      "WfArtifact.kind (enum)",
      "WfArtifact.localPath",
    ],
    RUNTIME: [
      "workflow-core.registerArtifact:artifactId",
      "workflow-core.registerArtifact:revisionNo",
      "WfArtifact.sha256 写入时不可变",
      "MediaAsset.mimeType",
      "MediaAsset.fileSize",
      "ai-control-center:kind 枚举映射",
      "artifact.storageKey / local file",
    ],
  },
} as const satisfies Record<
  Uppercase<OntOntologyKind>,
  Record<Uppercase<OntViewKind>, readonly string[]>
>;

/** Outbox 7 对象 verbatim：payload_json 7 对象（治理真值 ontology_outbox_seven_plus_one_fields） */
export type OntOutboxPayload = {
  task?: Record<string, unknown>;
  stage?: Record<string, unknown>;
  artifact?: Record<string, unknown>;
  approval?: Record<string, unknown>;
  gate_result?: Record<string, unknown>;
  domain_event?: Record<string, unknown>;
  guarded_tool_call?: Record<string, unknown>;
  /** +1 扩展字段：路由/品牌上下文元数据 */
  meta?: { brand_name?: string; route_id?: string; route_version?: number; schema_version: string };
};

export interface OntPreconditionCheckRequest {
  brand_id: string;
  task_id?: string;
  route_id?: string;
  brand_name?: string;
}

export interface OntPreconditionCheckResponse {
  ok: boolean;
  schema_version: string;
  overall_verdict: OntPreconditionVerdict;
  checks: Array<{
    rule_id: string;
    code: OntPreconditionRule["code"];
    verdict: OntPreconditionVerdict;
    resource_desc: string;
    action_hint: string;
    resource_count?: number;
  }>;
}

export interface OntMappingRequest {
  ontology_kind: OntOntologyKind;
  view_kind?: OntViewKind;
  logical_key?: string;
  brand_id?: string;
  asset_id?: string;
  task_id?: string;
  media_id?: string;
}

export interface OntOutboxAppendRequest {
  event_type: OntOutboxEventType;
  source_table: "wf_tasks" | "wf_stage_runs" | "wf_artifacts" | "wf_approvals" | "wf_gate_results" | "wf_domain_events" | "wf_guarded_tool_calls" | "wf_version_usages" | "wf_execution_events" | "business_assets";
  source_record_id: string;
  brand_id: string;
  payload: OntOutboxPayload;
}

export interface OntOutboxDispatchRequest {
  batch_size?: number;
  pipeline_ids?: string[];
}

export interface OntReconcileReportRequest {
  batch_id?: string;
  source_table?: "tasks" | "stage_runs" | "artifacts" | "domain_events";
}

/** 7 只读 handler verbatim（read_only_handlers_7） */
export const ONT_READ_ONLY_HANDLERS_7 = [
  "get_task",
  "task_context",
  "stage_contract",
  "assessment_check",
  "list_tasks",
  "execution_overview",
  "list_releases",
] as const;
export type OntReadOnlyHandlerName = (typeof ONT_READ_ONLY_HANDLERS_7)[number];

/** OQ6 双写对账 4 表 × 字段 verbatim */
export const OQ6_RECONCILE_FIELDS_BY_TABLE = {
  tasks: ["status", "revision", "archive_status", "route_id", "content_family", "parent_id"],
  stage_runs: ["status", "generation", "owner_expert_id", "approval_mode", "output_artifact_revision_ids_json"],
  artifacts: ["sha256", "byte_length", "kind", "mime_type", "artifact_id", "revision_no"],
  domain_events: ["kind", "from_revision", "to_revision", "actor_id"],
} as const;
export const OQ6_REQUIRED_AGREEMENT_RATE = 0.99;
export const OQ6_TRANSITION_PERIOD_DAYS = 14;

export function validateBrandId(bid: unknown, field = "brand_id"): string {
  if (typeof bid !== "string" || bid.trim() === "") {
    throw new BadRequestException(`ONT_MISSING_${field.toUpperCase()}`);
  }
  return bid.trim();
}
