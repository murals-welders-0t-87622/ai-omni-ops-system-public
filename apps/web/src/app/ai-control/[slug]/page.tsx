import { Metadata } from "next";
import AssetsArchiveWorkspace from "../AssetsArchiveWorkspace.client";
import PanelWorkspaceShell from "../PanelWorkspaceShell.client";
import TaskGovernanceWorkspace from "../TaskGovernanceWorkspace.client";
import { buildResourceTree } from "../resourceTree";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "AI 智控中心 · 板块",
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type TreeIconKey =
  | "users"
  | "wrench"
  | "puzzle"
  | "book-open"
  | "git-branch"
  | "image"
  | "palette"
  | "hard-drive"
  | "settings";

const PANEL_MAP: Record<string, {
  slug: string;
  title: string;
  subtitle: string;
  heroHint: string;
  enableTreeDepth4: boolean;
  scope: Parameters<typeof buildResourceTree>[0];
  treeIconKey: TreeIconKey;
}> = {
  experts: {
    slug: "experts",
    title: "① 专家团队管理",
    subtitle: "5 团 × 23 专家，分字段改 agents/*.md（同一物理文件零同步）",
    heroHint: "OQ3 默认新手只展开 团→专家 前 2 级；切专家模式后 4 级全开（含 Skill 映射/交接契约/异常处理）。md-writer 保存同一物理 agents/*.md，WorkBuddy 下次加载零同步。",
    enableTreeDepth4: true,
    scope: "experts",
    treeIconKey: "users",
  },
  skills: {
    slug: "skills",
    title: "② 技能与能力管理",
    subtitle: "38 Skill 契约（SKILL.md 3 契约：输入/输出/异常）",
    heroHint: "核心红线：MCP 211 签名必选参数不可改；新增字段只能 nullable。保存后：SKILL.md → md-writer-core.ts 原子写 → git commit 自动版本化 → 回读无损。",
    enableTreeDepth4: true,
    scope: "skills",
    treeIconKey: "wrench",
  },
  apis: {
    slug: "apis",
    title: "③ 接口与连接器配置",
    subtitle: ".codebuddy-plugin/plugin.json 211 条签名（MCP 连接器）",
    heroHint: "🔴 红线：必选参数名 + 必填性 = 只读灰显，禁止覆盖；新增字段默认 nullable 且写入时默认 null 填充以向后兼容。",
    enableTreeDepth4: false,
    scope: "apis",
    treeIconKey: "puzzle",
  },
  "prompt-library": {
    slug: "prompt-library",
    title: "④ 提示词参考库",
    subtitle: "120+ 模板 × 8 大类（选题/脚本/生图/爆款拆解/复盘…）",
    heroHint: "每一条 Prompt 都是独立 md 版本化；Diff 看改动、History 回滚；新手默认只显示前 2 级场景，完整 Prompt 需手动展开。",
    enableTreeDepth4: true,
    scope: "prompt-library",
    treeIconKey: "book-open",
  },
  "task-governance": {
    slug: "task-governance",
    title: "⑤ 任务版本治理",
    subtitle: "workflow-core TS 9 动作 · 双写对账（Python + TS）14 天 ≥99%",
    heroHint: "OQ6：TS 跑新实例时，同步写 Python SQLite + Prisma Postgres；每小时对账 status/revision/archive_status/route_id/content_family/parent_id 6 字段 = 一致率 ≥99%。",
    enableTreeDepth4: false,
    scope: "task-governance",
    treeIconKey: "git-branch",
  },
  assets: {
    slug: "assets",
    title: "⑥ 统一素材管理",
    subtitle: "公用中心 · 素材库（只读看板，写入走作品归档）",
    heroHint: "素材元数据 × 品牌 × 获客方式；新增素材必须走公用中心「作品归档 / 统一素材库」Tab，避免本面板出现未授权写入。",
    enableTreeDepth4: false,
    scope: "assets",
    treeIconKey: "image",
  },
  brand: {
    slug: "brand",
    title: "⑦ 品牌资产设置",
    subtitle: "Brand Ontology → 7 BusinessAsset × Tone/Voice/主色/Logo",
    heroHint: "新手模式只开基本信息；专家模式下显示 7 类资产完整 7×3 映射（Brand/Fact 7 子类/Task 5 子类）= toOntologyObject() 输入源。",
    enableTreeDepth4: false,
    scope: "brand",
    treeIconKey: "palette",
  },
  storage: {
    slug: "storage",
    title: "⑧ 存储与连接器",
    subtitle: "OSS / 本地卷 / Postgres 三类存储 · 配额 · 冷备 · 权限",
    heroHint: "存储健康监测：PG 连续 30min 备份失败 → 顶栏红灯；OSS 4xx/5xx > 阈值 → 自动路由本地兜底。",
    enableTreeDepth4: false,
    scope: "storage",
    treeIconKey: "hard-drive",
  },
  advanced: {
    slug: "advanced",
    title: "⑨ 高级设置 / 齿轮 Tab",
    subtitle: "OQ2 保留 SAAS 4 入口壳 + 模块注册 + Provider 治理（3 层）",
    heroHint: "齿轮兼容 Tab 三层：① 模块注册中心 14 技能/15 模块 ② Provider 治理(Key/旋转/路由) ③ SAAS 兼容 team/invite/billing/security。原 24 旧路由一律 301 不 404。",
    enableTreeDepth4: false,
    scope: "advanced",
    treeIconKey: "settings",
  },
};

export function generateStaticParams() {
  return Object.keys(PANEL_MAP).map((slug) => ({ slug }));
}

export default async function AiControlPanelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = PANEL_MAP[slug];
  if (!meta) notFound();
  // D153 永久锚定：slug === apis 特殊职责 = 真实 REST 双 Tab 页面（第三方+OpenClaw），
  // 不复用 PanelWorkspaceShell（md 编辑壳）。理论上 apis/page.tsx 静态路由优先级更高，
  // 这里保留永久 redirect 双保险，防止任何路由优先级混乱导致误套 A 层编辑壳。
  if (slug === "apis") {
    redirect("/ai-control/apis");
  }
  if (slug === "storage") {
    redirect("/ai-control/storage");
  }
  if (slug === "task-governance") {
    return <TaskGovernanceWorkspace />;
  }
  if (slug === "assets") {
    return <AssetsArchiveWorkspace />;
  }
  const treeRoots = buildResourceTree(meta.scope);
  return (
    <PanelWorkspaceShell
      panel={{
        slug: meta.slug,
        title: meta.title,
        subtitle: meta.subtitle,
        heroHint: meta.heroHint,
        enableTreeDepth4: meta.enableTreeDepth4,
        treeIconKey: meta.treeIconKey,
        treeRoots,
      }}
    />
  );
}
