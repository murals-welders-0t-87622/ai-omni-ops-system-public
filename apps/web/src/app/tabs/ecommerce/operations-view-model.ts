export const COMMERCE_OPERATION_VIEWS = [
  { key: "strategy", label: "战略：先做什么" },
  { key: "tactics", label: "策略：怎样达成" },
  { key: "execution", label: "执行：做了与结果" },
  { key: "overview", label: "业务数据总览" },
] as const;
export type CommerceOperationView = typeof COMMERCE_OPERATION_VIEWS[number]["key"];
export const commercePlanActions = (plan: any): any[] => Array.isArray(plan?.actions) ? plan.actions : [];
export function commerceStructuredGrowth(plan: any) {
  const g = plan?.growth;
  return g && typeof g.phase === "string" && typeof g.direction === "string" && typeof g.businessModel === "string" && Array.isArray(g.sequence) && Array.isArray(g.objectives) && Array.isArray(g.experiments) ? g : undefined;
}

// The report remains the authority for older plans. This only splits headings
// for reading; it does not invent a growth model or persist a migration.
export function commerceReportSections(report: unknown): { title: string; body: string }[] {
  if (typeof report !== "string" || !report.trim()) return [];
  const parts = report.replace(/\r\n/g, "\n").split(/^##\s+/m);
  if (parts.length === 1) return [{ title: "已保存的经营判断", body: report.trim() }];
  return parts.slice(1).map(part => {
    const lines = part.split("\n"), title = lines.shift()!.trim();
    while (lines.length && (!lines[0].trim() || /^\d+\s*[/／]/.test(lines[0].trim()) || lines[0].trim() === title)) lines.shift();
    return { title, body: lines.join("\n").trim() };
  });
}
export function commerceLegacyDirection(plan: any) {
  const sections = commerceReportSections(plan?.report);
  return sections.find(s => /判断|优先|先改善|经营方向|核心结论|增长方向/.test(s.title)) || sections[0];
}
export function commercePlanMilestones(plan: any) {
  const groups = new Map<string, any[]>();
  for (const a of commercePlanActions(plan)) {
    const date = typeof a.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate) ? a.dueDate : "";
    groups.set(date, [...(groups.get(date) || []), a]);
  }
  return [...groups].sort(([a], [b]) => (a || "9999").localeCompare(b || "9999")).map(([dueDate, actions]) => ({ dueDate, actions }));
}
export function commerceExecutionRows(plan: any) {
  const experiments: any[] = Array.isArray(plan?.growth?.experiments) ? plan.growth.experiments : [];
  return commercePlanActions(plan).map((action, index) => ({
    action, rowKey: action.key || `legacy-${index}`,
    experiments: experiments.flatMap((experiment, i) => action.key && experiment.actionKey === action.key ? [{ experiment, review: plan?.growthReview?.[i] }] : []),
  }));
}
export function commerceExecutionSummary(plan: any) {
  const rows = commerceExecutionRows(plan);
  return {
    planned: rows.length,
    withEvidence: rows.filter(r => r.experiments.some(e => !!e.experiment.executionEvidence && !!e.experiment.executedOn)).length,
    withComparableResult: rows.filter(r => r.experiments.some(e => e.review?.comparable)).length,
  };
}
