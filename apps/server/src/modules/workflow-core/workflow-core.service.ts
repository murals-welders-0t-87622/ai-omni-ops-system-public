import { Injectable, Logger, BadRequestException, Inject, forwardRef } from "@nestjs/common";
import { Prisma, OntOutboxEventType, WfExecutionEventType, WfSubjectKind, WfTaskStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { OntologyMapperService } from "../ontology-mapper/ontology-mapper.service";
import {
  WF_FIELD_WHITELIST_BY_HANDLER_18,
  WF_SCHEMA_VERSION,
  WfHandlerName,
  WfHandlerResponse,
  CreateTaskRequest,
  RegisterArtifactRequest,
  RecordVersionUsageRequest,
  RecordExecutionEventRequest,
  ClaimStageRequest,
  SubmitStageRequest,
  EvaluateStageRequest,
  RecordApprovalRequest,
  RequestChangeRequest,
  PauseTaskRequest,
  ResumeTaskRequest,
  CancelTaskRequest,
  CloseTaskRequest,
  ArchiveTaskRequest,
  ReopenArchiveRequest,
  BaseWfRequest,
  SourceRefEntry,
} from "./types";

type UnknownWfRequest = Record<string, unknown>;

const TASK_DEFAULT_ROUTE_ID = "route:v2:9panel-generic";
const TASK_DEFAULT_ROUTE_VERSION = "2026-09-27";
const TASK_DEFAULT_EXPERT_ID = "ontology_lab_operator";

@Injectable()
export class WorkflowCoreService {
  private readonly logger = new Logger(WorkflowCoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OntologyMapperService))
    private readonly ontologyMapper: OntologyMapperService,
  ) {}

  private async appendOutboxAfterWrite(params: {
    eventType: OntOutboxEventType;
    sourceTable: "wf_tasks" | "wf_stage_runs" | "wf_artifacts" | "wf_approvals" | "wf_gate_results" | "wf_domain_events" | "wf_guarded_tool_calls" | "wf_version_usages" | "wf_execution_events" | "business_assets";
    sourceRecordId: string;
    brandId: string;
    payloadJson: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.ontologyMapper.appendOutbox({
        event_type: params.eventType as any,
        source_table: params.sourceTable,
        source_record_id: params.sourceRecordId,
        brand_id: params.brandId,
        payload: params.payloadJson,
      });
    } catch (err) {
      this.logger.warn(`OQ6_APPEND_OUTBOX_FAIL event=${params.eventType} src=${params.sourceTable}/${params.sourceRecordId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async taskBrandOf(taskId: string): Promise<string> {
    try {
      const row = await this.prisma.wfTask.findUnique({ where: { taskId }, select: { brandId: true } });
      return row?.brandId ?? "";
    } catch {
      return "";
    }
  }
  private async stageKeyOf(stageRunId: string | undefined | null): Promise<string> {
    if (!stageRunId) return "";
    try {
      const row = await this.prisma.wfStageRun.findUnique({ where: { stageRunId }, select: { stageKey: true } });
      return row?.stageKey ?? "";
    } catch {
      return "";
    }
  }

  private validateRequest(handler: WfHandlerName, request: UnknownWfRequest): void {
    const rule = WF_FIELD_WHITELIST_BY_HANDLER_18[handler];
    if (!rule) {
      throw new BadRequestException(`WF_UNKNOWN_HANDLER: ${handler}`);
    }
    const schemaVersion = request.schema_version;
    if (schemaVersion && schemaVersion !== WF_SCHEMA_VERSION) {
      throw new BadRequestException(
        `WF_SCHEMA_MISMATCH: expected ${WF_SCHEMA_VERSION} got ${String(schemaVersion)}`
      );
    }
    for (const field of Object.keys(request)) {
      if (!rule.allowed.includes(field)) {
        throw new BadRequestException(`WF_UNKNOWN_FIELD: handler=${handler} field=${field}`);
      }
    }
    for (const field of rule.required) {
      const value = request[field];
      if (value === undefined || value === null || (typeof value === "string" && value === "")) {
        throw new BadRequestException(`WF_MISSING_REQUIRED: handler=${handler} field=${field}`);
      }
    }
  }

  private async idempotentApply<TArgs extends BaseWfRequest>(
    scope: WfHandlerName,
    request: TArgs,
    execute: () => Promise<Record<string, unknown>>
  ): Promise<WfHandlerResponse> {
    const scopeStr = `wf:${scope}`;
    const idemKey = request.idempotency_key ?? request.command_id;
    const hit = await this.prisma.wfIdempotencyRecord.findUnique({
      where: { scope_idempotencyKey: { scope: scopeStr, idempotencyKey: idemKey } },
    });
    if (hit) {
      this.logger.verbose(`idempotency hit scope=${scopeStr} key=${idemKey}`);
      return {
        ok: true,
        handler: scope,
        command_id: request.command_id,
        idempotency_hit: true,
        payload: (hit.responseJson as Record<string, unknown>) ?? undefined,
      };
    }
    const requestHash = hashStable(JSON.stringify(request));
    const payload = await execute();
    await this.prisma.wfIdempotencyRecord.create({
      data: {
        scope: scopeStr,
        idempotencyKey: idemKey,
        requestHash,
        responseJson: payload as unknown as Prisma.InputJsonValue,
      },
    });
    return {
      ok: true,
      handler: scope,
      command_id: request.command_id,
      payload,
    };
  }

  private newId(prefix: string): string {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${t}${r}`;
  }

  private toJsonOrEmptyList(v: unknown): Prisma.InputJsonValue {
    if (v == null) return {} as unknown as Prisma.InputJsonValue;
    if (Array.isArray(v)) return v as unknown as Prisma.InputJsonValue;
    if (typeof v === "object") return v as unknown as Prisma.InputJsonValue;
    return {} as unknown as Prisma.InputJsonValue;
  }

  private toSourceRefsJson(v: SourceRefEntry[] | undefined): Prisma.InputJsonValue {
    if (!v) return [] as unknown as Prisma.InputJsonValue;
    return v as unknown as Prisma.InputJsonValue;
  }

  private stageKeyFromHint(routeHint: string | undefined, fallback = "stage-3-strategy-plan"): string {
    if (!routeHint) return fallback;
    if (routeHint.includes("asset") || routeHint.includes("stage-1")) return "stage-1-asset-library";
    if (routeHint.includes("audience") || routeHint.includes("stage-2")) return "stage-2-audience-positioning";
    if (routeHint.includes("strategy") || routeHint.includes("stage-3")) return "stage-3-strategy-plan";
    if (routeHint.includes("content") || routeHint.includes("stage-4")) return "stage-4-content-execution";
    if (routeHint.includes("review") || routeHint.includes("stage-5")) return "stage-5-review-optimization";
    return fallback;
  }

  private normalizeInstalledStatus(
    v: "unverified" | "self_reported" | "evidence_verified" | undefined
  ): "UNVERIFIED" | "SELF_REPORTED" | "EVIDENCE_VERIFIED" {
    if (!v) return "UNVERIFIED";
    if (v === "self_reported") return "SELF_REPORTED";
    if (v === "evidence_verified") return "EVIDENCE_VERIFIED";
    return "UNVERIFIED";
  }

  private async bumpTaskRevision(taskId: string): Promise<{ from: number; to: number }> {
    const row = await this.prisma.wfTask.findUnique({ where: { taskId }, select: { revision: true } });
    const from = row?.revision ?? 1;
    const to = from + 1;
    await this.prisma.wfTask.update({ where: { taskId }, data: { revision: to } });
    return { from, to };
  }

  private async appendDomainEvent(
    taskId: string,
    kind:
      | "TASK_CREATED"
      | "STAGE_CLAIMED"
      | "STAGE_SUBMITTED"
      | "STAGE_EVALUATED"
      | "STAGE_APPROVED"
      | "TASK_CLOSED"
      | "TASK_PAUSED"
      | "TASK_RESUMED"
      | "TASK_CANCELLED"
      | "TASK_ARCHIVED"
      | "ARTIFACT_REGISTERED",
    actorId: string,
    payload: Record<string, unknown>,
    opts: { commandId?: string; revisionBump?: { from: number; to: number } } = {}
  ): Promise<string> {
    const eventId = this.newId("wfevt");
    const { from, to } = opts.revisionBump ?? (await this.bumpTaskRevision(taskId));
    await this.prisma.wfDomainEvent.create({
      data: {
        eventId,
        taskId,
        commandId: opts.commandId ?? null,
        kind,
        fromRevision: from,
        toRevision: to,
        actorId,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
    return eventId;
  }

  async createTask(request: CreateTaskRequest): Promise<WfHandlerResponse> {
    this.validateRequest("create_task", request as UnknownWfRequest);
    return this.idempotentApply("create_task", request, async () => {
      const taskId = request.command_id.startsWith("task_") ? request.command_id : this.newId("task");
      const stageKey = this.stageKeyFromHint(request.route_hint);
      const revision = 1;
      await this.prisma.wfTask.create({
        data: {
          taskId,
          brandId: request.brand_id,
          goal: request.goal,
          scopeEnd: request.scope_end,
          routeId: request.route_hint ?? TASK_DEFAULT_ROUTE_ID,
          routeVersion: TASK_DEFAULT_ROUTE_VERSION,
          status: "READY",
          revision,
          archiveStatus: "PENDING",
          authority: "LOCAL",
          parentId: request.parent_id ?? null,
          workspacePath: `/workspaces/${request.brand_id}/${taskId}`,
          sourceRefs: this.toSourceRefsJson(request.source_refs),
        },
      });
      const stageRunId = this.newId("srun");
      await this.prisma.wfStageRun.create({
        data: {
          stageRunId,
          taskId,
          stageKey,
          generation: 1,
          ownerExpertId: TASK_DEFAULT_EXPERT_ID,
          status: "PENDING",
          dependenciesJson: [] as unknown as Prisma.InputJsonValue,
          requiresJson: [] as unknown as Prisma.InputJsonValue,
          producesJson: [] as unknown as Prisma.InputJsonValue,
          workMode: "EXPERT_WORK",
          inputRevision: 1,
          outputArtifactRevisionIds: [] as unknown as Prisma.InputJsonValue,
          fencingToken: 0,
        },
      });
      const domainEventId = await this.appendDomainEvent(
        taskId,
        "TASK_CREATED",
        TASK_DEFAULT_EXPERT_ID,
        {
          route_hint: request.route_hint ?? null,
          parent_id: request.parent_id ?? null,
          initial_stage_run_id: stageRunId,
          initial_stage_key: stageKey,
          source_refs_count: (request.source_refs ?? []).length,
        },
        { commandId: request.command_id, revisionBump: { from: revision, to: revision + 1 } }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.task_created,
        sourceTable: "wf_tasks",
        sourceRecordId: taskId,
        brandId: request.brand_id,
        payloadJson: { task_id: taskId, brand_id: request.brand_id, goal: request.goal, status: "READY", revision: revision + 1, stage_run_id: stageRunId, stage_key: stageKey, command_id: request.command_id },
      });
      return {
        task_id: taskId,
        stage_run_id: stageRunId,
        stage_key: stageKey,
        status: "READY",
        revision: revision + 1,
        domain_event_id: domainEventId,
      };
    });
  }

  async registerArtifact(request: RegisterArtifactRequest): Promise<WfHandlerResponse> {
    this.validateRequest("register_artifact", request as UnknownWfRequest);
    return this.idempotentApply("register_artifact", request, async () => {
      const artifactId = request.local_path.split(/[\\/]/).slice(-2, -1)[0] ?? this.newId("art");
      const existingRows = await this.prisma.wfArtifact.findMany({
        where: { artifactId },
        orderBy: { revisionNo: "desc" },
        take: 1,
        select: { revisionNo: true },
      });
      const revisionNo = (existingRows[0]?.revisionNo ?? 0) + 1;
      const artifactRevisionId = `${artifactId}_r${revisionNo}`;
      const sha =
        typeof request.metadata?.sha256 === "string" && request.metadata.sha256.length > 0
          ? request.metadata.sha256
          : hashStable(request.local_path + revisionNo);
      const byteLen =
        typeof request.metadata?.byteLength === "number" ? (request.metadata.byteLength as number) : 0;
      const mime =
        typeof request.metadata?.mimeType === "string" && request.metadata.mimeType.length > 0
          ? request.metadata.mimeType
          : "application/octet-stream";
      await this.prisma.wfArtifact.create({
        data: {
          artifactRevisionId,
          artifactId,
          revisionNo,
          taskId: request.task_id,
          kind: request.kind,
          localPath: request.local_path,
          sha256: sha,
          byteLength: byteLen,
          mimeType: mime,
          metadata: this.toJsonOrEmptyList(request.metadata ?? {}),
          sourceRefs: this.toSourceRefsJson(request.source_refs),
        },
      });
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "ARTIFACT_REGISTERED",
        TASK_DEFAULT_EXPERT_ID,
        {
          artifact_revision_id: artifactRevisionId,
          artifact_id: artifactId,
          revision_no: revisionNo,
          stage_run_id: request.stage_run_id,
          kind: request.kind,
          local_path: request.local_path,
          sha256: sha,
          byte_length: byteLen,
          mime_type: mime,
        },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.artifact_registered,
        sourceTable: "wf_artifacts",
        sourceRecordId: artifactRevisionId,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { artifact_revision_id: artifactRevisionId, artifact_id: artifactId, revision_no: revisionNo, stage_run_id: request.stage_run_id, kind: request.kind, local_path: request.local_path, sha256: sha, byte_length: byteLen, mime_type: mime },
      });
      return {
        artifact_revision_id: artifactRevisionId,
        artifact_id: artifactId,
        revision_no: revisionNo,
        domain_event_id: domainEventId,
      };
    });
  }

  async recordVersionUsage(request: RecordVersionUsageRequest): Promise<WfHandlerResponse> {
    this.validateRequest("record_version_usage", request as UnknownWfRequest);
    return this.idempotentApply("record_version_usage", request, async () => {
      await this.prisma.wfVersionRelease.upsert({
        where: { releaseId: request.release_id },
        update: {},
        create: {
          releaseId: request.release_id,
          manifestHash: hashStable(`release:${request.release_id}:${request.desired_revision}`),
          snapshotPath: `/snapshots/${request.release_id}`,
          manifest: { desired_revision: request.desired_revision } as unknown as Prisma.InputJsonValue,
          status: "CANDIDATE",
        },
      });
      const now = new Date();
      const usageId = this.newId("vuse");
      if (request.action === "start") {
        await this.prisma.wfVersionUsage.upsert({
          where: { taskId_releaseId: { taskId: request.task_id, releaseId: request.release_id } },
          update: {
            desiredRevision: request.desired_revision,
            installedStatus: this.normalizeInstalledStatus(request.installed_status),
            loadedStatus: this.normalizeInstalledStatus(request.loaded_status),
            evidence: this.toSourceRefsJson(request.evidence_refs),
          },
          create: {
            usageId,
            taskId: request.task_id,
            releaseId: request.release_id,
            startedAt: now,
            desiredRevision: request.desired_revision,
            installedStatus: this.normalizeInstalledStatus(request.installed_status),
            loadedStatus: this.normalizeInstalledStatus(request.loaded_status),
            evidence: this.toSourceRefsJson(request.evidence_refs),
          },
        });
      } else {
        await this.prisma.wfVersionUsage.update({
          where: { taskId_releaseId: { taskId: request.task_id, releaseId: request.release_id } },
          data: {
            endedAt: now,
            desiredRevision: request.desired_revision,
            installedStatus: this.normalizeInstalledStatus(request.installed_status ?? "self_reported"),
            loadedStatus: this.normalizeInstalledStatus(request.loaded_status ?? "self_reported"),
            evidence: this.toSourceRefsJson(request.evidence_refs),
          },
        });
      }
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "TASK_CREATED",
        TASK_DEFAULT_EXPERT_ID,
        {
          usage_id: usageId,
          action: request.action,
          release_id: request.release_id,
          desired_revision: request.desired_revision,
          installed_status: request.installed_status,
          loaded_status: request.loaded_status,
          event_subtype: "version_usage",
        },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.version_used,
        sourceTable: "wf_version_usages",
        sourceRecordId: usageId,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { usage_id: usageId, action: request.action, release_id: request.release_id, desired_revision: request.desired_revision, loaded_status: request.loaded_status ?? "self_reported", task_id: request.task_id, task_revision: rev },
      });
      return {
        usage_id: usageId,
        action: request.action,
        desired_revision: request.desired_revision,
        task_revision: rev,
        domain_event_id: domainEventId,
      };
    });
  }

  async recordExecutionEvent(request: RecordExecutionEventRequest): Promise<WfHandlerResponse> {
    this.validateRequest("record_execution_event", request as UnknownWfRequest);
    return this.idempotentApply("record_execution_event", request, async () => {
      const eventId = this.newId("ev");
      await this.prisma.wfExecutionEvent.create({
        data: {
          eventId,
          taskId: request.task_id,
          invocationId: request.invocation_id,
          parentInvocationId: request.parent_invocation_id ?? null,
          recoveryForInvocationId: request.recovery_for_invocation_id ?? null,
          stageRunId: request.stage_run_id ?? null,
          subjectKind: request.subject_kind === "skill" ? "SKILL" : "EXPERT",
          subjectId: request.subject_id,
          eventType:
            request.event_type === "succeeded"
              ? "SUCCEEDED"
              : request.event_type === "failed"
              ? "FAILED"
              : "STARTED",
          attemptNo: request.attempt_no,
          errorCode: request.error_code ?? null,
          errorMessage: request.error_message ?? null,
          recoveryMethod: request.recovery_method ?? null,
          evidenceRefsJson: this.toSourceRefsJson(request.evidence_refs),
          sourceLevel: request.source_level ?? "workbuddy_tool_reported",
          commandId: request.command_id,
        },
      });
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "STAGE_CLAIMED",
        request.subject_id,
        {
          execution_event_id: eventId,
          invocation_id: request.invocation_id,
          subject_kind: request.subject_kind,
          subject_id: request.subject_id,
          event_type: request.event_type,
          attempt_no: request.attempt_no,
          stage_run_id: request.stage_run_id,
          event_subtype: "execution_event",
        },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.domain_event_appended,
        sourceTable: "wf_execution_events",
        sourceRecordId: eventId,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { execution_event_id: eventId, invocation_id: request.invocation_id, subject_kind: request.subject_kind, subject_id: request.subject_id, event_type: request.event_type, attempt_no: request.attempt_no, stage_run_id: request.stage_run_id, task_id: request.task_id },
      });
      return {
        event_id: eventId,
        subject_kind: request.subject_kind,
        subject_id: request.subject_id,
        event_type: request.event_type,
        attempt_no: request.attempt_no,
        domain_event_id: domainEventId,
        task_revision: rev,
      };
    });
  }

  async claimStage(request: ClaimStageRequest): Promise<WfHandlerResponse> {
    this.validateRequest("execute_command.claim_stage", request as UnknownWfRequest);
    return this.idempotentApply("execute_command.claim_stage", request, async () => {
      const attemptId = this.newId("att");
      const leaseId = this.newId("lease");
      const fencingToken = Math.floor(Math.random() * 1_000_000) + 1;
      const now = new Date();
      const ttlSec = request.lease_ttl_seconds ?? 3600;
      const expiresAt = new Date(now.getTime() + ttlSec * 1000);
      await this.prisma.wfStageRun.upsert({
        where: { stageRunId: request.stage_run_id },
        update: {
          status: "RUNNING",
          clientId: request.client_id,
          executorId: request.executor_id,
          leaseId,
          fencingToken,
          leaseExpiresAt: expiresAt,
          currentAttemptId: attemptId,
          ownerExpertId: request.executor_id,
        },
        create: {
          stageRunId: request.stage_run_id,
          taskId: request.task_id,
          stageKey: this.stageKeyFromHint(undefined, "stage-3-strategy-plan"),
          generation: 1,
          ownerExpertId: request.executor_id,
          status: "RUNNING",
          dependenciesJson: [] as unknown as Prisma.InputJsonValue,
          requiresJson: [] as unknown as Prisma.InputJsonValue,
          producesJson: [] as unknown as Prisma.InputJsonValue,
          workMode: "EXPERT_WORK",
          clientId: request.client_id,
          executorId: request.executor_id,
          leaseId,
          fencingToken,
          leaseExpiresAt: expiresAt,
          currentAttemptId: attemptId,
          inputRevision: 1,
          outputArtifactRevisionIds: [] as unknown as Prisma.InputJsonValue,
        },
      });
      await this.prisma.wfExecutionAttempt.create({
        data: {
          attemptId,
          stageRunId: request.stage_run_id,
          attemptNo: 1,
          clientId: request.client_id,
          startedAt: now,
        },
      });
      await this.prisma.wfExecutionLease.create({
        data: {
          leaseId,
          stageRunId: request.stage_run_id,
          attemptId,
          clientId: request.client_id,
          executorId: request.executor_id,
          fencingToken,
          acquiredAt: now,
          expiresAt,
        },
      });
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "STAGE_CLAIMED",
        request.executor_id,
        {
          stage_run_id: request.stage_run_id,
          client_id: request.client_id,
          executor_id: request.executor_id,
          lease_id: leaseId,
          fencing_token: fencingToken,
          lease_ttl_seconds: ttlSec,
          attempt_id: attemptId,
        },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.stage_claimed,
        sourceTable: "wf_stage_runs",
        sourceRecordId: request.stage_run_id,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { stage_run_id: request.stage_run_id, task_id: request.task_id, stage_key: await this.stageKeyOf(request.stage_run_id), status: "RUNNING", executor_id: request.executor_id, lease_id: leaseId, attempt_id: attemptId },
      });
      return {
        stage_run_id: request.stage_run_id,
        status: "RUNNING",
        attempt_id: attemptId,
        lease_id: leaseId,
        fencing_token: fencingToken,
        lease_expires_at: expiresAt.toISOString(),
        domain_event_id: domainEventId,
      };
    });
  }

  async submitStage(request: SubmitStageRequest): Promise<WfHandlerResponse> {
    this.validateRequest("execute_command.submit_stage", request as UnknownWfRequest);
    return this.idempotentApply("execute_command.submit_stage", request, async () => {
      await this.prisma.wfStageRun.update({
        where: { stageRunId: request.stage_run_id },
        data: {
          status: "SUBMITTED",
          inputRevision: request.input_revision,
          outputArtifactRevisionIds: (request.output_artifact_revision_ids ??
            []) as unknown as Prisma.InputJsonValue,
          approvalMode: "single_stage_submit",
        },
      });
      const attempt = await this.prisma.wfExecutionAttempt.findFirst({
        where: { stageRunId: request.stage_run_id, endedAt: null },
        orderBy: [{ attemptNo: "desc" }],
        select: { attemptId: true, startedAt: true },
      });
      if (attempt) {
        await this.prisma.wfExecutionAttempt.update({
          where: { attemptId: attempt.attemptId },
          data: { endedAt: new Date(), outcome: "SUCCEEDED" },
        });
      }
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "STAGE_SUBMITTED",
        TASK_DEFAULT_EXPERT_ID,
        {
          stage_run_id: request.stage_run_id,
          input_revision: request.input_revision,
          output_artifact_revision_ids: request.output_artifact_revision_ids ?? [],
          deliverables_summary: request.deliverables_summary ?? null,
        },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.stage_submitted,
        sourceTable: "wf_stage_runs",
        sourceRecordId: request.stage_run_id,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { stage_run_id: request.stage_run_id, task_id: request.task_id, status: "SUBMITTED", input_revision: request.input_revision, output_artifact_revision_ids: request.output_artifact_revision_ids ?? [], deliverables_summary: request.deliverables_summary ?? null },
      });
      return {
        stage_run_id: request.stage_run_id,
        status: "SUBMITTED",
        input_revision: request.input_revision,
        domain_event_id: domainEventId,
      };
    });
  }

  async evaluateStage(request: EvaluateStageRequest): Promise<WfHandlerResponse> {
    this.validateRequest("execute_command.evaluate_stage", request as UnknownWfRequest);
    return this.idempotentApply("execute_command.evaluate_stage", request, async () => {
      const gateResultId = this.newId("gate");
      const verdict = (() => {
        const aj = request.assessment_json ?? {};
        const v = (aj.verdict as string)?.toUpperCase?.();
        if (v === "CHANGES_REQUESTED") return "CHANGES_REQUESTED";
        if (v === "BLOCKED") return "BLOCKED";
        return "ACCEPTED";
      })();
      const stageStatus =
        verdict === "ACCEPTED"
          ? "ACCEPTED"
          : verdict === "CHANGES_REQUESTED"
          ? "CHANGES_REQUESTED"
          : "BLOCKED";
      const score =
        typeof (request.assessment_json?.score as unknown) === "number"
          ? (request.assessment_json.score as number)
          : null;
      const threshold =
        typeof (request.assessment_json?.threshold as unknown) === "number"
          ? (request.assessment_json.threshold as number)
          : null;
      await this.prisma.wfGateResult.create({
        data: {
          gateResultId,
          taskId: request.task_id,
          stageRunId: request.stage_run_id,
          verdict,
          score,
          threshold,
          assessment: (request.assessment_json ?? {}) as unknown as Prisma.InputJsonValue,
        },
      });
      await this.prisma.wfStageRun.update({
        where: { stageRunId: request.stage_run_id },
        data: { status: stageStatus },
      });
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "STAGE_EVALUATED",
        TASK_DEFAULT_EXPERT_ID,
        {
          stage_run_id: request.stage_run_id,
          input_revision: request.input_revision,
          gate_result_id: gateResultId,
          verdict,
          stage_status: stageStatus,
          score,
          threshold,
        },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.stage_accepted,
        sourceTable: "wf_gate_results",
        sourceRecordId: gateResultId,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { gate_result_id: gateResultId, task_id: request.task_id, stage_run_id: request.stage_run_id, verdict, stage_status: stageStatus, score, threshold, passed: verdict === "ACCEPTED" },
      });
      return {
        gate_result_id: gateResultId,
        verdict,
        stage_status: stageStatus,
        domain_event_id: domainEventId,
      };
    });
  }

  async recordApproval(request: RecordApprovalRequest): Promise<WfHandlerResponse> {
    this.validateRequest("execute_command.record_approval", request as UnknownWfRequest);
    return this.idempotentApply("execute_command.record_approval", request, async () => {
      const approvalId = this.newId("app");
      const decision = request.decision === "approved" ? "APPROVED" : "REJECTED";
      await this.prisma.wfApproval.create({
        data: {
          approvalId,
          taskId: request.task_id,
          stageRunId: request.stage_run_id,
          scope: request.scope,
          decision,
          artifactRevisionIds: (request.artifact_revision_ids ??
            []) as unknown as Prisma.InputJsonValue,
          evidenceRef: request.evidence_ref,
          actorId: request.actor_id,
        },
      });
      if (decision === "APPROVED") {
        await this.prisma.wfStageRun.update({
          where: { stageRunId: request.stage_run_id },
          data: { status: "ACCEPTED" },
        });
      }
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "STAGE_APPROVED",
        request.actor_id,
        {
          approval_id: approvalId,
          stage_run_id: request.stage_run_id,
          scope: request.scope,
          decision,
          artifact_revision_ids: request.artifact_revision_ids ?? [],
          evidence_ref: request.evidence_ref,
        },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.approval_recorded,
        sourceTable: "wf_approvals",
        sourceRecordId: approvalId,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { approval_id: approvalId, task_id: request.task_id, stage_run_id: request.stage_run_id, scope: request.scope, decision, actor_id: request.actor_id, artifact_revision_ids: request.artifact_revision_ids ?? [] },
      });
      return {
        approval_id: approvalId,
        decision,
        scope: request.scope,
        domain_event_id: domainEventId,
      };
    });
  }

  async requestChange(request: RequestChangeRequest): Promise<WfHandlerResponse> {
    this.validateRequest("execute_command.request_change", request as UnknownWfRequest);
    return this.idempotentApply("execute_command.request_change", request, async () => {
      const gateResultId = this.newId("gate");
      await this.prisma.wfGateResult.create({
        data: {
          gateResultId,
          taskId: request.task_id,
          stageRunId: request.stage_run_id,
          verdict: "CHANGES_REQUESTED",
          assessment: { reason: request.reason, requested_by: request.requested_by } as unknown as Prisma.InputJsonValue,
        },
      });
      await this.prisma.wfStageRun.update({
        where: { stageRunId: request.stage_run_id },
        data: { status: "CHANGES_REQUESTED" },
      });
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "STAGE_EVALUATED",
        request.requested_by,
        {
          gate_result_id: gateResultId,
          action: "request_change",
          stage_run_id: request.stage_run_id,
          reason: request.reason,
          requested_by: request.requested_by,
          event_subtype: "request_change",
        },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.stage_changes_requested,
        sourceTable: "wf_stage_runs",
        sourceRecordId: request.stage_run_id,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { stage_run_id: request.stage_run_id, task_id: request.task_id, stage_status: "CHANGES_REQUESTED", gate_result_id: gateResultId, reason: request.reason, requested_by: request.requested_by },
      });
      return {
        gate_result_id: gateResultId,
        stage_status: "CHANGES_REQUESTED",
        reason: request.reason,
        requested_by: request.requested_by,
        domain_event_id: domainEventId,
      };
    });
  }

  async pauseTask(request: PauseTaskRequest): Promise<WfHandlerResponse> {
    this.validateRequest("execute_command.pause_task", request as UnknownWfRequest);
    return this.idempotentApply("execute_command.pause_task", request, async () => {
      await this.prisma.wfTask.update({
        where: { taskId: request.task_id },
        data: { status: "PAUSED" },
      });
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "TASK_PAUSED",
        request.actor_id,
        { reason: request.reason ?? null, actor_id: request.actor_id },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.task_status_changed,
        sourceTable: "wf_tasks",
        sourceRecordId: request.task_id,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { task_id: request.task_id, transition: "PAUSE", status: "PAUSED", reason: request.reason ?? null, actor_id: request.actor_id },
      });
      return { task_id: request.task_id, status: "PAUSED", domain_event_id: domainEventId };
    });
  }

  async resumeTask(request: ResumeTaskRequest): Promise<WfHandlerResponse> {
    this.validateRequest("execute_command.resume_task", request as UnknownWfRequest);
    return this.idempotentApply("execute_command.resume_task", request, async () => {
      await this.prisma.wfTask.update({
        where: { taskId: request.task_id },
        data: { status: "RUNNING" },
      });
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "TASK_RESUMED",
        request.actor_id,
        { actor_id: request.actor_id },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.task_status_changed,
        sourceTable: "wf_tasks",
        sourceRecordId: request.task_id,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { task_id: request.task_id, transition: "RESUME", status: "RUNNING", actor_id: request.actor_id },
      });
      return { task_id: request.task_id, status: "RUNNING", domain_event_id: domainEventId };
    });
  }

  async cancelTask(request: CancelTaskRequest): Promise<WfHandlerResponse> {
    this.validateRequest("execute_command.cancel_task", request as UnknownWfRequest);
    return this.idempotentApply("execute_command.cancel_task", request, async () => {
      await this.prisma.wfTask.update({
        where: { taskId: request.task_id },
        data: { status: "CANCELLED" },
      });
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "TASK_CANCELLED",
        request.actor_id,
        { reason: request.reason ?? null, actor_id: request.actor_id },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.task_status_changed,
        sourceTable: "wf_tasks",
        sourceRecordId: request.task_id,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { task_id: request.task_id, transition: "CANCEL", status: "CANCELLED", reason: request.reason ?? null, actor_id: request.actor_id },
      });
      return { task_id: request.task_id, status: "CANCELLED", domain_event_id: domainEventId };
    });
  }

  async closeTask(request: CloseTaskRequest): Promise<WfHandlerResponse> {
    this.validateRequest("execute_command.close_task", request as UnknownWfRequest);
    return this.idempotentApply("execute_command.close_task", request, async () => {
      await this.prisma.wfTask.update({
        where: { taskId: request.task_id },
        data: { status: "COMPLETED", archiveStatus: "PENDING" },
      });
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "TASK_CLOSED",
        request.actor_id,
        { actor_id: request.actor_id, archive_note: request.archive_note ?? null },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.task_status_changed,
        sourceTable: "wf_tasks",
        sourceRecordId: request.task_id,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { task_id: request.task_id, transition: "CLOSE", status: "COMPLETED", archive_status: "PENDING", archive_note: request.archive_note ?? null, actor_id: request.actor_id },
      });
      return {
        task_id: request.task_id,
        status: "COMPLETED",
        archive_status: "PENDING",
        domain_event_id: domainEventId,
      };
    });
  }

  async archiveTask(request: ArchiveTaskRequest): Promise<WfHandlerResponse> {
    this.validateRequest("execute_command.archive_task", request as UnknownWfRequest);
    return this.idempotentApply("execute_command.archive_task", request, async () => {
      await this.prisma.wfTask.update({
        where: { taskId: request.task_id },
        data: { archiveStatus: "COMPLETED" },
      });
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "TASK_ARCHIVED",
        request.actor_id,
        { actor_id: request.actor_id },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.task_status_changed,
        sourceTable: "wf_tasks",
        sourceRecordId: request.task_id,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { task_id: request.task_id, transition: "ARCHIVE", archive_status: "COMPLETED", actor_id: request.actor_id },
      });
      return {
        task_id: request.task_id,
        archive_status: "COMPLETED",
        domain_event_id: domainEventId,
      };
    });
  }

  async reopenArchive(request: ReopenArchiveRequest): Promise<WfHandlerResponse> {
    this.validateRequest("execute_command.reopen_archive", request as UnknownWfRequest);
    return this.idempotentApply("execute_command.reopen_archive", request, async () => {
      await this.prisma.wfTask.update({
        where: { taskId: request.task_id },
        data: { archiveStatus: "PENDING", status: "RUNNING" },
      });
      const rev = await this.bumpTaskRevision(request.task_id);
      const domainEventId = await this.appendDomainEvent(
        request.task_id,
        "TASK_CREATED",
        request.actor_id,
        {
          action: "reopen_archive",
          reason: request.reason,
          actor_id: request.actor_id,
        },
        { commandId: request.command_id, revisionBump: rev }
      );
      await this.appendOutboxAfterWrite({
        eventType: OntOutboxEventType.task_reopened_archive,
        sourceTable: "wf_tasks",
        sourceRecordId: request.task_id,
        brandId: await this.taskBrandOf(request.task_id),
        payloadJson: { task_id: request.task_id, transition: "REOPEN_ARCHIVE", status: "RUNNING", archive_status: "PENDING", reason: request.reason, actor_id: request.actor_id },
      });
      return {
        task_id: request.task_id,
        archive_status: "PENDING",
        status: "RUNNING",
        reason: request.reason,
        domain_event_id: domainEventId,
      };
    });
  }

  async getTask(commandId: string, taskId: string): Promise<WfHandlerResponse> {
    this.validateRequest("read.get_task", { command_id: commandId, task_id: taskId });
    const row = await this.prisma.wfTask.findUnique({ where: { taskId } });
    return {
      ok: true,
      handler: "read.get_task",
      command_id: commandId,
      payload: row ? (row as unknown as Record<string, unknown>) : { found: false },
    };
  }

  async listTasks(
    commandId: string,
    filters: { brandId?: string; status?: string; limit?: string; offset?: string }
  ): Promise<WfHandlerResponse> {
    this.validateRequest("read.list_tasks", {
      command_id: commandId,
      brand_id: filters.brandId,
      status: filters.status,
      limit: filters.limit,
      offset: filters.offset,
    });
    const limit = clampInt(filters.limit, 1, 200, 50);
    const offset = clampInt(filters.offset, 0, 1_000_000, 0);
    const status = normalizeEnumValue("status", filters.status, WfTaskStatus);
    const where: Prisma.WfTaskWhereInput = {
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
      ...(status ? { status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.wfTask.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: offset,
        take: limit,
        include: {
          stageRuns: { orderBy: [{ createdAt: "asc" }], take: 5 },
          artifacts: { orderBy: [{ createdAt: "desc" }], take: 3 },
          approvals: { orderBy: [{ createdAt: "desc" }], take: 3 },
          executionEvents: { orderBy: [{ createdAt: "desc" }], take: 5 },
          versionUsages: { orderBy: [{ startedAt: "desc" }], take: 3 },
        },
      }),
      this.prisma.wfTask.count({ where }),
    ]);
    return {
      ok: true,
      handler: "read.list_tasks",
      command_id: commandId,
      payload: jsonSafeBigInt({
        rows,
        total,
        limit,
        offset,
        filters: {
          brand_id: filters.brandId ?? null,
          status: status ?? null,
        },
      }) as Record<string, unknown>,
    };
  }

  async getTaskGovernanceDetail(commandId: string, taskId: string): Promise<WfHandlerResponse> {
    this.validateRequest("read.get_task_governance_detail", { command_id: commandId, task_id: taskId });
    const task = await this.prisma.wfTask.findUnique({
      where: { taskId },
      include: {
        stageRuns: {
          orderBy: [{ createdAt: "asc" }],
          include: {
            executionAttempts: { orderBy: [{ startedAt: "asc" }] },
            executionLeases: { orderBy: [{ acquiredAt: "asc" }] },
            approvals: { orderBy: [{ createdAt: "asc" }] },
            gateResults: { orderBy: [{ createdAt: "asc" }] },
            executionEvents: { orderBy: [{ createdAt: "asc" }] },
          },
        },
        artifacts: { orderBy: [{ createdAt: "asc" }] },
        approvals: { orderBy: [{ createdAt: "asc" }] },
        gateResults: { orderBy: [{ createdAt: "asc" }] },
        versionUsages: {
          orderBy: [{ startedAt: "asc" }],
          include: { release: true },
        },
        domainEvents: { orderBy: [{ eventSeq: "asc" }, { createdAt: "asc" }] },
        executionEvents: { orderBy: [{ createdAt: "asc" }] },
        guardedToolCalls: {
          orderBy: [{ startedAt: "asc" }],
          include: { events: { orderBy: [{ createdAt: "asc" }] } },
        },
      },
    });
    if (!task) {
      return {
        ok: true,
        handler: "read.get_task_governance_detail",
        command_id: commandId,
        payload: { found: false, task_id: taskId },
      };
    }

    const t = task as any;
    const relatedSourceIds = Array.from(new Set([
      t.taskId,
      ...t.stageRuns.map((row: any) => row.stageRunId),
      ...t.artifacts.map((row: any) => row.artifactRevisionId),
      ...t.approvals.map((row: any) => row.approvalId),
      ...t.gateResults.map((row: any) => row.gateResultId),
      ...t.versionUsages.map((row: any) => row.usageId),
      ...t.domainEvents.map((row: any) => row.eventId),
      ...t.executionEvents.map((row: any) => row.eventId),
      ...t.guardedToolCalls.map((row: any) => row.callId),
    ].filter(Boolean)));
    const outboxRows = await this.prisma.ontologyOutbox.findMany({
      where: {
        brandId: task.brandId,
        sourceRecordId: { in: relatedSourceIds },
      },
      orderBy: [{ createdAt: "asc" }],
      take: 200,
    });
    const outboxCounters = {
      total: outboxRows.length,
      pending: outboxRows.filter((row) => !row.dispatched && !row.dlqMovedAt).length,
      dispatched: outboxRows.filter((row) => row.dispatched).length,
      dlq: outboxRows.filter((row) => !!row.dlqMovedAt).length,
    };
    const ontologyPreflightEvidence = this.extractOntologyPreflightEvidence(t.executionEvents);
    const ontologyNodeEvidence = this.extractOntologyNodeEvidence(t.executionEvents);

    return {
      ok: true,
      handler: "read.get_task_governance_detail",
      command_id: commandId,
      payload: jsonSafeBigInt({
        found: true,
        task,
        stages: t.stageRuns,
        artifacts: t.artifacts,
        approvals: t.approvals,
        gate_results: t.gateResults,
        version_usages: t.versionUsages,
        domain_events: t.domainEvents,
        execution_events: t.executionEvents,
        ontology_preflight_evidence: ontologyPreflightEvidence,
        ontology_node_evidence: ontologyNodeEvidence,
        guarded_tool_calls: t.guardedToolCalls,
        outbox: {
          counters: outboxCounters,
          rows: outboxRows,
        },
      }) as Record<string, unknown>,
    };
  }

  private extractOntologyPreflightEvidence(events: any[]): Record<string, unknown>[] {
    return (events ?? [])
      .map((event) => {
        const refs = Array.isArray(event?.evidenceRefsJson) ? event.evidenceRefsJson : [];
        const preflight = refs.find((ref: any) => ref?.kind === "ontology_execution_preflight");
        if (!preflight) return null;
        const contract = refs.find((ref: any) => ref?.kind === "ontology_published_contract");
        const meta = preflight?.meta && typeof preflight.meta === "object" ? preflight.meta : {};
        return {
          eventId: event.eventId,
          invocationId: event.invocationId,
          stageRunId: event.stageRunId ?? null,
          eventType: event.eventType,
          sourceLevel: event.sourceLevel,
          createdAt: event.createdAt,
          planId: meta.plan_id ?? preflight.id ?? null,
          flowId: meta.flow_id ?? null,
          flowKey: meta.flow_key ?? null,
          flowName: meta.flow_name ?? null,
          versionNo: meta.version_no ?? null,
          versionStatus: meta.version_status ?? null,
          candidateHash: meta.candidate_hash ?? null,
          userIntent: meta.user_intent ?? null,
          confirmedBy: meta.confirmed_by ?? null,
          confirmationNote: meta.confirmation_note ?? null,
          stepCount: meta.step_count ?? 0,
          edgeCount: meta.edge_count ?? 0,
          startNodeKeys: Array.isArray(meta.start_node_keys) ? meta.start_node_keys : [],
          stepSummaries: Array.isArray(meta.step_summaries) ? meta.step_summaries.slice(0, 20) : [],
          evidenceOnly: meta.evidence_only === true,
          executionStarted: meta.execution_started === true,
          contractRef: contract ? { id: contract.id ?? null, meta: contract.meta ?? null } : null,
        };
      })
      .filter(Boolean) as Record<string, unknown>[];
  }

  private extractOntologyNodeEvidence(events: any[]): Record<string, unknown>[] {
    return (events ?? [])
      .map((event) => {
        const refs = Array.isArray(event?.evidenceRefsJson) ? event.evidenceRefsJson : [];
        const nodeEvidence = refs.find((ref: any) => ref?.kind === "ontology_node_execution");
        if (!nodeEvidence) return null;
        const contract = refs.find((ref: any) => ref?.kind === "ontology_published_contract");
        const meta = nodeEvidence?.meta && typeof nodeEvidence.meta === "object" ? nodeEvidence.meta : {};
        return {
          eventId: event.eventId,
          invocationId: event.invocationId,
          stageRunId: event.stageRunId ?? null,
          eventType: event.eventType,
          sourceLevel: event.sourceLevel,
          createdAt: event.createdAt,
          planId: meta.plan_id ?? null,
          flowId: meta.flow_id ?? null,
          flowKey: meta.flow_key ?? null,
          flowName: meta.flow_name ?? null,
          versionNo: meta.version_no ?? null,
          versionStatus: meta.version_status ?? null,
          candidateHash: meta.candidate_hash ?? null,
          nodeKey: meta.node_key ?? null,
          nodeTitle: meta.node_title ?? null,
          nodeType: meta.node_type ?? null,
          stepNo: meta.step_no ?? null,
          nodeStatus: meta.node_status ?? null,
          outcome: meta.outcome ?? null,
          blockedReason: meta.blocked_reason ?? null,
          confirmationRequired: meta.confirmation_required === true,
          confirmationSatisfied: meta.confirmation_satisfied === true,
          referenceCount: meta.reference_count ?? 0,
          nextCount: meta.next_count ?? 0,
          controlledExecution: meta.controlled_execution === true,
          triggeredByPlatform: meta.triggered_by_platform === true,
          wroteExpertSource: meta.wrote_expert_source === true,
          contractRef: contract ? { id: contract.id ?? null, meta: contract.meta ?? null } : null,
        };
      })
      .filter(Boolean) as Record<string, unknown>[];
  }

  async listStageRuns(commandId: string, taskId: string): Promise<WfHandlerResponse> {
    this.validateRequest("read.list_stage_runs", { command_id: commandId, task_id: taskId });
    const rows = await this.prisma.wfStageRun.findMany({
      where: { taskId },
      orderBy: [{ stageKey: "asc" }, { generation: "desc" }],
    });
    return {
      ok: true,
      handler: "read.list_stage_runs",
      command_id: commandId,
      payload: { rows: rows as unknown as Record<string, unknown>[] },
    };
  }

  async listArtifacts(
    commandId: string,
    taskId: string,
    kind?: string
  ): Promise<WfHandlerResponse> {
    this.validateRequest("read.list_artifacts", {
      command_id: commandId,
      task_id: taskId,
      kind,
    });
    const rows = await this.prisma.wfArtifact.findMany({
      where: kind ? { taskId, kind } : { taskId },
      orderBy: [{ artifactId: "asc" }, { revisionNo: "desc" }],
    });
    return {
      ok: true,
      handler: "read.list_artifacts",
      command_id: commandId,
      payload: { rows: rows as unknown as Record<string, unknown>[] },
    };
  }

  async listExecutionEvents(
    commandId: string,
    taskId: string,
    filters: { stageRunId?: string; eventType?: string; subjectKind?: string; limit?: string; offset?: string }
  ): Promise<WfHandlerResponse> {
    this.validateRequest("read.list_execution_events", {
      command_id: commandId,
      task_id: taskId,
      stage_run_id: filters.stageRunId,
      event_type: filters.eventType,
      subject_kind: filters.subjectKind,
      limit: filters.limit,
      offset: filters.offset,
    });
    const limit = clampInt(filters.limit, 1, 200, 50);
    const offset = clampInt(filters.offset, 0, 1_000_000, 0);
    const eventType = normalizeEnumValue("event_type", filters.eventType, WfExecutionEventType);
    const subjectKind = normalizeEnumValue("subject_kind", filters.subjectKind, WfSubjectKind);
    const where: Prisma.WfExecutionEventWhereInput = {
      taskId,
      ...(filters.stageRunId ? { stageRunId: filters.stageRunId } : {}),
      ...(eventType ? { eventType } : {}),
      ...(subjectKind ? { subjectKind } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.wfExecutionEvent.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.wfExecutionEvent.count({ where }),
    ]);
    return {
      ok: true,
      handler: "read.list_execution_events",
      command_id: commandId,
      payload: jsonSafeBigInt({ rows, total, limit, offset }) as Record<string, unknown>,
    };
  }

  async listVersionUsages(
    commandId: string,
    taskId: string,
    filters: { limit?: string; offset?: string }
  ): Promise<WfHandlerResponse> {
    this.validateRequest("read.list_version_usages", {
      command_id: commandId,
      task_id: taskId,
      limit: filters.limit,
      offset: filters.offset,
    });
    const limit = clampInt(filters.limit, 1, 200, 50);
    const offset = clampInt(filters.offset, 0, 1_000_000, 0);
    const [rows, total] = await Promise.all([
      this.prisma.wfVersionUsage.findMany({
        where: { taskId },
        orderBy: [{ startedAt: "desc" }],
        skip: offset,
        take: limit,
        include: { release: true },
      }),
      this.prisma.wfVersionUsage.count({ where: { taskId } }),
    ]);
    return {
      ok: true,
      handler: "read.list_version_usages",
      command_id: commandId,
      payload: jsonSafeBigInt({ rows, total, limit, offset }) as Record<string, unknown>,
    };
  }
}

function hashStable(input: string): string {
  let h1 = 0xdeadbeef ^ 0x9e3779b9;
  let h2 = 0x41c6ce57 ^ 0x85ebca77;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x85ebca77);
    h2 = Math.imul(h2 ^ ch, 0xc2b2ae3d);
  }
  h1 ^= h2;
  h1 = Math.imul(h1, 0x93017f19);
  h2 ^= h1;
  h2 = Math.imul(h2, 0x165667b1);
  return ("00000000" + (h1 >>> 0).toString(16)).slice(-8) + ("00000000" + (h2 >>> 0).toString(16)).slice(-8);
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(String(v ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function normalizeEnumValue<TEnum extends Record<string, string>>(
  field: string,
  value: string | undefined,
  allowed: TEnum
): TEnum[keyof TEnum] | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  const values = Object.values(allowed);
  const match = values.find((item) => item === normalized);
  if (!match) {
    throw new BadRequestException(`WF_INVALID_${field.toUpperCase()}: ${value}; allowed=${values.join(",")}`);
  }
  return match as TEnum[keyof TEnum];
}

function jsonSafeBigInt(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => jsonSafeBigInt(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, jsonSafeBigInt(item)])
    );
  }
  return value;
}
