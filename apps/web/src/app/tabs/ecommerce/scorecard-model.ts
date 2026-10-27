import { type CommerceScorecard, type ScoreMetric, scoreMetricValue } from "../../../../../../packages/shared/src/commerce-scorecard";
export function scorecardDraft(plan: any, snapshots: any[]): { scorecard: CommerceScorecard; actions: any[] } | null {
  const baseline = snapshots.find(s => s.id === (plan.scorecard?.baselineSnapshotId || plan.snapshotId));
  if (!baseline) return null;
  const actions = (plan.actions || []).map((a: any, i: number) => ({ ...a, key: a.key || `existing-action-${i + 1}` }));
  if (plan.scorecard) return { scorecard: structuredClone(plan.scorecard), actions };
  const all = baseline.sections.flatMap((s: any) => s.metrics.map((m: any) => ({ ...m, stage: s.key })));
  const pay = all.find((m: any) => m.key === "payAmt") || all.find((m: any) => /支付金额/.test(m.label) && m.unit === "元");
  if (!pay || !actions.length) return null;
  const match = (stage: string) => { const selected = actions.filter((a: any) => a.stage === stage); return (selected.length ? selected : actions.filter((a: any) => a.stage === "review" || a.stage === "diagnosis")).map((a: any) => a.key); };
  const onMiss: Record<string, string> = {
    diagnosis: "把差距拆到商品×渠道的支付订单和每单支付金额；先核完整周期及改版前后范围，再优先处理下滑最大的组合。",
    merchandising: "对照主力商品的搜索词、规格说明、价格与客服疑问，安排一个主图或详情变量的对照测试；先保持其余条件一致，再核支付与退款。",
    traffic: "按渠道与商品核有效到访、支付订单、费用及成熟归因；先调整意图或承接最差的一组，未核贡献毛利前不直接追加预算。",
    retention: "按首购月份、商品和真实补购周期分层；检查触达覆盖、优惠使用、回购支付与退订，先修改低响应的一组内容或权益。",
    service: "按商品、批次与真实退款原因排查描述误解、质量或履约，指定负责人处理并把修正回写详情和客服FAQ。",
    review: "核实际执行回执和报表成熟度，保留有效动作；只对有同口径结果的环节提出继续、调整或停止。",
  };
  const make = (m: any, id: string, stage = m.stage): ScoreMetric => ({ id, stage: m.stage, metricKey: m.key, label: m.label, unit: m.unit, definition: m.definition, target: null, direction: /退款|花费/.test(m.label) ? "decrease" : "increase", rationale: "依据当前基线，结合资源和预算再定量；尚未确认目标。", actionKeys: match(stage), onMiss: onMiss[stage] });
  const goal = { ...make(pay, "goal"), actionKeys: actions.map((a: any) => a.key), rationale: "财务结果按平台支付口径观察；不是会计收入或净利润。目标需由基线、可承载订单、预算与库存共同推演。" };
  const drivers: ScoreMetric[] = [];
  for (const [key, stage] of [["orders", "merchandising"], ["uvSum", "traffic"], ["charge", "traffic"], ["refundAmt", "service"], ["repurchase90", "retention"]]) {
    const m = all.find((x: any) => x.key === key); if (m) drivers.push(make(m, key, stage));
  }
  const orders = all.find((m: any) => m.key === "orders" && m.stage === pay.stage);
  if (orders) drivers.splice(1, 0, { ...make(pay, "orderValue", "merchandising"), metricKey: "payment_per_order", label: "每单支付金额", unit: "元/单", definition: "同范围支付金额/支付订单数，非每买家支付金额", derived: { numeratorKey: pay.key, denominatorKey: orders.key, numeratorDefinition: pay.definition, denominatorDefinition: orders.definition, numeratorUnit: pay.unit, denominatorUnit: orders.unit } });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const end = [today, ...actions.map((a: any) => a.dueDate).filter((d: string) => d && d >= today)].sort().at(-1)!;
  const resources: Record<string, string> = { diagnosis: "数据分析岗；同店商品/渠道/订单报表，来源工具和原始回执", merchandising: "商品运营、内容设计；本品牌SKU资料、真实产品图、详情页工作区与客服疑问", traffic: "投放、财务；计划/商品/关键词人群报表、成本与费用表、库存承载", retention: "会员运营、客服；授权聚合客户队列、现有会员权益和活动规则", service: "客服、仓配、商品负责人；退款原因、咨询样本、履约和批次信息", review: "运营、财务；当前目标、执行回执、同口径结果和费用" };
  const tactics = actions.map((a: any) => ({ actionKey: a.key, driverIds: ["goal", ...drivers.filter(d => d.actionKeys.includes(a.key)).map(d => d.id)], method: a.body, resources: resources[a.stage] || resources.review, costLimit: "具体额度待确认；现有资料分析可先做，新增制作或店铺变更按相应授权执行。", startDate: today, endDate: a.dueDate && a.dueDate >= today ? a.dueDate : end, dependencies: "先核当前商品/渠道、数据窗口和岗位承接；缺少的成本、库存或授权只阻止对应外部动作。", deliverable: a.successMetric }));
  return { actions, scorecard: { baselineSnapshotId: baseline.id, start: today, end, approval: "proposed", goal, drivers, tactics, checkpoints: [], cadence: "daily", dueLagDays: 1 } };
}
export function scorecardBaseline(c: CommerceScorecard, snapshots: any[], m: ScoreMetric) { return scoreMetricValue(snapshots.find(s => s.id === c.baselineSnapshotId), m); }
