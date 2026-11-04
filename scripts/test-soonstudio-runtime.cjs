const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SoonStudioRuntimeService } = require('../apps/server/dist/apps/server/src/modules/third-party-platforms/soonstudio-runtime.service');
const { SoonStudioRuntimeController } = require('../apps/server/dist/apps/server/src/modules/third-party-platforms/soonstudio-runtime.controller');
const { SOONSTUDIO_MODELS } = require('../apps/server/dist/apps/server/src/common/soonstudio-model-catalog');
const model = SOONSTUDIO_MODELS.find(row => !row.deprecated && !row.unsupportedReason && row.primaryType === 'text');
const syntheticKey = 'synthetic-key-never-real';
const pause = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const rows = new Map(), calls = { submit: [], query: [], credentials: [] };
  const db = { task: {
    findFirst: async ({ where }) => { const row = rows.get(where.id); return row && Object.entries(where).every(([key, value]) => row[key] === value) ? structuredClone(row) : null; },
    create: async ({ data }) => { if (rows.has(data.id)) throw Object.assign(new Error('duplicate'), { code: 'P2002' }); const row = { ...data, createdAt: new Date(), updatedAt: new Date() }; rows.set(data.id, row); return structuredClone(row); },
    update: async ({ where, data }) => { assert(rows.has(where.id)); const row = { ...rows.get(where.id), ...data, updatedAt: new Date() }; rows.set(where.id, row); return structuredClone(row); },
  } };
  const platforms = { resolveBrandRuntimeApiKeys: async (brandId, urls) => { calls.credentials.push({ brandId, urls }); return { status: 'resolved', resolvedFrom: 'brand', apiKeys: [syntheticKey] }; } };
  const service = new SoonStudioRuntimeService(db, platforms);
  service.client = {
    submit: async (key, call) => { calls.submit.push({ key, call }); return { model: call.model, profile: call.profile, status: 'IN_PROGRESS', providerTaskId: 'provider-1', query: { path: '/v1/videos/provider-1', method: 'GET', profile: call.profile, stage: 'status' } }; },
    query: async (key, receipt) => { calls.query.push({ key, receipt }); return { ...receipt, status: 'SUCCESS', result: { url: 'https://media.example.com/result.mp4' } }; },
  };
  return { rows, calls, db, platforms, service, payload: { requestId: 'request_123456', model: model.id, profile: 'chat-completions', body: { prompt: 'synthetic input' } } };
}

test('stable brand request reservation survives concurrent submissions and never repeats the paid call', async () => {
  const h = harness();
  const [one, two] = await Promise.all([h.service.submit('brand-a', h.payload, 'user-a'), h.service.submit('brand-a', h.payload, 'user-b')]);
  await pause(); assert.equal(one.id, two.id); assert.equal(h.rows.size, 1); assert.equal(h.calls.submit.length, 1);
  const row = h.rows.get(one.id); assert.equal(row.inputJson.requestHash.length, 64); assert.equal(row.inputJson.body, undefined);
  assert.equal(JSON.stringify([...h.rows.values()]).includes(syntheticKey), false);
  const rebooted = new SoonStudioRuntimeService(h.db, h.platforms); rebooted.client = { submit: async () => { throw new Error('must not resubmit'); } };
  assert.equal((await rebooted.submit('brand-a', h.payload, 'user-a')).id, one.id);
  await assert.rejects(() => h.service.submit('brand-a', { ...h.payload, body: { prompt: 'different input' } }, 'user-a'), /请求标识/);
  assert.equal(h.calls.submit.length, 1);
});

test('missing or non-brand credentials reserve no task and make no provider request', async () => {
  for (const access of [{ status: 'brand-api-key-missing', apiKeys: [] }, { status: 'resolved', resolvedFrom: 'user', apiKeys: [syntheticKey] }]) {
    const h = harness(); h.platforms.resolveBrandRuntimeApiKeys = async () => access;
    await assert.rejects(() => h.service.submit('brand-a', h.payload, 'user-a'), /当前品牌/);
    assert.equal(h.rows.size, 0); assert.equal(h.calls.submit.length, 0);
  }
});

test('cross-brand reads and queries cannot reach credentials or the provider; refresh queries only its saved receipt', async () => {
  const h = harness(), created = await h.service.submit('brand-a', h.payload, 'user-a'); await pause();
  const count = h.calls.credentials.length;
  await assert.rejects(() => h.service.read('brand-b', created.id), /不属于/);
  await assert.rejects(() => h.service.refresh('brand-b', created.id), /不属于/);
  assert.equal(h.calls.credentials.length, count); assert.equal(h.calls.query.length, 0);
  const [first, second] = await Promise.all([h.service.refresh('brand-a', created.id), h.service.refresh('brand-a', created.id)]);
  assert.equal(first.state, 'SUCCESS'); assert.equal(second.state, 'SUCCESS');
  assert.equal(h.calls.query.length, 1); assert.equal(h.calls.submit.length, 1);
  assert.equal(h.calls.query[0].receipt.providerTaskId, 'provider-1');
  assert.equal((await h.service.read('brand-a', created.id)).mediaArchived, false);
  await h.service.refresh('brand-a', created.id); assert.equal(h.calls.query.length, 1, 'finished task must not poll or generate again');
});

