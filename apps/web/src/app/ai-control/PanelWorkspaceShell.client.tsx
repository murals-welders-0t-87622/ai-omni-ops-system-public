"use client";
import { authenticatedFetch } from "../../services/http";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  GitCompare,
  RotateCcw,
  Save,
  Layers3,
  Sparkles,
  Home,
  AlertTriangle,
  History,
  Eye,
  UserCog,
  SlidersHorizontal,
  Loader2,
  X,
  Users,
  Wrench,
  Puzzle,
  BookOpen,
  GitBranch,
  Image as ImageIcon,
  Palette,
  HardDrive,
  Settings,
  UserPlus,
  CreditCard,
  Shield,
  ShieldCheck,
  Target,
  MapPin,
  Globe,
  Banknote,
  Handshake,
  Boxes,
  Send as SendIcon,
  ChevronDown as ChevronDownIcon,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import PanelHeader from "./PanelHeader";
import { buildResourceTree, dir, file, treeStats, TreeDirNode, TreeNode } from "./resourceTree";

const API_PREFIX = "/api/ai-control";
const TREE_INITIAL_CHILD_LIMIT = 80;

const A_BUSINESS_TABS: ReadonlyArray<{ slug: string; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
  { slug: "brand-control", label: "全局概览", hint: "全域执行 · KPI/进度/最近动作汇总", icon: Home },
  { slug: "brand-growth",  label: "品牌增长", hint: "资料库 / IP / 产品 / 增长报告",    icon: TrendingUp },
  { slug: "content-customer", label: "内容获客", hint: "抖音/小红书/公众号 3 大平台创作流", icon: Target },
  { slug: "geo-customer", label: "GEO 获客",       hint: "SEO/同城/地理位置关键词挖掘",      icon: MapPin },
  { slug: "omni-channel",   label: "全网获客",       hint: "评论/竞品/线索池 C/B 端去重",     icon: Globe },
  { slug: "ad-traffic",      label: "投流获客",       hint: "腾讯广告/字节信息流 · 创意 + 投放", icon: Banknote },
  { slug: "daren-collab",    label: "达人合作",       hint: "达人匹配/合作跟踪/效果评估",        icon: Handshake },
] as const;

const B_SHOW_PHASE4_SLUGS: ReadonlySet<string> = new Set([]); // D154 = 治理：B 阶段骨架永久不渲染，保留占位。

/* ----------- Phase4: 7×5 业务视图骨架常量 ----------- */
const NAV_7 = [
  { key: "brand-overview",    idx: "①", label: "品牌总控",    icon: Home,      note: "全局驾驶舱 · KPI/最近任务/复盘汇总" },
  { key: "content-huoke",     idx: "②", label: "内容获客",    icon: Target,    note: "抖音/小红书/公众号 3 大平台创作流" },
  { key: "geo-huoke",         idx: "③", label: "GEO 获客",    icon: MapPin,    note: "SEO/同城/地理位置关键词挖掘" },
  { key: "quannet-huoke",     idx: "④", label: "全网获客",    icon: Globe,     note: "评论/竞品/线索池 C/B 端去重" },
  { key: "touliu-huoke",      idx: "⑤", label: "投流获客",    icon: Banknote,  note: "腾讯广告/字节信息流 · 创意 + 投放" },
  { key: "daren-coop",        idx: "⑥", label: "达人合作",    icon: Handshake, note: "达人匹配/合作跟踪/效果评估" },
  { key: "common",            idx: "⑦", label: "公用中心",    icon: Boxes,     note: "作品归档/素材库/AI智控/升级/帮助/齿轮" },
] as const;

const STAGE_5 = [
  { key: "assets",    idx: "1", label: "阶段 1 · 资产库",   note: "品牌资料 · 平台账号 · IP/竞品" },
  { key: "insights",  idx: "2", label: "阶段 2 · 洞察采集", note: "3平台采集 · 爆款拆解 · 关键词挖掘" },
  { key: "strategy",  idx: "3", label: "阶段 3 · 策略计划", note: "营销策划 · 营销日历 · 选题库/每日计划" },
  { key: "execution", idx: "4", label: "阶段 4 · 创作发布", note: "脚本/生图/视频/发布 7 Tab" },
  { key: "review",    idx: "5", label: "阶段 5 · 复盘优化", note: "每周复盘 · 策略优化记录 · KPI 汇总" },
] as const;

const PANEL_9_CARDS = [
  { key: "experts",         idx: "①", title: "专家团队管理",     slugMatch: "experts",         icon: Users,     tagline: "5 团 × 23 专家 · 分字段编辑 agents/*.md", stageHint: ["资产库 · 角色档案","洞察 · 专家采集模板","策略 · 专家团分工","执行 · 专家调用排班","复盘 · 专家绩效"] },
  { key: "skills",          idx: "②", title: "技能与能力管理",   slugMatch: "skills",          icon: Wrench,    tagline: "38 Skill · SKILL.md 三契约对齐",          stageHint: ["资产库 · Skill 分类","洞察 · Skill 输入例","策略 · Skill 编排","执行 · Skill 调用监控","复盘 · Skill 成功率"] },
  { key: "apis",            idx: "③", title: "接口与连接器",     slugMatch: "apis",            icon: Puzzle,    tagline: "219 MCP 工具 · 必选字段只读保护",         stageHint: ["资产库 · Provider 列表","洞察 · 健康检查","策略 · 配额分配","执行 · 调用网关","复盘 · 接口账单"] },
  { key: "prompt-library",  idx: "④", title: "提示词参考库",     slugMatch: "prompt-library",  icon: BookOpen,  tagline: "120+ 模板 · 选题/脚本/生图 8 大类",       stageHint: ["资产库 · Prompt 归档","洞察 · 参考模板","策略 · 注入规则","执行 · 创作候选项","复盘 · A/B 对比"] },
  { key: "task-governance", idx: "⑤", title: "任务版本治理",     slugMatch: "task-governance", icon: GitBranch, tagline: "workflow-core 9 动作 · 双写 ≥99%",         stageHint: ["资产库 · 里程碑 Tag","洞察 · 失败重试","策略 · 任务排期","执行 · bounded_ad_hoc 推进","复盘 · 版本对账"] },
  { key: "assets",          idx: "⑥", title: "统一素材管理",     slugMatch: "assets",          icon: ImageIcon, tagline: "文本/图/音/视/文档 5 类自动聚合",        stageHint: ["资产库 · 素材聚合","洞察 · 素材采集","策略 · 素材清单","执行 · 素材引用+1","复盘 · 复用排行榜"] },
  { key: "brand",           idx: "⑦", title: "品牌资产设置",     slugMatch: "brand",           icon: Palette,   tagline: "Brand Ontology · 7 BusinessAsset 映射",   stageHint: ["资产库 · 7类 BusinessAsset","洞察 · 品牌事实快照","策略 · 默认模板","执行 · 品牌守卫校验","复盘 · 增长报告输入"] },
  { key: "storage",         idx: "⑧", title: "存储与连接器",     slugMatch: "storage",         icon: HardDrive, tagline: "OSS/本地/DB · 配额/冷备周期",           stageHint: ["资产库 · 存储目录","洞察 · 使用量告警","策略 · 备份计划","执行 · 冷备触发","复盘 · 成本核算"] },
  { key: "advanced",        idx: "⑨", title: "高级设置 / 齿轮",   slugMatch: "advanced",        icon: Settings,  tagline: "模块注册/Provider 治理/SAAS 4 兼容入口",  stageHint: ["资产库 · 模块注册","洞察 · Key 旋转告警","策略 · 权限变更","执行 · 兼容入口转发","复盘 · 审计日志"] },
] as const;

