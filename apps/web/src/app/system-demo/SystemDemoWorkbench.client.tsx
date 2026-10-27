"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookMarked,
  Bot,
  Boxes,
  Building2,
  Database,
  FileCode2,
  FileStack,
  LayoutDashboard,
  Library,
  MapPin,
  Network,
  Rocket,
  Settings2,
  Sparkles,
  Users,
  Wand2,
  Workflow,
  type LucideIcon,
} from "lucide-react";

type DemoStatus = "可直接开发" | "演示原型" | "需接真源";

type StageDef = {
  key: string;
  title: string;
  summary: string;
  widgets: string[];
  objects: string[];
  actions: string[];
  status: DemoStatus;
};

type UtilityCard = {
  key: string;
  title: string;
  summary: string;
  route: string;
  widgets: string[];
  status: DemoStatus;
};

type ControlModule = {
  key: string;
  title: string;
  summary: string;
  truthSource: string;
  route: string;
  status: DemoStatus;
};

type EntryDef = {
  key: string;
  title: string;
  short: string;
  icon: LucideIcon;
  accent: string;
  surface: "front" | "utility";
  summary: string;
  owner: string;
  outputs: string[];
  route: string;
  stages?: StageDef[];
  utilityCards?: UtilityCard[];
};

const FRONT_STAGE_TITLES = [
  { key: "assets", title: "阶段1 资产库" },
  { key: "insight", title: "阶段2 洞察采集" },
  { key: "strategy", title: "阶段3 策略计划" },
  { key: "execute", title: "阶段4 执行发布" },
  { key: "review", title: "阶段5 复盘优化" },
] as const;

