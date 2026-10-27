"use client";
import { authenticatedFetch } from "../../services/http";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  GitBranch,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const BRAND_ID = "brand-demo-cleaning";
const TASK_STATUSES = ["", "CREATED", "RUNNING", "PAUSED", "COMPLETED", "FAILED", "CANCELED", "ARCHIVED"] as const;

type ApiEnvelope<T> = {
  ok: boolean;
  handler?: string;
  payload: T;
};

type WfTaskRow = {
  taskId: string;
  brandId: string;
  goal: string;
  scopeEnd: string;
  routeId: string;
  routeVersion: string;
  contentFamily?: string | null;
  status: string;
  revision: number;
  archiveStatus?: string;
  authority?: string;
  workspacePath?: string;
  createdAt?: string;
  updatedAt?: string;
  stageRuns?: WfStageRun[];
  artifacts?: WfArtifact[];
  approvals?: WfApproval[];
  executionEvents?: WfExecutionEvent[];
  versionUsages?: WfVersionUsage[];
};

type WfStageRun = {
  stageRunId: string;
  stageKey: string;
  generation: number;
  ownerExpertId: string;
  status: string;
  updatedAt?: string;
  executionAttempts?: WfExecutionAttempt[];
  approvals?: WfApproval[];
  gateResults?: WfGateResult[];
  executionEvents?: WfExecutionEvent[];
};

type WfArtifact = {
  artifactRevisionId: string;
  artifactId: string;
  revisionNo: number;
  kind: string;
  localPath: string;
  mimeType?: string;
  createdAt?: string;
};

type WfApproval = {
  approvalId: string;
  scope: string;
  decision: string;
  actorId: string;
  createdAt?: string;
};

type WfGateResult = {
  gateResultId: string;
  verdict: string;
  score?: number | null;
  threshold?: number | null;
  createdAt?: string;
};

type WfExecutionAttempt = {
  attemptId: string;
  attemptNo: number;
  clientId: string;
  outcome?: string | null;
  startedAt?: string;
  endedAt?: string | null;
};

type WfExecutionEvent = {
  eventId: string;
  invocationId: string;
  stageRunId?: string | null;
  subjectKind: string;
  subjectId: string;
  eventType: string;
  attemptNo: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  recoveryMethod?: string | null;
  sourceLevel?: string;
  createdAt?: string;
  evidenceRefsJson?: SourceRefEntry[];
};

type SourceRefEntry = {
  kind: string;
  id: string;
  meta?: Record<string, unknown>;
};

type OntologyPreflightEvidence = {
  eventId: string;
  invocationId: string;
  stageRunId?: string | null;
  eventType: string;
  sourceLevel?: string;
  createdAt?: string;
  planId?: string | null;
  flowKey?: string | null;
  flowName?: string | null;
  versionNo?: string | number | null;
  versionStatus?: string | null;
  candidateHash?: string | null;
  userIntent?: string | null;
  confirmedBy?: string | null;
  confirmationNote?: string | null;
  stepCount?: number;
  edgeCount?: number;
  evidenceOnly?: boolean;
  executionStarted?: boolean;
  stepSummaries?: Array<{
    step_no?: number | null;
    node_key?: string | null;
    title?: string | null;
    reference_count?: number | null;
    next_count?: number | null;
  }>;
};

type OntologyNodeEvidence = {
  eventId: string;
  invocationId: string;
  stageRunId?: string | null;
  eventType: string;
  sourceLevel?: string;
  createdAt?: string;
  planId?: string | null;
  flowKey?: string | null;
  flowName?: string | null;
  versionNo?: string | number | null;
  nodeKey?: string | null;
  nodeTitle?: string | null;
  nodeType?: string | null;
  stepNo?: number | null;
  nodeStatus?: string | null;
  outcome?: string | null;
  blockedReason?: string | null;
  confirmationRequired?: boolean;
  confirmationSatisfied?: boolean;
  referenceCount?: number;
  nextCount?: number;
  controlledExecution?: boolean;
  triggeredByPlatform?: boolean;
  wroteExpertSource?: boolean;
};

type WfVersionUsage = {
  usageId: string;
  releaseId: string;
  desiredRevision: string;
  installedStatus: string;
  loadedStatus: string;
  startedAt?: string;
  endedAt?: string | null;
  release?: {
    packageVersion?: string | null;
    manifestHash?: string;
    status?: string;
  };
};

