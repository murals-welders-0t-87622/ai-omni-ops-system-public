export const WF_SCHEMA_VERSION = "1.0.0" as const;

export type SourceRefEntry = {
  kind: string;
  id: string;
  href?: string;
  meta?: Record<string, unknown>;
};

export type WfHandlerName =
  | "create_task"
  | "register_artifact"
  | "record_version_usage"
  | "record_execution_event"
  | "execute_command.claim_stage"
  | "execute_command.submit_stage"
  | "execute_command.evaluate_stage"
  | "execute_command.record_approval"
  | "execute_command.request_change"
  | "execute_command.pause_task"
  | "execute_command.resume_task"
  | "execute_command.cancel_task"
  | "execute_command.close_task"
  | "execute_command.archive_task"
  | "execute_command.reopen_archive"
  | "read.get_task"
  | "read.list_tasks"
  | "read.get_task_governance_detail"
  | "read.list_stage_runs"
  | "read.list_artifacts"
  | "read.list_execution_events"
  | "read.list_version_usages";

export type BaseWfRequest = {
  schema_version?: typeof WF_SCHEMA_VERSION;
  command_id: string;
  idempotency_key?: string;
};

export type CreateTaskRequest = BaseWfRequest & {
  brand_id: string;
  goal: string;
  scope_end: string;
  route_hint?: string;
  source_refs: SourceRefEntry[];
  parent_id?: string;
};

export type RegisterArtifactRequest = BaseWfRequest & {
  task_id: string;
  stage_run_id: string;
  kind: string;
  local_path: string;
  metadata?: Record<string, unknown>;
  source_refs: SourceRefEntry[];
};

export type RecordVersionUsageRequest = BaseWfRequest & {
  task_id: string;
  release_id: string;
  action: "start" | "end";
  desired_revision: string;
  installed_status?: "unverified" | "self_reported" | "evidence_verified";
  loaded_status?: "unverified" | "self_reported" | "evidence_verified";
  evidence_refs?: SourceRefEntry[];
};

export type RecordExecutionEventRequest = BaseWfRequest & {
  task_id: string;
  invocation_id: string;
  parent_invocation_id?: string;
  recovery_for_invocation_id?: string;
  stage_run_id?: string;
  subject_kind: "expert" | "skill";
  subject_id: string;
  event_type: "started" | "succeeded" | "failed";
  attempt_no: number;
  error_code?: string;
  error_message?: string;
  recovery_method?: string;
  evidence_refs?: SourceRefEntry[];
  source_level?: "workbuddy_tool_reported" | "local_manual";
};

export type ClaimStageRequest = BaseWfRequest & {
  task_id: string;
  stage_run_id: string;
  client_id: string;
  executor_id: string;
  lease_ttl_seconds?: number;
};

export type SubmitStageRequest = BaseWfRequest & {
  task_id: string;
  stage_run_id: string;
  input_revision: number;
  output_artifact_revision_ids: string[];
  deliverables_summary?: string;
};

export type EvaluateStageRequest = BaseWfRequest & {
  task_id: string;
  stage_run_id: string;
  input_revision: number;
  assessment_json: Record<string, unknown>;
};

export type RecordApprovalRequest = BaseWfRequest & {
  task_id: string;
  stage_run_id: string;
  scope: string;
  decision: "approved" | "rejected";
  artifact_revision_ids: string[];
  evidence_ref: string;
  actor_id: string;
};

export type RequestChangeRequest = BaseWfRequest & {
  task_id: string;
  stage_run_id: string;
  reason: string;
  requested_by: string;
};

export type PauseTaskRequest = BaseWfRequest & {
  task_id: string;
  reason?: string;
  actor_id: string;
};

export type ResumeTaskRequest = BaseWfRequest & {
  task_id: string;
  actor_id: string;
};

export type CancelTaskRequest = BaseWfRequest & {
  task_id: string;
  reason?: string;
  actor_id: string;
};

export type CloseTaskRequest = BaseWfRequest & {
  task_id: string;
  actor_id: string;
  archive_note?: string;
};

export type ArchiveTaskRequest = BaseWfRequest & {
  task_id: string;
  actor_id: string;
};

export type ReopenArchiveRequest = BaseWfRequest & {
  task_id: string;
  actor_id: string;
  reason: string;
};

export type WfHandlerResponse = {
  ok: boolean;
  handler: WfHandlerName;
  command_id: string;
  idempotency_hit?: boolean;
  payload?: Record<string, unknown>;
  error_code?: string;
  error_message?: string;
};

export const WF_FIELD_WHITELIST_BY_HANDLER_18: Record<
  WfHandlerName,
  { allowed: string[]; required: string[]; security?: string }
