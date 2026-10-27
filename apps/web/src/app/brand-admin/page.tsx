import Link from "next/link";
import { ArrowRight, Image as ImageIcon, Palette, Puzzle, Sparkles } from "lucide-react";
const panels = [
  {href:"/brand-admin/apis",title:"接口与连接器配置",description:"配置第三方平台 API Key，生成并复制 WorkBuddy / OpenClaw 安装配置。",hint:"第三方接口配置 · OpenClaw 安装",icon:Puzzle,color:"bg-cyan-50 text-cyan-600"},
  {href:"/brand-admin/assets",title:"统一素材管理",description:"分类、搜索和调用本品牌的素材、作品与任务产物。",hint:"搜索素材 · 预览文件 · 归档登记",icon:ImageIcon,color:"bg-fuchsia-50 text-fuchsia-600"},
  {href:"/brand-admin/brand",title:"品牌资产设置",description:"维护本品牌的名称、行业及企业介绍。",hint:"品牌资料 · 企业信息",icon:Palette,color:"bg-teal-50 text-teal-600"},
];
export default function BrandControlHomePage() {
 return <main className="space-y-8"><section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8"><span className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"><Sparkles className="h-3.5 w-3.5"/>AI 智控中心</span><h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">AI 智控中心 · 配置工作台</h2><p className="mt-3 text-sm text-slate-500">选择板块，管理当前品牌的 AI 连接、接口和素材。</p></section>
 <section aria-label="智控板块总览"><h3 className="mb-5 text-xl font-semibold">板块总览</h3><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{panels.map(p=>{const Icon=p.icon;return <Link key={p.href} href={p.href} className="group flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-lg"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${p.color}`}><Icon className="h-5 w-5"/></span><h4 className="mt-5 text-base font-semibold group-hover:text-indigo-700">{p.title}</h4><p className="mt-3 flex-1 text-sm leading-6 text-slate-500">{p.description}</p><p className="mt-5 border-t border-dashed pt-4 text-xs text-slate-500">{p.hint}</p><span className="mt-5 flex items-center justify-end gap-1 text-sm font-medium text-indigo-600">进入配置<ArrowRight className="h-4 w-4"/></span></Link>})}</div></section></main>;
}
