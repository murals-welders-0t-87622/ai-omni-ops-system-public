"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FolderOpen,
  HardDrive,
  Home,
  Puzzle,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { jsonRequest, request } from "../../services/http";
import {
  getAIControlCenterInstallationWorkspace,
  type AIControlCenterInstallWorkspace,
} from "../../services/openclaw";
import {
  getLocalRuntimeSettings,
  pickLocalMaterialLibraryBaseRoot,
  updateLocalRuntimeSettings,
  type LocalRuntimeSettings,
} from "../../services/personal-center";

type WritePolicy = {
  source_root?: string;
  source_mode?: string;
  git_root?: string | null;
  write_enabled?: boolean;
  git_clean?: boolean;
  writable_mount?: boolean;
  local_history_root?: string;
  local_history_available?: boolean;
  blocked_reason?: string | null;
};

type ExpertSourceMountGuide = {
  current?: {
    source_root?: string;
    source_mode?: string;
    write_enabled?: boolean;
    writable_mount?: boolean;
    local_history_root?: string;
    plugin_count?: number;
    agents_count?: number;
    skills_count?: number;
  };
  suggested?: {
    host_path?: string;
    container_path?: string;
    mount_mode?: string;
    env_name?: string;
  };
  latest_request?: {
    id?: string;
    created_at?: string;
    requested_host_path?: string;
    requested_mount_mode?: string;
    status?: string;
    note?: string;
  } | null;
  capabilities?: {
    browser_can_read_host_path?: boolean;
    can_apply_without_restart?: boolean;
    can_enable_writeback_now?: boolean;
  };
  commands?: {
    powershell?: string[];
    note?: string;
  };
  blocked_reason?: string;
};

type ExpertSourceMountRequest = {
  ok?: boolean;
  request?: NonNullable<ExpertSourceMountGuide["latest_request"]>;
  commands?: ExpertSourceMountGuide["commands"];
  blocked_reason?: string;
};

type LocalRestoreRequestGate = {
  key?: string;
  label?: string;
  ok?: boolean;
  detail?: string;
};

type WritebackSample = {
  kind?: "expert" | "skill";
  rel_posix?: string;
  bytes?: number;
  sha256?: string;
  risk_level?: "low" | "medium";
  reason?: string;
};

type WritebackReadiness = {
  ready_for_real_writeback?: boolean;
  recommended_sample?: WritebackSample | null;
  candidate_samples?: WritebackSample[];
  gates?: LocalRestoreRequestGate[];
  blockers?: string[];
  boundary?: string;
};

const A_BUSINESS_TABS = [
  { slug: "brand-control", label: "全局概览" },
  { slug: "brand-growth", label: "品牌增长" },
  { slug: "content-customer", label: "内容获客" },
  { slug: "geo-customer", label: "GEO 获客" },
  { slug: "omni-channel", label: "全网获客" },
  { slug: "ad-traffic", label: "投流获客" },
  { slug: "daren-collab", label: "达人合作" },
] as const;

const WORKBUDDY_DEFAULT_PATH = "C:\\Users\\Administrator\\.workbuddy\\plugins\\marketplaces\\my-experts\\plugins";

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

