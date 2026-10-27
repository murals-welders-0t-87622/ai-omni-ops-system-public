import type { DashboardData } from "./types";

export const TRAFFIC_DASHBOARD_DATA: DashboardData = {
  tabSlug: "ad-traffic",
  tabTitle: "投流获客",
  breadcrumb: "首页 · 投流获客",
  heroTitle: "投流获客 · 腾讯广告线索名单",
  heroPillTone: "bg-rose-50 text-rose-800 ring-rose-100",
  heroPillLabel: "腾讯投流线索面板",
  heroAccentDot: "bg-rose-500",
  ctaExportLabel: "导出线索名单",
  ctaActionLabel: "启动腾讯投流专家任务",
  ctaActionHref: "/ai-control",
  ctaActionGradient: "from-rose-500 to-pink-500",
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
  taskTableType: "plans",
  taskTable: { headers: [], rows: [] },
  topSectionTitle: "",
  topSectionAccent: "bg-transparent",
  topMaterials: [],
  useTrafficCustomLayout: true,
  useContentCustomLayout: true,
  contentPlatformTabs: [
    { key: "all", label: "腾讯广告", tone: "bg-rose-600 text-white", active: true, hint: "" },
    {key:"ocean",label:"巨量广告",tone:"bg-rose-600 text-white",active:false,hint:""},
  ],
  contentSubTabsByPlatform: {
    ocean: [{key:"oceanAds",label:"巨量广告"}],
    all: [
      { key: "trafficTencent", label: "腾讯广告线索" },
    ],
    douyin: [
      { key: "trafficTencent", label: "腾讯广告线索" },
    ],
    xiaohongshu: [
      { key: "trafficTencent", label: "腾讯广告线索" },
    ],
    wechat: [
      { key: "trafficTencent", label: "腾讯广告线索" },
    ],
  },
  contentExpertChain: {
    title: "当前任务专家链（投流获客 Pipeline）",
    steps: [
      { name: "策略主理人", subline: "当日投流预算与目标分配", detail: "腾讯广告账户/计划/人群包/出价按品牌规范注入", tone: "doing" },
      { name: "投放专家", subline: "腾讯广告计划上线 & 消耗监控", detail: "按计划执行投放 & 实时盯盘，异常自动熔断", tone: "pending" },
      { name: "线索承接专家", subline: "腾讯广告拉取留资线索", detail: "拉取线索写入 tencent-ad-leads 并做去重", tone: "pending" },
      { name: "销售跟进专家", subline: "线索跟进 & 回传转化", detail: "标记跟进状态并回传 OCPX 转化数据", tone: "pending" },
    ],
    strategyNote: "投流获客当前只对接腾讯广告线索模块，后续扩充媒体需经用户拍板 & 真源接口确认；单条线索支持刷新列表 / 查看详情 / 删除。",
  },
};
