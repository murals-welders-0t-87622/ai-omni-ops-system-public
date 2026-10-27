export const OPENCLAW_WORKSPACE_SCOPES = ["brand_growth", "xiaohongshu", "douyin", "wechat", "geo", "all_network_growth", "paid_acquisition", "creator_cooperation"] as const;

export type AIControlCenterWorkspaceScope = (typeof OPENCLAW_WORKSPACE_SCOPES)[number];

export const DEFAULT_OPENCLAW_WORKSPACE_SCOPE: AIControlCenterWorkspaceScope = "brand_growth";

export function normalizeAIControlCenterWorkspaceScope(value?: string): AIControlCenterWorkspaceScope {
  const normalized = String(value || "").trim().toLowerCase();
  if ((OPENCLAW_WORKSPACE_SCOPES as readonly string[]).includes(normalized)) {
    return normalized as AIControlCenterWorkspaceScope;
  }
  return DEFAULT_OPENCLAW_WORKSPACE_SCOPE;
}

export function getAIControlCenterWorkspaceDisplayName(scope: AIControlCenterWorkspaceScope) {
  switch (scope) {
    case "xiaohongshu":
      return "小红书";
    case "douyin":
      return "抖音";
    case "wechat":
      return "公众号";
    case "geo":
      return "GEO获客";
    case "all_network_growth":
      return "全网获客";
    case "paid_acquisition":
      return "投流获客";
    case "creator_cooperation":
      return "达人合作";
    case "brand_growth":
    default:
      return "品牌增长";
  }
}

export function getAIControlCenterWorkspaceDashboardPath(scope: AIControlCenterWorkspaceScope) {
  switch (scope) {
    case "xiaohongshu":
      return "/xiaohongshu";
    case "douyin":
      return "/douyin";
    case "wechat":
      return "/wechat";
    case "geo":
      return "/geo";
    case "all_network_growth":
      return "/all-network-growth";
    case "paid_acquisition":
      return "/paid-acquisition";
    case "creator_cooperation":
      return "/creator-cooperation";
    case "brand_growth":
    default:
      return "/brand-growth";
  }
}
