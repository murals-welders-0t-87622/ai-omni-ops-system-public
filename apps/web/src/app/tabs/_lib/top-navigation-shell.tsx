"use client";
import { controlWorkspaceDestination } from "../../../services/workspace-access";

import { getStoredAuthSession } from "../../../services/auth-session";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Settings,
  UserCircle2,
  ArrowRight,
  type LucideIcon,
  Building2,
  Sparkles,
  MapPin,
  Network,
  Rocket,
  Users,
  TrendingUp,
  ShoppingBag,
  HeartHandshake,
} from "lucide-react";
import type { ReactNode } from "react";

const topTabs: {
  key: string;
  href: string;
  short: string;
  label: string;
  icon: LucideIcon;
  activeTone: string;
  activeBg: string;
  badgeClass: string;
}[] = [
  {
    key: "brand-control",
    href: "/tabs/brand-control",
    short: "全局概览",
    label: "全局概览",
    icon: Building2,
    activeTone: "text-indigo-700",
    activeBg: "bg-indigo-50 border-indigo-200/70",
    badgeClass: "bg-indigo-600 text-white",
  },
  {
    key: "brand-growth",
    href: "/tabs/brand-growth",
    short: "品牌增长",
    label: "品牌增长",
    icon: TrendingUp,
    activeTone: "text-amber-700",
    activeBg: "bg-amber-50 border-amber-200/70",
    badgeClass: "bg-amber-500 text-white",
  },
  {
    key: "content-customer",
    href: "/tabs/content-customer",
    short: "内容获客",
    label: "内容获客",
    icon: Sparkles,
    activeTone: "text-orange-700",
    activeBg: "bg-orange-50 border-orange-200/70",
    badgeClass: "bg-orange-500 text-white",
  },
  {
    key: "geo-customer",
    href: "/tabs/geo-customer",
    short: "GEO 获客",
    label: "GEO 获客",
    icon: MapPin,
    activeTone: "text-emerald-700",
    activeBg: "bg-emerald-50 border-emerald-200/70",
    badgeClass: "bg-emerald-500 text-white",
  },
  {
    key: "omni-channel",
    href: "/tabs/omni-channel",
    short: "全网获客",
    label: "全网获客",
    icon: Network,
    activeTone: "text-sky-700",
    activeBg: "bg-sky-50 border-sky-200/70",
    badgeClass: "bg-sky-500 text-white",
  },
  {
    key: "ad-traffic",
    href: "/tabs/ad-traffic",
    short: "投流获客",
    label: "投流获客",
    icon: Rocket,
    activeTone: "text-rose-700",
    activeBg: "bg-rose-50 border-rose-200/70",
    badgeClass: "bg-rose-500 text-white",
  },
  {
    key: "daren-collab",
    href: "/tabs/daren-collab",
    short: "达人合作",
    label: "达人合作",
    icon: Users,
    activeTone: "text-fuchsia-700",
    activeBg: "bg-fuchsia-50 border-fuchsia-200/70",
    badgeClass: "bg-fuchsia-600 text-white",
  },
];

