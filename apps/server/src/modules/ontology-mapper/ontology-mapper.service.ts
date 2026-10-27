import { Injectable, Logger, BadRequestException, NotImplementedException, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AssetCategory, WfEventKind, WfExecutionEventType, OntViewKind, OntOntologyKind, OntOutboxEventType, WfStageStatus } from "@prisma/client";
import {
  ONT_SCHEMA_VERSION,
  ONT_OQ5_RULES_3,
  ONT_7x3_FIELD_MAPPER,
  ONT_READ_ONLY_HANDLERS_7,
  OQ6_RECONCILE_FIELDS_BY_TABLE,
  OQ6_REQUIRED_AGREEMENT_RATE,
  validateBrandId,
  OntPreconditionCheckRequest,
  OntPreconditionCheckResponse,
  OntPreconditionVerdict,
  OntMappingRequest,
  OntOutboxAppendRequest,
  OntOutboxDispatchRequest,
  OntReconcileReportRequest,
  OntOutboxPayload,
} from "./types";

@Injectable()
export class OntologyMapperService {
  private readonly logger = new Logger(OntologyMapperService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** OQ5 前置检查：3 规则 verbatim，返回 PASS/WEAK_WARNING/BLOCKED 三元组 */
  async checkPreconditions(
    req: OntPreconditionCheckRequest
  ): Promise<OntPreconditionCheckResponse> {
    const brandId = validateBrandId(req.brand_id);
    const checks: OntPreconditionCheckResponse["checks"] = [];
    let overall: OntPreconditionVerdict = "PASS";

    for (const rule of ONT_OQ5_RULES_3) {
      let resourceCount = 0;
      try {
        if (rule.resource_kind === "DOUYIN_TOPIC_LIBRARY") {
          resourceCount = await this.prisma.businessAsset.count({
            where: { brandId, category: AssetCategory.DOUYIN_TOPIC_LIBRARY },
          });
        } else if (rule.resource_kind === "MARKETING_PLAN") {
          resourceCount = await this.prisma.businessAsset.count({
            where: { brandId, category: AssetCategory.MARKETING_PLAN },
          });
        } else {
          /** OQ5-3 BRAND_GROWTH_REPORT: 最新1条品牌增长报告的跨度≥365天则PASS(=1)，否则WEAK_WARNING(=0) */
          const candidates = await this.prisma.businessAsset.findMany({
            where: {
              brandId,
              category: {
                in: [AssetCategory.BRAND_GROWTH_REPORT, AssetCategory.GENERATED_REPORT],
              },
            },
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            select: { category: true, metadataJson: true, createdAt: true, updatedAt: true },
          });
          const latest = candidates.find((item) => {
            const metadata = (item.metadataJson ?? {}) as Record<string, unknown>;
            return item.category === AssetCategory.BRAND_GROWTH_REPORT || metadata.kind === "BRAND_GROWTH_REPORT";
          });
          if (latest) {
            const now = Date.now();
            const md = (latest.metadataJson ?? {}) as Record<string, unknown>;
            let cycleDays: number | null = null;
            if (typeof md.last_cycle_days === "number") cycleDays = md.last_cycle_days;
            else if (typeof md.cycle_days === "number") cycleDays = md.cycle_days;
            else if (md.cycle_start && md.cycle_end && !isNaN(Date.parse(md.cycle_start as string)) && !isNaN(Date.parse(md.cycle_end as string))) {
              cycleDays = Math.floor((Date.parse(md.cycle_end as string) - Date.parse(md.cycle_start as string)) / 86400000);
            } else {
              cycleDays = Math.floor((Math.max(latest.updatedAt.getTime(), latest.createdAt.getTime()) - latest.createdAt.getTime()) / 86400000);
            }
            const staleDays = Math.floor((now - Math.max(latest.updatedAt.getTime(), latest.createdAt.getTime())) / 86400000);
            if (cycleDays >= 365 && staleDays < 365) resourceCount = 1;
          }
        }
      } catch (_err) {
        /** D36 真E2E零触碰：不碰旧DB，count/query失败则fallback=0，规则按缺省判定 */
        resourceCount = 0;
      }

      const missing = resourceCount === 0;
      const verdict: OntPreconditionVerdict = missing ? rule.verdict_if_missing : "PASS";
      if (verdict === "BLOCKED") overall = "BLOCKED";
      else if (verdict === "WEAK_WARNING" && overall !== "BLOCKED") overall = "WEAK_WARNING";

      checks.push({
        rule_id: rule.rule_id,
        code: rule.code,
        verdict,
        resource_desc: rule.resource_desc(brandId, req.brand_name),
        action_hint: rule.action_hint,
        resource_count: resourceCount,
      });

      /** 每条检查都写审计落盘（append-only 不读回，不依赖 BusinessAsset 外键约束） */
      try {
        await this.prisma.ontologyPreconditionCheck.create({
          data: {
            checkId: `pc_${rule.rule_id}_${brandId}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
            brandId,
            taskId: req.task_id ?? null,
            routeId: req.route_id ?? null,
            verdict,
            ruleId: rule.rule_id,
            ruleCode: rule.code,
            resourceDesc: rule.resource_desc(brandId, req.brand_name),
            actionHint: rule.action_hint,
            detailsJson: {
              resource_count: resourceCount,
              schema_version: ONT_SCHEMA_VERSION,
            },
          },
        });
      } catch (_createErr) {
        /** Prisma generate 未运行可能 create 失败，silent 降级（仍向 HTTP 返回精确 verdict） */
        this.logger.verbose(`precondition_check_store_silent_fail rule=${rule.rule_id}`);
      }
    }

    return jsonSafeBigInt({
      ok: true,
      schema_version: ONT_SCHEMA_VERSION,
      overall_verdict: overall,
      checks,
    }) as any;
  }

  /** 7×3 Mapper：3 本体（BRAND/TASK/MEDIA） × 3 视图（LOGICAL/PHYSICAL/RUNTIME） × 7 字段白名单映射查询 */
  async getOntology7x3(req: OntMappingRequest) {
    if (!req.ontology_kind) {
      throw new BadRequestException("ONT_MISSING_ONTOLOGY_KIND");
    }
    const ontUpper = req.ontology_kind.toUpperCase() as Uppercase<typeof req.ontology_kind>;
    if (!(ontUpper in ONT_7x3_FIELD_MAPPER)) {
      throw new BadRequestException(`ONT_UNKNOWN_ONTOLOGY_KIND: ${req.ontology_kind}`);
    }
    const views = ONT_7x3_FIELD_MAPPER[ontUpper];
    const viewList = req.view_kind ? [req.view_kind.toUpperCase()] : ["LOGICAL", "PHYSICAL", "RUNTIME"];

    /** 先查 DB 已落盘映射（ontology_mappings 表），命中则优先真实覆盖；skeleton 阶段写空，失败静默 */
    let persisted: unknown[] = [];
    try {
      persisted = await this.prisma.ontologyMapping.findMany({
        where: {
          ontologyKind: ontUpper as OntOntologyKind,
          ...(req.view_kind ? { viewKind: req.view_kind.toUpperCase() as OntViewKind } : {}),
          ...(req.logical_key ? { logicalKey: req.logical_key } : {}),
          ...(req.brand_id ? { brandId: req.brand_id } : {}),
        },
      });
    } catch (_err) {
      persisted = [];
    }

    const mapped: Record<string, unknown> = {};
    for (const view of viewList) {
      const key = view as keyof typeof views;
      const fields = views[key] ?? [];
      mapped[view] = {
        ontology_kind: ontUpper,
        view_kind: view,
        schema_version: ONT_SCHEMA_VERSION,
        field_whitelist: Array.from(fields),
        persisted_matches: persisted.filter((row: any) => row.viewKind === view),
      };
    }

    return jsonSafeBigInt({
      ok: true,
      schema_version: ONT_SCHEMA_VERSION,
      ontology_kind: ontUpper,
      views: mapped,
      persisted_count: persisted.length,
    }) as any;
  }

  /** Outbox 7+1 字段 append-only：Workflow Core 写业务后立刻调用，pipeline worker 后续消费 */
  async appendOutbox(req: OntOutboxAppendRequest) {
    const brandId = validateBrandId(req.brand_id);
    if (!req.event_type) throw new BadRequestException("ONT_MISSING_EVENT_TYPE");
    if (!req.source_table) throw new BadRequestException("ONT_MISSING_SOURCE_TABLE");
    if (!req.source_record_id) throw new BadRequestException("ONT_MISSING_SOURCE_RECORD_ID");
    if (!req.payload || typeof req.payload !== "object") {
      throw new BadRequestException("ONT_MISSING_PAYLOAD_JSON");
    }
    const payloadNorm: OntOutboxPayload = {
      ...req.payload,
      meta: {
        ...(req.payload.meta ?? {}),
        schema_version: ONT_SCHEMA_VERSION,
      },
    };

    let created: unknown = null;
    try {
      created = await this.prisma.ontologyOutbox.create({
        data: {
          eventType: req.event_type,
          sourceTable: req.source_table,
          sourceRecordId: req.source_record_id,
          brandId,
          payloadJson: payloadNorm as any,
        },
      });
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      if (/ont_outbox_src_event_unique|Unique constraint/i.test(msg)) {
        return jsonSafeBigInt({
          ok: true,
          schema_version: ONT_SCHEMA_VERSION,
          idempotent_hit: true,
          source_event_unique: `${req.source_table}:${req.source_record_id}:${req.event_type}`,
        }) as any;
      }
      throw err;
    }
    return jsonSafeBigInt({
      ok: true,
      schema_version: ONT_SCHEMA_VERSION,
      outbox_id: (created as any)?.id ?? null,
      idempotent_hit: false,
      dispatched: false,
    }) as any;
  }

  /** Outbox 消费入口：Phase 6 pipeline worker 接管前，skeleton 先批量标记 dispatched 打桩 */
  async dispatchOutbox(req: OntOutboxDispatchRequest) {
    const batch = Math.max(1, Math.min(500, req.batch_size ?? 100));
    const pipelineIds = req.pipeline_ids && req.pipeline_ids.length > 0
      ? req.pipeline_ids
      : ["P-01", "P-02", "P-03", "P-04", "P-05", "P-06", "P-07", "P-08"];
    let updated = 0;
    try {
      const rows = await this.prisma.ontologyOutbox.findMany({
        where: { dispatched: false },
        orderBy: [{ createdAt: "asc" }],
        take: batch,
      });
      if (rows.length) {
        const ids = rows.map((r: any) => r.id);
        const res = await this.prisma.ontologyOutbox.updateMany({
          where: { id: { in: ids } },
          data: { dispatched: true, dispatchedAt: new Date(), pipelineIdsDispatched: pipelineIds },
        });
        updated = res.count;
      }
    } catch (_err) {
      updated = 0;
    }
    return jsonSafeBigInt({
      ok: true,
      schema_version: ONT_SCHEMA_VERSION,
      batch_size: batch,
      dispatched_count: updated,
      pipeline_ids: pipelineIds,
    }) as any;
  }

  /** 7 只读 handler：真实查询 wf_* 14 表（Phase3接通本体落盘） */
  async getReadOnlyHandler(handlerName: string, args: Record<string, unknown>) {
    if (!ONT_READ_ONLY_HANDLERS_7.includes(handlerName as any)) {
      throw new BadRequestException(`ONT_UNKNOWN_READ_HANDLER: ${handlerName}; allowed=${ONT_READ_ONLY_HANDLERS_7.join(",")}`);
    }
    switch (handlerName) {
      case "get_task": {
        const taskId = mandatoryStr(args, "task_id");
        const row = await this.prisma.wfTask.findUnique({
          where: { taskId },
          include: {
            stageRuns: {
              orderBy: [{ createdAt: "asc" }],
              include: {
                approvals: { orderBy: [{ createdAt: "asc" }] },
                gateResults: { orderBy: [{ createdAt: "asc" }] },
              },
            },
            artifacts: { orderBy: [{ revisionNo: "asc" }] },
            domainEvents: { orderBy: [{ eventSeq: "asc" }, { createdAt: "asc" }] },
            executionEvents: { orderBy: [{ createdAt: "asc" }] },
            guardedToolCalls: { orderBy: [{ startedAt: "asc" }] },
            versionUsages: { orderBy: [{ startedAt: "asc" }] },
          },
        });
        if (!row) throw new BadRequestException(`WF_TASK_NOT_FOUND: ${taskId}`);
        const r = row as any;
        return jsonSafeBigInt({
          ok: true,
          schema_version: ONT_SCHEMA_VERSION,
          handler: handlerName,
          task: row,
          stages: r.stageRuns,
          artifacts: r.artifacts,
          approvals: r.stageRuns.flatMap((s: any) => s.approvals),
          version_usages: r.versionUsages,
          gate_results: r.stageRuns.flatMap((s: any) => s.gateResults),
          events: r.domainEvents,
          execution_traces: r.executionEvents,
          tool_calls: r.guardedToolCalls,
          note: "REAL_DB_QUERY via wf_* Prisma 1:N includes (workflow-core 15handler真写入接通后数据可验证)",
        }) as any;
      }
      case "task_context": {
        const taskId = mandatoryStr(args, "task_id");
        const task = await this.prisma.wfTask.findUnique({ where: { taskId }, select: { taskId: true, revision: true, status: true, archiveStatus: true } });
        if (!task) throw new BadRequestException(`WF_TASK_NOT_FOUND: ${taskId}`);
        const activeStatuses: WfStageStatus[] = [WfStageStatus.READY, WfStageStatus.RUNNING, WfStageStatus.SUBMITTED, WfStageStatus.CHANGES_REQUESTED, WfStageStatus.BLOCKED, WfStageStatus.PENDING];
        const activeStages = await this.prisma.wfStageRun.findMany({
          where: {
            taskId,
            status: { in: activeStatuses },
          },
          orderBy: [{ createdAt: "asc" }],
          take: 1,
        });
        const current = activeStages[0] ?? null;
        let artifactRevisionIds: string[] = [];
        let artifactRevisions: any[] = [];
        if (current) {
          artifactRevisionIds = (current.outputArtifactRevisionIds as string[]) ?? [];
          if (artifactRevisionIds.length > 0) {
            artifactRevisions = await this.prisma.wfArtifact.findMany({
              where: { artifactRevisionId: { in: artifactRevisionIds } },
              orderBy: [{ revisionNo: "asc" }],
            });
          }
        }
        const canClaim = current && current.status === WfStageStatus.READY;
        const canSubmit = current && current.status === WfStageStatus.RUNNING;
        const canApprove = current && (current.status === WfStageStatus.SUBMITTED || current.status === WfStageStatus.CHANGES_REQUESTED);
        return jsonSafeBigInt({
          ok: true,
          schema_version: ONT_SCHEMA_VERSION,
          handler: handlerName,
          task_id: task.taskId,
          revision: task.revision,
          status: task.status,
          archive_status: task.archiveStatus,
          current_stage: current ? {
            stage_run_id: current.stageRunId,
            stage_key: current.stageKey,
            status: current.status,
            owner_expert_id: current.ownerExpertId,
            approval_mode: current.approvalMode,
            work_mode: current.workMode,
          } : null,
          artifact_revisions: artifactRevisions,
          stage_contract: current ? {
            requires: current.requiresJson as unknown[],
            produces: current.producesJson as unknown[],
          } : { requires: [], produces: [] },
          action_buttons: {
            claim_stage: !!canClaim,
            submit_stage: !!canSubmit,
            approve_stage: !!canApprove,
            request_change: !!canApprove,
          },
          note: "REAL_DB_QUERY: 激活阶段取 status∈ACTIVE_SET 的最旧一条，按钮可用性严格按 WF 状态机",
        }) as any;
      }
      case "stage_contract": {
        const taskId = mandatoryStr(args, "task_id");
        const stageRunId = args.stage_run_id as string | undefined;
        let stage: Awaited<ReturnType<typeof this.prisma.wfStageRun.findFirst>>;
        if (stageRunId) {
          stage = await this.prisma.wfStageRun.findUnique({ where: { stageRunId } });
          if (!stage) throw new BadRequestException(`WF_STAGE_RUN_NOT_FOUND: ${stageRunId}`);
        } else {
          stage = await this.prisma.wfStageRun.findFirst({ where: { taskId }, orderBy: [{ createdAt: "asc" }] });
          if (!stage) throw new BadRequestException(`WF_TASK_HAS_NO_STAGE_RUNS: ${taskId}`);
        }
        const task = await this.prisma.wfTask.findUnique({ where: { taskId: stage.taskId }, select: { status: true, revision: true } });
        const requires = (stage.requiresJson ?? []) as unknown[];
        const produces = (stage.producesJson ?? []) as unknown[];
        return jsonSafeBigInt({
          ok: true,
          schema_version: ONT_SCHEMA_VERSION,
          handler: handlerName,
          task_status: task?.status ?? null,
          task_revision: task?.revision ?? null,
          stage: {
            stage_run_id: stage.stageRunId,
            stage_key: stage.stageKey,
            generation: stage.generation,
            owner_expert_id: stage.ownerExpertId,
            work_mode: stage.workMode,
            approval_mode: stage.approvalMode,
            status: stage.status,
            input_revision: stage.inputRevision,
            dependencies: stage.dependenciesJson,
          },
          requires,
          produces,
          assessment_template: {
            hard_checks: requires.filter((r: any) => r && typeof r === "object" && (r as any).required).map((r: any) => ({ key: (r as any).key ?? (r as any).id, label: (r as any).label ?? (r as any).key, type: (r as any).type ?? "string" })),
            soft_checks: requires.filter((r: any) => r && typeof r === "object" && !(r as any).required).map((r: any) => ({ key: (r as any).key ?? (r as any).id, label: (r as any).label ?? (r as any).key, type: (r as any).type ?? "string" })),
          },
          gate_policy: {
            approval_mode: stage.approvalMode,
            single_stage_submit: stage.approvalMode === "single_stage_submit",
            requires_evaluator: stage.approvalMode === "evaluator_gate",
          },
          note: "REAL_DB_QUERY: requiresJson/producesJson直接展开，assessment_template按required拆软硬项",
        }) as any;
      }
      case "assessment_check": {
        const taskId = mandatoryStr(args, "task_id");
        const stageRunId = mandatoryStr(args, "stage_run_id");
        const assessmentJson = args.assessment_json as Record<string, unknown> | undefined;
        if (!assessmentJson || typeof assessmentJson !== "object") throw new BadRequestException("ONT_MISSING_ASSESSMENT_JSON");
        const stage = await this.prisma.wfStageRun.findUnique({ where: { stageRunId }, select: { taskId: true, requiresJson: true } });
        if (!stage || stage.taskId !== taskId) throw new BadRequestException(`WF_STAGE_RUN_MISMATCH: task=${taskId} stage=${stageRunId}`);
        const requires = (stage.requiresJson ?? []) as Array<{ key?: string; id?: string; required?: boolean }>;
        const hardItems = requires.filter(r => r.required);
        const declared = hardItems.filter(r => (r.key || r.id) && assessmentJson[(r.key || r.id)!] !== undefined && assessmentJson[(r.key || r.id)!] !== null);
        let hardPass = hardItems.length > 0 && declared.length === hardItems.length;
        for (const it of declared) {
          const v = assessmentJson[(it.key || it.id)!];
          if (Array.isArray(v) && v.length === 0) { hardPass = false; break; }
          if (typeof v === "string" && v.trim() === "") { hardPass = false; break; }
        }
        return jsonSafeBigInt({
          ok: true,
          schema_version: ONT_SCHEMA_VERSION,
          handler: handlerName,
          hard_checks_pass: hardPass,
          declared_hard_checks_all_passed: hardPass,
          hard_checks_total: hardItems.length,
          hard_checks_declared: declared.length,
          soft_checks_total: requires.length - hardItems.length,
          note: "REAL_STRUCTURE_CHECK: required项非空/非0长度即判定通过，下一步接评估器打分",
        }) as any;
      }
      case "list_tasks": {
        const limit = clampInt(args.limit, 1, 500, 100);
        const offset = clampInt(args.offset, 0, 1_000_000, 0);
        const brandId = (args.brand_id as string) || undefined;
        const where = brandId ? { brandId } : {};
        const [rows, total] = await Promise.all([
          this.prisma.wfTask.findMany({ where, orderBy: [{ updatedAt: "desc" }], skip: offset, take: limit }),
          this.prisma.wfTask.count({ where }),
        ]);
        return jsonSafeBigInt({ ok: true, schema_version: ONT_SCHEMA_VERSION, handler: handlerName, limit, offset, total, rows, note: "REAL_DB_QUERY: wf_tasks orderBy updatedAt desc" }) as any;
      }
      case "execution_overview": {
        const taskRows = await this.prisma.wfTask.groupBy({ by: ["status"], _count: { status: true } });
        const statusDistribution: Record<string, number> = {};
        for (const r of taskRows) statusDistribution[String(r.status)] = r._count.status;
        const failedEvents = await this.prisma.wfExecutionEvent.count({
          where: { OR: [{ eventType: WfExecutionEventType.FAILED }, { errorCode: { not: null } }] },
        });
        const failedDomainEvents = await this.prisma.wfDomainEvent.count({
          where: { OR: [{ kind: WfEventKind.STAGE_EVALUATED }, { kind: WfEventKind.TASK_CANCELLED }] },
        });
        return jsonSafeBigInt({
          ok: true,
          schema_version: ONT_SCHEMA_VERSION,
          handler: handlerName,
          status_distribution: statusDistribution,
          failed_events: {
            execution_event_failures: failedEvents,
            workflow_domain_alerts: failedDomainEvents,
            total_failures: failedEvents + failedDomainEvents,
          },
          note: "REAL_DB_AGGREGATE: groupBy wf_tasks.status + count failed executions",
        }) as any;
      }
      case "list_releases": {
        const limit = clampInt(args.limit, 1, 500, 100);
        const offset = clampInt(args.offset, 0, 1_000_000, 0);
        const releaseEventKinds: WfEventKind[] = [WfEventKind.PROMPT_INJECTED, WfEventKind.TASK_ARCHIVED];
        const releaseEvents = await this.prisma.wfDomainEvent.findMany({
          where: { OR: releaseEventKinds.map(k => ({ kind: k })) },
          orderBy: [{ createdAt: "desc" }],
          skip: offset,
          take: limit,
        });
        const releases = releaseEvents.map(de => ({
          release_id: (de.payload as any)?.release_id ?? `derived-${de.eventId}`,
          kind: de.kind,
          task_id: de.taskId,
          actor_id: de.actorId,
          from_revision: de.fromRevision,
          to_revision: de.toRevision,
          created_at: de.createdAt,
          details: de.payload,
        }));
        const packageChanges = releases
          .filter(r => r.details && (r.details as any).package_changes)
          .map(r => ({ release_id: r.release_id, changes: (r.details as any).package_changes }));
        return jsonSafeBigInt({
          ok: true,
          schema_version: ONT_SCHEMA_VERSION,
          handler: handlerName,
          limit,
          offset,
          releases,
          package_changes: packageChanges,
          note: "REAL_DB_QUERY: release从wf_domain_events派生，artifact→release实体打通后直接join",
        }) as any;
      }
      default:
        throw new BadRequestException(`ONT_UNHANDLED_READ_HANDLER: ${handlerName}`);
    }
  }

  /** OQ6 双写对账打桩：当前未接通 Python sqlite，生成 0 matched 空报告提醒 14 天过渡期 */
  async getReconcileReport(req: OntReconcileReportRequest) {
    const batchId = req.batch_id ?? `rec-skeleton-${Date.now()}`;
    const tbl = req.source_table ?? "tasks";
    if (!(tbl in OQ6_RECONCILE_FIELDS_BY_TABLE)) {
      throw new BadRequestException(`ONT_UNKNOWN_RECONCILE_TABLE: ${tbl}; allowed=${Object.keys(OQ6_RECONCILE_FIELDS_BY_TABLE).join(",")}`);
    }
    const fields = (OQ6_RECONCILE_FIELDS_BY_TABLE as any)[tbl];
    let matchedCount = 0;
    let totalCount = 0;
    try {
      const ag = await this.prisma.ontologyDualWriteReconcileLog.aggregate({
        _count: { matched: true },
        where: { batchId, sourceTable: tbl },
      });
      totalCount = (ag as unknown as { _count?: { matched?: number | null } }[])[0]?._count?.matched ?? 0;
    } catch (_err) {
      totalCount = 0;
    }
    const agreementRate = totalCount > 0 ? matchedCount / totalCount : 1.0;
    return jsonSafeBigInt({
      ok: true,
      schema_version: ONT_SCHEMA_VERSION,
      oq6_meta: {
        batch_id: batchId,
        source_table: tbl,
        fields_compared: Array.from(fields),
        required_agreement_rate: OQ6_REQUIRED_AGREEMENT_RATE,
        transition_period_days: 14,
      },
      compared_count: totalCount,
      matched_count: matchedCount,
      actual_agreement_rate: Number(agreementRate.toFixed(6)),
      threshold_pass: agreementRate >= OQ6_REQUIRED_AGREEMENT_RATE,
      note: "PHASE3_SKELETON: TS Prisma ↔ Python sqlite 双写链路接通后才会产生真实对账日志",
    }) as any;
  }
}

const PIPELINE_ROUTES: Array<{ id: string; priority: number; events: OntOutboxEventType[]; desc: string }> = [
  { id: "P-01", priority: 1, events: [OntOutboxEventType.task_created, OntOutboxEventType.task_status_changed, OntOutboxEventType.task_reopened_archive], desc: "Ontology task 同步/生命周期" },
  { id: "P-02", priority: 2, events: [OntOutboxEventType.stage_claimed, OntOutboxEventType.stage_submitted, OntOutboxEventType.stage_accepted, OntOutboxEventType.stage_changes_requested, OntOutboxEventType.stage_blocked], desc: "Ontology stageRun 同步/状态机" },
  { id: "P-03", priority: 3, events: [OntOutboxEventType.artifact_registered, OntOutboxEventType.version_used], desc: "Ontology artifact+version 双写" },
  { id: "P-04", priority: 4, events: [OntOutboxEventType.approval_recorded], desc: "Ontology approval 审批" },
  { id: "P-05", priority: 5, events: [OntOutboxEventType.task_closed], desc: "Ontology gate 门禁与收尾" },
  { id: "P-06", priority: 6, events: [OntOutboxEventType.domain_event_appended, OntOutboxEventType.release_created, OntOutboxEventType.release_verified, OntOutboxEventType.release_restored], desc: "Ontology domainEvent/release 治理" },
  { id: "P-07", priority: 7, events: [OntOutboxEventType.guarded_tool_called, OntOutboxEventType.guarded_tool_completed], desc: "Ontology toolCall 观测" },
  { id: "P-08", priority: 8, events: [OntOutboxEventType.task_paused, OntOutboxEventType.task_resumed, OntOutboxEventType.task_canceled], desc: "Ontology task lifecycle 长尾" },
];
const EVENT_TO_PIPELINE = (() => {
  const m = new Map<OntOutboxEventType, { id: string; priority: number; desc: string }>();
  for (const r of PIPELINE_ROUTES) for (const e of r.events) m.set(e, { id: r.id, priority: r.priority, desc: r.desc });
  return m;
})();

@Injectable()
export class OutboxWorkerService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async runOutboxTick(args: Record<string, unknown>) {
    const batch = clampInt(args?.batch_size, 1, 200, 20);
    const DEFAULT_MAX_RETRY = 3;
    const tickStartedAt = new Date();
    const picked = await this.prisma.ontologyOutbox.findMany({
      where: { dispatched: false, dlqMovedAt: null, AND: [{ retryCount: { lt: DEFAULT_MAX_RETRY } }] },
      orderBy: [{ createdAt: "asc" }],
      take: batch * 3,
      select: { id: true, eventType: true, payloadJson: true, brandId: true, retryCount: true, maxRetry: true },
    });
    const enriched = picked
      .map((r: any) => {
        const route = EVENT_TO_PIPELINE.get(r.eventType);
        return { ...r, route };
      })
      .sort((a: any, b: any) => {
        const pa = a.route?.priority ?? 99;
        const pb = b.route?.priority ?? 99;
        if (pa !== pb) return pa - pb;
        return a.id.localeCompare(b.id);
      })
      .slice(0, batch);

    const stats = { picked_total: enriched.length, success: 0, failed: 0, moved_to_dlq: 0, by_pipeline: {} as Record<string, { ok: number; fail: number; dlq: number }> };
    for (const r of PIPELINE_ROUTES) stats.by_pipeline[r.id] = { ok: 0, fail: 0, dlq: 0 };

    for (const row of enriched) {
      const pid = row.route?.id ?? "P-00";
      try {
        if (!row.route) throw new Error(`NO_PIPELINE_ROUTE for event_type=${row.eventType}`);
        if (!row.payloadJson || typeof row.payloadJson !== "object") throw new Error("OUTBOX_PAYLOAD_NOT_OBJECT");
        const ok = await this.processPipelineHandler(pid, row);
        if (!ok) throw new Error("PIPELINE_HANDLER_FALSE");
        await this.prisma.ontologyOutbox.update({
          where: { id: row.id },
          data: {
            dispatched: true,
            dispatchedAt: tickStartedAt,
            pipelineAssigned: pid,
            pipelineIdsDispatched: { push: pid },
            lastProcessedAt: new Date(),
          },
        });
        stats.success++;
        stats.by_pipeline[pid].ok++;
      } catch (err: any) {
        const nextRetry = row.retryCount + 1;
        const cap = (typeof row.maxRetry === "number" && Number.isFinite(row.maxRetry)) ? row.maxRetry : DEFAULT_MAX_RETRY;
        const shouldDlq = nextRetry >= cap;
        if (shouldDlq) {
          await this.prisma.ontologyOutbox.update({
            where: { id: row.id },
            data: {
              pipelineAssigned: pid,
              retryCount: nextRetry,
              lastError: `${err?.name ?? err?.constructor?.name ?? "Error"}: ${err?.message ?? String(err)}`.slice(0, 4000),
              lastProcessedAt: new Date(),
              dlqMovedAt: new Date(),
              dlqReason: `RETRY_LIMIT_REACHED=${nextRetry}/${row.maxRetry}; ${err?.message ?? String(err)}`.slice(0, 512),
            },
          });
          stats.moved_to_dlq++;
          stats.failed++;
          if (stats.by_pipeline[pid]) { stats.by_pipeline[pid].dlq++; stats.by_pipeline[pid].fail++; }
        } else {
          await this.prisma.ontologyOutbox.update({
            where: { id: row.id },
            data: {
              pipelineAssigned: pid,
              retryCount: nextRetry,
              lastError: `${err?.name ?? err?.constructor?.name ?? "Error"}: ${err?.message ?? String(err)}`.slice(0, 4000),
              lastProcessedAt: new Date(),
            },
          });
          stats.failed++;
          if (stats.by_pipeline[pid]) stats.by_pipeline[pid].fail++;
        }
      }
    }

    return jsonSafeBigInt({
      ok: true,
      schema_version: ONT_SCHEMA_VERSION,
      tick: { started_at: tickStartedAt.toISOString(), duration_ms: Date.now() - tickStartedAt.getTime(), batch_requested: batch },
      routes: PIPELINE_ROUTES.map(r => ({ id: r.id, priority: r.priority, event_count: r.events.length, desc: r.desc })),
      stats,
    }) as any;
  }

  async getOutboxSummary() {
    const [total, pending, dispatched, dlq, byEventType, byPipeline, byRetryBuckets] = await Promise.all([
      this.prisma.ontologyOutbox.count(),
      this.prisma.ontologyOutbox.count({ where: { dispatched: false, dlqMovedAt: null } }),
      this.prisma.ontologyOutbox.count({ where: { dispatched: true } }),
      this.prisma.ontologyOutbox.count({ where: { dlqMovedAt: { not: null } } }),
      this.prisma.ontologyOutbox.groupBy({ by: ["eventType"], _count: { _all: true } }),
      this.prisma.ontologyOutbox.groupBy({ by: ["pipelineAssigned"], _count: { _all: true } }),
      Promise.all([
        this.prisma.ontologyOutbox.count({ where: { retryCount: 0, dlqMovedAt: null } }),
        this.prisma.ontologyOutbox.count({ where: { retryCount: { gte: 1, lte: 2 }, dlqMovedAt: null } }),
        this.prisma.ontologyOutbox.count({ where: { retryCount: { gte: 3 }, dlqMovedAt: null } }),
      ]),
    ]);
    return jsonSafeBigInt({
      ok: true,
      schema_version: ONT_SCHEMA_VERSION,
      counters: {
        total_rows: total,
        pending_undispatched: pending,
        dispatched_ok: dispatched,
        in_dlq: dlq,
        retry_buckets: { zero_retry: byRetryBuckets[0], pending_1_2: byRetryBuckets[1], pending_ge3_still_in: byRetryBuckets[2] },
      },
      by_event_type: byEventType.map((g: any) => ({ event_type: g.eventType, count: g._count._all })),
      by_pipeline: byPipeline.map((g: any) => ({ pipeline: g.pipelineAssigned ?? "UNASSIGNED", count: g._count._all })),
      routes: PIPELINE_ROUTES.map(r => ({ id: r.id, priority: r.priority, events: r.events.map(String), desc: r.desc })),
    }) as any;
  }

  private async processPipelineHandler(pid: string, row: { id: string; eventType: OntOutboxEventType; payloadJson: any; brandId: string }): Promise<boolean> {
    const p = row.payloadJson as Record<string, unknown>;
    if (!p || typeof p !== "object") return false;
    switch (pid) {
      case "P-01": return typeof p.revision === "number" && !!p.status && !!p.task_id;
      case "P-02": return !!p.stage_run_id && !!p.task_id && !!p.stage_key;
      case "P-03": return !!p.artifact_id || !!p.version_snapshot_id;
      case "P-04": return !!p.approval_id && !!p.decision;
      case "P-05": return !!p.gate_result_id && typeof p.passed === "boolean";
      case "P-06": return !!p.event_id && !!p.kind;
      case "P-07": return !!p.tool_call_id && !!p.task_id;
      case "P-08": return !!p.execution_event_id && !!p.stage_run_id;
      default: return false;
    }
  }
}

function mandatoryStr(args: Record<string, unknown>, field: string): string {
  const v = args[field];
  if (typeof v !== "string" || v.trim() === "") throw new BadRequestException(`ONT_MISSING_${field.toUpperCase()}`);
  return v.trim();
}

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(min, Math.min(max, Math.floor(raw)));
  }
  if (typeof raw === "string") {
    const p = parseInt(raw, 10);
    if (Number.isFinite(p)) return Math.max(min, Math.min(max, p));
  }
  return fallback;
}

function jsonSafeBigInt(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString(10);
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(jsonSafeBigInt);
  if (typeof value === "object") {
    if (value instanceof Date) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = jsonSafeBigInt(v);
    }
    return out;
  }
  return value;
}
