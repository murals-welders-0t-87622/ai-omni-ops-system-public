const assert = require("node:assert/strict"), path = require("node:path");
const root = path.resolve(__dirname, "..");
const { normalizeDetailBody, commerceArea } = require(path.join(root, "apps/server/dist/apps/server/src/modules/openclaw/commerce.service.js"));
const { COMMERCE_VIDEO_DEFAULTS, COMMERCE_ACTIONS, COMMERCE_SCHEMA } = require("@ai-omni/shared/commerce");
const { assertBrandOperationsAction, projectBrandOperationsSchema } = require(path.join(root, "apps/server/dist/apps/server/src/modules/openclaw/brand-operations.policy.js"));
const body = { sellingPointReport: "事实分析", sellingPoints: [{ title: "便携", benefit: "方便带出门", evidence: "产品介绍注明便携" }], pages: [{ title: "封面", copy: "随身带走", prompt: "使用产品图", evidence: "产品资料" }], video: { ...COMMERCE_VIDEO_DEFAULTS, concept: "真实用法", prompt: "10秒分镜" } };
let n = 0;
function check(name, f) { f(); n++; console.log("PASS " + name); }
check("产品卖点、全文、分镜及参数完整保留", () => assert.deepEqual(normalizeDetailBody(body), body));
check("无依据卖点拒绝保存", () => assert.throws(() => normalizeDetailBody({ ...body, sellingPoints: [{ title: "销量第一", benefit: "", evidence: "" }] })));
check("不支持的视频应用拒绝", () => assert.throws(() => normalizeDetailBody({ ...body, video: { ...body.video, appKey: "other-app" } })));
check("非整数时长拒绝", () => assert.throws(() => normalizeDetailBody({ ...body, video: { ...body.video, duration: 10.5 } })));
check("未知字段拒绝，避免把发布授权混入内容", () => assert.throws(() => normalizeDetailBody({ ...body, publishNow: true })));
check("空详情页拒绝", () => assert.throws(() => normalizeDetailBody({ ...body, pages: [] })));
check("显式区域分离及历史读取路由", () => { assert.equal(commerceArea("commerce_get_workspace", { area: "operations" }), "operations"); assert.equal(commerceArea("commerce_get_detail_history", {}), "detail"); assert.throws(() => commerceArea("commerce_get_workspace", {})); });
check("品牌连接可读写电商记录，无新增付费/发布工具", () => {
  const allowed = ["manage_brand_library", "manage_growth_reports"];
  for (const action of COMMERCE_ACTIONS) assert.doesNotThrow(() => assertBrandOperationsAction("manage_growth_reports", { action }, allowed));
  assert.throws(() => assertBrandOperationsAction("manage_growth_reports", { action: "commerce_publish_shop" }, allowed));
  const s = projectBrandOperationsSchema("manage_growth_reports", { properties: { action: { type: "string" }, payload: { properties: { commerce: COMMERCE_SCHEMA } } } }, allowed);
  assert.ok(COMMERCE_ACTIONS.every(a => s.properties.action.enum.includes(a)));
});
async function verifyBusinessRouting() {
  const { AIControlCenterService } = require(path.join(root, "apps/server/dist/apps/server/src/modules/openclaw/openclaw.service.js"));
  const service = Object.create(AIControlCenterService.prototype);
  service.requireAuth = async () => ({ userId: "test", currentBrandId: "test-brand" });
  service.requireCurrentBrandId = async () => "test-brand";
  service.authService = { assertBrandAccess: async () => {} };
  service.buildSummaryResponse = value => value;
  for (const [intent, expected] of [
    ["帮这个产品做一套详情页", "commerce_detail_workspace"],
    ["给这个商品做商品主图和商品标题", "commerce_detail_workspace"],
    ["为品牌安排电商增长路线", "commerce_operations_workspace"],
    ["详情页做好后继续做10秒商品视频", "commerce_detail_workspace"],
    ["示例品牌的天猫店怎么运营", "commerce_operations_workspace"],
    ["帮我诊断淘宝店并出详细方案", "commerce_operations_workspace"],
    ["把店铺本周数据和复盘存回中台", "commerce_operations_workspace"],
  ]) {
    const result = await service.routeWebsiteFunctionByIntent({}, { intent });
    check("自然语言路由：" + intent, () => assert.equal(result.data.primary?.functionKey, expected));
  }
  for (const functionKey of ["commerce_detail_workspace", "commerce_operations_workspace"]) {
    const result = await service.getWebsiteFunctionExecutionPlan({}, { functionKey });
    check("电商执行计划包含同源动作和证据要求：" + functionKey, () => {
      assert.ok(result.data.executionRecipe.workspace.includes("commerce_get_workspace"));
      assert.ok(result.data.executionRecipe.persistence.includes("expectedRevision"));
      assert.ok(result.data.executionRecipe.requiredSkill);
    });
  }
  console.log(JSON.stringify({ checks: n }));
}
verifyBusinessRouting().catch(error => { console.error(error); process.exitCode = 1; });
