"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
  Building2,
  Rocket,
  Network,
  Users,
  MapPin,
} from "lucide-react";

export type TabKey =
  | "brand-control"
  | "content-customer"
  | "geo-customer"
  | "omni-channel"
  | "ad-traffic"
  | "daren-collab";

export type TabMeta = {
  key: TabKey;
  index: string;
  title: string;
  subtitle: string;
  kpiLabel: string;
  kpiValue: string;
  kpiDelta: string;
  targetHref: string;
  actionLabel: string;
  pipelineTag: string;
  heroBadge: string;
  icon: LucideIcon;
  iconBgClass: string;
  iconTextClass: string;
  iconRingClass: string;
  kpiBgTone: string;
  kpiNumberClass: string;
  cards: {
    k: string;
    v: string;
    iconBgClass: string;
    iconTextClass: string;
    iconRingClass: string;
    icon: LucideIcon;
  }[];
  depth: string;
  owner: string;
  scope: string;
};

export const TAB_META: Record<TabKey, TabMeta> = {
  "brand-control": {
    key: "brand-control",
    index: "Tab1",
    title: "品牌总控驾驶舱",
    subtitle: "全域资产 · 专家/Skill 81 格权限 · 健康度 · 版本发布锚点",
    kpiLabel: "全域健康度（HEART52）",
    kpiValue: "92.4",
    kpiDelta: "+1.8 本周",
    targetHref: "/brand-growth",
    actionLabel: "进入品牌增长总控工作台",
    pipelineTag: "P24 · Brand Console READ",
    heroBadge: "81 格 RBAC · D138 锚定",
    icon: Building2,
    iconBgClass: "bg-gradient-to-br from-indigo-50 to-indigo-100",
    iconTextClass: "text-indigo-600",
    iconRingClass: "ring-indigo-200",
    kpiBgTone: "bg-gradient-to-br from-indigo-50 to-indigo-100/60 ring-indigo-200/80",
    kpiNumberClass: "text-indigo-600",
    cards: [
      {
        k: "读数据",
        v: "专家团实时读域内台账",
        icon: Sparkles,
        iconBgClass: "bg-gradient-to-br from-sky-50 to-sky-100",
        iconTextClass: "text-sky-600",
        iconRingClass: "ring-sky-200",
      },
      {
        k: "写操作",
        v: "D53 三联动 bumpTaskRevision + outbox",
        icon: Rocket,
        iconBgClass: "bg-gradient-to-br from-emerald-50 to-emerald-100",
        iconTextClass: "text-emerald-600",
        iconRingClass: "ring-emerald-200",
      },
      {
        k: "越权保护",
        v: "81 格 RBAC · 越权立即 V094 ×0 retry",
        icon: ShieldCheck,
        iconBgClass: "bg-gradient-to-br from-amber-50 to-amber-100",
        iconTextClass: "text-amber-700",
        iconRingClass: "ring-amber-200",
      },
    ],
    depth: "4 级资源树",
    owner: "brand-assets-keeper",
    scope: "BusinessAsset × Tone/Voice × Ontology 7 类映射",
  },
  "content-customer": {
    key: "content-customer",
    index: "Tab2",
    title: "内容获客驾驶舱",
    subtitle: "爆款拆解 → 选题库 → 素材 → 文案 → 视频 → 发布 自动化链路",
    kpiLabel: "明日自动化待办选题",
    kpiValue: "18",
    kpiDelta: "+5 今日新增",
    targetHref: "/xiaohongshu",
    actionLabel: "进入内容获客工作台（启动明日自动化）",
    pipelineTag: "P24 · Content 34-step Pipeline",
    heroBadge: "P24 · 34 步流水线 锚定",
    icon: Sparkles,
    iconBgClass: "bg-gradient-to-br from-amber-50 to-orange-100",
    iconTextClass: "text-amber-700",
    iconRingClass: "ring-amber-200",
    kpiBgTone: "bg-gradient-to-br from-amber-50 to-orange-100/60 ring-amber-200/80",
    kpiNumberClass: "text-amber-700",
    cards: [
      {
        k: "选题库",
        v: "爆款拆解 5000+ 模板",
        icon: Sparkles,
        iconBgClass: "bg-gradient-to-br from-sky-50 to-sky-100",
        iconTextClass: "text-sky-600",
        iconRingClass: "ring-sky-200",
      },
      {
        k: "流水线",
        v: "文案 → 视频 → 发布 P24 34 步",
        icon: Rocket,
        iconBgClass: "bg-gradient-to-br from-emerald-50 to-emerald-100",
        iconTextClass: "text-emerald-600",
        iconRingClass: "ring-emerald-200",
      },
      {
        k: "明日自动化",
        v: "按一下 72 小时发布节奏",
        icon: Network,
        iconBgClass: "bg-gradient-to-br from-violet-50 to-violet-100",
        iconTextClass: "text-violet-600",
        iconRingClass: "ring-violet-200",
      },
    ],
    depth: "3 级流程",
    owner: "content-huoke-team-lead",
    scope: "选题/脚本/素材/文案/视频/发布 6 步闭环",
  },
  "geo-customer": {
    key: "geo-customer",
    index: "Tab3",
    title: "GEO 获客驾驶舱",
    subtitle: "门店地理围栏 · 内容召回 · 触达归因 · 本地生活矩阵",
    kpiLabel: "活跃门店覆盖",
    kpiValue: "312",
    kpiDelta: "+23 本周新增",
    targetHref: "/geo",
    actionLabel: "进入 GEO 门店获客工作台",
    pipelineTag: "P24 · GEO LBS Recall+Attribution",
    heroBadge: "LBS 围栏 · D137 锚定",
    icon: MapPin,
    iconBgClass: "bg-gradient-to-br from-emerald-50 to-teal-100",
    iconTextClass: "text-emerald-600",
    iconRingClass: "ring-emerald-200",
    kpiBgTone: "bg-gradient-to-br from-emerald-50 to-teal-100/60 ring-emerald-200/80",
    kpiNumberClass: "text-emerald-600",
    cards: [
      {
        k: "LBS 围栏",
        v: "门店 5km 智能召回",
        icon: MapPin,
        iconBgClass: "bg-gradient-to-br from-sky-50 to-sky-100",
        iconTextClass: "text-sky-600",
        iconRingClass: "ring-sky-200",
      },
      {
        k: "触达矩阵",
        v: "短信 + 企微 + 抖音本地",
        icon: Network,
        iconBgClass: "bg-gradient-to-br from-emerald-50 to-emerald-100",
        iconTextClass: "text-emerald-600",
        iconRingClass: "ring-emerald-200",
      },
      {
        k: "归因看板",
        v: "召回 → 触达 → 到店漏斗",
        icon: ShieldCheck,
        iconBgClass: "bg-gradient-to-br from-amber-50 to-amber-100",
        iconTextClass: "text-amber-700",
        iconRingClass: "ring-amber-200",
      },
    ],
    depth: "2 级列表",
    owner: "geo-growth-operator",
    scope: "门店 × 围栏 × 召回内容 × 本地生活矩阵",
  },
  "omni-channel": {
    key: "omni-channel",
    index: "Tab4",
    title: "全网获客驾驶舱",
    subtitle: "抖音/小红书/微信/视频号/百家号 矩阵一屏管理",
    kpiLabel: "本周全渠道曝光",
    kpiValue: "2.18M",
    kpiDelta: "+12.6% 环比",
    targetHref: "/all-network-growth",
    actionLabel: "进入全网矩阵运营工作台",
    pipelineTag: "P24 · Omni-Channel 5+ Platforms",
    heroBadge: "5+ 平台矩阵 · D137 锚定",
    icon: Network,
    iconBgClass: "bg-gradient-to-br from-sky-50 to-blue-100",
    iconTextClass: "text-sky-600",
    iconRingClass: "ring-sky-200",
    kpiBgTone: "bg-gradient-to-br from-sky-50 to-blue-100/60 ring-sky-200/80",
    kpiNumberClass: "text-sky-600",
    cards: [
      {
        k: "抖音矩阵",
        v: "品牌号 + 门店矩阵 100+",
        icon: Network,
        iconBgClass: "bg-gradient-to-br from-slate-50 to-slate-100",
        iconTextClass: "text-slate-700",
        iconRingClass: "ring-slate-200",
      },
      {
        k: "小红书+视频号",
        v: "图文 / 短平快 双轨内容",
        icon: Sparkles,
        iconBgClass: "bg-gradient-to-br from-rose-50 to-pink-100",
        iconTextClass: "text-rose-600",
        iconRingClass: "ring-rose-200",
      },
      {
        k: "私域承接",
        v: "企微 + 公众号双向承接",
        icon: Users,
        iconBgClass: "bg-gradient-to-br from-emerald-50 to-emerald-100",
        iconTextClass: "text-emerald-600",
        iconRingClass: "ring-emerald-200",
      },
    ],
    depth: "4 级资源树",
    owner: "omni-channel-operator",
    scope: "抖音 × 小红书 × 微信 × 视频号 × 百家号",
  },
  "ad-traffic": {
    key: "ad-traffic",
    index: "Tab5",
    title: "投流获客驾驶舱",
    subtitle: "R07 投流总监写权限已预埋 · 巨量/千川/腾讯台账接入待授权",
    kpiLabel: "已预埋权限格",
    kpiValue: "R07/81",
    kpiDelta: "连接器待接入",
    targetHref: "/paid-acquisition",
    actionLabel: "进入投流工作台（API 对接待专项启动）",
    pipelineTag: "P24 · Paid-Traffic Pre-wired",
    heroBadge: "R07 投流总监 · 权限预埋",
    icon: Rocket,
    iconBgClass: "bg-gradient-to-br from-rose-50 to-pink-100",
    iconTextClass: "text-rose-600",
    iconRingClass: "ring-rose-200",
    kpiBgTone: "bg-gradient-to-br from-rose-50 to-pink-100/60 ring-rose-200/80",
    kpiNumberClass: "text-rose-600",
    cards: [
      {
        k: "巨量引擎",
        v: "头条/抖音信息流台账",
        icon: Rocket,
        iconBgClass: "bg-gradient-to-br from-slate-50 to-slate-100",
        iconTextClass: "text-slate-700",
        iconRingClass: "ring-slate-200",
      },
      {
        k: "千川 + 腾讯",
        v: "直播带货 + 微信广告双卡",
        icon: Sparkles,
        iconBgClass: "bg-gradient-to-br from-violet-50 to-violet-100",
        iconTextClass: "text-violet-600",
        iconRingClass: "ring-violet-200",
      },
      {
        k: "ROI 看板",
        v: "计划 / 素材 / 创意 ROAS 归因",
        icon: ShieldCheck,
        iconBgClass: "bg-gradient-to-br from-amber-50 to-amber-100",
        iconTextClass: "text-amber-700",
        iconRingClass: "ring-amber-200",
      },
    ],
    depth: "台账 + API",
    owner: "paid-acquisition-director",
    scope: "巨量引擎 + 千川 + 腾讯广告 计划 / 账户 / 素材",
  },
  "daren-collab": {
    key: "daren-collab",
    index: "Tab6",
    title: "达人合作驾驶舱",
    subtitle: "R08 达人负责人写权限已预埋 · 星图/蝉妈妈/抖音商家后台待授权",
    kpiLabel: "达人库可邀约席位",
    kpiValue: "5,000",
    kpiDelta: "连接器待接入",
    targetHref: "/creator-cooperation",
    actionLabel: "进入达人合作工作台（API 对接待专项启动）",
    pipelineTag: "P24 · Daren-Collab Pre-wired",
    heroBadge: "R08 达人负责人 · 权限预埋",
    icon: Users,
    iconBgClass: "bg-gradient-to-br from-fuchsia-50 to-purple-100",
    iconTextClass: "text-fuchsia-600",
    iconRingClass: "ring-fuchsia-200",
    kpiBgTone: "bg-gradient-to-br from-fuchsia-50 to-purple-100/60 ring-fuchsia-200/80",
    kpiNumberClass: "text-fuchsia-600",
    cards: [
      {
        k: "星图邀约",
        v: "巨量星图一站式派发",
        icon: Users,
        iconBgClass: "bg-gradient-to-br from-slate-50 to-slate-100",
        iconTextClass: "text-slate-700",
        iconRingClass: "ring-slate-200",
      },
      {
        k: "蝉妈妈筛选",
        v: "达人库 5000+ 智能匹配",
        icon: Sparkles,
        iconBgClass: "bg-gradient-to-br from-emerald-50 to-emerald-100",
        iconTextClass: "text-emerald-600",
        iconRingClass: "ring-emerald-200",
      },
      {
        k: "分润台账",
        v: "CPS / 坑位 / 一口价 三结算",
        icon: ShieldCheck,
        iconBgClass: "bg-gradient-to-br from-amber-50 to-amber-100",
        iconTextClass: "text-amber-700",
        iconRingClass: "ring-amber-200",
      },
    ],
    depth: "台账 + API",
    owner: "daren-collab-manager",
    scope: "星图 × 蝉妈妈 × 抖音商家后台，达人库 5000+",
  },
};

