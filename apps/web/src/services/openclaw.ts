import {
  getDouyinCollectionWorkspace,
  getWechatMpBenchmarkWorkspace,
  getWechatMpCollectionWorkspace,
  getWechatSearchWorkspace,
  getXiaohongshuCollectionWorkspace,
  type DouyinCollectedWorkRecord,
  type WechatMpArticleRecord,
  type WechatMpBenchmarkArticleRecord,
  type WechatSearchItemRecord,
  type XhsCollectedNoteRecord,
} from "./collectors";
import { jsonRequest, request, requestBlobByUrl } from "./http";
import { type DouyinDesktopPublishSession } from "./publishing";

export type AIControlCenterInstallTokenRecord = {
  id: string;
  brandId: string;
  createdByUserId: string;
  tokenName: string;
  tokenPreview: string;
  status: "ACTIVE" | "REVOKED";
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterInstallWorkspace = {
  brandId: string;
  brandName: string;
  role: string;
  canManage: boolean;
  mcpServerName: string;
  mcpUrl: string;
  activeToken?: AIControlCenterInstallTokenRecord;
  snippetTemplates: {
    "ai-control-center": string;
    workbuddy: string;
    doubaoWork: string;
    qwenWork: string;
    codex: string;
    mcpEndpoint: string;
  };
  skillGuide: {
    title: string;
    summary: string;
    examples: string[];
  };
  skillInstall: {
    title: string;
    summary: string;
    status: "ready" | "beta";
    statusLabel: string;
    installTarget: string;
    steps: string[];
    fileName: string;
    downloadPath: string;
    githubTreeUrl: string;
    githubRef: string;
    githubPrompt: string;
    notes: string[];
  };
  relationshipGuide: {
    title: string;
    items: Array<{
      label: string;
      summary: string;
    }>;
  };
  deliveryChecklist: {
    title: string;
    summary: string;
    items: string[];
  };
  docs: Array<{
    label: string;
    url: string;
  }>;
};

export type RotateAIControlCenterInstallTokenResult = {
  token: string;
  record: AIControlCenterInstallTokenRecord;
  workspace: AIControlCenterInstallWorkspace;
};

export type RevealAIControlCenterInstallTokenResult = {
  tokenId: string;
  token: string;
};

export async function getAIControlCenterInstallationWorkspace() {
  return request<AIControlCenterInstallWorkspace>("/ai-control-center/installation-hub");
}

export async function rotateAIControlCenterInstallToken(payload?: {
  tokenName?: string;
  expiresInDays?: number;
}) {
  return jsonRequest<RotateAIControlCenterInstallTokenResult>("/ai-control-center/installation-hub/tokens/rotate", "POST", payload || {});
}

export async function revokeAIControlCenterInstallToken(tokenId: string) {
  return request<{ success: boolean; tokenId: string; workspace: AIControlCenterInstallWorkspace }>(`/ai-control-center/installation-hub/tokens/${tokenId}`, {
    method: "DELETE",
  });
}

export async function revealAIControlCenterInstallToken(tokenId: string) {
  return request<RevealAIControlCenterInstallTokenResult>(`/ai-control-center/installation-hub/tokens/${tokenId}/reveal`);
}

export async function downloadAIControlCenterSkillPackage(downloadPath: string) {
  return requestBlobByUrl(downloadPath);
}

export type AIControlCenterWorkspaceScope =
  | "brand_growth"
  | "xiaohongshu"
  | "douyin"
  | "wechat"
  | "geo"
  | "all_network_growth"
  | "paid_acquisition"
  | "creator_cooperation";
export type AIControlCenterCommentResourceType =
  | "creative_material"
  | "daily_plan"
  | "explosive_analysis"
  | "lobster_diary"
  | "strategy_optimization"
  | "marketing_plan"
  | "growth_report"
  | "video_work"
  | "tencent_ad_lead";
export type AIControlCenterCreativeMaterialCategory = "text" | "image" | "audio" | "video";
export type AIControlCenterCreativeMaterialSourceKind = "material_library_upload" | "ai_control_center_upload";
export const CONTENT_ACQUISITION_OPENCLAW_WORKSPACE_SCOPES = ["xiaohongshu", "douyin", "wechat"] as const;
export const PERSONAL_CENTER_OPENCLAW_WORKSPACE_SCOPES = [
  "brand_growth",
  "xiaohongshu",
  "douyin",
  "wechat",
  "geo",
  "all_network_growth",
  "paid_acquisition",
  "creator_cooperation",
] as const;

export type AIControlCenterCommentRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  resourceType: AIControlCenterCommentResourceType;
  resourceId: string;
  createdByUserId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterCommentWorkspace = {
  items: AIControlCenterCommentRecord[];
  total: number;
};

export async function getAIControlCenterCommentWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  resourceType: AIControlCenterCommentResourceType,
  resourceId: string,
  limit?: number,
) {
  const query = new URLSearchParams({
    workspaceScope,
    resourceType,
    resourceId,
  });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterCommentWorkspace>(`/ai-control-center/brands/${brandId}/comments?${query.toString()}`);
}

