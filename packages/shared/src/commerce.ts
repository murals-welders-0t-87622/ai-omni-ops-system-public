import { COMMERCE_OPERATION_SPEC_SCHEMA } from "./commerce-operations";
import { COMMERCE_SCORECARD_SCHEMA } from "./commerce-scorecard";
import { COMMERCE_OPERATING_MAP_SCHEMA } from "./commerce-operating-map";
import { PLANNING_TARGET_SCHEMA } from "./commerce-planning";
import { COMMERCE_GROWTH_SCHEMA } from "./commerce-growth";
export const COMMERCE_ACTIONS = [
  "commerce_request_plan_task", "commerce_get_workspace", "commerce_get_detail_history", "commerce_get_detail_reference", "commerce_create_detail_project",
  "commerce_save_detail_revision", "commerce_confirm_video", "commerce_bind_shop",
  "commerce_save_shop_snapshot", "commerce_save_operations_plan", "commerce_save_operation_draft", "commerce_record_operation_receipt", "commerce_execute_operation",
  "commerce_request_detail_task", "commerce_claim_detail_task", "commerce_report_detail_task", "commerce_report_detail_executor",
] as const;

export const COMMERCE_STAGES = [
  { key: "diagnosis", label: "经营体检" }, { key: "merchandising", label: "货品与转化" },
  { key: "traffic", label: "流量与推广" }, { key: "retention", label: "活动与会员" },
  { key: "service", label: "履约与服务" }, { key: "review", label: "计划与复盘" },
] as const;

