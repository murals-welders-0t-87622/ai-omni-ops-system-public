"use client";
import { useState, type ReactNode } from "react";
import CommerceReport from "./report";
import GoalReplan from "./goal-replan";
import CommerceDashboard from "./commerce-dashboard";
import OperatingMapPanel from "./operating-map-panel";
import ScorecardPanel from "./scorecard-panel";
import { scorecardDraft } from "./scorecard-model";
import {
  COMMERCE_OPERATION_VIEWS, commercePlanActions, commerceLegacyDirection,
  commercePlanMilestones, commerceExecutionRows, commerceExecutionSummary, commerceStructuredGrowth, type CommerceOperationView,
} from "./operations-view-model";
import { COMMERCE_STAGES } from "../../../../../../packages/shared/src/commerce";

const box = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const actionButton = "rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50";
const decisions: Record<string, string> = { observe: "继续观察", continue: "保留并验证", adjust: "调整再测", stop: "停止此方案" };
const states: Record<string, string> = { proposed: "待开展", in_progress: "进行中", review: "待复盘", closed: "计划已关闭" };
const prepareLabels: Record<CommerceOperationView, string> = {
  strategy: "复制战略分析委托", tactics: "复制策略细化委托", execution: "复制执行复盘委托", overview: "复制数据更新委托",
};

function FullReport({ plan }: { plan: any }) {
  return plan?.report ? <details className="mt-5 rounded-xl border border-slate-200 p-4">
    <summary className="cursor-pointer text-sm text-indigo-600">阅读完整运营方案</summary>
    {plan.scorecard && <section className="mt-5 space-y-4 text-sm leading-7">
      <h3 className="text-lg font-semibold">当前经营目标与资源安排 · V{plan.revision}</h3>
      <p>{plan.scorecard.start}—{plan.scorecard.end} · {plan.scorecard.approval === "confirmed" ? "确认目标" : "拟议目标"}。{plan.scorecard.goal.rationale}</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[480px] text-left"><thead className="bg-indigo-50"><tr>{["指标", "目标", "支撑动作"].map(t => <th key={t} className="p-3">{t}</th>)}</tr></thead><tbody>{[plan.scorecard.goal, ...plan.scorecard.drivers].map((m: any) => <tr key={m.id} className="border-t border-slate-100"><td className="p-3">{m.label}</td><td className="p-3">{m.target ?? "待定"} {m.unit}</td><td className="p-3">{commercePlanActions(plan).filter(a => m.actionKeys.includes(a.key)).map(a => a.title).join("；")}</td></tr>)}</tbody></table></div>
      {plan.scorecard.tactics.map((t: any) => <div key={t.actionKey} className="rounded-xl bg-slate-50 p-4"><h4 className="font-semibold">{commercePlanActions(plan).find(a => a.key === t.actionKey)?.title}</h4><p>{t.startDate}—{t.endDate}</p><p>做法：{t.method}</p><p>资源：{t.resources}</p><p>费用边界：{t.costLimit}</p><p>前置条件：{t.dependencies}</p><p>交付：{t.deliverable}</p></div>)}
      <h3 className="border-t border-slate-200 pt-5 text-lg font-semibold">原方案分析与依据（保留原文）</h3>
      <p className="text-xs text-slate-500">以下保留原分析文本；调整后的数值目标与资源排期见上方当前版本。</p>
    </section>}
    <div className="mt-4"><CommerceReport report={plan.report} /></div>
  </details> : null;
}

