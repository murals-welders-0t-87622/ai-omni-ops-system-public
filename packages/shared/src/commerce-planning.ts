// Business domains support the existing strategy -> tactics -> execution framework.
export const COMMERCE_STRATEGY_GROUPS = [
  { key: "traffic", label: "流量与拉新", purpose: "把对的人带到商品前" },
  { key: "advertising", label: "广告投流", purpose: "按计划、商品、词与人群管理广告预算和成交ROI" },
  { key: "conversion", label: "商品与转化", purpose: "从点击到付款，解决购买阻碍" },
  { key: "basket", label: "客单与连带", purpose: "让合适的规格和组合增加每单价值" },
  { key: "retention", label: "会员与复购", purpose: "服务已购客户，形成下一次真实需求" },
  { key: "service", label: "服务与供应", purpose: "少退款、及时交付、保障商品可售" },
  { key: "profit", label: "成交与广告回报", purpose: "仅计算广告投入，核对成交与广告ROI" },
  { key: "measurement", label: "数据与复盘", purpose: "核同口径数据并决定下一轮动作" },
] as const;
export const COMMERCE_METRIC_CATALOG = [
  ["impressions", "曝光量", "traffic", "次", "同渠道商品/广告展现次数", "主图、标题、词和匹配人群"],
  ["ctr", "曝光点击率", "traffic", "%", "同一渠道点击次数÷展现次数", "首图A/B、标题与价格表达"],
  ["visitors", "有效访客", "traffic", "人", "同店同渠道去重访客，跨来源不可相加", "自然搜索、推荐及内容入口"],
  ["searchVisitors", "自然搜索访客", "traffic", "人", "平台自然搜索口径去重访客", "搜索意图与标题词匹配"],
  ["cpc", "平均点击成本", "advertising", "元", "同广告窗口花费÷点击次数", "成熟样本下调整词/人群/出价"],
  ["newBuyers", "新成交买家", "traffic", "人", "平台定义的新买家，保留店铺口径", "新客入口与首购承接"],
  ["addCartRate", "加购率", "conversion", "%", "同商品去重加购人数÷商品访客", "规格、详情证据与选购说明"],
  ["orderRate", "访问下单率", "conversion", "%", "去重下单人数÷去重访客", "价格、运费、库存与交付承诺"],
  ["payRate", "下单支付率", "conversion", "%", "同队列支付人数÷下单人数", "结算疑问和真实客服响应"],
  ["buyerConversion", "访客支付转化率", "conversion", "%", "同口径支付买家÷去重访客，不用订单替代买家", "主图到详情到付款单变量优化"],
  ["orders", "支付订单数", "conversion", "单", "同店支付订单，父子订单定义单列", "商品内容与交易承接"],
  ["orderValue", "每单支付金额", "basket", "元", "支付金额÷支付订单数，不等每买家客单", "规格梯度、组合、连带推荐"],
  ["buyerValue", "每买家支付金额", "basket", "元", "支付金额÷支付买家数", "合理组合与客户适配"],
  ["itemsPerOrder", "件单数", "basket", "件/单", "支付商品件数÷支付订单数", "实际适用的组合/加购"],
  ["bundleRate", "搭配购买率", "basket", "%", "含已定义组合的订单÷有效订单", "同需求产品组合与套装说明"],
  ["couponUse", "优惠使用率", "basket", "%", "同批有效优惠券核销数÷有效发放数", "核门槛、叠加和实际到手价"],
  ["repeat30", "30日首购队列复购率", "retention", "%", "成熟首购队列30日内二购人数÷该首购队列人数", "售后服务、使用指引及真实补充需求"],
  ["oldBuyerShare", "老客成交占比", "retention", "%", "平台同窗老买家÷同口径买家，非队列复购率", "老客分层与适配内容"],
  ["memberConversion", "会员购买转化率", "retention", "%", "同窗购买会员÷有效触达会员", "会员权益与客户需求匹配"],
  ["repeatInterval", "二购间隔中位数", "retention", "天", "同一成熟首购队列首次到第二次购买间隔中位数", "按真实使用周期安排服务"],
  ["refundRate", "退款订单率", "service", "%", "同订单队列成功退款单÷支付单，标注成熟窗", "按原因修产品/内容/交付"],
  ["refundAmount", "成功退款金额", "service", "元", "成功退款金额及对应订单期", "退款原因与责任环节修复"],
  ["responseTime", "客服首次响应时间", "service", "秒", "平台有效会话口径首次响应时间", "售前疑问与售后接待排班"],
  ["onTimeShip", "按时发货率", "service", "%", "承诺时限内发货订单÷需发货订单", "库存可售与仓配排程"],
  ["stockoutRate", "缺货损失率", "service", "%", "平台可核实缺货损失口径，不以零销量替代", "主推SKU安全库存和补货"],
  ["adSpend", "广告花费", "advertising", "元", "同平台同账户窗口实际花费", "预算按单元分配与止损"],
  ["roas", "广告ROI（成交投产比）", "advertising", "倍", "成熟归因成交÷广告花费，非净利润", "按商品贡献与归因窗决定放量"],
  ["contribution", "广告后贡献", "profit", "元", "净销售减商品、平台、履约、税费、售后及推广成本", "核SKU成本与每次投放承受力"],
  ["sellThrough", "商品动销率", "profit", "%", "同窗有有效支付的可售SKU÷可售SKU", "主推/利润/潜力/退出货盘"],
  ["returnRate", "金额退款率", "profit", "%", "同订单队列成功退款金额÷该队列支付金额", "留住真实成交与贡献"],
] as const;
const str = { type: "string" }, nullable = { type: ["string", "null"] };
const object = (properties: any) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
export const PLANNING_TARGET_SCHEMA = { type: "object", properties: { gmv: str, orders: str, averageOrderValue: str, overallRoi: str, adSpend: str }, required: ["gmv", "orders", "averageOrderValue"], additionalProperties: false };
export const PLANNING_INVESTMENT_SCHEMA = object({ cash: str, expectedNetSales: nullable, expectedContribution: nullable, strategy: str, expected: str, assumptions: str });
export const PLANNING_VARIANT_SCHEMA = object({ scenarioKey: str, budget: str, calculation: str, settings: str, expected: str, steps: { type: "array", minItems: 1, maxItems: 12, items: str }, stopRule: str });
// Overall ROI uses total store GMV, not ad-attributed revenue. Integer math
// rounds the planned spend to the nearest cent (half up).
export function calculatePlannedAdSpend(gmv: string, overallRoi: string) {
  if (typeof gmv !== "string" || typeof overallRoi !== "string" || !/^\d{1,12}(\.\d{1,8})?$/.test(gmv) || !/^\d{1,9}(\.\d{1,8})?$/.test(overallRoi)) throw Error("请填写合法的GMV和大于0的整体ROI");
  const fixed = (v: string) => { const [whole, decimal = ""] = v.split("."); return BigInt(whole + decimal.padEnd(8, "0")); };
  const amount = fixed(gmv), ratio = fixed(overallRoi);
  if (amount <= 0n || ratio <= 0n) throw Error("GMV和整体ROI必须大于0");
  const cents = (amount * 200n + ratio) / (ratio * 2n);
  if (cents <= 0n || cents > 99999999999999n) throw Error("计算出的广告费超出可设置范围");
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}
export function normalizePlanningTarget(v: any) {
  const keys = v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v).sort().join() : "";
  if (!v || !["averageOrderValue,gmv,orders", "adSpend,averageOrderValue,gmv,orders,overallRoi"].includes(keys) || typeof v.orders !== "string" || typeof v.gmv !== "string" || typeof v.averageOrderValue !== "string" || !/^[1-9]\d{0,8}$/.test(v.orders) || !/^\d{1,12}(\.\d{1,8})?$/.test(v.gmv) || !/^\d{1,9}(\.\d{1,8})?$/.test(v.averageOrderValue) || Number(v.gmv) <= 0 || Number(v.averageOrderValue) <= 0) throw Error("请填写合法的GMV、整数订单及每单支付金额");
  const fixed = (s: string) => { const [n, d = ""] = s.split("."); return BigInt(n + d.padEnd(8, "0")); };
  const gap = fixed(v.gmv) - BigInt(v.orders) * fixed(v.averageOrderValue);
  if (gap > 1000000n || gap < -1000000n) throw Error("GMV须等于订单数×每单支付金额（误差不超过1分），请调整目标");
  const base = { gmv: v.gmv, orders: v.orders, averageOrderValue: v.averageOrderValue };
  if (keys === "averageOrderValue,gmv,orders") return base;
  const adSpend = calculatePlannedAdSpend(v.gmv, v.overallRoi);
  if (typeof v.adSpend !== "string" || !/^\d{1,12}\.\d{2}$/.test(v.adSpend) || v.adSpend !== adSpend) throw Error("计划广告费须按全店GMV÷整体ROI计算");
  return { ...base, overallRoi: v.overallRoi, adSpend };
}
export function commerceInitiativeGroup(i: any) {
  if (COMMERCE_STRATEGY_GROUPS.some(g => g.key === i.group)) {
    if (i.group === "profit" && /广告|投流|投放|ROAS|ROI/.test(i.title || "")) return "advertising";
    return i.group;
  }
  if (/广告|投流|投放|ROAS|ROI|点击成本/.test(i.title || "")) return "advertising";
  const text = [i.title, i.metric, i.branchId].join(" ");
  return /复购|会员|老客|二购/.test(text) ? "retention" : /退款|履约|客服|库存|发货/.test(text) ? "service" : /客单|每单|每买家|连带|组合|促销|件单/.test(text) ? "basket" : /主图|详情|转化|商品|规格|加购|停留|阅读/.test(text) ? "conversion" : /广告|投放|利润|贡献|预算|货盘|动销/.test(text) ? "profit" : /搜索|流量|访客|渠道|自然/.test(text) ? "traffic" : "measurement";
}

// Task result validation: the editable headline and its driver targets must agree.
export function assertPlanningResultTargets(map: any, scorecard: any, target: any) {
  const selected = map?.scenarios.find((s: any) => s.key === map.selectedScenario), orders = scorecard?.drivers.find((m: any) => m.id === "orders"), average = scorecard?.drivers.find((m: any) => m.id === "aov");
  if (!selected || !orders || !average || Number(scorecard.goal.target) !== Number(target.gmv) || Number(orders.target) !== Number(target.orders) || Number(average.target) !== Number(target.averageOrderValue) || ["gmv", "orders", "averageOrderValue"].some(k => Number(selected[k]) !== Number(target[k]))) throw Error("财务目标、orders及aov驱动指标须精确沿用用户输入的三个目标");
  if (target.overallRoi !== undefined && (!selected.investment || Number(selected.investment.cash) !== Number(target.adSpend))) throw Error("选定方案的广告费必须与用户根据整体ROI计算的目标一致");
}

export function assertAdvertisingOnlyBudget(map:any) {
  for(const i of map.initiatives) if(i.group !== 'advertising' && i.variants?.some((v:any)=>Number(v.budget)!==0)) throw Error('本经营模型只计广告费，非广告动作不能进入预算');
}
