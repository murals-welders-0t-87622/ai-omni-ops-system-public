import { CONNECTION_BRAND_TOOLS } from "./brand-operations.policy";
/** Versioned, exact tool grants. New tools do not automatically inherit access. */
export const CONNECTION_READ_TOOLS = [
  "get_brand_execution_profile", "get_current_brand_context", "get_brand_archive_summary", "get_brand_products",
  "get_growth_cockpit", "list_growth_plans", "get_growth_plan", "get_growth_executor_state",
  "list_collected_works_for_analysis", "get_collected_work_analysis_context", "get_work_analysis_taxonomy",
  "list_work_analysis_requests", "list_work_analysis_results", "get_work_analysis_result",
];
export const CONNECTION_WORK_TOOLS = [...CONNECTION_READ_TOOLS,
  "create_growth_plan_request", "update_growth_plan", "submit_growth_plan",
  "list_growth_expert_queue", "claim_growth_plan_check", "submit_growth_plan_proposal",
  "report_growth_executor_state",
  "create_work_analysis_request", "update_work_analysis_request", "submit_work_analysis_result",
];
export type ConnectionAccess = "read" | "work" | "brand";
export function connectionTools(access: ConnectionAccess) {
  return [...(access === "brand" ? CONNECTION_BRAND_TOOLS : access === "work" ? CONNECTION_WORK_TOOLS : CONNECTION_READ_TOOLS)];
}

/** All explicit scopes, including nested payloads, must agree with the execution identity. */
export function assertConnectionBrandScope(value: unknown, brandId: string): void {
  let visited = 0;
  const walk = (item: unknown, depth: number) => {
    if (++visited > 10000 || depth > 30) throw new Error("参数层级或数量超出限制");
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      if ((key === "brandId" || key === "brand_id") && child !== undefined && child !== brandId) throw new Error("参数品牌与连接授权品牌不一致");
      walk(child, depth + 1);
    }
  };
  walk(value, 0);
}
