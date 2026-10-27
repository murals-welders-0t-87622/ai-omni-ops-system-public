"use client";

import Link from "next/link";
import OpenClawInstallationPanel, { snippetTabs, type SnippetTabKey } from "../../../components/openclaw-installation-panel";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  ChevronDown as ChevronDownIcon,
  ExternalLink,
  Globe,
  Handshake,
  Home,
  MapPin,
  Puzzle,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { readAuthSession } from "../../../services/auth";
import {
  getMyThirdPartyPlatforms,
  getMyThirdPartyPlatformRuntimeAccess,
  updateMyThirdPartyPlatformSecret,
  type GetMyThirdPartyPlatformsResponse,
  type MyThirdPartyPlatformRuntimeAccessRecord,
  type UserThirdPartyPlatformRecord,
} from "../../../services/personal-center";
import {
  downloadAIControlCenterSkillPackage,
  getAIControlCenterInstallationWorkspace,
  revealAIControlCenterInstallToken,
  revokeAIControlCenterInstallToken,
  rotateAIControlCenterInstallToken,
  type AIControlCenterInstallWorkspace,
} from "../../../services/openclaw";
import { formatCollaboratorRoleLabel, formatDateTime, isAuthFailure } from "../../(dashboard)/personal-center/route-helpers";
import GatewayEvidencePanel from "./GatewayEvidencePanel.client";

// D152 锚定：A 层 7 大业务 Tab
const A_BUSINESS_TABS = [
  { slug: "brand-control", label: "全局概览", icon: Home, hint: "全域 KPI / 进度 / 最近动作汇总" },
  { slug: "brand-growth",  label: "品牌增长", icon: TrendingUp, hint: "资料库 / IP / 产品 / 增长报告" },
  { slug: "content-customer", label: "内容获客", icon: Target, hint: "3 大平台创作流" },
  { slug: "geo-customer", label: "GEO 获客", icon: MapPin, hint: "SEO / 同城 / 关键词挖掘" },
  { slug: "omni-channel", label: "全网获客", icon: Globe, hint: "评论 / 竞品 / 线索池 CB 端去重" },
  { slug: "ad-traffic", label: "投流获客", icon: Banknote, hint: "腾讯 / 字节创意投放" },
  { slug: "daren-collab", label: "达人合作", icon: Handshake, hint: "匹配跟踪评估" },
] as const;

type ApisTabKey = "third-party" | "openclaw";

/* ------------------------------ helpers ------------------------------ */
type PlatformDraft = { apiKey: string; baseUrl: string; mobile: string; password: string };
const platformStatusLabelMap: Record<UserThirdPartyPlatformRecord["status"], string> = {
  ACTIVE: "启用中", DRAFT: "草稿", DISABLED: "已停用",
};
const runtimeAccessStatusLabelMap: Record<MyThirdPartyPlatformRuntimeAccessRecord["status"], string> = {
  resolved: "可直用",
  "brand-api-key-missing": "未就绪",
};

