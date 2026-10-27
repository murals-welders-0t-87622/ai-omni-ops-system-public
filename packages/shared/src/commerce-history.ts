import { scoreMetricValue } from './commerce-scorecard';

const days = (s: any) => (Date.parse(s.period.end) - Date.parse(s.period.start)) / 86400000 + 1;
const decimal = (n: number) => n.toFixed(8).replace(/\.?0+$/, '');
// The newest correction wins even when it invalidates an older receipt.
export function commerceMetricHistory(plan: any, snapshots: any[], metric: any) {
  const base = snapshots.find(s => s.id === plan.scorecard?.baselineSnapshotId && s.shopId === plan.shopId);
  if (!base) return [];
  const latest = new Map<string, any>();
  for (const s of snapshots.filter(s => s.shopId === plan.shopId && s.toolName === base.toolName).sort((a,b) => String(b.capturedAt || b.createdAt || '').localeCompare(String(a.capturedAt || a.createdAt || '')))) {
    const key = `${s.period?.start}/${s.period?.end}`;
    if (!latest.has(key)) latest.set(key, s);
  }
  let previous = '9999';
  return [...latest.values()].sort((a,b) => b.period.end.localeCompare(a.period.end)).filter(s => {
    if (s.sourceStatus === 'unverified' || s.sourceStatus !== base.sourceStatus || s.toolName !== base.toolName || s.currency !== base.currency || s.period.timezone !== base.period.timezone || days(s) !== days(base) || s.period.end > base.period.end || s.period.end >= previous || scoreMetricValue(s, metric) === null) return false;
    previous = s.period.start; return true;
  }).slice(0, 8).reverse().map(s => ({ snapshotId: s.id, start: s.period.start, end: s.period.end, value: scoreMetricValue(s, metric)!, unit: metric.unit, definition: metric.definition, sourceStatus: s.sourceStatus }));
}

export function commerceHistoryScenarios(plan: any, snapshots: any[]) {
  if (!plan?.scorecard) return [];
  const card = plan.scorecard, order = card.drivers.find((m:any) => m.id === 'orders');
  if (!order) return [];
  const amounts = commerceMetricHistory(plan, snapshots, card.goal), counts = commerceMetricHistory(plan, snapshots, order);
  const rows = amounts.map(a => ({...a, orders: counts.find(c => c.snapshotId === a.snapshotId)?.value})).filter(a => a.orders && Number(a.orders) > 0);
  if (!rows.length) return [];
  const length = (Date.parse(card.end) - Date.parse(card.start)) / 86400000 + 1;
  const recent = rows.at(-1)!, prior = rows.at(-2);
  const make = (key:string, label:string, sources:typeof rows) => {
    const sourceDays = sources.reduce((n,r) => n + (Date.parse(r.end)-Date.parse(r.start))/86400000+1,0);
    const sum = sources.reduce((n,r) => n+Number(r.value),0), count = sources.reduce((n,r) => n+Number(r.orders),0);
    const gmv = (sum * length / sourceDays).toFixed(2), orders = String(Math.round(count * length / sourceDays));
    return {key,label,gmv,orders,averageOrderValue:decimal(Number(gmv)/Number(orders)),sourceIds:sources.map(r=>r.snapshotId),basis:`${sources.map(r=>`${r.start}—${r.end}：${r.value}元 / ${r.orders}单`).join('；')}。${length}天参照：金额合计${sum.toFixed(2)}÷${sourceDays}×${length}＝${gmv}元；订单按相同天数折算${orders}单；每单金额＝${gmv}÷${orders}。这是历史节奏参照，未假设优化必然带来提升。`};
  };
  return [make('recent','维持最近历史节奏',[recent]), ...(prior ? [make('average','两周平均节奏',[prior,recent]), make('restore','恢复前一周节奏',[prior])] : [])];
}

export function commerceMetricLabels(plan:any, actionKey:string) {
  return [plan.scorecard?.goal, ...(plan.scorecard?.drivers || [])].filter(m=>m?.actionKeys.includes(actionKey)).map(m=>m.label).join('、');
}

// AI numeric proposals require evidence; user headline edits remain explicit requirements.
export function assertHistoryBasedTargets(plan:any, snapshots:any[]) {
  const c=plan.scorecard, baseline=snapshots.find(s=>s.id===c.baselineSnapshotId);
  const factor=((Date.parse(c.end)-Date.parse(c.start))/86400000+1)/days(baseline);
  for(const m of c.drivers) {
    if(m.target===null || ['orders','aov'].includes(m.id)) continue;
    const rows=commerceMetricHistory(plan,snapshots,m);
    if(!rows.length) throw Error(`${m.label}没有合格历史，数值目标应为null，不能编改善比例`);
    const ratio=!!m.derived || /%|倍|秒|天|件\/单/.test(m.unit) || /平均|每单|每买家|率|单价/.test(m.label);
    const values=rows.map(r=>Number(r.value)*(ratio?1:factor));
    if(Number(m.target)<Math.min(...values)-0.01 || Number(m.target)>Math.max(...values)+0.01) throw Error(`${m.label}目标超出已观测历史范围，请交代增量实验而非写入无依据目标`);
  }
}
