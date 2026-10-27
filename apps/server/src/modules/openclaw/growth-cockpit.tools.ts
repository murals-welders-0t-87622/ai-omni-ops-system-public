const field: Record<string, any> = {
  workerId: {type:"string"}, state: {type:"string",enum:["idle","running","error","paused"]}, packageVersion:{type:"string"}, activePlanId:{type:"string"}, sessionId:{type:"string"}, errorCode:{type:"string"},
  dimension: { type: "string", enum: ["day", "week", "month", "quarter", "year", "custom"] }, anchor: { type: "string", description: "该周期内任一天，YYYY-MM-DD；周一至周日，Asia/Shanghai" }, start: { type: "string" }, end: { type: "string" },
  window: { type: "object", description: "指标证据报告周期，dimension/anchor或custom start/end" }, title: { type: "string" }, goal: { type: "string" }, scope: { type: "string", enum: ["brand", "content", "geo", "omni", "paid", "creator"] }, startDate: { type: "string" }, endDate: { type: "string" }, frequency: { type: "string", enum: ["daily", "weekly"], description: "Asia/Shanghai每日09:00或每周一09:00；只读检查，非自动花费授权" },
  idempotencyKey: { type: "string" }, planId: { type: "string" }, expectedRevision: { type: "integer", minimum: 0 }, status: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 }, offset: { type: "integer", minimum: 0 }, action: { type: "string", enum: ["claim", "activate", "pause", "resume", "close"] },
  body: { type: "object", required: ["metricKey", "target", "direction", "actions", "budgetBoundary"], properties: { metricKey: { type: "string" }, target: { type: "number", minimum: 0 }, direction: { type: "string", enum: ["higher", "lower"] }, minSample: { type: "integer", minimum: 1 }, windowDays: { type: "integer", minimum: 1, maximum: 366 }, actions: { type: "array", items: { type: "object", required: ["title", "owner", "acceptance"], properties: { title: { type: "string" }, owner: { type: "string" }, acceptance: { type: "string" } } } }, budgetBoundary: { type: "string" } }, additionalProperties: false },
  reportMarkdown: { type: "string", description: "真实专家报告，包含证据、事实/假设、措施、限制、验证与复盘；中台不代写" }, snapshotRef: { type: "string", description: "固定委托或检查快照contentHash" }, methodVersions: { type: "object", required: ["expertPackage", "skills"], properties: { expertPackage: { type: "string" }, skills: { type: "array", items: { type: "string" } }, executedExperts: { type: "array", items: { type: "string" } } }, additionalProperties: false },
  metricKey: { type: "string" }, date: { type: "string" }, value: { type: "number", minimum: 0 }, sampleSize: { type: "integer", minimum: 0 }, basis: { type: "string", description: "跨日固定的账户/去重/归因窗口/题库模型测法口径标识；不能混不同口径" }, sourceRef: { type: "string", description: "可回溯原始报表或来源引用。上报值不冒称平台独立验真。" }, observedAt: { type: "string" }, checkId: { type: "string" }, actions: { type: "array", items: { type: "object", required: ["title", "owner", "acceptance"], properties: { title: { type: "string" }, owner: { type: "string" }, acceptance: { type: "string" } } } }, proposalId: { type: "string" }, decision: { type: "string", enum: ["accept", "reject"] },
};
const defs: [string, string, string[], string[]][] = [
  ["get_growth_executor_state", "读取当前品牌本机WorkBuddy执行器心跳；过期为离线，不把上报当专业完成。", [], []],
  ["report_growth_executor_state", "授权本机执行器上报运行心跳及关联计划/会话，不创建业务结果，不证明模型专业质量。", ["workerId","state","packageVersion"], ["activePlanId","sessionId","errorCode"]],
  ["get_growth_cockpit", "读取当前授权品牌六业务经营驾驶舱：全量记录、结构化经营指标、时间覆盖/来源；未知不填0，采集不冒称自产效果。", [], ["dimension", "anchor", "start", "end"]],
  ["create_growth_plan_request", "用户给定经营目标/范围后登记稳定计划需求并固定驾驶舱证据；在线且获授权的本机执行器按队列启动WorkBuddy专家，离线保留待处理，提交不自动生效。", ["title", "goal", "scope", "startDate", "endDate", "frequency", "idempotencyKey"], ["window"]],
  ["list_growth_plans", "读取当前品牌计划，完整计数后分页。", [], ["status", "limit", "offset"]],
  ["get_growth_plan", "读取稳定计划、固定证据、全部不可变版本和最新50次检查/建议，先读回再续接。", ["planId"], []],
  ["update_growth_plan", "按revision接单、确认生效、暂停、恢复或结束；生效只授权计划内只读检查，不扩大预算/发布/触达权限。", ["planId", "action", "expectedRevision"], []],
  ["submit_growth_plan", "接单者真实提交结构化计划及完整报告/方法版本，基线由固定快照取值，报告与页面同源。", ["planId", "expectedRevision", "idempotencyKey", "body", "reportMarkdown", "snapshotRef", "methodVersions"], []],
  ["record_growth_metric_fact", "保存有来源的已结束自然日经营指标上报，修订追加不覆盖；严格标为上报证据，禁止编造值/来源或把采集/报告条数当经营结果。缺失日期保持未知。", ["metricKey", "date", "value", "sampleSize", "basis", "sourceRef", "observedAt", "expectedRevision", "idempotencyKey"], []],
  ["check_growth_plan", "检查生效计划独立观察窗：过期/不足样本/缺数据单列；偏差进入待专家队列，不由中台生成专业意见。", ["planId"], []],
  ["list_growth_expert_queue", "读取待制定计划与偏差分析队列；同一品牌全域增长专家团处理，由已授权本机执行器按队列启动WorkBuddy随包引擎；离线保留待处理。", [], []],
  ["claim_growth_plan_check", "领取当前计划版本的偏差分析，检查revision与30分钟租约；专业成员实际分析后提交。", ["planId", "checkId", "expectedRevision"], []],
  ["submit_growth_plan_proposal", "真实专家提交有依据的调整建议，不自动改目标/基线/预算；固定检查来源并校验接单身份与版本。", ["planId", "checkId", "expectedRevision", "idempotencyKey", "snapshotRef", "actions", "reportMarkdown", "methodVersions"], []],
  ["review_growth_plan_proposal", "记录用户对当前调整建议的决定；采纳只形成新措施版本，旧版/基线/目标/预算不变，不代表允许花费或发布。", ["planId", "proposalId", "expectedRevision", "decision"], []],
];
export const GROWTH_COCKPIT_TOOLS = defs.map(([name, description, required, optional]) => ({ name, description, inputSchema: { type: "object", properties: Object.fromEntries([...required, ...optional].map(k => [k, field[k]])), required, additionalProperties: false } }));
export const GROWTH_COCKPIT_NAMES = GROWTH_COCKPIT_TOOLS.map(t => t.name);
export const growthWrite = (name: string) => !["get_growth_cockpit", "list_growth_plans", "get_growth_plan", "list_growth_expert_queue", "get_growth_executor_state"].includes(name);
