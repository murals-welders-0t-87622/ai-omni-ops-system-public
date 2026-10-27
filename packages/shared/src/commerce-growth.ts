// Ecommerce operating plans retain their existing stages. These optional fields
// connect a business direction to a specific action and an observable outcome.
export type CommerceGrowth = {
  businessModel: string; phase: string; direction: string;
  sequence: { title: string; outcome: string; exitCondition: string }[];
  objectives: { stage: string; metricKey: string; label: string; unit: string; target: string; direction: "increase" | "decrease"; rationale: string }[];
  experiments: { actionKey: string; hypothesis: string; change: string; baselineSnapshotId: string; resultSnapshotId: string; stage: string; metricKey: string; executionEvidence: string; executedOn: string; comparability: string; review: string; decision: "observe" | "continue" | "adjust" | "stop"; projectId?: string }[];
};
const str = { type: "string" };
const object = (properties: any, required = Object.keys(properties)) => ({ type: "object", additionalProperties: false, properties, required });
const array = (items: any, maxItems: number) => ({ type: "array", items, maxItems });
export const COMMERCE_GROWTH_SCHEMA = object({
  businessModel: str, phase: str, direction: str,
  sequence: array(object({ title: str, outcome: str, exitCondition: str }), 8),
  objectives: array(object({ stage: str, metricKey: str, label: str, unit: str, target: str, direction: { type: "string", enum: ["increase", "decrease"] }, rationale: str }), 12),
  experiments: array(object({ actionKey: str, hypothesis: str, change: str, baselineSnapshotId: str, resultSnapshotId: str, stage: str, metricKey: str, executionEvidence: str, executedOn: str, comparability: str, review: str, decision: { type: "string", enum: ["observe", "continue", "adjust", "stop"] }, projectId: str }, ["actionKey", "hypothesis", "change", "baselineSnapshotId", "resultSnapshotId", "stage", "metricKey", "executionEvidence", "executedOn", "comparability", "review", "decision"]), 30),
});
const decimal = /^-?\d{1,18}(\.\d{1,8})?$/;
function fields(v: any, allowed: string[]) { if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).some(k => !allowed.includes(k))) throw Error("增长内容包含无效字段"); }
function text(v: any, required = true) { if (typeof v !== "string" || v.length > 6000 || (required && !v.trim())) throw Error("增长内容请填写具体说明（最多6000字）"); return v.trim(); }
function list(v: any, max: number) { if (!Array.isArray(v) || v.length > max) throw Error("增长列表数量不合法"); return v; }
function day(v: string) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v; }
export function normalizeCommerceGrowth(v: any, actions: any[], stages: string[]): CommerceGrowth {
  fields(v, Object.keys(COMMERCE_GROWTH_SCHEMA.properties));
  const sequence = list(v.sequence, 8).map(s => { fields(s, ["title", "outcome", "exitCondition"]); return { title: text(s.title), outcome: text(s.outcome), exitCondition: text(s.exitCondition) }; });
  if (!sequence.length) throw Error("请写明先做什么、再做什么及阶段出口");
  const objectives = list(v.objectives, 12).map(o => {
    fields(o, ["stage", "metricKey", "label", "unit", "target", "direction", "rationale"]);
    if (!stages.includes(o.stage) || !["increase", "decrease"].includes(o.direction) || typeof o.target !== "string" || !decimal.test(o.target)) throw Error("目标阶段、方向或数值不合法");
    return { stage: o.stage, metricKey: text(o.metricKey), label: text(o.label), unit: text(o.unit), target: o.target, direction: o.direction, rationale: text(o.rationale) };
  });
  if (!objectives.length || new Set(objectives.map(o => o.stage + ":" + o.metricKey)).size !== objectives.length) throw Error("增长目标不能为空或重复");
  const keys = actions.map(a => a.key).filter(Boolean);
  if (new Set(keys).size !== keys.length) throw Error("行动标识不能重复");
  const experiments = list(v.experiments, 30).map(e => {
    fields(e, Object.keys(COMMERCE_GROWTH_SCHEMA.properties.experiments.items.properties));
    if (!keys.includes(e.actionKey) || !stages.includes(e.stage) || !["observe", "continue", "adjust", "stop"].includes(e.decision)) throw Error("复测必须关联本计划行动和合法阶段/决策");
    const executedOn = text(e.executedOn, false), executionEvidence = text(e.executionEvidence, false), resultSnapshotId = text(e.resultSnapshotId, false);
    if (executedOn && !day(executedOn)) throw Error("执行日期不合法");
    if ((executedOn && !executionEvidence) || (executionEvidence && !executedOn) || (resultSnapshotId && (!executedOn || !executionEvidence))) throw Error("复测结果须先记录实际执行日期与证据");
    return { actionKey: text(e.actionKey), hypothesis: text(e.hypothesis), change: text(e.change), baselineSnapshotId: text(e.baselineSnapshotId), resultSnapshotId, stage: e.stage, metricKey: text(e.metricKey), executionEvidence, executedOn, comparability: text(e.comparability), review: text(e.review, false), decision: e.decision, ...(e.projectId ? { projectId: text(e.projectId) } : {}) };
  });
  return { businessModel: text(v.businessModel), phase: text(v.phase), direction: text(v.direction), sequence, objectives, experiments };
}
// Fixed point comparison avoids rounding a 18-digit revenue into a false win.
function fixed(v: string) { const negative = v.startsWith("-"), [whole, fraction = ""] = v.replace(/^-/, "").split("."); return BigInt(whole + fraction.padEnd(8, "0")) * (negative ? -1n : 1n); }
function formatted(v: bigint) { const sign = v < 0n ? "-" : "", digits = (v < 0n ? -v : v).toString().padStart(9, "0"); return sign + digits.slice(0, -8) + (digits.slice(-8).replace(/0+$/, "") ? "." + digits.slice(-8).replace(/0+$/, "") : ""); }
export function commerceGrowthReview(growth: CommerceGrowth | undefined, snapshots: any[]) {
  return (growth?.experiments || []).map(e => {
    const before = snapshots.find(s => s.id === e.baselineSnapshotId), after = snapshots.find(s => s.id === e.resultSnapshotId);
    const metric = (s: any) => s?.sections?.find((x: any) => x.key === e.stage)?.metrics?.find((m: any) => m.key === e.metricKey);
    const b = metric(before), a = metric(after), objective = growth?.objectives.find(o => o.stage === e.stage && o.metricKey === e.metricKey);
    let reason = "";
    if (!e.executionEvidence || !e.executedOn) reason = "尚未取得实际执行回执";
    else if (!after) reason = "等待复测数据";
    else if (!before || before.shopId !== after.shopId || before.currency !== after.currency || before.sourceStatus !== after.sourceStatus || before.sourceStatus === "unverified") reason = "店铺、币种或数据来源不一致/待核验";
    else if (before.period?.timezone !== after.period?.timezone || before.period?.end >= after.period?.start || (Date.parse(before.period?.end) - Date.parse(before.period?.start)) !== (Date.parse(after.period?.end) - Date.parse(after.period?.start)) || e.executedOn <= before.period?.end || e.executedOn > after.period?.start) reason = "周期或执行时间不适合前后对照";
    else if (!b || !a || b.value === null || a.value === null || !decimal.test(b.value) || !decimal.test(a.value) || b.unit !== a.unit || b.definition !== a.definition) reason = "指标缺失或定义/单位不同";
    const comparable = !reason;
    const targetComparable = comparable && objective?.unit === a.unit;
    return { actionKey: e.actionKey, metricKey: e.metricKey, comparable, reason, before: b?.value ?? null, after: a?.value ?? null, unit: a?.unit || b?.unit || "", delta: comparable ? formatted(fixed(a.value) - fixed(b.value)) : null, target: objective?.target ?? null, targetMet: targetComparable ? (objective!.direction === "increase" ? fixed(a.value) >= fixed(objective!.target) : fixed(a.value) <= fixed(objective!.target)) : null, sourceStatus: after?.sourceStatus || before?.sourceStatus || "unverified", conclusion: comparable ? "同口径前后观察；不能单独证明动作造成增长" : reason };
  });
}
