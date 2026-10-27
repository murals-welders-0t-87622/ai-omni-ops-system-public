import type { DashboardData } from "./types";

export const DAREN_DASHBOARD_DATA: DashboardData = {
  tabSlug: "daren-collab",
  tabTitle: "达人合作",
  breadcrumb: "首页 · 达人合作",
  heroTitle: "达人合作 · 匹配筛选 + 跟踪建档 + 作品下钻",
  heroPillTone: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-100",
  heroPillLabel: "达人合作面板",
  heroAccentDot: "bg-fuchsia-500",
  ctaExportLabel: "导出达人名单",
  ctaActionLabel: "启动达人专家任务",
  ctaActionHref: "/ai-control",
  ctaActionGradient: "from-fuchsia-500 to-purple-500",
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
  taskTableType: "partners",
  taskTable: { headers: [], rows: [] },
  topSectionTitle: "",
  topSectionAccent: "bg-transparent",
  topMaterials: [],
  useDarenCustomLayout: true,
  useContentCustomLayout: true,
  contentPlatformTabs: [
    { key: "all", label: "全平台达人", tone: "bg-fuchsia-600 text-white", active: true, hint: "" },
  ],
  contentSubTabsByPlatform: {
    all: [
      { key: "darenMatching", label: "达人匹配" },
      { key: "darenTracking", label: "达人跟踪" },
    ],
    douyin: [
      { key: "darenMatching", label: "达人匹配" },
      { key: "darenTracking", label: "达人跟踪" },
    ],
    xiaohongshu: [
      { key: "darenMatching", label: "达人匹配" },
      { key: "darenTracking", label: "达人跟踪" },
    ],
    wechat: [
      { key: "darenMatching", label: "达人匹配" },
      { key: "darenTracking", label: "达人跟踪" },
    ],
  },
  contentExpertChain: {
    title: "当前任务专家链（达人合作 Pipeline）",
    steps: [
      { name: "策略主理人", subline: "达人画像 & 分层策略分配", detail: "垂类/粉丝区间/报价/历史合作筛选阈值注入", tone: "doing" },
      { name: "匹配专家", subline: "达人匹配候选池生成", detail: "抓蝉妈妈/星图/蒲公英 按阈值筛出候选写入 matching，支持批量加入跟踪", tone: "pending" },
      { name: "跟踪建档专家", subline: "匹配池 → 跟踪建档列表", detail: "批量或单个加入 tracking，建档后可下钻查看该达人作品", tone: "pending" },
      { name: "作品维护专家", subline: "跟踪达人作品 CRUD", detail: "每个 tracking 建档支持 作品下钻查看 / 新增 / 修改 / 删除", tone: "pending" },
    ],
    strategyNote: "达人匹配支持批量加跟踪清单/批量删除；达人跟踪支持建档管理+单条作品下钻；真实接口走 creator-cooperations/matching & creator-cooperations/tracking & tracking/:id/works 共 11 条子路由。",
  },
};
