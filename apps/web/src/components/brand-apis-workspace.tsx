"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Puzzle } from "lucide-react";
import BrandModelsWorkspace from "./brand-models-workspace";
import BrandConnectionsWorkspace from "./brand-connections-workspace";
export default function BrandApisWorkspace() {
  const value = useSearchParams().get("tab");
  const tab = value === "openclaw" ? value : "third-party";
  const tabs = [{id:"third-party",name:"第三方接口配置"},{id:"openclaw",name:"OpenClaw 安装"}];
  return <section className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-cyan-50 p-3 text-cyan-600"><Puzzle className="h-6 w-6"/></span><div><h2 className="text-xl font-semibold">接口与连接器配置</h2><p className="mt-1 text-sm text-slate-500">配置第三方平台，安装本品牌的 WorkBuddy / OpenClaw 连接。</p></div></div></div>
    <nav aria-label="接口配置分类" className="flex flex-wrap gap-2 rounded-xl border bg-white p-2">{tabs.map(t=><Link key={t.id} aria-current={tab===t.id?"page":undefined} href={`/brand-admin/apis?tab=${t.id}`} className={`rounded-lg px-5 py-3 text-sm font-medium ${tab===t.id?"bg-indigo-600 text-white":"text-slate-600 hover:bg-slate-50"}`}>{t.name}</Link>)}</nav>
    {tab==="openclaw"?<BrandConnectionsWorkspace/>:<BrandModelsWorkspace/>}
  </section>;
}
