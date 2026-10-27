"use client";

import Link from "next/link";
import OceanAdsWorkspace from "../../../components/ocean-ads-workspace.client";
import {
  ArrowRight,
  Download,
  Rocket,
  Lock,
  PlayCircle,
  CheckCircle2,
  Clock,
  Eye,
  Heart,
  FileImage,
  FileText,
  FileVideo,
  Music2,
  Lightbulb,
  Home,
  Users,
  Send,
  MapPin,
  Map,
  Signal,
  Store,
  Search,
  Tag,
  Tags,
  Globe,
  Share2,
  MessageSquare,
  Hash,
  Volume2,
  BookOpen,
  Wallet,
  TrendingUp,
  Coins,
  Sparkles,
  Image as ImageIcon,
  FileSearch,
  Calendar,
  RefreshCw,
  UserCheck,
  Gift,
  Banknote,
  Star,
  Crown,
  FileHeart,
  Building2,
  Megaphone,
  Link2,
  Plus,
  Library,
  BookMarked,
  ChevronRight,
  CircleDot,
  Circle,
  Wand2,
  ArrowUpRight,
  Zap,
  Award,
  UserSearch,
  ScanEye,
  Database,
  type LucideIcon,
} from "lucide-react";
import type {
  DashboardData,
  DashboardTaskRow,
  DashboardTopMaterial,
  DashboardKpiCard,
  DashboardTimelineStage,
  DashboardChannelProgress,
  ContentSubTab,
} from "../_data";
import {
  Toast,
  Modal,
  withToast,
} from "../_data";
import { OpenClawWorkspace } from "./openclaw-workspaces";
import { Tile5Workspace, type Tile5Key } from "./5tile-workspaces";
import { WechatWorkspaceShell, type WechatSectionKey } from "../../(dashboard)/wechat/workspace-shell";
import { useState, useEffect } from "react";
import { WorkAnalysisWorkspace } from "./WorkAnalysisWorkspace.client";

import { requireCurrentBrandId } from "../../../services/auth-session";

const ICON_MAP: Record<string, LucideIcon> = {
  PlayCircle, CheckCircle2, Clock, Eye, Heart, FileImage, FileText, FileVideo,
  Music2, Lightbulb, Home, Users, Send, MapPin, Map, Signal, Store, Search,
  Tag, Globe, Share2, MessageSquare, Hash, Volume2, BookOpen, Lock, Wallet,
  TrendingUp, Coins, Rocket, Sparkles, ImageIcon, FileSearch, Calendar,
  UserCheck, Gift, Banknote, Star, Crown, FileHeart, Building2, Megaphone,
  Link2, Download, ArrowRight, Library, BookMarked, ChevronRight,
  CircleDot, Circle, Wand2, ArrowUpRight, Zap,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? FileText;
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 " +
        (tone ?? "bg-slate-50 text-slate-600 ring-slate-200")
      }
    >
      {children}
    </span>
  );
}