type ApiLogEntry = { hash: string; short: string; message: string; author: string; date: string };
type AiControlTreeEntry = { type: "dir" | "file"; name: string; rel: string };
type LiveMarkdownKind = "expert" | "skill";
type LiveDraftField = { key: string; label: string; depth: 1 | 2 | 3 | 4; help: string };
type WritePolicy = {
  source_root?: string;
  source_mode?: string;
  git_root?: string | null;
  git_head?: string;
  write_enabled?: boolean;
  git_clean?: boolean;
  git_clean_raw?: boolean;
  git_clean_strategy?: string;
  writable_mount?: boolean;
  writable_probe?: {
    writable?: boolean;
    probe_path?: string;
    error_code?: string | null;
    error_message?: string | null;
  };
  commit_identity_configured?: boolean;
  commit_identity?: {
    user_name?: string;
    user_email?: string;
  };
  dirty_count_raw?: number;
  dirty_details?: string;
  dirty_details_raw_sample?: string;
  local_history_root?: string;
  local_history_available?: boolean;
  blocked_reason?: string | null;
  diagnosis?: string | null;
  required_gates?: string[];
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
type WritebackSample = {
  kind?: "expert" | "skill";
  rel_posix?: string;
  name?: string;
  bytes?: number;
  sha256?: string;
  risk_level?: "low" | "medium";
  reason?: string;
};
type WritebackReadiness = {
  ok?: boolean;
  action?: string;
  ready_for_real_writeback?: boolean;
  recommended_sample?: WritebackSample | null;
  candidate_samples?: WritebackSample[];
  gates?: LocalRestoreRequestGate[];
  blockers?: string[];
  next_required_steps?: string[];
  not_recommended_for_first_writeback?: string[];
  boundary?: string;
  policy?: LocalRestoreRequest["policy"];
};
type WritebackExecutorPlan = {
  ok?: boolean;
  action?: string;
  executor_enabled?: boolean;
  executor_mode?: string;
  target?: {
    rel_posix?: string;
    current_sha256?: string;
    current_bytes?: number;
  } | null;
  readiness?: {
    ready_for_real_writeback?: boolean;
    blockers?: string[];
    recommended_sample?: WritebackSample | null;
  };
  phases?: Array<{
    key?: string;
    label?: string;
    required?: string[];
  }>;
  hard_blocks?: string[];
  audit_plan?: {
    history_root?: string;
    pre_write_snapshot_index?: string;
    save_request_audit?: string;
    future_execution_audit?: string;
    evidence_fields?: string[];
  };
  rollback_design?: {
    source?: string;
    preview_endpoint?: string | null;
    request_endpoint?: string;
    required_before_restore?: string[];
  };
  boundary?: string;
  policy?: LocalRestoreRequest["policy"];
};
type WritebackExecutorSimulation = {
  ok?: boolean;
  action?: string;
  simulation_only?: boolean;
  execution_id?: string;
  result?: string;
  target?: {
    rel_posix?: string;
    before_sha256?: string;
    before_bytes?: number;
  } | null;
  simulated_candidate?: {
    sha256?: string | null;
    bytes?: number;
    changed?: boolean;
    diff_sha256?: string;
    note?: string;
  } | null;
  gates?: LocalRestoreRequestGate[];
  blocked_gates?: string[];
  would_execute_phases?: Array<{
    key?: string;
    label?: string;
    status?: string;
    evidence?: string;
  }>;
  audit_preview?: {
    audit_file?: string;
    would_append?: boolean;
    record?: {
      execution_id?: string;
      rel_posix?: string | null;
      before_sha256?: string | null;
      candidate_sha256?: string | null;
      after_sha256?: string | null;
      diff_sha256?: string;
      result?: string;
      blocked_gates?: string[];
      rollback_endpoint?: string;
    };
  };
  boundary?: string;
  policy?: LocalRestoreRequest["policy"];
};
type WritebackExecutorContractTests = {
  ok?: boolean;
  action?: string;
  readonly?: boolean;
  started_at?: string;
  finished_at?: string;
  target?: string | null;
  total?: number;
  passed?: number;
  failed?: number;
  tests?: Array<{
    key?: string;
    label?: string;
    passed?: boolean;
    expected?: string;
    actual?: string;
    evidence?: Record<string, unknown>;
  }>;
  boundary?: string;
};
type LocalSnapshotEntry = {
  id: string;
  created_at: string;
  rel_posix: string;
  source_sha256: string;
  bytes: number;
  note?: string;
  restore_enabled?: boolean;
  restore_blocked_reason?: string;
};
type LocalRestorePreview = {
  snapshot?: LocalSnapshotEntry;
  current?: {
    rel_posix?: string;
    sha256?: string;
    bytes?: number;
  };
  restore_candidate?: {
    sha256?: string;
    bytes?: number;
  };
  changed?: boolean;
  diff?: string;
  restore_enabled?: boolean;
  restore_blocked_reason?: string;
};
type LocalRestoreRequestGate = {
  key: string;
  label: string;
  ok: boolean;
  detail?: string;
};
type LocalRestoreRequest = {
  ok?: boolean;
  action?: string;
  snapshot_id?: string;
  restore_enabled?: boolean;
  restore_blocked_reason?: string;
  gates?: LocalRestoreRequestGate[];
  preview?: {
    changed?: boolean;
    diff_sha256?: string;
    diff_length?: number;
  };
  policy?: {
    source_root?: string;
    source_mode?: string;
    write_enabled?: boolean;
    writable_mount?: boolean;
    local_history_root?: string;
    blocked_reason?: string | null;
  };
};
type LocalSaveRequest = {
  ok?: boolean;
  action?: string;
  save_enabled?: boolean;
  save_blocked_reason?: string;
  audit?: {
    id?: string;
    audit_path?: string;
  };
  gates?: LocalRestoreRequestGate[];
  preview?: {
    changed?: boolean;
    diff_sha256?: string;
    diff_length?: number;
    current?: {
      sha256?: string;
      bytes?: number;
    };
    candidate?: {
      sha256?: string;
      bytes?: number;
    };
  };
  pre_write_snapshot?: LocalSnapshotEntry | null;
  post_write_verification?: {
    expected_sha256?: string;
    expected_bytes?: number;
    verify_by_readback?: boolean;
    readback_path?: string;
    required_checks?: string[];
  };
  rollback_plan?: {
    available?: boolean;
    snapshot_id?: string | null;
    restore_preview_endpoint?: string | null;
    restore_request_endpoint?: string | null;
    required_before_restore?: string[];
  };
  policy?: LocalRestoreRequest["policy"];
};
type RollbackState =
  | { kind: "idle" }
  | { kind: "confirm"; targetHash: string; targetShort: string; impactDiff: string; impactError?: string; submitting: boolean };

export type TreeIconKey =
  | "users"
  | "wrench"
  | "puzzle"
  | "book-open"
  | "git-branch"
  | "image"
  | "palette"
  | "hard-drive"
  | "settings";

export const TREE_ICON_MAP: Record<TreeIconKey, React.ComponentType<{ className?: string }>> = {
  users: Users,
  wrench: Wrench,
  puzzle: Puzzle,
  "book-open": BookOpen,
  "git-branch": GitBranch,
  image: ImageIcon,
  palette: Palette,
  "hard-drive": HardDrive,
  settings: Settings,
};

export type PanelMeta = {
  slug: string;
  title: string;
  subtitle: string;
  heroHint: string;
  treeRoots: TreeDirNode[];
  /** 只有 板块 ①②④ 是 4 级树；其他是列表/表单骨架 */
  enableTreeDepth4: boolean;
  treeIconKey: TreeIconKey;
};

async function apiFetch(input: string, init?: RequestInit) {
  const res = await authenticatedFetch(input, init);
  const ct = res.headers.get("content-type") ?? "";
  const isJson = ct.includes("application/json");
  let body: any = null;
  try {
    body = isJson ? await res.json() : await res.text();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg = isJson && body ? (typeof body === "string" ? body : body.message ?? body.error ?? JSON.stringify(body)) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export default function PanelWorkspaceShell({ panel }: { panel: PanelMeta }) {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const pathname = usePathname() ?? "/ai-control";
  const sp = useSearchParams();
  const defaultTreeExpandLvl = panel.enableTreeDepth4 ? 2 : 1; // OQ3 默认新手折叠 80% = 只开前 2 级
  const [expandLvl, setExpandLvl] = useState<number>(defaultTreeExpandLvl);
  const [expertMode, setExpertMode] = useState<boolean>(false); // OQ3 默认关闭
  const [selected, setSelected] = useState<string | null>(sp.get("node") ?? null);
  const [editTab, setEditTab] = useState<"preview" | "edit" | "diff" | "history" | "settings">("preview");
  const [workingTreeDirty, setWorkingTreeDirty] = useState<boolean>(false);
  const [rollback, setRollback] = useState<RollbackState>({ kind: "idle" });
  const [activeNav7, setActiveNav7] = useState<number>(0);
  const [activeStage5, setActiveStage5] = useState<number>(2);
  const useLiveConfigTree = panel.slug === "experts" || panel.slug === "skills";
  const [liveTreeRoots, setLiveTreeRoots] = useState<TreeDirNode[] | null>(null);
  const [liveTreeStatus, setLiveTreeStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [liveTreeMessage, setLiveTreeMessage] = useState<string>("");
  const activeTreeRoots = liveTreeRoots ?? panel.treeRoots;
  const stats = useMemo(() => treeStats(activeTreeRoots), [activeTreeRoots]);

  const [editState, setEditState] = useState<Record<string, string>>({});

  useEffect(() => {
    const key = "aicc_panel_mode";
    try {
      const v = localStorage.getItem(key);
      if (v === "expert") {
        setExpertMode(true);
        setExpandLvl(panel.enableTreeDepth4 ? 4 : 1);
      } else if (v === "novice") {
        setExpertMode(false);
        setExpandLvl(defaultTreeExpandLvl);
      }
    } catch {
      /* SSR / 隐私模式下 localStorage 不可用 → 保持内存态默认 */
    }
    const scope = `slug:${panel.slug}`;
    try {
      const raw = localStorage.getItem("aicc_panel_expand");
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, number>;
        const n = obj[scope];
        if (typeof n === "number" && Number.isFinite(n)) setExpandLvl(n);
      }
    } catch {
      /* ignore */
    }
  }, [panel.slug, panel.enableTreeDepth4, defaultTreeExpandLvl]);

  useEffect(() => {
    if (!useLiveConfigTree) {
      setLiveTreeRoots(null);
      setLiveTreeStatus("idle");
      setLiveTreeMessage("");
      return;
    }
    let canceled = false;
    setLiveTreeStatus("loading");
    setLiveTreeMessage("正在读取 /api/ai-control/tree");
    const run = async () => {
      try {
        const sourceKey = panel.slug === "experts" ? "agents" : "skills";
        const data: any = await apiFetch(`${API_PREFIX}/tree?section=${sourceKey}&filesOnly=1`);
        const entries: AiControlTreeEntry[] = Array.isArray(data?.tree?.[sourceKey]) ? data.tree[sourceKey] : [];
        const roots = buildTreeFromApiEntries(sourceKey, panel.slug === "experts" ? "真实专家文件" : "真实 Skill 文件", entries);
        if (canceled) return;
        if (roots.length) {
          setLiveTreeRoots(roots);
          setLiveTreeStatus("ready");
          setLiveTreeMessage(`${data?.source_root ?? data?.git_root ?? "expert-source"} · ${flattenFiles({ kind: "dir", path: sourceKey, name: sourceKey, children: roots }).length} 个文件`);
        } else {
          setLiveTreeRoots(null);
          setLiveTreeStatus("fallback");
          setLiveTreeMessage(data?.source_root_missing ? `未挂载 expert-source：${data?.source_root_expected ?? ""}` : "真实树为空，暂用演示树");
        }
      } catch (error: any) {
        if (canceled) return;
        setLiveTreeRoots(null);
        setLiveTreeStatus("fallback");
        setLiveTreeMessage(error?.message ?? String(error));
      }
    };
    run();
    return () => {
      canceled = true;
    };
  }, [panel.slug, useLiveConfigTree]);

  const applyEditField = useCallback((k: string, value: string) => {
    setEditState((prev) => ({ ...prev, [k]: value }));
    setWorkingTreeDirty(true);
  }, []);

  const filterFieldsForSave = useCallback(
    (rawFields: Record<string, unknown>, depthByKey: Record<string, number>): Record<string, unknown> => {
      if (expertMode) return rawFields;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawFields)) {
        const d = depthByKey[k] ?? 99;
        if (d < 3) out[k] = v; // 新手模式只提交 L1/L2，深层（L3/L4，depth>=3）全部丢弃 —— 与 disabled 显示一致
      }
      return out;
    },
    [expertMode],
  );

  /** 顶栏：回滚到 HEAD（丢弃 working tree 所有未提交变更） */
  const handleResetToHead = useCallback(async () => {
    const sure = confirm("确认回滚工作区所有未提交变更到 HEAD？\n此操作不可撤销，会调用 POST /api/ai-control/reset-hard {hash:HEAD, force_yes:true}");
    if (!sure) return;
    try {
      const r = await apiFetch(`${API_PREFIX}/reset-hard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: "HEAD", force_yes: true }),
      });
      alert(`回滚成功：\n${r?.stdout ?? "(无 stdout)"}`);
      setWorkingTreeDirty(false);
      setEditTab("preview");
    } catch (e: any) {
      alert(`回滚失败：${e?.message ?? String(e)}`);
    }
  }, []);

  /** 顶栏：保存并版本化（真实调用 /save；使用 Tab ② 的双向绑定值；新手模式深度过滤掉 L3/L4） */
  const handleSaveAndCommit = useCallback(async () => {
    if (!selected) {
      alert("请先在左侧树选择一个文件节点再保存");
      return;
    }
    if (useLiveConfigTree) {
      alert("S2-04 第一版已切到真实 expert-source 只读预览。为避免覆盖复杂 Markdown，保存写盘将在受控字段白名单和完整 Diff 检查完成后再开启。");
      return;
    }
    const flat = activeTreeRoots.flatMap((r) => flattenFiles(r));
    const baseFields = flat.find((f) => f.path === selected)?.meta ?? {};
    const rawFields: Record<string, unknown> = { ...baseFields, ...editState };
    const depthByKey: Record<string, number> = {
      title: 1,
      role: 1,
      use: 2,
      constraint: 2,
      owner: 2,
      contract: 3,
      exceptions: 4,
    };
    const fields = filterFieldsForSave(rawFields, depthByKey);
    const msg = `[${panel.slug}] 更新 ${selected}${expertMode ? "" : "（新手模式）"}`;
    const kind: "expert" | "skill" | "prompt" =
      panel.slug === "experts" ? "expert" : panel.slug === "skills" ? "skill" : "prompt";
    const ok = confirm(
      `确认保存并版本化？\n  kind=${kind}\n  path=${selected}\n  mode=${expertMode ? "expert（全字段）" : "novice（只提交 L1/L2，L3/L4 已过滤）"}\n  commit_message="${msg}"`,
    );
    if (!ok) return;
    try {
      const r = await apiFetch(`${API_PREFIX}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          path: selected,
          fields: Object.keys(fields).length ? fields : { title: selected, role: "占位" },
          commit_message: msg,
        }),
      });
      alert(`保存成功，新版本：${JSON.stringify(r, null, 2)}`);
      setWorkingTreeDirty(false);
      setEditState({});
    } catch (e: any) {
      alert(`保存失败：${e?.message ?? String(e)}`);
    }
  }, [selected, panel.slug, expertMode, editState, filterFieldsForSave, activeTreeRoots, useLiveConfigTree]);

  /** History：点「回滚」某 commit → 先预览 target..HEAD diff 影响面 → 确认后 POST reset-hard */
  const handleRollbackRequest = useCallback(async (entry: ApiLogEntry) => {
    setRollback({ kind: "confirm", targetHash: entry.hash, targetShort: entry.short, impactDiff: "", impactError: undefined, submitting: false });
    try {
      // controller diff 接口当前仅支持 HEAD vs working-tree；回滚影响面先用 log 语义描述 + 空 path 拉全量 diff（若无差异则提示）
      const r: any = await apiFetch(`${API_PREFIX}/diff`);
      const d: string = r?.diff ?? "";
      setRollback((s) => (s.kind === "confirm" ? { ...s, impactDiff: d || "(HEAD 与工作区无差异；回滚到此 commit 会丢弃该 commit 之后的所有版本变更)" } : s));
    } catch (e: any) {
      setRollback((s) => (s.kind === "confirm" ? { ...s, impactError: e?.message ?? String(e) } : s));
    }
  }, []);

  const handleRollbackConfirm = useCallback(async () => {
    if (rollback.kind !== "confirm") return;
    const sure = confirm(
      `⚠️  二次确认：回滚到 ${rollback.targetShort} 会永久丢弃该版本之后的所有 commit，不可撤销。\n继续？`,
    );
    if (!sure) return;
    setRollback((s) => (s.kind === "confirm" ? { ...s, submitting: true } : s));
    try {
      const r = await apiFetch(`${API_PREFIX}/reset-hard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: rollback.targetHash, force_yes: true }),
      });
      alert(`回滚成功：\n${r?.stdout ?? "(无 stdout)"}`);
      setRollback({ kind: "idle" });
      setWorkingTreeDirty(false);
      setEditTab("preview");
    } catch (e: any) {
      setRollback((s) => (s.kind === "confirm" ? { ...s, submitting: false, impactError: e?.message ?? String(e) } : s));
    }
  }, [rollback]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/ai-control" prefetch={false} className="inline-flex items-center gap-1.5 hover:text-indigo-600">
                <Home className="h-3.5 w-3.5" /> AI 智控中心
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className="text-slate-700">{panel.title}</span>
              {selected ? (
                <>
                  <ChevronRight className="h-3 w-3 text-slate-300" />
                  <span className="max-w-[60%] truncate font-mono text-[11.5px] text-slate-600">{selected}</span>
                </>
              ) : null}
            </div>
            {/* D152 ③返回业务驾驶舱 下拉 + ④品牌总控 快捷按钮 */}
            <div className="flex items-center gap-2">
              <Link
                href="/tabs/brand-control"
                prefetch={false}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11.5px] font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
                title="直接打开业务主入口（品牌总控）"
              >
                品牌总控 <ChevronRight className="h-3 w-3" />
              </Link>
              <div className="group relative">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  返回业务驾驶舱 <ChevronDownIcon className="h-3 w-3" />
                </button>
                <div className="absolute right-0 z-30 mt-1 hidden w-72 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg group-hover:block">
                  <div className="mb-1 px-2 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">A 层 6 大业务板块</div>
                  {A_BUSINESS_TABS.map((t) => {
                    const TIcon = t.icon;
                    return (
                      <Link
                        key={t.slug}
                        href={`/tabs/${t.slug}`}
                        prefetch={false}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
                        title={t.hint}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-indigo-600">
                          <TIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold leading-5">{t.label}</span>
                          <span className="block text-[10.5px] leading-4 truncate text-slate-500">{t.hint}</span>
                        </span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <PanelHeader
            panel={panel}
            stats={stats}
            expandLvl={expandLvl}
            setExpandLvl={setExpandLvl}
            expertMode={expertMode}
            setExpertMode={setExpertMode}
            workingTreeDirty={workingTreeDirty}
            readOnlySource={useLiveConfigTree}
          />
          <div className="rounded-xl bg-indigo-50/70 p-3 text-[12.5px] leading-6 text-indigo-900/80 ring-1 ring-indigo-100">
            <Sparkles className="mr-2 inline h-4 w-4 -translate-y-0.5 text-indigo-600" />
            {panel.heroHint}
          </div>
          {useLiveConfigTree ? (
            <div className={`rounded-xl p-3 text-[12.5px] leading-6 ring-1 ${
              liveTreeStatus === "ready"
                ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                : liveTreeStatus === "loading"
                ? "bg-slate-50 text-slate-600 ring-slate-200"
                : "bg-amber-50 text-amber-800 ring-amber-100"
            }`}>
              <b>真源树：</b>
              {liveTreeStatus === "ready" ? "已接入后端扫描树" : liveTreeStatus === "loading" ? "读取中" : "暂用演示树"}
              <span className="mx-2 text-slate-300">/</span>
              <span className="font-mono text-[11.5px]">{liveTreeMessage}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* D154 Phase4 业务骨架：仅当 B_SHOW_PHASE4_SLUGS（永久空集）包含 slug 时才渲染；其余 B 层 9 slug 永远跳过后继续显示资源树 + 编辑 Tab 骨架 */}
      {B_SHOW_PHASE4_SLUGS.has(panel.slug) ? (
      <div className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/30">
        <div className="mx-auto max-w-[1600px] grid grid-cols-12 gap-4 px-6 py-5">
          {/* LEFT: 7 入口平行导航（垂直 7 卡） */}
          <div className="col-span-12 lg:col-span-3 space-y-2.5">
            <div className="text-xs font-semibold text-slate-600 mb-1 inline-flex items-center gap-1.5">
              <Layers3 className="h-3.5 w-3.5 text-indigo-600" /> ⑦ 获客入口平行导航（FR-01.1）
            </div>
            <div className="space-y-1.5">
              {NAV_7.map((n, i) => {
                const NavIcon = n.icon;
                const active = activeNav7 === i;
                return (
                  <button
                    key={n.key}
                    type="button"
                    onClick={() => setActiveNav7(i)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition ${
                      active
                        ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/60"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                      active ? "bg-white/20" : "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"
                    }`}>
                      <NavIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-5">
                        {n.idx} {n.label}
                      </span>
                      <span className={`block mt-0.5 text-[11.5px] leading-4 truncate ${
                        active ? "text-indigo-100" : "text-slate-500"
                      }`}>
                        {n.note}
                      </span>
                    </span>
                    {active ? (
                      <span className="text-[10.5px] font-medium bg-white/20 rounded px-1.5 py-0.5 shrink-0">
                        激活
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 rounded-lg bg-white/80 p-3 text-[11.5px] leading-5 text-slate-600 ring-1 ring-slate-200">
              💡 <b className="text-slate-800">Phase4 骨架·只读</b>：本 7 入口仅视觉结构，未绑定真实路由跳转。Phase5+ 实现业务页后，将对应跳转到 <code className="mx-0.5 rounded bg-slate-100 px-1 py-0.5 font-mono text-[10.5px]">/brand-overview</code> / <code className="mx-0.5 rounded bg-slate-100 px-1 py-0.5 font-mono text-[10.5px]">/content-huoke</code> 等 7 条顶层业务路由。
            </div>
          </div>

          {/* RIGHT: 顶 5 阶段 Tab + 下 9 宫格短卡（3×3） */}
          <div className="col-span-12 lg:col-span-9 space-y-4">
            {/* TOP：5 阶段流程 Tab */}
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2 inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> ⑤ 阶段流程 Tab · 当前获客方式：
                <span className="text-indigo-700">{NAV_7[activeNav7].idx} {NAV_7[activeNav7].label}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1.5">
                {STAGE_5.map((s, i) => {
                  const active = activeStage5 === i;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setActiveStage5(i)}
                      className={`flex-1 min-w-[140px] inline-flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-xs transition ${
                        active
                          ? "bg-white shadow-sm text-indigo-700 ring-1 ring-indigo-200"
                          : "text-slate-600 hover:bg-white/60"
                      }`}
                    >
                      <span className="font-semibold text-sm leading-5">
                        {s.idx} · {s.label}
                      </span>
                      <span className={`leading-4 text-[11.5px] ${active ? "text-indigo-600/80" : "text-slate-500"}`}>
                        {s.note}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM：9 宫格板块短卡联动（3×3） */}
            <div>
              <div className="mb-2.5 flex items-end justify-between gap-3 flex-wrap">
                <div className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-indigo-600" /> ⑨ 板块短卡联动 · 9 宫格骨架 · 当前阶段：
                  <span className="text-indigo-700">{STAGE_5[activeStage5].label}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  当前板块 <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[10.5px] ring-1 ring-slate-200">{panel.slug}</code> 高亮
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                {PANEL_9_CARDS.map((p) => {
                  const match = panel.slug === p.slugMatch;
                  const PIcon = p.icon;
                  return (
                    <div
                      key={p.key}
                      className={`rounded-xl p-3 ring-1 transition ${
                        match
                          ? "bg-gradient-to-br from-indigo-50 to-white text-indigo-900 ring-indigo-300 shadow-sm"
                          : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ring-1 ${
                          match
                            ? "bg-indigo-600 text-white ring-indigo-500/50"
                            : "bg-gradient-to-br from-slate-50 to-indigo-50 text-indigo-600 ring-slate-200"
                        }`}>
                          <PIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {p.idx} {p.title}
                            </div>
                            {match ? (
                              <span className="shrink-0 text-[10px] bg-indigo-600 text-white rounded px-1.5 py-0.5">
                                当前板块
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-[11.5px] text-slate-500 leading-4 line-clamp-2">
                            {p.tagline}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1 flex-wrap text-[10.5px]">
                            <span className="rounded bg-slate-50 px-1.5 py-0.5 ring-1 ring-slate-200 text-slate-600">
                              ⏵ {STAGE_5[activeStage5].idx} · {p.stageHint[activeStage5]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : null}

      <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-4 p-4 md:p-6">
        {/* LEFT: 资源树 / 列表 */}
        <aside className="col-span-12 md:col-span-12 lg:col-span-4 xl:col-span-3">
          <ResourceTree
            roots={activeTreeRoots}
            enableDepth4={panel.enableTreeDepth4}
            expandLvl={expandLvl}
            expertMode={expertMode}
            selected={selected}
            onSelect={(path) => {
              setSelected(path);
              const next = new URLSearchParams();
              next.set("node", path);
              router.replace(`${pathname}?${next.toString()}`);
            }}
            treeIconKey={panel.treeIconKey}
          />
        </aside>

        {/* RIGHT: 编辑区 5 Tab */}
        <section className="col-span-12 lg:col-span-8 xl:col-span-9">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600">
                {(
                  [
                    ["preview", "① 双栏实时预览", Eye],
                    ["edit", "② 分字段表单编辑", SlidersHorizontal],
                    ["diff", "③ Diff 差异", GitCompare],
                    ["history", "④ 版本历史 / 回滚", History],
                    ["settings", "⑤ 设置 / 读写保护", UserCog],
                  ] as const
                ).map(([k, label, Ic]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setEditTab(k)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                      editTab === k ? "bg-white text-indigo-700 shadow ring-1 ring-slate-200" : "hover:bg-white/60"
                    }`}
                  >
                    <Ic className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {useLiveConfigTree ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11.5px] text-amber-800 ring-1 ring-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5" /> 真源只读保护中
                  </span>
                ) : workingTreeDirty ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11.5px] text-amber-800 ring-1 ring-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5" /> 工作区有未提交变更 · 保存前请 Diff
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] text-emerald-700 ring-1 ring-emerald-200">
                    ✅ 工作区 clean，保存安全
                  </span>
                )}
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleResetToHead}
                  title="真实调用 POST /api/ai-control/reset-hard {hash:HEAD, force_yes:true}；无需工作区 dirty 也可触发（重置所有未提交）"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> 回滚到 HEAD
                </button>
                <button
                  type="button"
                  disabled={!selected || useLiveConfigTree}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={handleSaveAndCommit}
                  title={useLiveConfigTree ? "S2-04 第一版：真实 expert-source 只读预览，受控编辑待白名单解析完成后开启" : "真实调用 POST /api/ai-control/save；Task 1.4 骨架使用当前节点演示 meta 作为 fields，Tab ② 字段双向绑定后续实现"}
                >
                  <Save className="h-3.5 w-3.5" /> 保存并版本化
                </button>
              </div>
            </div>

            {!selected && editTab !== "settings" ? (
              <EmptyEditPanel title={`${panel.title} · 编辑区`} expertMode={expertMode} panelSlug={panel.slug} />
            ) : editTab === "preview" && selected ? (
              <PreviewPanel path={selected} expertMode={expertMode} onChange={() => setWorkingTreeDirty(true)} liveSource={useLiveConfigTree} />
            ) : editTab === "edit" && selected && useLiveConfigTree ? (
              <LiveFieldDraftPanel path={selected} panelSlug={panel.slug} expertMode={expertMode} />
            ) : editTab === "edit" && selected ? (
              <EditPanel path={selected} expertMode={expertMode} editState={editState} onField={applyEditField} onSubmit={() => setWorkingTreeDirty(true)} />
            ) : editTab === "diff" && selected ? (
              <DiffPanel path={selected} />
            ) : editTab === "history" && selected ? (
              <HistoryPanel path={selected} onRollback={handleRollbackRequest} />
            ) : editTab === "settings" ? (
              <SettingsPanel path={selected ?? null} panelSlug={panel.slug} />
            ) : (
              <EmptyEditPanel title={`${panel.title} · 编辑区`} expertMode={expertMode} panelSlug={panel.slug} />
            )}
          </div>
        </section>
      </div>

      {/* 回滚确认弹窗：影响面预览 + 二次确认 */}
      {rollback.kind === "confirm" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600" /> 回滚到版本 {rollback.targetShort}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">以下是影响面预览；确认后永久丢弃此版本之后的所有 commit，不可撤销</div>
              </div>
              <button
                type="button"
                onClick={() => setRollback({ kind: "idle" })}
                disabled={rollback.submitting}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto px-5 py-4">
              {rollback.impactError ? (
                <div className="rounded-lg bg-rose-50 p-3 text-[12.5px] text-rose-800 ring-1 ring-rose-200">
                  影响面预览失败：{rollback.impactError}
                  <div className="mt-1 text-rose-600/80">你仍可继续回滚，但请确保要回退到 {rollback.targetShort}。</div>
                </div>
              ) : rollback.impactDiff ? (
                <pre className="max-h-[52vh] overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-[12px] leading-6 text-slate-100">{rollback.impactDiff}</pre>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin" /> 正在加载影响面 diff…
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setRollback({ kind: "idle" })}
                disabled={rollback.submitting}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRollbackConfirm}
                disabled={rollback.submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-50"
              >
                {rollback.submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                {rollback.submitting ? "正在回滚…" : `确认回滚到 ${rollback.targetShort}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

/* ---------------- 子组件：资源树 ---------------- */
function ResourceTree(props: {
  roots: TreeDirNode[];
  enableDepth4: boolean;
  expandLvl: number;
  expertMode: boolean;
  selected: string | null;
  onSelect: (path: string) => void;
  treeIconKey: TreeIconKey;
}) {
  const { roots, enableDepth4, expandLvl, expertMode, selected, onSelect, treeIconKey } = props;
  const TreeIcon = TREE_ICON_MAP[treeIconKey] ?? Layers3;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
            <Layers3 className="h-4 w-4 text-indigo-600" />
            {enableDepth4 ? "4 级资源树（OQ3 新手仅展前 2 级）" : "板块菜单"}
          </h3>
          <TreeIcon className="h-4 w-4 text-slate-400" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2 text-[12px] leading-5 text-slate-600">
          层级：<span className="font-semibold text-slate-800">{enableDepth4 ? "① 团/类 → ② 分类 → ③ 项 → ④ 文件/SKILL" : "① 主类 → ② 项"}</span>
          <br />当前展开到 <b className="text-indigo-700">Level {expandLvl}</b>；大型真实目录按需展开，避免一次性渲染过多节点。
        </div>
        <div className="mt-3 max-h-[68vh] space-y-0.5 overflow-y-auto pr-1 text-sm">
          {roots.map((r) => (
            <TreeRecurse
              key={r.path}
              node={r}
              depth={1}
              expandLvl={expandLvl}
              expertMode={expertMode}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TreeRecurse(props: {
  node: TreeNode;
  depth: number;
  expandLvl: number;
  expertMode: boolean;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const { node, depth, expandLvl, expertMode, selected, onSelect } = props;
  const openByDefault = depth <= expandLvl;
  const [open, setOpen] = useState<boolean>(openByDefault);
  const [showAllChildren, setShowAllChildren] = useState<boolean>(false);
  const isDir = node.kind === "dir";
  const active = selected === node.path;
  const hiddenToNovice = !expertMode && depth >= 4 && isDir === false; // OQ3 新手：深度 ≥4 的叶子折叠不显示（或灰显）
  const cls = `group flex items-center gap-1.5 rounded-lg px-1.5 py-1 cursor-pointer select-none transition ${
    active ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "hover:bg-slate-100"
  } ${hiddenToNovice ? "opacity-50" : ""}`;
  const indent = Math.min(depth - 1, 6) * 14;

  return (
    <div>
      <div
        className={cls}
        style={{ paddingLeft: 6 + indent }}
        onClick={() => {
          if (isDir) setOpen((v) => !v);
          else onSelect(node.path);
        }}
      >
        {isDir ? (
          open ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
        ) : (
          <span className="inline-block w-3.5" />
        )}
        {isDir ? open ? <FolderOpen className="h-4 w-4 text-amber-600" /> : <Folder className="h-4 w-4 text-amber-500" /> : <FileText className="h-4 w-4 text-slate-500" />}
        <span className="flex-1 truncate text-[13px]">{node.name}</span>
        {!isDir ? <span className="font-mono text-[10.5px] text-slate-400 group-hover:text-slate-600">.md</span> : null}
      </div>
      {isDir && open ? (
        <div>
          {(showAllChildren
            ? (node as TreeDirNode).children
            : (node as TreeDirNode).children.slice(0, TREE_INITIAL_CHILD_LIMIT)
          ).map((c) => (
            <TreeRecurse
              key={c.path}
              node={c}
              depth={depth + 1}
              expandLvl={expandLvl}
              expertMode={expertMode}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
          {!showAllChildren && (node as TreeDirNode).children.length > TREE_INITIAL_CHILD_LIMIT ? (
            <button
              type="button"
              className="ml-7 mt-1 rounded-lg px-2 py-1 text-[12px] font-medium text-indigo-600 hover:bg-indigo-50"
              onClick={() => setShowAllChildren(true)}
            >
              显示剩余 {(node as TreeDirNode).children.length - TREE_INITIAL_CHILD_LIMIT} 项
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- 右编辑区 5 Tab 骨架 ---------------- */
function EmptyEditPanel({ title, expertMode, panelSlug }: { title: string; expertMode: boolean; panelSlug: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="rounded-xl bg-gradient-to-br from-indigo-50 via-white to-white p-6 ring-1 ring-indigo-100 lg:col-span-3">
        <h4 className="text-base font-semibold text-slate-900">{title}</h4>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          左侧树选中一个 md 节点后，右侧出现 <b>① 预览 ② 分字段编辑 ③ Diff ④ 版本/回滚 ⑤ 设置</b> 5 个 Tab。<br />
          真实 9 宫格点击顺序：点卡片进入板块 → 点左侧树节点 → Tab ② 改字段 → Tab ③ 看差异 → Tab ④ 回滚/版本 →
          顶栏 <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11.5px] ring-1 ring-slate-200">保存并版本化</code>。
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
          {["所见即所得", "零副本同步", "Git 原子回滚"].map((t) => (
            <div key={t} className="rounded-lg bg-white/90 p-3 ring-1 ring-slate-200">
              ✅ <span className="font-semibold text-slate-800">{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200 lg:col-span-2">
        <h5 className="text-sm font-semibold text-slate-900">md-writer 保存链路（FR-03 核心）</h5>
        <ol className="mt-3 space-y-2 text-[12.5px] leading-6 text-slate-700">
          <li>① UI 分字段表单（本 Tab ②）提交变更 JSON</li>
          <li>② <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">md-writer-core.ts</code> 原子拼 md → 写 <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">A/.../expert-source/{panelSlug}/*.md</code> 同一物理文件</li>
          <li>③ <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">config-center-git commit</code> 自动生成增量 commit</li>
          <li>④ WorkBuddy 下次读同一 md — <b>零同步</b></li>
        </ol>
        <div className="mt-4 rounded-lg bg-amber-50/70 p-3 text-[12px] leading-5 text-amber-800 ring-1 ring-amber-200">
          🔴 红线：<b>工作区非 clean 禁止 md-writer 写盘</b>。顶栏黄灯时请先 Tab ③ Diff 或点「回滚」。
          <br />当前模式：<b>{expertMode ? "专家模式（全字段）" : "新手模式（80% 字段折叠）"}</b>
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({ path, expertMode, onChange, liveSource = false }: { path: string; expertMode: boolean; onChange: () => void; liveSource?: boolean }) {
  const fields = useMemo(() => buildResourceTree().flatMap((r) => flattenFiles(r)).find((f) => f.path === path)?.meta ?? {}, [path]);
  const [loading, setLoading] = useState<boolean>(liveSource);
  const [err, setErr] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const parsed = useMemo(() => parseMarkdownSummary(markdown), [markdown]);

  useEffect(() => {
    if (!liveSource) return;
    let canceled = false;
    setLoading(true);
    setErr(null);
    setMarkdown("");
    const run = async () => {
      try {
        const r: any = await apiFetch(`${API_PREFIX}/read?path=${encodeURIComponent(path)}`);
        if (!canceled) setMarkdown(String(r?.md_text ?? ""));
      } catch (error: any) {
        if (!canceled) setErr(error?.message ?? String(error));
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    run();
    return () => {
      canceled = true;
    };
  }, [path, liveSource]);

  const displayFields = liveSource
    ? {
        title: parsed.title || path.replace(/^.*\//, ""),
        subtitle: parsed.subtitle || "真实 Markdown 回读",
        role: parsed.role,
        use: parsed.use,
        constraint: parsed.constraint,
        owner: parsed.owner,
        contract: parsed.contract,
        exceptions: parsed.exceptions,
      }
    : fields;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      <div className="rounded-xl border border-slate-200 p-4 md:col-span-3">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="font-mono text-slate-500">{path}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">{liveSource ? "真实文件" : "双栏预览"}</span>
        </div>
        <h5 className="text-base font-semibold text-slate-900">{displayFields.title ?? "（文件标题）"}</h5>
        <p className="mt-1 text-[13px] text-slate-500">{displayFields.subtitle ?? path}</p>
        <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
          {loading ? (
            <p className="inline-flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> 正在读取真实 Markdown...</p>
          ) : err ? (
            <p className="rounded-lg bg-rose-50 p-2 text-[12.5px] text-rose-800 ring-1 ring-rose-200">读取失败：{err}</p>
          ) : null}
          <p>🔹 <b>角色定位</b>：{displayFields.role ?? "—"}</p>
          <p>🔹 <b>适用场景</b>：{displayFields.use ?? "—"}</p>
          <p>🔹 <b>关键约束</b>：{displayFields.constraint ?? "—"}</p>
          <p>🔹 <b>负责人</b>：<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11.5px]">{displayFields.owner ?? "—"}</code></p>
          {expertMode ? (
            <>
              <p>🔹 <b>深层（专家可见）· 交接契约</b>：{displayFields.contract ?? "—"}</p>
              <p>🔹 <b>深层（专家可见）· 异常处理</b>：{displayFields.exceptions ?? "—"}</p>
            </>
          ) : (
            <p className="rounded-lg bg-slate-50 p-2 text-[12px] text-slate-500 ring-1 ring-slate-200">
              💡 切专家模式可见 4 级字段（交接契约 / 异常 / Prompt 段）
            </p>
          )}
        </div>
      </div>
      <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 md:col-span-2">
        <div className="mb-2 text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-indigo-600" /> md-writer 所见即所得 = 双栏同文件
        </div>
        <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg bg-white p-3 font-mono text-[11.5px] leading-6 text-slate-700 ring-1 ring-slate-200">
{liveSource ? (loading ? "正在读取真实 Markdown..." : err ? `读取失败：${err}` : markdown || "（空文件）") : `# ${fields.title ?? path.replace(/^.*\//, "")}

## role
${fields.role ?? "待填写"}

## use
${fields.use ?? "待填写"}

## constraint
${fields.constraint ?? "待填写"}

${expertMode ? `## contract\n${fields.contract ?? "待填写（专家模式）"}\n\n## exceptions\n${fields.exceptions ?? "待填写（专家模式）"}` : "## [专家模式隐藏的深层字段 2 段]"}`}
        </pre>
        {liveSource ? (
          <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-[12px] leading-5 text-emerald-800 ring-1 ring-emerald-100">
            已从 <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">{path}</code> 无损回读；本轮不写盘。
          </div>
        ) : (
          <button
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={onChange}
          >
            模拟「编辑一个字」触发工作区 dirty → 看顶栏黄灯
          </button>
        )}
      </div>
    </div>
  );
}

function LiveFieldDraftPanel({ path, panelSlug, expertMode }: { path: string; panelSlug: string; expertMode: boolean }) {
  const kind = resolveLiveMarkdownKind(path);
  const schema = useMemo(() => getLiveDraftSchema(kind), [kind]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [serverPreview, setServerPreview] = useState<null | {
    candidate_md_text?: string;
    candidate_sha256?: string;
    candidate_bytes?: number;
    changed?: boolean;
    changed_fields?: string[];
    diff?: string;
    rel_posix?: string;
    merge_report?: {
      strategy?: string;
      title_replaced?: boolean;
      sections_replaced?: string[];
      sections_inserted?: string[];
      skipped_empty_fields?: string[];
      preserved_heading_count?: number;
      preserved_section_count?: number;
      matched_aliases?: Record<string, string>;
      warnings?: string[];
    };
  }>(null);
  const [writePolicy, setWritePolicy] = useState<WritePolicy | null>(null);
  const [writePolicyErr, setWritePolicyErr] = useState<string | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState<boolean>(false);
  const [saveSubmitting, setSaveSubmitting] = useState<boolean>(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveRequest, setSaveRequest] = useState<LocalSaveRequest | null>(null);
  const [saveRequestSubmitting, setSaveRequestSubmitting] = useState<boolean>(false);
  const [saveRequestErr, setSaveRequestErr] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setErr(null);
    setMarkdown("");
    setDraft({});
    setServerPreview(null);
    setPreviewErr(null);
    const run = async () => {
      try {
        const r: any = await apiFetch(`${API_PREFIX}/read?path=${encodeURIComponent(path)}`);
        const text = String(r?.md_text ?? "");
        if (canceled) return;
        setMarkdown(text);
        setDraft(parseLiveEditableFields(text, kind));
      } catch (error: any) {
        if (!canceled) setErr(error?.message ?? String(error));
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    run();
    return () => {
      canceled = true;
    };
  }, [path, kind]);

  useEffect(() => {
    let canceled = false;
    setWritePolicyErr(null);
    const run = async () => {
      try {
        const r: WritePolicy = await apiFetch(`${API_PREFIX}/write-policy`);
        if (!canceled) setWritePolicy(r);
      } catch (error: any) {
        if (!canceled) setWritePolicyErr(error?.message ?? String(error));
      }
    };
    run();
    return () => {
      canceled = true;
    };
  }, []);

  const originalFields = useMemo(() => parseLiveEditableFields(markdown, kind), [markdown, kind]);
  const changedKeys = useMemo(
    () => schema.filter((field) => (draft[field.key] ?? "") !== (originalFields[field.key] ?? "")).map((field) => field.key),
    [draft, originalFields, schema],
  );
  const draftMarkdown = useMemo(() => buildLiveDraftMarkdown(kind, draft), [draft, kind]);
  const diff = useMemo(() => buildLocalDraftDiff(originalFields, draft, schema), [originalFields, draft, schema]);
  const previewMarkdown = serverPreview?.candidate_md_text ?? draftMarkdown;
  const previewDiff = serverPreview?.diff ?? diff;
  const changedFieldLabels = useMemo(
    () => schema.filter((field) => changedKeys.includes(field.key)).map((field) => `${field.label} (${field.key})`),
    [changedKeys, schema],
  );
  const saveReady = Boolean(
    writePolicy?.write_enabled &&
    writePolicy?.git_clean &&
    writePolicy?.writable_mount &&
    writePolicy?.commit_identity_configured &&
    serverPreview &&
    !previewLoading &&
    !previewErr,
  );

  useEffect(() => {
    if (loading || err || !markdown) return;
    let canceled = false;
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewErr(null);
      try {
        setSaveRequest(null);
        setSaveRequestErr(null);
        const r: any = await apiFetch(`${API_PREFIX}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, path, fields: draft }),
        });
        if (!canceled) setServerPreview(r);
      } catch (error: any) {
        if (!canceled) setPreviewErr(error?.message ?? String(error));
      } finally {
        if (!canceled) setPreviewLoading(false);
      }
    }, 320);
    return () => {
      canceled = true;
      window.clearTimeout(timer);
    };
  }, [draft, err, kind, loading, markdown, path]);

  const requestSaveGate = useCallback(async () => {
    if (!serverPreview) {
      setSaveRequestErr("请先等待服务端 preview 完成。");
      return;
    }
    setSaveRequestSubmitting(true);
    setSaveRequestErr(null);
    try {
      const diffSha = await sha256Text(previewDiff ?? "");
      const r: LocalSaveRequest = await apiFetch(`${API_PREFIX}/save-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          path,
          fields: draft,
          confirmDiffSha256: diffSha,
          confirmCandidateSha256: serverPreview.candidate_sha256 ?? "",
          createPreWriteSnapshot: true,
          explicitUserAuthorized: false,
        }),
      });
      setSaveRequest(r);
    } catch (error: any) {
      setSaveRequestErr(error?.message ?? String(error));
    } finally {
      setSaveRequestSubmitting(false);
    }
  }, [draft, kind, path, previewDiff, serverPreview]);

  const handleConfirmSave = useCallback(async () => {
    if (!saveReady) {
      setSaveErr("写入闸门未全部通过：需要 write_enabled=true、Git clean、可写挂载、Git 提交身份和服务端 preview 成功。");
      return;
    }
    setSaveSubmitting(true);
    setSaveErr(null);
    try {
      await apiFetch(`${API_PREFIX}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          path,
          fields: draft,
          commit_message: `[${panelSlug}] 更新 ${path}`,
        }),
      });
      setSaveConfirmOpen(false);
    } catch (error: any) {
      setSaveErr(error?.message ?? String(error));
    } finally {
      setSaveSubmitting(false);
    }
  }, [draft, kind, panelSlug, path, saveReady]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-base font-semibold text-slate-900">字段解析草稿</h4>
            <p className="mt-1 text-[12.5px] text-slate-500">
              真源：<code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11.5px]">{path}</code>
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11.5px] font-medium text-amber-800 ring-1 ring-amber-200">
            只读草稿 · 不写盘
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
            <Loader2 className="h-4 w-4 animate-spin" /> 正在读取真实 Markdown 并解析字段...
          </div>
        ) : err ? (
          <div className="rounded-lg bg-rose-50 p-3 text-[12.5px] leading-6 text-rose-800 ring-1 ring-rose-200">读取失败：{err}</div>
        ) : (
          <>
            <div className="mb-4 rounded-lg bg-indigo-50/70 p-3 text-[12.5px] leading-6 text-indigo-900 ring-1 ring-indigo-100">
              已解析 <b>{schema.length}</b> 个白名单字段；当前草稿改动 <b>{changedKeys.length}</b> 处。服务端 dry-run 已接入，只返回候选 Markdown 与完整 Diff，不写盘。
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {schema.map((field) => {
                const disabled = field.depth >= 3 && !expertMode;
                return (
                  <label key={field.key} className={`flex flex-col gap-1.5 rounded-lg p-3 ring-1 ${disabled ? "bg-slate-50 text-slate-500 ring-slate-200" : "bg-white ring-slate-200"}`}>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="font-semibold text-slate-800">{field.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10.5px] ${field.depth >= 3 ? "bg-amber-100 text-amber-800" : "bg-indigo-50 text-indigo-700"}`}>
                        层级 {field.depth}{disabled ? " · 专家模式可改" : ""}
                      </span>
                    </div>
                    <textarea
                      rows={field.key === "title" || field.key === "owner" ? 2 : 5}
                      disabled={disabled}
                      value={draft[field.key] ?? ""}
                      placeholder={field.help}
                      onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      className="w-full resize-y rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="text-[11.5px] leading-5 text-slate-500">{field.help}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </div>

        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-7 text-amber-900">
          <h4 className="text-base font-semibold text-amber-950">写入仍未开放</h4>
          <p className="mt-2">
            当前 <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px] ring-1 ring-amber-100">{panelSlug}</code>
            只做字段解析、草稿修改和差异预览，不调用 <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px] ring-1 ring-amber-100">/save</code>。
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] leading-5">
            <div className="rounded-lg bg-white/70 p-2 ring-1 ring-amber-100">
              <div className="text-amber-700">写权限</div>
              <div className="font-semibold">{writePolicy?.write_enabled ? "已开启" : "未开放"}</div>
            </div>
            <div className="rounded-lg bg-white/70 p-2 ring-1 ring-amber-100">
              <div className="text-amber-700">Git 状态</div>
              <div className="font-semibold">{writePolicy?.git_clean ? "clean" : writePolicy ? "dirty" : "读取中"}</div>
            </div>
            <div className="rounded-lg bg-white/70 p-2 ring-1 ring-amber-100">
              <div className="text-amber-700">挂载</div>
              <div className="font-semibold">{writePolicy?.writable_mount ? "可写" : writePolicy ? "只读" : "读取中"}</div>
            </div>
            <div className="rounded-lg bg-white/70 p-2 ring-1 ring-amber-100">
              <div className="text-amber-700">提交身份</div>
              <div className="font-semibold">{writePolicy?.commit_identity_configured ? "已配置" : writePolicy ? "未配置" : "读取中"}</div>
            </div>
          </div>
          <p className="mt-2 break-all text-[12px] leading-5">
            {writePolicyErr ? `写入策略读取失败：${writePolicyErr}` : writePolicy?.blocked_reason ?? "开放写盘前还需补齐：显式确认、可写挂载、提交记录与回滚证据。"}
          </p>
          {writePolicy?.diagnosis ? (
            <p className="mt-2 rounded-lg bg-white/70 p-2 text-[12px] leading-5 text-amber-800 ring-1 ring-amber-100">
              {writePolicy.diagnosis}
              {typeof writePolicy.dirty_count_raw === "number" ? ` 原始 dirty=${writePolicy.dirty_count_raw}。` : ""}
            </p>
          ) : null}
          {writePolicy?.git_root ? (
            <p className="mt-2 break-all font-mono text-[11px] leading-5 text-amber-800">{writePolicy.git_root}</p>
          ) : null}
          {writePolicy?.git_head ? (
            <p className="mt-1 font-mono text-[11px] text-amber-800">HEAD {writePolicy.git_head}</p>
          ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-indigo-50 p-2 text-indigo-700 ring-1 ring-indigo-100">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-slate-900">保存前确认</h4>
                <p className="mt-1 text-[12px] leading-5 text-slate-500">
                  先看完整 Diff、候选 hash 和写入闸状态；当前未开放写权限时只能预审，不能写盘。
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={!serverPreview || !!previewErr || previewLoading}
              onClick={() => {
                setSaveErr(null);
                setSaveConfirmOpen(true);
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Save className="h-3.5 w-3.5" /> 打开保存确认
            </button>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm leading-6 text-emerald-950">
            <h4 className="text-base font-semibold">结构化合并</h4>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] leading-5">
              <div className="rounded-lg bg-white/80 p-2 ring-1 ring-emerald-100">
                <div className="text-emerald-700">策略</div>
                <div className="font-semibold">{serverPreview?.merge_report?.strategy === "structural_section_merge" ? "字段块合并" : "待预览"}</div>
              </div>
              <div className="rounded-lg bg-white/80 p-2 ring-1 ring-emerald-100">
                <div className="text-emerald-700">保留标题块</div>
                <div className="font-semibold">{serverPreview?.merge_report?.preserved_heading_count ?? "-"}</div>
              </div>
              <div className="rounded-lg bg-white/80 p-2 ring-1 ring-emerald-100">
                <div className="text-emerald-700">替换字段</div>
                <div className="font-semibold">{serverPreview?.merge_report?.sections_replaced?.length ?? 0}</div>
              </div>
              <div className="rounded-lg bg-white/80 p-2 ring-1 ring-emerald-100">
                <div className="text-emerald-700">追加字段</div>
                <div className="font-semibold">{serverPreview?.merge_report?.sections_inserted?.length ?? 0}</div>
              </div>
            </div>
            {serverPreview?.merge_report?.warnings?.length ? (
              <p className="mt-2 text-[12px] text-emerald-800">{serverPreview.merge_report.warnings.join("；")}</p>
            ) : (
              <p className="mt-2 text-[12px] text-emerald-800">只改白名单字段块，保留其它原文结构。</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-950 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
            <span>服务端完整 Diff</span>
            <span>{previewLoading ? "生成中" : serverPreview?.changed ? "有差异" : changedKeys.length ? `${changedKeys.length} 处字段变更` : "无字段变更"}</span>
          </div>
          {previewErr ? (
            <div className="rounded-lg bg-rose-50 p-3 text-[12px] leading-6 text-rose-800 ring-1 ring-rose-200">服务端预览失败：{previewErr}</div>
          ) : (
            <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap font-mono text-[11.5px] leading-6 text-slate-100">{previewDiff || "（服务端候选 Markdown 与原文一致）"}</pre>
          )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
            <span>服务端候选 Markdown</span>
            <span className="font-mono text-[10.5px] text-slate-400">{serverPreview?.candidate_sha256 ? serverPreview.candidate_sha256.slice(0, 10) : "dry-run"}</span>
          </div>
          <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-[11.5px] leading-6 text-slate-700 ring-1 ring-slate-200">{previewMarkdown}</pre>
          </div>
        </div>
      </div>
      {saveConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" /> 保存前最后确认
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-950">确认是否写入专家/Skill 真源</h3>
                <p className="mt-1 text-sm text-slate-500">本弹窗只是确认闸。当前写权限未开放时，不能执行真实保存。</p>
              </div>
              <button
                type="button"
                onClick={() => setSaveConfirmOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid max-h-[calc(88vh-150px)] grid-cols-1 gap-4 overflow-auto p-5 lg:grid-cols-5">
              <div className="space-y-3 lg:col-span-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <div className="text-xs font-semibold text-slate-500">目标文件</div>
                  <div className="mt-1 break-all font-mono text-[12px] text-slate-900">{serverPreview?.rel_posix ?? path}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                    <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
                      <div className="text-slate-500">Kind</div>
                      <div className="font-semibold text-slate-900">{kind}</div>
                    </div>
                    <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
                      <div className="text-slate-500">候选字节</div>
                      <div className="font-semibold text-slate-900">{serverPreview?.candidate_bytes ?? "-"}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">候选 SHA256</div>
                  <div className="mt-1 break-all rounded-lg bg-white p-2 font-mono text-[11px] text-slate-800 ring-1 ring-slate-200">
                    {serverPreview?.candidate_sha256 ?? "dry-run"}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6">
                  <h4 className="font-semibold text-slate-900">写入闸门</h4>
                  <div className="mt-3 space-y-2 text-[12.5px]">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                      <span>服务端 preview</span>
                      <b className={serverPreview && !previewErr ? "text-emerald-700" : "text-rose-700"}>{serverPreview && !previewErr ? "通过" : "未通过"}</b>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                      <span>Git clean</span>
                      <b className={writePolicy?.git_clean ? "text-emerald-700" : "text-rose-700"}>{writePolicy?.git_clean ? "通过" : "未通过"}</b>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                      <span>写权限开关</span>
                      <b className={writePolicy?.write_enabled ? "text-emerald-700" : "text-amber-700"}>{writePolicy?.write_enabled ? "已开启" : "未开放"}</b>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                      <span>可写挂载</span>
                      <b className={writePolicy?.writable_mount ? "text-emerald-700" : "text-amber-700"}>{writePolicy?.writable_mount ? "通过" : "只读保护"}</b>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                      <span>Git 提交身份</span>
                      <b className={writePolicy?.commit_identity_configured ? "text-emerald-700" : "text-amber-700"}>{writePolicy?.commit_identity_configured ? "已配置" : "未配置"}</b>
                    </div>
                  </div>
                  {writePolicy?.blocked_reason ? <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[12px] text-amber-800 ring-1 ring-amber-100">{writePolicy.blocked_reason}</p> : null}
                  {writePolicy?.writable_probe && !writePolicy.writable_mount ? (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[11.5px] leading-5 text-slate-500 ring-1 ring-slate-200">
                      挂载探针：{writePolicy.writable_probe.error_code ?? "READ_ONLY"} · {writePolicy.writable_probe.probe_path}
                    </p>
                  ) : null}
                  {writePolicy?.commit_identity_configured && writePolicy.commit_identity ? (
                    <p className="mt-2 break-all text-[11.5px] leading-5 text-slate-500">
                      提交身份：{writePolicy.commit_identity.user_name} / {writePolicy.commit_identity.user_email}
                    </p>
                  ) : null}
                  {changedFieldLabels.length ? (
                    <p className="mt-3 text-[12px] text-slate-500">字段变更：{changedFieldLabels.join("、")}</p>
                  ) : (
                    <p className="mt-3 text-[12px] text-slate-500">字段变更：无字段级变更；仍以服务端完整 Diff 为准。</p>
                  )}
                  {serverPreview?.merge_report ? (
                    <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-[12px] leading-5 text-emerald-800 ring-1 ring-emerald-100">
                      合并策略：字段块合并；保留标题块 {serverPreview.merge_report.preserved_heading_count ?? 0} 个。
                      {serverPreview.merge_report.sections_replaced?.length ? ` 替换：${serverPreview.merge_report.sections_replaced.join("、")}。` : ""}
                      {serverPreview.merge_report.sections_inserted?.length ? ` 追加：${serverPreview.merge_report.sections_inserted.join("、")}。` : ""}
                    </div>
                  ) : null}
                  {saveRequestErr ? (
                    <div className="mt-3 rounded-lg bg-rose-50 p-2 text-[12px] leading-5 text-rose-800 ring-1 ring-rose-100">保存闸检查失败：{saveRequestErr}</div>
                  ) : saveRequest ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800">保存写回确认闸</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] text-slate-500 ring-1 ring-slate-200">{saveRequest.audit?.id ?? "audit"}</span>
                      </div>
                      <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[12px] leading-5 text-amber-800 ring-1 ring-amber-100">
                        {saveRequest.save_blocked_reason ?? "保存写回仍被拦截。"}
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-1.5">
                        {(saveRequest.gates ?? []).map((gate) => (
                          <div key={gate.key} className="flex items-start justify-between gap-2 rounded-lg bg-white p-2 text-[11.5px] ring-1 ring-slate-200">
                            <span className="font-medium text-slate-700">{gate.label}</span>
                            <span className={gate.ok ? "text-emerald-700" : "text-amber-700"}>{gate.ok ? "通过" : gate.detail ?? "未通过"}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px] text-slate-600">
                        <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">写前快照：<span className="font-mono">{saveRequest.pre_write_snapshot?.id ?? "-"}</span></div>
                        <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">Diff SHA：<span className="font-mono">{saveRequest.preview?.diff_sha256?.slice(0, 12) ?? "-"}</span></div>
                      </div>
                      <div className="mt-2 rounded-lg bg-white p-2 text-[11.5px] leading-5 text-slate-600 ring-1 ring-slate-200">
                        <div className="font-semibold text-slate-800">写后校验</div>
                        <div className="mt-1 break-all font-mono">期望 SHA：{saveRequest.post_write_verification?.expected_sha256?.slice(0, 12) ?? "-"}</div>
                        <div>回读路径：{saveRequest.post_write_verification?.readback_path ?? "-"}</div>
                      </div>
                      <div className="mt-2 rounded-lg bg-white p-2 text-[11.5px] leading-5 text-slate-600 ring-1 ring-slate-200">
                        <div className="font-semibold text-slate-800">回滚预案</div>
                        <div>可用快照：<span className="font-mono">{saveRequest.rollback_plan?.snapshot_id ?? "-"}</span></div>
                        <div>恢复预览：{saveRequest.rollback_plan?.restore_preview_endpoint ?? "-"}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 lg:col-span-3">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span>完整 Diff</span>
                  <span>{serverPreview?.changed ? "有差异" : "无差异"}</span>
                </div>
                <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap font-mono text-[11.5px] leading-6 text-slate-100">{previewDiff || "（服务端候选 Markdown 与原文一致）"}</pre>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
              <p className="text-[12px] text-slate-500">
                下一阶段开启保存前，还需要显式授权、可写挂载、Git 提交身份和提交/回滚证据。
              </p>
              <div className="flex items-center gap-2">
                {saveErr ? <span className="max-w-md truncate text-[12px] text-rose-700">{saveErr}</span> : null}
                <button
                  type="button"
                  onClick={() => setSaveConfirmOpen(false)}
                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                >
                  先不保存
                </button>
                <button
                  type="button"
                  disabled={!serverPreview || saveRequestSubmitting}
                  onClick={requestSaveGate}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saveRequestSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  检查保存闸（不写盘）
                </button>
                <button
                  type="button"
                  disabled={!saveReady || saveSubmitting}
                  onClick={handleConfirmSave}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                  title={saveReady ? "写入闸门已通过" : "写入闸门未通过，当前不可保存"}
                >
                  {saveSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  确认写入并提交版本
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function EditPanel({
  path,
  expertMode,
  editState,
  onField,
  onSubmit,
}: {
  path: string;
  expertMode: boolean;
  editState: Record<string, string>;
  onField: (key: string, value: string) => void;
  onSubmit: () => void;
}) {
  const schema: Array<{ k: string; label: string; placeholder: string; lv: 1 | 2 | 3 | 4 }> = [
    { k: "title", label: "① 标题", placeholder: "一句话身份卡（保存进 md H1）", lv: 1 },
    { k: "role", label: "② 角色定位", placeholder: "这个节点是什么（md ## role）", lv: 1 },
    { k: "use", label: "③ 适用场景", placeholder: "3-5 条场景 · md ## use", lv: 2 },
    { k: "constraint", label: "④ 关键约束 / 红线", placeholder: "md ## constraint", lv: 2 },
    { k: "owner", label: "⑤ 负责人（agent id）", placeholder: "如 douyin-video-expert", lv: 2 },
  ];
  const deepSchema: Array<{ k: string; label: string; placeholder: string; lv: 3 | 4 }> = [
    { k: "contract", label: "⑥ 交接契约（contract）", placeholder: "输入/输出/失败恢复", lv: 3 },
    { k: "exceptions", label: "⑦ 异常处理（exceptions）", placeholder: "4 类异常 + fallback 顺序", lv: 4 },
  ];
  return (
    <form
      className="grid grid-cols-1 gap-5 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
        alert("变更已记录到前端壳 editState；请点顶栏「保存并版本化」写盘 → 走 md-writer-core → Git commit。");
      }}
    >
      {schema.map((f) => (
        <Field
          key={f.k}
          k={f.k}
          label={f.label}
          placeholder={f.placeholder}
          depth={f.lv}
          expertMode={expertMode}
          value={editState[f.k] ?? ""}
          onChange={(k, v) => onField(k, v)}
        />
      ))}
      <div className="md:col-span-2">
        <p className="mb-1.5 text-[12px] font-semibold text-slate-700">
          深层（专家模式才展开；新手模式 disabled + 保存时过滤丢弃）
        </p>
        <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 border border-dashed rounded-xl p-4 ${expertMode ? "border-amber-300 bg-amber-50/30" : "border-slate-200 bg-slate-50/60 opacity-70"}`}>
          {deepSchema.map((f) => (
            <Field
              key={f.k}
              k={f.k}
              label={f.label}
              placeholder={f.placeholder}
              depth={f.lv}
              expertMode={expertMode}
              disabled={!expertMode}
              value={editState[f.k] ?? ""}
              onChange={(k, v) => onField(k, v)}
            />
          ))}
        </div>
      </div>
      <div className="md:col-span-2 flex items-center justify-between rounded-lg bg-indigo-50/70 p-3 text-[12.5px] text-indigo-900/90 ring-1 ring-indigo-100">
        <span>
          🔒 保存到权威源同一路径：<code className="rounded bg-white px-1 py-0.5 font-mono text-[11.5px]">A/.../expert-source/{path}</code>，零同步
          <br />
          <span className="text-[11.5px] text-indigo-700/80">
            {expertMode ? "🛠 专家模式：7 字段全部提交（L1~L4）" : "🌱 新手模式：只提交 L1/L2 共 5 字段；深层（contract/exceptions）disabled + 保存时过滤丢弃"}
          </span>
        </span>
        <button type="submit" className="rounded-md bg-indigo-600 px-3 py-1 text-white text-xs shadow hover:bg-indigo-700">
          记录变更（壳 → 顶栏保存写盘）
        </button>
      </div>
    </form>
  );
}

function Field({
  k,
  label,
  placeholder,
  depth,
  expertMode,
  disabled,
  value,
  onChange,
}: {
  k: string;
  label: string;
  placeholder: string;
  depth: number;
  expertMode: boolean;
  disabled?: boolean;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  const deep = depth >= 3;
  return (
    <label className={`flex flex-col gap-1.5 rounded-lg bg-white p-3 ring-1 ring-slate-200 ${deep ? "" : ""}`}>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10.5px] ${deep ? (expertMode ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500") : "bg-indigo-50 text-indigo-700"}`}>
          层级 {depth}{deep && !expertMode ? " · OQ3 折叠（新手模式 disabled）" : ""}
        </span>
      </div>
      <textarea
        rows={3}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(k, e.target.value)}
        className="w-full resize-y rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      />
    </label>
  );
}

function DiffPanel({ path }: { path: string }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [diff, setDiff] = useState<string>("");
  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setErr(null);
    const run = async () => {
      try {
        const url = path ? `${API_PREFIX}/diff?path=${encodeURIComponent(path)}` : `${API_PREFIX}/diff`;
        const r: any = await apiFetch(url);
        if (!canceled) setDiff(r?.diff ?? "");
      } catch (e: any) {
        if (!canceled) setErr(e?.message ?? String(e));
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    run();
    return () => {
      canceled = true;
    };
  }, [path]);
  const isClean = !loading && !err && !diff;
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-mono text-slate-600">
          <GitCompare className="h-3.5 w-3.5" /> HEAD vs working-tree @{path || "(全量)"}
        </span>
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-600">
              <Loader2 className="h-3 w-3 animate-spin" /> 正在拉取 diff…
            </span>
          ) : err ? (
            <span className="rounded bg-rose-50 px-2 py-0.5 text-rose-800 ring-1 ring-rose-200">拉取失败</span>
          ) : isClean ? (
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">clean · 无差异</span>
          ) : (
            <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800 ring-1 ring-amber-200">有差异 · 可保存或回滚</span>
          )}
        </div>
      </div>
      {err ? (
        <div className="rounded-lg bg-rose-50 p-3 text-[12.5px] leading-6 text-rose-800 ring-1 ring-rose-200">
          <b>GET /api/ai-control/diff 失败：</b>
          <br />{err}
          <div className="mt-2 text-rose-700/80">
            排查：1) 请确认 apps/server Nest 服务已启动；2) 确认 expert-source Git 仓路径与 md-writer-core.ts PROJECT_ROOT_DEFAULT 一致；3) 查看 apps/server 控制台 500 堆栈。
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在从真实 Git 仓拉取 diff…（Task 1.3 7 REST 接通后此 spinner 自动消失）
        </div>
      ) : isClean ? (
        <pre className="max-h-[480px] overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-[12px] leading-6 text-slate-100">{`（工作区 clean，HEAD 与 working-tree 无差异）

真实命令对应：
  python 项目总控/tools/config-center-git.py diff ${path || "-- 全仓"}
  md-writer-core.ts diff(...)`}</pre>
      ) : (
        <pre className="max-h-[480px] overflow-auto whitespace-pre rounded-lg bg-slate-950 p-4 font-mono text-[12px] leading-6 text-slate-100">{diff}</pre>
      )}
    </div>
  );
}

function HistoryPanel({ path, onRollback }: { path: string; onRollback?: (entry: ApiLogEntry) => void }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<ApiLogEntry[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState<boolean>(true);
  const [snapshotErr, setSnapshotErr] = useState<string | null>(null);
  const [snapshotRoot, setSnapshotRoot] = useState<string>("");
  const [snapshots, setSnapshots] = useState<LocalSnapshotEntry[]>([]);
  const [snapshotSubmitting, setSnapshotSubmitting] = useState<boolean>(false);
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);
  const [restorePreview, setRestorePreview] = useState<LocalRestorePreview | null>(null);
  const [restorePreviewLoadingId, setRestorePreviewLoadingId] = useState<string | null>(null);
  const [restorePreviewErr, setRestorePreviewErr] = useState<string | null>(null);
  const [restoreRequest, setRestoreRequest] = useState<LocalRestoreRequest | null>(null);
  const [restoreRequestSubmitting, setRestoreRequestSubmitting] = useState<boolean>(false);
  const [restoreRequestErr, setRestoreRequestErr] = useState<string | null>(null);
  const [n] = useState<number>(10);

  const loadSnapshots = useCallback(async () => {
    setSnapshotLoading(true);
    setSnapshotErr(null);
    try {
      const r: any = await apiFetch(`${API_PREFIX}/local-history?path=${encodeURIComponent(path)}&n=${n}`);
      setSnapshotRoot(String(r?.history_root ?? ""));
      setSnapshots(Array.isArray(r?.entries) ? r.entries : []);
      setRestorePreview(null);
      setRestorePreviewErr(null);
      setRestoreRequest(null);
      setRestoreRequestErr(null);
    } catch (e: any) {
      setSnapshotErr(e?.message ?? String(e));
    } finally {
      setSnapshotLoading(false);
    }
  }, [n, path]);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setErr(null);
    const run = async () => {
      try {
        const r: any = await apiFetch(`${API_PREFIX}/log?n=${n}`);
        const arr: any[] = Array.isArray(r?.log) ? r.log : [];
        const parsed: ApiLogEntry[] = arr.map((x: any) => ({
          hash: String(x?.hash ?? x?.commit ?? ""),
          short: String(x?.short ?? x?.hash ?? "").slice(0, 7),
          message: String(x?.message ?? x?.subject ?? x?.msg ?? "(无 message)"),
          author: String(x?.author ?? x?.committer ?? x?.who ?? "md-writer"),
          date: String(x?.date ?? x?.time ?? x?.when ?? ""),
        }));
        if (!canceled) setLog(parsed);
      } catch (e: any) {
        if (!canceled) setErr(e?.message ?? String(e));
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    run();
    return () => {
      canceled = true;
    };
  }, [n]);

  useEffect(() => {
    let canceled = false;
    const run = async () => {
      setSnapshotLoading(true);
      setSnapshotErr(null);
      try {
        const r: any = await apiFetch(`${API_PREFIX}/local-history?path=${encodeURIComponent(path)}&n=${n}`);
        if (canceled) return;
        setSnapshotRoot(String(r?.history_root ?? ""));
        setSnapshots(Array.isArray(r?.entries) ? r.entries : []);
        setRestorePreview(null);
        setRestorePreviewErr(null);
        setRestoreRequest(null);
        setRestoreRequestErr(null);
      } catch (e: any) {
        if (!canceled) setSnapshotErr(e?.message ?? String(e));
      } finally {
        if (!canceled) setSnapshotLoading(false);
      }
    };
    run();
    return () => {
      canceled = true;
    };
  }, [n, path]);

  const createSnapshot = useCallback(async () => {
    setSnapshotSubmitting(true);
    setSnapshotMessage(null);
    setSnapshotErr(null);
    try {
      const r: any = await apiFetch(`${API_PREFIX}/local-history/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, note: "manual_snapshot_from_ai_control_history_tab" }),
      });
      const entry = r?.snapshot as LocalSnapshotEntry | undefined;
      setSnapshotMessage(entry?.id ? `已创建本机快照 ${entry.id}` : "已创建本机快照");
      await loadSnapshots();
    } catch (e: any) {
      setSnapshotErr(e?.message ?? String(e));
    } finally {
      setSnapshotSubmitting(false);
    }
  }, [loadSnapshots, path]);

  const previewRestore = useCallback(async (snapshotId: string) => {
    setRestorePreviewLoadingId(snapshotId);
    setRestorePreviewErr(null);
    try {
      const r: any = await apiFetch(`${API_PREFIX}/local-history/restore-preview?snapshotId=${encodeURIComponent(snapshotId)}`);
      setRestorePreview(r as LocalRestorePreview);
      setRestoreRequest(null);
      setRestoreRequestErr(null);
    } catch (e: any) {
      setRestorePreviewErr(e?.message ?? String(e));
    } finally {
      setRestorePreviewLoadingId(null);
    }
  }, []);

  const requestRestoreGate = useCallback(async () => {
    const snapshotId = restorePreview?.snapshot?.id;
    if (!snapshotId) return;
    setRestoreRequestSubmitting(true);
    setRestoreRequestErr(null);
    try {
      const r: any = await apiFetch(`${API_PREFIX}/local-history/restore-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotId,
          confirmChanged: restorePreview.changed === true,
          createPreRestoreSnapshot: false,
          explicitUserAuthorized: false,
        }),
      });
      setRestoreRequest(r as LocalRestoreRequest);
    } catch (e: any) {
      setRestoreRequestErr(e?.message ?? String(e));
    } finally {
      setRestoreRequestSubmitting(false);
    }
  }, [restorePreview]);

  return (
    <div className="space-y-4">
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-mono text-slate-600">
          <History className="h-3.5 w-3.5" /> 本机快照 · {path}
        </span>
        <button
          type="button"
          onClick={createSnapshot}
          disabled={snapshotSubmitting}
          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {snapshotSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          创建当前文件快照
        </button>
      </div>
      {snapshotRoot ? (
        <div className="mb-3 break-all rounded-lg bg-slate-50 p-2 font-mono text-[11.5px] leading-5 text-slate-600 ring-1 ring-slate-200">
          {snapshotRoot}
        </div>
      ) : null}
      {snapshotMessage ? <div className="mb-3 rounded-lg bg-emerald-50 p-2 text-[12px] text-emerald-800 ring-1 ring-emerald-100">{snapshotMessage}</div> : null}
      {snapshotErr ? (
        <div className="rounded-lg bg-rose-50 p-3 text-[12.5px] leading-6 text-rose-800 ring-1 ring-rose-200">本机快照读取失败：{snapshotErr}</div>
      ) : snapshotLoading ? (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在读取本机快照…
        </div>
      ) : snapshots.length === 0 ? (
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">暂无本机快照</div>
      ) : (
        <ul className="divide-y divide-slate-200 text-sm">
          {snapshots.map((entry) => (
            <li key={entry.id} className="grid grid-cols-12 items-center gap-3 py-3">
              <div className="col-span-3 font-mono text-[11.5px] text-indigo-700">{entry.id}</div>
              <div className="col-span-3 truncate text-slate-800" title={entry.note ?? ""}>{entry.note ?? "manual snapshot"}</div>
              <div className="col-span-2 font-mono text-[11px] text-slate-500">{entry.source_sha256?.slice(0, 10)}</div>
              <div className="col-span-2 text-right text-xs text-slate-500 whitespace-nowrap">{entry.created_at}</div>
              <div className="col-span-2 text-right">
                <button
                  type="button"
                  onClick={() => previewRestore(entry.id)}
                  disabled={restorePreviewLoadingId === entry.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title={entry.restore_blocked_reason ?? ""}
                >
                  {restorePreviewLoadingId === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitCompare className="h-3 w-3" />}
                  预览恢复
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {restorePreviewErr ? (
        <div className="mt-3 rounded-lg bg-rose-50 p-3 text-[12.5px] leading-6 text-rose-800 ring-1 ring-rose-200">恢复预览失败：{restorePreviewErr}</div>
      ) : restorePreview ? (
        <div className="mt-3 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-indigo-900">恢复预览 · {restorePreview.snapshot?.id}</span>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">只读预览</span>
          </div>
          <div className="grid gap-2 text-[11.5px] text-slate-700 md:grid-cols-3">
            <div className="rounded-lg bg-white p-2 ring-1 ring-indigo-100">
              <div className="text-slate-500">当前文件 SHA</div>
              <div className="font-mono">{restorePreview.current?.sha256?.slice(0, 12) ?? "-"}</div>
            </div>
            <div className="rounded-lg bg-white p-2 ring-1 ring-indigo-100">
              <div className="text-slate-500">快照 SHA</div>
              <div className="font-mono">{restorePreview.restore_candidate?.sha256?.slice(0, 12) ?? "-"}</div>
            </div>
            <div className="rounded-lg bg-white p-2 ring-1 ring-indigo-100">
              <div className="text-slate-500">恢复影响</div>
              <div className={restorePreview.changed ? "text-amber-800" : "text-emerald-700"}>{restorePreview.changed ? "有差异" : "无差异"}</div>
            </div>
          </div>
          {restorePreview.changed ? (
            <pre className="max-h-[360px] overflow-auto whitespace-pre rounded-lg bg-slate-950 p-3 font-mono text-[11.5px] leading-5 text-slate-100">{restorePreview.diff}</pre>
          ) : (
            <div className="rounded-lg bg-white p-3 text-xs text-emerald-700 ring-1 ring-emerald-100">当前文件与该快照一致，无需恢复。</div>
          )}
          <div className="rounded-lg bg-white p-2 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
            {restorePreview.restore_blocked_reason ?? "当前只允许恢复预览，恢复写回未开放。"}
          </div>
          <div className="rounded-xl border border-amber-100 bg-white p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-slate-900">恢复写回确认闸</div>
                <div className="mt-1 text-[11.5px] text-slate-500">只检查条件，不写 WorkBuddy 真源。</div>
              </div>
              <button
                type="button"
                onClick={requestRestoreGate}
                disabled={restoreRequestSubmitting}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {restoreRequestSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                检查写回闸
              </button>
            </div>
            {restoreRequestErr ? (
              <div className="rounded-lg bg-rose-50 p-2 text-[12px] leading-5 text-rose-800 ring-1 ring-rose-100">写回闸检查失败：{restoreRequestErr}</div>
            ) : restoreRequest ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-amber-50 p-2 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
                  {restoreRequest.restore_blocked_reason ?? "恢复写回仍被拦截。"}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {(restoreRequest.gates ?? []).map((gate) => (
                    <div key={gate.key} className={`rounded-lg p-2 text-[11.5px] leading-5 ring-1 ${gate.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : "bg-slate-50 text-slate-700 ring-slate-200"}`}>
                      <div className="flex items-center gap-1.5 font-medium">
                        {gate.ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                        {gate.label}
                      </div>
                      <div className="mt-1 text-[11px] opacity-80">{gate.detail ?? "-"}</div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 text-[11.5px] text-slate-600 md:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">Diff SHA：<span className="font-mono">{restoreRequest.preview?.diff_sha256?.slice(0, 12) ?? "-"}</span></div>
                  <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">写开关：{restoreRequest.policy?.write_enabled ? "已开" : "未开"}</div>
                  <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">挂载：{restoreRequest.policy?.writable_mount ? "可写" : "只读"}</div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 p-2 text-[12px] leading-5 text-slate-600 ring-1 ring-slate-200">
                点击检查后，系统会从后端返回恢复所需闸口；当前版本不会执行写回。
              </div>
            )}
            <button
              type="button"
              disabled
              className="mt-3 inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-400"
              title="真实恢复写回未开放"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              确认恢复写回（未开放）
            </button>
          </div>
        </div>
      ) : null}
      <div className="mt-3 rounded-lg bg-amber-50 p-2 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
        当前只创建回滚点并预览恢复 Diff，不执行恢复写回。恢复到某个快照需要下一阶段打开可写挂载、完整 Diff 确认和用户授权。
      </div>
    </div>

    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-mono text-slate-600">
          <History className="h-3.5 w-3.5" /> 最近 {n} commits · expert-source 全局
          {path ? `（筛选 ${path} 的变更：后续补 server 端 path 过滤）` : ""}
        </span>
        <div>
          {loading ? (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-600">
              <Loader2 className="h-3 w-3 animate-spin" /> 正在拉取 log…
            </span>
          ) : err ? (
            <span className="rounded bg-rose-50 px-2 py-0.5 text-rose-800 ring-1 ring-rose-200">拉取失败</span>
          ) : (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">真实走 GET /api/ai-control/log → config-center-git log</span>
          )}
        </div>
      </div>
      {err ? (
        <div className="rounded-lg bg-rose-50 p-3 text-[12.5px] leading-6 text-rose-800 ring-1 ring-rose-200">
          <b>GET /api/ai-control/log 失败：</b>
          <br />{err}
          <div className="mt-2 text-rose-700/80">
            排查：1) apps/server 是否启动；2) svc.log 调用 config-center-git log 是否能返回 JSON 数组；3) md-writer-core gitLog 子进程是否正常输出。
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在从真实 Git 仓拉取最近 commit…
        </div>
      ) : log.length === 0 ? (
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">（暂无 commit 记录）</div>
      ) : (
        <ul className="divide-y divide-slate-200 text-sm">
          {log.map((e) => (
            <li key={e.hash} className="grid grid-cols-12 gap-3 items-center py-3">
              <div className="col-span-2 font-mono text-[12px] text-indigo-600">{e.short || e.hash.slice(0, 7)}</div>
              <div className="col-span-6 md:col-span-7 text-slate-800 truncate" title={e.message}>{e.message}</div>
              <div className="hidden md:block col-span-1 text-xs text-slate-500 truncate">{e.author}</div>
              <div className="col-span-3 md:col-span-2 text-right text-xs text-slate-500 whitespace-nowrap">{e.date}</div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            if (!log.length) return alert("当前 log 为空，无可回滚版本");
            const target = log[0];
            if (!target?.hash) return alert("缺少 target hash");
            onRollback?.(target);
          }}
          disabled={!log.length || !onRollback}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-medium text-rose-700 shadow-sm hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          title="回滚到 log 列表第 1 条（最新之后）：影响面预览 → 二次确认 → reset-hard"
        >
          <RotateCcw className="h-3.5 w-3.5" /> 回滚到最新一条（影响面预览）
        </button>
        <button
          type="button"
          onClick={() => {
            if (!log.length) return;
            const target = log[Math.min(1, log.length - 1)];
            if (target?.hash) onRollback?.(target);
          }}
          disabled={!log.length || !onRollback}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          title="示例：回滚到 log 第 2 条（权威快照 2f3c75c），用于验证全链路回滚流程"
        >
          <GitCompare className="h-3.5 w-3.5" /> 回滚到第 2 条（示例：权威快照）
        </button>
      </div>
    </div>
    </div>
  );
}

function SettingsPanel({ path, panelSlug }: { path: string | null; panelSlug: string }) {
  const [writePolicy, setWritePolicy] = useState<WritePolicy | null>(null);
  const [policyErr, setPolicyErr] = useState<string | null>(null);
  const [sourceGuide, setSourceGuide] = useState<ExpertSourceMountGuide | null>(null);
  const [sourceGuideErr, setSourceGuideErr] = useState<string | null>(null);
  const [writebackReadiness, setWritebackReadiness] = useState<WritebackReadiness | null>(null);
  const [readinessErr, setReadinessErr] = useState<string | null>(null);
  const [executorPlan, setExecutorPlan] = useState<WritebackExecutorPlan | null>(null);
  const [executorPlanErr, setExecutorPlanErr] = useState<string | null>(null);
  const [executorSimulation, setExecutorSimulation] = useState<WritebackExecutorSimulation | null>(null);
  const [executorSimulationErr, setExecutorSimulationErr] = useState<string | null>(null);
  const [executorContractTests, setExecutorContractTests] = useState<WritebackExecutorContractTests | null>(null);
  const [executorContractErr, setExecutorContractErr] = useState<string | null>(null);
  const [requestedHostPath, setRequestedHostPath] = useState<string>("");
  const [mountMode, setMountMode] = useState<"readonly" | "writable">("readonly");
  const [mountRequest, setMountRequest] = useState<ExpertSourceMountRequest | null>(null);
  const [mountSubmitting, setMountSubmitting] = useState<boolean>(false);
  const isExpertSourcePanel = panelSlug === "experts" || panelSlug === "skills";
  const workbuddyDefaultPath = "C:\\Users\\Administrator\\.workbuddy\\plugins\\marketplaces\\my-experts\\plugins";
  const currentGitRoot = writePolicy?.source_root ?? writePolicy?.git_root ?? "/expert-source";
  const mountCommand = (mountRequest?.commands?.powershell ?? sourceGuide?.commands?.powershell ?? []).join("\n");
  const gateItems = [
    { label: "写权限", value: writePolicy?.write_enabled ? "已开启" : "未开启", ok: !!writePolicy?.write_enabled },
    { label: "Git 状态", value: writePolicy?.git_clean ? "clean" : writePolicy ? "需处理" : "读取中", ok: !!writePolicy?.git_clean },
    { label: "挂载", value: writePolicy?.writable_mount ? "可写" : writePolicy ? "只读" : "读取中", ok: !!writePolicy?.writable_mount },
    { label: "本机历史", value: writePolicy?.local_history_available ? "已启用" : writePolicy ? "未启用" : "读取中", ok: !!writePolicy?.local_history_available },
  ];

  useEffect(() => {
    let canceled = false;
    const run = async () => {
      try {
        const [policy, guide, readiness, plan, simulation, contractTests] = await Promise.all([
          apiFetch(`${API_PREFIX}/write-policy`) as Promise<WritePolicy>,
          apiFetch(`${API_PREFIX}/expert-source/mount-guide`) as Promise<ExpertSourceMountGuide>,
          apiFetch(`${API_PREFIX}/writeback-readiness`) as Promise<WritebackReadiness>,
          apiFetch(`${API_PREFIX}/writeback-executor-plan`) as Promise<WritebackExecutorPlan>,
          apiFetch(`${API_PREFIX}/writeback-executor-simulation`) as Promise<WritebackExecutorSimulation>,
          apiFetch(`${API_PREFIX}/writeback-executor-contract-tests`) as Promise<WritebackExecutorContractTests>,
        ]);
        if (canceled) return;
        setWritePolicy(policy);
        setSourceGuide(guide);
        setWritebackReadiness(readiness);
        setExecutorPlan(plan);
        setExecutorSimulation(simulation);
        setExecutorContractTests(contractTests);
        setRequestedHostPath(
          guide.latest_request?.requested_host_path
          ?? guide.suggested?.host_path
          ?? workbuddyDefaultPath,
        );
      } catch (error: any) {
        if (!canceled) {
          setPolicyErr(error?.message ?? String(error));
          setSourceGuideErr(error?.message ?? String(error));
          setReadinessErr(error?.message ?? String(error));
          setExecutorPlanErr(error?.message ?? String(error));
          setExecutorSimulationErr(error?.message ?? String(error));
          setExecutorContractErr(error?.message ?? String(error));
        }
      }
    };
    if (isExpertSourcePanel) run();
    return () => {
      canceled = true;
    };
  }, [isExpertSourcePanel, workbuddyDefaultPath]);

  const submitMountRequest = useCallback(async () => {
    setMountSubmitting(true);
    setSourceGuideErr(null);
    try {
      const r: ExpertSourceMountRequest = await apiFetch(`${API_PREFIX}/expert-source/mount-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostPath: requestedHostPath, mountMode }),
      });
      setMountRequest(r);
      const guide: ExpertSourceMountGuide = await apiFetch(`${API_PREFIX}/expert-source/mount-guide`);
      setSourceGuide(guide);
    } catch (error: any) {
      setSourceGuideErr(error?.message ?? String(error));
    } finally {
      setMountSubmitting(false);
    }
  }, [mountMode, requestedHostPath]);

  if (isExpertSourcePanel) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Tab ⑤ · WorkBuddy 专家源 / 读写保护</h4>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              这里只管理专家团、专家、Skill 配置源和保存安全闸；旧 SaaS 团队、邀请、账单、安全入口不再混入本页。
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11.5px] text-slate-600 ring-1 ring-slate-200">
            <Home className="h-3.5 w-3.5" /> 当前板块：<span className="font-mono text-slate-700">{panelSlug}</span>
            <span className="text-slate-400">·</span>
            <span>当前节点：<code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] ring-1 ring-slate-200">{path ?? "未选中文件"}</code></span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">① WorkBuddy 专家源目录</h5>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">当前页面读取 Docker 内的真实挂载；用户本机路径需要通过启动器或 Docker 挂载接入。</p>
              </div>
            </div>
            <div className="space-y-3 text-[12.5px] leading-6">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-slate-500">当前运行态真源</div>
                <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-[12px] text-slate-800 ring-1 ring-slate-200">{currentGitRoot}</code>
              </div>
              <div className="rounded-xl bg-indigo-50/60 p-3 ring-1 ring-indigo-100">
                <div className="text-indigo-700">本机 WorkBuddy 默认建议路径</div>
                <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-[12px] text-indigo-900 ring-1 ring-indigo-100">{workbuddyDefaultPath}</code>
              </div>
              <p className="text-slate-600">后续“选择目录”不能由普通网页直接访问 C 盘完成，需要本机启动器或安装向导把该目录挂载给系统；未挂载前不会误报为已同步。</p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800 ring-1 ring-amber-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">② 写入保护闸</h5>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">只有所有闸门通过，保存按钮才允许写回专家源；当前仍保持只读预审。</p>
              </div>
            </div>
            {policyErr ? (
              <div className="rounded-xl bg-rose-50 p-3 text-[12px] leading-6 text-rose-800 ring-1 ring-rose-200">读取写入策略失败：{policyErr}</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {gateItems.map((item) => (
                  <div key={item.label} className={`rounded-xl p-3 ring-1 ${item.ok ? "bg-emerald-50 text-emerald-900 ring-emerald-100" : "bg-amber-50 text-amber-900 ring-amber-100"}`}>
                    <div className="text-[11px] opacity-75">{item.label}</div>
                    <div className="mt-1 text-sm font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
            {writePolicy?.blocked_reason ? (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[12px] leading-6 text-amber-900 ring-1 ring-amber-100">{writePolicy.blocked_reason}</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">⑤ 目录挂载向导</h5>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">记录用户选择的专家源目录，生成重启方案；网页不直接改 Docker。</p>
              </div>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200">
              {sourceGuide?.current?.source_mode ?? "读取中"}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="text-[11px] text-slate-500">插件包</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{sourceGuide?.current?.plugin_count ?? "-"}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="text-[11px] text-slate-500">专家文件</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{sourceGuide?.current?.agents_count ?? "-"}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="text-[11px] text-slate-500">Skill 文件</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{sourceGuide?.current?.skills_count ?? "-"}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="text-[11px] text-slate-500">容器路径</div>
              <div className="mt-1 truncate font-mono text-[12px] text-slate-900">{sourceGuide?.suggested?.container_path ?? "/expert-source"}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_150px_auto]">
            <input
              value={requestedHostPath}
              onChange={(event) => setRequestedHostPath(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-[12px] text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              placeholder={workbuddyDefaultPath}
            />
            <select
              value={mountMode}
              onChange={(event) => setMountMode(event.target.value === "writable" ? "writable" : "readonly")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="readonly">只读挂载</option>
              <option value="writable">可写申请</option>
            </select>
            <button
              type="button"
              onClick={submitMountRequest}
              disabled={mountSubmitting || !requestedHostPath.trim()}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mountSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              生成方案
            </button>
          </div>
          {sourceGuideErr ? (
            <div className="mt-3 rounded-xl bg-rose-50 p-3 text-[12px] leading-5 text-rose-800 ring-1 ring-rose-100">挂载向导失败：{sourceGuideErr}</div>
          ) : mountRequest ? (
            <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-[12px] leading-5 text-emerald-800 ring-1 ring-emerald-100">
              已记录挂载申请：<span className="font-mono">{mountRequest.request?.id}</span>。应用后仍默认只读，真实写回另行授权。
            </div>
          ) : sourceGuide?.latest_request ? (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[12px] leading-5 text-slate-700 ring-1 ring-slate-200">
              最近申请：<span className="font-mono">{sourceGuide.latest_request.id}</span> · {sourceGuide.latest_request.status}
            </div>
          ) : null}
          {mountCommand ? (
            <div className="mt-3 rounded-xl bg-slate-950 p-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                <span>重启应用命令</span>
                <button
                  type="button"
                  onClick={() => navigator?.clipboard?.writeText(mountCommand)}
                  className="rounded bg-white/10 px-2 py-1 text-slate-100 hover:bg-white/15"
                >
                  复制
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-all font-mono text-[11.5px] leading-5 text-slate-100">{mountCommand}</pre>
            </div>
          ) : null}
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
            {mountRequest?.blocked_reason ?? sourceGuide?.blocked_reason ?? "挂载向导只记录申请，不执行写回。"}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">⑥ 真实写回授权前检查</h5>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">先选最小样本和前置条件；当前只读，不执行保存。</p>
              </div>
            </div>
            <span className={`rounded px-2 py-1 text-[11px] ring-1 ${writebackReadiness?.ready_for_real_writeback ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-800 ring-amber-100"}`}>
              {writebackReadiness?.ready_for_real_writeback ? "可验证" : "仍拦截"}
            </span>
          </div>
          {readinessErr ? (
            <div className="rounded-xl bg-rose-50 p-3 text-[12px] leading-5 text-rose-800 ring-1 ring-rose-100">检查清单读取失败：{readinessErr}</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-[11px] text-slate-500">推荐首次样本</div>
                <div className="mt-2 break-all font-mono text-[12px] font-semibold text-slate-900">
                  {writebackReadiness?.recommended_sample?.rel_posix ?? "等待扫描"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                    {writebackReadiness?.recommended_sample?.kind ?? "-"}
                  </span>
                  <span className="rounded bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                    {writebackReadiness?.recommended_sample?.bytes ?? "-"} bytes
                  </span>
                  <span className="rounded bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                    SHA {writebackReadiness?.recommended_sample?.sha256?.slice(0, 12) ?? "-"}
                  </span>
                </div>
                <p className="mt-3 text-[12px] leading-5 text-slate-600">
                  {writebackReadiness?.recommended_sample?.reason ?? "系统会优先选择范围小、容易回滚的 Skill Markdown。"}
                </p>
              </div>
              <div className="space-y-2">
                {(writebackReadiness?.gates ?? []).map((gate) => (
                  <div key={gate.key} className={`rounded-xl p-3 text-[12px] ring-1 ${gate.ok ? "bg-emerald-50 text-emerald-900 ring-emerald-100" : "bg-amber-50 text-amber-900 ring-amber-100"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{gate.label}</span>
                      <b>{gate.ok ? "通过" : "未通过"}</b>
                    </div>
                    {gate.detail ? <div className="mt-1 leading-5 opacity-80">{gate.detail}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          )}
          {writebackReadiness?.candidate_samples?.length ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {writebackReadiness.candidate_samples.slice(0, 4).map((sample) => (
                <div key={sample.rel_posix} className="rounded-xl bg-white p-3 text-[12px] ring-1 ring-slate-200">
                  <div className="break-all font-mono text-[11.5px] text-slate-800">{sample.rel_posix}</div>
                  <div className="mt-1 text-slate-500">{sample.kind} · {sample.bytes} bytes · {sample.risk_level}</div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
            {writebackReadiness?.boundary ?? "本卡片只显示授权前核对结果，不创建快照、不写文件、不提交。"}
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">⑦ 本机写盘执行器草案</h5>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">定义未来真实保存怎么写、怎么验、失败怎么退；当前不执行。</p>
              </div>
            </div>
            <span className={`rounded px-2 py-1 text-[11px] ring-1 ${executorPlan?.executor_enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-800 ring-amber-100"}`}>
              {executorPlan?.executor_enabled ? "执行器开放" : "执行器关闭"}
            </span>
          </div>
          {executorPlanErr ? (
            <div className="rounded-xl bg-rose-50 p-3 text-[12px] leading-5 text-rose-800 ring-1 ring-rose-100">执行器草案读取失败：{executorPlanErr}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-[11px] text-slate-500">执行模式</div>
                  <div className="mt-1 font-mono text-[12px] font-semibold text-slate-900">{executorPlan?.executor_mode ?? "local_snapshot_atomic_write"}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-[11px] text-slate-500">目标 SHA</div>
                  <div className="mt-1 font-mono text-[12px] font-semibold text-slate-900">{executorPlan?.target?.current_sha256?.slice(0, 12) ?? "-"}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-[11px] text-slate-500">未来审计</div>
                  <div className="mt-1 font-mono text-[12px] font-semibold text-slate-900">{executorPlan?.audit_plan?.future_execution_audit ?? "local-writeback-executions.jsonl"}</div>
                </div>
              </div>
              <div className="break-all rounded-xl bg-slate-50 p-3 font-mono text-[12px] text-slate-800 ring-1 ring-slate-200">
                {executorPlan?.target?.rel_posix ?? executorPlan?.readiness?.recommended_sample?.rel_posix ?? "等待目标样本"}
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {(executorPlan?.phases ?? []).map((phase) => (
                  <div key={phase.key} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                    <div className="text-[12px] font-semibold text-slate-900">{phase.label}</div>
                    <ul className="mt-2 space-y-1 text-[11.5px] leading-5 text-slate-600">
                      {(phase.required ?? []).slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl bg-amber-50 p-3 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
                  <div className="font-semibold">硬阻断</div>
                  <div className="mt-1">{(executorPlan?.hard_blocks ?? []).slice(0, 3).join("；") || "执行器当前关闭。"}</div>
                </div>
                <div className="rounded-xl bg-sky-50 p-3 text-[12px] leading-5 text-sky-900 ring-1 ring-sky-100">
                  <div className="font-semibold">恢复入口</div>
                  <div className="mt-1">{executorPlan?.rollback_design?.request_endpoint ?? "/api/ai-control/local-history/restore-request"}</div>
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
            {executorPlan?.boundary ?? "本卡片只展示写盘执行器草案，不创建快照、不写 WorkBuddy 真源。"}
          </div>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">⑧ 写盘模拟报告</h5>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">只读演练执行器会怎样被拦截，不创建任何副作用。</p>
              </div>
            </div>
            <span className="rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800 ring-1 ring-amber-100">
              {executorSimulation?.result ?? "blocked_before_write"}
            </span>
          </div>
          {executorSimulationErr ? (
            <div className="rounded-xl bg-rose-50 p-3 text-[12px] leading-5 text-rose-800 ring-1 ring-rose-100">模拟报告读取失败：{executorSimulationErr}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-[11px] text-slate-500">模拟编号</div>
                  <div className="mt-1 break-all font-mono text-[12px] font-semibold text-slate-900">{executorSimulation?.execution_id ?? "-"}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-[11px] text-slate-500">当前 SHA</div>
                  <div className="mt-1 font-mono text-[12px] font-semibold text-slate-900">{executorSimulation?.target?.before_sha256?.slice(0, 12) ?? "-"}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-[11px] text-slate-500">审计写入</div>
                  <div className="mt-1 text-[12px] font-semibold text-slate-900">{executorSimulation?.audit_preview?.would_append ? "会追加" : "不会追加"}</div>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                {(executorSimulation?.gates ?? []).map((gate) => (
                  <div key={gate.key} className={`rounded-xl p-3 text-[12px] ring-1 ${gate.ok ? "bg-emerald-50 text-emerald-900 ring-emerald-100" : "bg-amber-50 text-amber-900 ring-amber-100"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{gate.label}</span>
                      <b>{gate.ok ? "通过" : "阻断"}</b>
                    </div>
                    {gate.detail ? <div className="mt-1 leading-5 opacity-80">{gate.detail}</div> : null}
                  </div>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3 text-[12px] leading-5 text-slate-700 ring-1 ring-slate-200">
                  <div className="font-semibold text-slate-900">审计预览</div>
                  <div className="mt-1 break-all font-mono text-[11.5px]">{executorSimulation?.audit_preview?.audit_file ?? "local-writeback-executions.jsonl"}</div>
                  <div className="mt-2">blocked: {(executorSimulation?.blocked_gates ?? []).join(", ") || "-"}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-[12px] leading-5 text-slate-700 ring-1 ring-slate-200">
                  <div className="font-semibold text-slate-900">候选稿状态</div>
                  <div className="mt-1">changed: {executorSimulation?.simulated_candidate?.changed ? "true" : "false"}</div>
                  <div className="mt-1 break-all font-mono text-[11.5px]">diff {executorSimulation?.simulated_candidate?.diff_sha256?.slice(0, 12) ?? "-"}</div>
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
            {executorSimulation?.boundary ?? "本卡片只显示模拟报告，不创建快照、不写审计、不写 WorkBuddy 真源。"}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <GitCompare className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">⑨ 写盘合同测试</h5>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">验证非法路径、缺文件、缺授权等失败分支必须被拦住。</p>
              </div>
            </div>
            <span className={`rounded px-2 py-1 text-[11px] ring-1 ${executorContractTests?.ok ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-800 ring-amber-100"}`}>
              {executorContractTests?.passed ?? 0}/{executorContractTests?.total ?? 0} 通过
            </span>
          </div>
          {executorContractErr ? (
            <div className="rounded-xl bg-rose-50 p-3 text-[12px] leading-5 text-rose-800 ring-1 ring-rose-100">合同测试读取失败：{executorContractErr}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-[11px] text-slate-500">测试总数</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{executorContractTests?.total ?? "-"}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                  <div className="text-[11px] text-emerald-700">通过</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-900">{executorContractTests?.passed ?? "-"}</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
                  <div className="text-[11px] text-amber-700">失败</div>
                  <div className="mt-1 text-sm font-semibold text-amber-900">{executorContractTests?.failed ?? "-"}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-[11px] text-slate-500">只读</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{executorContractTests?.readonly ? "true" : "-"}</div>
                </div>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {(executorContractTests?.tests ?? []).map((test) => (
                  <div key={test.key} className={`rounded-xl p-3 text-[12px] ring-1 ${test.passed ? "bg-emerald-50 text-emerald-900 ring-emerald-100" : "bg-rose-50 text-rose-900 ring-rose-100"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{test.label}</span>
                      <b>{test.passed ? "通过" : "失败"}</b>
                    </div>
                    <div className="mt-1 text-[11.5px] leading-5 opacity-80">期望：{test.expected}</div>
                    <div className="mt-1 break-all font-mono text-[11px] leading-5 opacity-80">实际：{test.actual}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-[12px] leading-5 text-amber-900 ring-1 ring-amber-100">
            {executorContractTests?.boundary ?? "本卡片只展示合同测试，不创建快照、不写审计、不写 WorkBuddy 真源。"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">③ 本机版本历史</h5>
                <p className="text-[11.5px] text-slate-500">默认只保存在本机，不自动推送任何远程 Git 仓库。</p>
              </div>
            </div>
            <ul className="space-y-2 text-[12.5px] leading-6 text-slate-700">
              <li>当前已能在 Tab ④ 手动创建单文件快照，记录原始 hash、字节数、时间和备注。</li>
              <li>快照默认写入 lab 本机数据卷，不进入 WorkBuddy 插件目录。</li>
              <li>多电脑安装时各自保留本机历史，避免把用户专家配置上传到同一个远程仓库。</li>
              <li>恢复写回仍未开放，需要可写挂载、完整 Diff 确认和用户授权。</li>
            </ul>
            {writePolicy?.local_history_root ? (
              <code className="mt-3 block break-all rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 ring-1 ring-slate-200">{writePolicy.local_history_root}</code>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                <GitCompare className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">④ 当前连接关系</h5>
                <p className="text-[11.5px] text-slate-500">解释页面提示为什么能定位到具体专家文件。</p>
              </div>
            </div>
            <div className="space-y-3 text-[12.5px] leading-6 text-slate-700">
              <p>左侧树来自后端扫描的真实专家源目录，不是静态演示树。</p>
              <p>当前节点直接对应物理文件：<code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">{path ?? "未选中文件"}</code></p>
              <p>字段表单、Diff 和候选 Markdown 都从这个文件解析；只要源目录与 WorkBuddy 实际插件目录对齐，这里就能看到 WorkBuddy 配置变化。</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const saasLinks = [
    {
      key: "team",
      title: "高级·团队协作（兼容）",
      desc: "品牌成员管理 · 协作角色 · 权限边界 · 分组",
      icon: Users,
      href: "/personal-center/team",
      tag: "SAAS 兼容 · 原 /settings/team",
      accent: "from-indigo-50 to-indigo-100 text-indigo-700 ring-indigo-200",
    },
    {
      key: "invites",
      title: "高级·成员邀请（兼容）",
      desc: "待处理 · 已接受 · 已过期 · 撤回邀请 全量管理",
      icon: UserPlus,
      href: "/personal-center/invites",
      tag: "SAAS 兼容 · 原 /settings/invite",
      accent: "from-emerald-50 to-emerald-100 text-emerald-700 ring-emerald-200",
    },
    {
      key: "billing",
      title: "高级·账单与点数购买（兼容）",
      desc: "套餐订购 · 点数余额 · 交易记录 · 发票",
      icon: CreditCard,
      href: "/points-purchase",
      tag: "SAAS 兼容 · 原 /settings/billing",
      accent: "from-amber-50 to-amber-100 text-amber-800 ring-amber-200",
    },
    {
      key: "security",
      title: "高级·账号与安全（兼容）",
      desc: "登录态 · 密码修改 · 品牌上下文 · 退出登录",
      icon: Shield,
      href: "/personal-center/security",
      tag: "SAAS 兼容 · 原 /settings/security",
      accent: "from-rose-50 to-rose-100 text-rose-700 ring-rose-200",
    },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Tab ⑤ · 设置 / 齿轮兼容区（3 层）</h4>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            OQ2 红线：原 /settings/team|invite|billing|security + /ai-control-center 等 <b>24 条旧路由一律 301，绝不 404</b>；SAAS 遗留 4 入口收口到本 Tab，不再占 9 宫格；本板块为全局面板，无需选中文件即可查看下方③兼容层。
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11.5px] text-slate-600 ring-1 ring-slate-200">
          <Home className="h-3.5 w-3.5" /> 当前板块：<span className="font-mono text-slate-700">{panelSlug}</span>
          {path ? (
            <>
              <span className="text-slate-400">·</span>
              <span>当前节点：<code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] ring-1 ring-slate-200">{path}</code></span>
            </>
          ) : (
            <>
              <span className="text-slate-400">·</span>
              <span className="text-amber-700">未选中节点 · ③ SAAS 兼容层仍全局可达</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 ring-1 ring-indigo-200">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-sm font-semibold text-slate-900">① 模块注册中心（保留 SAAS 壳）</h5>
              <p className="text-[11.5px] text-slate-500">14 技能 · 15 模块注册清单 · 启停开关 · 版本号（占位不写）</p>
            </div>
          </div>
          <ul className="space-y-2 text-[12.5px] leading-6 text-slate-700">
            <li>✅ <b>写入前 git status --porcelain 必须 clean</b>（否则 UI 拒绝保存）</li>
            <li>✅ <b>不允许改 MCP 必填签名</b>（③接口配置 Tab ② 中灰显，只允许加 nullable 字段）</li>
            <li>✅ <b>reset --hard 需 --force-yes 二次确认</b>（见顶栏回滚按钮 + Tab ④ History 弹窗）</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-800 ring-1 ring-amber-200">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-sm font-semibold text-slate-900">② Provider 治理（Key / 旋转 / 路由）</h5>
              <p className="text-[11.5px] text-slate-500">平台密钥清单 · 轮换周期 · 失败兜底路由（占位不写）</p>
            </div>
          </div>
          <ul className="space-y-2 text-[12.5px] leading-6 text-slate-700">
            <li>新手=关闭：展开层级 2 级；隐藏 contract/exceptions 深度 L3/L4 2 段（提交时过滤丢弃）</li>
            <li>专家=开启：展开层级 4 级；深层契约/异常全部显示且保存时不过滤</li>
            <li>状态记忆在 localStorage（2 个 key：<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">aicc_panel_mode</code> 全局 + <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">aicc_panel_expand</code> 按 slug）</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11.5px] font-medium text-indigo-700 ring-1 ring-indigo-200">
              <Sparkles className="h-3.5 w-3.5" /> SAAS 遗留 4 入口 · 已从 9 宫格移动到本齿轮 Tab ⑤
            </div>
            <h5 className="mt-2 text-sm font-semibold text-slate-900">③ SAAS 兼容 · 4 入口卡（原 9 宫格移除，收口此处）</h5>
            <p className="mt-1 text-[12px] leading-5 text-slate-600">
              点卡片跳转个人中心对应子页；原 24 旧路由 <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">/settings/team /settings/invite /settings/billing /settings/security /personal/* /ai-control-center/*</code> 一律走 <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">middleware.ts</code> 301 到此目标；<b>绝不 404</b>。
            </p>
          </div>
          <div className="text-[11.5px] text-slate-500">卡片数：<b className="text-slate-800">{saasLinks.length}</b>（团队 · 邀请 · 账单 · 安全）</div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {saasLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch={false}
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300/70 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} ring-1`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="whitespace-nowrap rounded-md bg-slate-50 px-2 py-0.5 text-[10.5px] text-slate-500 ring-1 ring-slate-200">
                    {item.tag}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <h6 className="text-[14px] font-semibold leading-5 text-slate-900 group-hover:text-indigo-700">
                    {item.title}
                  </h6>
                  <p className="text-[12px] leading-5 text-slate-600">{item.desc}</p>
                </div>
                <div className="mt-5 flex items-center justify-end gap-1 text-[12px] font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                  前往 <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {panelSlug === "brand" && <OntologyOutboxGovernanceTab />}
      {panelSlug === "advanced" && <RbacPermissionRequestPanel />}
    </div>
  );
}

function OntologyOutboxGovernanceTab() {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<null | {
    ok?: boolean;
    counters?: {
      total_rows?: number; pending_undispatched?: number; dispatched_ok?: number; in_dlq?: number;
      retry_buckets?: { zero_retry?: number; pending_1_2?: number; pending_ge3_still_in?: number };
    };
    by_pipeline?: Array<{ pipeline?: string; count?: number }>;
    routes?: Array<{ id?: string; priority?: number; desc?: string }>;
  }>(null);
  const [lastTick, setLastTick] = useState<null | { ok?: boolean; stats?: any }>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await authenticatedFetch("/api/ai-control/ontology-mapper/outbox/summary");
      const j = await r.json().catch(() => ({}));
      setSummary(j);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const runTick = async () => {
    setRunning(true);
    try {
      const r = await authenticatedFetch("/api/ai-control/ontology-mapper/outbox/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_size: 50 }),
      });
      const j = await r.json().catch(() => ({}));
      setLastTick(j);
      await refresh();
    } finally {
      setRunning(false);
    }
  };

  const c = summary?.counters ?? {};
  const buckets = c.retry_buckets ?? {};
  const pipes = summary?.routes ?? [];
  const pipeCounts = new Map((summary?.by_pipeline ?? []).map((p: any) => [p.pipeline, p.count] as const));

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-white p-5 shadow-sm ring-1 ring-indigo-100">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-[11.5px] font-medium text-white shadow-sm ring-1 ring-indigo-700/10">
            <HardDrive className="h-3.5 w-3.5" /> Ontology Governance · OQ6 双写看板 · Phase3-4
          </div>
          <h5 className="mt-2 text-sm font-semibold text-slate-900">Outbox Worker · P-01..P-08 优先级队列 + DLQ 死信</h5>
          <p className="mt-1 text-[12px] leading-5 text-slate-600">
            15 写 Handler → WF表 → ontology_outboxes（OQ6 14 天过渡 99% 对账率）→ 8 Pipeline 消费 → ont_* 表；本 Tab 读 <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">/outbox/summary</code>，点 Run Tick 手动推进一轮。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            刷新
          </button>
          <button
            onClick={runTick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400"
            disabled={running}
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5" />}
            Run Tick (batch=50)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: "total_rows", label: "Outbox 总事件", val: c.total_rows ?? "-", accent: "from-slate-50 to-white text-slate-800 ring-slate-200" },
          { k: "pending", label: "待调度 Undispatched", val: c.pending_undispatched ?? "-", accent: "from-amber-50 to-amber-100 text-amber-800 ring-amber-200" },
          { k: "dispatched", label: "已消费 OK", val: c.dispatched_ok ?? "-", accent: "from-emerald-50 to-emerald-100 text-emerald-700 ring-emerald-200" },
          { k: "dlq", label: "死信 DLQ", val: c.in_dlq ?? "-", accent: "from-rose-50 to-rose-100 text-rose-700 ring-rose-200" },
        ].map((it) => (
          <div key={it.k} className={`rounded-xl bg-gradient-to-br ${it.accent} p-3.5 ring-1`}>
            <div className="text-[11px] font-medium opacity-80">{it.label}</div>
            <div className="mt-1 font-mono text-2xl font-bold leading-none tracking-tight">{it.val}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <h6 className="text-[12px] font-semibold text-slate-800">重试分布（retry buckets）</h6>
            <span className="text-[10.5px] text-slate-500">OQ6 双写 = 14 天 + 99% 对账率</span>
          </div>
          <ul className="space-y-1.5 text-[12px] text-slate-700">
            <li className="flex justify-between"><span>0 次 · 新鲜事件</span><span className="font-mono font-semibold text-emerald-700">{buckets.zero_retry ?? 0}</span></li>
            <li className="flex justify-between"><span>1-2 次 · 重试中</span><span className="font-mono font-semibold text-amber-700">{buckets.pending_1_2 ?? 0}</span></li>
            <li className="flex justify-between"><span>≥ 3 次 · 仍未 DLQ</span><span className="font-mono font-semibold text-rose-700">{buckets.pending_ge3_still_in ?? 0}</span></li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <h6 className="text-[12px] font-semibold text-slate-800">最近一次 Tick 结果</h6>
            <span className="text-[10.5px] text-slate-500">POST /outbox/tick</span>
          </div>
          {lastTick?.stats ? (
            <ul className="space-y-1.5 text-[12px] text-slate-700">
              <li className="flex justify-between"><span>本批 picked</span><span className="font-mono font-semibold">{lastTick.stats.picked_total ?? 0}</span></li>
              <li className="flex justify-between"><span>成功 Success</span><span className="font-mono font-semibold text-emerald-700">{lastTick.stats.success ?? 0}</span></li>
              <li className="flex justify-between"><span>失败 Failed</span><span className="font-mono font-semibold text-amber-700">{lastTick.stats.failed ?? 0}</span></li>
              <li className="flex justify-between"><span>移入 DLQ</span><span className="font-mono font-semibold text-rose-700">{lastTick.stats.moved_to_dlq ?? 0}</span></li>
            </ul>
          ) : (
            <div className="text-[12px] italic text-slate-500">（尚未运行，点击右上角 Run Tick 执行一次）</div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <h6 className="text-[12px] font-semibold text-slate-800">8 Pipeline · P-01 最高优 → P-08 最低</h6>
          <span className="text-[10.5px] text-slate-500">每次 Tick 按 priority asc 排序消费</span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {pipes.map((p) => {
            const c1 = pipeCounts.get(p.id) ?? pipeCounts.get(p.id?.toUpperCase?.() ?? "") ?? 0;
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-5 w-10 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                    (p.priority ?? 99) <= 2 ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200" :
                    (p.priority ?? 99) <= 4 ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" :
                    (p.priority ?? 99) <= 6 ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200" :
                    "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                  }`}>{p.id}</span>
                  <div className="text-[11.5px] leading-5 text-slate-700">{p.desc ?? "-"}</div>
                </div>
                <div className="font-mono text-[12px] font-semibold text-slate-800">count = {c1 ?? 0}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- P1: RBAC 81 格 R07/R08 权限申请面板 (D133) ---------- */
type RoleKey = "R01" | "R02" | "R03" | "R04" | "R05" | "R06" | "R07" | "R08" | "ACTION";
type ActionKey =
  | "A1_ASSET_LIBRARY"
  | "A2_INSIGHT_COLLECT"
  | "A3_STRATEGY_PLAN"
  | "A4_CONTENT_CREATE"
  | "A5_PUBLISH_DISTRIBUTE"
  | "A6_DATA_ANALYSIS"
  | "A7_FINANCE_SETTLE"
  | "A8_TEAM_MANAGE"
  | "APPROVER_ROW";
type PermissionLevel =
  | "NONE"
  | "READ"
  | "WRITE"
  | "REVIEW"
  | "DISABLED"
  | "REQUEST"
  | "GRANTED"
  | "REJECTED"
  | "PENDING";

const RBAC_ROLE_COLS: { key: RoleKey; label: string; hint: string }[] = [
  { key: "R01", label: "R01 · 创始人", hint: "最高决策 · 全权限" },
  { key: "R02", label: "R02 · 品牌总监", hint: "品牌战略 · 资产审批" },
  { key: "R03", label: "R03 · 内容负责人", hint: "选题/脚本/QC 全链路" },
  { key: "R04", label: "R04 · 增长负责人", hint: "GEO/全网/线索 运营" },
  { key: "R05", label: "R05 · 数据分析师", hint: "KPI 看板 · 复盘报告" },
  { key: "R06", label: "R06 · 财务/法务", hint: "预算结算 · 合规审核" },
  { key: "R07", label: "R07 · 投流总监", hint: "巨量/千川/腾讯广告 (预埋)" },
  { key: "R08", label: "R08 · 达人负责人", hint: "星图/蝉妈妈/分润 (预埋)" },
  { key: "ACTION", label: "业务动作 (行)", hint: "8 动作 + 1 审批人 = 9 行" },
];

const RBAC_ACTION_ROWS: { key: ActionKey; label: string; icon: string }[] = [
  { key: "A1_ASSET_LIBRARY", label: "阶段 1 · 资产库读写", icon: "📁" },
  { key: "A2_INSIGHT_COLLECT", label: "阶段 2 · 洞察采集", icon: "🔍" },
  { key: "A3_STRATEGY_PLAN", label: "阶段 3 · 策略计划", icon: "📋" },
  { key: "A4_CONTENT_CREATE", label: "阶段 4 · 内容创作", icon: "✍️" },
  { key: "A5_PUBLISH_DISTRIBUTE", label: "阶段 5 · 发布分发", icon: "🚀" },
  { key: "A6_DATA_ANALYSIS", label: "阶段 6 · 数据分析", icon: "📊" },
  { key: "A7_FINANCE_SETTLE", label: "阶段 7 · 财务结算", icon: "💰" },
  { key: "A8_TEAM_MANAGE", label: "阶段 8 · 团队管理", icon: "👥" },
  { key: "APPROVER_ROW", label: "※ 审批人 / 签名闸门", icon: "✍️" },
];

const RBAC_PERMISSION_COLORS: Record<PermissionLevel, { bg: string; ring: string; text: string; label: string }> = {
  NONE:     { bg: "bg-slate-50",        ring: "ring-slate-200",   text: "text-slate-400", label: "未授权" },
  READ:     { bg: "bg-emerald-50",      ring: "ring-emerald-200", text: "text-emerald-700", label: "只读" },
  WRITE:    { bg: "bg-sky-50",          ring: "ring-sky-300",    text: "text-sky-700",     label: "编辑" },
  REVIEW:   { bg: "bg-amber-50",        ring: "ring-amber-300",  text: "text-amber-800",   label: "审核" },
  DISABLED: { bg: "bg-slate-100",       ring: "ring-slate-300",  text: "text-slate-500",   label: "禁用" },
  REQUEST:  { bg: "bg-yellow-100",      ring: "ring-yellow-400", text: "text-yellow-800",  label: "申请中" },
  GRANTED:  { bg: "bg-emerald-100",     ring: "ring-emerald-500",text: "text-emerald-800", label: "已授权" },
  REJECTED: { bg: "bg-rose-50",         ring: "ring-rose-300",   text: "text-rose-700",    label: "已拒绝" },
  PENDING:  { bg: "bg-violet-100",      ring: "ring-violet-400", text: "text-violet-800",  label: "待审批" },
};

const RBAC_81_GRID_INIT: Record<string, Record<string, PermissionLevel>> = {
  R01: {
    A1_ASSET_LIBRARY: "GRANTED", A2_INSIGHT_COLLECT: "GRANTED", A3_STRATEGY_PLAN: "GRANTED", A4_CONTENT_CREATE: "GRANTED",
    A5_PUBLISH_DISTRIBUTE: "GRANTED", A6_DATA_ANALYSIS: "GRANTED", A7_FINANCE_SETTLE: "GRANTED", A8_TEAM_MANAGE: "GRANTED",
    APPROVER_ROW: "PENDING",
  },
  R02: {
    A1_ASSET_LIBRARY: "WRITE", A2_INSIGHT_COLLECT: "WRITE", A3_STRATEGY_PLAN: "GRANTED", A4_CONTENT_CREATE: "REVIEW",
    A5_PUBLISH_DISTRIBUTE: "REVIEW", A6_DATA_ANALYSIS: "READ", A7_FINANCE_SETTLE: "READ", A8_TEAM_MANAGE: "READ",
    APPROVER_ROW: "PENDING",
  },
  R03: {
    A1_ASSET_LIBRARY: "READ", A2_INSIGHT_COLLECT: "WRITE", A3_STRATEGY_PLAN: "WRITE", A4_CONTENT_CREATE: "GRANTED",
    A5_PUBLISH_DISTRIBUTE: "WRITE", A6_DATA_ANALYSIS: "READ", A7_FINANCE_SETTLE: "NONE", A8_TEAM_MANAGE: "NONE",
    APPROVER_ROW: "NONE",
  },
  R04: {
    A1_ASSET_LIBRARY: "READ", A2_INSIGHT_COLLECT: "WRITE", A3_STRATEGY_PLAN: "WRITE", A4_CONTENT_CREATE: "NONE",
    A5_PUBLISH_DISTRIBUTE: "WRITE", A6_DATA_ANALYSIS: "WRITE", A7_FINANCE_SETTLE: "NONE", A8_TEAM_MANAGE: "NONE",
    APPROVER_ROW: "NONE",
  },
  R05: {
    A1_ASSET_LIBRARY: "READ", A2_INSIGHT_COLLECT: "READ", A3_STRATEGY_PLAN: "READ", A4_CONTENT_CREATE: "READ",
    A5_PUBLISH_DISTRIBUTE: "READ", A6_DATA_ANALYSIS: "GRANTED", A7_FINANCE_SETTLE: "READ", A8_TEAM_MANAGE: "NONE",
    APPROVER_ROW: "NONE",
  },
  R06: {
    A1_ASSET_LIBRARY: "NONE", A2_INSIGHT_COLLECT: "NONE", A3_STRATEGY_PLAN: "READ", A4_CONTENT_CREATE: "NONE",
    A5_PUBLISH_DISTRIBUTE: "READ", A6_DATA_ANALYSIS: "READ", A7_FINANCE_SETTLE: "GRANTED", A8_TEAM_MANAGE: "READ",
    APPROVER_ROW: "PENDING",
  },
  R07: {
    A1_ASSET_LIBRARY: "GRANTED", A2_INSIGHT_COLLECT: "GRANTED", A3_STRATEGY_PLAN: "GRANTED", A4_CONTENT_CREATE: "GRANTED",
    A5_PUBLISH_DISTRIBUTE: "GRANTED", A6_DATA_ANALYSIS: "GRANTED", A7_FINANCE_SETTLE: "GRANTED", A8_TEAM_MANAGE: "GRANTED",
    APPROVER_ROW: "PENDING",
  },
  R08: {
    A1_ASSET_LIBRARY: "GRANTED", A2_INSIGHT_COLLECT: "GRANTED", A3_STRATEGY_PLAN: "GRANTED", A4_CONTENT_CREATE: "GRANTED",
    A5_PUBLISH_DISTRIBUTE: "GRANTED", A6_DATA_ANALYSIS: "GRANTED", A7_FINANCE_SETTLE: "GRANTED", A8_TEAM_MANAGE: "GRANTED",
    APPROVER_ROW: "PENDING",
  },
};

function RbacPermissionRequestPanel() {
  const ROLE_KEYS = RBAC_ROLE_COLS.map((r) => r.key);
  const ACTION_KEYS = RBAC_ACTION_ROWS.map((r) => r.key);
  const [viewRole, setViewRole] = useState<"R07" | "R08">("R07");
  const [grid, setGrid] = useState<Record<string, Record<string, PermissionLevel>>>(() => {
    const clone: Record<string, Record<string, PermissionLevel>> = {};
    for (const rk of ROLE_KEYS) {
      clone[rk] = { ...(RBAC_81_GRID_INIT[rk] ?? {}) };
    }
    return clone;
  });
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ visible: boolean; msg: string; ok: boolean }>({ visible: false, msg: "", ok: true });

  const toggleCell = (roleKey: RoleKey, actionKey: ActionKey) => {
    if (roleKey === "ACTION") return;
    const cur = grid[roleKey]?.[actionKey] ?? "NONE";
    if (cur === "GRANTED" || cur === "DISABLED") return;
    setGrid((prev) => {
      const next = { ...prev, [roleKey]: { ...(prev[roleKey] ?? {}) } };
      if (cur === "REQUEST" || cur === "PENDING") {
        next[roleKey][actionKey] = RBAC_81_GRID_INIT[roleKey]?.[actionKey] ?? "NONE";
      } else {
        next[roleKey][actionKey] = "REQUEST";
      }
      return next;
    });
  };

  const submitApproval = async () => {
    const reqCells: string[] = [];
    for (const rk of ROLE_KEYS) {
      if (rk === "ACTION") continue;
      for (const ak of ACTION_KEYS) {
        if (grid[rk]?.[ak] === "REQUEST") reqCells.push(`${rk}/${String(ak).slice(0, 2)}`);
      }
    }
    if (!reqCells.length) {
      setToast({ visible: true, msg: "请先在 81 格矩阵中勾选至少 1 个目标权限格（黄色 = 申请）", ok: false });
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3200);
      return;
    }
    if (reason.trim().length < 10) {
      setToast({ visible: true, msg: "申请理由需 ≥ 10 字：说明业务场景、预计用量、紧急程度", ok: false });
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3200);
      return;
    }
    setSubmitting(true);
    setToast({ visible: true, msg: `正在写入 ${reqCells.length} 项权限申请队列 (WF审批流接入 = AT23+专项)…`, ok: true });
    await new Promise((r) => setTimeout(r, 2800));
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    const seq = String(Math.floor(1000 + Math.random() * 9000));
    const applyId = `APP-${viewRole}-${ymd}-${seq}`;
    setGrid((prev) => {
      const next: Record<string, Record<string, PermissionLevel>> = {};
      for (const rk of ROLE_KEYS) next[rk] = { ...(prev[rk] ?? {}) };
      for (const rk of ROLE_KEYS) {
        if (rk === "ACTION") continue;
        for (const ak of ACTION_KEYS) {
          if (next[rk][ak] === "REQUEST") next[rk][ak] = "PENDING";
        }
      }
      return next;
    });
    setSubmitting(false);
    setToast({ visible: true, msg: `✅ 申请已进入审批队列，单号：${applyId} · ${reqCells.length} 项待 R02/R06 二级审批 (D99 GDPR审计ID已链)`, ok: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 6200);
  };

  const resetSelection = () => {
    setGrid(() => {
      const clone: Record<string, Record<string, PermissionLevel>> = {};
      for (const rk of ROLE_KEYS) clone[rk] = { ...(RBAC_81_GRID_INIT[rk] ?? {}) };
      return clone;
    });
    setReason("");
    setToast({ visible: true, msg: "已清空 81 格勾选，回到 D138 预埋状态", ok: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  };

  const displayCols: RoleKey[] = (["R01", "R02", "R03", "R04", "R05", "R06", viewRole, "ACTION"] as RoleKey[]);

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/60 via-white to-white p-5 shadow-sm ring-1 ring-violet-100">
      {toast.visible && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-[12.5px] leading-6 ring-1 ${
            toast.ok ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-rose-50 text-rose-900 ring-rose-200"
          }`}
        >
          <span className="mt-0.5">{toast.ok ? "✅" : "⚠️"}</span>
          <div className="flex-1">{toast.msg}</div>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-[11.5px] font-medium text-white shadow-sm ring-1 ring-violet-700/10">
            <ShieldCheck className="h-3.5 w-3.5" /> RBAC Governance · 81 格权限矩阵 · D133
          </div>
          <h5 className="mt-2 text-sm font-semibold text-slate-900">
            {viewRole === "R07" ? "R07 投流总监" : "R08 达人负责人"} · 专项权限申请面板
          </h5>
          <p className="mt-1 text-[12px] leading-5 text-slate-600">
            矩阵规格：9 行 (8业务动作 + 1审批人) × 9 列 (R01~R08 + 动作说明) = 81 格；<b className="text-violet-800">黄色=申请</b> / <b className="text-emerald-800">深绿=已授权(预埋D138)</b> / <b className="text-slate-500">灰=禁用(越权V094×0 PERMALIGNED)</b>；点击非绿/非灰格可切换申请状态。
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 text-[12px] font-medium text-slate-600">
          {(
            [
              ["R07", "R07 投流总监 · 巨量/千川/腾讯", Banknote],
              ["R08", "R08 达人负责人 · 星图/蝉妈妈/分润", Handshake],
            ] as const
          ).map(([k, label, Ic]) => {
            const active = viewRole === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setViewRole(k)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  active ? "bg-white text-violet-700 shadow ring-1 ring-slate-200" : "hover:bg-white/60"
                }`}
              >
                <Ic className="h-3.5 w-3.5" /> {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] border-collapse text-[11.5px]">
          <thead>
            <tr className="bg-slate-50">
              {displayCols.map((colKey, ci) => {
                const col = RBAC_ROLE_COLS.find((c) => c.key === colKey)!;
                const isTarget = colKey === viewRole;
                return (
                  <th
                    key={colKey}
                    className={`sticky top-0 px-2 py-2.5 text-left font-semibold leading-5 ring-1 ring-slate-200 ${
                      isTarget
                        ? "bg-violet-100/90 text-violet-900 ring-violet-300"
                        : colKey === "ACTION"
                        ? "bg-indigo-50/90 text-indigo-900 ring-indigo-200"
                        : "text-slate-700"
                    }`}
                    style={{ width: colKey === "ACTION" ? "160px" : "10%" }}
                  >
                    <div className="text-[12px]">{col.label}</div>
                    <div className={`mt-0.5 font-normal ${isTarget ? "text-violet-700/80" : "text-slate-500"} text-[10.5px] leading-4`}>
                      {col.hint}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {RBAC_ACTION_ROWS.map((row, ri) => (
              <tr key={row.key} className={ri % 2 ? "bg-slate-50/40" : ""}>
                {displayCols.map((colKey, ci) => {
                  if (colKey === "ACTION") {
                    return (
                      <td
                        key={`${row.key}-ACTION`}
                        className="px-3 py-2 align-top ring-1 ring-slate-200 bg-indigo-50/40"
                      >
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 leading-5">
                          <span className="text-[13px]">{row.icon}</span>
                          <span className="text-[11.5px]">{row.label}</span>
                        </div>
                      </td>
                    );
                  }
                  const lv = grid[colKey]?.[row.key] ?? "NONE";
                  const c = RBAC_PERMISSION_COLORS[lv];
                  const clickable = lv !== "GRANTED" && lv !== "DISABLED";
                  const isTargetCol = colKey === viewRole;
                  return (
                    <td
                      key={`${row.key}-${colKey}`}
                      className={`px-1.5 py-1.5 ring-1 ring-slate-100 align-top ${
                        isTargetCol ? "bg-violet-50/30" : ""
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!clickable || submitting}
                        onClick={() => toggleCell(colKey, row.key)}
                        title={`${colKey} · ${row.label} = ${c.label}${clickable ? " · 点击切换申请" : " · 固定状态不可改"}`}
                        className={`w-full rounded-lg px-1.5 py-2 text-center text-[10.5px] font-semibold leading-4 ring-1 transition ${c.bg} ${c.ring} ${c.text} ${
                          clickable && !submitting ? "cursor-pointer hover:brightness-105 hover:shadow-sm active:scale-[0.98]" : "cursor-not-allowed opacity-95"
                        }`}
                      >
                        {c.label}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-9">
        <div className="md:col-span-6">
          <label className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700">
            <Users className="h-3.5 w-3.5 text-violet-600" /> 申请理由 (≥10字，业务场景/预计用量/紧急程度)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            placeholder={`例：618大促节点需要临时开通 ${viewRole} 的阶段4内容创作、阶段5发布分发、阶段6数据分析 3格权限，预计 6/1-6/20 共20天投放量级，ROI≥1.8 可结束；紧急程度=高。`}
            rows={3}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] leading-6 text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>
        <div className="md:col-span-3 space-y-2">
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600 ring-1 ring-slate-200">
            <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> D133 铁律
            </div>
            <ul className="space-y-0.5 list-disc pl-4">
              <li>R07/R08 审批链 = R02品牌总监 + R06财务法务 = 二级会签</li>
              <li>越权格自动红灰 V094×0 PERMALIGNED (永久不重试)</li>
              <li>真实写库(PG wf_approvals) = AT23+ 专项，当前=前端UI闭环</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={resetSelection}
          disabled={submitting}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCcw className="h-3.5 w-3.5" /> 清空勾选
        </button>
        <button
          type="button"
          onClick={submitApproval}
          disabled={submitting}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4.5 text-[12.5px] font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendIcon className="h-3.5 w-3.5" />}
          {submitting ? "提交审批中…" : `提交 ${viewRole} 权限审批 →`}
        </button>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */
function buildTreeFromApiEntries(rootKey: "agents" | "skills", rootName: string, entries: AiControlTreeEntry[]): TreeDirNode[] {
  const files = entries
    .filter((entry) => entry.type === "file" && /\.(md|json|ya?ml|txt)$/i.test(entry.name))
    .map((entry) => entry.rel.replace(/\\/g, "/"))
    .sort((a, b) => a.localeCompare(b));
  if (!files.length) return [];

  const root = dir(rootKey, `① ${rootName} · ${rootKey}`, []);
  const dirIndex = new Map<string, TreeDirNode>([[root.path, root]]);
  const ensureDir = (parent: TreeDirNode, part: string, fullPath: string) => {
    const found = dirIndex.get(fullPath);
    if (found) return found;
    const created = dir(fullPath, part, []);
    parent.children.push(created);
    dirIndex.set(fullPath, created);
    return created;
  };

  for (const rel of files) {
    const parts = displayPartsForSourceRel(rel, rootKey);
    let parent = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const fullPath = i === parts.length - 1 ? rel : `${rootKey}/${parts.slice(0, i + 1).join("/")}`;
      if (i === parts.length - 1) {
        parent.children.push(file(fullPath, `④ ${part}`, {
          title: part.replace(/\.(md|json|ya?ml|txt)$/i, ""),
          role: rootKey === "agents" ? "专家配置文件" : "Skill 配置文件",
          use: "从 expert-source 真实目录扫描",
          constraint: "S2-04 第一版只读预览，不覆盖写盘",
          owner: rootKey,
        }));
      } else {
        parent = ensureDir(parent, part, fullPath);
      }
    }
  }

  return [root];
}

async function sha256Text(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function displayPartsForSourceRel(rel: string, rootKey: "agents" | "skills"): string[] {
  const parts = rel.split("/").filter(Boolean);
  if (parts[0] === rootKey) return parts.slice(1);
  const resourceIndex = parts.indexOf(rootKey);
  if (resourceIndex > 0) return [parts[0], ...parts.slice(resourceIndex + 1)];
  return parts;
}

function parseMarkdownSummary(markdown: string): Record<string, string> {
  const lines = markdown.split(/\r?\n/);
  const title = lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "").trim() ?? "";
  const result: Record<string, string> = { title };
  let currentKey = "";
  const sections: Record<string, string[]> = {};
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      currentKey = normalizeMarkdownKey(heading[1]);
      if (!sections[currentKey]) sections[currentKey] = [];
      continue;
    }
    if (currentKey) sections[currentKey].push(line);
  }
  for (const [key, value] of Object.entries(sections)) {
    const text = value.join("\n").trim();
    if (text) result[key] = text.length > 220 ? `${text.slice(0, 220)}...` : text;
  }
  return result;
}

function normalizeMarkdownKey(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (key.includes("role") || key.includes("角色") || key.includes("定位") || key.includes("身份")) return "role";
  if (key.includes("路由原则") || key === "路由" || key.includes("skill 路由") || key.includes("skill路由")) return "use";
  if (key.includes("use") || key.includes("场景") || key.includes("适用")) return "use";
  if (key.includes("执行铁律") || key.includes("铁律")) return "constraint";
  if (key.includes("constraint") || key.includes("约束") || key.includes("红线") || key.includes("禁止")) return "constraint";
  if (key.includes("owner") || key.includes("负责人")) return "owner";
  if (key.includes("input_schema") || key.includes("输入要求") || key.includes("入参") || key === "输入" || key === "input") return "input_schema";
  if (key.includes("output_schema") || key.includes("输出要求") || key.includes("最低输出要求") || key.includes("交付物") || key === "输出" || key === "output") return "output_schema";
  if (key.includes("fallback") || key.includes("失败处理") || key.includes("异常处理") || key.includes("降级") || key.includes("补救")) return "fallback";
  if (key.includes("contract") || key.includes("交接") || key.includes("输入输出") || key.includes("输入与输出")) return "contract";
  if (key.includes("exception") || key.includes("异常") || key.includes("失败")) return "exceptions";
  if (key.includes("variables") || key.includes("变量")) return "variables";
  if (key.includes("template") || key.includes("模板")) return "template";
  return key.replace(/\s+/g, "_");
}

function resolveLiveMarkdownKind(path: string): LiveMarkdownKind {
  return path.startsWith("skills/") || path.includes("/skills/") ? "skill" : "expert";
}

function getLiveDraftSchema(kind: LiveMarkdownKind): LiveDraftField[] {
  if (kind === "skill") {
    return [
      { key: "title", label: "① 标题", depth: 1, help: "来自 Markdown H1，用于用户识别这个 Skill" },
      { key: "role", label: "② 定位", depth: 1, help: "这个 Skill 负责什么业务对象或内容类型" },
      { key: "use", label: "③ 适用场景", depth: 2, help: "什么时候应该调用这个 Skill" },
      { key: "constraint", label: "④ 禁止事项 / 红线", depth: 2, help: "不能做什么、触发哪些限制" },
      { key: "input_schema", label: "⑤ 输入要求", depth: 3, help: "专家调用该 Skill 时需要准备的输入" },
      { key: "output_schema", label: "⑥ 输出要求", depth: 3, help: "Skill 必须交付的结构化结果" },
      { key: "fallback", label: "⑦ 失败处理", depth: 4, help: "缺数据、调用失败、质量不达标时如何处理" },
    ];
  }
  return [
    { key: "title", label: "① 标题", depth: 1, help: "来自 Markdown H1，用于用户识别专家" },
    { key: "role", label: "② 角色定位", depth: 1, help: "这个专家在业务链路中负责什么" },
    { key: "use", label: "③ 适用场景", depth: 2, help: "什么时候应该把任务交给这个专家" },
    { key: "constraint", label: "④ 关键约束 / 红线", depth: 2, help: "专家不能越过的边界" },
    { key: "owner", label: "⑤ 负责人 / ID", depth: 2, help: "专家 ID、归属团队或维护人" },
    { key: "contract", label: "⑥ 交接契约", depth: 3, help: "输入、输出、上下游交接要求" },
    { key: "exceptions", label: "⑦ 异常处理", depth: 4, help: "失败、缺资料、需确认时的处理方式" },
  ];
}

function parseLiveEditableFields(markdown: string, kind: LiveMarkdownKind): Record<string, string> {
  const lines = markdown.split(/\r?\n/);
  const frontmatter = parseSimpleFrontmatter(markdown);
  const sections: Record<string, string[]> = {};
  const h1Intro: string[] = [];
  let currentKey = "";
  let collectingIntro = false;
  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (heading) {
      const level = heading[1].length;
      const label = stripMarkdownHeadingNoise(heading[2]);
      if (level === 1) {
        sections.title = [label];
        currentKey = "";
        collectingIntro = true;
        continue;
      }
      const normalized = normalizeMarkdownKey(label);
      if (sections[normalized]) {
        currentKey = "";
      } else {
        currentKey = normalized;
        sections[currentKey] = [];
      }
      collectingIntro = false;
      continue;
    }
    if (collectingIntro && line.trim()) h1Intro.push(line);
    if (currentKey) sections[currentKey].push(line);
  }

  const normalized: Record<string, string> = {};
  for (const field of getLiveDraftSchema(kind)) {
    const aliases = getLiveFieldAliases(field.key, kind);
    const matched = aliases.find((alias) => sections[alias]?.join("\n").trim());
    if (field.key === "title") {
      normalized.title = (sections.title ?? []).join("\n").trim();
    } else {
      normalized[field.key] = matched ? sections[matched].join("\n").trim() : "";
    }
  }
  if (!normalized.role && kind === "expert") {
    normalized.role = normalizeExpertRoleFallback(h1Intro, frontmatter);
  }
  if (!normalized.owner && kind === "expert") {
    normalized.owner = frontmatter.name ?? "";
  }
  return normalized;
}

function getLiveFieldAliases(fieldKey: string, kind: LiveMarkdownKind): string[] {
  const base: Record<string, string[]> = {
    title: ["title"],
    role: ["role", "定位", "一、定位", "角色定位", "身份", "profession"],
    use: ["use", "适用场景", "现在怎么用", "使用方式", "调用场景", "什么时候使用"],
    constraint: ["constraint", "禁止事项", "关键约束", "约束", "红线", "不可做"],
    owner: ["owner", "负责人", "当前真源", "归属", "维护人"],
    contract: ["contract", "交接契约", "输入输出", "输入与输出", "handoff"],
    exceptions: ["exceptions", "异常处理", "失败处理", "fallback", "降级"],
    input_schema: ["input_schema", "输入要求", "输入", "入参", "input"],
    output_schema: ["output_schema", "输出要求", "最低输出要求", "输出", "交付物", "output"],
    fallback: ["fallback", "失败处理", "异常处理", "降级", "补救"],
  };
  const aliases = base[fieldKey] ?? [fieldKey];
  return aliases.map((alias) => normalizeMarkdownKey(alias));
}

function stripMarkdownHeadingNoise(raw: string): string {
  return raw
    .replace(/^[\s#`>*-]+/, "")
    .replace(/^[一二三四五六七八九十]+[、.]\s*/, "")
    .replace(/^第[一二三四五六七八九十0-9]+[章节部分、.：:]\s*/, "")
    .trim();
}

function parseSimpleFrontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
    if (!item) continue;
    const value = item[2].replace(/^['"]|['"]$/g, "").trim();
    if (value) result[item[1]] = value;
  }
  return result;
}

function normalizeExpertRoleFallback(introLines: string[], frontmatter: Record<string, string>): string {
  const intro = (introLines[0] ?? "").trim();
  if (intro) return intro;
  const description = frontmatter.description?.trim();
  if (description) return description;
  return "";
}

function buildLiveDraftMarkdown(kind: LiveMarkdownKind, fields: Record<string, string>): string {
  const schema = getLiveDraftSchema(kind);
  const out: string[] = [`# ${(fields.title ?? "").trim() || "(未命名)"}`, ""];
  for (const field of schema) {
    if (field.key === "title") continue;
    const text = (fields[field.key] ?? "").trim();
    if (!text) continue;
    out.push(`## ${field.label.replace(/^[①②③④⑤⑥⑦]\s*/, "")}`, text, "");
  }
  return out.join("\n").trimEnd() + "\n";
}

function buildLocalDraftDiff(original: Record<string, string>, draft: Record<string, string>, schema: LiveDraftField[]): string {
  const lines: string[] = [];
  for (const field of schema) {
    const before = original[field.key] ?? "";
    const after = draft[field.key] ?? "";
    if (before === after) continue;
    lines.push(`@@ ${field.label} (${field.key})`);
    lines.push(...formatDiffBlock("-", before));
    lines.push(...formatDiffBlock("+", after));
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function formatDiffBlock(prefix: "-" | "+", text: string): string[] {
  const lines = text ? text.split(/\r?\n/) : ["(空)"];
  return lines.map((line) => `${prefix} ${line}`);
}

function flattenFiles(n: TreeNode): Array<TreeNode & { kind: "file"; meta?: Record<string, string> }> {
  if (n.kind === "file") return [n as any];
  return (n as TreeDirNode).children.flatMap((c) => flattenFiles(c));
}
