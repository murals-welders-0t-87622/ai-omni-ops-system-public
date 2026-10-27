"use client";
import { authenticatedFetch } from "../../../services/http";

import { useEffect, useMemo, useState } from "react";
import { Database, Loader2, Save, RefreshCw } from "lucide-react";

type FlowSummary = {
  id: string;
  flowKey: string;
  name: string;
  status: string;
  targetName: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
  versionCount: number;
};

type DraftState = {
  loading: boolean;
  saving: boolean;
  message: string;
  flows: FlowSummary[];
};

export default function OntologyDraftPanel() {
  const [state, setState] = useState<DraftState>({
    loading: true,
    saving: false,
    message: "正在读取流程...",
    flows: [],
  });

  const latest = useMemo(() => state.flows[0], [state.flows]);
  const isPublished = latest?.status === "published";

  async function loadFlows() {
    setState((current) => ({ ...current, loading: true, message: "正在读取流程..." }));
    try {
      const response = await authenticatedFetch("/api/ai-control/ontology/flows?limit=5", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `读取失败 ${response.status}`);
      }
      setState((current) => ({
        ...current,
        loading: false,
        message: data.items?.length ? "已读取流程" : "暂无流程",
        flows: data.items || [],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function saveSampleDraft() {
    setState((current) => ({ ...current, saving: true, message: "正在保存草稿..." }));
    try {
      const response = await authenticatedFetch("/api/ai-control/ontology/flows/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowKey: "s3_02_material_reuse_orchestration",
          name: "素材复用业务流程导航",
          status: "draft",
          workspaceScope: "all_network_growth",
          targetKind: "expert_team",
          targetId: "douyin-content-team",
          targetName: "抖音专家团",
          createdBy: "ai-control-ui",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `保存失败 ${response.status}`);
      }
      await loadFlows();
      setState((current) => ({
        ...current,
        saving: false,
        message: `草稿已保存，快照 v${data.version?.versionNo || "?"}`,
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
    void loadFlows();
  }, []);

  return (
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 ring-1 ring-indigo-100">
            <Database className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-indigo-950">草稿保存与回读</p>
            <p className="mt-1 text-xs leading-5 text-indigo-900/75">
              流程、节点、连线和版本。
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadFlows()}
            disabled={state.loading || state.saving}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm disabled:opacity-60"
          >
            {state.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            回读
          </button>
          <button
            type="button"
            onClick={() => void saveSampleDraft()}
            disabled={state.loading || state.saving || isPublished}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {state.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isPublished ? "已发布" : "保存草稿"}
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-indigo-900 ring-1 ring-indigo-100">
        {state.message}
        {latest ? (
          <span className="ml-2 text-indigo-700">
            最新：{latest.name}，{latest.nodeCount} 节点 / {latest.edgeCount} 连线 / {latest.versionCount} 快照
          </span>
        ) : null}
      </div>
    </section>
  );
}