function normalizeString(v: unknown) { return typeof v === "string" ? v : String(v || ""); }
function normalizeStringArray(v: unknown) { return Array.isArray(v) ? v.map(x => normalizeString(x).trim()).filter(Boolean) : []; }
function normalizeDynamicStats(v: unknown): UserThirdPartyPlatformRecord["dynamicStats"] {
  if (!v || typeof v !== "object") return undefined;
  const r = v as Record<string, unknown>;
  const s = r.status;
  if (s !== "ready" && s !== "partial" && s !== "missing_credential" && s !== "error") return undefined;
  return {
    status: s, templateCount: typeof r.templateCount === "number" ? r.templateCount : undefined,
    customPersonCount: typeof r.customPersonCount === "number" ? r.customPersonCount : undefined,
    tagCount: typeof r.tagCount === "number" ? r.tagCount : undefined,
    syncedAt: normalizeString(r.syncedAt || "").trim() || undefined,
    message: normalizeString(r.message || "").trim() || undefined,
  };
}
function normalizePlatformRecord(p: unknown): UserThirdPartyPlatformRecord | null {
  if (!p || typeof p !== "object") return null;
  const r = p as Record<string, unknown>;
  const id = normalizeString(r.id).trim(), name = normalizeString(r.name).trim();
  if (!id || !name) return null;
  const pt = r.providerType, st = r.status;
  return {
    id, name,
    providerType: (pt === "OPENAI" || pt === "GEMINI" || pt === "DOUBAO" || pt === "CUSTOM") ? pt : "CUSTOM",
    status: (st === "ACTIVE" || st === "DISABLED" || st === "DRAFT") ? st : "DRAFT",
    baseUrl: normalizeString(r.baseUrl).trim(),
    websiteUrl: normalizeString(r.websiteUrl).trim() || normalizeString(r.baseUrl).trim(),
    tutorialUrl: normalizeString(r.tutorialUrl).trim(),
    modelIds: normalizeStringArray(r.modelIds), defaultModel: normalizeString(r.defaultModel).trim(),
    remark: normalizeString(r.remark).trim(), updatedAt: normalizeString(r.updatedAt).trim(),
    apiKey: normalizeString(r.apiKey),
    hasApiKey: Boolean(r.hasApiKey),
    effectiveApiKeyMasked: normalizeString(r.effectiveApiKeyMasked).trim() || "未设置",
    dynamicStats: normalizeDynamicStats(r.dynamicStats),
  };
}
function normalizePlatformResponse(x: GetMyThirdPartyPlatformsResponse): GetMyThirdPartyPlatformsResponse {
  const platforms = Array.isArray(x?.platforms) ? x.platforms.map(normalizePlatformRecord).filter(Boolean) as UserThirdPartyPlatformRecord[] : [];
  return { brandId: normalizeString(x?.brandId).trim(), role: normalizeString(x?.role).trim(), canManage: Boolean(x?.canManage), platforms };
}
function isRuanwenjiePlatform(p?: UserThirdPartyPlatformRecord) {
  const s = [p?.name, p?.baseUrl, p?.tutorialUrl, p?.remark].join(" ").toLowerCase();
  return s.includes("api.kol.cn") || s.includes("ruanwenjie") || s.includes("软文街");
}
function parsePlatformDraft(p: UserThirdPartyPlatformRecord): PlatformDraft {
  if (!isRuanwenjiePlatform(p)) return { apiKey: p.apiKey || "", baseUrl: p.baseUrl || "", mobile: "", password: "" };
  try { const payload = typeof p.apiKey === "string" && p.apiKey ? JSON.parse(p.apiKey) as Record<string, string> : {}; return { apiKey: normalizeString(payload.apiKey), baseUrl: normalizeString(payload.baseUrl), mobile: normalizeString(payload.mobile), password: normalizeString(payload.password) }; } catch { return { apiKey: "", baseUrl: "", mobile: "", password: "" }; }
}
function buildPlatformSecretPayload(p: UserThirdPartyPlatformRecord, d: PlatformDraft) {
  if (!isRuanwenjiePlatform(p)) return (d.apiKey || "").trim();
  try { return JSON.stringify({ apiKey: d.apiKey?.trim() || "", baseUrl: d.baseUrl?.trim() || "", mobile: d.mobile?.trim() || "", password: d.password?.trim() || "" }); } catch { return ""; }
}
function computePlatformReadout(p?: UserThirdPartyPlatformRecord) {
  if (!p) return "-";
  if (p.dynamicStats?.status === "ready") return `${p.dynamicStats.tagCount ?? 0} 条资源已同步`;
  if (p.dynamicStats?.status === "missing_credential") return "待配置凭证";
  if (p.dynamicStats?.status === "partial" || p.dynamicStats?.status === "error") return p.dynamicStats.message || "-";
  return p.defaultModel || "-";
}
function getConfiguredBadgeLabel(platform: UserThirdPartyPlatformRecord) {
  return isRuanwenjiePlatform(platform)
    ? (platform.hasApiKey || platform.apiKey ? "已配置凭证" : "未配置凭证")
    : (platform.hasApiKey || platform.apiKey ? "已配置 Key" : "未配置 Key");
}
function getConfiguredBadgeClass(platform: UserThirdPartyPlatformRecord) {
  if (platform.hasApiKey || platform.apiKey) {
    return platform.status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
      : platform.status === "DRAFT"
        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
        : "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
  return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
}
function matchRuntimeAccess(
  platform: UserThirdPartyPlatformRecord | undefined,
  items: MyThirdPartyPlatformRuntimeAccessRecord[],
) {
  if (!platform) return undefined;
  return items.find(item => item.platformId === platform.id || item.aliasIds.includes(platform.id));
}
function getRuntimeAccessBadgeClass(runtimeAccess?: MyThirdPartyPlatformRuntimeAccessRecord) {
  if (!runtimeAccess) return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
  if (runtimeAccess.openClawCanUse && runtimeAccess.resolvedFrom === "brand") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }
  if (runtimeAccess.openClawCanUse && runtimeAccess.resolvedFrom === "local-env") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  }
  return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
}
function getRuntimeAccessHint(runtimeAccess?: MyThirdPartyPlatformRuntimeAccessRecord) {
  if (!runtimeAccess) return "当前还没有拿到 AI 智控中心 运行时判定。";
  if (runtimeAccess.openClawCanUse && runtimeAccess.resolvedFrom === "brand") {
    return "品牌共享 Key 已能被 AI 智控中心 直接使用，MCP/Skill 调用会优先走品牌配置。";
  }
  if (runtimeAccess.openClawCanUse && runtimeAccess.resolvedFrom === "local-env") {
    return "当前可直用，但来源是本地环境兜底，不是品牌正式配置；正式交付前仍应补品牌共享 Key。";
  }
  return "当前品牌还没有把这项能力配置到可直用状态，网站页面能看到平台卡片，不代表 AI 智控中心 已能稳定调用。";
}

