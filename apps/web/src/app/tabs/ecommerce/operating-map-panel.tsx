"use client";
import StrategyTactics, { DriverGrid } from "./strategy-tactics";
const box = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const money = (v: any) => v === null || v === undefined ? "待核实" : Number(v).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
export default function OperatingMapPanel({ plan, view, onViewChange, snapshots=[], strategyGroup="traffic", onGroup }: { plan: any; view: string; onViewChange: (v: any) => void; snapshots?: any[]; strategyGroup?: string; onGroup?: (group: string) => void }) {
  const map = plan?.operatingMap;
  if (!map || view === "overview" || view === "execution") return null;
  if (view === "tactics") return <StrategyTactics key={plan.id + ":" + plan.revision} plan={plan} initialGroup={strategyGroup} />;
  const scenario = map.scenarios.find((s: any) => s.key === map.selectedScenario);
  const link = (i: any) => `/tabs/ecommerce/detail?${new URLSearchParams({ ...(i.productId ? { productId: i.productId } : {}), ...(i.projectId ? { projectId: i.projectId } : {}), studio: i.creativeTab || "main" })}`;
  return <section aria-label="GMV业务拆解" className={box + " space-y-5"}>
    <div><p className="text-xs text-indigo-600">{plan.scorecard.start}—{plan.scorecard.end} · AI测算 · {plan.scorecard.approval === "confirmed" ? "已确认目标" : "建议目标，待确认"}</p><h2 className="mt-2 text-xl font-semibold">{view === "strategy" ? "GMV从哪里来，每一块要做到多少" : view === "tactics" ? "为了达成指标，具体做这些工作" : "逐项检查工作、指标与下一步"}</h2></div>
    {view === "strategy" && <>
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{map.diagnosis}</p>

      <div className="grid gap-3 md:grid-cols-3">{map.scenarios.map((s: any) => <article key={s.key} className={"rounded-xl border p-4 " + (s.key === map.selectedScenario ? "border-indigo-300 bg-indigo-50" : "border-slate-200")}><h3 className="font-semibold">{s.label} · ¥{money(s.gmv)}</h3><p className="mt-2 text-xs leading-6 text-slate-600">{s.investment?.strategy || s.rationale}</p>{s.investment && <><p className="mt-3 text-lg font-semibold">原投放节奏对应广告费 ¥{money(s.investment.cash)}</p><p className="mt-2 text-xs leading-6 text-indigo-700">预期：{s.investment.expected}</p><p className="mt-2 text-xs leading-6 text-slate-500">广告测算依据：{s.investment.assumptions}</p></>}</article>)}</div>
      <p className="whitespace-pre-wrap text-sm leading-7">测算依据：{map.targetBasis}</p>
      {(plan.growth || map.sequence) && <div className="space-y-4">{plan.growth?.businessModel&&<p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">电商在品牌生意中的任务：{plan.growth.businessModel}</p>}<div className="grid gap-3 lg:grid-cols-3">{(map.sequence || plan.growth?.sequence || []).map((s: any, index: number) => <article key={index} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-indigo-600">第{index + 1}阶段</p><h3 className="mt-2 font-semibold">{s.title}</h3><p className="mt-3 text-sm leading-7">{s.outcome}</p><p className="mt-3 text-xs leading-6 text-slate-500">进入下一步：{s.exitCondition}</p></article>)}</div></div>}
      <div className="grid gap-4 lg:grid-cols-3">{map.branches.filter((b: any) => b.mode === "channel" && !b.parentId).map((b: any) => <article key={b.id} className="rounded-xl border border-indigo-100 p-4"><h3 className="font-semibold">{b.title}</h3><p className="mt-2 text-2xl font-semibold text-indigo-600">¥{money(b.targetGmv)}</p><div className="mt-3 h-2 overflow-hidden rounded bg-indigo-50"><div className="h-full bg-indigo-400" style={{ width: `${Number(b.targetGmv) / Number(scenario.gmv || 1) * 100}%` }} /></div><p className="mt-3 text-xs leading-6">基线GMV：{money(b.baselineGmv)}。{b.evidence}</p><p className="mt-2 text-sm leading-7">{b.rationale}</p>{map.branches.filter((x: any) => x.parentId === b.id).map((c: any) => <p key={c.id} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">{c.title}：¥{money(c.targetGmv)}</p>)}</article>)}</div>
      <p className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">{map.attributionRule}</p>
      <button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm text-white" onClick={() => onViewChange("tactics")}>查看指标对应的具体策略 →</button>
    </>}
    <DriverGrid plan={plan} snapshots={snapshots} onNext={(group: string) => { onGroup?.(group); onViewChange("tactics"); }} />
  </section>;
}
