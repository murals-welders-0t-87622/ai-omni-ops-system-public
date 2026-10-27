import type { DashboardData } from "./types";

export const OMNI_DASHBOARD_DATA: DashboardData = {
  tabSlug: "omni-channel",
  tabTitle: "全网获客",
  breadcrumb: "首页 · 全网获客",
  heroTitle: "全网获客 · 评论筛选 + 平台意向名单",
  heroPillTone: "bg-sky-50 text-sky-700 ring-sky-100",
  heroPillLabel: "全网获客面板",
  heroAccentDot: "bg-sky-500",
  ctaExportLabel: "导出当日获客名单",
  ctaActionLabel: "启动全网获客专家任务",
  ctaActionHref: "/ai-control",
  ctaActionGradient: "from-sky-500 to-indigo-500",
  permissionBanner: null,
  kpiCards: [],
  channelSectionTitle: "",
  channelSectionAccent: "bg-transparent",
  channelProgress: [],
  timelineTitle: "",
  timelineAccent: "bg-transparent",
  timelineStages: [],
  taskSectionTitle: "",
  taskSectionAccent: "bg-transparent",
  taskTableType: "crossPosts",
  taskTable: { headers: [], rows: [] },
  topSectionTitle: "",
  topSectionAccent: "bg-transparent",
  topMaterials: [],
  useOmniCustomLayout: true,
  useContentCustomLayout: true,
  contentPlatformTabs: [
    { key: "all", label: "全平台", tone: "bg-sky-600 text-white", active: true, hint: "" },
  ],
  contentSubTabsByPlatform: {
    all: [
      { key: "omniComment", label: "评论获客" },
      { key: "omniPlatform", label: "平台获客" },
    ],
    douyin: [
      { key: "omniComment", label: "评论获客" },
      { key: "omniPlatform", label: "平台获客" },
    ],
    xiaohongshu: [
      { key: "omniComment", label: "评论获客" },
      { key: "omniPlatform", label: "平台获客" },
    ],
    wechat: [
      { key: "omniComment", label: "评论获客" },
      { key: "omniPlatform", label: "平台获客" },
    ],
  },
  contentExpertChain: {
    title: "当前任务专家链（全网获客 Pipeline）",
    steps: [
      { name: "策略主理人", subline: "当日全网获客策略分配", detail: "垂类关键词、平台范围、筛选阈值自动注入", tone: "doing" },
      { name: "评论获客专家", subline: "小红书 / 抖音 双平台评论筛选", detail: "按意图筛选高意向评论并写入 comment-leads 名单", tone: "pending" },
      { name: "平台获客专家", subline: "全平台企业/机构意向名单", detail: "抓取全平台公开信息并去重后写入 platform-leads", tone: "pending" },
      { name: "销售交接专家", subline: "筛选后的名单转销售跟进", detail: "记录跟进状态 & 打标签，支持单条删除", tone: "pending" },
    ],
    strategyNote: "评论获客支持小红书/抖音过滤，平台获客为全平台名单；所有真实数据直接来自 comment-leads / platform-leads 两个 REST 接口。",
  },
};