const TOKEN_PLACEHOLDER = "请先生成安装令牌";
const INSTALL_TOKEN_SESSION_PREFIX = "openclaw-install-token";
function buildInstallTokenSessionKey(brandId: string, tokenId: string) { return `${INSTALL_TOKEN_SESSION_PREFIX}:${brandId}:${tokenId}`; }
function readInstallTokenFromSession(brandId?: string, tokenId?: string) { if (!brandId || !tokenId || typeof window === "undefined") return ""; return window.sessionStorage.getItem(buildInstallTokenSessionKey(brandId, tokenId)) || ""; }
function writeInstallTokenToSession(brandId?: string, tokenId?: string, raw?: string) { if (!brandId || !tokenId || !raw || typeof window === "undefined") return; window.sessionStorage.setItem(buildInstallTokenSessionKey(brandId, tokenId), raw); }
function removeInstallTokenFromSession(brandId?: string, tokenId?: string) { if (!brandId || !tokenId || typeof window === "undefined") return; window.sessionStorage.removeItem(buildInstallTokenSessionKey(brandId, tokenId)); }
function EyeOpenIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg>); }
function EyeClosedIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.7a3 3 0 0 0 4.2 4.2"/><path d="M9.9 5.1A12.5 12.5 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-4 4.9"/><path d="M6.7 6.7C3.7 8.6 2 12 2 12a18.8 18.8 0 0 0 5 5.7"/></svg>); }
function buildVisibleSnippet(snippet: string, rawToken: string, visible: boolean) {
  if (!rawToken) return snippet;
  const full = `Bearer ${rawToken}`, placeholder = `Bearer ${TOKEN_PLACEHOLDER}`;
  return visible ? snippet.replaceAll(placeholder, full) : snippet.replaceAll(full, placeholder);
}

/* D153 永久锚定：apis 独立页不复用 PanelWorkspaceShell（md 编辑壳），
   直接真实渲染双 Tab，所有服务调用 100% 复用 personal-center 原始 REST，
   仅剥离其 useEffect 内置跳 /login 逻辑，改由当前页面统一管理会话。*/
