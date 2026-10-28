const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePlannedAdSpend, normalizePlanningTarget, assertPlanningResultTargets, PLANNING_TARGET_SCHEMA } = require('../packages/shared/dist/commerce-planning');
const { detailTaskAction } = require('../apps/server/dist/apps/server/src/modules/openclaw/commerce-detail-tasks');
const { recoverableDraft } = require('../integrations/commerce/executor/planning-result.cjs');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const full = { gmv: '47989.23', orders: '1252', averageOrderValue: '38.33005591', overallRoi: '5', adSpend: '9597.85' };
test('GMV divided by overall ROI is rounded to cents without floating point drift', () => {
  assert.equal(calculatePlannedAdSpend('47989.23', '5'), '9597.85');
  assert.equal(calculatePlannedAdSpend('100', '3'), '33.33');
  assert.equal(calculatePlannedAdSpend('1.005', '1'), '1.01');
  assert.equal(calculatePlannedAdSpend('100', '0.5'), '200.00');
});
test('zero, invalid, nonfinite and unrepresentable values are rejected', () => {
  for (const [gmv, roi] of [['100','0'], ['100','-1'], ['100','abc'], ['100','1e2'], ['0','5'], ['100','0.000000001'], ['999999999999','0.00000001'], ['0.001','999999999']]) assert.throws(() => calculatePlannedAdSpend(gmv, roi));
});
test('legacy targets remain valid; ROI and computed spend must occur together', () => {
  const legacy = { gmv: '1200', orders: '30', averageOrderValue: '40' };
  assert.deepEqual(normalizePlanningTarget(legacy), legacy);
  assert.deepEqual(normalizePlanningTarget(full), full);
  assert.throws(() => normalizePlanningTarget({ ...legacy, overallRoi: '5' }));
  assert.throws(() => normalizePlanningTarget({ ...full, adSpend: '9597.84' }));
  assert.throws(() => normalizePlanningTarget({ ...full, other: 'unexpected' }));
  assert.deepEqual(PLANNING_TARGET_SCHEMA.required, ['gmv','orders','averageOrderValue']);
  assert.ok(PLANNING_TARGET_SCHEMA.properties.overallRoi && PLANNING_TARGET_SCHEMA.properties.adSpend);
});
test('selected plan must preserve user budget; legacy plan still works', () => {
  const result = { selectedScenario: 'base', scenarios: [{ key: 'base', ...full, investment: { cash: full.adSpend } }] };
  const scorecard = { goal: { target: full.gmv }, drivers: [{ id: 'orders', target: full.orders }, { id: 'aov', target: full.averageOrderValue }] };
  assert.doesNotThrow(() => assertPlanningResultTargets(result, scorecard, full));
  const altered = structuredClone(result); altered.scenarios[0].investment.cash = '9500';
  assert.throws(() => assertPlanningResultTargets(altered, scorecard, full), /广告费/);
  const old = { gmv: full.gmv, orders: full.orders, averageOrderValue: full.averageOrderValue };
  assert.doesNotThrow(() => assertPlanningResultTargets(altered, scorecard, old));
});
test('task persists the exact ROI and calculated budget for the executor', async () => {
  let captured;
  const db = { businessAsset: { findFirst: async () => ({ id:'plan', title:'plan', metadataJson:{ kind:'COMMERCE_OPERATIONS_PLAN', revision:1, operatingMap:{}, scorecard:{} } }) }, task: { findFirst: async () => null, create: async ({data}) => { captured = data; return { id:'new-task' }; } } };
  const executor = { capabilities:['operations_replan'], at:Date.now() };
  await detailTaskAction(db, 'brand-a', 'actor', 'commerce_request_plan_task', { planId:'plan', expectedRevision:1, targetScenario:full }, executor);
  assert.deepEqual(captured.inputJson.targetScenario, full);
});
test('changing ROI or budget prevents recovering an older draft', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roi-recovery-'));
  const old = path.join(dir, 'old-task'), current = path.join(dir, 'new-task');
  fs.mkdirSync(old);
  try {
    const request = { context: { sourcePlan:{ id:'plan', revision:1 }, feedback:'', requestedTargets:full } };
    fs.writeFileSync(path.join(old,'request.json'), JSON.stringify(request));
    fs.writeFileSync(path.join(old,'result-0.json'), '{}');
    const w = { tasks:[{ id:'old-task', state:'FAILED', jobKind:'operations_replan', projectId:'plan', projectRevision:1, createdAt:'2026-10-28' }] };
    const job = { id:'new-task', projectId:'plan', revision:1, instructions:'', targetScenario:full };
    assert.ok(recoverableDraft(w, job, current));
    assert.equal(recoverableDraft(w, { ...job, targetScenario:{ ...full, overallRoi:'4', adSpend:'11997.31' } }, current), null);
    assert.equal(recoverableDraft(w, { ...job, targetScenario:{ gmv:full.gmv,orders:full.orders,averageOrderValue:full.averageOrderValue } }, current), null);
  } finally {
    for (const name of ['request.json','result-0.json']) fs.unlinkSync(path.join(old,name));
    fs.rmdirSync(old); fs.rmdirSync(dir);
  }
});
