export const COMMERCE_OPERATOR_MODULES = [
  { key: "advertising", label: "广告运营", fields: { campaignId: "广告计划ID", itemId: "店铺商品ID", action: "拟执行动作", dailyBudget: "日预算（元）", bid: "出价（元）", audience: "关键词或人群", attributionWindow: "归因及观察窗口" } },
  { key: "pricing", label: "价格与促销", fields: { itemId: "店铺商品ID", skuId: "SKU ID", currentPrice: "当前价格（元）", targetPrice: "拟调整价格（元）", costFloor: "成本与最低可接受价格", stockLimit: "活动库存", perPersonLimit: "每人限购", stacking: "优惠叠加规则" } },
  { key: "listing", label: "商品发布", fields: { itemId: "店铺商品ID（新商品可留空）", skuId: "SKU ID", action: "发布或上下架动作", title: "商品标题", category: "类目与必填属性", price: "售价（元）", stock: "库存", contentProjectId: "内容项目ID", qualification: "资质与商品审核依据" } },
  { key: "merchandising", label: "商品与搜索", fields: { itemId: "店铺商品ID", skuId: "SKU ID", title: "候选标题", keywords: "搜索词与商品属性", contentProjectId: "内容项目ID", experiment: "单变量测试安排" } },
  { key: "service", label: "服务与履约", fields: { itemId: "店铺商品ID", action: "服务或履约动作", audience: "服务对象范围", content: "服务内容", owner: "负责人" } },
  { key: "data", label: "数据核查", fields: { itemId: "店铺商品ID", campaignId: "广告计划ID", metrics: "查询指标", definition: "统计定义与去重范围", comparison: "对比周期", attributionWindow: "归因窗口" } },
] as const;
const str = { type: "string" };
export const COMMERCE_OPERATION_SPEC_SCHEMA = { type: "object", additionalProperties: false, required: ["module", "parameters"], properties: { module: { enum: COMMERCE_OPERATOR_MODULES.map(m => m.key) }, parameters: { type: "array", maxItems: 16, items: { type: "object", additionalProperties: false, required: ["key", "value"], properties: { key: str, value: str } } } } };
export function normalizeCommerceOperationSpec(v: any) {
  const module = COMMERCE_OPERATOR_MODULES.find(m => m.key === v?.module);
  if (!module || !v || Object.keys(v).some(k => !["module", "parameters"].includes(k)) || !Array.isArray(v.parameters) || v.parameters.length > 16) throw Error("请选择支持的运营板块");
  const seen = new Set();
  const parameters = v.parameters.map((p: any) => {
    if (!p || Object.keys(p).some(k => !["key", "value"].includes(k)) || !Object.prototype.hasOwnProperty.call(module.fields, p.key) || seen.has(p.key) || typeof p.value !== "string" || p.value.length > 6000) throw Error("运营字段无效或重复");
    seen.add(p.key);
    if (["dailyBudget", "bid", "currentPrice", "targetPrice", "price"].includes(p.key) && p.value && !/^\d{1,12}(\.\d{1,2})?$/.test(p.value)) throw Error("金额须为非负数且最多两位小数");
    if (["stock", "stockLimit", "perPersonLimit"].includes(p.key) && p.value && !/^\d{1,10}$/.test(p.value)) throw Error("库存与限购须为非负整数");
    return { key: p.key, value: p.value.trim() };
  });
  return { module: module.key, parameters };
}
export function commerceOperationLink(plan: any, initiative: any) {
  return `/tabs/ecommerce/operate?${new URLSearchParams({ planId: plan.id, planRevision: String(plan.revision), initiativeId: initiative.id })}`;
}