function renderKpi(k: DashboardKpiCard, borderAccentHover: string) {
  const Icon = resolveIcon(k.iconName);
  const gradient =
    k.gradient ??
    (k.accent?.includes("amber")
      ? "from-amber-500 to-orange-500"
      : k.accent?.includes("emerald")
        ? "from-emerald-500 to-teal-500"
        : k.accent?.includes("rose")
          ? "from-rose-500 to-pink-500"
          : k.accent?.includes("sky")
            ? "from-sky-500 to-blue-500"
            : k.accent?.includes("fuchsia")
              ? "from-fuchsia-500 to-purple-500"
              : k.accent?.includes("violet")
                ? "from-violet-500 to-indigo-500"
                : "from-indigo-500 to-violet-500");
  const accentText = k.accent ?? "text-slate-900";
  return (
    <div
      key={k.label}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderAccentHover}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] text-slate-500">{k.label}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className={`text-2xl font-extrabold leading-none ${accentText}`}>{k.value}</div>
            {k.delta ? (
              <div className="text-[11.5px] font-medium text-emerald-600">{k.delta}</div>
            ) : null}
          </div>
          <div className="mt-2 text-[12px] leading-5 text-slate-500">{k.subline}</div>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-white ${k.iconBg} ${k.iconTone}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>{k.progressLabel}</span>
          <span className="font-medium text-slate-600">{k.progressRight}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            key={k.label}
            className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
            style={{ width: `${k.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function renderChannel(c: DashboardChannelProgress, accentDot: string) {
  return (
    <div
      key={c.name}
      className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 ring-1 ring-white"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium ring-1`}
          style={{ color: "inherit" }}
        >
          <span
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${accentDot}`} /> {c.name}
          </span>
          <span className={"inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium ring-1"}>
            <span className={`h-1.5 w-1.5 rounded-full ${accentDot}`} /> {c.name}
          </span>
        </span>
        <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 " + c.tagTone}>
          {c.tag}
        </span>
      </div>
      <div className="text-[12px] leading-5 text-slate-500">{c.summary}</div>
      <div className="mt-2 text-[12px] font-medium text-slate-700">{c.metrics}</div>
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${c.accent}`}
            style={{ width: `${c.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function renderTimeline(stages: DashboardTimelineStage[], theme: string) {
  const themes: Record<string, { doing: string; done: string }> = {
    brand: { doing: "bg-gradient-to-br from-indigo-500 to-blue-600 ring-indigo-200 animate-pulse", done: "bg-emerald-500 ring-emerald-200" },
    content: { doing: "bg-gradient-to-br from-amber-500 to-orange-600 ring-amber-200 animate-pulse", done: "bg-emerald-500 ring-emerald-200" },
    geo: { doing: "bg-gradient-to-br from-emerald-500 to-teal-600 ring-emerald-200 animate-pulse", done: "bg-emerald-500 ring-emerald-200" },
    omni: { doing: "bg-gradient-to-br from-sky-500 to-indigo-600 ring-sky-200 animate-pulse", done: "bg-emerald-500 ring-emerald-200" },
    traffic: { doing: "bg-gradient-to-br from-rose-500 to-pink-600 ring-rose-200 animate-pulse", done: "bg-emerald-500 ring-emerald-200" },
    daren: { doing: "bg-gradient-to-br from-fuchsia-500 to-purple-600 ring-fuchsia-200 animate-pulse", done: "bg-emerald-500 ring-emerald-200" },
  };
  const t = themes[theme] ?? themes.brand;
  const cols = stages.length === 6 ? 6 : 5;
  return (
    <ol className={`relative grid grid-cols-5 gap-2 md:gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {stages.map((s, i) => {
        const dot =
          s.tone === "done"
            ? t.done
            : s.tone === "doing"
              ? t.doing
              : "bg-slate-300 ring-slate-200";
        return (
          <li key={s.index} className="relative">
            <div className="relative flex items-start gap-3 md:flex-col md:items-center md:gap-2 md:text-center">
              <div
                className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 text-white text-[14px] font-bold shadow-sm ${dot}`}
              >
                {s.index}
              </div>
              <div>
                <div className="mt-1 text-[13px] font-semibold text-slate-900 md:mt-2">{s.title}</div>
                <div className="mt-0.5 text-[11.5px] leading-5 text-slate-500">{s.meta}</div>
                {s.tone === "doing" ? (
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10.5px] font-medium text-indigo-700 ring-1 ring-indigo-100 md:hidden">
                    本周正在执行
                  </div>
                ) : null}
              </div>
            </div>
            {i < stages.length - 1 ? (
              <div
                aria-hidden
                className={
                  "absolute left-10 right-0 top-5 hidden h-[2px] rounded-full md:block " +
                  (s.tone === "done"
                    ? "bg-emerald-400/70"
                    : s.tone === "doing"
                      ? "bg-gradient-to-r from-indigo-400/80 to-slate-200"
                      : "bg-slate-200")
                }
                style={{ marginLeft: "calc(50% + 20px - 40px)", width: "calc(100% - 40px)" }}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function platformBadge(code: string, tone?: string) {
  return (
    <span
      className={
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12px] font-bold " +
        (tone ?? "bg-slate-200 text-slate-700")
      }
    >
      {code}
    </span>
  );
}

function statusBadge(status: string, tone: string) {
  const icon =
    status === "已发布" ? (
      <CheckCircle2 className="mr-1 h-3 w-3" />
    ) : status === "创作中" || status.startsWith("触达") ? (
      <Clock className="mr-1 h-3 w-3" />
    ) : null;
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 " + tone
      }
    >
      {icon}
      {status}
    </span>
  );
}

function renderTaskRow(r: DashboardTaskRow, type: string, i: number) {
  const striped = i % 2 === 0 ? "bg-white" : "bg-slate-50/30";
  if (type === "recentWorks") {
    return (
      <tr key={r.id} className={striped}>
        <td className="border-b border-slate-100 px-4 py-3">
          {platformBadge(r.platform ?? "", r.platformTone)}
        </td>
        <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">{r.title}</td>
        <td className="border-b border-slate-100 px-4 py-3">{statusBadge(r.status, r.statusTone)}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-right text-slate-600">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 text-slate-400" /> {r.views ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-rose-400" /> {r.likes ?? "—"}
            </span>
          </div>
        </td>
        <td className="border-b border-slate-100 px-4 py-3 text-right text-slate-500">{r.date}</td>
      </tr>
    );
  }
  if (type === "pipelineTasks") {
    return (
      <tr key={r.id} className={striped}>
        <td className="border-b border-slate-100 px-4 py-3 font-mono text-[11.5px] text-indigo-700">{r.id}</td>
        <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">{r.title}</td>
        <td className="border-b border-slate-100 px-4 py-3">
          {platformBadge(r.platform ?? "", r.platformTone)}
        </td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-600">{r.stage}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-500">{r.owner}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-500">{r.eta}</td>
        <td className="border-b border-slate-100 px-4 py-3">{statusBadge(r.status, r.statusTone)}</td>
      </tr>
    );
  }
  if (type === "geoLeads") {
    return (
      <tr key={r.id} className={striped}>
        <td className="border-b border-slate-100 px-4 py-3 font-mono text-[11.5px] text-emerald-700">{r.id}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-700">{r.city}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-700">{r.store}</td>
        <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">{r.lead}</td>
        <td className="border-b border-slate-100 px-4 py-3">{platformBadge(r.platform ?? r.source ?? "", r.tone)}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-700">{r.score}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-500">{r.eta}</td>
        <td className="border-b border-slate-100 px-4 py-3">{statusBadge(r.status, r.statusTone)}</td>
      </tr>
    );
  }
  if (type === "crossPosts") {
    return (
      <tr key={r.id} className={striped}>
        <td className="border-b border-slate-100 px-4 py-3 font-mono text-[11.5px] text-sky-700">{r.id}</td>
        <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">{r.title}</td>
        <td className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {(r.platforms ?? []).map((p: { code: string; tone: string }, idx: number) => (
              <span key={idx}>{platformBadge(p.code, p.tone)}</span>
            ))}
          </div>
        </td>
        <td className="border-b border-slate-100 px-4 py-3">{statusBadge(r.status, r.statusTone)}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-right text-slate-600">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 text-slate-400" /> {r.views ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-rose-400" /> {r.likes ?? "—"}
            </span>
          </div>
        </td>
        <td className="border-b border-slate-100 px-4 py-3 text-right text-slate-500">{r.published}</td>
      </tr>
    );
  }
  if (type === "plans") {
    return (
      <tr key={r.id} className={striped}>
        <td className="border-b border-slate-100 px-4 py-3 font-mono text-[11.5px] text-rose-700">{r.id}</td>
        <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">{r.plan ?? r.title}</td>
        <td className="border-b border-slate-100 px-4 py-3">{platformBadge(r.channel ?? "", r.channelTone)}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-700">{r.budget}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-600">{r.audience}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-600">{r.target}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-500">{r.eta}</td>
        <td className="border-b border-slate-100 px-4 py-3">{statusBadge(r.status, r.statusTone)}</td>
      </tr>
    );
  }
  if (type === "partners") {
    return (
      <tr key={r.id} className={striped}>
        <td className="border-b border-slate-100 px-4 py-3 font-mono text-[11.5px] text-fuchsia-700">{r.id}</td>
        <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">{r.name}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-700">{r.fans}</td>
        <td className="border-b border-slate-100 px-4 py-3">{platformBadge(r.platform ?? "", r.tone)}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-600">{r.sku}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-600">{r.terms}</td>
        <td className="border-b border-slate-100 px-4 py-3 text-[12px] text-slate-500">{r.eta}</td>
        <td className="border-b border-slate-100 px-4 py-3">{statusBadge(r.status, r.statusTone)}</td>
      </tr>
    );
  }
  return null;
}

function renderTopMaterial(m: DashboardTopMaterial, i: number) {
  const Icon = resolveIcon(m.iconName);
  return (
    <li
      key={i}
      className="group flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/40 p-3 ring-1 ring-white hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white transition"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-white ${m.iconBg} ${m.iconTone}`}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-[12.5px] font-medium text-slate-800">{m.name}</div>
          <div className={`shrink-0 text-[11.5px] font-semibold ${m.accent ?? "text-indigo-700"}`}>{m.reuse}</div>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-slate-500">{m.tagLine}</div>
      </div>
    </li>
  );
}

export function DashboardRenderer({
  data,
  source,
  fetchError,
  theme,
  tabSlug,
}: {
  data: DashboardData | null;
  source: "loading" | "sqlite" | "static";
  fetchError?: string | null;
  theme: "brand" | "content" | "geo" | "omni" | "traffic" | "daren";
  tabSlug: string;
}) {
  const [toast, setToast] = useState<{ visible: boolean; message: string; tone: "success" | "error" | "info" | "warn" }>({    visible: false,
    message: "",
    tone: "info",
  });
  const [permissionOpen, setPermissionOpen] = useState(false);

  const triggerLaunch = withToast(
    async () => {
      if (tabSlug === "ad-traffic" || tabSlug === "daren-collab") {
        setPermissionOpen(true);
        return;
      }
      throw new Error("请在当前品牌的具体平台创建任务");

    },
    setToast,
    tabSlug === "ad-traffic"
      ? "已打开 R07 权限申请面板（真实API待专项授权）"
      : tabSlug === "daren-collab"
        ? "已打开 R08 权限申请面板（真实API待专项授权）"
        : "自动化任务已提交至专家团，后台 P 系列流水线启动中…",
    "提交失败",
  );

  const triggerExport = withToast(
    async () => {
      const resp = await fetch(`/api/report/${tabSlug}`, { headers: { "x-report-client": "nextjs-tabs" } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const disposition = resp.headers.get("content-disposition") ?? "";
      const m = disposition.match(/filename="?([^"]+)"?/);
      const filename = m?.[1] ?? `${tabSlug}-weekly-report.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    },
    setToast,
    "周报 CSV 已开始下载（含 KPI/渠道/时间线/任务/素材 5 段数据）",
    "导出失败",
  );

  if (!data) {
    return (
      <div className="space-y-6">
      </div>
    );
  }

  const themeHover: Record<string, string> = {
    brand: "hover:border-indigo-300/70",
    content: "hover:border-amber-300/70",
    geo: "hover:border-emerald-300/70",
    omni: "hover:border-sky-300/70",
    traffic: "hover:border-rose-300/70",
    daren: "hover:border-fuchsia-300/70",
  };

  if (data.useContentCustomLayout) {
    return <ContentDashboardRenderer data={data} source={source} fetchError={fetchError} tabSlug={tabSlug}
      triggerLaunch={triggerLaunch} triggerExport={triggerExport} toast={toast} setToast={setToast}
      permissionOpen={permissionOpen} setPermissionOpen={setPermissionOpen} />;
  }
  if (theme === "content" && (data.useContentCustomLayout || tabSlug === "content-customer")) {
    return <ContentDashboardRenderer data={data} source={source} fetchError={fetchError} tabSlug={tabSlug}
      triggerLaunch={triggerLaunch} triggerExport={triggerExport} toast={toast} setToast={setToast}
      permissionOpen={permissionOpen} setPermissionOpen={setPermissionOpen} />;
  }
  if (theme === "geo" && (data.useGeoCustomLayout || tabSlug === "geo-customer")) {
    return <GeoDashboardRenderer data={data} source={source} fetchError={fetchError} tabSlug={tabSlug}
      triggerLaunch={triggerLaunch} triggerExport={triggerExport} toast={toast} setToast={setToast}
      permissionOpen={permissionOpen} setPermissionOpen={setPermissionOpen} />;
  }
  if (theme === "omni" && (data.useOmniCustomLayout || tabSlug === "omni-channel")) {
    return <OmniDashboardRenderer data={data} source={source} fetchError={fetchError} tabSlug={tabSlug}
      triggerLaunch={triggerLaunch} triggerExport={triggerExport} toast={toast} setToast={setToast}
      permissionOpen={permissionOpen} setPermissionOpen={setPermissionOpen} />;
  }
  if (theme === "traffic" && (data.useTrafficCustomLayout || tabSlug === "ad-traffic")) {
    return <TrafficDashboardRenderer data={data} source={source} fetchError={fetchError} theme={theme} tabSlug={tabSlug}
      triggerLaunch={triggerLaunch} triggerExport={triggerExport} toast={toast} setToast={setToast}
      permissionOpen={permissionOpen} setPermissionOpen={setPermissionOpen} />;
  }
  if (theme === "daren" && (data.useDarenCustomLayout || tabSlug === "daren-collab")) {
    return <DarenDashboardRenderer data={data} source={source} fetchError={fetchError} theme={theme} tabSlug={tabSlug}
      triggerLaunch={triggerLaunch} triggerExport={triggerExport} toast={toast} setToast={setToast}
      permissionOpen={permissionOpen} setPermissionOpen={setPermissionOpen} />;
  }

  return (
    <div className="space-y-6">
      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
      <Modal
        open={permissionOpen}
        onClose={() => setPermissionOpen(false)}
        title={tabSlug === "ad-traffic" ? "申请 R07 投流总监专项授权" : "申请 R08 达人负责人专项授权"}
      >
        <div className="space-y-3 text-[13px] leading-6 text-slate-700">
          <p>
            <strong className="text-slate-900">
              {tabSlug === "ad-traffic"
                ? "申请后将可接入：巨量引擎/千川/腾讯广告 3 台账真实 API。"
                : "申请后将可接入：星图邀约/蝉妈妈筛选/抖音商家后台分润 3 台账真实 API。"}
            </strong>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-600">
            <li>当前系统版本已预埋对应权限格（R07 或 R08），不会访问真实客户数据。</li>
            <li>需要品牌负责人 8 字启动串 + 25 字发布授权串双授权后，方可在生产环境落盘。</li>
            <li>专项授权流程：提交申请 → B 层 Ontology 审批 → 写入权限矩阵 → 发布生产。</li>
          </ul>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPermissionOpen(false)}
              className="h-9 rounded-full border border-slate-200 px-4 text-[12.5px] text-slate-700 hover:bg-slate-50"
            >
              稍后再说
            </button>
            <Link
              href={
                tabSlug === "ad-traffic"
                  ? "/ai-control/advanced?tab=settings&permission=r07"
                  : "/ai-control/advanced?tab=settings&permission=r08"
              }
              onClick={() => setPermissionOpen(false)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm bg-gradient-to-r ${data.ctaActionGradient} hover:brightness-105`}
            >
              前往 B 层权限审批台
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Modal>

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[12px] text-slate-500">
            <span>{data.breadcrumb}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-900 md:text-2xl">
              {data.heroTitle}
            </h2>
            <Pill tone={data.heroPillTone}>
              <span className={`h-1.5 w-1.5 rounded-full ${data.heroAccentDot}`} />
              {data.heroPillLabel}
            </Pill>
          </div>
          {data.permissionBanner ? (
            <div
              className={`mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] ring-1 ${data.permissionBanner.tone}`}
            >
              <Lock className="h-3.5 w-3.5" />
              {data.permissionBanner.text}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void triggerExport()}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-[12.5px] font-medium text-slate-700 shadow-sm hover:border-indigo-200 hover:text-indigo-700"
          >
            <Download className="h-4 w-4" />
            {data.ctaExportLabel}
          </button>
          <button
            type="button"
            onClick={() => void triggerLaunch()}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm hover:brightness-105 bg-gradient-to-r ${data.ctaActionGradient}`}
          >
            <Rocket className="h-4 w-4" />
            {data.ctaActionLabel}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.kpiCards.map((k) => renderKpi(k, themeHover[theme]))}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div
              className={`mb-1 inline-flex h-1.5 w-1.5 translate-y-[-2px] rounded-full ${data.channelSectionAccent}`}
            />
            <h3 className="ml-1 inline-block text-[15px] font-semibold text-slate-900">
              {data.channelSectionTitle}
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {data.channelProgress.map((c) => renderChannel(c, data.heroAccentDot))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div
              className={`mb-1 inline-flex h-1.5 w-1.5 translate-y-[-2px] rounded-full ${data.timelineAccent}`}
            />
            <h3 className="ml-1 inline-block text-[15px] font-semibold text-slate-900">
              {data.timelineTitle}
            </h3>
          </div>
        </div>
        {renderTimeline(data.timelineStages, theme)}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div
                className={`mb-1 inline-flex h-1.5 w-1.5 translate-y-[-2px] rounded-full ${data.taskSectionAccent}`}
              />
              <h3 className="ml-1 inline-block text-[15px] font-semibold text-slate-900">
                {data.taskSectionTitle}
              </h3>
            </div>
            {data.taskSectionCtaLabel ? (
              <Link
                href={data.taskSectionCtaHref ?? "#"}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-indigo-600 hover:text-indigo-700"
              >
                {data.taskSectionCtaLabel} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200/70">
            <table className="min-w-full border-collapse text-[12.5px]">
              <thead className="bg-slate-50 text-[11.5px] text-slate-500">
                <tr>
                  {data.taskTable.headers.map((h) => (
                    <th
                      key={h}
                      className="border-b border-slate-200/70 px-4 py-2.5 text-left font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.taskTable.rows.map((r, i) => renderTaskRow(r, data.taskTableType, i))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div
                className={`mb-1 inline-flex h-1.5 w-1.5 translate-y-[-2px] rounded-full ${data.topSectionAccent}`}
              />
              <h3 className="ml-1 inline-block text-[15px] font-semibold text-slate-900">
                {data.topSectionTitle}
              </h3>
            </div>
            {data.topCtaLabel ? (
              <Link
                href={data.topCtaHref ?? "#"}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-indigo-600 hover:text-indigo-700"
              >
                {data.topCtaLabel} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
          <ul className="space-y-3">{data.topMaterials.map((m, i) => renderTopMaterial(m, i))}</ul>
        </div>
      </section>
    </div>
  );
}

/* ============== P2 Tab2 内容获客 · 高保真专用布局渲染器 ============== */
type ContentDashProps = {
  data: DashboardData;
  source: "loading" | "sqlite" | "static";
  fetchError?: string | null;
  tabSlug: string;
  triggerLaunch: () => void;
  triggerExport: () => void;
  toast: { visible: boolean; message: string; tone: "success" | "error" | "info" | "warn" };
  setToast: React.Dispatch<React.SetStateAction<{ visible: boolean; message: string; tone: "success" | "error" | "info" | "warn" }>>;
  permissionOpen: boolean;
  setPermissionOpen: (b: boolean) => void;
};

function ContentDashboardRenderer(p: ContentDashProps) {
  const { data, tabSlug, triggerLaunch, triggerExport, toast, setToast } = p;
  const [platformTab, setPlatformTab] = useState<string>(() => data.contentPlatformTabs?.find((t) => t.active)?.key ?? "douyin");
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const subTabsAll = data.contentSubTabsByPlatform?.[platformTab] ?? [];
  const [subTab, setSubTab] = useState<string>(() => subTabsAll[0]?.key ?? "collect");
  const platTabs = data.contentPlatformTabs ?? [];
  const currentSubTab = subTabsAll.find((s: ContentSubTab) => s.key === subTab) ?? subTabsAll[0];
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const platform = query.get("platform");
    if (platform && ["douyin", "xiaohongshu", "wechat", "ocean"].includes(platform)) setPlatformTab(platform);
    if (query.get("panel") === "work-analysis") setSubTab("work-analysis");
    if (query.get("panel") === "oceanAds") setSubTab("oceanAds");
    if (query.get("panel") === "calendar") setSubTab("calendar");
  }, []);

  // 子Tab图标映射（使用已导入的 lucide icons）
  const getSubTabIcon = (key: string): LucideIcon => {
    switch (key) {
      case "collect": return Search;
      case "plan": return Lightbulb;
      case "calendar": return Calendar;
      case "material": return Library;
      case "daily": return BookOpen;
      case "weekly": return FileSearch;
      case "optim": return Zap;
      case "works": return FileVideo;
      case "avatar": return Users;
      case "running": return Sparkles;
      case "init": return Building2;
      case "workflow": return Megaphone;
      default: return FileText;
    }
  };

  const getSubTabBg = (key: string) => {
    switch (key) {
      case "collect": return "from-sky-50 to-blue-50 text-sky-700 ring-sky-200";
      case "plan": return "from-amber-50 to-orange-50 text-amber-700 ring-amber-200";
      case "calendar": return "from-indigo-50 to-blue-50 text-indigo-700 ring-indigo-200";
      case "material": return "from-violet-50 to-fuchsia-50 text-violet-700 ring-violet-200";
      case "daily": return "from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-200";
      case "weekly": return "from-rose-50 to-pink-50 text-rose-700 ring-rose-200";
      case "optim": return "from-lime-50 to-green-50 text-lime-700 ring-lime-200";
      case "works": return "from-slate-50 to-zinc-50 text-slate-700 ring-slate-200";
      case "avatar": return "from-fuchsia-50 to-pink-50 text-fuchsia-700 ring-fuchsia-200";
      case "running": return "from-cyan-50 to-sky-50 text-cyan-700 ring-cyan-200";
      case "init": return "from-orange-50 to-amber-50 text-orange-700 ring-orange-200";
      case "workflow": return "from-neutral-50 to-slate-50 text-neutral-700 ring-neutral-200";
      default: return "from-slate-50 to-zinc-50 text-slate-700 ring-slate-200";
    }
  };

  // 当切换平台时，自动重置子Tab到该平台第一个
  useEffect(() => {
    const firstKey = subTabsAll[0]?.key;
    if (firstKey && !subTabsAll.some((s: ContentSubTab) => s.key === subTab)) {
      setSubTab(firstKey);
    }
  }, [platformTab]);

  return (
    <div className="space-y-5">
      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
      <Modal
        open={p.permissionOpen}
        onClose={() => p.setPermissionOpen(false)}
        title={tabSlug === "ad-traffic" ? "申请 R07 投流总监专项授权" : "申请 R08 达人负责人专项授权"}
      >
        <div className="space-y-3 text-[13px] leading-6 text-slate-700">
          <p>
            <strong className="text-slate-900">
              {tabSlug === "ad-traffic"
                ? "申请后将可接入：巨量引擎/千川/腾讯广告 3 台账真实 API。"
                : "申请后将可接入：星图邀约/蝉妈妈筛选/抖音商家后台分润 3 台账真实 API。"}
            </strong>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-600">
            <li>当前系统版本已预埋对应权限格（R07 或 R08），不会访问真实客户数据。</li>
            <li>需要品牌负责人 8 字启动串 + 25 字发布授权串双授权后，方可在生产环境落盘。</li>
            <li>专项授权流程：提交申请 → B 层 Ontology 审批 → 写入权限矩阵 → 发布生产。</li>
          </ul>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => p.setPermissionOpen(false)}
              className="h-9 rounded-full border border-slate-200 px-4 text-[12.5px] text-slate-700 hover:bg-slate-50">稍后再说</button>
            <Link href={tabSlug === "ad-traffic" ? "/ai-control/advanced?tab=settings&permission=r07" : "/ai-control/advanced?tab=settings&permission=r08"}
              onClick={() => p.setPermissionOpen(false)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm bg-gradient-to-r ${data.ctaActionGradient} hover:brightness-105`}>
              前往 B 层权限审批台 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Modal>

      {/* 1) Hero: 面包屑 + 标题 + 日期选择器 + 右侧 CTA 双按钮 */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[12px] text-slate-500">
            <span>{data.breadcrumb}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-900 md:text-2xl">{data.tabSlug==="ad-traffic"&&platformTab==="ocean"?"投流获客 · 巨量广告":data.heroTitle}</h2>
          </div>
        </div>
        {platformTab!=="ocean" && <div className="flex flex-wrap items-center gap-2">
          {/* 日期选择器：选日期切换当日所有内容 */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="border-0 bg-transparent text-[12.5px] font-medium text-slate-700 outline-none focus:ring-0"
            />
          </div>
          <button type="button" onClick={() => void triggerExport()}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-[12.5px] font-medium text-slate-700 shadow-sm hover:border-indigo-200 hover:text-indigo-700">
            <Download className="h-4 w-4" /> {data.ctaExportLabel}
          </button>
          <button type="button" onClick={() => void triggerLaunch()}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm hover:brightness-105 bg-gradient-to-r ${data.ctaActionGradient}`}>
            <Rocket className="h-4 w-4" /> {data.ctaActionLabel}
          </button>
        </div>}
      </section>

      {/* 3) 3 平台切换 Tab */}
      {platTabs.length > 0 && (
        <section className="flex flex-wrap items-center gap-2">
          {platTabs.map((t) => {
            const active = platformTab === t.key;
            const baseTone = t.tone ?? "bg-neutral-900 text-white";
            return (
              <button key={t.key} type="button" onClick={() => setPlatformTab(t.key)}
                className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-medium shadow-sm transition ring-1 ${
                  active
                    ? baseTone + " ring-white/20 scale-[1.01]"
                    : "bg-white text-slate-700 ring-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}>
                {active ? <CheckCircle2 className="h-4 w-4 opacity-90" /> : <CircleDot className="h-4 w-4 opacity-60" />}
                <span>{t.label}</span>
                {t.hint ? (
                  <span className={`ml-1 text-[10.5px] opacity-80 ${active ? "text-white/85" : "text-slate-500"}`}>
                    · {t.hint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </section>
      )}

      {/* 3.5) 每平台子 Tab 横滑容器：采集数据前置 + 8通用 + 平台扩展 */}
      {subTabsAll.length > 0 && (
        <section className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm custom-thin-scroll">
          <div className="flex items-center gap-1.5 min-w-max">
            {subTabsAll.map((t: ContentSubTab) => {
              const active = subTab === t.key;
              const SubIcon = getSubTabIcon(t.key);
              return (
                <button key={t.key} type="button" onClick={() => setSubTab(t.key)}
                  className={`group inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-medium whitespace-nowrap transition ring-1 ${
                    active
                      ? "bg-gradient-to-br " + getSubTabBg(t.key) + " shadow-sm ring-offset-1 ring-offset-white"
                      : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                  }`}>
                  <SubIcon className="h-3.5 w-3.5 opacity-90" />
                  <span>{t.label}</span>
                  {t.badge && (
                    <span className={`ml-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${t.badgeTone ?? "bg-slate-50 text-slate-600 ring-slate-200"}`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 4) 当前子 Tab 结构化占位卡容器：WorkBuddy写入 + Agent可读 双目标 */}
      {currentSubTab?.key === "work-analysis" && <WorkAnalysisWorkspace key={platformTab} platform={platformTab} />}
      {currentSubTab && currentSubTab.key !== "work-analysis" && (() => {
        const CurIcon = getSubTabIcon(currentSubTab.key);
        const accentBg = "bg-gradient-to-br " + getSubTabBg(currentSubTab.key);
        return (
          <section className="space-y-4">
            {/* 4-1 子Tab主卡片：结构化字段占位 */}
            <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm`}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accentBg} ring-1`}>
                    <CurIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[15px] font-bold text-slate-900">{currentSubTab.label}</h4>
                      {currentSubTab.badge && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ring-1 ${currentSubTab.badgeTone}`}>
                          {currentSubTab.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* 6徽章行：按截图红叉要求全域删除，保留空div闭合 */}
              </div>

              {/* 4-2 结构化字段占位网格（按子Tab类型定制；抖音collect分基础8项+进阶榜单/达人7项=15项两组） */}
              <div className="space-y-5">
                {(() => {
                  /* ====== 精准判断当前是哪个平台：基于subTabsAll（每次setPlatformTab后重算，零误判） ====== */
                  const isDouyinCollect = false;
                  if (isDouyinCollect) {
                    /* ================ 仅抖音/视频号 · collect采集数据 = 两组15项（严格按原系统截图2顺序），小红书/公众号保持原6项单组 ================ */
                    const groupBasic: Array<{ key: string; label: string; hint: string; icon: LucideIcon; }> = [
                      /* ------ 第一排基础8项（原系统截图2第一排Tab） ------ */
                      { key: "brand-accounts", label: "① 品牌账号信息", hint: "按账号逐条维护采集入口，支持区分品牌号/员工号/达人号，逐行提交更新", icon: Users },
                      { key: "competitor-accounts", label: "② 竞品账号信息", hint: "同赛道竞品Top账号列表，粉丝/发布频率/内容方向画像，逐账号抓取", icon: Search },
                      { key: "brand-works-full", label: "③ 品牌作品信息及数据", hint: "已发布作品完整数据表：播放/点赞/评论/收藏/分享/转发/涨粉/完播率/停留时长", icon: FileVideo },
                      { key: "competitor-works-full", label: "④ 竞品作品信息及数据", hint: "对标竞品账号的Top作品列表，互动指标+作品标签+发布时间分析", icon: FileImage },
                      { key: "benchmark-works-full", label: "⑤ 对标作品信息及数据", hint: "爆款拆解保留手动输入，对标作品完整数据+标签+钩子结构+完播率拐点", icon: FileImage },
                      { key: "search-keywords", label: "⑥ 搜索关键词", hint: "SEO关键词搜索结果/关键词推荐/Top关联词/搜索指数趋势", icon: Hash },
                      { key: "comment-data", label: "⑦ 评论数据", hint: "热门评论抽取/用户意图识别/正负向情感分析/关键词词云/高频问题", icon: MessageSquare },
                      { key: "keyword-suggest", label: "⑧ 关键词推荐", hint: "TikHub 垂类标签38组推荐/长尾词挖掘/关联词图谱/SEO排名词", icon: Sparkles },
                    ];
                    const groupAdvanced: Array<{ key: string; label: string; hint: string; icon: LucideIcon; }> = [
                      /* ------ 第二排进阶榜单与达人7项（原系统截图2第二排Tab） ------ */
                      { key: "low-fans-hot", label: "⑨ 获取低粉爆款榜", hint: "低粉高爆款榜单：播放/粉丝比≥阈值/垂类过滤/发布时间窗口/可直接对标拆解", icon: TrendingUp },
                      { key: "high-finish-rate", label: "⑩ 获取高完播率榜", hint: "高完播率Top作品榜单/时长分段分布/拐点位置分析", icon: Award },
                      { key: "high-like-rate", label: "⑪ 获取高点赞率榜", hint: "高点赞/点赞率Top作品榜单/点赞评论比值/情感正向占比/封面共性", icon: Heart },
                      { key: "same-city-hot", label: "⑫ 同城热点榜", hint: "按城市采集的同城热点榜：本地热度/门店关联/POI点位", icon: MapPin },
                      { key: "daren-search", label: "⑬ 达人搜索抓取", hint: "按粉丝区间/垂类标签/报价范围/合作历史，达人搜索抓取结果池", icon: UserSearch },
                      { key: "daren-deep", label: "⑭ 达人深度抓取", hint: "单个达人深度画像：粉丝增长/作品历史/带货数据/商单报价/真实互动率", icon: ScanEye },
                      { key: "daren-result", label: "⑮ 达人结果池", hint: "达人候选结果分级标记：A类可直接触达/B类待复核/C类数据不足", icon: Database },
                    ];
                    const renderGroup = (title: string, subtitle: string, accentTone: string, group: Array<{ key: string; label: string; hint: string; icon: LucideIcon; }>) => (
                      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                        <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 bg-gradient-to-r ${accentTone}`}>
                          <div>
                            <h5 className="text-[13px] font-bold text-slate-900">{title}</h5>
                            <p className="mt-0.5 text-[10.5px] text-slate-600">{subtitle}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3 lg:grid-cols-2">
                          {group.map((ph) => {
                            const PI = ph.icon;
                            const isAccountCard = ph.key.endsWith("-accounts");
                            const isWorkCard = /-works-|-works$/.test(ph.key);
                            const isBoardCard = /low-fans|high-finish|high-like|same-city|daren-search|daren-deep|daren-result/.test(ph.key);
                            const isKeywordCard = /search-keywords|comment-data|keyword-suggest/.test(ph.key);
                            return (
                              <div key={ph.key} className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm hover:shadow-md transition flex flex-col gap-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200 text-slate-700">
                                    <PI className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h6 className="text-[12.5px] font-semibold text-slate-900 truncate">{ph.label}</h6>
                                    <p className="text-[10.5px] text-slate-500 leading-4 line-clamp-2">{ph.hint}</p>
                                  </div>
                                </div>
                                {/* 1.账号类（品牌/竞品账号）：粘贴链接输入框+角色选择+提交按钮 */}
                                {isAccountCard && (
                                  <div className="space-y-2">
                                    <div className="flex gap-1.5 text-[10px]">
                                      {["品牌号", "员工号", "达人号"].map((role) => (
                                        <span key={role} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{role}</span>
                                      ))}
                                    </div>
                                    <textarea
                                      readOnly
                                      placeholder={"粘贴抖音分享链接（iesdouyin.com/share/user/...），按行分隔多个" + (ph.key === "brand-accounts" ? "（品牌账号）" : "（竞品账号）")}
                                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[10.5px] font-mono leading-4 placeholder-slate-400 min-h-[48px] resize-none"
                                    />
                                    <div className="flex gap-1.5">
                                      <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[10.5px] font-semibold px-2 py-1.5">
                                        <Search className="h-3 w-3" />
                                        {ph.key === "brand-accounts" ? "添加品牌账号" : "添加竞品账号"}
                                      </button>
                                      <button className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10.5px] font-semibold px-2 py-1.5">
                                        <RefreshCw className="h-3 w-3" /> 同步全量数据
                                      </button>
                                    </div>
                                    <div className="rounded-md border border-slate-200 overflow-hidden max-h-[110px] overflow-auto">
                                      <table className="text-[9.5px] w-full text-slate-600">
                                        <thead className="bg-slate-50 text-slate-700">
                                          <tr><th>昵称</th><th>抖音号</th><th>粉丝</th><th>关注</th><th>作品数</th><th>获赞</th><th></th></tr>
                                        </thead>
                                        <tbody>
                                          <tr className="border-t border-slate-100">
                                            <td colSpan={7} className="px-2 py-2 text-center text-slate-400 italic">
                                              {ph.key === "brand-accounts" ? "已添加 0 个品牌账号" : "已添加 0 个竞品账号"} · 点击上方提交后拉取
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                                {/* 2.作品类（品牌/竞品/对标作品）：逐账号遍历按钮+12字段表格 */}
                                {isWorkCard && (
                                  <div className="space-y-2">
                                    <div className="flex gap-1.5">
                                      <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[10.5px] font-semibold px-2 py-1.5">
                                        <FileVideo className="h-3 w-3" /> 逐账号遍历作品
                                      </button>
                                      <button className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10.5px] font-semibold px-2 py-1.5">
                                        <Download className="h-3 w-3" /> 导出
                                      </button>
                                    </div>
                                    <div className="rounded-md border border-slate-200 overflow-hidden max-h-[110px] overflow-auto">
                                      <table className="text-[9px] w-full text-slate-600">
                                        <thead className="bg-slate-50 text-slate-700 sticky top-0">
                                          <tr>
                                            <th>作品主键</th><th>文案</th><th>发布</th><th>媒体</th>
                                            <th>时长</th><th>点赞</th><th>评论</th><th>分享</th>
                                            <th>收藏</th><th>推荐</th><th>类型</th><th>视频下载</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr className="border-t border-slate-100"><td colSpan={12} className="px-2 py-2 text-center text-slate-400 italic">暂无作品 · 点击"逐账号遍历作品"后拉取</td></tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                                {/* 3.搜索关键词/评论数据/关键词推荐：输入框+获取按钮+表格 */}
                                {isKeywordCard && (
                                  <div className="space-y-2">
                                    <input
                                      readOnly
                                      placeholder={
                                        ph.key === "search-keywords" ? "输入要搜索的关键词（多个用逗号分隔）"
                                        : ph.key === "comment-data" ? "输入作品URL或作品ID，批量拉取评论"
                                        : "输入核心关键词（TikHub 38组垂类推荐长尾词）"
                                      }
                                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[10.5px] placeholder-slate-400"
                                    />
                                    <button className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[10.5px] font-semibold px-2 py-1.5">
                                      <Search className="h-3 w-3" />
                                      {ph.key === "search-keywords" ? "搜索关键词并拉取关联词"
                                        : ph.key === "comment-data" ? "拉取评论并做情感分析 / 词云"
                                        : "获取 TikHub 垂类推荐词"}
                                    </button>
                                    <div className="rounded-md border border-slate-200 px-2 py-1.5 text-[9.5px] max-h-[60px] overflow-auto text-slate-500 italic">
                                      结果将在此处显示（表格 / 列表 / 词云），可直接进入下一步创作工作流
                                    </div>
                                  </div>
                                )}
                                {/* 4.榜单/达人类（进阶7项）= 3Dropdown（垂类/城市/时间）+获取按钮+表格 */}
                                {isBoardCard && (
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                                      <select disabled className="rounded-md border border-slate-200 bg-white px-1.5 py-1 opacity-90 cursor-not-allowed"><option>垂类标签</option></select>
                                      <select disabled className="rounded-md border border-slate-200 bg-white px-1.5 py-1 opacity-90 cursor-not-allowed"><option>城市</option></select>
                                      <select disabled className="rounded-md border border-slate-200 bg-white px-1.5 py-1 opacity-90 cursor-not-allowed"><option>近 24 小时</option></select>
                                    </div>
                                    <button className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-[10.5px] font-semibold px-2 py-1.5">
                                      <TrendingUp className="h-3 w-3" />
                                      {ph.key === "low-fans-hot" ? "获取低粉爆款榜"
                                        : ph.key === "high-finish-rate" ? "获取高完播率榜"
                                        : ph.key === "high-like-rate" ? "获取高点赞率榜"
                                        : ph.key === "same-city-hot" ? "拉取同城热点榜"
                                        : ph.key === "daren-search" ? "达人搜索抓取"
                                        : ph.key === "daren-deep" ? "达人深度抓取（画像 8 接口并行）"
                                        : "达人结果池（分级 A / B / C 类）"}
                                    </button>
                                    <div className="rounded-md border border-slate-200 overflow-hidden max-h-[70px] overflow-auto">
                                      <table className="text-[9px] w-full text-slate-600">
                                        <thead className="bg-slate-50 text-slate-700 sticky top-0">
                                          <tr>
                                            {ph.key === "daren-result"
                                              ? <><th>等级</th><th>昵称</th><th>粉丝</th><th>画像完整度</th><th>可触达</th><th></th></>
                                              : ph.key.startsWith("daren")
                                              ? <><th>达人ID</th><th>昵称</th><th>粉丝</th><th>互动率</th><th>行业</th><th></th></>
                                              : <><th>作品ID</th><th>文案</th><th>发布</th><th>点赞</th><th>完播</th><th>可拆解</th></>
                                            }
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr className="border-t border-slate-100">
                                            <td colSpan={6} className="px-2 py-1.5 text-center text-slate-400 italic text-[9.5px]">
                                              {ph.key === "daren-result" ? "候选池 457 条（来自 TikHub 达人抓取）" : "暂无结果 · 点击上方『获取』按钮后拉取数据"}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                    return (
                      <div className="space-y-4">
                        {renderGroup(
                          "采集数据 · 第一组 基础8项",
                          "对应原系统抖音采集数据第一排8个Tab：品牌→竞品→作品→对标→搜索→评论→关键词推荐，顺序完全对齐",
                          "from-sky-50 via-white to-white",
                          groupBasic,
                        )}
                        {renderGroup(
                          "采集数据 · 第二组 进阶榜单 & 达人7项",
                          "对应原系统抖音采集数据第二排7个Tab：低粉爆款→高完播→高点赞→同城热点→达人搜索→达人深度→达人结果，共15项全覆盖",
                          "from-orange-50 via-white to-white",
                          groupAdvanced,
                        )}
                      </div>
                    );
                  }
                  /* ------ 非采集子Tab：按功能分类分流 ------ */
                  if(currentSubTab.key==="oceanAds") return <OceanAdsWorkspace brandId={requireCurrentBrandId()} />;
                  const openClawKeys = [
                    "plan", "material", "daily", "weekly", "optim", "works",
                    "geoVisibility", "geoKeywords", "geoSite", "geoKnowledge", "geoPlan", "geoSelfMedia", "geoThirdMedia", "geoBrand",
                    "omniComment", "omniPlatform",
                    "trafficTencent",
                    "darenMatching", "darenTracking",
                  ] as const;
                  if (openClawKeys.includes(currentSubTab.key as any)) {
                    const setToastWrap = (m: string, tone: "ok" | "err" = "ok") => {
                      setToast({
                        visible: true,
                        message: m,
                        tone: tone === "ok" ? "success" : "error",
                      });
                      setTimeout(() => {
                        setToast((t: { visible: boolean; message: string; tone: "success" | "error" | "info" | "warn" }) => ({ ...t, visible: false }));
                      }, 2200);
                    };
                    return (
                      <OpenClawWorkspace
                        subTabKey={currentSubTab.key}
                        platformTab={platformTab}
                        toast={(msg, tone) => setToastWrap(msg, tone)}
                      />
                    );
                  }
                  if (
                    platformTab === "wechat"
                    && (currentSubTab.key === "init" || currentSubTab.key === "workflow")
                  ) {
                    const forcedSection: WechatSectionKey =
                      currentSubTab.key === "init" ? "setup" : "workflow";
                    return <WechatWorkspaceShell embedded forcedSection={forcedSection} />;
                  }
                  /* S3阶段差异化5tile：真内核替换=调用Tile5Workspace（三平台×8实例），非OpenClaw真REST接口 */
                  const tile5Keys: readonly Tile5Key[] = ["calendar", "avatar", "running", "init", "workflow"] as const;
                  if (tile5Keys.includes(currentSubTab.key as Tile5Key)) {
                    const scope =
                      currentSubTab.key === "calendar"
                        ? (["xiaohongshu", "douyin", "wechat", "all"].includes(platformTab)
                            ? (platformTab as any)
                            : "all")
                        : "all";
                    return (
                      <Tile5Workspace
                        subTabKey={currentSubTab.key as Tile5Key}
                        brandId={requireCurrentBrandId()}
                        platformTab={scope as any}
                      />
                    );
                  }
                  /* collect采集数据：主页面仅保留干净入口，真实列表进入二级页 */
                  const simpleTiles: Array<{ key: string; label: string; hint: string; href: string; icon: LucideIcon; }> = [];
                  switch (currentSubTab.key) {
                    case "collect":
                      if (platformTab === "douyin") {
                        simpleTiles.push(
                          { key: "brandAccounts", label: "品牌账号信息", hint: "品牌账号池与基础画像", href: "/tabs/content-customer/collect/douyin?board=brandAccounts", icon: Users },
                          { key: "competitorAccounts", label: "竞品账号信息", hint: "竞品账号池与对标范围", href: "/tabs/content-customer/collect/douyin?board=competitorAccounts", icon: Search },
                          { key: "brandWorks", label: "品牌作品信息", hint: "品牌作品与核心数据", href: "/tabs/content-customer/collect/douyin?board=brandWorks", icon: FileVideo },
                          { key: "competitorWorks", label: "竞品作品信息", hint: "竞品作品列表与表现", href: "/tabs/content-customer/collect/douyin?board=competitorWorks", icon: FileImage },
                          { key: "benchmarkWorks", label: "对标作品信息", hint: "对标爆款与拆解对象", href: "/tabs/content-customer/collect/douyin?board=benchmarkWorks", icon: Award },
                          { key: "searchWorks", label: "搜索关键词", hint: "搜索结果与关联作品", href: "/tabs/content-customer/collect/douyin?board=searchWorks", icon: Hash },
                          { key: "keywordRecommendations", label: "关键词推荐", hint: "推荐词与长尾词结果", href: "/tabs/content-customer/collect/douyin?board=keywordRecommendations", icon: Sparkles },
                          { key: "commentData", label: "评论数据", hint: "评论抽取与用户反馈", href: "/tabs/content-customer/collect/douyin?board=commentData", icon: MessageSquare },
                          { key: "targetUsers", label: "目标用户", hint: "目标用户线索池", href: "/tabs/content-customer/collect/douyin?board=targetUsers", icon: UserSearch },
                          { key: "lowFanExplosiveWorks", label: "低粉爆款榜", hint: "低粉高爆内容池", href: "/tabs/content-customer/collect/douyin?board=lowFanExplosiveWorks", icon: TrendingUp },
                          { key: "highCompletionRateWorks", label: "高完播率榜", hint: "高完播内容池", href: "/tabs/content-customer/collect/douyin?board=highCompletionRateWorks", icon: PlayCircle },
                          { key: "highLikeRateWorks", label: "高点赞率榜", hint: "高点赞内容池", href: "/tabs/content-customer/collect/douyin?board=highLikeRateWorks", icon: Heart },
                          { key: "cityHotspots", label: "同城热点榜", hint: "热点句子与城市趋势", href: "/tabs/content-customer/collect/douyin?board=cityHotspots", icon: MapPin },
                          { key: "creatorSearchResults", label: "达人搜索", hint: "达人搜索结果池", href: "/tabs/content-customer/collect/douyin?board=creatorSearchResults", icon: UserSearch },
                          { key: "creatorProfiles", label: "达人画像", hint: "深度画像与资料页", href: "/tabs/content-customer/collect/douyin?board=creatorProfiles", icon: ScanEye },
                          { key: "creatorDeepFetchTasks", label: "达人深抓任务", hint: "深抓任务与处理状态", href: "/tabs/content-customer/collect/douyin?board=creatorDeepFetchTasks", icon: Database },
                        );
                      } else if (platformTab === "xiaohongshu") {
                        simpleTiles.push(
                          { key: "brandAccounts", label: "品牌账号信息", hint: "品牌账号池与基础画像", href: "/tabs/content-customer/collect/xiaohongshu?board=brandAccounts", icon: Users },
                          { key: "competitorAccounts", label: "竞品账号信息", hint: "竞品账号池与对标范围", href: "/tabs/content-customer/collect/xiaohongshu?board=competitorAccounts", icon: Search },
                          { key: "brandNotes", label: "品牌作品信息", hint: "品牌笔记与核心数据", href: "/tabs/content-customer/collect/xiaohongshu?board=brandNotes", icon: FileVideo },
                          { key: "benchmarkNotes", label: "对标作品信息", hint: "对标笔记与拆解对象", href: "/tabs/content-customer/collect/xiaohongshu?board=benchmarkNotes", icon: FileImage },
                          { key: "searchNotes", label: "搜索笔记", hint: "关键词搜索结果", href: "/tabs/content-customer/collect/xiaohongshu?board=searchNotes", icon: Hash },
                          { key: "commentData", label: "评论数据", hint: "评论抽取与用户反馈", href: "/tabs/content-customer/collect/xiaohongshu?board=commentData", icon: MessageSquare },
                          { key: "targetUsers", label: "目标用户", hint: "目标用户线索池", href: "/tabs/content-customer/collect/xiaohongshu?board=targetUsers", icon: UserSearch },
                        );
                      } else {
                        simpleTiles.push(
                          { key: "brandAccounts", label: "品牌账号信息", hint: "公众号账号列表", href: "/tabs/content-customer/collect/wechat?board=brandAccounts", icon: Users },
                          { key: "articles", label: "品牌作品信息", hint: "品牌文章与阅读数据", href: "/tabs/content-customer/collect/wechat?board=articles", icon: FileText },
                          { key: "benchmarkArticles", label: "对标作品信息", hint: "对标文章与表现数据", href: "/tabs/content-customer/collect/wechat?board=benchmarkArticles", icon: BookMarked },
                          { key: "searchItems", label: "搜索结果", hint: "搜一搜结果与文章候选", href: "/tabs/content-customer/collect/wechat?board=searchItems", icon: Search },
                        );
                      }
                      break;
                  }
                  if (simpleTiles.length === 0) return null;
                  return (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {simpleTiles.map((ph) => {
                        const PI = ph.icon;
                        return (
                          <Link
                            key={ph.key}
                            href={ph.href}
                            className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200 text-slate-700 transition group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:ring-indigo-200">
                                <PI className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h6 className="truncate text-[13px] font-semibold text-slate-900">{ph.label}</h6>
                                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-indigo-500" />
                                </div>
                                <p className="mt-1 text-[11.5px] leading-5 text-slate-500">{ph.hint}</p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>
        );
      })()}

    </div>
  );
}

/* ============== P1 Tab3 GEO获客 · 高保真专用布局渲染器 ============== */
type GeoDashProps = {
  data: DashboardData;
  source: "loading" | "sqlite" | "static";
  fetchError?: string | null;
  tabSlug: string;
  triggerLaunch: () => void;
  triggerExport: () => void;
  toast: { visible: boolean; message: string; tone: "success" | "error" | "info" | "warn" };
  setToast: React.Dispatch<React.SetStateAction<{ visible: boolean; message: string; tone: "success" | "error" | "info" | "warn" }>>;
  permissionOpen: boolean;
  setPermissionOpen: (b: boolean) => void;
};

function GeoDashboardRenderer(p: GeoDashProps) {
  const { data, source, fetchError, tabSlug, triggerLaunch, triggerExport, toast, setToast } = p;
  const [regionTab, setRegionTab] = useState<string>(() => data.geoRegionTabs?.find((t) => t.active)?.key ?? "ec");
  const [stageTab, setStageTab] = useState<number>(() => data.geoStageTabs?.find((s) => s.active)?.index ?? 3);
  const [leadsSubTab, setLeadsSubTab] = useState<string>(() => data.geoLeadsPanel?.activeSubTab ?? "s4");
  const regionTabs = data.geoRegionTabs ?? [];
  const stageTabs = data.geoStageTabs ?? [];
  const g = data.geoLeadsPanel;
  return (
    <div className="space-y-5">
      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
      <Modal
        open={p.permissionOpen}
        onClose={() => p.setPermissionOpen(false)}
        title={tabSlug === "ad-traffic" ? "申请 R07 投流总监专项授权" : "申请 R08 达人负责人专项授权"}
      >
        <div className="space-y-3 text-[13px] leading-6 text-slate-700">
          <p>
            <strong className="text-slate-900">
              {tabSlug === "ad-traffic"
                ? "申请后将可接入：巨量引擎/千川/腾讯广告 3 台账真实 API。"
                : "申请后将可接入：星图邀约/蝉妈妈筛选/抖音商家后台分润 3 台账真实 API。"}
            </strong>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-600">
            <li>当前系统版本已预埋对应权限格（R07 或 R08），不会访问真实客户数据。</li>
            <li>需要品牌负责人 8 字启动串 + 25 字发布授权串双授权后，方可在生产环境落盘。</li>
            <li>专项授权流程：提交申请 → B 层 Ontology 审批 → 写入权限矩阵 → 发布生产。</li>
          </ul>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => p.setPermissionOpen(false)}
              className="h-9 rounded-full border border-slate-200 px-4 text-[12.5px] text-slate-700 hover:bg-slate-50">稍后再说</button>
            <Link href={tabSlug === "ad-traffic" ? "/ai-control/advanced?tab=settings&permission=r07" : "/ai-control/advanced?tab=settings&permission=r08"}
              onClick={() => p.setPermissionOpen(false)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm bg-gradient-to-r ${data.ctaActionGradient} hover:brightness-105`}>
              前往 B 层权限审批台 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Modal>

      {/* 1) Hero */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[12px] text-slate-500">
            <span>{data.breadcrumb}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-900 md:text-2xl">{data.heroTitle}</h2>
            <Pill tone={data.heroPillTone}>
              <span className={`h-1.5 w-1.5 rounded-full ${data.heroAccentDot}`} />
              {data.heroPillLabel}
            </Pill>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void triggerExport()}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-[12.5px] font-medium text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700">
            <Download className="h-4 w-4" /> {data.ctaExportLabel}
          </button>
          <button type="button" onClick={() => void triggerLaunch()}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm hover:brightness-105 bg-gradient-to-r ${data.ctaActionGradient}`}>
            <Rocket className="h-4 w-4" /> {data.ctaActionLabel}
          </button>
        </div>
      </section>

      {/* 2) 5阶段 */}
      {stageTabs.length > 0 && (
        <section className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-2 shadow-sm">
          {stageTabs.map((s) => {
            const isActive = stageTab === s.index;
            const tone =
              s.tone === "done"
                ? "text-emerald-700 ring-emerald-200 bg-emerald-50"
                : s.tone === "doing"
                ? isActive
                  ? "text-emerald-800 ring-emerald-300 bg-emerald-100"
                  : "text-emerald-700 ring-emerald-200 bg-emerald-50/70 animate-pulse"
                : "text-slate-500 ring-slate-200 bg-slate-50";
            return (
              <button key={s.index} type="button" onClick={() => setStageTab(s.index)}
                className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-medium ring-1 transition ${tone} ${
                  isActive ? "shadow-sm ring-offset-1 ring-offset-white" : "opacity-90 hover:brightness-105"
                }`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  s.tone === "done" ? "bg-emerald-500 text-white" : s.tone === "doing" ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                }`}>
                  {s.tone === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.index}
                </span>
                <span className="whitespace-nowrap">{s.title}</span>
                <ChevronRight className={`h-3.5 w-3.5 opacity-50 ${isActive ? "opacity-100" : ""}`} />
              </button>
            );
          })}
        </section>
      )}

      {/* 3) 4区域Tab */}
      {regionTabs.length > 0 && (
        <section className="flex flex-wrap items-center gap-2">
          {regionTabs.map((t) => {
            const active = regionTab === t.key;
            const baseTone = t.tone ?? "bg-neutral-900 text-white";
            return (
              <button key={t.key} type="button" onClick={() => setRegionTab(t.key)}
                className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-medium shadow-sm transition ring-1 ${
                  active
                    ? baseTone + " ring-white/20 scale-[1.01]"
                    : "bg-white text-slate-700 ring-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}>
                {active ? <CheckCircle2 className="h-4 w-4 opacity-90" /> : <CircleDot className="h-4 w-4 opacity-60" />}
                <span>{t.label}</span>
                {t.hint ? (
                  <span className={`ml-1 text-[10.5px] opacity-80 ${active ? "text-white/85" : "text-slate-500"}`}>
                    · {t.hint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </section>
      )}

      {/* 4) Top 3卡 */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {(() => {
          const c0 = data.geoTopCards?.[0];
          if (!c0) return null;
          const Icon0 = resolveIcon(c0.iconName ?? "Lightbulb");
          return (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-emerald-300/70 transition">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 ring-1 ring-emerald-200">
                  <Icon0 className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">{c0.title}</h5>
                  {c0.subtitle && <p className="mt-0.5 text-[11.5px] text-slate-500">{c0.subtitle}</p>}
                </div>
              </div>
              {c0.badge && (
                <button type="button" onClick={() => setToast({ visible: true, message: "LBS GEO策略 + 围栏人群参数重新注入（下一阶段接入）", tone: "info" })}
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-emerald-50 px-3 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">
                  <Sparkles className="h-3.5 w-3.5" /> {c0.badge}
                </button>
              )}
            </div>
            <div className="mb-3 whitespace-pre-line text-[12.5px] leading-6 text-slate-700">{c0.body}</div>
            <div className="space-y-1">
              {(c0.bulletList ?? []).map((b, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
            {c0.footer && (
              <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-amber-50/80 px-3 py-2 text-[11px] leading-5 text-amber-900 ring-1 ring-amber-200">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>{c0.footer}</span>
              </div>
            )}
          </div>
          );
        })()}

        {/* GEO覆盖地图 4区域 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-emerald-300/60 transition">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-blue-100 text-sky-700 ring-1 ring-sky-200">
                <Map className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">{data.geoCoverageMap?.title ?? "区域覆盖地图"}</h5>
                <p className="mt-0.5 text-[11.5px] text-slate-500">{data.geoCoverageMap?.subtitle}</p>
              </div>
            </div>
            {data.geoTopCards?.[1]?.badge && (
              <button type="button" onClick={() => setToast({ visible: true, message: "9月节奏日历·国庆双节GEO节点（下一阶段接入）", tone: "info" })}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-sky-50 px-3 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100">
                <Calendar className="h-3.5 w-3.5" /> {data.geoTopCards[1].badge}
              </button>
            )}
          </div>
          <div className="space-y-2.5">
            {(data.geoCoverageMap?.regions ?? []).map((r, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-[11.5px]">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${r.tone}`}>{r.name}</span>
                    <span className="font-semibold text-slate-700">{r.count}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-emerald-600 font-medium">{r.delta}</span>
                  </div>
                  <span className="text-slate-500">{r.lead}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${r.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
          {data.geoTopCards?.[1]?.footer && (
            <div className="mt-3 text-[11px] leading-5 text-slate-500 ring-1 ring-slate-200 bg-slate-50 rounded-xl px-3 py-2">
              {data.geoTopCards[1].footer}
            </div>
          )}
        </div>

        {/* 围栏人群库 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-rose-300/70 transition overflow-hidden">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-50 to-pink-100 text-rose-700 ring-1 ring-rose-200">
                <Library className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">{data.geoTopCards?.[2]?.title ?? data.geoFenceLibrary?.title ?? "围栏人群库"}</h5>
                <p className="mt-0.5 text-[11.5px] text-slate-500">{data.geoFenceLibrary?.subtitle}</p>
              </div>
            </div>
            {data.geoTopCards?.[2]?.badge && (
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-rose-50 px-3 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">
                <Sparkles className="h-3.5 w-3.5" /> {data.geoTopCards[2].badge}
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-thin-scroll">
            {(data.geoFenceLibrary?.items ?? []).map((it, i) => (
              <div key={i}
                className="group flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 ring-1 ring-white transition hover:border-emerald-200 hover:bg-white hover:shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${it.tone}`}>
                    {it.tag}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[12px] font-medium leading-5 text-slate-800 group-hover:text-emerald-800 transition">{it.title}</div>
                </div>
                <div className="text-[10.5px] text-slate-500">{it.hint}</div>
              </div>
            ))}
          </div>
          {data.geoTopCards?.[2]?.footer && (
            <div className="mt-2 text-[10.5px] leading-5 text-slate-500">{data.geoTopCards[2].footer}</div>
          )}
        </div>
      </section>

      {/* 5) GEO LBS线索触达大面板 */}
      {g && (
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4 bg-gradient-to-r from-emerald-50 via-white to-white">
            <div>
              <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 text-[11.5px] font-semibold text-white ring-1 ring-emerald-400/30 shadow-sm">
                <MapPin className="h-3.5 w-3.5" /> GEO LBS 线索触达面板 · 统一 7 子 Tab
              </div>
              <h4 className="mt-2 text-[14.5px] font-bold text-slate-900">{g.projectTitle}</h4>
            </div>
            <div className="text-[11.5px] text-slate-600 bg-slate-50/90 ring-1 ring-slate-200 px-3 py-1.5 rounded-full">
              {g.rightStatus}
            </div>
          </div>

          <div className="overflow-x-auto border-b border-slate-100 px-3 pt-3 bg-slate-50/50 custom-thin-scroll">
            <div className="flex items-center gap-1 min-w-max pb-3">
              {g.subTabs.map((t) => {
                const active = leadsSubTab === t.key;
                return (
                  <button key={t.key} type="button" onClick={() => setLeadsSubTab(t.key)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition whitespace-nowrap ${
                      active
                        ? t.accent ?? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700/20"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    }`}>
                    <span className={active ? "opacity-95" : "opacity-80"}>{t.label}</span>
                    {t.key === "s4" && t.hint?.includes("激活") && <span className="text-[9.5px] opacity-80">⭐</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50/40 via-white to-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                      <Wand2 className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h5 className="text-[13px] font-semibold text-slate-900">{g.dispatchBlock.title}</h5>
                      <div className="mt-1 flex items-center flex-wrap gap-1.5">
                        <span className="text-[11px] text-slate-500">{g.dispatchBlock.caption}</span>
                        {(g.dispatchBlock.autoInjectTags ?? []).map((tg, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                            <CheckCircle2 className="h-2.5 w-2.5" /> 已注入: {tg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setToast({ visible: true, message: "已提交 GEO 专家触达链（已嵌入 LBS Pipeline），预计 18s 返回", tone: "info" })}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-[12px] font-semibold text-white shadow-sm hover:brightness-105">
                    <MapPin className="h-4 w-4" /> {g.dispatchBlock.startButton}
                  </button>
                </div>
                <div className="mt-4 rounded-xl border border-emerald-100 bg-white/80 p-3.5">
                  <ul className="space-y-1.5 text-[12px] leading-6 text-slate-700">
                    {(g.dispatchBlock.notes ?? []).map((n, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 inline-flex h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {(g.nearbyStores ?? []).map((s, i) => {
                    return (
                      <button key={i} type="button"
                        onClick={() => setToast({ visible: true, tone: "info", message: `门店围栏：${s.label}（已进入 ④同城触达 Tab 的 POI 绑定视图）` })}
                        className={`group relative flex aspect-square flex-col items-center justify-between rounded-2xl p-3 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${s.tone} hover:brightness-105`}>
                        <div className="flex-1 flex w-full items-center justify-center rounded-xl bg-white/40 backdrop-blur-[2px] ring-1 ring-white/60 my-2">
                          <Store className="h-10 w-10 text-white/80" />
                        </div>
                        <div className="w-full rounded-lg px-2 py-1 text-[10.5px] font-semibold leading-4 text-center ring-1 ring-white/70 bg-white/85 text-slate-800">
                          {s.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-emerald-50/80 px-3 py-2 text-[11px] leading-5 text-emerald-900 ring-1 ring-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{g.dispatchBlock.footer}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 shadow-sm h-full flex flex-col">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                    <h5 className="text-[13px] font-semibold text-slate-900">{g.salesChain.title}</h5>
                  </div>
                  <button type="button"
                    onClick={() => setToast({ visible: true, message: "跳转到 WorkflowCore LBS 明细（下一阶段接入）", tone: "info" })}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] text-slate-500 hover:bg-slate-100 ring-1 ring-slate-200">
                    详情 <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
                <ol className="relative flex-1 space-y-3 pl-1.5 before:absolute before:left-[14px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-slate-200 before:content-['']">
                  {(g.salesChain.steps ?? []).map((s, idx) => {
                    const isDone = s.tone === "done";
                    const isDoing = s.tone === "doing";
                    return (
                      <li key={idx} className="relative pl-8">
                        <span className={`absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white shadow-sm ${
                          isDone ? "bg-emerald-500 text-white" : isDoing ? "bg-sky-500 text-white animate-pulse" : "bg-slate-200 text-slate-600"
                        }`}>
                          {isDone ? <CheckCircle2 className="h-4 w-4" /> : isDoing ? <CircleDot className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
                        </span>
                        <div className={`rounded-xl px-3 py-2 ring-1 ${
                          isDone ? "bg-emerald-50/70 ring-emerald-200" : isDoing ? "bg-sky-50/80 ring-sky-200" : "bg-slate-50/50 ring-slate-200"
                        }`}>
                          <div className="flex items-center justify-between gap-2 text-[12px]">
                            <span className={`font-semibold ${isDone ? "text-emerald-800" : isDoing ? "text-sky-800" : "text-slate-700"}`}>{s.name}</span>
                            <span className={`text-[10.5px] font-medium ${
                              isDone ? "text-emerald-600" : isDoing ? "text-sky-600" : "text-slate-400"
                            }`}>{s.subline}</span>
                          </div>
                          <div className="mt-1 text-[11px] leading-5 text-slate-600">{s.detail}</div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {g.salesChain.strategyNote && (
                  <div className="mt-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 px-3 py-2.5 text-[11px] leading-5 text-violet-900 ring-1 ring-violet-200 whitespace-pre-line">
                    <div className="mb-0.5 font-semibold text-violet-800">LBS 策略优化注入</div>
                    {g.salesChain.strategyNote}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ============== P1 Tab4 全网获客 · 高保真专用布局渲染器 ============== */
type OmniDashProps = GeoDashProps;

function OmniDashboardRenderer(p: OmniDashProps) {
  const { data, source, fetchError, tabSlug, triggerLaunch, triggerExport, toast, setToast } = p;
  const [platformTab, setPlatformTab] = useState<string>(() => data.omniPlatformTabs?.find((t) => t.active)?.key ?? "douyin");
  const [stageTab, setStageTab] = useState<number>(() => data.omniStageTabs?.find((s) => s.active)?.index ?? 3);
  const [dispatchSubTab, setDispatchSubTab] = useState<string>(() => data.omniDispatchPanel?.activeSubTab ?? "s4");
  const platTabs = data.omniPlatformTabs ?? [];
  const stageTabs = data.omniStageTabs ?? [];
  const o = data.omniDispatchPanel;
  return (
    <div className="space-y-5">
      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
      <Modal
        open={p.permissionOpen}
        onClose={() => p.setPermissionOpen(false)}
        title={tabSlug === "ad-traffic" ? "申请 R07 投流总监专项授权" : "申请 R08 达人负责人专项授权"}
      >
        <div className="space-y-3 text-[13px] leading-6 text-slate-700">
          <p>
            <strong className="text-slate-900">
              {tabSlug === "ad-traffic"
                ? "申请后将可接入：巨量引擎/千川/腾讯广告 3 台账真实 API。"
                : "申请后将可接入：星图邀约/蝉妈妈筛选/抖音商家后台分润 3 台账真实 API。"}
            </strong>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-600">
            <li>当前系统版本已预埋对应权限格（R07 或 R08），不会访问真实客户数据。</li>
            <li>需要品牌负责人 8 字启动串 + 25 字发布授权串双授权后，方可在生产环境落盘。</li>
            <li>专项授权流程：提交申请 → B 层 Ontology 审批 → 写入权限矩阵 → 发布生产。</li>
          </ul>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => p.setPermissionOpen(false)}
              className="h-9 rounded-full border border-slate-200 px-4 text-[12.5px] text-slate-700 hover:bg-slate-50">稍后再说</button>
            <Link href={tabSlug === "ad-traffic" ? "/ai-control/advanced?tab=settings&permission=r07" : "/ai-control/advanced?tab=settings&permission=r08"}
              onClick={() => p.setPermissionOpen(false)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm bg-gradient-to-r ${data.ctaActionGradient} hover:brightness-105`}>
              前往 B 层权限审批台 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Modal>

      {/* Hero */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[12px] text-slate-500">
            <span>{data.breadcrumb}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-900 md:text-2xl">{data.heroTitle}</h2>
            <Pill tone={data.heroPillTone}>
              <span className={`h-1.5 w-1.5 rounded-full ${data.heroAccentDot}`} />
              {data.heroPillLabel}
            </Pill>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void triggerExport()}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-[12.5px] font-medium text-slate-700 shadow-sm hover:border-sky-200 hover:text-sky-700">
            <Download className="h-4 w-4" /> {data.ctaExportLabel}
          </button>
          <button type="button" onClick={() => void triggerLaunch()}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm hover:brightness-105 bg-gradient-to-r ${data.ctaActionGradient}`}>
            <Rocket className="h-4 w-4" /> {data.ctaActionLabel}
          </button>
        </div>
      </section>

      {/* 5阶段Tab */}
      {stageTabs.length > 0 && (
        <section className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-2 shadow-sm">
          {stageTabs.map((s) => {
            const isActive = stageTab === s.index;
            const tone =
              s.tone === "done"
                ? "text-emerald-700 ring-emerald-200 bg-emerald-50"
                : s.tone === "doing"
                ? isActive
                  ? "text-sky-800 ring-sky-300 bg-sky-100"
                  : "text-sky-700 ring-sky-200 bg-sky-50/70 animate-pulse"
                : "text-slate-500 ring-slate-200 bg-slate-50";
            return (
              <button key={s.index} type="button" onClick={() => setStageTab(s.index)}
                className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-medium ring-1 transition ${tone} ${
                  isActive ? "shadow-sm ring-offset-1 ring-offset-white" : "opacity-90 hover:brightness-105"
                }`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  s.tone === "done" ? "bg-emerald-500 text-white" : s.tone === "doing" ? "bg-sky-600 text-white" : "bg-slate-300 text-slate-700"
                }`}>
                  {s.tone === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.index}
                </span>
                <span className="whitespace-nowrap">{s.title}</span>
                <ChevronRight className={`h-3.5 w-3.5 opacity-50 ${isActive ? "opacity-100" : ""}`} />
              </button>
            );
          })}
        </section>
      )}

      {/* 5平台Tab */}
      {platTabs.length > 0 && (
        <section className="flex flex-wrap items-center gap-2">
          {platTabs.map((t) => {
            const active = platformTab === t.key;
            const baseTone = t.tone ?? "bg-neutral-900 text-white";
            return (
              <button key={t.key} type="button" onClick={() => setPlatformTab(t.key)}
                className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-medium shadow-sm transition ring-1 ${
                  active
                    ? baseTone + " ring-white/20 scale-[1.01]"
                    : "bg-white text-slate-700 ring-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}>
                {active ? <CheckCircle2 className="h-4 w-4 opacity-90" /> : <CircleDot className="h-4 w-4 opacity-60" />}
                <span>{t.label}</span>
                {t.hint ? (
                  <span className={`ml-1 text-[10.5px] opacity-80 ${active ? "text-white/85" : "text-slate-500"}`}>
                    · {t.hint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </section>
      )}

      {/* Top 3卡 */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {(() => {
          const t0 = data.omniTopCards?.[0];
          if (!t0) return null;
          const I0 = resolveIcon(t0.iconName ?? "Lightbulb");
          return (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-sky-300/70 transition">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-indigo-100 text-sky-700 ring-1 ring-sky-200">
                  <I0 className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">{t0.title}</h5>
                  {t0.subtitle && <p className="mt-0.5 text-[11.5px] text-slate-500">{t0.subtitle}</p>}
                </div>
              </div>
              {t0.badge && (
                <button type="button" onClick={() => setToast({ visible: true, message: "5平台矩阵策略 + 节奏参数重新注入（下一阶段接入）", tone: "info" })}
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-sky-50 px-3 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100">
                  <Sparkles className="h-3.5 w-3.5" /> {t0.badge}
                </button>
              )}
            </div>
            <div className="mb-3 whitespace-pre-line text-[12.5px] leading-6 text-slate-700">{t0.body}</div>
            <div className="space-y-1">
              {(t0.bulletList ?? []).map((b, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
            {t0.footer && (
              <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-fuchsia-50/80 px-3 py-2 text-[11px] leading-5 text-fuchsia-900 ring-1 ring-fuchsia-200">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-fuchsia-600 shrink-0" />
                <span>{t0.footer}</span>
              </div>
            )}
          </div>
          );
        })()}

        {/* 10月矩阵日历 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-300/60 transition">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-700 ring-1 ring-indigo-200">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">矩阵分发日历 + 日计划</h5>
                <p className="mt-0.5 text-[11.5px] text-slate-500">{data.omniDistributionCalendar?.yearMonthLabel ?? data.omniTopCards?.[1]?.subtitle}</p>
              </div>
            </div>
            {data.omniTopCards?.[1]?.badge && (
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-indigo-50 px-3 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200">
                {data.omniTopCards[1].badge}
              </span>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10.5px] font-medium text-slate-400 mb-1.5">
            {["一","二","三","四","五","六","日"].map((w) => <div key={w} className="py-1">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {(data.omniDistributionCalendar?.days ?? []).map((d, i) => {
              const t = d.tone ?? "";
              const isND = t.includes("rose");
              const isPreD11 = t.includes("fuchsia");
              const isWknd = t.includes("emerald");
              const isWk = t.includes("sky");
              const cls = isND
                ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white ring-rose-400 shadow-sm shadow-rose-200/50"
                : isPreD11
                ? "bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white ring-fuchsia-400 shadow-sm shadow-fuchsia-200/50"
                : isWknd
                ? "bg-emerald-500 text-white ring-emerald-400 shadow-sm shadow-emerald-200/50"
                : isWk
                ? "bg-sky-500 text-white ring-sky-400 shadow-sm shadow-sky-200/50"
                : d.week
                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                : "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
              return (
                <div key={i}
                  className={`group relative aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-semibold ring-1 transition hover:scale-105 hover:shadow-md ${cls}`}>
                  <span className="leading-none text-[11.5px]">{d.date}</span>
                  {d.label && <span className="mt-0.5 text-[9px] opacity-90 leading-3 text-center px-0.5">{d.label}</span>}
                </div>
              );
            })}
          </div>
          {data.omniTopCards?.[1]?.footer && (
            <div className="mt-3 text-[11px] leading-5 text-slate-500 ring-1 ring-slate-200 bg-slate-50 rounded-xl px-3 py-2">
              {data.omniTopCards[1].footer}
            </div>
          )}
        </div>

        {/* 爆款素材池 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-fuchsia-300/70 transition overflow-hidden">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-50 to-rose-100 text-fuchsia-700 ring-1 ring-fuchsia-200">
                <Library className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-900">{data.omniTopCards?.[2]?.title ?? data.omniViralLibrary?.title ?? "爆款素材池"}</h5>
                <p className="mt-0.5 text-[11.5px] text-slate-500">{data.omniViralLibrary?.subtitle}</p>
              </div>
            </div>
            {data.omniTopCards?.[2]?.badge && (
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-rose-50 px-3 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">
                <Sparkles className="h-3.5 w-3.5" /> {data.omniTopCards[2].badge}
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-thin-scroll">
            {(data.omniViralLibrary?.items ?? []).map((it, i) => (
              <div key={i}
                className="group flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 ring-1 ring-white transition hover:border-sky-200 hover:bg-white hover:shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${it.tone}`}>
                    {it.tag}
                  </span>
                </div>
                <div className="text-[12px] font-medium leading-5 text-slate-800 group-hover:text-sky-800 transition">{it.title}</div>
                <div className="text-[10.5px] text-slate-500">{it.hint}</div>
              </div>
            ))}
          </div>
          {data.omniTopCards?.[2]?.footer && (
            <div className="mt-2 text-[10.5px] leading-5 text-slate-500">{data.omniTopCards[2].footer}</div>
          )}
        </div>
      </section>

      {/* 5) 全网矩阵分发大面板 */}
      {o && (
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4 bg-gradient-to-r from-sky-50 via-white to-white">
            <div>
              <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1 text-[11.5px] font-semibold text-white ring-1 ring-sky-400/30 shadow-sm">
                <Share2 className="h-3.5 w-3.5" /> 全网矩阵分发面板 · 统一 7 子 Tab
              </div>
              <h4 className="mt-2 text-[14.5px] font-bold text-slate-900">{o.projectTitle}</h4>
            </div>
            <div className="text-[11.5px] text-slate-600 bg-slate-50/90 ring-1 ring-slate-200 px-3 py-1.5 rounded-full">
              {o.rightStatus}
            </div>
          </div>

          <div className="overflow-x-auto border-b border-slate-100 px-3 pt-3 bg-slate-50/50 custom-thin-scroll">
            <div className="flex items-center gap-1 min-w-max pb-3">
              {o.subTabs.map((t) => {
                const active = dispatchSubTab === t.key;
                return (
                  <button key={t.key} type="button" onClick={() => setDispatchSubTab(t.key)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition whitespace-nowrap ${
                      active
                        ? t.accent ?? "bg-sky-600 text-white shadow-sm ring-1 ring-sky-700/20"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    }`}>
                    <span className={active ? "opacity-95" : "opacity-80"}>{t.label}</span>
                    {t.key === "s4" && <span className="text-[9.5px] opacity-80">⭐</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50/40 via-white to-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200">
                      <Wand2 className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h5 className="text-[13px] font-semibold text-slate-900">{o.publishBlock.title}</h5>
                      <div className="mt-1 flex items-center flex-wrap gap-1.5">
                        <span className="text-[11px] text-slate-500">{o.publishBlock.caption}</span>
                        {(o.publishBlock.autoInjectTags ?? []).map((tg, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-sky-200">
                            <CheckCircle2 className="h-2.5 w-2.5" /> 已注入: {tg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setToast({ visible: true, message: "已提交矩阵分发专家链（已嵌入 Omni-Matrix Pipeline），蚁小二接口已候命", tone: "info" })}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 px-4 text-[12px] font-semibold text-white shadow-sm hover:brightness-105">
                    <Megaphone className="h-4 w-4" /> {o.publishBlock.startButton}
                  </button>
                </div>
                <div className="mt-4 rounded-xl border border-sky-100 bg-white/80 p-3.5">
                  <ul className="space-y-1.5 text-[12px] leading-6 text-slate-700">
                    {(o.publishBlock.notes ?? []).map((n, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 inline-flex h-1 w-1 shrink-0 rounded-full bg-sky-400" />
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {(o.generatedAssets ?? []).map((a, i) => {
                    return (
                      <button key={i} type="button"
                        onClick={() => setToast({ visible: true, tone: "info", message: `打开平台版本：${a.label}（已自动进入 ⑤平台审核态 Tab）` })}
                        className={`group relative flex aspect-square flex-col items-center justify-between rounded-2xl p-3 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${a.tone} hover:brightness-105`}>
                        <div className="flex-1 flex w-full items-center justify-center rounded-xl bg-white/40 backdrop-blur-[2px] ring-1 ring-white/60 my-2">
                          {i === 0 ? <FileVideo className="h-10 w-10 text-white/90" /> : i === 1 ? <FileImage className="h-10 w-10 text-white/90" /> : i === 2 ? <FileVideo className="h-10 w-10 text-white/90" /> : <FileText className="h-10 w-10 text-white/90" />}
                        </div>
                        <div className="w-full rounded-lg px-2 py-1 text-[10.5px] font-semibold leading-4 text-center ring-1 ring-white/70 bg-white/85 text-slate-800">
                          {a.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-sky-50/80 px-3 py-2 text-[11px] leading-5 text-sky-900 ring-1 ring-sky-200">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-sky-600 shrink-0" />
                  <span>{o.publishBlock.footer}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50/40 p-4 shadow-sm h-full flex flex-col">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                    <h5 className="text-[13px] font-semibold text-slate-900">{o.opsChain.title}</h5>
                  </div>
                  <button type="button"
                    onClick={() => setToast({ visible: true, message: "跳转到 WorkflowCore 矩阵明细（下一阶段接入）", tone: "info" })}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] text-slate-500 hover:bg-slate-100 ring-1 ring-slate-200">
                    详情 <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
                <ol className="relative flex-1 space-y-3 pl-1.5 before:absolute before:left-[14px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-slate-200 before:content-['']">
                  {(o.opsChain.steps ?? []).map((s, idx) => {
                    const isDone = s.tone === "done";
                    const isDoing = s.tone === "doing";
                    return (
                      <li key={idx} className="relative pl-8">
                        <span className={`absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white shadow-sm ${
                          isDone ? "bg-emerald-500 text-white" : isDoing ? "bg-sky-500 text-white animate-pulse" : "bg-slate-200 text-slate-600"
                        }`}>
                          {isDone ? <CheckCircle2 className="h-4 w-4" /> : isDoing ? <CircleDot className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
                        </span>
                        <div className={`rounded-xl px-3 py-2 ring-1 ${
                          isDone ? "bg-emerald-50/70 ring-emerald-200" : isDoing ? "bg-sky-50/80 ring-sky-200" : "bg-slate-50/50 ring-slate-200"
                        }`}>
                          <div className="flex items-center justify-between gap-2 text-[12px]">
                            <span className={`font-semibold ${isDone ? "text-emerald-800" : isDoing ? "text-sky-800" : "text-slate-700"}`}>{s.name}</span>
                            <span className={`text-[10.5px] font-medium ${
                              isDone ? "text-emerald-600" : isDoing ? "text-sky-600" : "text-slate-400"
                            }`}>{s.subline}</span>
                          </div>
                          <div className="mt-1 text-[11px] leading-5 text-slate-600">{s.detail}</div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {o.opsChain.strategyNote && (
                  <div className="mt-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 px-3 py-2.5 text-[11px] leading-5 text-violet-900 ring-1 ring-violet-200 whitespace-pre-line">
                    <div className="mb-0.5 font-semibold text-violet-800">矩阵策略优化注入</div>
                    {o.opsChain.strategyNote}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

type RendererProps = Parameters<typeof DashboardRenderer>[0] & {
  triggerLaunch: () => void;
  triggerExport: () => void;
  toast: { visible: boolean; message: string; tone: "success" | "error" | "info" | "warn" };
  setToast: React.Dispatch<React.SetStateAction<{ visible: boolean; message: string; tone: "success" | "error" | "info" | "warn" }>>;
  permissionOpen: boolean;
  setPermissionOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

function StageTabBar(props: {
  title: string; stages: { index: number; title: string; tone?: "done" | "doing" | "pending" }[];
  pillTone?: string; dot?: string;
  accent?: string; rightStatus?: string; triggerExport?: () => void; triggerLaunch?: () => void; ctaExportLabel?: string; ctaActionLabel?: string; ctaActionGradient?: string;
  permissionBanner?: { tone: string; text: string } | null; breadcrumb?: string;
}) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div className="w-full">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-slate-500">
          <span>{props.breadcrumb}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-900 md:text-2xl">{props.title}</h2>
          <Pill tone={props.pillTone ?? "bg-slate-50 text-slate-700 ring-slate-200"}>
            <span className={`h-1.5 w-1.5 rounded-full ${props.dot ?? "bg-slate-400"}`} />
            第 38 周 · 执行中
          </Pill>
        </div>
        {props.permissionBanner ? (
          <div className={`mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] ring-1 ${props.permissionBanner.tone}`}>
            <Lock className="h-3.5 w-3.5" />{props.permissionBanner.text}
          </div>
        ) : null}
      </div>
      <div className="w-full">
        <div className={`mb-1 inline-flex h-1.5 w-1.5 translate-y-[-2px] rounded-full ${props.accent ?? "bg-slate-400"}`} />
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {(props.stages ?? []).map((s) => {
            const isDone = s.tone === "done";
            const isDoing = s.tone === "doing";
            return (
              <button key={s.index} type="button"
                className={`group inline-flex min-w-max items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium ring-1 transition ${
                  isDone ? "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100" :
                  isDoing ? "bg-white text-slate-900 ring-2 ring-slate-900 shadow-sm" :
                  "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-white"
                }`}>
                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                  isDone ? "bg-emerald-500 text-white" : isDoing ? "bg-slate-900 text-white animate-pulse" : "bg-slate-200 text-slate-500"
                }`}>{isDone ? <CheckCircle2 className="h-3 w-3" /> : s.index}</span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button type="button" onClick={() => void props.triggerExport?.()}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-[12.5px] font-medium text-slate-700 shadow-sm hover:border-indigo-200 hover:text-indigo-700">
          <Download className="h-4 w-4" />{props.ctaExportLabel ?? "导出周报"}
        </button>
        <button type="button" onClick={() => void props.triggerLaunch?.()}
          className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm hover:brightness-105 bg-gradient-to-r ${props.ctaActionGradient ?? "from-slate-700 to-slate-900"}`}>
          <Rocket className="h-4 w-4" />{props.ctaActionLabel ?? "启动自动化任务"}
        </button>
      </div>
    </section>
  );
}

function DomainTabBar(props: { tabs: { label: string; hint: string; tone: string; active: boolean }[]; accent: string; title: string; subtitle?: string; onClickHint?: (label: string) => void }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/50 p-5 shadow-sm">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className={`mb-1 inline-flex h-1.5 w-1.5 translate-y-[-2px] rounded-full ${props.accent}`} />
          <h3 className="ml-1 inline-block text-[15px] font-semibold text-slate-900">{props.title}</h3>
          {props.subtitle && <p className="ml-1 mt-0.5 text-[12px] text-slate-500">{props.subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(props.tabs ?? []).map((t, i) => (
          <button key={i} type="button" onClick={() => props.onClickHint?.(t.label)}
            className={`group flex min-w-max flex-1 items-start gap-2 rounded-xl p-2.5 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-sm ${
              t.active ? "bg-white ring-2 ring-slate-900 shadow-sm" : "bg-white/60 ring-slate-200 hover:ring-slate-300"
            }`}>
            <div className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${t.tone}`}>{t.active ? "✓" : i + 1}</div>
            <div className="flex-1 min-w-0">
              <div className={`text-[12.5px] font-semibold leading-5 ${t.active ? "text-slate-900" : "text-slate-700"}`}>{t.label}</div>
              <div className="mt-0.5 text-[11px] leading-4 text-slate-500">{t.hint}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function TopCardRow(props: { cards: { title: string; subtitle?: string; badge?: string; body: string; bulletList?: string[]; footer?: string; accentColor?: string; iconName?: string }[]; accent: string; iconResolver: (name?: string) => React.ComponentType<any> }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {(props.cards ?? []).map((c, i) => {
        const TopIcon = props.iconResolver(c.iconName);
        return (
          <div key={i} className={`rounded-2xl border border-slate-200/80 bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${c.accentColor ?? "from-white to-slate-50"}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 ring-1 ring-white/70">
                  <TopIcon className={`h-4 w-4 ${i === 0 ? "text-rose-700" : i === 1 ? "text-pink-700" : "text-fuchsia-700"}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold leading-5 text-slate-900 truncate">{c.title}</div>
                  {c.subtitle && <div className="mt-0.5 text-[11px] leading-4 text-slate-500 truncate">{c.subtitle}</div>}
                </div>
              </div>
              {c.badge && <span className={`ml-1 inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${props.accent} text-slate-900 bg-white/70 ring-slate-200`}>{c.badge}</span>}
            </div>
            <div className="mt-1 rounded-xl bg-white/70 px-3 py-2 text-[12px] leading-5 text-slate-700 ring-1 ring-white/70 whitespace-pre-line">{c.body}</div>
            {c.bulletList && c.bulletList.length > 0 && (
              <ul className="mt-2 space-y-1 px-2 text-[11.5px] leading-5 text-slate-700">
                {c.bulletList.map((b, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className={`mt-2 inline-flex h-1 w-1 shrink-0 rounded-full ${props.accent}`} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {c.footer && <div className="mt-2 rounded-xl bg-white/60 px-2.5 py-1.5 text-[11px] leading-4 text-slate-600 ring-1 ring-white/70">{c.footer}</div>}
          </div>
        );
      })}
    </section>
  );
}

function Calendar31Grid(props: { cal: { yearMonthLabel: string; days: { date: number; tone?: string; label?: string; week?: boolean }[] }; accent: string }) {
  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className={`mb-1 inline-flex h-1.5 w-1.5 translate-y-[-2px] rounded-full ${props.accent}`} />
          <h3 className="ml-1 inline-block text-[15px] font-semibold text-slate-900">{props.cal.yearMonthLabel}</h3>
          <p className="ml-1 mt-0.5 text-[12px] text-slate-500">5 色 分层节奏 · 点击格子查看对应日计划</p>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {weekdays.map((w) => <div key={w} className="py-1 text-[11px] font-medium text-slate-400">{w}</div>)}
        {Array.from({ length: 2 }).map((_, i) => <div key={"pad" + i} />)}
        {(props.cal.days ?? []).map((d) => (
          <div key={d.date}
            className={`group relative aspect-square flex flex-col items-center justify-start gap-0.5 rounded-xl p-1 text-[11px] ring-1 transition hover:-translate-y-0.5 hover:shadow-sm ${d.tone ?? "bg-slate-50 text-slate-400 ring-slate-200"}`}>
            <span className="mt-0.5 text-[11px] font-semibold">{d.date}</span>
            {d.label && <span className="mt-0.5 line-clamp-2 text-[9.5px] leading-3 opacity-95 px-0.5">{d.label}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

function LibraryList(props: { lib: { title: string; subtitle: string; items: { tag: string; tone: string; title: string; hint: string }[] }; accent: string }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/40 p-5 shadow-sm">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className={`mb-1 inline-flex h-1.5 w-1.5 translate-y-[-2px] rounded-full ${props.accent}`} />
          <h3 className="ml-1 inline-block text-[15px] font-semibold text-slate-900">{props.lib.title}</h3>
          <p className="ml-1 mt-0.5 text-[12px] text-slate-500">{props.lib.subtitle}</p>
        </div>
        <span className="inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[10.5px] font-medium text-slate-600 ring-1 ring-slate-200">NEW 滚动</span>
      </div>
      <ul className="space-y-2">
        {(props.lib.items ?? []).map((it, i) => (
          <li key={i} className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white/80 p-3 transition hover:-translate-y-0.5 hover:shadow-sm">
            <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${it.tone}`}>{it.tag}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold leading-5 text-slate-900">{it.title}</div>
              <div className="mt-0.5 text-[11.5px] leading-5 text-slate-500">{it.hint}</div>
            </div>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FunnelList(props: { funnel: { title: string; subtitle: string; regions?: any[]; tiers?: any[] }; accent: string; mode: "coverage" | "collab" }) {
  const rows = props.mode === "coverage" ? (props.funnel.regions ?? []) : (props.funnel.tiers ?? []);
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className={`mb-1 inline-flex h-1.5 w-1.5 translate-y-[-2px] rounded-full ${props.accent}`} />
          <h3 className="ml-1 inline-block text-[15px] font-semibold text-slate-900">{props.funnel.title}</h3>
          <p className="ml-1 mt-0.5 text-[12px] text-slate-500">{props.funnel.subtitle}</p>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((r: any, i: number) => {
          const rate = r.progress ?? 50;
          return (
            <div key={i} className="rounded-xl ring-1 ring-slate-100 bg-slate-50/60 p-3">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${r.tone}`}>{r.name}</span>
                  <span className="text-[11.5px] text-slate-600">Δ {r.delta}</span>
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-900">{r.count}</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span>{r.lead ?? r.conversion}</span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
                <div className={`h-full rounded-full ${r.tone}`} style={{ width: `${Math.max(6, Math.min(100, rate))}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BigPanel(props: {
  panel: any; accent: string;
  setToast: any; permissionOpen: any; setPermissionOpen: any; tabSlug: string; mode: "ad" | "creator";
  chainTitle: string; strategyInjectedTitle: string;
}) {
  const setToast = props.setToast;
  const subAccent = props.accent;
  const panel = props.panel;
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/50 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={`mb-1 inline-flex h-1.5 w-1.5 translate-y-[-2px] rounded-full ${subAccent}`} />
          <h3 className="ml-1 inline-block text-[15px] font-semibold text-slate-900">{panel.projectTitle}</h3>
          <p className="ml-1 mt-0.5 text-[12px] text-slate-500">{panel.rightStatus}</p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5 overflow-x-auto">
        {(panel.subTabs ?? []).map((s: any, i: number) => (
          <button key={s.key} type="button" onClick={() => setToast({ visible: true, message: `切换子 Tab：${s.label}`, tone: "info" })}
            className={`inline-flex min-w-max items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-medium ring-1 transition ${
              s.key === panel.activeSubTab ? `bg-white ring-2 ${subAccent.replace("bg-", "ring-")} shadow-sm` : "bg-slate-50 text-slate-600 ring-slate-200 hover:bg-white"
            } ${s.accent ?? ""}`}>
            <span>{s.label}</span>
            {s.hint && <span className="text-[10px] opacity-80">{s.hint}</span>}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-3">
          <div>
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
              <div className="mb-2 flex items-start gap-2">
                <div className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${subAccent.replace("bg-", "bg-").replace("-500", "-100")} ${subAccent.replace("bg-", "text-").replace("-500", "-700")} ${subAccent.replace("bg-", "ring-").replace("-500", "-200")}`}>
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold leading-5 text-slate-900">{props.mode === "ad" ? panel.launchBlock?.title : panel.collabBlock?.title}</div>
                  <div className="mt-0.5 text-[11.5px] leading-5 text-slate-500">{props.mode === "ad" ? panel.launchBlock?.caption : panel.collabBlock?.caption}</div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1.5 md:grid-cols-2">
                {((props.mode === "ad" ? panel.launchBlock?.autoInjectTags : panel.collabBlock?.autoInjectTags) ?? []).map((t: string, i: number) => (
                  <div key={i} className="rounded-xl bg-white/80 px-2.5 py-1.5 text-[11.5px] leading-5 text-slate-700 ring-1 ring-slate-100">
                    {t}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => props.setPermissionOpen(true)}
                  className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm hover:brightness-105 bg-gradient-to-r ${subAccent.replace("bg-", "from-").replace("-500", "-500")} ${subAccent.replace("bg-", "to-").replace("-500", "-600").replace("from-rose", "to-pink")}`}>
                  <Rocket className="h-4 w-4" />
                  {props.mode === "ad" ? panel.launchBlock?.startButton : panel.collabBlock?.startButton}
                </button>
                <div className="text-[11px] font-medium text-slate-500">状态 4 格：🟢就绪×3 · 🔴待审×1</div>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {((props.mode === "ad" ? panel.launchBlock?.notes : panel.collabBlock?.notes) ?? []).map((n: string, i: number) => (
                <li key={i} className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-[12px] leading-5 text-slate-700 ring-1 ring-slate-100">
                  <span className={`mt-1.5 inline-flex h-1 w-1 shrink-0 rounded-full ${subAccent}`} />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {((props.mode === "ad" ? panel.plannedPlans : panel.collabTalents) ?? []).map((a: any, i: number) => (
                <button key={i} type="button"
                  onClick={() => setToast({ visible: true, tone: "info", message: `打开版本：${a.label}` })}
                  className={`group relative flex aspect-square flex-col items-center justify-between rounded-2xl p-3 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${a.tone} hover:brightness-105`}>
                  <div className="flex-1 flex w-full items-center justify-center rounded-xl bg-white/40 backdrop-blur-[2px] ring-1 ring-white/60 my-2">
                    {i === 0 ? <FileVideo className="h-10 w-10 text-white/90" /> : i === 1 ? <FileImage className="h-10 w-10 text-white/90" /> : i === 2 ? <FileVideo className="h-10 w-10 text-white/90" /> : <Users className="h-10 w-10 text-white/90" />}
                  </div>
                  <div className="w-full rounded-lg px-2 py-1 text-[10.5px] font-semibold leading-4 text-center ring-1 ring-white/70 bg-white/85 text-slate-800">{a.label}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-white/80 px-3 py-2 text-[11px] leading-5 text-slate-800 ring-1 ring-slate-100">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{props.mode === "ad" ? panel.launchBlock?.footer : panel.collabBlock?.footer}</span>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50/40 p-4 shadow-sm h-full flex flex-col">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${subAccent.replace("bg-", "bg-").replace("-500", "-100")} ${subAccent.replace("bg-", "text-").replace("-500", "-700")} ${subAccent.replace("bg-", "ring-").replace("-500", "-200")}`}>
                  <Users className="h-4.5 w-4.5" />
                </div>
                <h5 className="text-[13px] font-semibold text-slate-900">{props.chainTitle}</h5>
              </div>
              <button type="button" onClick={() => setToast({ visible: true, message: "跳转到 WorkflowCore 明细（下一阶段接入）", tone: "info" })}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] text-slate-500 hover:bg-slate-100 ring-1 ring-slate-200">
                详情 <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <ol className="relative flex-1 space-y-3 pl-1.5 before:absolute before:left-[14px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-slate-200 before:content-['']">
              {((props.mode === "ad" ? panel.adChain?.steps : panel.creatorChain?.steps) ?? []).map((s: any, idx: number) => {
                const isDone = s.tone === "done";
                const isDoing = s.tone === "doing";
                return (
                  <li key={idx} className="relative pl-8">
                    <span className={`absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white shadow-sm ${
                      isDone ? "bg-emerald-500 text-white" : isDoing ? `${subAccent} text-white animate-pulse` : "bg-slate-200 text-slate-600"
                    }`}>
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : isDoing ? <CircleDot className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
                    </span>
                    <div className={`rounded-xl px-3 py-2 ring-1 ${
                      isDone ? "bg-emerald-50/70 ring-emerald-200" : isDoing ? `${subAccent.replace("bg-", "bg-").replace("-500", "-50/80")} ${subAccent.replace("bg-", "ring-").replace("-500", "-200")}` : "bg-slate-50/50 ring-slate-200"
                    }`}>
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className={`font-semibold ${isDone ? "text-emerald-800" : isDoing ? `${subAccent.replace("bg-", "text-").replace("-500", "-800")}` : "text-slate-700"}`}>{s.name}</span>
                        <span className={`text-[10.5px] font-medium ${isDone ? "text-emerald-600" : isDoing ? `${subAccent.replace("bg-", "text-").replace("-500", "-600")}` : "text-slate-400"}`}>{s.subline}</span>
                      </div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-600">{s.detail}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {((props.mode === "ad" ? panel.adChain?.strategyNote : panel.creatorChain?.strategyNote)) && (
              <div className={`mt-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 px-3 py-2.5 text-[11px] leading-5 text-violet-900 ring-1 ring-violet-200 whitespace-pre-line`}>
                <div className="mb-0.5 font-semibold text-violet-800">{props.strategyInjectedTitle}</div>
                {props.mode === "ad" ? panel.adChain?.strategyNote : panel.creatorChain?.strategyNote}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrafficDashboardRenderer({ data, source, fetchError, tabSlug, triggerLaunch, triggerExport, toast, setToast, permissionOpen, setPermissionOpen }: RendererProps) {
  const t = data?.trafficStageTabs ?? [];
  const m = data?.trafficMediaTabs ?? [];
  const t3 = data?.trafficTopCards ?? [];
  const cal = data?.trafficBudgetCalendar;
  const lib = data?.trafficCreativesLibrary;
  const panel = data?.trafficCampaignPanel;
  const iconResolver = (name?: string) => {
    switch (name) { case "Zap": return Zap; case "Calendar": return Calendar; case "Wallet": default: return Wallet; }
  };
  return (
    <div className="space-y-6">
      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
      <Modal open={permissionOpen} onClose={() => setPermissionOpen(false)} title="申请 R07 投流总监专项授权">
        <div className="space-y-3 text-[13px] leading-6 text-slate-700">
          <p><strong className="text-slate-900">申请后将可接入：巨量引擎/千川/腾讯广告/视频号/小红书薯条 5 媒体真实 API</strong></p>
          <ul className="list-disc space-y-1 pl-5 text-slate-600">
            <li>当前系统版本已预埋 R07 权限格，不会访问真实客户数据。</li>
            <li>需品牌 8 字启动串 + 25 字发布授权串双授权后，生产环境落盘。</li>
          </ul>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPermissionOpen(false)} className="h-9 rounded-full border border-slate-200 px-4 text-[12.5px] text-slate-700 hover:bg-slate-50">稍后再说</button>
            <Link href="/ai-control/advanced?tab=settings&permission=r07" onClick={() => setPermissionOpen(false)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm bg-gradient-to-r ${data?.ctaActionGradient ?? "from-rose-500 to-pink-500"} hover:brightness-105`}>
              前往 B 层权限审批台 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Modal>
      <StageTabBar title={data?.heroTitle ?? ""} stages={t} breadcrumb={data?.breadcrumb} pillTone={data?.heroPillTone} dot={data?.heroAccentDot} accent="bg-rose-500" rightStatus={panel?.rightStatus} triggerExport={triggerExport} triggerLaunch={() => setPermissionOpen(true)} ctaExportLabel={data?.ctaExportLabel} ctaActionLabel={data?.ctaActionLabel ?? "申请R07授权"} ctaActionGradient={data?.ctaActionGradient} permissionBanner={data?.permissionBanner ?? null} />
      <DomainTabBar tabs={m} accent="bg-rose-500" title="5 媒体投放矩阵" subtitle="点击媒体切换查看对应投放明细 / 计划状态 / Token状态" onClickHint={(label) => setToast({ visible: true, message: `切换媒体：${label}`, tone: "info" })} />
      <TopCardRow cards={t3} accent="bg-rose-500" iconResolver={iconResolver} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {cal && <Calendar31Grid cal={cal} accent="bg-rose-500" />}
        {lib && <LibraryList lib={lib} accent="bg-rose-500" />}
      </div>
      {panel && <BigPanel panel={panel} accent="bg-rose-500" setToast={setToast} permissionOpen={permissionOpen} setPermissionOpen={setPermissionOpen} tabSlug={tabSlug} mode="ad" chainTitle={panel.adChain?.title ?? "双节联投投放作业链 (AdFlow Pipeline)"} strategyInjectedTitle="投流策略优化注入" />}
    </div>
  );
}

function DarenDashboardRenderer({ data, source, fetchError, tabSlug, triggerLaunch, triggerExport, toast, setToast, permissionOpen, setPermissionOpen }: RendererProps) {
  const t = data?.darenStageTabs ?? [];
  const m = data?.darenMatrixTabs ?? [];
  const t3 = data?.darenTopCards ?? [];
  const funnel = data?.darenCollabFunnel;
  const lib = data?.darenTalentLibrary;
  const panel = data?.darenCollabPanel;
  const iconResolver = (name?: string) => {
    switch (name) { case "Crown": return Crown; case "Calendar": return Calendar; case "Users": default: return Users; }
  };
  return (
    <div className="space-y-6">
      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
      <Modal open={permissionOpen} onClose={() => setPermissionOpen(false)} title="申请 R08 达人负责人专项授权">
        <div className="space-y-3 text-[13px] leading-6 text-slate-700">
          <p><strong className="text-slate-900">申请后将可接入：星图邀约/蝉妈妈筛选/抖音商家后台分润 3 台账真实 API</strong></p>
          <ul className="list-disc space-y-1 pl-5 text-slate-600">
            <li>当前已预埋 R08 权限格，零访问真实达人台账/分润数据。</li>
            <li>品牌 8 字+25 字双授权串发布后，星图签约/蝉妈妈选品/商家后台分润 三大台账 API 接通。</li>
          </ul>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPermissionOpen(false)} className="h-9 rounded-full border border-slate-200 px-4 text-[12.5px] text-slate-700 hover:bg-slate-50">稍后再说</button>
            <Link href="/ai-control/advanced?tab=settings&permission=r08" onClick={() => setPermissionOpen(false)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-white shadow-sm bg-gradient-to-r ${data?.ctaActionGradient ?? "from-fuchsia-500 to-purple-500"} hover:brightness-105`}>
              前往 B 层权限审批台 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Modal>
      <StageTabBar title={data?.heroTitle ?? ""} stages={t} breadcrumb={data?.breadcrumb} pillTone={data?.heroPillTone} dot={data?.heroAccentDot} accent="bg-fuchsia-500" rightStatus={panel?.rightStatus} triggerExport={triggerExport} triggerLaunch={() => setPermissionOpen(true)} ctaExportLabel={data?.ctaExportLabel} ctaActionLabel={data?.ctaActionLabel ?? "申请R08授权"} ctaActionGradient={data?.ctaActionGradient} permissionBanner={data?.permissionBanner ?? null} />
      <DomainTabBar tabs={m} accent="bg-fuchsia-500" title="5 层达人矩阵（头腰尾 KOC 素人）" subtitle="点击分层查看对应匹配清单/寄样台账/分润状态" onClickHint={(label) => setToast({ visible: true, message: `切换层级：${label}`, tone: "info" })} />
      <TopCardRow cards={t3} accent="bg-fuchsia-500" iconResolver={iconResolver} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {funnel && <FunnelList funnel={funnel} accent="bg-fuchsia-500" mode="collab" />}
        {lib && <LibraryList lib={lib} accent="bg-fuchsia-500" />}
      </div>
      {panel && <BigPanel panel={panel} accent="bg-fuchsia-500" setToast={setToast} permissionOpen={permissionOpen} setPermissionOpen={setPermissionOpen} tabSlug={tabSlug} mode="creator" chainTitle={panel.creatorChain?.title ?? "双节联投达人作业链 (CreatorCollab Pipeline)"} strategyInjectedTitle="达人合作策略优化注入" />}
    </div>
  );
}