export const DETAIL_PAGE_TITLES = ["主视觉封面", "核心卖点", "产品细节与规格", "材质与工艺", "使用场景", "场景延伸", "信任证据", "购买疑问", "售后与物流", "行动引导"];
export const COMMERCE_VIDEO_DEFAULTS = { appKey: "seedance20-mini-multi-reference", resolution: "480p", ratio: "9:16", duration: 10 };
export type CommerceMediaRef = { table: "MediaAsset" | "AIControlCenterCreativeMaterial"; recordId: string };
export type DetailPage = { title: string; copy: string; prompt: string; evidence: string; mediaRef?: CommerceMediaRef; mediaStale?: boolean };
export type DetailBody = {
  mainImages?: DetailPage[];
  listing?: { title: string; keywords: string[]; description: string; identityLock: string; platformRulesEvidence: string; faq: { question: string; answer: string; evidence: string }[] };
  sellingPointReport: string;
  sellingPoints: { title: string; benefit: string; evidence: string }[];
  pages: DetailPage[];
  video: { concept: string; prompt: string; appKey: string; resolution: string; ratio: string; duration: number; mediaRef?: CommerceMediaRef; mediaStale?: boolean };
};
const string = { type: "string" };
const mediaRef = { type: "object", properties: { table: { type: "string", enum: ["MediaAsset", "AIControlCenterCreativeMaterial"] }, recordId: string }, required: ["table", "recordId"], additionalProperties: false };
const metric = { type: "object", properties: { key: string, label: string, value: { type: ["string", "null"] }, unit: string, definition: string }, required: ["key", "label", "value", "unit", "definition"], additionalProperties: false };
export const COMMERCE_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    area: { type: "string", enum: ["detail", "operations"] },
    idempotencyKey: string, projectId: string, productId: string, title: string, instructions: string,
    expectedRevision: { type: "integer", minimum: 0 }, pageCount: { type: "integer", minimum: 1, maximum: 20 },
    jobId: string, executorId: string, leaseToken: string,
    generationMode: { enum: ["create", "revise"] }, revisionScope: { enum: ["pages", "listing", "selling_points", "video"] }, targetIndexes: { type: "array", maxItems: 20, items: { type: "integer", minimum: 0, maximum: 19 } }, referenceSection: { enum: ["main", "detail"] }, referenceIndex: { type: "integer", minimum: 0, maximum: 19 },
    operation: COMMERCE_OPERATION_SPEC_SCHEMA, operationId: string, initiativeId: string, planRevision: { type: "integer", minimum: 1 }, executionNotes: string,
    operationReceipt: { type: "object", additionalProperties: false, required: ["status", "toolName", "externalTaskId", "evidence", "afterEvidence"], properties: { status: { enum: ["submitted", "reported_success", "failed", "unknown"] }, toolName: string, externalTaskId: string, evidence: string, afterEvidence: string } },
    targetScenario: PLANNING_TARGET_SCHEMA, planTaskId: string,
    jobKind: { enum: ["operations_replan", "main_copy", "detail_copy", "video_concept", "main_images", "detail_images", "video_generate"] },
    taskState: { enum: ["progress", "success", "failed"] }, message: string,
    capabilities: { type: "array", maxItems: 7, items: { enum: ["operations_replan", "main_copy", "detail_copy", "video_concept", "main_images", "detail_images", "video_generate"] } },
    body: { type: "object", additionalProperties: false, required: ["sellingPointReport", "sellingPoints", "pages", "video"], properties: {
      mainImages: { type: "array", maxItems: 12, items: { type: "object", properties: { title: string, copy: string, prompt: string, evidence: string, mediaRef, mediaStale: { type: "boolean" } }, required: ["title", "copy", "prompt", "evidence"], additionalProperties: false } },
      listing: { type: "object", additionalProperties: false, required: ["title", "keywords", "description", "identityLock", "platformRulesEvidence", "faq"], properties: { title: string, keywords: { type: "array", maxItems: 60, items: string }, description: string, identityLock: string, platformRulesEvidence: string, faq: { type: "array", maxItems: 20, items: { type: "object", additionalProperties: false, required: ["question", "answer", "evidence"], properties: { question: string, answer: string, evidence: string } } } } },
      sellingPointReport: string,
      sellingPoints: { type: "array", maxItems: 12, items: { type: "object", properties: { title: string, benefit: string, evidence: string }, required: ["title", "benefit", "evidence"], additionalProperties: false } },
      pages: { type: "array", maxItems: 20, items: { type: "object", properties: { title: string, copy: string, prompt: string, evidence: string, mediaRef, mediaStale: { type: "boolean" } }, required: ["title", "copy", "prompt", "evidence"], additionalProperties: false } },
      video: { type: "object", additionalProperties: false, required: ["concept", "prompt", "appKey", "resolution", "ratio", "duration"], properties: { concept: string, prompt: string, appKey: string, resolution: string, ratio: string, duration: { type: "integer" }, mediaRef, mediaStale: { type: "boolean" } } },
    } },
    confirmationText: { type: "string", description: "用户确认该产品视频应用、分辨率、比例、时长及创意的原话；不是模型自批。确认仅对应当前项目版本。" },
    shopId: string, externalShopId: string, shopName: string, platform: { type: "string", enum: ["taobao", "tmall"] }, mappingEvidence: string,
    snapshotId: string, planId: string, report: string, toolName: string, sourceEvidence: string,
    period: { type: "object", properties: { start: string, end: string, timezone: { const: "Asia/Shanghai" } }, required: ["start", "end", "timezone"], additionalProperties: false },
    currency: { type: "string", enum: ["CNY"] }, sourceStatus: { type: "string", enum: ["unverified", "provider_reported", "test_data"] },
    sections: { type: "array", maxItems: 6, items: { type: "object", properties: { key: { type: "string", enum: COMMERCE_STAGES.map(s => s.key) }, summary: string, metrics: { type: "array", items: metric, maxItems: 30 }, evidence: string, limitations: string, tables: { type: "array", maxItems: 6, items: { type: "object", properties: { title: string, columns: { type: "array", maxItems: 12, items: { type: "object", properties: { key: string, label: string }, required: ["key", "label"], additionalProperties: false } }, rows: { type: "array", maxItems: 200, items: { type: "object", additionalProperties: string } } }, required: ["title", "columns", "rows"], additionalProperties: false } } }, required: ["key", "summary", "metrics", "evidence", "limitations"], additionalProperties: false } },
    actions: { type: "array", maxItems: 50, items: { type: "object", properties: { key: string, stage: { type: "string", enum: COMMERCE_STAGES.map(s => s.key) }, title: string, body: string, owner: string, dueDate: string, successMetric: string, status: { type: "string", enum: ["proposed", "in_progress", "review", "closed"] } }, required: ["stage", "title", "body", "owner", "dueDate", "successMetric", "status"], additionalProperties: false } },
    growth: COMMERCE_GROWTH_SCHEMA,
    scorecard: COMMERCE_SCORECARD_SCHEMA,
    operatingMap: COMMERCE_OPERATING_MAP_SCHEMA,
    skillVersion: string,
  },
} as const;
