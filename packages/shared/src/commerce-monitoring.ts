export type MetricMonitoring = { cadence: "daily" | "weekly" | "monthly" | "custom"; customDays: number; dueLagDays: number; targets: { start: string; end: string; target: string | null }[] };
const str = { type: "string" };
export const METRIC_MONITORING_SCHEMA = {
  type: "object", additionalProperties: false, required: ["cadence", "customDays", "dueLagDays", "targets"],
  properties: {
    cadence: { enum: ["daily", "weekly", "monthly", "custom"] },
    customDays: { type: "integer", minimum: 1, maximum: 366 }, dueLagDays: { type: "integer", minimum: 0, maximum: 30 },
    targets: { type: "array", maxItems: 366, items: { type: "object", additionalProperties: false, required: ["start", "end", "target"], properties: { start: str, end: str, target: { type: ["string", "null"] } } } },
  },
};
const iso = (n: number) => new Date(n).toISOString().slice(0, 10), day = 86400000;
export function metricMonitoringWindows(start: string, end: string, monitoring: MetricMonitoring) {
  const out: { start: string; end: string; target: string | null }[] = [];
  let n = Date.parse(start), stop = Date.parse(end);
  if (!Number.isFinite(n) || !Number.isFinite(stop) || n > stop || stop - n > 366 * day) return out;
  while (n <= stop && out.length <= 366) {
    const d = new Date(n);
    const next = monitoring.cadence === "monthly" ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) : n + day * (monitoring.cadence === "daily" ? 1 : monitoring.cadence === "weekly" ? 7 : monitoring.customDays);
    if (!Number.isFinite(next) || next <= n) break;
    const a = iso(n), b = iso(Math.min(stop, next - day));
    out.push({ start: a, end: b, target: monitoring.targets?.find(t => t.start === a && t.end === b)?.target ?? null });
    n = next;
  }
  return out;
}
export function normalizeMetricMonitoring(v: any, start: string, end: string): MetricMonitoring {
  const keys = ["cadence", "customDays", "dueLagDays", "targets"];
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k)) || keys.some(k => !(k in v)) || !["daily", "weekly", "monthly", "custom"].includes(v.cadence) || !Number.isInteger(v.customDays) || v.customDays < 1 || v.customDays > 366 || !Number.isInteger(v.dueLagDays) || v.dueLagDays < 0 || v.dueLagDays > 30 || !Array.isArray(v.targets) || v.targets.length > 366) throw Error("指标跟踪周期设置无效");
  const windows = metricMonitoringWindows(start, end, { ...v, targets: [] });
  const seen = new Set();
  for (const t of v.targets) {
    if (!t || typeof t !== "object" || Object.keys(t).some(k => !["start", "end", "target"].includes(k)) || !windows.some(w => w.start === t.start && w.end === t.end) || (t.target !== null && (typeof t.target !== "string" || !/^\d{1,18}(\.\d{1,8})?$/.test(t.target)))) throw Error("指标检查点必须对应当前周期的完整窗口和合法目标");
    const k = t.start + ":" + t.end; if (seen.has(k)) throw Error("同一指标跟踪窗口不能重复"); seen.add(k);
  }
  return { cadence: v.cadence, customDays: v.customDays, dueLagDays: v.dueLagDays, targets: v.targets.map((t: any) => ({ start: t.start, end: t.end, target: t.target })) };
}
