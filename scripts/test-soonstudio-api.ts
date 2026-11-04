/** No credentials or paid network calls: exercise actual fetch Request and multipart encoding. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createSoonStudioClient, getSoonStudioModelProfiles, SoonStudioInputError,
  type SoonStudioModelContract, type SoonStudioReceipt,
} from '../apps/server/src/modules/third-party-platforms/soonstudio-api.ts';

const KEY = 'sk-soon_test-not-a-real-credential';
const UUID = 'a8b7a866-a1b4-48d4-8b14-92214c682ad3';
const data = JSON.parse(readFileSync(new URL('../apps/server/src/common/soonstudio-models.json', import.meta.url), 'utf8'));
const catalog = data.models as SoonStudioModelContract[];
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
function fake(responses: Array<Response | Error | ((request: Request) => Response | Promise<Response>)>, models = catalog) {
  const requests: Request[] = [];
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init); requests.push(request);
    const response = responses.shift();
    if (!response) throw new Error('Unexpected extra request');
    if (response instanceof Error) throw response;
    return typeof response === 'function' ? await response(request) : response;
  };
  return { client: createSoonStudioClient(models, fetcher as typeof fetch), requests };
}
const find = (id: string) => { const found = catalog.find(item => item.id === id); assert.ok(found, id); return found; };

test('catalogue profiles expose verified operations and reject all explicitly unsupported SKUs', () => {
  assert.equal(catalog.length, 1596);
  for (const item of catalog.filter(model => model.unsupportedReason)) assert.deepEqual(getSoonStudioModelProfiles(item), []);
  assert.deepEqual(getSoonStudioModelProfiles(find('gpt-5')), ['responses']);
  assert.ok(getSoonStudioModelProfiles(find('gpt-image-2.5-sunburst')).includes('generations'));
  assert.ok(getSoonStudioModelProfiles(find('MiniMax-H3')).includes('minimax-h3-t2v'));
});
test('Chat uses exact chosen model and preserves caller output limits without copying demo defaults', async () => {
  const model = catalog.find(item => getSoonStudioModelProfiles(item).includes('openai') && item.primaryType === 'text')!;
  const { client, requests } = fake([json({ id: 'chat1', model: model.id, choices: [{ message: { content: '正文' }, finish_reason: 'stop' }], usage: { total_tokens: 9 } })]);
  const receipt = await client.submit(KEY, { model: model.id, profile: 'openai', body: { messages: [{ role: 'user', content: '测试' }], max_tokens: 65536 } });
  assert.equal(receipt.status, 'SUCCESS'); assert.equal((receipt.result as any).text, '正文');
  assert.equal(requests[0].url, 'https://api.soonstudio.ai/v1/chat/completions');
  const body = await requests[0].json(); assert.equal(body.model, model.id); assert.equal(body.max_tokens, 65536); assert.ok(!('stop' in body));
  assert.equal(requests[0].headers.get('authorization'), `Bearer ${KEY}`); assert.equal(requests[0].redirect, 'error');
});
test('GPT5 Responses uses native input, never Chat fallback', async () => {
  const { client, requests } = fake([json({ id: 'r1', status: 'completed', output: [{ content: [{ type: 'output_text', text: '完整回答' }] }] })]);
  const receipt = await client.submit(KEY, { model: 'gpt-5', profile: 'responses', body: { input: 'hello' } });
  assert.equal(receipt.status, 'SUCCESS'); assert.equal((receipt.result as any).text, '完整回答');
  assert.match(requests[0].url, /\/v1\/responses$/);
  await assert.rejects(client.submit(KEY, { model: 'gpt-5', profile: 'chat', body: { messages: [] } }), SoonStudioInputError);
  assert.equal(requests.length, 1);
});
test('GPT Image2.5 synchronous JSON cannot silently become async', async () => {
  const { client, requests } = fake([json({ created: 1, data: [{ url: 'https://cdn.example/image.png' }] })]);
  const receipt = await client.submit(KEY, { model: 'gpt-image-2.5-sunburst', profile: 'generations', body: { prompt: 'hello', quality: 'max' } });
  assert.equal(receipt.status, 'SUCCESS'); assert.equal(requests[0].url, 'https://api.soonstudio.ai/v1/images/generations');
  await assert.rejects(client.submit(KEY, { model: 'gpt-image-2.5-sunburst', profile: 'image-async', body: { prompt: 'hello' } }), SoonStudioInputError);
});
test('multipart edit uses real FormData files and the exact official endpoint', async () => {
  const { client, requests } = fake([json({ data: [{ b64_json: 'aW1hZ2U=' }] })]);
  const receipt = await client.submit(KEY, { model: 'gpt-image-2.5-sunburst', profile: 'edits', body: { prompt: 'edit', size: '1024x1024' }, files: [{ fieldName: 'image', fileName: 'a.png', contentType: 'image/png', dataBase64: Buffer.from('PNG').toString('base64') }] });
  assert.equal(receipt.status, 'SUCCESS'); assert.match(requests[0].headers.get('content-type')!, /^multipart\/form-data; boundary=/);
  const form = await requests[0].formData(); assert.equal(form.get('model'), 'gpt-image-2.5-sunburst');
  assert.equal(await (form.get('image') as File).text(), 'PNG');
});
test('image async task queries its original identifier and actual result', async () => {
  const { client, requests } = fake([json({ task_id: 'img123', status: 'IN_PROGRESS' }), json({ status: 'SUCCESS', data: [{ url: 'https://cdn.example/final.png' }] })]);
  const first = await client.submit(KEY, { model: 'grok-imagine-image-2.0', profile: 'generations', body: { prompt: 'hello' } });
  assert.equal(first.status, 'IN_PROGRESS'); assert.equal(first.query?.path, '/v1/images/tasks/img123');
  const final = await client.query(KEY, first); assert.equal(final.status, 'SUCCESS');
  assert.deepEqual(requests.map(item => item.method), ['POST','GET']);
});
test('MiniMax H3 submits content array and queries V2 only', async () => {
  const { client, requests } = fake([json({ task_id: 'm123', status: 'pending' }), json({ task: { status: 'succeeded', content: { url: 'https://cdn.example/final.mp4' } } })]);
  const first = await client.submit(KEY, { model: 'MiniMax-H3', profile: 'minimax-h3-t2v', body: { content: [{ type: 'text', text: 'A cleaner moving' }], ratio: '16:9', duration: 5 } });
  assert.equal(first.query?.path, '/minimax/v2/query/video_generation/m123');
  assert.equal((await client.query(KEY, first)).status, 'SUCCESS');
  assert.equal((await requests[0].json()).model, 'MiniMax-H3');
});
for (const [id, profile, expected] of [
  ['kling-video-v2-6','kling-official-i2v','/kling/v1/videos/image2video/k1'],
  ['viduq3-turbo','vidu-official-t2v','/vidu/v2/tasks/k1/creations'],
  ['doubao-seedance-2.5','seedance-official-t2v','/seedance/v3/contents/generations/tasks/k1'],
  ['wanx2.1-t2v-turbo','wan-official','/qwen/api/v1/tasks/k1'],
  ['fashn-tryon-max','fashn-official-run','/fashn-official/v1/status/k1'],
] as const) test(`${id} keeps native operation and query contract`, async () => {
  const { client, requests } = fake([json({ task_id: 'k1' })]);
  const first = await client.submit(KEY, { model: id, profile, body: { prompt: 'native input' } });
  assert.equal(first.query?.path, expected);
  if (id.startsWith('wan')) assert.equal(requests[0].headers.get('x-dashscope-async'), 'enable');
});
test('FAL uses native unwrapped payload and two GETs for completed status and result', async () => {
  const { client, requests } = fake([
    json({ request_id: 'f123', status_url: 'https://api.soonstudio.ai/flux-2-max/requests/f123/status', response_url: 'https://api.soonstudio.ai/flux-2-max/requests/f123' }),
    json({ status: 'COMPLETED' }), json({ images: [{ url: 'https://cdn.example/a.png' }] }),
  ]);
  const first = await client.submit(KEY, { model: 'flux-2-max', profile: 'queue', body: { prompt: 'native' } });
  const body = await requests[0].json(); assert.equal(body.prompt, 'native'); assert.ok(!('input' in body)); assert.ok(!('model' in body));
  assert.equal(requests[0].headers.get('x-studio-channel-group'), 'media');
  const final = await client.query(KEY, first); assert.equal(final.status, 'SUCCESS');
  assert.deepEqual(requests.map(item => item.method), ['POST','GET','GET']);
});
test('foreign status URL never receives the brand credential', async () => {
  const { client, requests } = fake([json({ request_id: 'f123', status_url: 'https://queue.fal.run/requests/f123' })]);
  const receipt = await client.submit(KEY, { model: 'flux-2-max', profile: 'queue', body: { prompt: 'native' } });
  assert.equal(receipt.status, 'UNKNOWN'); assert.equal(receipt.failure?.code, 'unsafe_provider_query_url'); assert.equal(requests.length, 1);
});
test('Runware uses verified AIR, billing headers and pre-persisted native UUID', async () => {
  const model = find('runware/ace-step-v1-5-base');
  const { client, requests } = fake([json({ data: [{ taskUUID: UUID, status: 'processing' }] }), json({ data: [{ taskUUID: UUID, status: 'success', audioURL: 'https://cdn.example/music.mp3' }] })]);
  const receipt = await client.submit(KEY, { model: model.id, profile: 'runware-native', nativeTaskId: UUID, body: [{ positivePrompt: 'music', duration: 30 }] });
  const body = await requests[0].json(); assert.equal(body[0].model, model.runwareNative!.air); assert.equal(body[0].taskUUID, UUID); assert.equal(body[0].taskType, 'audioInference');
  assert.equal(requests[0].headers.get('x-studio-request-model'), 'runware/*'); assert.equal(requests[0].headers.get('x-studio-channel-group'), 'runware');
  assert.equal((await client.query(KEY, receipt)).status, 'SUCCESS');
});
test('Runware uncertain POST remains recoverable by native UUID without resubmitting', async () => {
  const { client, requests } = fake([new Error(`network failed with ${KEY}`), json({ data: [{ taskUUID: UUID, status: 'success', audioURL: 'https://cdn.example/music.mp3' }] })]);
  const receipt = await client.submit(KEY, { model: 'runware/ace-step-v1-5-base', profile: 'runware', nativeTaskId: UUID, body: [{ positivePrompt: 'music' }] });
  assert.equal(receipt.status, 'UNKNOWN'); assert.equal(receipt.providerTaskId, UUID); assert.ok(receipt.query); assert.ok(!JSON.stringify(receipt).includes(KEY));
  assert.equal((await client.query(KEY, receipt)).status, 'SUCCESS'); assert.deepEqual(requests.map(item => item.method), ['POST','GET']);
});
test('Runware mismatch and absent UUID cannot create a paid request', async () => {
  const { client, requests } = fake([]);
  await assert.rejects(client.submit(KEY, { model: 'runware/ace-step-v1-5-base', profile: 'runware', body: [{ positivePrompt: 'music' }] }), SoonStudioInputError);
  await assert.rejects(client.submit(KEY, { model: 'runware/ace-step-v1-5-base', profile: 'runware', nativeTaskId: UUID, body: [{ model: 'other-air' }] }), SoonStudioInputError);
  assert.equal(requests.length, 0);
});
test('Higgsfield feed is the only allowed POST query and never repeats generation', async () => {
  const model: SoonStudioModelContract = { id: 'test-higgsfield', apiExamples: [
    { id: 'higgsfield', method: 'POST', path: '/higgsfield/generate', bodyTemplate: { model: 'test-higgsfield' } },
    { id: 'query', method: 'POST', path: '/higgsfield/feed/{task_id}' },
  ] };
  const { client, requests } = fake([json({ task_id: 'h123' }), json({ status: 'completed', video_url: 'https://cdn.example/final.mp4' })], [model]);
  const receipt = await client.submit(KEY, { model: model.id, profile: 'higgsfield', body: { prompt: 'test' } });
  assert.equal((await client.query(KEY, receipt)).status, 'SUCCESS'); assert.equal(requests[1].url, 'https://api.soonstudio.ai/higgsfield/feed/h123');
  assert.deepEqual(await requests[1].json(), { task_id: 'h123' });
});
test('Tavily search sends native query without injecting catalog billing ID', async () => {
  const { client, requests } = fake([json({ results: [{ url: 'https://example.com', content: 'fact' }] })]);
  assert.equal((await client.submit(KEY, { model: 'tavily-search', profile: 'tavily-search', body: { query: 'research topic' } })).status, 'SUCCESS');
  assert.deepEqual(await requests[0].json(), { query: 'research topic' });
});
test('binary TTS preserves the actual response bytes for asset storage', async () => {
  const model = catalog.find(item => item.apiExamples?.some(format => format.path === '/v1/audio/speech'))!;
  const { client } = fake([new Response(new Uint8Array([1,2,3]), { headers: { 'content-type': 'audio/mpeg' } })]);
  const receipt = await client.submit(KEY, { model: model.id, profile: 'tts', body: { input: 'hello', voice: 'alloy' } });
  assert.deepEqual(receipt.result, { contentType: 'audio/mpeg', dataBase64: 'AQID' });
});
test('model substitution, arbitrary routes, credential/header controls and forged query IDs fail before fetch', async () => {
  const { client, requests } = fake([]);
  for (const body of [{ model: 'different', input: 'x' }, { input: 'x', headers: { Authorization: 'stolen' } }, { input: 'x', api_key: 'other' }, { input: 'x', baseURL: 'https://evil.example' }]) await assert.rejects(client.submit(KEY, { model: 'gpt-5', profile: 'responses', body }), SoonStudioInputError);
  await assert.rejects(client.submit(KEY, { model: 'gpt-5', profile: 'responses', endpoint: 'https://evil.example', body: { input: 'x' } }), SoonStudioInputError);
  const forged: SoonStudioReceipt = { model: 'flux-2-max', profile: 'queue', status: 'IN_PROGRESS', providerTaskId: 'owned', query: { path: '/flux-2-max/requests/not-owned/status', method: 'GET', profile: 'queue', stage: 'status' } };
  await assert.rejects(client.query(KEY, forged), SoonStudioInputError); assert.equal(requests.length, 0);
});
test('HTTP rejection is sanitized and does not cause a retry or model fallback', async () => {
  const { client, requests } = fake([json({ error: `bad ${KEY}` }, 429)]);
  const receipt = await client.submit(KEY, { model: 'gpt-5', profile: 'responses', body: { input: 'hello' } });
  assert.equal(receipt.status, 'FAILED'); assert.equal(receipt.failure?.code, 'rate_limited'); assert.equal(requests.length, 1); assert.ok(!JSON.stringify(receipt).includes(KEY));
});
test('provider failure/partial/unknown progress cannot claim a finished result', async () => {
  const { client } = fake([json({ task_id: 'f', status: 'FAILURE' }), json({ task_id: 'p', status: 'partial', images: [{ url: 'https://cdn.example/partial.png' }] }), json({ task_id: 'u', progress: 100 })]);
  const call = { model: 'flux-2-max', profile: 'queue', body: { prompt: 'native' } };
  assert.equal((await client.submit(KEY, call)).status, 'FAILED');
  const partial = await client.submit(KEY, call); assert.equal(partial.status, 'FAILED'); assert.equal(partial.failure?.code, 'partial_result');
  assert.notEqual((await client.submit(KEY, call)).status, 'SUCCESS');
});
test('truncated model output remains a failed partial result rather than a complete answer', async () => {
  const { client } = fake([json({ id: 'r1', status: 'incomplete', output: [{ content: [{ text: 'partial' }] }], incomplete_details: { reason: 'max_output_tokens' } })]);
  const receipt = await client.submit(KEY, { model: 'gpt-5', profile: 'responses', body: { input: 'hello' } });
  assert.equal(receipt.status, 'FAILED'); assert.equal(receipt.failure?.code, 'incomplete_output'); assert.equal((receipt.result as any).text, 'partial');
});
test('provider accidentally echoing a credential as its ID never persists the credential', async () => {
  const { client } = fake([json({ task_id: KEY })]);
  const receipt = await client.submit(KEY, { model: 'flux-2-max', profile: 'queue', body: { prompt: 'native' } });
  assert.equal(receipt.status, 'UNKNOWN'); assert.ok(!JSON.stringify(receipt).includes(KEY));
});