function Strategy({ plan, onNext }: { plan: any; onNext: () => void }) {
  const growth = commerceStructuredGrowth(plan), direction = commerceLegacyDirection(plan);
  return <section className={box}>
    <p className="text-xs text-indigo-600">{growth ? "方案中的经营阶段" : "已有方案的经营方向"}</p>
    <h2 className="mt-2 text-xl font-semibold">{growth?.phase || direction?.title || "已保存的运营方案"}</h2>
    {growth ? <>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{growth.businessModel}</p>
      <h3 className="mt-5 font-semibold">这一阶段先完成什么</h3>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{growth.direction}</p>
      <ol className="mt-5 grid gap-3 lg:grid-cols-3">{growth.sequence.map((s: any, i: number) => <li key={i} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
        <p className="text-xs text-indigo-600">第 {i + 1} 步</p><h3 className="mt-2 font-semibold">{s.title}</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{s.outcome}</p>
        <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-500">进入下一步的条件：{s.exitCondition}</p>
      </li>)}</ol>
    </> : <>
      {direction?.body && <div className="mt-4"><CommerceReport report={direction.body} /></div>}
      {!!commercePlanActions(plan).length && <>
        <h3 className="mt-6 font-semibold">按现有计划，先完成这些工作</h3>
        <p className="mt-2 text-xs leading-6 text-slate-500">按方案中的拟定期限排列；具体做法和验收标准在“策略”中查看。</p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">{commercePlanMilestones(plan).map((m, i) => <li key={m.dueDate || "unscheduled"} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
          <p className="text-xs text-indigo-600">第 {i + 1} 组 · {m.dueDate ? `拟定截至 ${m.dueDate}` : "尚待排期"}</p>
          <ul className="mt-3 space-y-2">{m.actions.map((a: any, n: number) => <li key={n} className="text-sm leading-6">{a.title}</li>)}</ul>
        </li>)}</ol>
      </>}
      {!direction && <p className="mt-3 text-sm text-slate-500">这份方案尚未保存经营判断，请结合已有动作与店铺数据补充。</p>}
    </>}
    <FullReport plan={plan} />
    <button className={actionButton + " mt-5"} onClick={onNext}>查看具体策略与动作（{commercePlanActions(plan).length}项） →</button>
  </section>;
}

