/** SoonStudio wire client. The caller owns brand credentials, durable tasks and polling. */
export const SOONSTUDIO_API_ORIGIN = 'https://api.soonstudio.ai';
export interface SoonStudioFormat {
  id?: string;
  method?: string;
  path?: string;
  contentType?: string;
  headers?: Record<string, string>;
  bodyTemplate?: unknown;
  requestParams?: readonly Record<string, unknown>[];
}
export interface SoonStudioModelContract {
  id: string;
  unsupportedReason?: string;
  primaryType?: string;
  endpoints?: readonly string[];
  apiExamples?: readonly SoonStudioFormat[];
  runwareNative?: {
    air?: string;
    taskType?: string;
    runnable?: boolean;
    status?: string;
    supportsAsync?: boolean;
    [key: string]: unknown;
  };
}
export type SoonStudioProfile = string;
export interface SoonStudioCall {
  model: string;
  profile: SoonStudioProfile;
  endpoint?: string;
  body: Record<string, unknown> | Record<string, unknown>[];
  nativeTaskId?: string;
  files?: Array<{ fieldName: string; fileName: string; contentType: string; dataBase64: string }>;
}
export interface SoonStudioQuery {
  path: string;
  method: 'GET' | 'POST';
  profile: SoonStudioProfile;
  stage: 'status' | 'result';
  resultPath?: string;
}
export interface SoonStudioReceipt {
  model: string;
  profile: SoonStudioProfile;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'UNKNOWN';
  providerTaskId?: string;
  query?: SoonStudioQuery;
  result?: unknown;
  reportedModel?: string;
  usage?: Record<string, unknown>;
  failure?: { code: string; httpStatus?: number };
}
export class SoonStudioInputError extends Error {
  constructor(message: string) { super(message); this.name = 'SoonStudioInputError'; }
}
const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SENSITIVE_KEY = /^(?:authorization|api[_-]?key|access[_-]?token|secret|password|credentials|base[_-]?url|headers|host)$/i;
const QUERY_ID = /\{(?:id|task_id|request_id|prediction_id|taskUUID|task_uuid)\}/g;
type Json = Record<string, any>;
const object = (value: unknown): Json => value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {};
const string = (value: unknown): string | undefined => typeof value === 'string' && value.length ? value : typeof value === 'number' ? String(value) : undefined;
function reject(message: string): never { throw new SoonStudioInputError(message); }

