import { COMMERCE_STRATEGY_GROUPS, PLANNING_INVESTMENT_SCHEMA, PLANNING_VARIANT_SCHEMA } from "./commerce-planning";
import { COMMERCE_OPERATION_SPEC_SCHEMA, normalizeCommerceOperationSpec } from "./commerce-operations";
// Business decomposition stays inside the existing ecommerce plan and stages.
const str = { type: "string" }, nullable = { type: ["string", "null"] };
const obj = (properties: any, required = Object.keys(properties)) => ({ type: "object", additionalProperties: false, properties, required });
const arr = (items: any, maxItems: number) => ({ type: "array", items, maxItems });
export const COMMERCE_OPERATING_MAP_SCHEMA = obj({
  diagnosis: str, targetBasis: str, attributionRule: str, selectedScenario: str,
  sequence: arr(obj({ title: str, outcome: str, exitCondition: str }), 8),
  scenarios: arr(obj({ key: str, label: str, gmv: str, orders: str, averageOrderValue: str, rationale: str, investment: PLANNING_INVESTMENT_SCHEMA }, ["key", "label", "gmv", "orders", "averageOrderValue", "rationale"]), 4),
  branches: arr(obj({ id: str, parentId: str, title: str, mode: { enum: ["channel", "support"] }, baselineGmv: nullable, targetGmv: nullable, evidence: str, rationale: str, indicators: arr(obj({ label: str, baseline: nullable, target: nullable, unit: str, definition: str }), 10), projection: obj({ visits: str, conversionRate: str, averageOrderValue: str, orders: str, gmv: str }) }, ["id", "parentId", "title", "mode", "baselineGmv", "targetGmv", "evidence", "rationale", "indicators"]), 30),
  initiatives: arr(obj({ id: str, branchId: str, actionKey: str, title: str, metric: str, method: str, settings: str, resources: str, owner: str, startDate: str, endDate: str, budget: str, checkpoint: str, executionMode: { enum: ["ai_content", "merchant_operation", "data_query", "analysis"] }, productId: str, projectId: str, creativeTab: { enum: ["main", "detail", "video", ""] }, operation: COMMERCE_OPERATION_SPEC_SCHEMA, group: { enum: COMMERCE_STRATEGY_GROUPS.map(g => g.key) }, variants: arr(PLANNING_VARIANT_SCHEMA, 4) }, ["id", "branchId", "actionKey", "title", "metric", "method", "settings", "resources", "owner", "startDate", "endDate", "budget", "checkpoint", "executionMode", "productId", "projectId", "creativeTab"]), 50),
}, ["diagnosis", "targetBasis", "attributionRule", "selectedScenario", "scenarios", "branches", "initiatives"]);
function fields(v: any, schema: any) { if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).some(k => !Object.prototype.hasOwnProperty.call(schema.properties, k)) || schema.required.some((k: string) => !(k in v))) throw Error("GMV业务拆解字段不完整或包含未知字段"); }
function text(v: any, empty = false) { if (typeof v !== "string" || v.length > 10000 || (!empty && !v.trim())) throw Error("请填写具体GMV业务说明"); return v.trim(); }
const dec = /^\d{1,18}(\.\d{1,8})?$/;
function amount(v: any, nullOK = false) { if (nullOK && v === null) return v; if (typeof v !== "string" || !dec.test(v)) throw Error("经营指标须为非负十进制字符串，未知保留null"); return v; }
function list(v: any, max: number) { if (!Array.isArray(v) || v.length > max) throw Error("经营业务列表数量不合法"); return v; }
function fixed(v: string) { const [w, f = ""] = v.split("."); return BigInt(w + f.padEnd(8, "0")); }
const scale = 100000000n;
function near(a: bigint, b: bigint) { const d = a - b; return (d < 0n ? -d : d) <= 1000000n; }
export function normalizeCommerceOperatingMap(v: any, actions: any[], scorecard: any) {
  fields(v, COMMERCE_OPERATING_MAP_SCHEMA);
  if (!scorecard) throw Error("GMV拆解须关联本计划的财务目标与周期");
  const scenarios = list(v.scenarios, 4).map(s => {
    fields(s, COMMERCE_OPERATING_MAP_SCHEMA.properties.scenarios.items);
    const gmv = amount(s.gmv), orders = amount(s.orders), averageOrderValue = amount(s.averageOrderValue);
    if (!near(fixed(gmv), fixed(orders) * fixed(averageOrderValue) / scale)) throw Error("GMV情景与订单、每单金额不一致");
    let investment;
    if (s.investment) { fields(s.investment, PLANNING_INVESTMENT_SCHEMA); investment = { ...s.investment, cash: amount(s.investment.cash), expectedNetSales: amount(s.investment.expectedNetSales, true) }; if (investment.expectedContribution !== null && !/^-?\d{1,18}(\.\d{1,8})?$/.test(investment.expectedContribution)) throw Error("贡献测算无效"); for (const k of ["strategy", "expected", "assumptions"]) investment[k] = text(investment[k]); }
    return { ...(investment ? { investment } : {}), key: text(s.key), label: text(s.label), gmv, orders, averageOrderValue, rationale: text(s.rationale) };
  });
  const selected = scenarios.find(s => s.key === v.selectedScenario);
  if (!selected || new Set(scenarios.map(s => s.key)).size !== scenarios.length || (scorecard.goal.target === null || fixed(selected.gmv) !== fixed(scorecard.goal.target))) throw Error("所选GMV情景须与当前财务目标一致");
  const branches = list(v.branches, 30).map(b => {
    fields(b, COMMERCE_OPERATING_MAP_SCHEMA.properties.branches.items);
    if (!["channel", "support"].includes(b.mode)) throw Error("渠道与支撑指标类型无效");
    const indicators = list(b.indicators, 10).map(m => { fields(m, COMMERCE_OPERATING_MAP_SCHEMA.properties.branches.items.properties.indicators.items); return { label: text(m.label), baseline: amount(m.baseline, true), target: amount(m.target, true), unit: text(m.unit), definition: text(m.definition) }; });
    if (b.projection) {
      fields(b.projection, COMMERCE_OPERATING_MAP_SCHEMA.properties.branches.items.properties.projection);
      Object.values(b.projection).forEach(x => amount(x));
      const p = b.projection;
      if (fixed(p.conversionRate) > 100n * scale || !near(fixed(p.visits) * fixed(p.conversionRate) / (100n * scale), fixed(p.orders)) || !near(fixed(p.orders) * fixed(p.averageOrderValue) / scale, fixed(p.gmv)) || (b.targetGmv === null || fixed(p.gmv) !== fixed(b.targetGmv))) throw Error("渠道流量×订单转化×每单金额不能支撑该渠道GMV");
    }
    return { ...b, id: text(b.id), parentId: text(b.parentId, true), title: text(b.title), baselineGmv: amount(b.baselineGmv, true), targetGmv: amount(b.targetGmv, true), evidence: text(b.evidence), rationale: text(b.rationale), indicators };
  });
  if (!branches.length || new Set(branches.map(b => b.id)).size !== branches.length) throw Error("业务分支不能为空或重名");
  for (const b of branches) {
    let parent = b.parentId, visited = new Set([b.id]);
    while (parent) { if (visited.has(parent)) throw Error("业务分支不能循环引用"); visited.add(parent); const node = branches.find(x => x.id === parent); if (!node || node.mode !== b.mode) throw Error("业务分支父级无效"); parent = node.parentId; }
    const children = branches.filter(x => x.parentId === b.id && x.mode === "channel");
    if (children.length && (b.targetGmv === null || children.some(x => x.targetGmv === null) || !near(children.reduce((n, x) => n + fixed(x.targetGmv), 0n), fixed(b.targetGmv)))) throw Error("子渠道GMV须汇总为上级渠道目标");
  }
  const roots = branches.filter(b => b.mode === "channel" && !b.parentId);
  if (!roots.length || roots.some(b => b.targetGmv === null) || !near(roots.reduce((n, b) => n + fixed(b.targetGmv), 0n), fixed(selected.gmv))) throw Error("各独立渠道的GMV必须汇总到总目标，支撑指标不能重复计入");
  const initiatives = list(v.initiatives, 50).map(i => {
    fields(i, COMMERCE_OPERATING_MAP_SCHEMA.properties.initiatives.items);
    if (!branches.some(b => b.id === i.branchId) || !actions.some(a => a.key === i.actionKey) || !["ai_content", "merchant_operation", "data_query", "analysis"].includes(i.executionMode) || !["main", "detail", "video", ""].includes(i.creativeTab)) throw Error("策略须承接本分支、本行动与合法执行入口");
    for (const key of ["startDate", "endDate"]) if (!/^\d{4}-\d{2}-\d{2}$/.test(i[key]) || !Number.isFinite(Date.parse(i[key])) || new Date(i[key]).toISOString().slice(0, 10) !== i[key]) throw Error("策略日期无效");
    if (i.startDate > i.endDate || i.startDate < scorecard.start || i.endDate > scorecard.end) throw Error("策略时间应落在经营目标周期内");
    const out: any = {};
    for (const key of Object.keys(i)) {
      if (key === "operation") out[key] = normalizeCommerceOperationSpec(i[key]);
      else if (key === "group") { if (!COMMERCE_STRATEGY_GROUPS.some(g => g.key === i[key])) throw Error("策略分类无效"); out[key] = i[key]; }
      else if (key === "variants") { out[key] = list(i[key], 4).map(v => { fields(v, PLANNING_VARIANT_SCHEMA); if (!scenarios.some(s => s.key === v.scenarioKey)) throw Error("费用档位须对应目标情景"); return { scenarioKey: text(v.scenarioKey), budget: amount(v.budget), calculation: text(v.calculation), settings: text(v.settings), expected: text(v.expected), steps: list(v.steps, 12).map(x => text(x)), stopRule: text(v.stopRule) }; }); if (new Set(out[key].map((x: any) => x.scenarioKey)).size !== out[key].length || out[key].some((x: any) => !x.steps.length)) throw Error("费用档位重复或没有执行步骤"); }
      else out[key] = text(i[key], ["productId", "projectId", "creativeTab"].includes(key));
    }
    return out;
  });
  if (!initiatives.length || new Set(initiatives.map(i => i.id)).size !== initiatives.length) throw Error("经营策略不能为空或重名");
  for (const s of scenarios.filter(s => s.investment)) {
    if (initiatives.some(i => !i.variants?.some((v: any) => v.scenarioKey === s.key))) throw Error("每条策略须有各档费用和执行设置");
    if (!near(initiatives.reduce((n, i) => n + fixed(i.variants.find((v: any) => v.scenarioKey === s.key).budget), 0n), fixed(s.investment.cash))) throw Error("各动作费用须加总为该档现金预算，不重复计费");
  }
  const sequence = v.sequence ? list(v.sequence, 8).map(s => { fields(s, COMMERCE_OPERATING_MAP_SCHEMA.properties.sequence.items); return { title: text(s.title), outcome: text(s.outcome), exitCondition: text(s.exitCondition) }; }) : undefined;
  return { diagnosis: text(v.diagnosis), targetBasis: text(v.targetBasis), attributionRule: text(v.attributionRule), selectedScenario: selected.key, scenarios, branches, initiatives, ...(sequence ? { sequence } : {}) };
}