export default function AiControlApisPage() {
  const router = useRouter();
  const [tab, setTab] = useState<ApisTabKey>("third-party");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function onSessionExpiredHint() {
    setErrorMessage("当前登录态已过期，请刷新页面或点击右上角重新登录。");
  }

  /* ---------- Tab1: ThirdPartyPlatforms（真实服务，无 redirect） ---------- */
  const [platforms, setPlatforms] = useState<UserThirdPartyPlatformRecord[]>([]);
  const [runtimeAccessList, setRuntimeAccessList] = useState<MyThirdPartyPlatformRuntimeAccessRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PlatformDraft>>({});
  const [selectedPlatformId, setSelectedPlatformId] = useState("");
  const [search, setSearch] = useState("");
  const [tpRole, setTpRole] = useState("");
  const [gatewayBrandId, setGatewayBrandId] = useState("brand-demo-cleaning");
  const [canManageTp, setCanManageTp] = useState(false);
  const [isLoadingTp, setIsLoadingTp] = useState(true);
  const [savingPlatformId, setSavingPlatformId] = useState("");

  useEffect(() => {
    void loadPlatforms();
  }, []);

  useEffect(() => { if (!selectedPlatformId && platforms.length) setSelectedPlatformId(platforms[0].id); }, [platforms, selectedPlatformId]);

  const filteredPlatforms = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return platforms.filter(p => {
      if (!kw) return true;
      return [p.name, p.baseUrl, p.websiteUrl, p.defaultModel, p.modelIds.join(" "), p.remark].join(" ").toLowerCase().includes(kw);
    });
  }, [platforms, search]);

  useEffect(() => {
    if (!filteredPlatforms.length) return;
    if (!filteredPlatforms.find(x => x.id === selectedPlatformId)) setSelectedPlatformId(filteredPlatforms[0]?.id || "");
  }, [filteredPlatforms, selectedPlatformId]);

  const selectedPlatform = useMemo(() => platforms.find(x => x.id === selectedPlatformId) ?? filteredPlatforms[0] ?? platforms[0], [filteredPlatforms, platforms, selectedPlatformId]);
  const selectedRuntimeAccess = useMemo(() => matchRuntimeAccess(selectedPlatform, runtimeAccessList), [runtimeAccessList, selectedPlatform]);
  const runtimeAccessSummary = useMemo(() => {
    const readyCount = runtimeAccessList.filter(item => item.openClawCanUse).length;
    const brandReadyCount = runtimeAccessList.filter(item => item.openClawCanUse && item.resolvedFrom === "brand").length;
    const fallbackCount = runtimeAccessList.filter(item => item.openClawCanUse && item.resolvedFrom === "local-env").length;
    const blockedCount = runtimeAccessList.filter(item => !item.openClawCanUse).length;
    return { readyCount, brandReadyCount, fallbackCount, blockedCount };
  }, [runtimeAccessList]);
  const selectedDraft = selectedPlatform ? drafts[selectedPlatform.id] : undefined;
  const serializedSelectedDraft = selectedPlatform && selectedDraft ? buildPlatformSecretPayload(selectedPlatform, selectedDraft) : "";
  const isDirty = selectedPlatform && selectedDraft ? serializedSelectedDraft !== selectedPlatform.apiKey : false;

  async function loadPlatforms() {
    setIsLoadingTp(true); setNotice(""); setErrorMessage("");
    const r = await Promise.allSettled([getMyThirdPartyPlatforms(), getMyThirdPartyPlatformRuntimeAccess()]);
    if ((r[0].status === "rejected" && isAuthFailure(r[0].reason)) || (r[1].status === "rejected" && isAuthFailure(r[1].reason))) { onSessionExpiredHint(); setIsLoadingTp(false); return; }
    if (r[0].status === "fulfilled") applyPlatformResponse(r[0].value);
    else { setPlatforms([]); setDrafts({}); setSelectedPlatformId(""); setTpRole(""); setCanManageTp(false); setErrorMessage(r[0].reason instanceof Error ? r[0].reason.message : "加载失败"); }
    if (r[1].status === "fulfilled") setRuntimeAccessList(r[1].value);
    else setRuntimeAccessList([]);
    setIsLoadingTp(false);
  }
  function applyPlatformResponse(x: GetMyThirdPartyPlatformsResponse) {
    const n = normalizePlatformResponse(x);
    setPlatforms(n.platforms);
    setDrafts(Object.fromEntries(n.platforms.map(p => [p.id, parsePlatformDraft(p)])) as Record<string, PlatformDraft>);
    setSelectedPlatformId(cur => cur || n.platforms[0]?.id || "");
    setGatewayBrandId(n.brandId || "brand-demo-cleaning");
    setTpRole(n.role || ""); setCanManageTp(Boolean(n.canManage));
  }
  async function handleSavePlatform(pid: string) {
    const p = platforms.find(x => x.id === pid); const d = drafts[pid];
    if (!p || !d || !canManageTp) return;
    if (isRuanwenjiePlatform(p) && (!d.apiKey.trim() || !d.mobile.trim() || !d.password.trim())) { setErrorMessage("保存失败：软文街需要同时填写 API Key、登录账号和登录密码"); return; }
    setSavingPlatformId(pid); setNotice(""); setErrorMessage("");
    try {
      const updated = await updateMyThirdPartyPlatformSecret(pid, { apiKey: buildPlatformSecretPayload(p, d) });
      setPlatforms(cur => cur.map(x => x.id === pid ? updated : x));
      setDrafts(cur => ({ ...cur, [pid]: parsePlatformDraft(updated) }));
      setNotice(`已保存「${updated.name}」的品牌共享配置。`);
    } catch (err) {
      if (isAuthFailure(err)) { onSessionExpiredHint(); return; }
      setErrorMessage(err instanceof Error ? err.message : "保存失败");
    } finally { setSavingPlatformId(""); }
  }

  /* ---------- Tab2: OpenClaw（真实服务，无 redirect） ---------- */
  const [workspace, setWorkspace] = useState<AIControlCenterInstallWorkspace | null>(null);
  const [rawToken, setRawToken] = useState("");
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  const [selectedSnippetTab, setSelectedSnippetTab] = useState<SnippetTabKey>("ai-control-center");
  const [isLoadingOc, setIsLoadingOc] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const activeSnippet = useMemo(() => workspace ? buildVisibleSnippet(workspace.snippetTemplates[selectedSnippetTab], rawToken, isTokenVisible) : "", [isTokenVisible, rawToken, selectedSnippetTab, workspace]);
  const displayedToken = useMemo(() => isTokenVisible && rawToken ? rawToken : (workspace?.activeToken?.tokenPreview || "未生成"), [isTokenVisible, rawToken, workspace]);

  async function loadWorkspace() {
    setIsLoadingOc(true); setNotice(""); setErrorMessage("");
    try {
      const r = await getAIControlCenterInstallationWorkspace();
      setWorkspace(r); setRawToken(readInstallTokenFromSession(r.brandId, r.activeToken?.id)); setIsTokenVisible(false);
    } catch (err) {
      if (isAuthFailure(err)) { onSessionExpiredHint(); return; }
      setErrorMessage(err instanceof Error ? err.message : "OpenClaw 加载失败");
    } finally { setIsLoadingOc(false); }
  }
  async function handleToggleTokenVisibility() {
    if (isTokenVisible) { setIsTokenVisible(false); setNotice("已隐藏完整令牌。"); return; }
    if (!rawToken && !workspace?.activeToken?.id) return;
    if (!rawToken) {
      if (!workspace?.canManage) { setErrorMessage("当前账号没有查看完整安装令牌的权限。"); return; }
      setIsRevealing(true);
      try {
        const revealed = await revealAIControlCenterInstallToken(workspace.activeToken!.id);
        writeInstallTokenToSession(workspace.brandId, revealed.tokenId, revealed.token);
        setRawToken(revealed.token);
      } catch (err) {
        if (isAuthFailure(err)) { onSessionExpiredHint(); return; }
        setErrorMessage(err instanceof Error ? err.message : "查看令牌失败"); setIsRevealing(false); return;
      } finally { setIsRevealing(false); }
    }
    setIsTokenVisible(true); setNotice("已显示完整令牌，请注意保密。");
  }
  async function handleRotateToken() {
    setIsRotating(true); setNotice(""); setErrorMessage("");
    try {
      const prevId = workspace?.activeToken?.id, prevBrand = workspace?.brandId;
      const r = await rotateAIControlCenterInstallToken({ tokenName: "AI 智控中心 正式安装令牌", expiresInDays: 30 });
      removeInstallTokenFromSession(prevBrand, prevId);
      writeInstallTokenToSession(r.workspace.brandId, r.record.id, r.token);
      setWorkspace(r.workspace); setRawToken(r.token); setIsTokenVisible(false); setSelectedSnippetTab("ai-control-center");
      setNotice("新的正式安装令牌已生成。点击眼睛按钮可查看完整令牌；当前会话内可恢复。");
    } catch (err) {
      if (isAuthFailure(err)) { onSessionExpiredHint(); return; }
      setErrorMessage(err instanceof Error ? err.message : "生成令牌失败");
    } finally { setIsRotating(false); }
  }
  async function handleRevokeToken() {
    if (!workspace?.activeToken?.id) return;
    setIsRevoking(true);
    try {
      const r = await revokeAIControlCenterInstallToken(workspace.activeToken.id);
      removeInstallTokenFromSession(workspace.brandId, workspace.activeToken.id);
      setWorkspace(r.workspace); setRawToken(""); setIsTokenVisible(false); setNotice("当前正式安装令牌已停用。");
    } catch (err) {
      if (isAuthFailure(err)) { onSessionExpiredHint(); return; }
      setErrorMessage(err instanceof Error ? err.message : "停用令牌失败");
    } finally { setIsRevoking(false); }
  }
  async function handleCopy(content: string, key: string) {
    try { await navigator.clipboard.writeText(content); setCopiedKey(key); setNotice("已复制到剪贴板。"); window.setTimeout(() => setCopiedKey(cur => cur === key ? "" : cur), 1600); } catch { setErrorMessage("复制失败，请手动复制。"); }
  }
  async function handleDownloadSkill() {
    const path = workspace?.skillInstall?.downloadPath;
    if (!path) { setErrorMessage("当前没有可下载的 Skill ZIP。"); return; }
    setIsDownloading(true);
    try {
      const { blob, fileName } = await downloadAIControlCenterSkillPackage(path);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName || workspace?.skillInstall?.fileName || "brand-operator-skill.zip";
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      setNotice("Skill 压缩包已开始下载。");
    } catch (err) { setErrorMessage(err instanceof Error ? err.message : "下载失败"); }
    finally { setIsDownloading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-6 lg:px-8">
        {/* D152 顶部面包屑 + 返回业务驾驶舱下拉 */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/ai-control" className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700">
              <Puzzle className="h-4 w-4" /> AI 智控中心
            </Link>
            <span className="text-slate-300">›</span>
            <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 ring-1 ring-indigo-100">
              ③ 接口与连接器配置
            </span>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/tabs/brand-control" className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200/60 bg-indigo-50 px-2.5 py-1.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100">
              <Home className="h-4 w-4" /> 品牌总控 ▶
            </Link>
            <div className="group relative">
              <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                返回业务驾驶舱 <ChevronDownIcon className="h-4 w-4 opacity-60" />
              </button>
              <div className="pointer-events-none absolute right-0 z-50 mt-2 hidden w-[340px] origin-top-right rounded-2xl border border-slate-200 bg-white p-3 opacity-0 shadow-2xl ring-1 ring-black/5 transition duration-150 group-hover:pointer-events-auto group-hover:block group-hover:opacity-100">
                <div className="mb-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">A 层 6 大业务板块</div>
                <div className="space-y-1">
                  {A_BUSINESS_TABS.map(t => {
                    const Icon = t.icon;
                    return (
                      <Link key={t.slug} href={`/tabs/${t.slug}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-indigo-50">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-800">{t.label}</div>
                          <div className="truncate text-xs text-slate-500">{t.hint}</div>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                <Puzzle className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">③ 接口与连接器配置</h1>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">219 MCP 工具</span>
                  {canManageTp || workspace?.canManage ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">管理员 · 可维护品牌级密钥</span>
                  ) : (
                    <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">只读 · 查看当前品牌配置</span>
                  )}
                </div>
                <p className="max-w-3xl text-sm leading-relaxed text-slate-500">
                  按平台查看第三方平台链接、大模型 ID 和说明文档；拥有权限的成员可维护品牌共享 API Key。
                  正式环境使用品牌级安装令牌 + MCP 接入地址，成员复制配置即可完成 WorkBuddy / 豆包工作 / 千问办公 / Codex 等客户端接入。
                </p>
                {notice ? <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">💡 {notice}</p> : null}
                {errorMessage ? <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 ring-1 ring-rose-100">⚠️ {errorMessage}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">4 目录 · 3 文件 · 深度 3</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">工作区 clean（可安全写盘）</span>
            </div>
          </div>
        </div>

        {/* D153 双 Tab 真实合并 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-1.5 ring-1 ring-slate-200/70">
            <button type="button" onClick={() => setTab("third-party")} className={`flex-1 min-w-[200px] rounded-lg px-4 py-2.5 text-sm font-semibold transition ${tab === "third-party" ? "bg-white text-indigo-700 shadow ring-1 ring-indigo-200/80" : "text-slate-600 hover:bg-white/70 hover:text-slate-800"}`}>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-[11px] font-bold text-indigo-700">1</span>
              第三方接口配置 <span className="ml-2 text-xs font-normal opacity-70">{platforms.length} 平台 · 保存品牌共享 Key</span>
            </button>
            <button type="button" onClick={() => setTab("openclaw")} className={`flex-1 min-w-[200px] rounded-lg px-4 py-2.5 text-sm font-semibold transition ${tab === "openclaw" ? "bg-white text-violet-700 shadow ring-1 ring-violet-200/80" : "text-slate-600 hover:bg-white/70 hover:text-slate-800"}`}>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 text-[11px] font-bold text-violet-700">2</span>
              OpenClaw 安装 <span className="ml-2 text-xs font-normal opacity-70">重置令牌 · {snippetTabs.length} 客户端 Snippet</span>
            </button>
          </div>

          {/* Tab 1 */}
          {tab === "third-party" ? (
            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">第三方平台配置</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{tpRole ? `当前角色：${tpRole}　·　` : ""}共 {platforms.length} 个平台，可按名称/Base URL/备注搜索。</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索平台名称、Base URL、模型 ID、备注"
                      className="w-80 rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none ring-1 ring-slate-100 focus:border-indigo-300 focus:ring-indigo-100" />
                  </div>
                  <button type="button" onClick={() => void loadPlatforms()} disabled={isLoadingTp} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <RefreshCw className={`h-4 w-4 ${isLoadingTp ? "animate-spin" : ""}`} /> 刷新配置
                  </button>
                </div>
              </div>


              <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">平台总数</div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900">{platforms.length}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">AI 智控可直用</div>
                  <div className="mt-1 text-2xl font-extrabold text-emerald-700">{runtimeAccessSummary.readyCount}</div>
                  <p className="mt-1 text-xs text-emerald-700/80">其中品牌正式配置 {runtimeAccessSummary.brandReadyCount} 个</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">本机兜底</div>
                  <div className="mt-1 text-2xl font-extrabold text-amber-700">{runtimeAccessSummary.fallbackCount}</div>
                  <p className="mt-1 text-xs text-amber-700/80">能跑但不等于正式品牌配置</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">仍未就绪</div>
                  <div className="mt-1 text-2xl font-extrabold text-rose-700">{runtimeAccessSummary.blockedCount}</div>
                  <p className="mt-1 text-xs text-rose-700/80">需补品牌共享 Key 或检查接入来源</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
                <div className="max-h-[620px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2 space-y-1.5">
                  {isLoadingTp ? <p className="p-6 text-center text-sm text-slate-400">正在加载平台配置...</p> : null}
                  {isLoadingTp ? <p className="p-6 text-center text-sm text-slate-400">正在加载平台配置...</p> : null}
                  {!isLoadingTp && !filteredPlatforms.length ? <p className="p-6 text-center text-sm text-slate-400">暂无可展示的平台配置（{search ? "尝试清空搜索关键字" : "当前品牌未配置平台"}）</p> : null}
                  {filteredPlatforms.map(p => {
                    const active = p.id === selectedPlatformId;
                    return (
                      <button key={p.id} type="button" onClick={() => setSelectedPlatformId(p.id)}
                        className={`w-full text-left rounded-lg border p-3 transition ${active ? "border-indigo-300 bg-white shadow-sm ring-2 ring-indigo-100" : "border-transparent bg-white/80 hover:bg-white hover:shadow-sm"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{p.name}</div>
                            <div className="mt-0.5 text-[11px] text-slate-500">平台类型：{p.providerType} · {platformStatusLabelMap[p.status]}</div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${getConfiguredBadgeClass(p)}`}>
                            {getConfiguredBadgeLabel(p)}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500 line-clamp-2">{computePlatformReadout(p)}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRuntimeAccessBadgeClass(matchRuntimeAccess(p, runtimeAccessList))}`}>
                            AI 智控 {runtimeAccessStatusLabelMap[matchRuntimeAccess(p, runtimeAccessList)?.status || "brand-api-key-missing"]}
                          </span>
                          {matchRuntimeAccess(p, runtimeAccessList)?.resolvedFrom === "local-env" ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-100">local-env</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  {selectedPlatform ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold text-slate-900 truncate">{selectedPlatform.name}</h3>
                          <p className="text-sm text-slate-500 mt-1">当前正在维护「{selectedPlatform.name}」的品牌共享配置。可以在这里校验配置、默认模型和说明文档，再按需更新。</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {selectedPlatform.websiteUrl ? (
                            <Link href={selectedPlatform.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              <ExternalLink className="h-3.5 w-3.5" /> 打开第三方平台
                            </Link>
                          ) : null}
                          {selectedPlatform.tutorialUrl ? (
                            <Link href={selectedPlatform.tutorialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              <ShieldCheck className="h-3.5 w-3.5" /> 打开说明文档
                            </Link>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">模型数</div>
                          <div className="mt-1 text-xl font-extrabold text-indigo-700">{selectedPlatform.modelIds.length}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">默认模型</div>
                          <div className="mt-1 text-sm font-bold text-slate-800 truncate">{selectedPlatform.defaultModel || "未设置"}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 md:col-span-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">最近同步</div>
                          <div className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(selectedPlatform.updatedAt)}</div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-slate-900">AI 智控运行时判定</div>
                            <p className="mt-1 text-xs text-slate-500">{getRuntimeAccessHint(selectedRuntimeAccess)}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getRuntimeAccessBadgeClass(selectedRuntimeAccess)}`}>
                            {selectedRuntimeAccess ? `AI 智控 ${runtimeAccessStatusLabelMap[selectedRuntimeAccess.status]}` : "判定暂缺"}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">接入来源</div>
                            <div className="mt-1 text-sm font-bold text-slate-800">
                              {selectedRuntimeAccess?.resolvedFrom === "brand" ? "品牌共享 Key" : selectedRuntimeAccess?.resolvedFrom === "local-env" ? "本机环境兜底" : "未解析"}
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">生效凭证</div>
                            <div className="mt-1 text-sm font-bold text-slate-800">{selectedRuntimeAccess?.effectiveApiKeyMasked || "未配置"}</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">基础动作</div>
                            <div className="mt-1 text-sm font-bold text-slate-800">
                              {selectedRuntimeAccess?.openClawCanUse ? "可被 AI 智控中心 调用" : "先补密钥再排查"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <GatewayEvidencePanel brandId={gatewayBrandId} platform={selectedPlatform} />

                      <div className="space-y-3">
                        {isRuanwenjiePlatform(selectedPlatform) ? (
                          <>
                            <div>
                              <label className="text-xs font-semibold text-slate-600 block mb-1">API Key（必填）</label>
                              <input value={selectedDraft?.apiKey || ""} onChange={e => setDrafts(c => ({ ...c, [selectedPlatform.id]: { ...(c[selectedPlatform.id] ?? selectedDraft), apiKey: e.target.value } }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" placeholder="填写软文街平台 API Key" />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-600 block mb-1">登录账号/手机号（必填）</label>
                              <input value={selectedDraft?.mobile || ""} onChange={e => setDrafts(c => ({ ...c, [selectedPlatform.id]: { ...(c[selectedPlatform.id] ?? selectedDraft), mobile: e.target.value } }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" placeholder="填写软文街登录账号" />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-600 block mb-1">登录密码（必填）</label>
                              <input type="password" value={selectedDraft?.password || ""} onChange={e => setDrafts(c => ({ ...c, [selectedPlatform.id]: { ...(c[selectedPlatform.id] ?? selectedDraft), password: e.target.value } }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" placeholder="填写软文街登录密码" />
                            </div>
                          </>
                        ) : (
                          <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">品牌共享 API Key <span className="text-[10px] font-normal text-slate-400 ml-1">（当前显示：{selectedPlatform.effectiveApiKeyMasked}）</span></label>
                            <input value={selectedDraft?.apiKey || ""} onChange={e => setDrafts(c => ({ ...c, [selectedPlatform.id]: { ...(c[selectedPlatform.id] ?? selectedDraft), apiKey: e.target.value } }))}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 font-mono" placeholder="粘贴平台下发的 API Key（完整明文或可解析结构）" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button type="button" disabled={!canManageTp || savingPlatformId === selectedPlatform.id || !isDirty}
                          onClick={() => void handleSavePlatform(selectedPlatform.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
                          {savingPlatformId === selectedPlatform.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          保存品牌共享 API Key
                        </button>
                        {isDirty ? <span className="text-xs font-medium text-amber-700">⚠ 已修改未保存</span> : null}
                        {!canManageTp ? <span className="text-xs text-slate-500">当前角色不可维护，如需编辑请联系品牌管理员。</span> : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                      <Users className="h-12 w-12 text-slate-200" />
                      <p className="mt-3 text-sm text-slate-400">未选择平台，点击左侧任一平台查看详情并维护品牌共享 Key。</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : (
            /* Tab 2: OpenClaw */
            <OpenClawInstallationPanel workspace={workspace} rawToken={rawToken} isTokenVisible={isTokenVisible} selectedSnippetTab={selectedSnippetTab} setSelectedSnippetTab={setSelectedSnippetTab} isLoadingOc={isLoadingOc} isRotating={isRotating} isRevoking={isRevoking} isRevealing={isRevealing} isDownloading={isDownloading} copiedKey={copiedKey} activeSnippet={activeSnippet} displayedToken={displayedToken} loadWorkspace={loadWorkspace} handleRotateToken={handleRotateToken} handleRevokeToken={handleRevokeToken} handleToggleTokenVisibility={handleToggleTokenVisibility} handleCopy={handleCopy} handleDownloadSkill={handleDownloadSkill} />
          )}
        </div>
      </div>
    </div>
  );
}