function safePath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\r\n#]/.test(path) || /%2f|%5c|%2e/i.test(path)) reject('Invalid official endpoint path');
  const url = new URL(path, SOONSTUDIO_API_ORIGIN);
  if (url.origin !== SOONSTUDIO_API_ORIGIN || url.username || url.password || url.pathname.includes('/../')) reject('Invalid official endpoint origin');
  for (const name of url.searchParams.keys()) if (SENSITIVE_KEY.test(name)) reject('Credentials are not allowed in endpoint query');
  return url.pathname + url.search;
}
function materialize(path: string, id: string): string {
  if (!/^[A-Za-z0-9_.:-]{1,256}$/.test(id)) reject('Invalid provider task identifier');
  const replaced = path.replace(QUERY_ID, encodeURIComponent(id));
  if (/[{}]/.test(replaced)) reject('Unresolved official query template');
  return safePath(replaced);
}
function isQuery(format: SoonStudioFormat): boolean {
  return format.method === 'GET' || (format.method === 'POST' && /^\/higgsfield\/feed\/\{(?:task_id|id)\}$/.test(format.path || ''));
}
function allowedSubmitFormats(model: SoonStudioModelContract): SoonStudioFormat[] {
  if (model.unsupportedReason) return [];
  if (model.id.includes('*') && model.id !== 'runware/*') return [];
  const native = model.endpoints?.includes('runware-native');
  if (native && (!model.runwareNative?.runnable || !model.runwareNative.air || !model.runwareNative.taskType)) return [];
  return (model.apiExamples || []).filter(format => {
    if (format.method !== 'POST' || !format.path || isQuery(format) || /[{}]/.test(format.path)) return false;
    // Some public catalogue entries have a generic Chat example despite being native media/embedding SKUs.
    if (native && format.path !== '/runware/v1') return false;
    if (format.path === '/v1/chat/completions' && (/embedding|rerank/i.test(model.id) || (model.primaryType && model.primaryType !== 'text'))) return false;
    // POST lookup and destructive actions are not inference operations.
    if (/\/task\/list|\/cancel(?:\/|$)|\/delete(?:\/|$)/i.test(format.path)) return false;
    try { safePath(format.path); return true; } catch { return false; }
  });
}
function aliasMatches(profile: string, format: SoonStudioFormat, model: SoonStudioModelContract): boolean {
  const path = format.path || '';
  const exact: Record<string, string> = {
    chat: '/v1/chat/completions', responses: '/v1/responses', anthropic: '/v1/messages',
    image: '/v1/images/generations', 'image-async': '/v1/images/generations?async=true',
    'image-edit': '/v1/images/edits', video: '/v2/videos/generations', runware: '/runware/v1',
    'minimax-v1': '/minimax/v1/video_generation', 'minimax-v2': '/minimax/v2/video_generation',
    seedance: '/seedance/v3/contents/generations/tasks', 'wan-video': '/qwen/api/v1/services/aigc/video-generation/video-synthesis',
    'kling-text': '/kling/v1/videos/text2video', 'kling-image': '/kling/v1/videos/image2video',
    'vidu-text': '/vidu/v2/text2video', 'vidu-image': '/vidu/v2/img2video', higgsfield: '/higgsfield/generate',
    embedding: '/v1/embeddings', rerank: '/v1/rerank',
  };
  if (exact[profile]) return exact[profile] === path;
  if (profile === 'fal') return (model.endpoints?.includes('fal') || model.endpoints?.includes('fal-universal')) === true && format.id === 'queue';
  if (profile === 'gemini') return /^\/v1beta\/models\/.+:generateContent$/.test(path);
  return format.id === profile;
}
export function getSoonStudioModelProfiles(model: SoonStudioModelContract): string[] {
  return [...new Set(allowedSubmitFormats(model).map(format => format.id).filter((id): id is string => !!id))];
}
function selectFormat(model: SoonStudioModelContract, call: SoonStudioCall): SoonStudioFormat {
  const candidates = allowedSubmitFormats(model).filter(format => aliasMatches(call.profile, format, model) && (!call.endpoint || format.path === call.endpoint));
  if (!candidates.length) reject('The selected model has no supported official contract for this profile');
  const paths = new Set(candidates.map(format => format.path));
  if (paths.size !== 1) reject('Choose an explicit official operation profile');
  return candidates[0];
}
function inspectPayload(value: unknown, key = '', depth = 0): void {
  if (depth > 40) reject('Payload nesting limit exceeded');
  if (SENSITIVE_KEY.test(key)) reject('Payload cannot control transport credentials or headers');
  if (typeof value === 'number' && !Number.isFinite(value)) reject('Payload contains a non-finite number');
  if (typeof value === 'function' || typeof value === 'bigint' || value === undefined) reject('Payload must be JSON');
  if (Array.isArray(value)) { for (const item of value) inspectPayload(item, '', depth + 1); }
  else if (value && typeof value === 'object') {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) reject('Payload must use plain JSON objects');
    for (const [name, item] of Object.entries(value)) inspectPayload(item, name, depth + 1);
  }
}
function bodyFor(model: SoonStudioModelContract, format: SoonStudioFormat, call: SoonStudioCall): unknown {
  inspectPayload(call.body);
  const body = JSON.parse(JSON.stringify(call.body));
  const template = Array.isArray(format.bodyTemplate) ? object(format.bodyTemplate[0]) : object(format.bodyTemplate);
  if (format.path === '/runware/v1') {
    if (!UUID_V4.test(call.nativeTaskId || '')) reject('Runware requires a pre-persisted UUIDv4 nativeTaskId');
    if (!Array.isArray(body) || body.length !== 1) reject('Runware requires exactly one native task per durable request');
    const item = object(body[0]);
    const air = model.runwareNative?.air || string(template.model);
    const taskType = model.runwareNative?.taskType || string(template.taskType);
    if (!air || air.includes('<') || !taskType) reject('Runware native AIR and taskType have not been verified');
    if (item.model !== undefined && item.model !== air) reject('Runware AIR does not match the selected model');
    if (item.taskType !== undefined && item.taskType !== taskType) reject('Runware taskType does not match the selected model');
    if (item.taskUUID !== undefined && item.taskUUID !== call.nativeTaskId) reject('Runware taskUUID must match the persisted nativeTaskId');
    item.model = air; item.taskType = taskType; item.taskUUID = call.nativeTaskId;
    if (model.runwareNative?.supportsAsync === true && item.deliveryMethod === undefined) item.deliveryMethod = 'async';
    body[0] = item;
  } else {
    if (Array.isArray(body)) reject('This official operation requires a JSON object');
    for (const name of ['model', 'model_name', 'model_name_or_path']) {
      const documented = string(template[name]);
      if (body[name] !== undefined && (documented ? body[name] !== documented && body[name] !== model.id : body[name] !== model.id)) reject('Payload model does not match the selected model contract');
      if (documented && !documented.includes('<') && body[name] === undefined) body[name] = documented;
    }
    if (body.stream === true) reject('Streaming is not supported by the durable JSON operation; use stream:false');
    if (format.path === '/v1/chat/completions' && !Array.isArray(body.messages)) reject('Chat requires messages');
    if (format.path === '/v1/responses' && body.input === undefined) reject('Responses requires input');
    if (format.path === '/minimax/v2/video_generation' && (!Array.isArray(body.content) || !body.content.some((item: Json) => item.type === 'text' && typeof item.text === 'string' && item.text.trim()))) reject('MiniMax H3 requires a non-empty text content item');
  }
  if (JSON.stringify(body).length > 20 * 1024 * 1024) reject('Native request payload exceeds the supported limit');
  return body;
}
function headersFor(model: SoonStudioModelContract, format: SoonStudioFormat, key: string): Headers {
  const headers = new Headers({ Authorization: `Bearer ${key}`, Accept: 'application/json' });
  const safe = new Set(['x-studio-channel-group', 'x-studio-request-model', 'x-dashscope-async', 'anthropic-version']);
  for (const [name, value] of Object.entries(format.headers || {})) {
    if (!safe.has(name.toLowerCase()) || /[\r\n<>]/.test(value)) continue;
    headers.set(name, value);
  }
  if (model.endpoints?.some(endpoint => endpoint === 'fal' || endpoint === 'fal-universal')) headers.set('x-studio-channel-group', 'media');
  if (format.path?.startsWith('/runware/')) {
    headers.set('x-studio-channel-group', 'runware');
    // Official native playground bills through this literal wildcard SKU; body.model is the verified AIR.
    headers.set('x-studio-request-model', 'runware/*');
  }
  if (format.path?.startsWith('/qwen/api/')) headers.set('X-DashScope-Async', 'enable');
  if (format.path === '/v1/messages' && !headers.has('anthropic-version')) headers.set('anthropic-version', '2023-06-01');
  return headers;
}
function multipart(body: unknown, files: SoonStudioCall['files']): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(object(body))) {
    if (Array.isArray(value)) {
      if (value.some(item => typeof item === 'object')) reject('Multipart object arrays require an explicit supported encoding');
      for (const item of value) form.append(name, String(item));
    } else if (value !== null && typeof value === 'object') reject('Multipart nested objects require an explicit supported encoding');
    else form.append(name, String(value));
  }
  if (!files?.length || files.length > 16) reject('This multipart operation requires 1 to 16 supplied files');
  for (const file of files) {
    if (!/^[A-Za-z_][A-Za-z0-9_.\[\]-]{0,63}$/.test(file.fieldName) || SENSITIVE_KEY.test(file.fieldName)) reject('Invalid multipart field');
    if (!/^(image|audio|video)\/[a-z0-9.+-]+$/i.test(file.contentType)) reject('Unsupported multipart MIME type');
    if (file.dataBase64.length > 14 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.dataBase64)) reject('Invalid or oversized multipart data');
    const bytes = Buffer.from(file.dataBase64, 'base64');
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) reject('Invalid or oversized multipart file');
    const filename = file.fileName.replace(/[\\/\r\n\x00-\x1f]/g, '_').slice(0,160) || 'upload';
    form.append(file.fieldName, new Blob([bytes], { type: file.contentType }), filename);
  }
  return form;
}
function sanitize(value: unknown, key: string, depth = 0): any {
  if (depth > 40) return '[depth limit]';
  if (typeof value === 'string') return value.split(key).join('[redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').replace(/sk-soon_[A-Za-z0-9_-]+/g, '[redacted]');
  if (Array.isArray(value)) return value.map(item => sanitize(item, key, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([name]) => !SENSITIVE_KEY.test(name)).map(([name, item]) => [name, sanitize(item, key, depth + 1)]));
  return value;
}
function httpCode(status: number): string {
  return status === 401 ? 'authentication_failed' : status === 403 ? 'permission_denied' : status === 402 ? 'insufficient_quota' : status === 429 ? 'rate_limited' : 'provider_http_error';
}
function providerId(value: Json, nativeTaskId?: string): string | undefined {
  const data = Array.isArray(value.data) ? object(value.data[0]) : object(value.data);
  const task = object(value.task);
  return string(value.task_id ?? value.request_id ?? value.prediction_id ?? task.task_id ?? task.id ?? data.task_id ?? data.taskUUID ?? data.id ?? value.taskUUID ?? value.id ?? (typeof value.result === 'string' && value.code ? value.result : undefined) ?? nativeTaskId);
}
function statusOf(value: Json): string {
  const data = Array.isArray(value.data) ? object(value.data[0]) : object(value.data);
  return String(value.status ?? value.state ?? value.task_status ?? object(value.task).status ?? data.status ?? data.task_status ?? '').toUpperCase();
}
function hasResult(value: Json): boolean {
  return !!(value.text || value.output_text || value.choices?.length || value.output?.length || value.candidates?.length || value.content?.length || value.content?.url || object(value.task).content?.url || value.video_url || value.audio_url || value.imageUrl || value.images?.length || value.video?.url || value.results?.length || value.urls?.length || value.creations?.length || value.answer || value.markdown || value.response || value.result && typeof value.result !== 'string' || Array.isArray(value.data) && value.data.some((item: Json) => item.url || item.b64_json || item.imageURL || item.videoURL || item.audioURL || item.embedding) || object(value.data).output || object(value.data).url || object(value.data).task_result || object(value.data).images || object(value.data).video_url);
}
function resultFor(value: Json, path: string): unknown {
  if (path === '/v1/chat/completions') return { text: value.choices?.[0]?.message?.content ?? '', choices: value.choices, finishReason: value.choices?.[0]?.finish_reason };
  if (path === '/v1/responses') return { text: value.output_text ?? (value.output || []).flatMap((item: Json) => (item.content || []).map((part: Json) => part.text || '')).join(''), output: value.output, incompleteDetails: value.incomplete_details };
  if (path === '/v1/messages') return { text: (value.content || []).filter((item: Json) => item.type === 'text').map((item: Json) => item.text).join(''), content: value.content, stopReason: value.stop_reason };
  if (/:generateContent$/.test(path)) return { text: (value.candidates || []).flatMap((item: Json) => item.content?.parts || []).map((part: Json) => part.text || '').join(''), candidates: value.candidates };
  return value;
}
function queryFormats(model: SoonStudioModelContract): SoonStudioFormat[] {
  return (model.apiExamples || []).filter(format => isQuery(format) && !!format.path);
}
function makeQuery(model: SoonStudioModelContract, format: SoonStudioFormat, id: string, profile: string): SoonStudioQuery | undefined {
  let formats = queryFormats(model);
  if (format.path?.startsWith('/kling/')) formats = formats.filter(item => item.path?.startsWith(format.path + '/'));
  if (format.path?.startsWith('/tavily/')) formats = formats.filter(item => item.path?.startsWith(format.path + '/'));
  const status = formats.find(item => /\/status(?:\?|$)/.test(item.path || '')) || formats.find(item => !/image-seed/.test(item.path || ''));
  if (!status) return undefined;
  const result = /\/status(?:\?|$)/.test(status.path || '') ? formats.find(item => item.path === status.path!.replace(/\/status(?=\?|$)/, '')) : undefined;
  return { path: materialize(status.path!, id), method: status.method as 'GET' | 'POST', profile, stage: 'status', ...(result ? { resultPath: materialize(result.path!, id) } : {}) };
}
function validateQuery(model: SoonStudioModelContract, receipt: SoonStudioReceipt): SoonStudioFormat {
  if (!receipt.providerTaskId || !receipt.query || receipt.profile !== receipt.query.profile) reject('Query requires the original model task receipt');
  if (!getSoonStudioModelProfiles(model).some(profile => profile === receipt.profile) && !allowedSubmitFormats(model).some(format => aliasMatches(receipt.profile, format, model))) reject('Receipt profile is not supported by the selected model');
  const format = queryFormats(model).find(item => item.method === receipt.query!.method && materialize(item.path!, receipt.providerTaskId!) === receipt.query!.path);
  if (!format) reject('Query path is not an official query for this model and task ID');
  if (receipt.query.resultPath && !queryFormats(model).some(item => item.method === 'GET' && materialize(item.path!, receipt.providerTaskId!) === receipt.query!.resultPath)) reject('Result path is not an official query for this model and task ID');
  if (receipt.query.method === 'POST' && !/^\/higgsfield\/feed\//.test(receipt.query.path)) reject('Only the official Higgsfield feed query may use POST');
  return format;
}
function verifyReturnedUrls(value: Json, query?: SoonStudioQuery): boolean {
  for (const name of ['status_url', 'pollUrl', 'poll_url', 'response_url']) {
    const raw = value[name];
    if (raw === undefined) continue;
    if (typeof raw !== 'string') return false;
    let parsed: URL; try { parsed = new URL(raw, SOONSTUDIO_API_ORIGIN); } catch { return false; }
    if (parsed.origin !== SOONSTUDIO_API_ORIGIN || parsed.username || parsed.password || parsed.hash) return false;
    const path = parsed.pathname + parsed.search;
    if (path !== query?.path && path !== query?.resultPath) return false;
  }
  return true;
}
function normalize(model: SoonStudioModelContract, format: SoonStudioFormat, profile: string, value: Json, key: string, nativeTaskId?: string, previous?: SoonStudioReceipt): SoonStudioReceipt {
  const id = previous?.providerTaskId || providerId(value, nativeTaskId);
  if (id && (id.includes(key) || /^sk-soon_/i.test(id) || !/^[A-Za-z0-9_.:-]{1,256}$/.test(id))) return { model: model.id, profile, status: 'UNKNOWN', failure: { code: 'invalid_provider_task_identifier' } };
  const query = previous?.query || (id ? makeQuery(model, format, id, profile) : undefined);
  const receipt: SoonStudioReceipt = { model: model.id, profile, status: 'UNKNOWN', ...(id ? { providerTaskId: id } : {}), ...(query ? { query } : {}) };
  if (!verifyReturnedUrls(value, query)) return { ...receipt, failure: { code: 'unsafe_provider_query_url' } };
  const state = statusOf(value);
  if (state === 'INCOMPLETE' || value.choices?.some((item: Json) => item.finish_reason === 'length') || value.stop_reason === 'max_tokens') return { ...receipt, status: 'FAILED', result: sanitize(resultFor(value, format.path || ''), key), failure: { code: 'incomplete_output' } };
  const hasError = value.error || (Array.isArray(value.errors) && value.errors.length) || object(value.base_resp).status_code && object(value.base_resp).status_code !== 0;
  if (/^(FAILED|FAILURE|ERROR|CANCELLED|CANCELED|REJECTED|EXPIRED)$/.test(state) || hasError) return { ...receipt, status: 'FAILED', failure: { code: 'provider_task_failed' }, ...(hasResult(value) ? { result: sanitize(value, key) } : {}) };
  if (state === 'PARTIAL') return { ...receipt, status: 'FAILED', result: sanitize(value, key), failure: { code: 'partial_result' } };
  const done = /^(SUCCESS|SUCCEEDED|COMPLETED|COMPLETE|DONE|FINISHED)$/.test(state);
  const pending = /^(IN_QUEUE|QUEUED|PENDING|IN_PROGRESS|PROCESSING|RUNNING|SUBMITTED|ACCEPTED|CREATED|WAITING)$/.test(state);
  const sync = !query && !id || /\/chat\/completions$|\/responses$|\/messages$|:generateContent$|\/tavily\/(?:search|extract|map|crawl)$/.test(format.path || '');
  if ((done || sync) && hasResult(value)) { receipt.status = 'SUCCESS'; receipt.result = sanitize(resultFor(value, format.path || ''), key); }
  else if (pending || id && query && !done) receipt.status = 'IN_PROGRESS';
  else if (done && query?.resultPath && query.stage !== 'result') receipt.status = 'IN_PROGRESS';
  else receipt.failure = { code: done ? 'completed_without_result' : 'unrecognized_provider_response' };
  if (typeof value.model === 'string') receipt.reportedModel = sanitize(value.model, key);
  if (value.usage && typeof value.usage === 'object') receipt.usage = sanitize(value.usage, key);
  return receipt;
}
export function createSoonStudioClient(catalog: readonly SoonStudioModelContract[], fetcher: typeof fetch = fetch) {
  const models = new Map(catalog.map(model => [model.id, model]));
  function getModel(id: string): SoonStudioModelContract { const model = models.get(id); if (!model) reject('Unknown SoonStudio model'); return model; }
  function validateKey(key: string): void { if (typeof key !== 'string' || !key.trim() || /[\r\n]/.test(key)) reject('A current brand API key is required'); }
  async function request(key: string, model: SoonStudioModelContract, format: SoonStudioFormat, path: string, method: 'GET' | 'POST', body?: BodyInit): Promise<{ data?: Json; failure?: SoonStudioReceipt['failure']; binary?: { contentType: string; dataBase64: string } }> {
    const headers = headersFor(model, format, key);
    if (body && !(body instanceof FormData)) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetcher(SOONSTUDIO_API_ORIGIN + safePath(path), { method, headers, ...(body ? { body } : {}), redirect: 'error', signal: AbortSignal.timeout(180_000) });
      if (!response.ok) { try { await response.body?.cancel(); } catch {} return { failure: { code: httpCode(response.status), httpStatus: response.status } }; }
      const length = Number(response.headers.get('content-length') || 0);
      if (length > MAX_RESPONSE_BYTES) { await response.body?.cancel(); return { failure: { code: 'response_too_large' } }; }
      const reader = response.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      if (reader) while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); return { failure: { code: 'response_too_large' } }; } chunks.push(value); }
      const bytes = Buffer.concat(chunks); const contentType = (response.headers.get('content-type') || '').split(';')[0];
      if (/^(audio|video|image)\//.test(contentType)) return { binary: { contentType, dataBase64: bytes.toString('base64') } };
      try { const data = JSON.parse(bytes.toString('utf8')); if (!data || typeof data !== 'object') return { failure: { code: 'invalid_provider_json' } }; return { data: Array.isArray(data) ? { data } : data }; } catch { return { failure: { code: 'invalid_provider_json' } }; }
    } catch { return { failure: { code: 'transport_outcome_unknown' } }; }
  }
  const client = {
    async submit(apiKey: string, call: SoonStudioCall): Promise<SoonStudioReceipt> {
      validateKey(apiKey); const model = getModel(call.model); const format = selectFormat(model, call);
      const body = bodyFor(model, format, call); const isMultipart = /multipart/i.test(format.contentType || '');
      if (!isMultipart && call.files?.length) reject('Files are only accepted by an official multipart contract');
      const encoded = isMultipart ? multipart(body, call.files) : JSON.stringify(body);
      const response = await request(apiKey, model, format, format.path!, 'POST', encoded);
      if (response.binary) return { model: model.id, profile: call.profile, status: 'SUCCESS', result: response.binary };
      if (response.failure) {
        const query = call.nativeTaskId ? makeQuery(model, format, call.nativeTaskId, call.profile) : undefined;
        return { model: model.id, profile: call.profile, status: response.failure.httpStatus && response.failure.httpStatus < 500 ? 'FAILED' : 'UNKNOWN', ...(call.nativeTaskId ? { providerTaskId: call.nativeTaskId } : {}), ...(query ? { query } : {}), failure: response.failure };
      }
      return normalize(model, format, call.profile, response.data!, apiKey, call.nativeTaskId);
    },
    async query(apiKey: string, original: SoonStudioReceipt): Promise<SoonStudioReceipt> {
      validateKey(apiKey); const model = getModel(original.model); const format = validateQuery(model, original);
      const receipt = { ...original, query: { ...original.query! } };
      const response = await request(apiKey, model, format, receipt.query.path, receipt.query.method, receipt.query.method === 'POST' ? JSON.stringify({ task_id: receipt.providerTaskId }) : undefined);
      if (response.failure) return { ...receipt, status: 'UNKNOWN', failure: response.failure };
      if (response.binary) return { ...receipt, status: 'SUCCESS', result: response.binary, failure: undefined };
      const normalized = normalize(model, format, receipt.profile, response.data!, apiKey, undefined, receipt);
      if (/^(COMPLETED|SUCCESS|SUCCEEDED)$/.test(statusOf(response.data!)) && normalized.status !== 'FAILED' && !normalized.failure && receipt.query.resultPath && receipt.query.stage !== 'result') {
        return client.query(apiKey, { ...normalized, query: { ...receipt.query, path: receipt.query.resultPath, resultPath: undefined, method: 'GET', stage: 'result' } });
      }
      // A result endpoint is a synchronous read of a completed queue job, even when it omits status.
      if (receipt.query.stage === 'result' && normalized.status !== 'FAILED' && !normalized.failure && hasResult(response.data!)) return { ...normalized, status: 'SUCCESS', result: sanitize(response.data, apiKey) };
      return normalized;
    },
  };
  return client;
}