const FRONT_ENTRIES: EntryDef[] = [
  {
    key: "brand-control",
    title: "品牌总控",
    short: "总控",
    icon: LayoutDashboard,
    accent: "from-indigo-500 via-blue-500 to-cyan-500",
    surface: "front",
    summary: "品牌负责人首页，汇总 5 条业务线的进度、KPI、资产和治理提醒。",
    owner: "运营负责人 / 品牌负责人",
    outputs: ["全局 KPI 看板", "今日待办队列", "跨业务线风险提示"],
    route: "/tabs/brand-control",
    stages: [
      {
        key: "assets",
        title: "阶段1 资产库",
        summary: "统一查看品牌档案、产品资料、IP 资产、竞品和平台账号。",
        widgets: ["品牌档案总卡", "7 类业务资产矩阵", "跨平台账号状态"],
        objects: ["Brand", "BusinessAsset", "PlatformAccount"],
        actions: ["查看品牌真源", "补全资料缺口", "切换品牌上下文"],
        status: "可直接开发",
      },
      {
        key: "insight",
        title: "阶段2 洞察采集",
        summary: "跨获客方式汇总最近采集、爆款拆解和线索沉淀情况。",
        widgets: ["采集完成度热力图", "爆款拆解入口", "线索来源分布"],
        objects: ["InsightTask", "BusinessAsset", "LeadSnapshot"],
        actions: ["查看采集状态", "进入内容采集", "触发异常补采"],
        status: "演示原型",
      },
      {
        key: "strategy",
        title: "阶段3 策略计划",
        summary: "统一查看品牌增长报告、营销策划方案、营销日历和每日计划。",
        widgets: ["策略文件列表", "营销日历周视图", "每日计划时间轴"],
        objects: ["GrowthReport", "MarketingPlan", "DailyPlan"],
        actions: ["查看最新策略", "下发每日计划", "进入平台策略页"],
        status: "可直接开发",
      },
      {
        key: "execute",
        title: "阶段4 执行发布",
        summary: "按平台和任务批次汇总当前创作、发布、投流与达人执行进度。",
        widgets: ["执行进度矩阵", "作品与素材分布", "发布状态卡片"],
        objects: ["Work", "Media", "PublishingTask"],
        actions: ["跳到具体工作台", "查看阻塞项", "追踪发布回传"],
        status: "演示原型",
      },
      {
        key: "review",
        title: "阶段5 复盘优化",
        summary: "收口全部复盘、策略优化记录和治理提醒，给下一轮业务续接。",
        widgets: ["复盘摘要卡", "优化记录列表", "治理风险分层"],
        objects: ["ReviewReport", "StrategyOptimization", "WorkflowTask"],
        actions: ["查看最新优化", "进入治理中心", "确认下一轮重点"],
        status: "可直接开发",
      },
    ],
  },
  {
    key: "content",
    title: "内容获客",
    short: "内容",
    icon: Sparkles,
    accent: "from-amber-500 via-orange-500 to-rose-500",
    surface: "front",
    summary: "抖音/视频号、小红书、公众号三平台共用一套 5 阶段流程，但各自有独立执行面板。",
    owner: "内容获客专家团",
    outputs: ["营销策划方案", "营销日历与每日计划", "脚本/素材/视频/发布回传"],
    route: "/tabs/content-customer",
    stages: [
      {
        key: "assets",
        title: "阶段1 资产库",
        summary: "聚合品牌资料、平台账号、历史选题库和可复用素材。",
        widgets: ["品牌资料卡", "平台账号看板", "素材复用排行"],
        objects: ["Brand", "BusinessAsset", "Media"],
        actions: ["查看资产", "筛选平台", "进入选题库"],
        status: "可直接开发",
      },
      {
        key: "insight",
        title: "阶段2 洞察采集",
        summary: "三平台采集、评论洞察和爆款拆解中心在同一层展示。",
        widgets: ["平台采集任务表", "爆款拆解中心", "评论关键词趋势"],
        objects: ["CollectionTask", "ViralDecodeResult", "TopicCandidate"],
        actions: ["触发采集", "查看爆款拆解", "写入候选选题"],
        status: "演示原型",
      },
      {
        key: "strategy",
        title: "阶段3 策略计划",
        summary: "按平台拆出营销策划方案、营销日历、每日计划和选题库四类面板。",
        widgets: ["平台切换条", "方案/日历/计划/选题四分栏", "本周策略摘要"],
        objects: ["MarketingPlan", "CalendarItem", "DailyPlan"],
        actions: ["生成计划", "查看日历", "进入创作执行"],
        status: "可直接开发",
      },
      {
        key: "execute",
        title: "阶段4 执行发布",
        summary: "创作面板固定 7 个子标签：策略衔接、创作素材、脚本、图片、数字人/RunningHub、作品列表、发布历史。",
        widgets: ["7 子标签工作区", "素材侧栏", "发布动作抽屉"],
        objects: ["CreativeMaterial", "ScriptDraft", "VideoWork"],
        actions: ["写脚本", "生成素材", "提交发布"],
        status: "可直接开发",
      },
      {
        key: "review",
        title: "阶段5 复盘优化",
        summary: "平台复盘、统一策略优化记录和内容数据回流沉淀在一个阶段页。",
        widgets: ["平台复盘卡", "策略优化列表", "高表现作品复用榜"],
        objects: ["ReviewReport", "StrategyOptimization", "PerformanceMetric"],
        actions: ["查看复盘", "写入优化记录", "回流下一周期"],
        status: "演示原型",
      },
    ],
  },
  {
    key: "geo",
    title: "GEO 获客",
    short: "GEO",
    icon: MapPin,
    accent: "from-emerald-500 via-teal-500 to-cyan-500",
    surface: "front",
    summary: "围绕网站、同城、第三方媒体和知识库建设，统一承接 GEO 方案与内容执行。",
    owner: "GEO 获客工作台",
    outputs: ["GEO 优化方案", "关键词词库", "网站/媒体内容计划"],
    route: "/tabs/geo-customer",
    stages: [
      {
        key: "assets",
        title: "阶段1 资产库",
        summary: "查看品牌站点信息、历史词库和知识库基础资料。",
        widgets: ["官网资料卡", "词库摘要", "知识库就绪度"],
        objects: ["BrandSite", "KeywordLibrary", "KnowledgeBase"],
        actions: ["查看站点", "管理词库", "补充资料"],
        status: "可直接开发",
      },
      {
        key: "insight",
        title: "阶段2 洞察采集",
        summary: "网站诊断、关键词挖掘和本地搜索洞察并列呈现。",
        widgets: ["网站诊断列表", "关键词发现", "同城机会点"],
        objects: ["SiteDiagnosis", "KeywordFinding", "GeoSignal"],
        actions: ["执行诊断", "查看机会词", "下发到策略"],
        status: "演示原型",
      },
      {
        key: "strategy",
        title: "阶段3 策略计划",
        summary: "沉淀 GEO 优化方案、营销日历和内容执行优先级。",
        widgets: ["GEO 方案卡", "周计划日历", "站点内容优先级"],
        objects: ["GeoPlan", "CalendarItem", "ContentPriority"],
        actions: ["生成优化方案", "下发日历", "拆到执行"],
        status: "可直接开发",
      },
      {
        key: "execute",
        title: "阶段4 执行发布",
        summary: "网站内容、自媒体内容、第三方媒体内容三线并行。",
        widgets: ["内容执行泳道", "发布任务列表", "素材引用面板"],
        objects: ["GeoContentTask", "Media", "PublishingTask"],
        actions: ["编辑内容", "提交发布", "查看素材来源"],
        status: "演示原型",
      },
      {
        key: "review",
        title: "阶段5 复盘优化",
        summary: "排名变化、搜索可见度和策略优化记录统一收口。",
        widgets: ["排名趋势图", "可见度诊断", "优化记录"],
        objects: ["VisibilityMetric", "ReviewReport", "StrategyOptimization"],
        actions: ["看排名", "写优化结论", "回流下一轮"],
        status: "演示原型",
      },
    ],
  },
  {
    key: "omni",
    title: "全网获客",
    short: "全网",
    icon: Network,
    accent: "from-sky-500 via-blue-500 to-indigo-500",
    surface: "front",
    summary: "评论获客、平台获客、竞品截流、本地商家和 B 端线索统一进入同一线索工厂。",
    owner: "全网获客专家团",
    outputs: ["去重线索池", "线索质量评分", "渠道复盘建议"],
    route: "/tabs/omni-channel",
    stages: [
      {
        key: "assets",
        title: "阶段1 资产库",
        summary: "查看品牌客群画像、行业词库和线索规则。",
        widgets: ["客群画像卡", "行业词库", "线索规则面板"],
        objects: ["AudienceProfile", "KeywordLibrary", "LeadRule"],
        actions: ["调整画像", "维护词库", "查看来源权限"],
        status: "可直接开发",
      },
      {
        key: "insight",
        title: "阶段2 洞察采集",
        summary: "多渠道采集任务并行，采集结果统一进入待清洗区。",
        widgets: ["五渠道采集泳道", "来源队列", "异常任务提示"],
        objects: ["CollectionTask", "RawLead", "ChannelSnapshot"],
        actions: ["启动采集", "查看异常", "筛入线索池"],
        status: "演示原型",
      },
      {
        key: "strategy",
        title: "阶段3 策略计划",
        summary: "输出不同渠道的获客配比、跟进 SLA 和优先级分配。",
        widgets: ["渠道配比图", "SLA 配置", "团队分发建议"],
        objects: ["LeadStrategy", "SlaRule", "AssignmentPlan"],
        actions: ["制定配比", "确认跟进节奏", "下发执行"],
        status: "演示原型",
      },
      {
        key: "execute",
        title: "阶段4 执行发布",
        summary: "多来源线索去重、归并、分发到统一线索表。",
        widgets: ["线索去重工作台", "统一线索表", "负责人分派栏"],
        objects: ["Lead", "LeadMergeRecord", "AssignmentTask"],
        actions: ["去重合并", "分配负责人", "输出跟进清单"],
        status: "可直接开发",
      },
      {
        key: "review",
        title: "阶段5 复盘优化",
        summary: "按渠道输出线索质量、转化效率和下一周优化建议。",
        widgets: ["质量评分榜", "转化漏斗", "优化建议"],
        objects: ["LeadMetric", "ReviewReport", "StrategyOptimization"],
        actions: ["查看评分", "写优化", "沉淀到规则"],
        status: "演示原型",
      },
    ],
  },
  {
    key: "traffic",
    title: "投流获客",
    short: "投流",
    icon: Rocket,
    accent: "from-rose-500 via-pink-500 to-fuchsia-500",
    surface: "front",
    summary: "广告创意策划、投放管理和每周复盘串成一个专属的投流闭环。",
    owner: "投流获客专家团",
    outputs: ["广告创意策划方案", "投放排期", "周度复盘报告"],
    route: "/tabs/ad-traffic",
    stages: [
      {
        key: "assets",
        title: "阶段1 资产库",
        summary: "连接品牌资料、营销方案、投放账户和历史素材。",
        widgets: ["投放账户卡", "创意资产库", "预算约束说明"],
        objects: ["AdAccount", "Brand", "CreativeAsset"],
        actions: ["查看账户", "查看创意池", "确认预算边界"],
        status: "可直接开发",
      },
      {
        key: "insight",
        title: "阶段2 洞察采集",
        summary: "读取历史投放表现、平台采集反馈和内容热度参考。",
        widgets: ["投放历史对比", "高表现素材榜", "用户反馈摘要"],
        objects: ["AdMetric", "ContentMetric", "AudienceFeedback"],
        actions: ["查看历史", "筛选高潜素材", "进入策划"],
        status: "演示原型",
      },
      {
        key: "strategy",
        title: "阶段3 策略计划",
        summary: "沉淀创意方案、AB 排期和营销日历。",
        widgets: ["创意策略 10 章结构", "AB 排期图", "投放日历"],
        objects: ["AdStrategy", "AbPlan", "CalendarItem"],
        actions: ["生成方案", "调整 AB 排期", "确认上线窗口"],
        status: "可直接开发",
      },
      {
        key: "execute",
        title: "阶段4 执行发布",
        summary: "围绕投放任务、素材版本和账户状态形成执行工作台。",
        widgets: ["投放任务列表", "素材版本面板", "账户状态面板"],
        objects: ["CampaignTask", "CreativeVersion", "AdAccountStatus"],
        actions: ["发起投放", "关联素材", "跟踪执行"],
        status: "演示原型",
      },
      {
        key: "review",
        title: "阶段5 复盘优化",
        summary: "周六定时复盘和人工优化建议在同一页收口。",
        widgets: ["投放复盘报告", "消耗/转化图", "下周优化项"],
        objects: ["ReviewReport", "SpendMetric", "StrategyOptimization"],
        actions: ["看复盘", "写优化", "回流内容创作"],
        status: "演示原型",
      },
    ],
  },
  {
    key: "creator",
    title: "达人合作",
    short: "达人",
    icon: Users,
    accent: "from-violet-500 via-fuchsia-500 to-pink-500",
    surface: "front",
    summary: "达人匹配、合作推进、数据回收和复投建议统一在一条业务线上。",
    owner: "达人合作专家团",
    outputs: ["达人匹配清单", "合作跟踪台账", "效果评估与复投建议"],
    route: "/tabs/daren-collab",
    stages: [
      {
        key: "assets",
        title: "阶段1 资产库",
        summary: "查看品牌卖点、合作约束和达人筛选规则。",
        widgets: ["合作约束卡", "卖点摘要", "达人画像规则"],
        objects: ["Brand", "CampaignConstraint", "CreatorPersona"],
        actions: ["确认合作方向", "查看约束", "准备筛选条件"],
        status: "可直接开发",
      },
      {
        key: "insight",
        title: "阶段2 洞察采集",
        summary: "达人搜索、候选池、深度抓取结果统一入池。",
        widgets: ["达人搜索面板", "候选池", "深抓结果卡"],
        objects: ["CreatorCandidate", "CreatorProfile", "SearchTask"],
        actions: ["搜索达人", "查看候选池", "触发深抓"],
        status: "演示原型",
      },
      {
        key: "strategy",
        title: "阶段3 策略计划",
        summary: "输出合作名单、推荐理由和优先推进节奏。",
        widgets: ["匹配清单", "推荐理由", "合作节奏图"],
        objects: ["CreatorMatch", "RecommendationReason", "SchedulePlan"],
        actions: ["确认名单", "导入跟踪", "发起合作"],
        status: "可直接开发",
      },
      {
        key: "execute",
        title: "阶段4 执行发布",
        summary: "围绕合作进展、作品回传、定时刷新做统一跟踪。",
        widgets: ["合作跟踪表", "作品刷新卡", "合作状态时间轴"],
        objects: ["CollabTask", "CreatorWork", "TrackingEvent"],
        actions: ["推进合作", "刷新数据", "记录异常"],
        status: "演示原型",
      },
      {
        key: "review",
        title: "阶段5 复盘优化",
        summary: "结合作品数据、ROI 和复投建议做收口决策。",
        widgets: ["效果评估", "复投建议", "黑名单/白名单"],
        objects: ["CollabMetric", "ReviewReport", "CreatorPolicy"],
        actions: ["评估效果", "沉淀名单策略", "进入下一轮"],
        status: "演示原型",
      },
    ],
  },
  {
    key: "utility",
    title: "公用中心",
    short: "公用",
    icon: Boxes,
    accent: "from-slate-500 via-slate-700 to-slate-900",
    surface: "utility",
    summary: "所有非单一获客方式的能力统一收口到公用中心，不再散落在个人中心和更多功能。",
    owner: "平台支撑层",
    outputs: ["统一素材库", "作品归档", "AI 智控后台", "版本与升级"],
    route: "/ai-control",
    utilityCards: [
      {
        key: "works",
        title: "作品归档",
        summary: "全平台作品唯一检索入口，承接最终成品、发布状态与回传数据。",
        route: "/tabs/brand-control",
        widgets: ["作品列表", "多维筛选", "发布状态"],
        status: "可直接开发",
      },
      {
        key: "materials",
        title: "统一素材库",
        summary: "把文本、图片、音频、视频、文档 5 类素材统一管理和复用。",
        route: "/ai-control/assets",
        widgets: ["素材瀑布流", "复用次数", "标签分组"],
        status: "可直接开发",
      },
      {
        key: "control",
        title: "AI 智控中心",
        summary: "面向配置、治理、接口、Ontology 和真源写回的后台工作台。",
        route: "/ai-control",
        widgets: ["9 大板块入口", "配置树", "治理看板"],
        status: "可直接开发",
      },
      {
        key: "upgrade",
        title: "版本与升级",
        summary: "展示当前版本、备份、升级、回滚和风险说明。",
        route: "/ai-control/storage",
        widgets: ["版本状态卡", "升级向导", "回滚历史"],
        status: "演示原型",
      },
      {
        key: "help",
        title: "帮助与文档",
        summary: "面向运营与交付的使用手册、平台说明、快捷入口。",
        route: "/help/publisher",
        widgets: ["帮助目录", "新手入口", "常见问题"],
        status: "演示原型",
      },
      {
        key: "advanced",
        title: "高级设置",
        summary: "保留 SAAS 遗留入口与模块注册、系统级设置，但默认折叠。",
        route: "/ai-control/apis",
        widgets: ["高级开关", "模块管理", "系统设置"],
        status: "需接真源",
      },
    ],
  },
];

