import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Wrench,
  Puzzle,
  BookOpen,
  GitBranch,
  Image as ImageIcon,
  Palette,
  HardDrive,
  Settings,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AI 智控中心 · 9 大板块首页",
  description: "AI 智控中心以 Ontology 编排中心为业务大脑，统一导航专家团、Skill、接口、任务证据和素材等中台能力。",
};

export const dynamic = "force-dynamic";
export default function AiControlHomePage() {
  return <AiControlHomePageLegacy />;
}

type PanelDef = {
  id: string;
  slug: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge: string;
  tagline: string;
  scope: string;
  depth: "4 级资源树" | "2 级列表" | "表单 + Tab" | "只读看板";
  owner: string;
  status: "stable" | "beta" | "wip";
  defaultOpenHint?: string;
  iconBgClass: string;
  iconTextClass: string;
  iconRingClass: string;
  kpiNumber: string;
  kpiLabel: string;
};

const PANELS: PanelDef[] = [
  {
    id: "panel1-expert-team",
    slug: "experts",
    icon: Users,
    title: "① 专家团队管理",
    badge: "5 团 · 23 专家",
    tagline: "分字段改 agents/*.md + 团队职责看板",
    scope: "5 专家团 (创作/增长/视频/治理/中台) × 层级",
    depth: "4 级资源树",
    owner: "content-huoke-team-lead",
    status: "stable",
    defaultOpenHint: "新手默认仅展开「团 → 专家姓名 → 角色说明」3 级；深层 SKILL 映射需切专家模式",
    iconBgClass: "bg-gradient-to-br from-blue-50 to-blue-100",
    iconTextClass: "text-blue-600",
    iconRingClass: "ring-blue-200",
    kpiNumber: "142",
    kpiLabel: "专家总登记",
  },
  {
    id: "panel2-skills",
    slug: "skills",
    icon: Wrench,
    title: "② 技能与能力管理",
    badge: "38 Skill 契约",
    tagline: "SKILL.md 分字段编辑 + 输入/输出/异常 3 契约",
    scope: "skills/*/SKILL.md + references/contract/*.md",
    depth: "4 级资源树",
    owner: "workflow-ops-governor",
    status: "stable",
    defaultOpenHint: "新手默认仅展开「Skill 分类 → Skill 名 → 一句话用途」3 级；Prompt/参数折叠",
    iconBgClass: "bg-gradient-to-br from-emerald-50 to-emerald-100",
    iconTextClass: "text-emerald-600",
    iconRingClass: "ring-emerald-200",
    kpiNumber: "12",
    kpiLabel: "本月运行中",
  },
  {
    id: "panel3-apis",
    slug: "apis",
    icon: Puzzle,
    title: "③ 接口与连接器配置",
    badge: "219 MCP 工具",
    tagline: "MCP .codebuddy-plugin/plugin.json 分字段表单（只能加可选字段）",
    scope: ".codebuddy-plugin/plugin.json + references/providers/*.md",
    depth: "2 级列表",
    owner: "platform-integration-admin",
    status: "stable",
    defaultOpenHint: "红线：必选参数名/类型 100% 保留；新增字段一律 nullable + 默认 null",
    iconBgClass: "bg-gradient-to-br from-cyan-50 to-cyan-100",
    iconTextClass: "text-cyan-600",
    iconRingClass: "ring-cyan-200",
    kpiNumber: "3",
    kpiLabel: "待重试",
  },
  {
    id: "panel4-prompts",
    slug: "prompt-library",
    icon: BookOpen,
    title: "④ 提示词参考库",
    badge: "120+ 参考模板",
    tagline: "references/prompts/*.md 版本化 + Diff/回滚",
    scope: "选题/脚本/生图/爆款拆解/复盘 8 大类",
    depth: "4 级资源树",
    owner: "ai-ops-architect",
    status: "beta",
    defaultOpenHint: "新手默认仅「库名 → 模板名 → 适用场景」3 级可见，完整 Prompt 折叠需手动展开",
    iconBgClass: "bg-gradient-to-br from-violet-50 to-violet-100",
    iconTextClass: "text-violet-600",
    iconRingClass: "ring-violet-200",
    kpiNumber: "127",
    kpiLabel: "已关闭",
  },
  {
    id: "panel5-task-governance",
    slug: "task-governance",
    icon: GitBranch,
    title: "⑤ 任务版本治理",
    badge: "workflow-core 真账本",
    tagline: "任务 / 阶段 / 产物 / 版本 / 执行事件 / Outbox 证据",
    scope: "wf_* 表 + ontology_outboxes",
    depth: "只读看板",
    owner: "workflow-ops-governor",
    status: "wip",
    defaultOpenHint: "S2-02：读取真实任务账本；非空详情必须来自 workflow handler 或真实业务执行，不补造历史。",
    iconBgClass: "bg-gradient-to-br from-orange-50 to-orange-100",
    iconTextClass: "text-orange-600",
    iconRingClass: "ring-orange-200",
    kpiNumber: "8",
    kpiLabel: "治理对象",
  },
  {
    id: "panel6-assets",
    slug: "assets",
    icon: ImageIcon,
    title: "⑥ 统一素材管理",
    badge: "公用中心 · 素材库",
    tagline: "素材分类/标签/版本/使用记录 (只读，写入走公用中心作品归档)",
    scope: "素材库元数据 × 品牌 × 获客方式",
    depth: "只读看板",
    owner: "brand-assets-keeper",
    status: "beta",
    iconBgClass: "bg-gradient-to-br from-fuchsia-50 to-fuchsia-100",
    iconTextClass: "text-fuchsia-600",
    iconRingClass: "ring-fuchsia-200",
    kpiNumber: "2047",
    kpiLabel: "素材总数",
  },
  {
    id: "panel7-brand",
    slug: "brand",
    icon: Palette,
    title: "⑦ 品牌资产设置",
    badge: "Brand Ontology 映射",
    tagline: "品牌档案 7 类 BusinessAsset + Tone/Voice + Logo 主色",
    scope: "Brand Ontology toOntologyObject()",
    depth: "表单 + Tab",
    owner: "brand-assets-keeper",
    status: "stable",
    defaultOpenHint: "新手默认只开基本信息；7 类资产切换专家模式可见",
    iconBgClass: "bg-gradient-to-br from-teal-50 to-teal-100",
    iconTextClass: "text-teal-600",
    iconRingClass: "ring-teal-200",
    kpiNumber: "7",
    kpiLabel: "资产类别",
  },
  {
    id: "panel8-storage",
    slug: "storage",
    icon: HardDrive,
    title: "⑧ 存储与连接器",
    badge: "OSS / 本地 / DB",
    tagline: "存储配额/路由/权限/冷备周期 + 健康监测",
    scope: "OSS 绑定 × 本地卷目录 × 备份计划",
    depth: "表单 + Tab",
    owner: "platform-integration-admin",
    status: "beta",
    iconBgClass: "bg-gradient-to-br from-amber-50 to-amber-100",
    iconTextClass: "text-amber-700",
    iconRingClass: "ring-amber-200",
    kpiNumber: "27%",
    kpiLabel: "磁盘已用",
  },
  {
    id: "panel9-ontology",
    slug: "ontology",
    icon: Settings,
    title: "⑨ Ontology 编排中心",
    badge: "业务大脑 · 流程导航",
    tagline: "专家团/专家/Skill × 五元素 × 中台功能的可执行流程地图",
    scope: "业务流程节点、上下游连线、确认闸、证据规则",
    depth: "表单 + Tab",
    owner: "workflow-ops-governor",
    status: "wip",
    defaultOpenHint: "S3-02B：先做静态原型；只展示编排地图，不复制专家、Skill、接口、素材或任务详情。",
    iconBgClass: "bg-gradient-to-br from-slate-50 to-slate-100",
    iconTextClass: "text-slate-600",
    iconRingClass: "ring-slate-200",
    kpiNumber: "5",
    kpiLabel: "五元素",
  },
];