> = {
  create_task: {
    allowed: [
      "schema_version",
      "command_id",
      "idempotency_key",
      "brand_id",
      "goal",
      "scope_end",
      "route_hint",
      "source_refs",
      "parent_id",
    ],
    required: ["command_id", "brand_id", "goal", "scope_end", "source_refs"],
  },
  register_artifact: {
    allowed: [
      "schema_version",
      "command_id",
      "idempotency_key",
      "task_id",
      "stage_run_id",
      "kind",
      "local_path",
      "metadata",
      "source_refs",
    ],
    required: ["command_id", "task_id", "stage_run_id", "kind", "local_path", "source_refs"],
    security:
      "path containment check（必须在 task_workspace 内）+ immutable sha256 计算 + 实际文件存在",
  },
  record_version_usage: {
    allowed: [
      "schema_version",
      "command_id",
      "idempotency_key",
      "task_id",
      "release_id",
      "action",
      "desired_revision",
      "installed_status",
      "loaded_status",
      "evidence_refs",
    ],
    required: ["command_id", "task_id", "release_id", "action", "desired_revision"],
  },
  record_execution_event: {
    allowed: [
      "schema_version",
      "command_id",
      "task_id",
      "invocation_id",
      "parent_invocation_id",
      "recovery_for_invocation_id",
      "stage_run_id",
      "subject_kind",
      "subject_id",
      "event_type",
      "attempt_no",
      "error_code",
      "error_message",
      "recovery_method",
      "evidence_refs",
      "source_level",
    ],
    required: [
      "command_id",
      "task_id",
      "invocation_id",
      "subject_kind",
      "subject_id",
      "event_type",
      "attempt_no",
    ],
  },
  "execute_command.claim_stage": {
    allowed: [
      "command_id",
      "idempotency_key",
      "task_id",
      "stage_run_id",
      "client_id",
      "executor_id",
      "lease_ttl_seconds",
    ],
    required: ["command_id", "task_id", "stage_run_id", "client_id", "executor_id"],
  },
  "execute_command.submit_stage": {
    allowed: [
      "command_id",
      "idempotency_key",
      "task_id",
      "stage_run_id",
      "input_revision",
      "output_artifact_revision_ids",
      "deliverables_summary",
    ],
    required: [
      "command_id",
      "task_id",
      "stage_run_id",
      "input_revision",
      "output_artifact_revision_ids",
    ],
  },
  "execute_command.evaluate_stage": {
    allowed: [
      "command_id",
      "idempotency_key",
      "task_id",
      "stage_run_id",
      "input_revision",
      "assessment_json",
    ],
    required: ["command_id", "task_id", "stage_run_id", "input_revision", "assessment_json"],
  },
  "execute_command.record_approval": {
    allowed: [
      "command_id",
      "idempotency_key",
      "task_id",
      "stage_run_id",
      "scope",
      "decision",
      "artifact_revision_ids",
      "evidence_ref",
      "actor_id",
    ],
    required: [
      "command_id",
      "task_id",
      "stage_run_id",
      "scope",
      "decision",
      "artifact_revision_ids",
      "evidence_ref",
      "actor_id",
    ],
  },
  "execute_command.request_change": {
    allowed: ["command_id", "idempotency_key", "task_id", "stage_run_id", "reason", "requested_by"],
    required: ["command_id", "task_id", "stage_run_id", "reason", "requested_by"],
  },
  "execute_command.pause_task": {
    allowed: ["command_id", "idempotency_key", "task_id", "reason", "actor_id"],
    required: ["command_id", "task_id", "actor_id"],
  },
  "execute_command.resume_task": {
    allowed: ["command_id", "idempotency_key", "task_id", "actor_id"],
    required: ["command_id", "task_id", "actor_id"],
  },
  "execute_command.cancel_task": {
    allowed: ["command_id", "idempotency_key", "task_id", "reason", "actor_id"],
    required: ["command_id", "task_id", "actor_id"],
  },
  "execute_command.close_task": {
    allowed: ["command_id", "idempotency_key", "task_id", "actor_id", "archive_note"],
    required: ["command_id", "task_id", "actor_id"],
  },
  "execute_command.archive_task": {
    allowed: ["command_id", "idempotency_key", "task_id", "actor_id"],
    required: ["command_id", "task_id", "actor_id"],
  },
  "execute_command.reopen_archive": {
    allowed: ["command_id", "idempotency_key", "task_id", "actor_id", "reason"],
    required: ["command_id", "task_id", "actor_id", "reason"],
  },
  "read.get_task": {
    allowed: ["command_id", "idempotency_key", "task_id"],
    required: ["command_id", "task_id"],
  },
  "read.list_tasks": {
    allowed: ["command_id", "idempotency_key", "brand_id", "status", "limit", "offset"],
    required: ["command_id"],
  },
  "read.get_task_governance_detail": {
    allowed: ["command_id", "idempotency_key", "task_id"],
    required: ["command_id", "task_id"],
  },
  "read.list_stage_runs": {
    allowed: ["command_id", "idempotency_key", "task_id"],
    required: ["command_id", "task_id"],
  },
  "read.list_artifacts": {
    allowed: ["command_id", "idempotency_key", "task_id", "kind"],
    required: ["command_id", "task_id"],
  },
  "read.list_execution_events": {
    allowed: [
      "command_id",
      "idempotency_key",
      "task_id",
      "stage_run_id",
      "event_type",
      "subject_kind",
      "limit",
      "offset",
    ],
    required: ["command_id", "task_id"],
  },
  "read.list_version_usages": {
    allowed: ["command_id", "idempotency_key", "task_id", "limit", "offset"],
    required: ["command_id", "task_id"],
  },
} as const;