export async function createAIControlCenterComment(
  brandId: string,
  payload: {
    workspaceScope: AIControlCenterWorkspaceScope;
    resourceType: AIControlCenterCommentResourceType;
    resourceId: string;
    content: string;
  },
) {
  return jsonRequest<{ item: AIControlCenterCommentRecord; workspace: AIControlCenterCommentWorkspace }>(
    `/ai-control-center/brands/${brandId}/comments`,
    "POST",
    payload,
  );
}

export type AIControlCenterExplosiveAnalysisRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  title: string;
  tags: string[];
  htmlContent: string;
  authorName: string;
  workUrl: string;
  videoCopy: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterExplosiveAnalysisWorkspace = {
  items: AIControlCenterExplosiveAnalysisRecord[];
  total: number;
};

export async function getAIControlCenterExplosiveAnalysisWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterExplosiveAnalysisWorkspace>(`/ai-control-center/brands/${brandId}/explosive-analyses?${query.toString()}`);
}

export async function deleteAIControlCenterExplosiveAnalysis(
  recordId: string,
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterExplosiveAnalysisRecord; workspace: AIControlCenterExplosiveAnalysisWorkspace }>(
    `/ai-control-center/brands/${brandId}/explosive-analyses/${recordId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export type AIControlCenterLobsterDiaryRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  diaryDate: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterLobsterDiaryWorkspace = {
  items: AIControlCenterLobsterDiaryRecord[];
  total: number;
};

export async function getAIControlCenterLobsterDiaryWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterLobsterDiaryWorkspace>(`/ai-control-center/brands/${brandId}/lobster-diaries?${query.toString()}`);
}

export async function deleteAIControlCenterLobsterDiary(diaryId: string, brandId: string, workspaceScope: AIControlCenterWorkspaceScope) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterLobsterDiaryRecord; workspace: AIControlCenterLobsterDiaryWorkspace }>(
    `/ai-control-center/brands/${brandId}/lobster-diaries/${diaryId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function updateAIControlCenterLobsterDiary(
  diaryId: string,
  brandId: string,
  payload: {
    workspaceScope: AIControlCenterWorkspaceScope;
    diaryDate?: string;
    title?: string;
    content?: string;
  },
) {
  return jsonRequest<{ item: AIControlCenterLobsterDiaryRecord; workspace: AIControlCenterLobsterDiaryWorkspace }>(
    `/ai-control-center/brands/${brandId}/lobster-diaries/${diaryId}`,
    "PATCH",
    payload,
  );
}

export type AIControlCenterStrategyOptimizationRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  generatedAt: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterStrategyOptimizationWorkspace = {
  items: AIControlCenterStrategyOptimizationRecord[];
  total: number;
};

export async function getAIControlCenterStrategyOptimizationWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterStrategyOptimizationWorkspace>(`/ai-control-center/brands/${brandId}/strategy-optimizations?${query.toString()}`);
}

export async function deleteAIControlCenterStrategyOptimization(
  recordId: string,
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterStrategyOptimizationRecord; workspace: AIControlCenterStrategyOptimizationWorkspace }>(
    `/ai-control-center/brands/${brandId}/strategy-optimizations/${recordId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function updateAIControlCenterStrategyOptimization(
  recordId: string,
  brandId: string,
  payload: {
    workspaceScope: AIControlCenterWorkspaceScope;
    title?: string;
    content?: string;
  },
) {
  return jsonRequest<{ item: AIControlCenterStrategyOptimizationRecord; workspace: AIControlCenterStrategyOptimizationWorkspace }>(
    `/ai-control-center/brands/${brandId}/strategy-optimizations/${recordId}`,
    "PATCH",
    payload,
  );
}

export type AIControlCenterMarketingPlanRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  title: string;
  htmlContent: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterMarketingPlanWorkspace = {
  items: AIControlCenterMarketingPlanRecord[];
  total: number;
};

export async function getAIControlCenterMarketingPlanWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterMarketingPlanWorkspace>(`/ai-control-center/brands/${brandId}/marketing-plans?${query.toString()}`);
}

export async function deleteAIControlCenterMarketingPlan(
  recordId: string,
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterMarketingPlanRecord; workspace: AIControlCenterMarketingPlanWorkspace }>(
    `/ai-control-center/brands/${brandId}/marketing-plans/${recordId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export type AIControlCenterTencentAdLeadRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterTencentAdLeadWorkspace = {
  items: AIControlCenterTencentAdLeadRecord[];
  total: number;
};

export async function getAIControlCenterTencentAdLeadWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterTencentAdLeadWorkspace>(`/ai-control-center/brands/${brandId}/tencent-ad-leads?${query.toString()}`);
}

export async function deleteAIControlCenterTencentAdLead(
  recordId: string,
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterTencentAdLeadRecord; workspace: AIControlCenterTencentAdLeadWorkspace }>(
    `/ai-control-center/brands/${brandId}/tencent-ad-leads/${recordId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export type AIControlCenterCreatorWorkNextAction = "复投" | "调整" | "暂停";

export type AIControlCenterCreatorMatchRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  sourceProfileId: string;
  creatorId: string;
  oAuthorId: string;
  secUserId?: string;
  uniqueId?: string;
  douyinUid?: string;
  nickname: string;
  avatar?: string;
  signature?: string;
  region?: string;
  categoryLabels?: string[];
  contentThemeLabels?: string[];
  fansCount?: number;
  expectedPlayCount?: number;
  interactRate?: number;
  playOverRate?: number;
  spreadIndex?: number;
  price?: number;
  priceType?: string;
  cpm?: number;
  cpe?: number;
  profileUrl?: string;
  contactPhone?: string;
  contactWechat?: string;
  contactEmail?: string;
  mcnName?: string;
  marketingLabel?: string;
  taskCategoryLabel?: string;
  recommendedReason: string;
  isInTrackingList: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterCreatorMatchWorkspace = {
  items: AIControlCenterCreatorMatchRecord[];
  total: number;
};

export type AIControlCenterCreatorTrackingRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  sourceProfileId: string;
  creatorId: string;
  oAuthorId: string;
  secUserId?: string;
  uniqueId?: string;
  douyinUid?: string;
  nickname: string;
  avatar?: string;
  signature?: string;
  region?: string;
  categoryLabels?: string[];
  contentThemeLabels?: string[];
  fansCount?: number;
  expectedPlayCount?: number;
  interactRate?: number;
  playOverRate?: number;
  spreadIndex?: number;
  price?: number;
  priceType?: string;
  cpm?: number;
  cpe?: number;
  profileUrl?: string;
  contactPhone?: string;
  contactWechat?: string;
  contactEmail?: string;
  mcnName?: string;
  marketingLabel?: string;
  taskCategoryLabel?: string;
  cooperationWorkCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterCreatorTrackingWorkspace = {
  items: AIControlCenterCreatorTrackingRecord[];
  total: number;
};

export type AIControlCenterCreatorTrackingWorkRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  trackingId: string;
  createdByUserId: string;
  douyinWorkUrl: string;
  awemeId: string;
  title: string;
  coverUrl?: string;
  playCount?: number;
  likeCount?: number;
  collectCount?: number;
  commentCount?: number;
  shareCount?: number;
  resultEvaluation: string;
  nextAction?: AIControlCenterCreatorWorkNextAction;
  refreshIntervalDays: number;
  lastSyncedAt: string;
  nextRefreshAt: string;
  lastSyncError?: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterCreatorTrackingWorkWorkspace = {
  trackingId: string;
  items: AIControlCenterCreatorTrackingWorkRecord[];
  total: number;
};

export async function getAIControlCenterCreatorMatchWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterCreatorMatchWorkspace>(`/ai-control-center/brands/${brandId}/creator-cooperations/matching?${query.toString()}`);
}

export async function deleteAIControlCenterCreatorMatches(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  recordIds: string[],
) {
  return jsonRequest<{ deletedCount: number; workspace: AIControlCenterCreatorMatchWorkspace }>(
    `/ai-control-center/brands/${brandId}/creator-cooperations/matching/delete-batch`,
    "POST",
    {
      workspaceScope,
      recordIds,
    },
  );
}

export async function addAIControlCenterCreatorMatchesToTracking(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  recordIds: string[],
) {
  return jsonRequest<{
    items: AIControlCenterCreatorTrackingRecord[];
    matchingWorkspace: AIControlCenterCreatorMatchWorkspace;
    trackingWorkspace: AIControlCenterCreatorTrackingWorkspace;
  }>(`/ai-control-center/brands/${brandId}/creator-cooperations/matching/add-to-tracking`, "POST", {
    workspaceScope,
    recordIds,
  });
}

export async function getAIControlCenterCreatorTrackingWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterCreatorTrackingWorkspace>(`/ai-control-center/brands/${brandId}/creator-cooperations/tracking?${query.toString()}`);
}

export async function deleteAIControlCenterCreatorTrackingRecord(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  trackingId: string,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterCreatorTrackingRecord; workspace: AIControlCenterCreatorTrackingWorkspace }>(
    `/ai-control-center/brands/${brandId}/creator-cooperations/tracking/${trackingId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function getAIControlCenterCreatorTrackingWorkWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  trackingId: string,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterCreatorTrackingWorkWorkspace>(
    `/ai-control-center/brands/${brandId}/creator-cooperations/tracking/${trackingId}/works?${query.toString()}`,
  );
}

export async function createAIControlCenterCreatorTrackingWork(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  trackingId: string,
  payload: {
    douyinWorkUrl: string;
    refreshIntervalDays?: number;
    resultEvaluation?: string;
    nextAction?: AIControlCenterCreatorWorkNextAction | "";
  },
) {
  return jsonRequest<{ item: AIControlCenterCreatorTrackingWorkRecord; workspace: AIControlCenterCreatorTrackingWorkWorkspace }>(
    `/ai-control-center/brands/${brandId}/creator-cooperations/tracking/${trackingId}/works`,
    "POST",
    {
      workspaceScope,
      ...payload,
    },
  );
}

export async function updateAIControlCenterCreatorTrackingWork(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  trackingId: string,
  workId: string,
  payload: {
    douyinWorkUrl?: string;
    refreshIntervalDays?: number;
    resultEvaluation?: string;
    nextAction?: AIControlCenterCreatorWorkNextAction | "";
    refreshNow?: boolean;
  },
) {
  return jsonRequest<{ item: AIControlCenterCreatorTrackingWorkRecord; workspace: AIControlCenterCreatorTrackingWorkWorkspace }>(
    `/ai-control-center/brands/${brandId}/creator-cooperations/tracking/${trackingId}/works/${workId}`,
    "PATCH",
    {
      workspaceScope,
      ...payload,
    },
  );
}

export async function deleteAIControlCenterCreatorTrackingWork(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  trackingId: string,
  workId: string,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterCreatorTrackingWorkRecord; workspace: AIControlCenterCreatorTrackingWorkWorkspace }>(
    `/ai-control-center/brands/${brandId}/creator-cooperations/tracking/${trackingId}/works/${workId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export type AIControlCenterDailyPlanRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  planDate: string;
  title: string;
  content: string;
  htmlContent: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterDailyPlanWorkspace = {
  items: AIControlCenterDailyPlanRecord[];
  total: number;
};

export async function getAIControlCenterDailyPlanWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterDailyPlanWorkspace>(`/ai-control-center/brands/${brandId}/daily-plans?${query.toString()}`);
}

export async function deleteAIControlCenterDailyPlan(planId: string, brandId: string, workspaceScope: AIControlCenterWorkspaceScope) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterDailyPlanRecord; workspace: AIControlCenterDailyPlanWorkspace }>(
    `/ai-control-center/brands/${brandId}/daily-plans/${planId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export type AIControlCenterCreativeMaterialRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  sourceKind: AIControlCenterCreativeMaterialSourceKind;
  title: string;
  description: string;
  materialType: string;
  materialCategory: AIControlCenterCreativeMaterialCategory;
  previewKind?: "image" | "video" | "audio" | "html" | "text" | "file";
  displayType?: string;
  materialTags: string[];
  sourceLabel: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  textContent?: string;
  storageKey?: string;
  localFilePath?: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterCreativeMaterialWorkspace = {
  items: AIControlCenterCreativeMaterialRecord[];
  total: number;
};

const PERSONAL_CENTER_COLLECTED_MATERIAL_USER_ID = "system:collector-sync";

function dedupeStrings(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function pickFileNameFromUrl(url?: string) {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return decodeURIComponent(segments[segments.length - 1] || "");
  } catch {
    return undefined;
  }
}

function buildCollectedMaterialRecord(payload: {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  title: string;
  description?: string;
  materialType: string;
  materialCategory: AIControlCenterCreativeMaterialCategory;
  materialTags?: string[];
  sourceLabel: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  textContent?: string;
  localFilePath?: string;
  createdAt: string;
  updatedAt?: string;
}) {
  return {
    id: payload.id,
    brandId: payload.brandId,
    workspaceScope: payload.workspaceScope,
    createdByUserId: PERSONAL_CENTER_COLLECTED_MATERIAL_USER_ID,
    sourceKind: "ai_control_center_upload" as const,
    title: payload.title,
    description: payload.description || "",
    materialType: payload.materialType,
    materialCategory: payload.materialCategory,
    materialTags: dedupeStrings(["系统自动同步", "采集数据", ...(payload.materialTags || [])]),
    sourceLabel: payload.sourceLabel,
    fileUrl: payload.fileUrl,
    fileName: payload.fileName || pickFileNameFromUrl(payload.fileUrl),
    mimeType: payload.mimeType,
    textContent: payload.textContent,
    storageKey: undefined,
    localFilePath: payload.localFilePath,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt || payload.createdAt,
  } satisfies AIControlCenterCreativeMaterialRecord;
}

function mapXiaohongshuCollectedNoteToMaterial(brandId: string, item: XhsCollectedNoteRecord) {
  const materialCategory: AIControlCenterCreativeMaterialCategory = item.videoUrl
    ? "video"
    : item.imageList?.length
      ? "image"
      : "text";
  const fileUrl = materialCategory === "video" ? item.videoUrl : item.imageList?.[0];
  return buildCollectedMaterialRecord({
    id: `collector-xhs-${item.id}`,
    brandId,
    workspaceScope: "xiaohongshu",
    title: item.title || "未命名小红书素材",
    description: item.description || "",
    materialType:
      materialCategory === "video"
        ? "xhs_collected_video"
        : materialCategory === "image"
          ? "xhs_collected_image"
          : "xhs_collected_text",
    materialCategory,
    materialTags: dedupeStrings([
      "小红书",
      item.noteType || undefined,
      materialCategory === "video" ? "视频" : materialCategory === "image" ? "图文" : "文本",
      item.nickname || undefined,
    ]),
    sourceLabel: "小红书采集 / 自动同步",
    fileUrl,
    mimeType: materialCategory === "video" ? "video/mp4" : materialCategory === "image" ? "image/jpeg" : undefined,
    textContent: item.description || item.title,
    createdAt: item.collectedAt,
    updatedAt: item.materialAddedAt || item.collectedAt,
  });
}

function mapDouyinCollectedWorkToMaterial(brandId: string, item: DouyinCollectedWorkRecord) {
  const hasVideo = Boolean(item.videoUrl || item.videoSourceUrl || item.videoStoragePath);
  const hasImage = Boolean(item.coverUrl || item.imageList?.length);
  const materialCategory: AIControlCenterCreativeMaterialCategory = hasVideo ? "video" : hasImage ? "image" : "text";
  const fileUrl = hasVideo ? item.videoUrl || item.videoSourceUrl : item.coverUrl || item.imageList?.[0];
  return buildCollectedMaterialRecord({
    id: `collector-douyin-${item.id}`,
    brandId,
    workspaceScope: "douyin",
    title: item.title || "未命名抖音素材",
    description: item.transcript || item.description || "",
    materialType:
      materialCategory === "video"
        ? "douyin_collected_video"
        : materialCategory === "image"
          ? "douyin_collected_image"
          : "douyin_collected_text",
    materialCategory,
    materialTags: dedupeStrings([
      "抖音",
      item.workType || undefined,
      item.authorName || undefined,
      item.videoCacheStatus ? `缓存-${item.videoCacheStatus}` : undefined,
      item.transcript ? "已提取视频文案" : item.transcriptStatus ? `文案-${item.transcriptStatus}` : undefined,
    ]),
    sourceLabel: "抖音采集 / 自动同步",
    fileUrl,
    mimeType: materialCategory === "video" ? "video/mp4" : materialCategory === "image" ? "image/jpeg" : undefined,
    textContent: item.transcript || item.description || item.title,
    localFilePath: item.videoStoragePath,
    createdAt: item.collectedAt,
    updatedAt: item.transcribedAt || item.transcriptStatusUpdatedAt || item.materialAddedAt || item.collectedAt,
  });
}

function mapWechatArticleToMaterial(
  brandId: string,
  item: WechatMpArticleRecord | WechatMpBenchmarkArticleRecord | WechatSearchItemRecord,
  sourceLabel: string,
) {
  const imageUrls = "images" in item ? item.images || [] : [];
  const coverUrl = "cover" in item ? item.cover : undefined;
  const hasImage = Boolean(coverUrl || imageUrls.length);
  const materialCategory: AIControlCenterCreativeMaterialCategory = hasImage ? "image" : "text";
  const fileUrl = coverUrl || imageUrls[0];
  const textContent = item.articleContent || ("desc" in item ? item.desc : undefined) || item.title;
  return buildCollectedMaterialRecord({
    id: `collector-wechat-${item.id}`,
    brandId,
    workspaceScope: "wechat",
    title: item.title || "未命名公众号素材",
    description: textContent,
    materialType: materialCategory === "image" ? "wechat_collected_image" : "wechat_collected_text",
    materialCategory,
    materialTags: dedupeStrings([
      "公众号",
      "公众号文章",
      "jumpInfoNickName" in item ? item.jumpInfoNickName : undefined,
      "ghUsername" in item ? item.ghUsername : undefined,
    ]),
    sourceLabel,
    fileUrl,
    mimeType: materialCategory === "image" ? "image/jpeg" : undefined,
    textContent,
    createdAt: item.collectedAt,
    updatedAt:
      ("contentReadAt" in item ? item.contentReadAt : undefined)
      || ("statsUpdatedAt" in item ? item.statsUpdatedAt : undefined)
      || ("materialAddedAt" in item ? item.materialAddedAt : undefined)
      || item.collectedAt,
  });
}

async function getPersonalCenterCollectedMaterialWorkspace(brandId: string) {
  const [xhsWorkspace, douyinWorkspace, wechatWorkspace, wechatBenchmarkWorkspace, wechatSearchWorkspace] = await Promise.all([
    getXiaohongshuCollectionWorkspace(brandId),
    getDouyinCollectionWorkspace(brandId),
    getWechatMpCollectionWorkspace(brandId),
    getWechatMpBenchmarkWorkspace(brandId),
    getWechatSearchWorkspace(brandId),
  ]);

  const xhsItems = [...xhsWorkspace.brandNotes, ...xhsWorkspace.benchmarkNotes, ...xhsWorkspace.searchNotes]
    .map((item) => mapXiaohongshuCollectedNoteToMaterial(brandId, item));
  const douyinItems = [
    ...douyinWorkspace.brandWorks,
    ...douyinWorkspace.competitorWorks,
    ...douyinWorkspace.benchmarkWorks,
    ...douyinWorkspace.searchWorks,
    ...douyinWorkspace.lowFanExplosiveWorks,
    ...douyinWorkspace.highCompletionRateWorks,
    ...douyinWorkspace.highLikeRateWorks,
  ].map((item) => mapDouyinCollectedWorkToMaterial(brandId, item));
  const wechatItems = [
    ...wechatWorkspace.articles.map((item) => mapWechatArticleToMaterial(brandId, item, "公众号采集 / 自动同步")),
    ...wechatBenchmarkWorkspace.benchmarkArticles.map((item) =>
      mapWechatArticleToMaterial(brandId, item, "公众号对标采集 / 自动同步"),
    ),
    ...wechatSearchWorkspace.items.map((item) => mapWechatArticleToMaterial(brandId, item, "微信搜一搜采集 / 自动同步")),
  ];

  const deduped = new Map<string, AIControlCenterCreativeMaterialRecord>();
  [...xhsItems, ...douyinItems, ...wechatItems].forEach((item) => {
    deduped.set(item.id, item);
  });
  return [...deduped.values()];
}

export async function getAIControlCenterCreativeMaterialWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterCreativeMaterialWorkspace>(`/ai-control-center/brands/${brandId}/creative-materials?${query.toString()}`);
}

export async function getContentAcquisitionCreativeMaterialWorkspace(brandId: string, limit?: number) {
  const scopes = [...CONTENT_ACQUISITION_OPENCLAW_WORKSPACE_SCOPES] as AIControlCenterWorkspaceScope[];
  const workspaces = await Promise.all(scopes.map((scope) => getAIControlCenterCreativeMaterialWorkspace(brandId, scope, limit)));
  const items = workspaces.flatMap((workspace) => workspace.items);
  return {
    items,
    total: items.length,
  } satisfies AIControlCenterCreativeMaterialWorkspace;
}

export async function getPersonalCenterCreativeMaterialWorkspace(brandId: string, limit?: number) {
  const scopes = [...PERSONAL_CENTER_OPENCLAW_WORKSPACE_SCOPES] as AIControlCenterWorkspaceScope[];
  const [workspaces, collectedItems] = await Promise.all([
    Promise.all(scopes.map((scope) => getAIControlCenterCreativeMaterialWorkspace(brandId, scope, limit))),
    getPersonalCenterCollectedMaterialWorkspace(brandId),
  ]);
  const deduped = new Map<string, AIControlCenterCreativeMaterialRecord>();
  for (const workspace of workspaces) {
    for (const item of workspace.items) {
      deduped.set(item.id, item);
    }
  }
  for (const item of collectedItems) {
    deduped.set(item.id, item);
  }
  const items = [...deduped.values()]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, typeof limit === "number" ? limit : deduped.size);
  return {
    items,
    total: deduped.size,
  } satisfies AIControlCenterCreativeMaterialWorkspace;
}

export async function createAIControlCenterCreativeMaterial(
  brandId: string,
  payload: {
    workspaceScope?: AIControlCenterWorkspaceScope;
    sourceKind?: AIControlCenterCreativeMaterialSourceKind;
    title: string;
    description?: string;
    materialType: string;
    materialTags?: string[];
    fileUrl?: string;
    fileName?: string;
    mimeType?: string;
    textContent?: string;
    upload?: {
      fileName?: string;
      contentType?: string;
      dataBase64?: string;
    };
  },
) {
  return jsonRequest<{ item: AIControlCenterCreativeMaterialRecord; workspace: AIControlCenterCreativeMaterialWorkspace }>(
    `/ai-control-center/brands/${brandId}/creative-materials`,
    "POST",
    payload,
  );
}

export async function deleteAIControlCenterCreativeMaterial(
  materialId: string,
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterCreativeMaterialRecord; workspace: AIControlCenterCreativeMaterialWorkspace }>(
    `/ai-control-center/brands/${brandId}/creative-materials/${materialId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export type AIControlCenterVideoWorkRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  title: string;
  description: string;
  scriptContent: string;
  coverImageUrl?: string;
  videoUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterVideoWorkWorkspace = {
  items: AIControlCenterVideoWorkRecord[];
  total: number;
};

export async function getAIControlCenterVideoWorkWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterVideoWorkWorkspace>(`/ai-control-center/brands/${brandId}/video-works?${query.toString()}`);
}

export async function deleteAIControlCenterVideoWork(
  workId: string,
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterVideoWorkRecord; workspace: AIControlCenterVideoWorkWorkspace }>(
    `/ai-control-center/brands/${brandId}/video-works/${workId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function createAIControlCenterVideoWorkDouyinDesktopPublishSession(
  brandId: string,
  workId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  payload: { accountId?: string } = {},
) {
  const query = new URLSearchParams({ workspaceScope });
  return jsonRequest<{ task: { id: string; taskStatus: string; taskTitle: string }; session: DouyinDesktopPublishSession }>(
    `/ai-control-center/brands/${brandId}/video-works/${workId}/douyin-desktop-publish-session?${query.toString()}`,
    "POST",
    payload,
  );
}

export type AIControlCenterGeoVisibilityReportRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  title: string;
  description: string;
  htmlContent: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterGeoVisibilityReportWorkspace = {
  items: AIControlCenterGeoVisibilityReportRecord[];
  total: number;
};

export type AIControlCenterGeoContentType =
  | "keyword_research"
  | "site_diagnosis"
  | "knowledge_base_setup"
  | "geo_optimization_plan"
  | "self_media_content"
  | "third_party_media"
  | "brand_website_content";

export type AIControlCenterGeoContentGenerationMode = "single" | "multiple";

export type AIControlCenterGeoContentRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  contentType: AIControlCenterGeoContentType;
  sectionLabel: string;
  generationMode: AIControlCenterGeoContentGenerationMode;
  title: string;
  description: string;
  htmlContent: string;
  attachmentLabel: string;
  attachmentFileUrl?: string;
  attachmentFileName?: string;
  attachmentMimeType?: string;
  attachmentStorageKey?: string;
  storageAddress?: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterGeoContentWorkspace = {
  items: AIControlCenterGeoContentRecord[];
  total: number;
};

export type ThirdPartyMediaDeliveryResourceRecord = {
  id: string;
  sortType: string;
  platform: string;
  taxonomy: string;
  area: string;
  name: string;
  caseUrl?: string;
  price: string;
  publishTime: string;
  successRate: string;
  includeRate: string;
  isSelfMedia: boolean;
  raw: Record<string, unknown>;
  sourceRemotePage: number;
  syncedAt: string;
  updatedAt: string;
};

export type ThirdPartyMediaDeliveryResourceWorkspace = {
  items: ThirdPartyMediaDeliveryResourceRecord[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  cachedTotal: number;
  searchKeyword: string;
  syncedAt: string;
  nextRemotePage: number;
  remoteLastPage: number;
  hasRemoteMore: boolean;
};

export type ThirdPartyMediaDeliveryResourceSyncResult = {
  workspace: ThirdPartyMediaDeliveryResourceWorkspace;
  remotePage: number;
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  skipped: boolean;
  hasRemoteMore: boolean;
  nextRemotePage: number;
  syncedAt: string;
};

export type ThirdPartyMediaDeliveryRecord = {
  orderId: string;
  resourceId: string;
  resourceName: string;
  articleId: string;
  articleTitle: string;
  createdAt: string;
  raw: Record<string, unknown>;
};

export type AIControlCenterCommentLeadPlatform = "xiaohongshu" | "douyin";

export type AIControlCenterCommentLeadRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  sourcePlatform: AIControlCenterCommentLeadPlatform;
  sourcePlatformLabel: "小红书" | "抖音";
  sourceUrl: string;
  sourceCommentId?: string;
  userName: string;
  userComment: string;
  selectedReason: string;
  userProfileUrl: string;
  selectedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterCommentLeadWorkspace = {
  items: AIControlCenterCommentLeadRecord[];
  total: number;
};

export type AIControlCenterPlatformLeadRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  name: string;
  businessScope: string;
  selectedReason: string;
  contactInfo: string;
  address: string;
  selectedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterPlatformLeadWorkspace = {
  items: AIControlCenterPlatformLeadRecord[];
  total: number;
};

export type CreateAIControlCenterPlatformLeadsResult = {
  items: AIControlCenterPlatformLeadRecord[];
  createdCount: number;
  updatedCount: number;
};

export type CreateAIControlCenterCommentLeadsResult = {
  items: AIControlCenterCommentLeadRecord[];
  createdCount: number;
  updatedCount: number;
  platformCounts: {
    xiaohongshu: number;
    douyin: number;
  };
};

export async function getAIControlCenterGeoVisibilityReportWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterGeoVisibilityReportWorkspace>(`/ai-control-center/brands/${brandId}/geo-visibility-reports?${query.toString()}`);
}

export async function deleteAIControlCenterGeoVisibilityReport(
  reportId: string,
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterGeoVisibilityReportRecord; workspace: AIControlCenterGeoVisibilityReportWorkspace }>(
    `/ai-control-center/brands/${brandId}/geo-visibility-reports/${reportId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function getAIControlCenterGeoContentWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  contentType?: AIControlCenterGeoContentType,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (contentType) {
    query.set("contentType", contentType);
  }
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterGeoContentWorkspace>(`/ai-control-center/brands/${brandId}/geo-contents?${query.toString()}`);
}

export async function deleteAIControlCenterGeoContent(
  contentId: string,
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  contentType?: AIControlCenterGeoContentType,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (contentType) {
    query.set("contentType", contentType);
  }
  return request<{ item: AIControlCenterGeoContentRecord; workspace: AIControlCenterGeoContentWorkspace }>(
    `/ai-control-center/brands/${brandId}/geo-contents/${contentId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function getThirdPartyMediaDeliveryResources(
  brandId: string,
  options?: {
    page?: number;
    searchKeyword?: string;
  },
) {
  const query = new URLSearchParams();
  if (typeof options?.page === "number") {
    query.set("page", String(options.page));
  }
  if (options?.searchKeyword?.trim()) {
    query.set("searchKeyword", options.searchKeyword.trim());
  }
  return request<ThirdPartyMediaDeliveryResourceWorkspace>(
    `/ai-control-center/brands/${brandId}/third-party-media-delivery/resources${query.size ? `?${query.toString()}` : ""}`,
  );
}

export async function syncThirdPartyMediaDeliveryResources(
  brandId: string,
  payload?: {
    page?: number;
    searchKeyword?: string;
  },
) {
  return jsonRequest<ThirdPartyMediaDeliveryResourceSyncResult>(
    `/ai-control-center/brands/${brandId}/third-party-media-delivery/resources/sync`,
    "POST",
    payload || {},
  );
}

export async function createThirdPartyMediaDelivery(
  brandId: string,
  payload: {
    articleId: string;
    resourceId: string;
  },
) {
  return jsonRequest<{ delivery: ThirdPartyMediaDeliveryRecord }>(
    `/ai-control-center/brands/${brandId}/third-party-media-delivery/deliveries`,
    "POST",
    payload,
  );
}

export async function getAIControlCenterCommentLeadWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  sourcePlatform?: AIControlCenterCommentLeadPlatform,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (sourcePlatform) {
    query.set("sourcePlatform", sourcePlatform);
  }
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterCommentLeadWorkspace>(`/ai-control-center/brands/${brandId}/comment-leads?${query.toString()}`);
}

export async function createAIControlCenterCommentLeads(
  brandId: string,
  payload: {
    workspaceScope?: AIControlCenterWorkspaceScope;
    sourcePlatforms?: AIControlCenterCommentLeadPlatform[];
    xiaohongshuSourceUrls?: string[];
    douyinSourceUrls?: string[];
    matchKeywords?: string[];
    syncCommentsFirst?: boolean;
  } = {},
) {
  return jsonRequest<{ result: CreateAIControlCenterCommentLeadsResult; workspace: AIControlCenterCommentLeadWorkspace }>(
    `/ai-control-center/brands/${brandId}/comment-leads`,
    "POST",
    payload,
  );
}

export async function deleteAIControlCenterCommentLead(
  leadId: string,
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  sourcePlatform?: AIControlCenterCommentLeadPlatform,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (sourcePlatform) {
    query.set("sourcePlatform", sourcePlatform);
  }
  return request<{ item: AIControlCenterCommentLeadRecord; workspace: AIControlCenterCommentLeadWorkspace }>(
    `/ai-control-center/brands/${brandId}/comment-leads/${leadId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export async function getAIControlCenterPlatformLeadWorkspace(
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
  limit?: number,
) {
  const query = new URLSearchParams({ workspaceScope });
  if (typeof limit === "number") {
    query.set("limit", String(limit));
  }
  return request<AIControlCenterPlatformLeadWorkspace>(`/ai-control-center/brands/${brandId}/platform-leads?${query.toString()}`);
}

export async function createAIControlCenterPlatformLeads(
  brandId: string,
  payload: {
    workspaceScope?: AIControlCenterWorkspaceScope;
    items: Array<{
      id?: string;
      name: string;
      businessScope: string;
      selectedReason: string;
      contactInfo: string;
      address: string;
      selectedAt?: string;
    }>;
  },
) {
  return jsonRequest<{ result: CreateAIControlCenterPlatformLeadsResult; workspace: AIControlCenterPlatformLeadWorkspace }>(
    `/ai-control-center/brands/${brandId}/platform-leads`,
    "POST",
    payload,
  );
}

export async function deleteAIControlCenterPlatformLead(
  leadId: string,
  brandId: string,
  workspaceScope: AIControlCenterWorkspaceScope,
) {
  const query = new URLSearchParams({ workspaceScope });
  return request<{ item: AIControlCenterPlatformLeadRecord; workspace: AIControlCenterPlatformLeadWorkspace }>(
    `/ai-control-center/brands/${brandId}/platform-leads/${leadId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}