const CONTROL_MODULES: ControlModule[] = [
  {
    key: "experts",
    title: "专家与团队配置",
    summary: "专家团、专家、角色和绑定关系的主入口。",
    truthSource: "agents/*.md + plugin.json",
    route: "/ai-control/experts",
    status: "可直接开发",
  },
  {
    key: "skills",
    title: "技能与能力管理",
    summary: "Skill 列表、能力绑定、输入输出说明和版本历史。",
    truthSource: "skills/*/SKILL.md",
    route: "/ai-control/skills",
    status: "可直接开发",
  },
  {
    key: "apis",
    title: "第三方接口配置",
    summary: "Provider、连接器、MCP 与安装令牌配置中心。",
    truthSource: "server config + Provider",
    route: "/ai-control/apis",
    status: "演示原型",
  },
  {
    key: "prompts",
    title: "提示词与参考资料",
    summary: "Prompt 片段库、参考资料树和变量校验面板。",
    truthSource: "references/* + prompts/*",
    route: "/ai-control/prompt-library",
    status: "演示原型",
  },
  {
    key: "governance",
    title: "任务与版本治理",
    summary: "跨业务线共用的 workflow-core、阶段记录和证据面板。",
    truthSource: "workflow-core + ontology outbox",
    route: "/ai-control/task-governance",
    status: "可直接开发",
  },
  {
    key: "assets",
    title: "素材中心管理",
    summary: "面向运营后台的素材管理端，不等同于业务前台查看页。",
    truthSource: "Media + material library",
    route: "/ai-control/assets",
    status: "可直接开发",
  },
  {
    key: "brand",
    title: "品牌与用户设置",
    summary: "品牌切换、默认偏好、默认获客参数等后台设置。",
    truthSource: "Brand + User",
    route: "/ai-control/brand",
    status: "需接真源",
  },
  {
    key: "storage",
    title: "存储与系统设置",
    summary: "存储路径、备份、系统参数和连接健康。",
    truthSource: ".env + storage config",
    route: "/ai-control/storage",
    status: "演示原型",
  },
  {
    key: "ontology",
    title: "Ontology 编排中心",
    summary: "只负责流程治理、确认闸、证据与专家源写回，不负责业务自动落表。",
    truthSource: "published_contract + orchestration",
    route: "/ai-control/ontology",
    status: "可直接开发",
  },
];

