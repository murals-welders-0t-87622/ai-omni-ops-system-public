import { BadRequestException } from "@nestjs/common";
import { createHash } from "node:crypto";
export const GROWTH_SCOPES = ["brand", "content", "geo", "omni", "paid", "creator"] as const;
export const GROWTH_PLAN_PERMISSION = "brandGrowth.report.topicLibrary" as const;
export const growthHash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
export const growthText = (v: unknown, field: string, max = 2000) => { if (typeof v !== "string" || !v.trim() || v.trim().length > max) throw new BadRequestException(`${field}缺失或超长`); return v.trim(); };
const DAY = 86400000;
export const growthDay = (d = new Date()) => new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10);
export const addGrowthDays = (s: string, n: number) => new Date(Date.parse(s + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
export function growthDate(v: unknown) { const s = String(v || ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s + "T00:00:00Z")) || new Date(s + "T00:00:00Z").toISOString().slice(0, 10) !== s || s < "2000-01-01" || s > "2100-12-31") throw new BadRequestException("日期须在2000至2100年且真实有效"); return s; }
export function growthWindow(input: Record<string, any>, now = new Date()) {
  const kind = String(input.dimension || "week"), anchor = growthDate(input.anchor || addGrowthDays(growthDay(now), -1)); let start = anchor, end = anchor;
  if (kind === "custom") { start = growthDate(input.start); end = growthDate(input.end); }
  else if (kind === "week") { start = addGrowthDays(anchor, -((new Date(anchor + "T00:00:00Z").getUTCDay() + 6) % 7)); end = addGrowthDays(start, 6); }
  else if (["month", "quarter", "year"].includes(kind)) { const year = Number(anchor.slice(0, 4)), month = Number(anchor.slice(5, 7)); const first = kind === "year" ? 1 : kind === "quarter" ? Math.floor((month - 1) / 3) * 3 + 1 : month; start = `${year}-${String(first).padStart(2, "0")}-01`; end = new Date(Date.UTC(year, first - 1 + (kind === "year" ? 12 : kind === "quarter" ? 3 : 1), 0)).toISOString().slice(0, 10); }
  else if (kind !== "day") throw new BadRequestException("请选择日、周、月、季、年或自定义");
  if (start > end) throw new BadRequestException("开始日期不能晚于结束日期");
  const days = Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1; if (days > 3660) throw new BadRequestException("单次最多查询10年");
  const observedEnd = end < growthDay(now) ? end : addGrowthDays(growthDay(now), -1);
  const observedDays = observedEnd >= start ? Math.round((Date.parse(observedEnd) - Date.parse(start)) / DAY) + 1 : 0;
  const previousEnd = addGrowthDays(start, -1), previousStart = addGrowthDays(start, -Math.max(1, observedDays));
  return { dimension: kind, start, end, observedEnd, days, observedDays, previousStart, previousEnd, timezone: "Asia/Shanghai", comparison: "previous_equal_observed_days", from: new Date(start + "T00:00:00+08:00"), until: new Date(addGrowthDays(observedEnd, 1) + "T00:00:00+08:00") };
}
export type GrowthMetricSpec = { key: string; scope: typeof GROWTH_SCOPES[number]; label: string; unit: string; meaning: string; model?: string; filter?: Record<string, any>; platform?: string; fact?: boolean; ratio?: [string, string]; sum?: [string, string]; percentage?: boolean };
export const GROWTH_METRICS: GrowthMetricSpec[] = [
  { key: "brand.reports", scope: "brand", label: "新增增长报告", unit: "份", meaning: "本期新增归档报告，不等于已批准策略", model: "businessAsset", filter: { category: "BRAND_GROWTH_REPORT" } },
  { key: "brand.marketing_plans", scope: "brand", label: "新增营销方案", unit: "份", meaning: "归档方案数，不代表执行完成", model: "aIControlCenterMarketingPlan" },
  ...["douyin", "xiaohongshu", "wechat"].flatMap(platform => [
    { key: `content.${platform}.works`, scope: "content" as const, label: `${platform === "douyin" ? "抖音/视频号" : platform === "wechat" ? "公众号" : "小红书"}作品入库`, unit: "件", meaning: "自有作品归档数，不等于公开发布", model: "aIControlCenterVideoWork", filter: { workspaceScope: platform }, platform },
    { key: `content.${platform}.plans`, scope: "content" as const, label: `${platform === "douyin" ? "抖音/视频号" : platform === "wechat" ? "公众号" : "小红书"}每日计划`, unit: "份", meaning: "本期创建计划记录，不等于计划完成", model: "aIControlCenterDailyPlan", filter: { workspaceScope: platform }, platform },
  ]),
  { key: "content.analysis", scope: "content", label: "新增拆解结果", unit: "版", meaning: "实际保存的不可变结果修订，取消委托不计", model: "workAnalysisResult", filter: { request: { status: { not: "cancelled" } } } },
  { key: "geo.reports", scope: "geo", label: "新增可见度报告", unit: "份", meaning: "报告归档数量，不等于提及率", model: "aIControlCenterGeoVisibilityReport", filter: { workspaceScope: "geo" } },
  { key: "geo.contents", scope: "geo", label: "新增GEO资料", unit: "份", meaning: "内容与诊断等资料，不代表外部发布", model: "aIControlCenterGeoContent", filter: { workspaceScope: "geo" } },
  { key: "omni.comments", scope: "omni", label: "新增评论候选", unit: "条", meaning: "原始候选记录，未做跨平台客户去重", model: "aIControlCenterCommentLead", filter: { workspaceScope: "all_network_growth" } },
  { key: "omni.platform", scope: "omni", label: "新增平台名单", unit: "条", meaning: "名单记录，不等于有效客户或已跟进", model: "aIControlCenterPlatformLead", filter: { workspaceScope: "all_network_growth" } },
  { key: "paid.records", scope: "paid", label: "新增投流线索文档", unit: "份", meaning: "标题/正文文档，不代表去重线索数", model: "aIControlCenterTencentAdLead", filter: { workspaceScope: "paid_acquisition" } },
  { key: "creator.matches", scope: "creator", label: "新增达人匹配", unit: "条", meaning: "匹配记录，不等于签约人数", model: "aIControlCenterCreatorCooperationMatch", filter: { workspaceScope: "creator_cooperation" } },
  { key: "creator.tracking", scope: "creator", label: "新增跟踪记录", unit: "条", meaning: "跟踪记录，不等于已合作或交付", model: "aIControlCenterCreatorCooperationTracking", filter: { workspaceScope: "creator_cooperation" } },
  { key: "creator.works", scope: "creator", label: "新增跟踪作品", unit: "件", meaning: "跟踪作品记录，不等于本期新增播放", model: "aIControlCenterCreatorCooperationWork", filter: { workspaceScope: "creator_cooperation" } },
  ...([
    ["global.qualified", "brand", "新增有效线索", "位", "按统一身份去重且首次确认有效的客户；需来源及去重口径"],
    ["global.candidates", "brand", "去重候选客户", "位", "去重后的候选客户，不能与有效客户相加"],
    ["global.revenue", "brand", "可归因净收入", "元", "需订单、退款与归因证据"],
    ["content.published", "content", "已核验发布", "件", "来自平台发布回执，不是生成或入库"],
    ["content.qualified", "content", "内容归因有效线索", "位", "同一主来源归因，仅首次有效客户"],
    ["geo.answers", "geo", "GEO有效回答", "份", "固定题库/模型/测法版本的有效观测"],
    ["geo.mentions", "geo", "GEO品牌提及", "份", "同一题库与模型中出现品牌的有效回答"],
    ["geo.citations", "geo", "GEO目标引用", "份", "原始回答存在可验证目标引用"],
    ["omni.qualified", "omni", "全网确认有效客户", "位", "客户身份与有效确认事件"],
    ["paid.spend", "paid", "广告实际消耗", "元", "同账户/归因窗口实际费用，不含人工"],
    ["paid.qualified", "paid", "广告归因有效线索", "位", "归因窗口已成熟且人工/规则确认有效"],
    ["creator.fees", "creator", "达人结算费用", "元", "当期已结算合作费用，不是报价"],
    ["creator.qualified", "creator", "达人归因有效线索", "位", "有明确主来源归因的有效客户"],
  ] as string[][]).map(([key, scope, label, unit, meaning]) => ({ key, scope: scope as GrowthMetricSpec["scope"], label, unit, meaning, fact: true })),
  { key: "global.cash_spend", scope: "brand", label: "已回传现金支出", unit: "元", meaning: "广告实际消耗+达人结算，均需完整来源；不含人工、工具等费用，不外推总成本", sum: ["paid.spend", "creator.fees"] },
  { key: "paid.cpl", scope: "paid", label: "有效线索成本", unit: "元/位", meaning: "同一口径/窗口广告实际消耗÷有效线索", ratio: ["paid.spend", "paid.qualified"] },
  { key: "geo.mention_rate", scope: "geo", label: "品牌提及率", unit: "%", meaning: "同题库/模型有效回答中的品牌提及比例", ratio: ["geo.mentions", "geo.answers"], percentage: true },
  { key: "geo.citation_rate", scope: "geo", label: "目标引用率", unit: "%", meaning: "同题库/模型中目标引用的有效回答比例", ratio: ["geo.citations", "geo.answers"], percentage: true },
];
export function growthSpec(key: unknown) { const spec = GROWTH_METRICS.find(m => m.key === key); if (!spec) throw new BadRequestException("未知经营指标"); return spec; }
export function nextGrowthCheck(frequency: string, now = new Date()) { let date = growthDay(now); const at = (s: string) => new Date(s + "T09:00:00+08:00"); if (at(date) <= now) date = addGrowthDays(date, 1); if (frequency === "weekly") while (new Date(date + "T00:00:00Z").getUTCDay() !== 1) date = addGrowthDays(date, 1); return at(date); }
export function validateGrowthPlan(body: any) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new BadRequestException("缺少结构化计划");
  const metricKey = growthSpec(body.metricKey).key, target = Number(body.target), minSample = Number(body.minSample ?? 1), windowDays = Number(body.windowDays ?? 7);
  if (!Number.isFinite(target) || target < 0 || !["higher", "lower"].includes(body.direction) || !Number.isInteger(minSample) || minSample < 1 || minSample > 1000000 || !Number.isInteger(windowDays) || windowDays < 1 || windowDays > 366) throw new BadRequestException("目标、方向、样本或观察周期不合法");
  if (!Array.isArray(body.actions) || !body.actions.length || body.actions.length > 20) throw new BadRequestException("至少需要一项措施，最多20项");
  const actions = body.actions.map((a: any) => ({ title: growthText(a?.title, "措施", 1000), owner: growthText(a?.owner, "负责人", 200), acceptance: growthText(a?.acceptance, "验收标准", 2000) }));
  return { metricKey, target, direction: body.direction, minSample, windowDays, actions, budgetBoundary: growthText(body.budgetBoundary, "预算与授权边界", 2000) };
}