function Tactics({ plan, onData, onExecution }: { plan: any; onData: (stage: string) => void; onExecution: () => void }) {
  const growth = commerceStructuredGrowth(plan), actions = commercePlanActions(plan);
  return <section className={box}>
    <h2 className="font-semibold">为达成战略，各环节具体做什么</h2>
    <p className="mt-2 text-sm leading-7 text-slate-500">每项工作列出做法、负责人、拟定期限和验收标准；执行情况到“执行”查看，判断依据到对应业务数据查看。</p>
    {!!growth?.objectives?.length && <div className="mt-4 grid gap-3 md:grid-cols-2">{growth.objectives.map((o: any) => <article key={o.stage + o.metricKey} className="rounded-xl bg-indigo-50 p-4">
      <h3 className="font-semibold">{o.label}：{o.direction === "increase" ? "提高至" : "降低至"} {o.target} {o.unit}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">目标依据：{o.rationale}</p>
    </article>)}</div>}
    <div className="mt-5 space-y-5">{COMMERCE_STAGES.filter(s => actions.some(a => a.stage === s.key)).map(s => <div key={s.key}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{s.label} · {actions.filter(a => a.stage === s.key).length}项</h3><button className="text-xs text-indigo-600" onClick={() => onData(s.key)}>查看这一环节的数据依据 →</button></div>
      <div className="space-y-3">{actions.filter(a => a.stage === s.key).map((a, i) => {
        const experiments: any[] = growth?.experiments?.filter((e: any) => a.key && e.actionKey === a.key) || [];
        return <article key={a.key || i} className="rounded-xl border border-slate-200 p-4">
          <h4 className="font-semibold">{a.title}</h4>
          {experiments.map((e, n) => <div key={n} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-7"><p className="whitespace-pre-wrap">为什么做：{e.hypothesis}</p><p className="whitespace-pre-wrap">具体改动：{e.change}</p></div>)}
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{a.body}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs leading-6 text-slate-500"><span>负责人：{a.owner || "待安排"}</span><span>拟定期限：{a.dueDate || "待排期"}</span><span>计划状态：{states[a.status] || "待核验"}</span></div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7"><b>怎样算完成：</b>{a.successMetric || "待补充验收标准"}</p>
          {experiments.some(e => e.projectId) && <a href="/tabs/ecommerce/detail" className="mt-3 inline-block text-sm text-indigo-600">查看关联的商品内容工作区 →</a>}
        </article>;
      })}</div>
    </div>)}</div>
    {!actions.length && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">这份方案还没有具体行动。下一步把战略拆成商品、内容、流量、会员或服务动作，明确负责人、期限和验收标准。</p>}
    <button className={actionButton + " mt-5"} onClick={onExecution}>查看执行与结果 →</button>
  </section>;
}

function Execution({ plan }: { plan: any }) {
  const rows = commerceExecutionRows(plan), summary = commerceExecutionSummary(plan);
  return <section className={box}>
    <h2 className="font-semibold">实际做了什么，目标有没有达到</h2>
    <div className="mt-4 grid grid-cols-3 gap-3">{[["计划行动", summary.planned], ["有执行回执", summary.withEvidence], ["有可比结果", summary.withComparableResult]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs leading-6 text-slate-500">{label}</p><b className="mt-1 block text-2xl">{value}</b></div>)}</div>
    {!!rows.length && !summary.withEvidence && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">已有{summary.planned}项计划，但尚未保存实际执行回执；目前无法判断这些动作是否产生效果。</p>}
    <div className="mt-5 space-y-4">{rows.map(({ action: a, rowKey, experiments }) => <article key={rowKey} className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">{a.title}</h3><span className="text-xs text-slate-500">计划状态：{states[a.status] || "待核验"}</span></div>
      <p className="mt-2 text-xs leading-6 text-slate-500">负责人：{a.owner || "待安排"} · 拟定期限：{a.dueDate || "待排期"}</p>
      <details className="mt-3 rounded-xl bg-indigo-50/50 p-4"><summary className="cursor-pointer text-sm font-medium text-indigo-700">具体怎么做（展开操作单）</summary><div className="mt-3"><CommerceReport report={a.body || a.successMetric} /></div></details><p className="mt-3 whitespace-pre-wrap text-sm leading-7">计划完成标准：{a.successMetric || "待补充"}</p>
      {!experiments.length && <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600"><p>实际执行：尚无执行回执</p><p>目标与实际：尚无对应的结果对照，暂不能判断</p></div>}
      {experiments.map(({ experiment: e, review: r }, i) => <div key={i} className="mt-4">
        <p className="whitespace-pre-wrap text-sm leading-7">执行：{e.executionEvidence ? `${e.executedOn} · ${e.executionEvidence}` : "尚无实际执行回执"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-4 text-sm">{[["改动前", r?.before], ["改动后", r?.after], ["目标", r?.target]].map(([label, value]) => <div key={label}><p className="text-xs text-slate-500">{label}</p><b className="mt-2 block break-all">{value ?? "待取数"} {r?.unit}</b></div>)}</div>
        <p className="mt-3 text-sm text-indigo-700">{r?.comparable ? `变化 ${r.delta} ${r.unit} · ${r.targetMet === null ? "目标口径待核" : r.targetMet ? "达到拟议目标" : "尚未达到目标"}` : r?.reason || "等待核验"}</p>
        {r?.sourceStatus === "test_data" && <p className="mt-2 text-sm text-amber-700">测试数据，不代表品牌经营结果</p>}
        <p className="mt-2 text-xs leading-6 text-slate-500">{r?.conclusion}</p>
        <details className="mt-3 text-xs text-slate-500"><summary>复测口径与干扰因素</summary><p className="mt-2 whitespace-pre-wrap leading-6">{e.comparability}</p></details>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7">下一步：{decisions[e.decision]}。{e.review}</p>
      </div>)}
    </article>)}</div>
    {!rows.length && <p className="mt-4 text-sm leading-7 text-slate-500">还没有执行任务。先在“策略”明确要做的动作，实际开展后记录回执，再收集结果进行复盘。</p>}
  </section>;
}

function Metrics({ plan, snapshot, snapshots }: { plan: any; snapshot: any; snapshots: any[] }) {
  const metrics = (snapshot?.sections || []).flatMap((s: any) => (s.metrics || []).map((m: any) => ({ ...m, stage: s.key })));
  const focus = plan?.growth?.objectives?.length ? plan.growth.objectives.map((o: any) => ({ ...metrics.find((m: any) => m.key === o.metricKey && m.stage === o.stage), ...o })) : metrics.slice(0, 8);
  return <section className={box}>
    <h2 className="font-semibold">经营指标与历史对照</h2>
    <p className="mt-2 text-xs leading-6 text-slate-500">{snapshot ? `${snapshot.period.start} — ${snapshot.period.end} · ${snapshot.currency} · ${snapshot.sourceStatus === "provider_reported" ? "连接器上报" : snapshot.sourceStatus === "test_data" ? "测试数据" : "待核验"}` : "尚无店铺快照"}。图表展示已保存数据；每张图只比较同范围、同定义、同单位且等长不重叠的周期。</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{focus.map((m: any) => {
      const span = (s: any) => Date.parse(s.period?.end) - Date.parse(s.period?.start);
      let lastStart = "9999";
      const points = [...snapshots].sort((a: any, b: any) => String(b.period?.end).localeCompare(String(a.period?.end))).filter((s: any) => {
        const v = s.sections?.find((x: any) => x.key === m.stage)?.metrics?.find((x: any) => x.key === (m.metricKey || m.key));
        if (!snapshot || !v || v.value === null || !Number.isFinite(Number(v.value)) || v.unit !== m.unit || v.definition !== m.definition || s.currency !== snapshot.currency || s.sourceStatus !== snapshot.sourceStatus || span(s) !== span(snapshot) || s.period?.end > snapshot.period.end || s.period?.end >= lastStart) return false;
        lastStart = s.period.start; return true;
      }).slice(0, 6).reverse();
      const values = points.map((s: any) => s.sections.find((x: any) => x.key === m.stage).metrics.find((x: any) => x.key === (m.metricKey || m.key)));
      const scale = Math.max(1, ...values.map((v: any) => Math.abs(Number(v.value))));
      return <article key={m.stage + (m.metricKey || m.key)} className="min-w-0 rounded-xl border border-slate-200 p-4"><h3 className="text-sm text-slate-500">{m.label}</h3><p className="mt-2 break-all text-2xl font-semibold">{m.value ?? "待取数"}<small className="ml-1 text-xs font-normal">{m.unit}</small></p>{m.target !== undefined && <p className="mt-2 text-xs text-indigo-600">方案拟议目标 {m.target} {m.unit}</p>}<div className="mt-4 space-y-3">{points.map((s: any, i: number) => <div key={s.id}><div className="flex justify-between gap-2 text-[11px] text-slate-500"><span>{s.period.start}—{s.period.end}</span><span>{values[i].value}</span></div><div className="mt-1 h-2 rounded bg-slate-100"><div className={(Number(values[i].value) < 0 ? "bg-rose-400" : "bg-indigo-400") + " h-2 rounded"} style={{ width: `${Math.abs(Number(values[i].value)) / scale * 100}%` }} /></div></div>)}</div>{points.length < 2 && <p className="mt-3 text-xs text-slate-400">待补同口径历史周期</p>}<p className="mt-3 text-xs leading-6 text-slate-500">{m.definition}</p></article>;
    })}</div>
    {!focus.length && <p className="mt-4 text-sm text-slate-500">尚未保存经营指标。读取店铺数据后，按实际可用范围展示流量、转化、客单和复购等数据。</p>}
  </section>;
}

export default function CommerceGrowthPanel({ plan, snapshot, snapshots, view, onViewChange, onData, onPrepare, onSaveScorecard, onRefresh, busy, children, executor, tasks, onReplan }: {
  executor?: any; tasks?: any[]; onReplan?: (target: any) => Promise<void>; plan: any; snapshot: any; snapshots: any[]; view: CommerceOperationView;
  onViewChange: (view: CommerceOperationView) => void; onData: (stage: string) => void;
  onPrepare: (view: CommerceOperationView) => void; onSaveScorecard: (scorecard: any, actions: any[]) => Promise<void>; onRefresh: () => Promise<void>; busy?: boolean; children?: ReactNode;
}) {
  const [strategyGroup, setStrategyGroup] = useState("traffic");
  return <div className="space-y-4">
    <div role="tablist" aria-label="电商增长层级" className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
      {COMMERCE_OPERATION_VIEWS.map(({ key, label }) => <button key={key} id={`commerce-tab-${key}`} role="tab" aria-selected={view === key} aria-controls={`commerce-panel-${key}`} onClick={() => onViewChange(key)} className={"rounded-lg px-4 py-2 text-sm " + (view === key ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50")}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`commerce-panel-${view}`} aria-labelledby={`commerce-tab-${view}`} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">{view === "strategy" ? "看方向与先后顺序" : view === "tactics" ? "看具体工作和完成标准" : view === "execution" ? "看计划是否落实及实际效果" : "看经营变化与判断依据"}</p><button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-indigo-600 disabled:opacity-50" disabled={busy} onClick={() => onPrepare(view)}>{prepareLabels[view]}</button></div>
      {view === "strategy" && plan?.operatingMap && <GoalReplan key={plan.id + ":" + plan.revision} plan={plan} snapshots={snapshots} executor={executor} tasks={tasks} onRequest={onReplan} busy={busy} />}
      {view !== "execution" && <OperatingMapPanel plan={plan} view={view} onViewChange={onViewChange} snapshots={snapshots} strategyGroup={strategyGroup} onGroup={setStrategyGroup} />}
      {plan && view !== "overview" && (plan.operatingMap && view !== "execution" ? <details className={box}><summary className="cursor-pointer text-sm text-indigo-600">查看或调整目标、数据口径及跟踪设置</summary><ScorecardPanel key={plan.id + ":" + plan.revision} plan={plan} snapshots={snapshots} view={view} onSave={onSaveScorecard} onRefresh={onRefresh} onViewChange={onViewChange} busy={busy} /></details> : <ScorecardPanel key={plan.id + ":" + plan.revision} plan={plan} snapshots={snapshots} view={view} onSave={onSaveScorecard} onRefresh={onRefresh} onViewChange={onViewChange} busy={busy} />)}
      {view === "execution" && <OperatingMapPanel plan={plan} view={view} onViewChange={onViewChange} />}
      {view === "strategy" && (plan?.operatingMap ? <FullReport plan={plan} /> : plan ? <Strategy plan={plan} onNext={() => onViewChange("tactics")} /> : <section className={box}><h2 className="font-semibold">尚未制定店铺战略</h2><p className="mt-3 text-sm leading-7 text-slate-600">{snapshot ? "已有店铺经营数据，下一步结合品牌生意模式，制定先改善哪个指标、分几步完成的经营方案。" : "先读取品牌资料和店铺经营数据，再判断这个阶段先做什么。"}</p><p className="mt-3 text-sm text-slate-500">使用上方“复制战略分析委托”，粘贴到 Codex / WorkBuddy；分析完成并保存后，这里展示具体方向与阶段安排。</p><button className="mt-4 text-sm text-indigo-600" onClick={() => onViewChange("overview")}>先看已有业务数据 →</button></section>)}
      {view === "tactics" && !scorecardDraft(plan || {}, snapshots) && (plan ? <Tactics plan={plan} onData={onData} onExecution={() => onViewChange("execution")} /> : <section className={box}><h2 className="font-semibold">还没有可执行策略</h2><p className="mt-3 text-sm leading-7 text-slate-600">先确定战略方向，再列出围绕商品、内容、流量、活动和服务的具体动作，明确负责人、期限与验收标准。</p><button className={actionButton + " mt-4"} onClick={() => onViewChange("strategy")}>返回制定战略 →</button></section>)}
      {view === "execution" && <Execution plan={plan} />}
      {view === "overview" && <><CommerceDashboard plan={plan} snapshot={snapshot} snapshots={snapshots} onTactics={() => onViewChange("tactics")} /><details className={box}><summary className="cursor-pointer font-medium text-slate-600">原始报表与数据口径</summary><div className="mt-4">{children}</div></details></>}
    </div>
  </div>;
}