const ROUTE_GROUPS = [
  {
    title: "运营前台路由",
    tone: "text-indigo-700 bg-indigo-50 ring-indigo-200",
    items: [
      "/tabs/brand-control -> 品牌总控",
      "/tabs/content-customer -> 内容获客",
      "/tabs/geo-customer -> GEO 获客",
      "/tabs/omni-channel -> 全网获客",
      "/tabs/ad-traffic -> 投流获客",
      "/tabs/daren-collab -> 达人合作",
    ],
  },
  {
    title: "智控后台路由",
    tone: "text-slate-700 bg-slate-100 ring-slate-200",
    items: [
      "/ai-control -> 9 板块总入口",
      "/ai-control/ontology -> 编排中心",
      "/ai-control/task-governance -> 任务与版本治理",
      "/ai-control/apis -> 接口与证据",
      "/ai-control/storage -> 存储与升级",
    ],
  },
  {
    title: "本次 Demo 路由",
    tone: "text-amber-700 bg-amber-50 ring-amber-200",
    items: [
      "/system-demo -> 面向技术团队的整套前端演示",
      "前台/后台边界在同一页讲清楚",
      "页面只做结构示范，不补造业务执行记录",
    ],
  },
];

const LEGACY_MAPPINGS = [
  { from: "/brand-growth", to: "品牌总控 / 内容获客 / 阶段3 策略计划" },
  { from: "/douyin / /xiaohongshu / /wechat", to: "内容获客 / 阶段4 执行发布" },
  { from: "/geo", to: "GEO 获客" },
  { from: "/all-network-growth", to: "全网获客" },
  { from: "/paid-acquisition", to: "投流获客" },
  { from: "/creator-cooperation", to: "达人合作" },
  { from: "/more-features / /personal-center/*", to: "公用中心或 AI 智控中心" },
];

