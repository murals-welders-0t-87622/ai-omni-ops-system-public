"use client";
import { authenticatedFetch } from "../../../services/http";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, FolderKanban, Loader2, PencilRuler, Plus, RefreshCw, Trash2, X } from "lucide-react";
import OntologyWorkbench from "./OntologyWorkbench.client";

type ElementItem = {
  id: string;
  kind: string;
  label: string;
  name?: string;
  path?: string;
  description?: string;
};

type FlowSummary = {
  id: string;
  flowKey: string;
  name: string;
  description?: string;
  status: string;
  targetKind: string;
  targetId: string;
  targetName: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
  versionCount: number;
};

type FlowRuntimeSummary = {
  id: string;
  flowKey: string;
  name: string;
  description?: string;
  status: string;
  targetKind?: string;
  targetId?: string;
  targetName?: string;
  nodes: unknown[];
  edges: unknown[];
};

type ProjectState = {
  loading: boolean;
  loadingTargets: boolean;
  saving: boolean;
  message: string;
  flows: FlowSummary[];
  targets: ElementItem[];
  selectedTargetId: string;
  activeFlowKey: string;
  createOpen: boolean;
};

const BRAND_ID = "brand-demo-cleaning";
const AI_DRAFT_MODEL = "deepseek-v4-flash";
const AI_DRAFT_REQUEST_TIMEOUT_MS = 165000;

type OntologyProjectShellProps = {
  apiBaseUrl?: string;
};

