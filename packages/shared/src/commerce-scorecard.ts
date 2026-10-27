import { METRIC_MONITORING_SCHEMA, normalizeMetricMonitoring, metricMonitoringWindows, type MetricMonitoring } from "./commerce-monitoring";
// A versioned operating scorecard; snapshots remain the immutable source facts.
const str = { type: "string" };
const obj = (properties: any, required = Object.keys(properties)) => ({ type: "object", additionalProperties: false, properties, required });
const arr = (items: any, maxItems: number) => ({ type: "array", items, maxItems });
const derived = obj({ numeratorKey: str, denominatorKey: str, numeratorDefinition: str, denominatorDefinition: str, numeratorUnit: str, denominatorUnit: str });
const metricProperties = { id: str, stage: str, metricKey: str, label: str, unit: str, definition: str, target: { type: ["string", "null"] }, direction: { enum: ["increase", "decrease"] }, rationale: str, actionKeys: arr(str, 50), onMiss: str, derived, monitoring: METRIC_MONITORING_SCHEMA };
const metric = obj(metricProperties, Object.keys(metricProperties).filter(k => !["derived", "monitoring"].includes(k)));
export const COMMERCE_SCORECARD_SCHEMA = obj({
  baselineSnapshotId: str, start: str, end: str, approval: { enum: ["proposed", "confirmed"] },
  goal: metric, drivers: arr(metric, 36),
  tactics: arr(obj({ actionKey: str, driverIds: arr(str, 36), method: str, resources: str, costLimit: str, startDate: str, endDate: str, dependencies: str, deliverable: str }), 50),
  checkpoints: arr(obj({ start: str, end: str, targets: arr(obj({ metricId: str, target: str }), 37) }), 40),
  cadence: { enum: ["daily", "weekly"] }, dueLagDays: { type: "integer", minimum: 0, maximum: 30 },
});
export type CommerceScorecard = { baselineSnapshotId: string; start: string; end: string; approval: "proposed" | "confirmed"; goal: ScoreMetric; drivers: ScoreMetric[]; tactics: { actionKey: string; driverIds: string[]; method: string; resources: string; costLimit: string; startDate: string; endDate: string; dependencies: string; deliverable: string }[]; checkpoints: { start: string; end: string; targets: { metricId: string; target: string }[] }[]; cadence: "daily" | "weekly"; dueLagDays: number };
export type ScoreMetric = { id: string; stage: string; metricKey: string; label: string; unit: string; definition: string; target: string | null; direction: "increase" | "decrease"; rationale: string; actionKeys: string[]; onMiss: string; monitoring?: MetricMonitoring; derived?: { numeratorKey: string; denominatorKey: string; numeratorDefinition: string; denominatorDefinition: string; numeratorUnit: string; denominatorUnit: string } };
const decimal = /^\d{1,18}(\.\d{1,8})?$/;
const signedDecimal = /^-?\d{1,18}(\.\d{1,8})?$/;
function fields(v: any, schema: any) { if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).some(k => !Object.prototype.hasOwnProperty.call(schema.properties, k)) || schema.required.some((k: string) => !(k in v))) throw Error("经营目标字段不完整或包含未知字段"); }
function text(v: any) { if (typeof v !== "string" || !v.trim() || v.length > 6000) throw Error("请填写具体经营说明（最多6000字）"); return v.trim(); }
function list(v: any, max: number) { if (!Array.isArray(v) || v.length > max) throw Error("经营目标列表数量不合法"); return v; }
function date(v: any) { if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v) throw Error("经营日期不合法"); return v; }
function target(v: any) { if (v !== null && (typeof v !== "string" || !decimal.test(v))) throw Error("目标必须是非负十进制字符串或null"); return v; }
export function normalizeCommerceScorecard(v: any, actions: any[], stages: string[]): CommerceScorecard {
  fields(v, COMMERCE_SCORECARD_SCHEMA);
  const keys = actions.map(a => a.key).filter(Boolean);
  if (keys.length !== actions.length || new Set(keys).size !== keys.length) throw Error("跟踪计划每个行动需要唯一稳定标识");
  const read = (m: any): ScoreMetric => {
    fields(m, metric);
    if (!stages.includes(m.stage) || !["increase", "decrease"].includes(m.direction)) throw Error("指标阶段或方向无效");
    const actionKeys = list(m.actionKeys, 50).map(text);
    if (!actionKeys.length || actionKeys.some(k => !keys.includes(k)) || new Set(actionKeys).size !== actionKeys.length) throw Error("每个指标须关联本计划中的具体行动");
    if (m.derived) { fields(m.derived, derived); Object.values(m.derived).forEach(text); }
    return { ...m, id: text(m.id), metricKey: text(m.metricKey), label: text(m.label), unit: text(m.unit), definition: text(m.definition), target: target(m.target), rationale: text(m.rationale), onMiss: text(m.onMiss), actionKeys };
  };
  const goal = read(v.goal), drivers = list(v.drivers, 36).map(read), metrics = [goal, ...drivers];
  if (goal.unit !== "元" || goal.derived) throw Error("财务目标须为原报表人民币金额指标，不能用未经核实的比率替代");
  if (goal.id !== "goal" || !drivers.length || new Set(metrics.map(m => m.id)).size !== metrics.length) throw Error("财务目标标识须为goal，驱动指标不能为空或重复");
  if (!["proposed", "confirmed"].includes(v.approval) || !["daily", "weekly"].includes(v.cadence) || !Number.isInteger(v.dueLagDays) || v.dueLagDays < 0 || v.dueLagDays > 30) throw Error("跟踪状态或节奏无效");
  const start = date(v.start), end = date(v.end);
  if (start > end || Date.parse(end) - Date.parse(start) > 366 * 86400000) throw Error("目标周期须为一年内完整区间");
  for (const m of metrics) if (m.monitoring) m.monitoring = normalizeMetricMonitoring(m.monitoring, start, end);
  if (v.approval === "confirmed" && goal.target === null) throw Error("确认财务目标前请填写数值");
  const tactics = list(v.tactics, 50).map(t => {
    fields(t, COMMERCE_SCORECARD_SCHEMA.properties.tactics.items);
    const driverIds = list(t.driverIds, 36).map(text);
    if (!keys.includes(t.actionKey) || !driverIds.length || driverIds.some(id => !metrics.some(m => m.id === id && m.actionKeys.includes(t.actionKey)))) throw Error("策略必须承接本行动对应的战略指标");
    const startDate = date(t.startDate), endDate = date(t.endDate);
    if (startDate > endDate || startDate < start || endDate > end) throw Error("策略排期须落在目标周期内");
    return { actionKey: t.actionKey, driverIds, method: text(t.method), resources: text(t.resources), costLimit: text(t.costLimit), startDate, endDate, dependencies: text(t.dependencies), deliverable: text(t.deliverable) };
  });
  if (new Set(tactics.map(t => t.actionKey)).size !== tactics.length || keys.some(k => !tactics.some(t => t.actionKey === k))) throw Error("所有行动都要有唯一的资源与排期安排");
  const checkpoints = list(v.checkpoints, 40).map(c => {
    fields(c, COMMERCE_SCORECARD_SCHEMA.properties.checkpoints.items);
    const a = date(c.start), b = date(c.end);
    if (a > b || a < start || b > end) throw Error("检查窗口须在目标周期内");
    const targets = list(c.targets, 37).map(t => { fields(t, COMMERCE_SCORECARD_SCHEMA.properties.checkpoints.items.properties.targets.items); if (!metrics.some(m => m.id === t.metricId) || target(t.target) === null) throw Error("检查点指标或目标无效"); return { metricId: t.metricId, target: t.target }; });
    if (!targets.length || new Set(targets.map(t => t.metricId)).size !== targets.length) throw Error("检查点目标不能为空或重复");
    return { start: a, end: b, targets };
  }).sort((a, b) => a.start.localeCompare(b.start));
  if (checkpoints.some((c, i) => i && checkpoints[i - 1].end >= c.start)) throw Error("检查窗口不能重叠，不能重复累计同一数据");
  const normalized = { ...v, baselineSnapshotId: text(v.baselineSnapshotId), start, end, goal, drivers, tactics, checkpoints };
  if (v.approval === "confirmed" && commerceScorecardMath(normalized)?.consistent === false) throw Error("订单与每单金额目标测算不等于财务目标，请先调整再确认");
  return normalized;
}
const SCALE = 100000000n;
function fixed(v: string) { const sign = v.startsWith("-") ? -1n : 1n, [w, f = ""] = v.replace(/^-/, "").split("."); return BigInt(w + f.padEnd(8, "0")) * sign; }
function fmt(v: bigint) { const s = v < 0n ? "-" : "", a = (v < 0n ? -v : v).toString().padStart(9, "0"), f = a.slice(-8).replace(/0+$/, ""); return s + a.slice(0, -8) + (f ? "." + f : ""); }
export function scoreMetricValue(snapshot: any, m: ScoreMetric): string | null {
  const metrics = snapshot?.sections?.find((s: any) => s.key === m.stage)?.metrics || [];
  const read = (key: string, definition: string, unit?: string) => {
    const x = metrics.find((p: any) => p.key === key);
    return x && x.definition === definition && (!unit || unit === x.unit) && typeof x.value === "string" && signedDecimal.test(x.value) ? x.value : null;
  };
  if (!m.derived) return read(m.metricKey, m.definition, m.unit);
  const n = read(m.derived.numeratorKey, m.derived.numeratorDefinition, m.derived.numeratorUnit), d = read(m.derived.denominatorKey, m.derived.denominatorDefinition, m.derived.denominatorUnit);
  return n !== null && d !== null && fixed(d) > 0n ? fmt(fixed(n) * SCALE / fixed(d)) : null;
}
export function commerceScorecardMath(c: CommerceScorecard) {
  const average = c.drivers.find(m => m.derived?.numeratorKey === c.goal.metricKey && m.derived.numeratorDefinition === c.goal.definition && m.stage === c.goal.stage && m.derived.numeratorUnit === c.goal.unit);
  const count = average && c.drivers.find(m => m.metricKey === average.derived?.denominatorKey && m.definition === average.derived?.denominatorDefinition && m.unit === average.derived?.denominatorUnit && m.stage === average.stage && !m.derived);
  if (!average || !count) return null;
  const implied = average.target !== null && count.target !== null ? fmt(fixed(average.target) * fixed(count.target) / SCALE) : null;
  const gap = implied !== null && c.goal.target !== null ? fixed(implied) - fixed(c.goal.target) : null;
  return { averageId: average.id, countId: count.id, implied, delta: gap === null ? null : fmt(gap), consistent: gap === null ? null : (gap < 0n ? -gap : gap) <= 1000000n };
}
export function commerceScorecardReview(plan: any, snapshots: any[], today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })) {
  const c: CommerceScorecard | undefined = plan?.scorecard;
  if (!c) return null;
  const baseline = snapshots.find(s => s.id === c.baselineSnapshotId && s.shopId === plan.shopId);
  const metrics = [c.goal, ...c.drivers];
  const windows: any[] = [{ start: c.start, end: c.end, targets: metrics.filter(m => m.target !== null).map(m => ({ metricId: m.id, target: m.target! })), final: true }, ...c.checkpoints.map(w => ({ ...w, metricIds: metrics.filter(m => !m.monitoring).map(m => m.id), final: false }))];
  for (const m of metrics) if (m.monitoring) for (const w of metricMonitoringWindows(c.start, c.end, m.monitoring)) windows.push({ ...w, targets: [{ metricId: m.id, target: w.target }], metricIds: [m.id], cadence: m.monitoring.cadence, dueLagDays: m.monitoring.dueLagDays, final: false });
  const checks = windows.filter(w => !w.metricIds || w.metricIds.length).map(w => {
    const samePeriod = snapshots.filter(s => s.shopId === plan.shopId && s.period?.start === w.start && s.period?.end === w.end).sort((a, b) => String(b.capturedAt || b.createdAt || "").localeCompare(String(a.capturedAt || a.createdAt || "")));
    // Latest receipt is authoritative, even if a correction makes it unverified.
    const snapshot = samePeriod[0];
    const due = Date.parse(today) > Date.parse(w.end) + (w.dueLagDays ?? c.dueLagDays) * 86400000;
    return { ...w, snapshotId: snapshot?.id || null, sourceStatus: snapshot?.sourceStatus || null, rows: metrics.filter(m => !w.metricIds || w.metricIds.includes(m.id)).map(m => {
      const desired = w.targets.find((t: any) => t.metricId === m.id)?.target ?? null;
      let reason = "";
      const unavailable = !snapshot && desired === null && scoreMetricValue(baseline,m) === null;
      if (unavailable) reason = `现有连接器报表未提供${m.label}历史，按关联操作单先在商家后台记录；当前没有量化目标`;
      else if (!snapshot) reason = today < w.start ? `此窗口${w.start}才开始，当前先完成关联策略中的准备工作` : today <= w.end ? `本窗口进行中（${w.start}—${w.end}），结束后核最终值；现在查看历史与已入库日数据` : due ? `窗口${w.end}已结束，尚未同步本店这一周期报表` : `窗口已结束，按本指标设置等待${w.dueLagDays ?? c.dueLagDays}天后复核`;
      else if (!baseline || baseline.toolName !== snapshot.toolName || baseline.currency !== snapshot.currency || baseline.period?.timezone !== snapshot.period?.timezone || baseline.sourceStatus !== snapshot.sourceStatus || snapshot.sourceStatus === "unverified") reason = "来源、币种或统计范围待核验";
      else if (w.end >= today) reason = "统计窗口尚未完整结束";
      const actual = reason ? null : scoreMetricValue(snapshot, m), base = scoreMetricValue(baseline, m);
      if (!reason && actual === null) reason = "指标缺失或定义/单位变化，请先核对原报表";
      const delta = desired !== null && actual !== null ? fmt(fixed(actual) - fixed(desired)) : null;
      const met = delta !== null ? (m.direction === "increase" ? fixed(actual!) >= fixed(desired!) : fixed(actual!) <= fixed(desired!)) : null;
      const status = reason ? (unavailable ? "field_missing" : today < w.start ? "not_started" : today <= w.end ? "in_progress" : !snapshot ? (due ? "sync_overdue" : "settling") : snapshot.sourceStatus === "unverified" ? "unverified" : "field_missing") : desired === null ? "needs_target" : c.approval === "proposed" ? "proposed" : met ? "met" : "missed";
      const suggestion = reason ? (unavailable ? m.onMiss : today < w.start || today <= w.end ? m.onMiss : !snapshot ? `请运营同步${w.start}—${w.end}的${m.label}报表；历史实绩仍可在下方对照。` : `请核对${m.label}的定义与单位；当前回执不能计算该指标，其他有数据的工作继续。`) : desired === null ? "补充有基线、资源和时间依据的指标目标。" : met ? "保持当前措施，继续核退款、贡献和后续周期，尚不能据此证明因果。" : m.onMiss;
      return { metricId: m.id, label: m.label, unit: m.unit, definition: m.definition, target: desired, actual, baseline: base, delta, met, status, reason, suggestion, actionKeys: m.actionKeys };
    }) };
  });
  return { planRevision: plan.revision, checkedAt: new Date().toISOString(), mode: "stored_snapshots", cadence: c.cadence, checks, baselinePeriod: baseline?.period || null, note: "自动核对新入库快照；第三方报表仍由已授权连接器采集回写。不把报表变化单独归因于行动。" };
}