type OutboxRow = {
  id: string;
  eventType: string;
  sourceTable: string;
  sourceRecordId: string;
  dispatched: boolean;
  retryCount: number;
  dlqMovedAt?: string | null;
  createdAt?: string;
};

type TaskListPayload = {
  rows: WfTaskRow[];
  total: number;
  limit: number;
  offset: number;
  filters?: Record<string, unknown>;
};

type DetailPayload =
  | { found: false; task_id: string }
  | {
      found: true;
      task: WfTaskRow;
      stages: WfStageRun[];
      artifacts: WfArtifact[];
      approvals: WfApproval[];
      gate_results: WfGateResult[];
      version_usages: WfVersionUsage[];
      execution_events: WfExecutionEvent[];
      ontology_preflight_evidence?: OntologyPreflightEvidence[];
      ontology_node_evidence?: OntologyNodeEvidence[];
      guarded_tool_calls: Array<{ callId: string; status: string; toolName: string; startedAt?: string; endedAt?: string | null; events?: Array<{ kind: string; createdAt?: string }> }>;
      outbox: {
        counters: { total: number; pending: number; dispatched: number; dlq: number };
        rows: OutboxRow[];
      };
    };

type OutboxSummary = {
  ok: boolean;
  schema_version: string;
  counters: {
    total_rows: number;
    pending_undispatched: number;
    dispatched_ok: number;
    in_dlq: number;
  };
  routes: Array<{ id: string; priority: number; desc: string; events: string[] }>;
};

type LoadState<T> =
  | { status: "idle" | "loading"; data?: T; error?: undefined }
  | { status: "ready"; data: T; error?: undefined }
  | { status: "error"; data?: T; error: string };