const PANEL_BUSINESS_LINK: Record<string, { slug: string; label: string }> = {
  experts:         { slug: "brand-control", label: "品牌总控业务 · 专家档案" },
  skills:          { slug: "content-customer", label: "内容获客业务 · Skill执行" },
  apis:            { slug: "ad-traffic", label: "投流获客业务 · 接口生效" },
  "prompt-library":{ slug: "geo-customer", label: "GEO获客业务 · 关键词/SEO提示词" },
  "task-governance":{slug: "brand-control", label: "品牌总控业务 · 任务里程碑" },
  assets:          { slug: "omni-channel", label: "全网获客业务 · 素材分发" },
  brand:           { slug: "brand-control", label: "品牌总控业务 · 品牌资产" },
  storage:         { slug: "brand-control", label: "品牌总控业务 · 存储配额" },
  ontology:        { slug: "brand-control", label: "品牌总控业务 · 流程编排" },
};

const STATUS_STYLE: Record<PanelDef["status"], string> = {
  stable: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  beta: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20",
  wip: "bg-slate-100 text-slate-700 ring-1 ring-slate-500/20",
};

const STATUS_TEXT: Record<PanelDef["status"], string> = {
  stable: "已稳定",
  beta: "测试中",
  wip: "建设中",
};

function AiControlHomePageLegacy() {
  return (
    <main className="min-h-screen bg-[radial-gradient(1400px_600px_at_0%_-10%,#eef2ff_0%,#fafafa_60%,#ffffff_100%)] px-6 py-10">
      <div className="mx-auto max-w-[1400px] space-y-10">
        {/* HERO */}
        <section className="flex flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white/70 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> AI 智控中心 v2 · Ontology 驱动的 9 大板块
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> 权威源 = A/.../references/expert-source (md + Git) · 零副本同步
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800 ring-1 ring-amber-200">
              OQ3 默认新手：80% 字段已折叠，切专家模式展开
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              AI 智控中心 · 所见即所得
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              Ontology 编排中心作为业务大脑，负责把专家团/专家/Skill 的业务流程映射到中台功能、数据、接口、确认闸和证据写回。
              其他板块继续维护真实对象，编排中心只维护流程导航和可执行规则。
            </p>
          </div>
        </section>

        {/* 9 GRID */}
        <section>
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-xl font-semibold text-slate-900">9 大板块总览</h2>
            <p className="text-xs text-slate-500">
              点卡片跳 /app/ai-control/{'{slug}'} · 板块 id 与 spec.md §9 一一对应
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PANELS.map((p) => {
              const Icon = p.icon;
              const biz = PANEL_BUSINESS_LINK[p.slug];
              return (
                <div
                  key={p.id}
                  className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300/80 hover:shadow-lg focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500/40"
                >
                  <Link
                    href={`/ai-control/${p.slug}`}
                    className="flex flex-1 flex-col focus:outline-none"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${p.iconBgClass} ${p.iconTextClass} ${p.iconRingClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[p.status]}`}>
                        {STATUS_TEXT[p.status]}
                      </span>
                    </div>
                    <div className="mt-5 space-y-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-700">
                          {p.title}
                        </h3>
                        <span className="whitespace-nowrap rounded-md bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-600">{p.tagline}</p>
                    </div>
                    <div className="mt-5 space-y-2 border-t border-dashed border-slate-200 pt-4 text-[12.5px] text-slate-500">
                      <div className="flex justify-between">
                        <span>范围：</span>
                        <span className="max-w-[60%] truncate text-right text-slate-600">{p.scope}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>深度：</span>
                        <span className="font-medium text-slate-700">{p.depth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>责任人：</span>
                        <span className="font-mono text-[11.5px] text-slate-600">{p.owner}</span>
                      </div>
                      {p.defaultOpenHint ? (
                        <p className="rounded-lg bg-amber-50/70 p-2 text-[12px] leading-5 text-amber-800 ring-1 ring-amber-100">
                          💡 {p.defaultOpenHint}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-end justify-between gap-2 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/60 p-3 ring-1 ring-slate-200/80">
                        <div>
                          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{p.kpiLabel}</div>
                          <div className={`mt-0.5 text-2xl font-extrabold leading-tight ${p.iconTextClass}`}>{p.kpiNumber}</div>
                        </div>
                        <div className={`h-9 w-9 rounded-lg ring-1 flex items-center justify-center ${p.iconBgClass} ${p.iconRingClass} ${p.iconTextClass} opacity-80`}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-end gap-1 text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                      进入配置 <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                  {biz ? (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-white p-2.5 ring-1 ring-indigo-50/50">
                      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[11.5px] leading-5 text-indigo-900/80">
                        <span className="inline-flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                          <ArrowRight className="h-3 w-3" /> A层业务
                        </span>
                        <span className="truncate">{biz.label}</span>
                      </span>
                      <Link
                        href={`/tabs/${biz.slug}`}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11.5px] font-semibold text-white shadow-sm ring-1 ring-indigo-500/30 hover:bg-indigo-700"
                      >
                        进入业务 <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM RULES */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-900">红线 1 · md-writer 写入前必检</p>
            <p className="mt-2">
              保存前执行 <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px]">config-center-git status</code>
              ，工作区非 clean → 前端弹「有未保存变更请先 Diff/回滚/手动提交」禁止原子写。
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-900">红线 2 · MCP 211 签名只读保护</p>
            <p className="mt-2">
              必选参数名 + 必填性 = 不可编辑状态；新增字段默认 nullable + 说明行显示「仅可选加，不影响旧调用」。
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-900">红线 3 · 旧入口 24 条 301</p>
            <p className="mt-2">
              /ai-control-center /personal/** /settings/* 走 <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px]">middleware.ts</code>
              ，绝不 404；齿轮 Tab 保留 SAAS 4 入口壳。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