export default function StorageConnectorsWorkspace() {
  const [writePolicy, setWritePolicy] = useState<WritePolicy | null>(null);
  const [mountGuide, setMountGuide] = useState<ExpertSourceMountGuide | null>(null);
  const [readiness, setReadiness] = useState<WritebackReadiness | null>(null);
  const [runtimeSettings, setRuntimeSettings] = useState<LocalRuntimeSettings | null>(null);
  const [installWorkspace, setInstallWorkspace] = useState<AIControlCenterInstallWorkspace | null>(null);
  const [requestedHostPath, setRequestedHostPath] = useState(WORKBUDDY_DEFAULT_PATH);
  const [mountMode, setMountMode] = useState<"readonly" | "writable">("readonly");
  const [mountRequest, setMountRequest] = useState<ExpertSourceMountRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mountSubmitting, setMountSubmitting] = useState(false);
  const [pickingLibrary, setPickingLibrary] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadAll(mode: "initial" | "refresh" = "initial") {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setErrorMessage("");
    try {
      const [policy, guide, readinessData, runtime, install] = await Promise.all([
        request<WritePolicy>("/ai-control/write-policy"),
        request<ExpertSourceMountGuide>("/ai-control/expert-source/mount-guide"),
        request<WritebackReadiness>("/ai-control/writeback-readiness"),
        getLocalRuntimeSettings(),
        getAIControlCenterInstallationWorkspace(),
      ]);
      setWritePolicy(policy);
      setMountGuide(guide);
      setReadiness(readinessData);
      setRuntimeSettings(runtime);
      setInstallWorkspace(install);
      setRequestedHostPath(
        guide.latest_request?.requested_host_path
          ?? guide.suggested?.host_path
          ?? WORKBUDDY_DEFAULT_PATH,
      );
    } catch (error: any) {
      setErrorMessage(error?.message ?? String(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadAll("initial");
  }, []);

  const mountCommand = useMemo(
    () => (mountRequest?.commands?.powershell ?? mountGuide?.commands?.powershell ?? []).join("\n"),
    [mountGuide?.commands?.powershell, mountRequest?.commands?.powershell],
  );

  const gateSummary = useMemo(() => {
    return [
      { label: "写权限", ok: !!writePolicy?.write_enabled, value: writePolicy?.write_enabled ? "已开启" : "未开启" },
      { label: "Git 状态", ok: !!writePolicy?.git_clean, value: writePolicy?.git_clean ? "clean" : "需处理" },
      { label: "挂载状态", ok: !!writePolicy?.writable_mount, value: writePolicy?.writable_mount ? "可写" : "只读" },
      { label: "本机历史", ok: !!writePolicy?.local_history_available, value: writePolicy?.local_history_available ? "已启用" : "未启用" },
    ];
  }, [writePolicy]);

  async function handleSubmitMountRequest() {
    setMountSubmitting(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await jsonRequest<ExpertSourceMountRequest>(
        "/ai-control/expert-source/mount-request",
        "POST",
        { hostPath: requestedHostPath, mountMode },
      );
      setMountRequest(result);
      setNotice(`已记录挂载申请：${result.request?.id || "pending"}`);
      await loadAll("refresh");
    } catch (error: any) {
      setErrorMessage(error?.message ?? String(error));
    } finally {
      setMountSubmitting(false);
    }
  }

  async function handlePickMaterialLibraryRoot() {
    setPickingLibrary(true);
    setNotice("");
    setErrorMessage("");
    try {
      const picked = await pickLocalMaterialLibraryBaseRoot();
      if (picked.canceled || !picked.selectedPath) {
        setNotice("已取消选择素材库目录。");
        return;
      }
      const updated = await updateLocalRuntimeSettings({ materialLibraryBaseRoot: picked.selectedPath });
      setRuntimeSettings(updated);
      setNotice(`素材库根目录已更新为：${picked.libraryRoot}`);
    } catch (error: any) {
      setErrorMessage(error?.message ?? String(error));
    } finally {
      setPickingLibrary(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/ai-control" className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-700">
              <Puzzle className="h-4 w-4" /> AI 智控中心
            </Link>
            <span className="text-slate-300">›</span>
            <span className="rounded-lg bg-cyan-50 px-2.5 py-1 font-medium text-cyan-700 ring-1 ring-cyan-100">
              ⑧ 存储与连接器
            </span>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/tabs/brand-control" className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200/60 bg-cyan-50 px-2.5 py-1.5 text-sm font-semibold text-cyan-700 shadow-sm transition hover:bg-cyan-100">
              <Home className="h-4 w-4" /> 品牌总控 ▶
            </Link>
            <div className="group relative">
              <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700">
                返回业务驾驶舱
              </button>
              <div className="pointer-events-none absolute right-0 z-50 mt-2 hidden w-[280px] rounded-2xl border border-slate-200 bg-white p-3 opacity-0 shadow-2xl ring-1 ring-black/5 transition group-hover:pointer-events-auto group-hover:block group-hover:opacity-100">
                <div className="space-y-1">
                  {A_BUSINESS_TABS.map((tab) => (
                    <Link key={tab.slug} href={`/tabs/${tab.slug}`} className="flex items-center justify-between rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-cyan-50">
                      <span>{tab.label}</span>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
                <HardDrive className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">⑧ 存储与连接器</h1>
                  <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">MCP / 挂载 / 素材库 / 备份</span>
                </div>
                <p className="max-w-3xl text-sm leading-relaxed text-slate-500">
                  这一页不再只是壳层说明。第一版先把影响执行稳定性的底座接出来：
                  WorkBuddy 专家源挂载、真实写回就绪检查、本机素材库目录、运行时存储路径和 MCP 接入基础状态。
                </p>
                {notice ? <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">💡 {notice}</p> : null}
                {errorMessage ? <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 ring-1 ring-rose-100">⚠️ {errorMessage}</p> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadAll("refresh")}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading || refreshing ? "animate-spin" : ""}`} />
              刷新状态
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="MCP 服务名" value={installWorkspace?.mcpServerName || "读取中"} hint="给 WorkBuddy / Cursor / Codex 的统一服务标识" />
          <StatCard label="专家插件包" value={String(mountGuide?.current?.plugin_count ?? "-")} hint="当前挂载进系统的插件包数量" />
          <StatCard label="专家文件" value={String(mountGuide?.current?.agents_count ?? "-")} hint="当前可扫描的 agents 文件数" />
          <StatCard label="素材库根目录" value={runtimeSettings?.materialLibrary?.libraryRoot || "读取中"} hint="本机素材档案写入与分类根目录" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">① WorkBuddy 专家源挂载 / MCP 真源状态</h2>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">确认系统实际读的是哪一个专家源目录，并为后续只读或可写挂载生成申请方案。</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-[11px] text-slate-500">当前运行态真源</div>
                <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-[12px] text-slate-800 ring-1 ring-slate-200">
                  {mountGuide?.current?.source_root || writePolicy?.source_root || writePolicy?.git_root || "/expert-source"}
                </code>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-[11px] text-slate-500">本机默认建议路径</div>
                <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-[12px] text-slate-800 ring-1 ring-slate-200">
                  {mountGuide?.suggested?.host_path || WORKBUDDY_DEFAULT_PATH}
                </code>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_150px_auto]">
              <input
                value={requestedHostPath}
                onChange={(event) => setRequestedHostPath(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-[12px] text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                placeholder={WORKBUDDY_DEFAULT_PATH}
              />
              <select
                value={mountMode}
                onChange={(event) => setMountMode(event.target.value === "writable" ? "writable" : "readonly")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              >
                <option value="readonly">只读挂载</option>
                <option value="writable">可写申请</option>
              </select>
              <button
                type="button"
                onClick={() => void handleSubmitMountRequest()}
                disabled={mountSubmitting || !requestedHostPath.trim()}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-[12px] font-medium text-cyan-700 hover:bg-cyan-100 disabled:opacity-50"
              >
                {mountSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                生成挂载方案
              </button>
            </div>

            {mountGuide?.latest_request || mountRequest?.request ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[12px] leading-5 text-slate-700 ring-1 ring-slate-200">
                最近申请：
                <span className="ml-1 font-mono">{mountRequest?.request?.id || mountGuide?.latest_request?.id || "-"}</span>
                <span className="mx-1 text-slate-300">·</span>
                {mountRequest?.request?.status || mountGuide?.latest_request?.status || "pending"}
              </div>
            ) : null}

            {mountCommand ? (
              <div className="mt-3 rounded-xl bg-slate-950 p-3">
                <div className="mb-2 text-[11px] text-slate-300">建议的重启/挂载命令</div>
                <pre className="whitespace-pre-wrap break-all font-mono text-[11.5px] leading-5 text-slate-100">{mountCommand}</pre>
              </div>
            ) : null}

            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
              {mountRequest?.blocked_reason || mountGuide?.blocked_reason || "网页只记录挂载申请，不直接改 Docker。"}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">② 真实写回就绪检查</h2>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">先看闸门有没有过，再决定后面哪些能力可以开放。</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {gateSummary.map((gate) => (
                <div key={gate.label} className={`rounded-xl p-3 ring-1 ${gate.ok ? "bg-emerald-50 text-emerald-900 ring-emerald-100" : "bg-amber-50 text-amber-900 ring-amber-100"}`}>
                  <div className="text-[11px] opacity-75">{gate.label}</div>
                  <div className="mt-1 text-sm font-semibold">{gate.value}</div>
                </div>
              ))}
            </div>

            {writePolicy?.blocked_reason ? (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
                {writePolicy.blocked_reason}
              </div>
            ) : null}

            <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-[11px] text-slate-500">推荐首次验证样本</div>
              <div className="mt-2 break-all font-mono text-[12px] font-semibold text-slate-900">
                {readiness?.recommended_sample?.rel_posix || "等待扫描"}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                  {readiness?.recommended_sample?.kind || "-"}
                </span>
                <span className="rounded bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                  {readiness?.recommended_sample?.bytes || "-"} bytes
                </span>
                <span className="rounded bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                  {readiness?.recommended_sample?.risk_level || "low"}
                </span>
              </div>
              <p className="mt-3 text-[12px] leading-5 text-slate-600">
                {readiness?.recommended_sample?.reason || readiness?.boundary || "当前只读，不执行真实写回。"}
              </p>
            </div>

            {readiness?.gates?.length ? (
              <div className="mt-4 space-y-2">
                {readiness.gates.map((gate) => (
                  <div key={gate.key || gate.label} className={`rounded-xl p-3 text-[12px] ring-1 ${gate.ok ? "bg-emerald-50 text-emerald-900 ring-emerald-100" : "bg-amber-50 text-amber-900 ring-amber-100"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{gate.label || gate.key}</span>
                      <b>{gate.ok ? "通过" : "未通过"}</b>
                    </div>
                    {gate.detail ? <div className="mt-1 leading-5 opacity-80">{gate.detail}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">③ 本机运行时 / 素材库路径</h2>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">这里是单机部署真正会影响素材归档与运行时写入的位置。</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-[11px] text-slate-500">App Root</div>
                <div className="mt-1 break-all font-mono text-[12px] text-slate-900">{runtimeSettings?.paths.appRoot || "读取中"}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-[11px] text-slate-500">Storage Root</div>
                <div className="mt-1 break-all font-mono text-[12px] text-slate-900">{runtimeSettings?.paths.storageRoot || "读取中"}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-[11px] text-slate-500">Backup Root</div>
                <div className="mt-1 break-all font-mono text-[12px] text-slate-900">{runtimeSettings?.paths.backupRoot || "读取中"}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-[11px] text-slate-500">Cache Root</div>
                <div className="mt-1 break-all font-mono text-[12px] text-slate-900">{runtimeSettings?.paths.cacheRoot || "读取中"}</div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-cyan-50/60 p-4 ring-1 ring-cyan-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">素材库目录</div>
                  <div className="mt-1 break-all font-mono text-[12px] text-cyan-900">
                    {runtimeSettings?.materialLibrary.libraryRoot || "读取中"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handlePickMaterialLibraryRoot()}
                  disabled={pickingLibrary}
                  className="inline-flex items-center gap-1 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-[12px] font-medium text-cyan-700 hover:bg-cyan-100 disabled:opacity-50"
                >
                  {pickingLibrary ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
                  选择素材库目录
                </button>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-lg bg-white px-3 py-2 text-[12px] text-slate-700 ring-1 ring-cyan-100">
                  文本：{runtimeSettings?.materialLibrary.categoryDirectories.text || "-"}
                </div>
                <div className="rounded-lg bg-white px-3 py-2 text-[12px] text-slate-700 ring-1 ring-cyan-100">
                  图片：{runtimeSettings?.materialLibrary.categoryDirectories.image || "-"}
                </div>
                <div className="rounded-lg bg-white px-3 py-2 text-[12px] text-slate-700 ring-1 ring-cyan-100">
                  音频：{runtimeSettings?.materialLibrary.categoryDirectories.audio || "-"}
                </div>
                <div className="rounded-lg bg-white px-3 py-2 text-[12px] text-slate-700 ring-1 ring-cyan-100">
                  视频：{runtimeSettings?.materialLibrary.categoryDirectories.video || "-"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                <Puzzle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">④ MCP / 连接器执行底座摘要</h2>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">`接口与连接器配置` 负责管理接入，这里负责看这些连接在运行时落到哪里、有没有可执行底座。</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-[11px] text-slate-500">MCP 地址</div>
                <div className="mt-1 break-all font-mono text-[12px] text-slate-900">{installWorkspace?.mcpUrl || "读取中"}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-[11px] text-slate-500">品牌安装令牌状态</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {installWorkspace?.activeToken ? `${installWorkspace.activeToken.status} · ${installWorkspace.activeToken.tokenPreview}` : "未生成"}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-[11px] text-slate-500">Skill 安装方式</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {installWorkspace?.skillInstall?.statusLabel || "读取中"} · {installWorkspace?.skillInstall?.installTarget || "WorkBuddy / Cursor / Codex"}
                </div>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
                当前这一页先回答“底座能不能跑”，不重复承担令牌轮换、第三方平台 Key 维护等操作；这些仍在 `③ 接口与连接器配置` 中维护。
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