export default function TaskGovernanceWorkspace() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [taskList, setTaskList] = useState<LoadState<TaskListPayload>>({ status: "idle" });
  const [outbox, setOutbox] = useState<LoadState<OutboxSummary>>({ status: "idle" });
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [detail, setDetail] = useState<LoadState<DetailPayload>>({ status: "idle" });

  const loadList = useCallback(async () => {
    setTaskList((prev) => ({ status: "loading", data: prev.data }));
    setOutbox((prev) => ({ status: "loading", data: prev.data }));
    try {
      const query = new URLSearchParams({ brandId: BRAND_ID, limit: "50" });
      if (statusFilter) query.set("status", statusFilter);
      const [tasksRes, outboxRes] = await Promise.all([
        fetchJson<ApiEnvelope<TaskListPayload>>(`/api/workflow-core/tasks?${query.toString()}`),
        fetchJson<OutboxSummary>("/api/ai-control/ontology-mapper/outbox/summary"),
      ]);
      setTaskList({ status: "ready", data: tasksRes.payload });
      setOutbox({ status: "ready", data: outboxRes });
      const rows = tasksRes.payload.rows ?? [];
      if (!selectedTaskId && rows[0]?.taskId) setSelectedTaskId(rows[0].taskId);
      if (selectedTaskId && !rows.some((row) => row.taskId === selectedTaskId)) setSelectedTaskId(rows[0]?.taskId ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTaskList((prev) => ({ status: "error", data: prev.data, error: message }));
      setOutbox((prev) => ({ status: "error", data: prev.data, error: message }));
    }
  }, [selectedTaskId, statusFilter]);

  const loadDetail = useCallback(async (taskId: string) => {
    if (!taskId) {
      setDetail({ status: "idle" });
      return;
    }
    setDetail((prev) => ({ status: "loading", data: prev.data }));
    try {
      const data = await fetchJson<ApiEnvelope<DetailPayload>>(`/api/workflow-core/tasks/${encodeURIComponent(taskId)}/governance-detail`);
      setDetail({ status: "ready", data: data.payload });
    } catch (err) {
      setDetail((prev) => ({ status: "error", data: prev.data, error: err instanceof Error ? err.message : String(err) }));
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    const taskId = new URLSearchParams(window.location.search).get("taskId") ?? "";
    if (taskId) setSelectedTaskId(taskId);
  }, []);

  useEffect(() => {
    loadDetail(selectedTaskId);
  }, [loadDetail, selectedTaskId]);

  const tasks = taskList.data?.rows ?? [];
  const selectedTask = tasks.find((task) => task.taskId === selectedTaskId);
  const counts = useMemo(() => {
    const byStatus = new Map<string, number>();
    for (const task of tasks) byStatus.set(task.status, (byStatus.get(task.status) ?? 0) + 1);
    return {
      total: taskList.data?.total ?? 0,
      active: (byStatus.get("CREATED") ?? 0) + (byStatus.get("RUNNING") ?? 0),
      completed: byStatus.get("COMPLETED") ?? 0,
      failed: (byStatus.get("FAILED") ?? 0) + (byStatus.get("CANCELED") ?? 0),
    };
  }, [taskList.data?.total, tasks]);

  const detailData = detail.data?.found ? detail.data : null;
  const outboxCounters = outbox.data?.counters;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Link href="/ai-control" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-indigo-50 hover:text-indigo-700">
                <ArrowLeft className="h-3.5 w-3.5" />
                AI 智控中心
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-700">任务版本治理</span>
            </div>
            <Link href="/tabs/brand-control" className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800">
              返回业务驾驶舱
            </Link>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-100">
                <GitBranch className="h-3.5 w-3.5" />
                workflow-core
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">任务版本治理</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                读取真实任务账本，查看阶段、产物、版本、执行事件与 Outbox。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status || "all"} value={status}>
                    {status || "全部状态"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadList}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={taskList.status === "loading"}
              >
                {taskList.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                刷新
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-5 px-6 py-6">
        {(taskList.status === "error" || outbox.status === "error") && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{taskList.error ?? outbox.error}</span>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={Database} label="任务" value={counts.total} tone="orange" />
          <MetricCard icon={Clock3} label="运行中" value={counts.active} tone="blue" />
          <MetricCard icon={CheckCircle2} label="已完成" value={counts.completed} tone="emerald" />
          <MetricCard icon={AlertTriangle} label="异常" value={counts.failed} tone="rose" />
          <MetricCard icon={ShieldCheck} label="Outbox" value={outboxCounters?.total_rows ?? 0} tone="violet" />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">任务列表</h2>
                <p className="mt-1 text-xs text-slate-500">品牌：{BRAND_ID}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                {taskList.status === "loading" ? "加载中" : `${tasks.length}/${counts.total}`}
              </span>
            </div>
            <div className="max-h-[680px] overflow-auto p-3">
              {tasks.length ? (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <button
                      key={task.taskId}
                      type="button"
                      onClick={() => setSelectedTaskId(task.taskId)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selectedTaskId === task.taskId
                          ? "border-orange-300 bg-orange-50 ring-2 ring-orange-100"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="line-clamp-2 text-sm font-semibold text-slate-900">{task.goal || task.taskId}</div>
                          <div className="mt-1 font-mono text-[11px] text-slate-400">{task.taskId}</div>
                        </div>
                        <StatusPill status={task.status} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                        <SmallStat label="阶段" value={task.stageRuns?.length ?? 0} />
                        <SmallStat label="产物" value={task.artifacts?.length ?? 0} />
                        <SmallStat label="事件" value={task.executionEvents?.length ?? 0} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState loading={taskList.status === "loading"} title="暂无任务" />
              )}
            </div>
          </div>

          <div className="space-y-5 xl:col-span-7">
            <TaskSummaryCard task={selectedTask} detail={detailData} loading={detail.status === "loading"} />
            <LedgerGrid detail={detailData} />
            <OutboxPanel summary={outbox.data} rows={detailData?.outbox.rows ?? []} />
          </div>
        </section>
      </div>
    </main>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await authenticatedFetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function TaskSummaryCard({ task, detail, loading }: { task?: WfTaskRow; detail: Extract<DetailPayload, { found: true }> | null; loading: boolean }) {
  if (!task) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmptyState loading={loading} title="未选择" />
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StatusPill status={task.status} />
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">rev {task.revision}</span>
          </div>
          <h2 className="mt-3 text-lg font-semibold">{task.goal || task.taskId}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{task.scopeEnd || "暂无范围"}</p>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-orange-600" />}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <InfoBlock label="路线" value={task.routeId} />
        <InfoBlock label="版本" value={task.routeVersion} />
        <InfoBlock label="归档" value={task.archiveStatus ?? "-"} />
      </div>
      {detail && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 md:grid-cols-4">
          <SmallStat label="阶段" value={detail.stages.length} />
          <SmallStat label="产物" value={detail.artifacts.length} />
          <SmallStat label="事件" value={detail.execution_events.length} />
          <SmallStat label="路线图" value={detail.ontology_preflight_evidence?.length ?? 0} />
          <SmallStat label="节点" value={detail.ontology_node_evidence?.length ?? 0} />
        </div>
      )}
    </div>
  );
}

function LedgerGrid({ detail }: { detail: Extract<DetailPayload, { found: true }> | null }) {
  return (
    <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
      <LedgerSection
        title="阶段"
        icon={GitBranch}
        items={detail?.stages ?? []}
        empty="暂无阶段"
        render={(item) => (
          <EvidenceRow
            key={item.stageRunId}
            title={item.stageKey}
            subtitle={`${item.ownerExpertId} · gen ${item.generation}`}
            status={item.status}
            right={formatTime(item.updatedAt)}
          />
        )}
      />
      <LedgerSection
        title="产物"
        icon={FileText}
        items={detail?.artifacts ?? []}
        empty="暂无产物"
        render={(item) => (
          <EvidenceRow
            key={item.artifactRevisionId}
            title={`${item.kind} · r${item.revisionNo}`}
            subtitle={item.localPath}
            status={item.mimeType ?? "artifact"}
            right={formatTime(item.createdAt)}
          />
        )}
      />
      <LedgerSection
        title="路线图"
        icon={GitBranch}
        items={detail?.ontology_preflight_evidence ?? []}
        empty="暂无路线"
        render={(item) => <OntologyPreflightRow key={item.eventId} item={item} />}
      />
      <LedgerSection
        title="节点推进"
        icon={ShieldCheck}
        items={detail?.ontology_node_evidence ?? []}
        empty="暂无节点"
        render={(item) => <OntologyNodeEvidenceRow key={item.eventId} item={item} />}
      />
      <LedgerSection
        title="执行事件"
        icon={History}
        items={detail?.execution_events ?? []}
        empty="暂无事件"
        render={(item) => (
          <EvidenceRow
            key={item.eventId}
            title={item.eventType}
            subtitle={`${item.subjectKind}:${item.subjectId}${item.errorCode ? ` · ${item.errorCode}` : ""}`}
            status={item.sourceLevel ?? `attempt ${item.attemptNo}`}
            right={formatTime(item.createdAt)}
          />
        )}
      />
      <LedgerSection
        title="版本"
        icon={ShieldCheck}
        items={detail?.version_usages ?? []}
        empty="暂无版本"
        render={(item) => (
          <EvidenceRow
            key={item.usageId}
            title={item.release?.packageVersion ?? item.desiredRevision}
            subtitle={item.releaseId}
            status={`${item.installedStatus}/${item.loadedStatus}`}
            right={formatTime(item.startedAt)}
          />
        )}
      />
    </div>
  );
}

function OntologyPreflightRow({ item }: { item: OntologyPreflightEvidence }) {
  const boundary = item.evidenceOnly && !item.executionStarted ? "只读留证" : "需核查";
  const steps = item.stepSummaries ?? [];
  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{item.flowName || item.flowKey || "Ontology 路线图"}</div>
          <div className="mt-1 truncate font-mono text-[11px] text-slate-500">{item.planId || item.eventId}</div>
        </div>
        <StatusPill status={boundary} compact />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
        <SmallStat label="步骤" value={item.stepCount ?? steps.length} />
        <SmallStat label="连线" value={item.edgeCount ?? 0} />
        <SmallStat label="版本" value={Number(item.versionNo ?? 0)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
        <span>确认：{item.confirmedBy || "-"}</span>
        <span>时间：{formatTime(item.createdAt)}</span>
      </div>
      {steps.length > 0 && (
        <div className="mt-3 space-y-1">
          {steps.slice(0, 4).map((step, index) => (
            <div key={`${step.node_key || "node"}-${index}`} className="truncate rounded-lg bg-white/80 px-2 py-1 text-xs text-slate-600 ring-1 ring-orange-100">
              {step.step_no ?? index + 1}. {step.title || step.node_key || "未命名节点"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OntologyNodeEvidenceRow({ item }: { item: OntologyNodeEvidence }) {
  const status = item.nodeStatus === "blocked" ? "确认阻断" : item.nodeStatus || item.eventType;
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{item.nodeTitle || item.nodeKey || "Ontology 节点"}</div>
          <div className="mt-1 truncate font-mono text-[11px] text-slate-500">{item.flowKey || "-"} · {item.nodeKey || "-"}</div>
        </div>
        <StatusPill status={status} compact />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
        <SmallStat label="序号" value={Number(item.stepNo ?? 0)} />
        <SmallStat label="引用" value={item.referenceCount ?? 0} />
        <SmallStat label="后续" value={item.nextCount ?? 0} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
        <span>确认闸：{item.confirmationRequired ? (item.confirmationSatisfied ? "已确认" : "未通过") : "不需要"}</span>
        <span>时间：{formatTime(item.createdAt)}</span>
      </div>
      {(item.outcome || item.blockedReason) && (
        <div className="mt-2 rounded-lg bg-white/80 px-2 py-1 text-xs leading-5 text-slate-600 ring-1 ring-blue-100">
          {item.outcome || item.blockedReason}
        </div>
      )}
    </div>
  );
}

function OutboxPanel({ summary, rows }: { summary?: OutboxSummary; rows: OutboxRow[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Outbox</h2>
          <p className="mt-1 text-xs text-slate-500">schema {summary?.schema_version ?? "-"}</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <SmallStat label="总数" value={summary?.counters.total_rows ?? 0} />
          <SmallStat label="待发" value={summary?.counters.pending_undispatched ?? 0} />
          <SmallStat label="已发" value={summary?.counters.dispatched_ok ?? 0} />
          <SmallStat label="DLQ" value={summary?.counters.in_dlq ?? 0} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        {(summary?.routes ?? []).slice(0, 8).map((route) => (
          <div key={route.id} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-slate-700">{route.id}</span>
              <span className="text-[11px] text-slate-400">P{route.priority}</span>
            </div>
            <div className="mt-1 text-xs text-slate-600">{route.desc}</div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        {rows.length ? (
          <div className="space-y-2">
            {rows.slice(0, 8).map((row) => (
              <EvidenceRow
                key={row.id}
                title={row.eventType}
                subtitle={`${row.sourceTable} · ${row.sourceRecordId}`}
                status={row.dlqMovedAt ? "DLQ" : row.dispatched ? "DISPATCHED" : "PENDING"}
                right={formatTime(row.createdAt)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="暂无Outbox" />
        )}
      </div>
    </div>
  );
}

function LedgerSection<T>({
  title,
  icon: Icon,
  items,
  empty,
  render,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: T[];
  empty: string;
  render: (item: T) => ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-orange-600" />
          {title}
        </h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.length ? items.map(render) : <EmptyState title={empty} />}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: ComponentType<{ className?: string }>; label: string; value: number; tone: "orange" | "blue" | "emerald" | "rose" | "violet" }) {
  const toneClass = {
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

function EvidenceRow({ title, subtitle, status, right }: { title: string; subtitle?: string; status?: string; right?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-800">{title}</div>
          {subtitle && <div className="mt-1 truncate text-xs text-slate-500">{subtitle}</div>}
        </div>
        {status && <StatusPill status={status} compact />}
      </div>
      {right && <div className="mt-1 text-[11px] text-slate-400">{right}</div>}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-slate-800">{value || "-"}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-center ring-1 ring-slate-200">
      <div className="text-sm font-semibold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

function StatusPill({ status, compact = false }: { status: string; compact?: boolean }) {
  const tone =
    /COMPLETE|PASS|DISPATCH|SUCCESS|ACCEPT/i.test(status)
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : /FAIL|ERROR|DLQ|CANCEL/i.test(status)
        ? "bg-rose-50 text-rose-700 ring-rose-100"
        : /RUN|PENDING|CREATED|PAUSE|UNVERIFIED/i.test(status)
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full font-medium ring-1 ${tone} ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}>
      {status}
    </span>
  );
}

function EmptyState({ title, loading = false }: { title: string; loading?: boolean }) {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {loading ? "加载中" : title}
    </div>
  );
}

function formatTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