export default function OntologyProjectShell({ apiBaseUrl = "" }: OntologyProjectShellProps) {
  const [state, setState] = useState<ProjectState>({
    loading: true,
    loadingTargets: true,
    saving: false,
    message: "正在读取编排项目...",
    flows: [],
    targets: [],
    selectedTargetId: "",
    activeFlowKey: "",
    createOpen: false,
  });

  const activeFlow = useMemo(
    () => state.flows.find((flow) => flow.flowKey === state.activeFlowKey) || null,
    [state.activeFlowKey, state.flows],
  );
  const selectedTarget = useMemo(
    () => state.targets.find((item) => item.id === state.selectedTargetId) || null,
    [state.selectedTargetId, state.targets],
  );
  const existingFlowForSelectedTarget = useMemo(() => {
    if (!selectedTarget) return null;
    const targetKind = selectedTarget.kind === "expert_team" ? "expert_team" : "expert";
    return findMatchingFlow(state.flows, targetKind, selectedTarget.id);
  }, [selectedTarget, state.flows]);

  function updateActiveFlowSummary(flow: FlowRuntimeSummary) {
    setState((current) => ({
      ...current,
      flows: current.flows.map((item) => item.flowKey === flow.flowKey
        ? {
            ...item,
            name: flow.name,
            description: flow.description,
            status: flow.status,
            targetKind: flow.targetKind || item.targetKind,
            targetId: flow.targetId || item.targetId,
            targetName: flow.targetName || item.targetName,
            nodeCount: Array.isArray(flow.nodes) ? flow.nodes.length : item.nodeCount,
            edgeCount: Array.isArray(flow.edges) ? flow.edges.length : item.edgeCount,
          }
        : item),
    }));
  }

  async function loadTargets() {
    setState((current) => ({ ...current, loadingTargets: true }));
    try {
      const response = await authenticatedFetch("/api/ai-control/ontology/elements", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `读取对象失败 ${response.status}`);
      }
      const groups = Array.isArray(data.groups) ? data.groups : [];
      const targets = groups
        .filter((group: any) => group?.key === "experts")
        .flatMap((group: any) => Array.isArray(group?.items) ? group.items : [])
        .filter((item: ElementItem) => item.kind !== "skill");
      setState((current) => ({
        ...current,
        loadingTargets: false,
        targets,
        selectedTargetId: current.selectedTargetId || targets[0]?.id || "",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loadingTargets: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function refreshTargets() {
    setState((current) => ({
      ...current,
      loadingTargets: true,
      message: "正在刷新 WorkBuddy 专家源...",
    }));
    try {
      const response = await authenticatedFetch("/api/ai-control/ontology/elements?refresh=1", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `刷新失败 ${response.status}`);
      }
      const groups = Array.isArray(data.groups) ? data.groups : [];
      const targets = groups
        .filter((group: any) => group?.key === "experts")
        .flatMap((group: any) => Array.isArray(group?.items) ? group.items : [])
        .filter((item: ElementItem) => item.kind !== "skill");
      setState((current) => ({
        ...current,
        loadingTargets: false,
        targets,
        selectedTargetId: targets.some((item: ElementItem) => item.id === current.selectedTargetId)
          ? current.selectedTargetId
          : targets[0]?.id || "",
        message: `已刷新专家源，当前可选 ${targets.length} 个专家团 / 专家对象`,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loadingTargets: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function loadProjects() {
    setState((current) => ({ ...current, loading: true, message: "正在读取编排项目..." }));
    try {
      const response = await authenticatedFetch("/api/ai-control/ontology/flows?limit=24", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `读取失败 ${response.status}`);
      }
      const flows = data.items || [];
      setState((current) => ({
        ...current,
        loading: false,
        message: flows.length ? `已读取 ${flows.length} 个编排项目` : "暂无编排项目",
        flows,
        activeFlowKey: current.activeFlowKey && flows.some((flow: FlowSummary) => flow.flowKey === current.activeFlowKey)
          ? current.activeFlowKey
          : "",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function createStarterProject() {
    if (!selectedTarget) {
      setState((current) => ({ ...current, message: "请先选择一个专家团或专家" }));
      return;
    }
    if (existingFlowForSelectedTarget) {
      const targetName = selectedTarget.label || selectedTarget.name || selectedTarget.id;
      setState((current) => ({
        ...current,
        activeFlowKey: existingFlowForSelectedTarget.flowKey,
        createOpen: false,
        message: `${formatTargetKind(selectedTarget.kind)}「${targetName}」已存在项目，已直接打开现有画布`,
      }));
      return;
    }
    setState((current) => ({ ...current, saving: true, message: "正在创建专家团编排项目..." }));
    try {
      const kind = selectedTarget.kind === "expert_team" ? "expert_team" : "expert";
      const targetName = selectedTarget.label || selectedTarget.name || selectedTarget.id;
      const flowKey = `ontology_${kind}_${slugify(selectedTarget.id)}_${Date.now().toString(36)}`;
      const projectName = `${targetName} 业务流程编排`;
      const response = await authenticatedFetch("/api/ai-control/ontology/flows/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowKey,
          name: projectName,
          description: `绑定 ${formatTargetKind(kind)}「${targetName}」的 Ontology 业务流程地图。`,
          status: "draft",
          workspaceScope: "all_network_growth",
          targetKind: kind,
          targetId: selectedTarget.id,
          targetName,
          sourceRefsJson: {
            selected_target: selectedTarget,
            source: "ai-control-ontology-project-wizard",
          },
          createdBy: "ai-control-ui",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `创建失败 ${response.status}`);
      }
      await loadProjects();
      setState((current) => ({
        ...current,
        saving: false,
        activeFlowKey: data.item?.flowKey || data.flow?.flowKey || current.activeFlowKey,
        createOpen: false,
        message: "项目已创建，可进入画布手动调整",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function createAiDraftProject() {
    if (!selectedTarget) {
      setState((current) => ({ ...current, message: "请先选择一个专家团或专家" }));
      return;
    }
    const existingFlow = existingFlowForSelectedTarget || null;
    if (existingFlow) {
      const targetName = selectedTarget.label || selectedTarget.name || selectedTarget.id;
      const confirmed = window.confirm(
        `${formatTargetKind(selectedTarget.kind)}「${targetName}」已存在项目。\n\n是否按最新专家/Skill 真源重新生成并覆盖当前草稿结构？`,
      );
      if (!confirmed) {
        setState((current) => ({
          ...current,
          activeFlowKey: existingFlow.flowKey,
          createOpen: false,
          message: `已打开现有项目「${targetName}」，未执行重新生成。`,
        }));
        return;
      }
    }
    setState((current) => ({
      ...current,
      saving: true,
      message: existingFlow ? "正在按最新专家/Skill 真源重新生成 AI 草案..." : "正在根据专家配置文档生成 AI 草案...",
    }));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), AI_DRAFT_REQUEST_TIMEOUT_MS);
    try {
      const kind = selectedTarget.kind === "expert_team" ? "expert_team" : "expert";
      const targetName = selectedTarget.label || selectedTarget.name || selectedTarget.id;
      const flowKey = existingFlow && existingFlow.status !== "published"
        ? existingFlow.flowKey
        : `ontology_${kind}_${slugify(selectedTarget.id)}_${Date.now().toString(36)}`;
      const projectName = `${targetName} AI 草案`;
      const response = await authenticatedFetch(resolveAiDraftRequestUrl(apiBaseUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowKey,
          name: projectName,
          description: `根据 ${formatTargetKind(kind)}「${targetName}」配置文档自动生成的 Ontology 编排草案。`,
          model: AI_DRAFT_MODEL,
          brandId: BRAND_ID,
          workspaceScope: "all_network_growth",
          targetKind: kind,
          targetId: selectedTarget.id,
          targetName,
          forceRegenerate: Boolean(existingFlow),
          sourceRefsJson: {
            selected_target: selectedTarget,
            source: existingFlow
              ? "ai-control-ontology-project-wizard-ai-draft-force-regenerate"
              : "ai-control-ontology-project-wizard-ai-draft",
          },
          createdBy: "ai-control-ui",
        }),
        signal: controller.signal,
      });
      const data = await readApiEnvelope(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `AI 草案生成失败 ${response.status}`);
      }
      await loadProjects();
      setState((current) => ({
        ...current,
        saving: false,
        activeFlowKey: data.item?.flowKey || current.activeFlowKey,
        createOpen: false,
        message: existingFlow ? "AI 草案已按最新真源重新生成" : "AI 草案已生成，可进入手动DIY检查后发布",
      }));
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      setState((current) => ({
        ...current,
        saving: false,
        message: isAbort
          ? "AI 草案生成超时，请稍后重试"
          : error instanceof Error
            ? error.message
            : String(error),
      }));
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function forkPublishedProject(flow: FlowSummary) {
    const existingDraft = findExistingDraftFlow(state.flows, flow.targetKind, flow.targetId, flow.flowKey);
    if (existingDraft) {
      setState((current) => ({
        ...current,
        activeFlowKey: existingDraft.flowKey,
        message: `${formatTargetKind(flow.targetKind)}「${flow.targetName || flow.targetId}」已有可编辑草稿，已直接打开`,
      }));
      return;
    }
    setState((current) => ({ ...current, saving: true, message: "正在从已发布版本创建新草稿..." }));
    try {
      const detailResponse = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(flow.flowKey)}`, { cache: "no-store" });
      const detailData = await detailResponse.json();
      if (!detailResponse.ok || !detailData?.ok) {
        throw new Error(detailData?.message || detailData?.error || `读取详情失败 ${detailResponse.status}`);
      }
      const detailFlow = detailData.flow || {};
      const draftKey = `${flow.flowKey}_draft`;
      const response = await authenticatedFetch("/api/ai-control/ontology/flows/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowKey: draftKey,
          name: `${flow.name} - 新草稿`,
          description: `从已发布项目「${flow.name}」派生的新草稿，可继续调整节点、连线和规则。`,
          status: "draft",
          brandId: detailFlow.brandId || null,
          workspaceScope: detailFlow.workspaceScope || "all_network_growth",
          targetKind: detailFlow.targetKind || flow.targetKind,
          targetId: detailFlow.targetId || flow.targetId,
          targetName: detailFlow.targetName || flow.targetName,
          sourceRefsJson: {
            forked_from: {
              flowKey: flow.flowKey,
              flowId: flow.id,
              status: flow.status,
            },
            source: "published_contract_draft_fork",
          },
          routingRulesJson: detailData.routingRulesJson,
          confirmationGatesJson: detailData.confirmationGatesJson,
          evidenceRulesJson: detailData.evidenceRulesJson,
          createdBy: "ai-control-ui",
          nodes: mapNodesForDraft(detailData.nodes || []),
          edges: mapEdgesForDraft(detailData.edges || []),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `派生失败 ${response.status}`);
      }
      await loadProjects();
      setState((current) => ({
        ...current,
        saving: false,
        activeFlowKey: data.flow?.flowKey || draftKey,
        message: "已创建新草稿，可编辑节点和连线",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function deleteProject(flow: FlowSummary) {
    const targetLabel = `${formatTargetKind(flow.targetKind)}「${flow.targetName || flow.targetId || flow.name}」`;
    const warning = flow.status === "published"
      ? `${targetLabel} 当前是已发布项目，删除后它的节点、连线和版本快照会一起移除。确定删除？`
      : `确定删除 ${targetLabel} 吗？`;
    const confirmed = window.confirm(warning);
    if (!confirmed) return;
    setState((current) => ({ ...current, saving: true, message: `正在删除 ${targetLabel}...` }));
    try {
      const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(flow.flowKey)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deletedBy: "ai-control-ui",
          note: "ontology_project_card_delete",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `删除失败 ${response.status}`);
      }
      setState((current) => ({
        ...current,
        saving: false,
        flows: current.flows.filter((item) => item.flowKey !== flow.flowKey),
        activeFlowKey: current.activeFlowKey === flow.flowKey ? "" : current.activeFlowKey,
        message: `${targetLabel} 已删除`,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  useEffect(() => {
    void loadProjects();
    void loadTargets();
  }, []);

  if (activeFlow) {
    return (
      <section className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => setState((current) => ({ ...current, activeFlowKey: "" }))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                返回编排项目
              </button>
              <h2 className="mt-2 text-lg font-bold text-slate-950">{activeFlow.name}</h2>
              <p className="mt-1 text-sm text-slate-600">
                当前画布绑定：{formatTargetKind(activeFlow.targetKind)} / {activeFlow.targetName || activeFlow.targetId || "未选择"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                {activeFlow.status === "published" ? "已发布，可继续编辑" : "草稿版本"}
              </span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700 ring-1 ring-indigo-100">
                {activeFlow.nodeCount} 节点 / {activeFlow.edgeCount} 连线
              </span>
            </div>
          </div>
        </div>
        <OntologyWorkbench flowKey={activeFlow.flowKey} onFlowLoaded={updateActiveFlowSummary} />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
              <FolderKanban className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-950">我的 Ontology 编排项目</h2>
              <p className="mt-1 text-sm text-slate-600">
                每个项目对应一个专家团或专家的业务流程画布。
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/ai-control/ontology/elements/dictionary"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              五元素字典
            </Link>
            <button
              type="button"
              onClick={() => void loadProjects()}
              disabled={state.loading || state.saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              {state.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              回读项目
            </button>
            <button
              type="button"
              onClick={() => void refreshTargets()}
              disabled={state.loadingTargets || state.saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              {state.loadingTargets ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              刷新专家源
            </button>
            <button
              type="button"
              onClick={() => setState((current) => ({ ...current, createOpen: true }))}
              disabled={state.loading || state.loadingTargets || state.saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              新建项目
            </button>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-100">
          {state.message}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          “回读项目”只刷新下方编排项目卡片；如果 WorkBuddy 里新增或删除了专家团 / 专家，请点击“刷新专家源”重新扫描当前挂载源。
        </p>
      </div>

      {state.createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-950">新建 Ontology 编排项目</h3>
                <p className="mt-1 text-sm text-slate-500">选择一个专家团或专家，可直接创建手动DIY草稿，或先让 AI 生成一版已配置草案。</p>
              </div>
              <button
                type="button"
                onClick={() => setState((current) => ({ ...current, createOpen: false }))}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="关闭新建项目弹窗"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-5 block space-y-1 text-xs font-semibold text-slate-500">
              选择专家团 / 专家
              <select
                value={state.selectedTargetId}
                onChange={(event) => setState((current) => ({ ...current, selectedTargetId: event.target.value }))}
                disabled={state.loadingTargets || state.saving}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400"
              >
                {state.targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {formatTargetKind(target.kind)} / {target.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 flex justify-between gap-2 text-xs text-slate-500">
              <span>如果 WorkBuddy 刚增减了专家团 / 专家，先点右侧按钮再重新选择。</span>
              <button
                type="button"
                onClick={() => void refreshTargets()}
                disabled={state.loadingTargets || state.saving}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-60"
              >
                {state.loadingTargets ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                刷新专家源
              </button>
            </div>
            {existingFlowForSelectedTarget ? (
              <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                当前对象已存在项目：{existingFlowForSelectedTarget.name}。下方可直接进入现有项目，或按最新专家/Skill 真源重新生成 AI 草案。
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setState((current) => ({ ...current, createOpen: false }))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void createStarterProject()}
                disabled={state.loadingTargets || state.saving || !selectedTarget}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
              >
                {state.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {existingFlowForSelectedTarget ? "进入现有项目" : "手动DIY"}
              </button>
              <button
                type="button"
                onClick={() => void createAiDraftProject()}
                disabled={state.loadingTargets || state.saving || !selectedTarget}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {state.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                {existingFlowForSelectedTarget ? "重新生成 AI 草案" : "AI 生成草案"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {state.flows.map((flow) => (
          <article key={flow.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-indigo-600">{formatTargetKind(flow.targetKind)}</p>
                <h3 className="mt-2 text-base font-bold text-slate-950">{flow.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{flow.targetName || flow.targetId || "未选择对象"}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {flow.status === "published" ? "已发布" : "草稿"}
              </span>
            </div>
            <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
              {flow.description || "专家团/专家业务流程导航项目。"}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <Metric label="节点" value={flow.nodeCount} />
              <Metric label="连线" value={flow.edgeCount} />
              <Metric label="版本" value={flow.versionCount} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setState((current) => ({ ...current, activeFlowKey: flow.flowKey }))}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
              >
                <PencilRuler className="h-3.5 w-3.5" />
                手动 DIY
              </button>
              {flow.status === "published" ? (
                <button
                  type="button"
                  onClick={() => setState((current) => ({
                    ...current,
                    activeFlowKey: flow.flowKey,
                    message: "已进入当前项目，可继续修改；下次确认发布将以最新发布版本为准。",
                  }))}
                  disabled={state.saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-60"
                >
                  {state.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  继续编辑
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="第一版生成 provider 走 AI 中台第三方模型能力，接入后开放。"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400"
                >
                  <Bot className="h-3.5 w-3.5" />
                  AI 生成草案
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => void deleteProject(flow)}
              disabled={state.saving}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60"
            >
              {state.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              删除项目
            </button>
          </article>
        ))}
      </div>

      {!state.loading && !state.flows.length ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          暂无项目。先新建一个专家团/专家编排项目，再进入画布调整流程。
        </div>
      ) : null}
    </section>
  );
}

function resolveAiDraftRequestUrl(apiBaseUrl: string) {
  const normalizedBaseUrl = String(apiBaseUrl || "").trim().replace(/\/$/, "");
  return normalizedBaseUrl
    ? `${normalizedBaseUrl}/ai-control/ontology/flows/ai-draft`
    : "/api/ai-control/ontology/flows/ai-draft";
}

async function readApiEnvelope(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return {
    ok: response.ok,
    message: text.trim() || undefined,
    error: text.trim() || undefined,
  };
}

function mapNodesForDraft(nodes: any[]) {
  return nodes.map((node, index) => ({
    nodeKey: String(node?.nodeKey || `stage_${index + 1}`),
    nodeType: String(node?.nodeType || "stage"),
    title: String(node?.title || `流程节点 ${index + 1}`),
    subtitle: node?.subtitle || "",
    description: node?.description || "",
    sortOrder: Number(node?.sortOrder) || (index + 1) * 100,
    objectJson: node?.objectJson ?? node?.fiveElements?.object ?? [],
    linkJson: node?.linkJson ?? node?.fiveElements?.link ?? [],
    functionJson: node?.functionJson ?? node?.fiveElements?.function ?? [],
    actionJson: node?.actionJson ?? node?.fiveElements?.action ?? [],
    interfaceJson: node?.interfaceJson ?? node?.fiveElements?.interface ?? [],
    referencesJson: { boundElements: Array.isArray(node?.references) ? node.references : [] },
  }));
}

function mapEdgesForDraft(edges: any[]) {
  return edges.map((edge, index) => ({
    edgeKey: String(edge?.edgeKey || `edge_${index + 1}`),
    fromNodeKey: String(edge?.fromNodeKey || ""),
    toNodeKey: String(edge?.toNodeKey || ""),
    label: edge?.label || "",
    conditionJson: edge?.conditionJson ?? edge?.condition ?? {},
    sortOrder: Number(edge?.sortOrder) || (index + 1) * 100,
  })).filter((edge) => edge.fromNodeKey && edge.toNodeKey);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "project";
}

function findMatchingFlow(flows: FlowSummary[], targetKind: string, targetId: string) {
  return flows.find((flow) => flow.targetKind === targetKind && flow.targetId === targetId) || null;
}

function findExistingDraftFlow(flows: FlowSummary[], targetKind: string, targetId: string, excludeFlowKey?: string) {
  return flows.find((flow) => (
    flow.flowKey !== excludeFlowKey
    && flow.targetKind === targetKind
    && flow.targetId === targetId
    && flow.status !== "published"
  )) || null;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <div className="text-sm font-bold text-slate-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function formatTargetKind(kind: string) {
  const map: Record<string, string> = {
    expert_team: "专家团",
    expert: "专家",
    skill: "Skill",
  };
  return map[kind] || kind || "对象";
}