function statusClasses(status: DemoStatus) {
  if (status === "可直接开发") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "演示原型") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function SurfaceCard({
  title,
  description,
  icon: Icon,
  pill,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  pill?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(12,18,30,0.9)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
          </div>
        </div>
        {pill}
      </div>
      {children}
    </section>
  );
}

export function SystemDemoWorkbench() {
  const [activeEntryKey, setActiveEntryKey] = useState("brand-control");
  const [activeStageKey, setActiveStageKey] = useState("assets");
  const [activeUtilityKey, setActiveUtilityKey] = useState("works");

  const activeEntry = useMemo(
    () => FRONT_ENTRIES.find((item) => item.key === activeEntryKey) ?? FRONT_ENTRIES[0],
    [activeEntryKey],
  );

  const activeStage = useMemo(
    () => activeEntry.stages?.find((item) => item.key === activeStageKey) ?? activeEntry.stages?.[0] ?? null,
    [activeEntry, activeStageKey],
  );

  const activeUtilityCard = useMemo(
    () => activeEntry.utilityCards?.find((item) => item.key === activeUtilityKey) ?? activeEntry.utilityCards?.[0] ?? null,
    [activeEntry, activeUtilityKey],
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_26%),radial-gradient(circle_at_top_right,rgba(244,114,182,0.18),transparent_24%),linear-gradient(180deg,#050816_0%,#09101d_40%,#0a1222_100%)] px-4 py-6 text-slate-100 md:px-6 md:py-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(99,102,241,0.18),rgba(15,23,42,0.92)_40%,rgba(244,114,182,0.12))] p-6 shadow-[0_30px_80px_rgba(2,8,23,0.45)] md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 ring-1 ring-white/10">
              <Wand2 className="h-3.5 w-3.5" />
              面向技术团队的整套前端 Demo
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-400/20">
              运营前台与智控后台分层展示
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-400/20">
              不改真实业务数据，只做结构演示
            </span>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.7fr_0.9fr]">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                AI 全域运营系统前端 Demo
              </h1>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-200 md:text-[15px]">
                这页不是单个模块原型，而是把整套系统的前台信息架构、AI 智控后台、旧路由迁移和技术拆解一次讲清楚。
                技术团队拿到后，可以直接按「7 个一级入口 + 5 阶段流程 + 公用中心 + 9 板块智控后台」去拆页面、组件和数据接口。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={activeEntry.route}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                >
                  打开当前演示对应页面
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/ai-control"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  查看现有智控后台
                  <Settings2 className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid gap-3 rounded-[28px] border border-white/10 bg-black/15 p-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">最终目的</div>
                <div className="mt-2 text-sm leading-6 text-white">
                  用户用模糊业务语言下指令，系统能自动把业务入口、对象、专家、Skill、任务和成果归档串起来。
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">当前目的</div>
                <div className="mt-2 text-sm leading-6 text-white">
                  先把前端工作台的页面层级、命名、导航和模块边界锁清楚，供技术团队照此开发。
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">存在问题</div>
                <div className="mt-2 text-sm leading-6 text-white">
                  旧系统入口分散、命名不直观、配置与业务混在一起，所以这版 demo 重点先解决结构问题，再去接真源细节。
                </div>
              </div>
            </div>
          </div>
        </section>

        <SurfaceCard
          title="运营前台 Demo"
          description="前台只展示业务动作，不展示底层技术词。用户先按业务目标进入，再在内部按 5 阶段推进。"
          icon={Workflow}
          pill={
            <span className="inline-flex items-center rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-100 ring-1 ring-indigo-300/20">
              D197：`/tabs/*` 只做运营前台
            </span>
          }
        >
          <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {FRONT_ENTRIES.map((entry) => {
                  const Icon = entry.icon;
                  const active = entry.key === activeEntry.key;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => {
                        setActiveEntryKey(entry.key);
                        setActiveStageKey("assets");
                        setActiveUtilityKey(entry.utilityCards?.[0]?.key ?? "works");
                      }}
                      className={`group rounded-[24px] border p-4 text-left transition ${
                        active
                          ? "border-white/20 bg-white/10 shadow-[0_18px_40px_rgba(15,23,42,0.25)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-white ${entry.accent}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-slate-200 ring-1 ring-white/10">
                          {entry.short}
                        </span>
                      </div>
                      <div className="mt-4 text-base font-semibold text-white">{entry.title}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{entry.summary}</p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">当前入口</div>
                    <h3 className="mt-2 text-2xl font-semibold text-white">{activeEntry.title}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{activeEntry.summary}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">对应角色</div>
                    <div className="mt-2 font-medium text-white">{activeEntry.owner}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {activeEntry.outputs.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center rounded-full bg-white/6 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                {activeEntry.surface === "front" ? (
                  <div className="mt-5 space-y-5">
                    <div className="flex flex-wrap gap-2">
                      {FRONT_STAGE_TITLES.map((stage) => {
                        const selected = activeStage?.key === stage.key;
                        return (
                          <button
                            key={stage.key}
                            type="button"
                            onClick={() => setActiveStageKey(stage.key)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                              selected
                                ? "bg-white text-slate-950"
                                : "bg-white/6 text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                            }`}
                          >
                            {stage.title}
                          </button>
                        );
                      })}
                    </div>

                    {activeStage ? (
                      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
                        <div className="rounded-[22px] border border-white/10 bg-[#0d1524] p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">阶段说明</div>
                              <div className="mt-2 text-xl font-semibold text-white">{activeStage.title}</div>
                            </div>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClasses(activeStage.status)}`}>
                              {activeStage.status}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-300">{activeStage.summary}</p>

                          <div className="mt-5 grid gap-3 md:grid-cols-3">
                            <InfoBlock title="页面组件" icon={LayoutDashboard} items={activeStage.widgets} />
                            <InfoBlock title="核心对象" icon={Database} items={activeStage.objects} />
                            <InfoBlock title="主要动作" icon={Bot} items={activeStage.actions} />
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-white/10 bg-[#0b1220] p-5">
                          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">开发拆解</div>
                          <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                            <li>1. 先做 {activeEntry.title} 的页面壳和阶段切换。</li>
                            <li>2. 再按当前阶段把组件区块拆成独立 section / widget。</li>
                            <li>3. 最后把对象查询和动作按钮接到真实 API。</li>
                          </ul>
                          <div className="mt-5 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4 text-sm leading-6 text-indigo-100">
                            当前建议路由：<span className="font-semibold text-white">{activeEntry.route}</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : activeUtilityCard ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.25fr]">
                    <div className="grid gap-3">
                      {activeEntry.utilityCards?.map((card) => {
                        const selected = activeUtilityCard.key === card.key;
                        return (
                          <button
                            key={card.key}
                            type="button"
                            onClick={() => setActiveUtilityKey(card.key)}
                            className={`rounded-[22px] border p-4 text-left transition ${
                              selected
                                ? "border-white/20 bg-white/10"
                                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-base font-semibold text-white">{card.title}</div>
                              <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${statusClasses(card.status)}`}>
                                {card.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{card.summary}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="rounded-[22px] border border-white/10 bg-[#0d1524] p-5">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">当前公用模块</div>
                      <h4 className="mt-2 text-xl font-semibold text-white">{activeUtilityCard.title}</h4>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{activeUtilityCard.summary}</p>
                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <InfoBlock title="页面组件" icon={Library} items={activeUtilityCard.widgets} />
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-white">
                            <FileCode2 className="h-4 w-4 text-slate-300" />
                            建议落点
                          </div>
                          <div className="mt-3 text-sm leading-6 text-slate-300">{activeUtilityCard.route}</div>
                          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400">
                            公用中心只保留跨业务线能力，不再混入具体业务流程说明块。
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">前台边界</div>
                <h3 className="mt-2 text-lg font-semibold text-white">运营层只回答三件事</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <li>1. 我现在要做哪条业务线。</li>
                  <li>2. 我在这条业务线的哪个阶段。</li>
                  <li>3. 当前该看什么、该做什么、产物会落到哪里。</li>
                </ul>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">旧路由迁移</div>
                <div className="mt-4 space-y-3">
                  {LEGACY_MAPPINGS.map((item) => (
                    <div key={item.from} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                      <div className="text-sm font-medium text-white">{item.from}</div>
                      <div className="mt-1 text-sm text-slate-300">{item.to}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="AI 智控后台 Demo"
          description="后台专门负责配置、治理、接口、证据和编排，不和前台业务操作混在一起。"
          icon={Settings2}
          pill={
            <span className="inline-flex items-center rounded-full bg-slate-200/10 px-3 py-1 text-xs font-medium text-slate-100 ring-1 ring-white/10">
              D197：`/ai-control/*` 只做智控后台
            </span>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CONTROL_MODULES.map((module) => (
              <Link
                key={module.key}
                href={module.route}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-base font-semibold text-white">{module.title}</div>
                  <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${statusClasses(module.status)}`}>
                    {module.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{module.summary}</p>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-slate-400">
                  真源：{module.truthSource}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-[#0b1220] p-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <InfoBlock
                title="后台必须解决"
                icon={BookMarked}
                items={[
                  "配置读写要面向真源文件或真表",
                  "任务与证据必须可追踪",
                  "Ontology 只做治理，不替代业务落表",
                ]}
              />
              <InfoBlock
                title="后台禁止做"
                icon={Settings2}
                items={[
                  "把公用设置塞进运营前台",
                  "用假记录伪装真实执行",
                  "把 OpenClaw 历史代号继续暴露给业务用户",
                ]}
              />
              <InfoBlock
                title="交付给技术团队"
                icon={FileStack}
                items={[
                  "前后台路由边界",
                  "9 板块真源口径",
                  "治理链路与写回闸说明",
                ]}
              />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="技术拆解与交付说明"
          description="这一部分专门给开发团队看，明确路径、壳层、复用点和迁移策略。"
          icon={Building2}
        >
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              {ROUTE_GROUPS.map((group) => (
                <div key={group.title} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <div className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${group.tone}`}>
                    {group.title}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {group.items.map((item) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm leading-6 text-slate-300">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">建议组件分层</div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <li>1. `shell`：顶部导航、入口切换、阶段切换、公用中心卡片。</li>
                  <li>2. `overview`：KPI、状态卡、风险提示、流程摘要。</li>
                  <li>3. `workspace`：每个阶段的主工作区、列表、表单、详情抽屉。</li>
                  <li>4. `control`：智控后台资源树、治理看板、配置面板。</li>
                </ul>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">建议开发顺序</div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <li>1. 先完成 7 个一级入口与公用中心的壳层导航。</li>
                  <li>2. 再做内容获客与品牌总控两条主线，作为模板页。</li>
                  <li>3. 然后扩到 GEO / 全网 / 投流 / 达人四条业务线。</li>
                  <li>4. 最后把 AI 智控后台 9 板块和治理链真正接起来。</li>
                </ul>
              </div>

              <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
                <div className="font-semibold text-white">本轮 demo 的边界</div>
                <div className="mt-2">
                  已经把整套系统该怎么拆页面、怎么分前后台、怎么迁旧路由讲清楚；但它仍是演示工作台，不替代真实 API 接入和真数联调。
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </main>
  );
}

function InfoBlock({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <Icon className="h-4 w-4 text-slate-300" />
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-black/15 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
