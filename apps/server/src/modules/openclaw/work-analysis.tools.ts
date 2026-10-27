import { WORK_ANALYSIS_PLATFORMS, analysisPlatform } from "./work-analysis.contract";
export const WORK_ANALYSIS_PERMISSION = {
  douyin: "brandGrowth.collection.douyinCollection",
  xiaohongshu: "brandGrowth.collection.xiaohongshuCollection",
  wechat: "brandGrowth.collection.wechatMpCollection",
} as const;
const fields: Record<string, any> = {
  platform: { type: "string", enum: [...WORK_ANALYSIS_PLATFORMS] },
  sourceId: { type: "string", description: "从采集候选读取的稳定sourceId；不要用URL代替。" },
  requestId: { type: "string" }, form: { type: "string", enum: ["text", "image", "video"] },
  forms: { type: "array", minItems: 1, maxItems: 3, uniqueItems: true, items: { type: "string", enum: ["text", "image", "video"] } },
  goal: { type: "string" }, keyword: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 }, offset: { type: "integer", minimum: 0 },
  excludePreviouslyRequested: { type: "boolean", description: "自动挑选建议设true：先排除已有未取消委托的作品，再计数分页；取消的作品仍可在新授权下重新选择。" },
  status: { type: "string", enum: ["pending", "running", "needs_input", "failed", "completed", "cancelled"] },
  expectedRevision: { type: "integer", minimum: 1 }, idempotencyKey: { type: "string", maxLength: 200 },
  action: { type: "string", enum: ["claim", "needs_input", "fail", "resume", "cancel", "reanalyse"] },
  message: { type: "string" }, title: { type: "string" }, reportMarkdown: { type: "string", description: "WorkBuddy专家已完成的完整报告；中台不调用模型生成。" },
  sourceSnapshotRef: { type: "string" }, profiles: { type: "array", items: { type: "object" }, description: "每项含form及对应字典的完整outputSchema字段；32维均有判断状态。" },
  methodVersions: { type: "object", properties: { expertPackage: { type: "string" }, skills: { type: "array", items: { type: "string" } }, executedExperts: { type: "array", items: { type: "string" } } }, required: ["expertPackage", "skills"], additionalProperties: false },
  revisionId: { type: "string" }, decision: { type: "string", enum: ["accepted", "changes_requested"] },
};
const definitions: [string, string, string[], string[]][] = [
  ["list_collected_works_for_analysis", "按当前品牌/平台完整筛选已采集作品，不限于已入素材库，不触发采集。可在授权范围内自动挑选，excludePreviouslyRequested支持去重。", ["platform"], ["keyword", "limit", "offset", "excludePreviouslyRequested"]],
  ["get_collected_work_analysis_context", "按稳定来源ID读取原作、段落、图片/视频引用及输入hash。外部资源是否可读仍须专家核对。", ["platform", "sourceId"], []],
  ["get_work_analysis_taxonomy", "读取文字/图片/视频独立标签字典和输出证据schema。", ["platform"], ["form"]],
  ["create_work_analysis_request", "用户逐件授权或给定范围/数量/目标后，WorkBuddy可自动挑选并登记拆解委托；仅待接单，不反向启动客户端。", ["platform", "sourceId", "forms", "goal", "idempotencyKey"], []],
  ["list_work_analysis_requests", "读取待接/在途/完成拆解委托；已取消项从列表及计数中移除，按品牌平台隔离。", ["platform"], ["status", "keyword", "limit", "offset"]],
  ["update_work_analysis_request", "真实接单、需补资料、失败、恢复、取消或重新拆解；须当前revision。取消后列表移除且不能恢复/提交，保留审计；原采集作品不删除。", ["platform", "requestId", "action", "expectedRevision"], ["message"]],
  ["submit_work_analysis_result", "接收专家完成的结构化深拆及报告，按来源平台保存不可变修订。", ["platform", "requestId", "expectedRevision", "idempotencyKey", "title", "sourceSnapshotRef", "profiles", "reportMarkdown", "methodVersions"], []],
  ["list_work_analysis_results", "按当前平台查询已完成作品拆解，支持内容标签检索。", ["platform"], ["keyword", "limit", "offset"]],
  ["get_work_analysis_result", "读取委托、固定来源、所有结果修订、专业版本与审阅事件。", ["platform", "requestId"], []],
  ["review_work_analysis_result", "对当前完成修订单独记录用户采纳或需修改；不覆盖报告。", ["platform", "requestId", "revisionId", "expectedRevision", "decision"], ["message"]],
];
export const WORK_ANALYSIS_MCP_TOOLS = definitions.map(([name, description, required, optional]) => ({ name, description, inputSchema: { type: "object", properties: Object.fromEntries([...required, ...optional].map(k => [k, fields[k]])), required, additionalProperties: false } }));
export const WORK_ANALYSIS_TOOL_NAMES = WORK_ANALYSIS_MCP_TOOLS.map(t => t.name);
export const isWorkAnalysisWrite = (name: string) => /^(create|update|submit|review)_/.test(name);
export const workAnalysisPermission = (platform: unknown) => WORK_ANALYSIS_PERMISSION[analysisPlatform(platform)];