export default function TabPageClient({
  tabKey,
  autoRedirectMs,
}: {
  tabKey: TabKey;
  autoRedirectMs?: number;
}) {
  const meta = TAB_META[tabKey];
  useEffect(() => {
    if (!autoRedirectMs || autoRedirectMs <= 0) return;
    const t = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.href = meta.targetHref;
      }
    }, autoRedirectMs);
    return () => clearTimeout(t);
  }, [autoRedirectMs, meta.targetHref]);

  const Icon = meta.icon;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> {meta.index} · {meta.title}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> {meta.heroBadge}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800 ring-1 ring-amber-200">
            {meta.pipelineTag}
          </span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${meta.iconBgClass} ${meta.iconTextClass} ${meta.iconRingClass}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                {meta.title}
              </h2>
            </div>
            <p className="text-sm leading-7 text-slate-600 md:text-base max-w-3xl">
              {meta.subtitle}
            </p>
          </div>
          <div
            className={`rounded-2xl p-4 ring-1 min-w-[260px] ${meta.kpiBgTone}`}
          >
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {meta.kpiLabel}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className={`text-3xl font-extrabold leading-tight ${meta.kpiNumberClass}`}>
                {meta.kpiValue}
              </div>
              <div className="text-xs text-emerald-600 font-medium">{meta.kpiDelta}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {meta.cards.map((c) => {
          const CardIcon = c.icon;
          return (
            <div
              key={c.k}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-300/70 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${c.iconBgClass} ${c.iconTextClass} ${c.iconRingClass}`}
                >
                  <CardIcon className="h-4.5 w-4.5" />
                </div>
                <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
                  {c.k}
                </span>
              </div>
              <div className="mt-4">
                <div className="text-[13px] leading-6 text-slate-600">{c.v}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/60 p-5 text-[12.5px] text-slate-500 ring-1 ring-slate-200/70">
        <div className="flex justify-between">
          <span>范围：</span>
          <span className="max-w-[60%] text-right text-slate-600 truncate">{meta.scope}</span>
        </div>
        <div className="flex justify-between">
          <span>深度：</span>
          <span className="font-medium text-slate-700">{meta.depth}</span>
        </div>
        <div className="flex justify-between">
          <span>责任人：</span>
          <span className="font-mono text-[11.5px] text-slate-600">{meta.owner}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200/70 bg-indigo-50/40 px-5 py-4">
        <div className="text-xs text-slate-600">
          {autoRedirectMs ? (
            <>
              将在{" "}
              <span className="font-semibold text-indigo-700">
                {autoRedirectMs / 1000}s
              </span>{" "}
              后自动跳转到真实工作台：
              <code className="ml-1 rounded bg-white px-1.5 py-0.5 font-mono text-[12px] text-indigo-700 ring-1 ring-indigo-100">
                {meta.targetHref}
              </code>
            </>
          ) : (
            <>
              点击下方按钮进入真实工作台（保持当前 6-Tab 顶栏）：
              <code className="ml-1 rounded bg-white px-1.5 py-0.5 font-mono text-[12px] text-indigo-700 ring-1 ring-indigo-100">
                {meta.targetHref}
              </code>
            </>
          )}
        </div>
        <Link
          href={meta.targetHref}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <ArrowRight className="h-4 w-4" />
          {meta.actionLabel}
        </Link>
      </div>
    </div>
  );
}