export default function TopNavigationShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const controlDestination = controlWorkspaceDestination(getStoredAuthSession());
  const acquisitionTabs = topTabs.slice(2);
  const primaryTabs = [
    ...topTabs.slice(0, 2),
    { ...topTabs[2], key: "acquisition", label: "公域获客", href: "/tabs/content-customer", icon: Network },
    { ...topTabs[6], key: "private-repurchase", label: "私域复购", href: "/tabs/private-repurchase", icon: HeartHandshake },
    { ...topTabs[0], key: "ecommerce", label: "电商板块", href: "/tabs/ecommerce/detail", icon: ShoppingBag },
  ];
  const group = acquisitionTabs.some(t => pathname === t.href || pathname.startsWith(t.href + "/")) ? "acquisition" : pathname.startsWith("/tabs/ecommerce") ? "ecommerce" : pathname.startsWith("/tabs/private-repurchase") ? "private-repurchase" : pathname.startsWith("/tabs/brand-growth") ? "brand-growth" : "brand-control";
  const secondaryTabs = group === "acquisition" ? acquisitionTabs : group === "ecommerce" ? [
    { key: "detail", label: "详情页", href: "/tabs/ecommerce/detail" },
    { key: "operations", label: "淘宝/天猫运营", href: "/tabs/ecommerce/operations" },

  ] : group === "private-repurchase" ? [{ key:"ai-sales",label:"AI销售",href:"/tabs/private-repurchase/ai-sales" },{ key:"operations",label:"私域运营",href:"/tabs/private-repurchase/operations" }] : [];
  const isBrand = pathname.startsWith("/tabs/brand-control") || pathname.startsWith("/tabs/brand-growth") || pathname === "/tabs/" || pathname === "/tabs";
  const navigateTo = (href: string) => {
    window.location.assign(href);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1400px_600px_at_0%_-10%,#eef2ff_0%,#fafafa_60%,#ffffff_100%)]">
      {/* Top app shell bar (matches user screenshot 3rd image header) */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          {/* Left brand + status chip */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/20">
              <span className="text-[15px] font-extrabold tracking-tight">AI</span>
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold text-slate-900">AI 全域运营中台</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 ring-1 ring-indigo-100">
                  AI 管控中心
                </span>
                <span className="text-slate-400">（原名 OpenClaw 安装版）</span>
              </div>
            </div>
          </div>

          {/* Center global search */}
          <div className="ml-4 hidden min-w-0 flex-1 md:block">
            <div className="relative mx-auto max-w-[680px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                readOnly
                placeholder="全局搜索：找选题 / 作品 / 专家 / 素材 / 策略优化记录 …"
                className="h-10 w-full rounded-full border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-[13px] text-slate-700 outline-none ring-1 ring-transparent placeholder:text-slate-400 focus:border-indigo-200 focus:bg-white focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Right actions + enter AI 智控系统 */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              aria-label="通知"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
            >
              <Bell className="h-4 w-4" />
            </button>
            {controlDestination && <button
              type="button"
              onClick={() => navigateTo(controlDestination!)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-[12.5px] font-semibold text-white shadow-sm hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <Settings className="h-4 w-4" />
              进入智控系统
              <ArrowRight className="h-3.5 w-3.5 opacity-80" />
            </button>}
            <button
              type="button"
              aria-label="公用中心"
              className="hidden h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 hover:border-indigo-200 hover:text-indigo-600 md:inline-flex"
            >
              <Settings className="h-4 w-4" />
              公用中心
            </button>
            <a href="/account" aria-label="账号与品牌资料" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 ring-1 ring-slate-200">
              <UserCircle2 className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Sub nav: 6 tabs (matches screenshot's 6-pill nav) */}
        <nav aria-label="一级菜单" className="border-t border-slate-100/80 bg-white/50">
          <div className="mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto px-4 py-2 lg:px-6">
            {primaryTabs.map((t) => {
              const Icon = t.icon;
              const active = group === t.key;
              return (
                <a
                  key={t.key}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition " +
                    (active
                      ? `border-transparent ${t.activeBg} ${t.activeTone} shadow-sm`
                      : "border-slate-200 bg-white/60 text-slate-600 hover:border-indigo-200 hover:text-indigo-700")
                  }
                >
                  <span className={"inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold " + (active ? t.badgeClass : "bg-slate-100 text-slate-500")}>
                    <Icon className="h-3 w-3" />
                  </span>
                  {t.label}
                  {t.key === "content-customer" ? (
                    <span className="ml-0.5 rounded-full bg-sky-50 px-1.5 py-0 text-[9.5px] text-sky-600 ring-1 ring-sky-100">3平台</span>
                  ) : null}
                </a>
              );
            })}
          </div>
        </nav>
        {secondaryTabs.length > 0 && <nav aria-label="二级菜单" className="border-t border-slate-100 bg-white/70"><div className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-4 py-2 lg:px-6">{secondaryTabs.map(t => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return <a key={t.key} href={t.href} aria-current={active ? "page" : undefined} className={"shrink-0 rounded-lg px-4 py-2 text-xs font-medium transition " + (active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50")}>{t.label.replace("GEO 获客", "GEO获客")}</a>;
        })}</div></nav>}
      </header>

      {/* Page content */}
      <main className={`tabs-page-shell mx-auto max-w-[1440px] px-4 py-6 lg:px-8 ${isBrand ? "" : ""}`}>{children}</main>
    </div>
  );
}