test('unconfirmed submission remains UNKNOWN after reload and refresh never invents another request', async () => {
  const h = harness(); h.service.client.submit = async () => { h.calls.submit.push({}); throw new Error('unsafe upstream body ' + syntheticKey); };
  const created = await h.service.submit('brand-a', h.payload, 'user-a'); await pause();
  const result = await h.service.read('brand-a', created.id); assert.equal(result.state, 'UNKNOWN'); assert.equal(JSON.stringify(result).includes(syntheticKey), false);
  await assert.rejects(() => h.service.refresh('brand-a', created.id), /不会重新生成/);
  await h.service.submit('brand-a', h.payload, 'user-a'); assert.equal(h.calls.submit.length, 1);
  const stale = h.rows.get(created.id); stale.outputJson = null; stale.taskStatus = 'RUNNING'; stale.inputJson.workerId = 'previous-process';
  assert.equal((await h.service.read('brand-a', created.id)).state, 'UNKNOWN');
});

test('Runware native UUID is durably reserved before submission; input files and inline outputs are omitted', async () => {
  const h = harness();
  h.service.client.submit = async (key, call) => {
    const persisted = [...h.rows.values()][0];
    assert.match(call.nativeTaskId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(persisted.inputJson.nativeTaskId, call.nativeTaskId);
    assert.equal(persisted.inputJson.files, undefined);
    return { model: call.model, profile: call.profile, status: 'SUCCESS', result: { text: 'key reflected ' + key, apiKey: key, b64_json: 'sensitive-inline-bytes', image: 'data:image/png;base64,secret', url: 'https://media.example.com/file.png' } };
  };
  const created = await h.service.submit('brand-a', { ...h.payload, profile: 'runware', files: [{ fieldName: 'file', fileName: 'synthetic.png', contentType: 'image/png', dataBase64: 'c3ludGhldGlj' }] }, 'user-a'); await pause();
  const result = await h.service.read('brand-a', created.id), serialized = JSON.stringify([...h.rows.values()]);
  assert.equal(result.state, 'SUCCESS'); assert.equal(serialized.includes(syntheticKey), false); assert.equal(serialized.includes('sensitive-inline-bytes'), false); assert.equal(serialized.includes('data:image'), false); assert.equal(serialized.includes('c3ludGhldGlj'), false);
  assert.equal(result.artifactOmitted, true); assert.equal(result.resultNeedsArchive, true); assert.equal(result.deliveryState, 'INCOMPLETE');
  assert.equal(result.receipt.result.url, 'https://media.example.com/file.png');
});

test('native Runware profile alias also reserves the UUID, and the credential lookup uses the seeded API origin', async () => {
  const h = harness();
  const created = await h.service.submit('brand-a', { ...h.payload, profile: 'runware-native' }, 'user-a'); await pause();
  assert.equal(h.calls.submit[0].call.nativeTaskId, h.rows.get(created.id).inputJson.nativeTaskId);
  assert.match(h.rows.get(created.id).inputJson.nativeTaskId, /^[a-f0-9-]{36}$/);
  assert.deepEqual(h.calls.credentials[0], { brandId: 'brand-a', urls: ['https://api.soonstudio.ai'] });
});

test('catalogue browsing is bounded and does not claim inference verification', () => {
  const h = harness(), page = h.service.listModels({ limit: 10000 });
  assert(page.data.length <= 100); assert.equal(page.limit, 100); assert.equal(page.inferenceVerified, false); assert.equal(page.data.some(item => item.apiExamples), false);
  assert.equal(h.service.getModel(model.id).id, model.id); assert.equal(h.service.getModel(model.id).inferenceVerified, false);
});

test('HTTP adapter requires a real token brand and passes authenticated user identity separately from payload', async () => {
  const calls = [], auth = { resolveRequestAuthContext: async () => ({ source: 'token', userId: 'real-user', brandId: 'brand-a' }), assertBrandPermission: async (...args) => calls.push(args) };
  const runtime = { submit: async (...args) => args };
  const controller = new SoonStudioRuntimeController(auth, runtime), payload = { requestId: 'request_12345' };
  assert.deepEqual(await controller.submit({}, payload), ['brand-a', payload, 'real-user']);
  assert.equal(calls[0][1], 'personalCenter.works'); assert.equal(calls[0][2], 'edit');
  auth.resolveRequestAuthContext = async () => ({ source: 'default', userId: 'default-user', brandId: 'brand-a' });
  await assert.rejects(() => controller.submit({}, payload), /请先登录/);
});
