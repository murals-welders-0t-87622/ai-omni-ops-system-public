const { mkdir, readFile, writeFile } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const API_BASE = normalizeBaseUrl(process.env.S205_API_BASE_URL || "http://127.0.0.1:23011/api");
const WEB_BASE = normalizeBaseUrl(process.env.S205_WEB_BASE_URL || "http://127.0.0.1:23001");
const BRAND_ID = process.env.S205_BRAND_ID || "brand-demo-cleaning";
const RUN_ID = process.env.S205_RUN_ID || `S205REG${Date.now()}`;
const SAMPLE_DIR = process.env.S205_SAMPLE_DIR || join(tmpdir(), "ai-omni-s2-05-regression");
const OCR_SAMPLE = process.env.S205_OCR_SAMPLE || "D:\\workbuddy-test-runtime\\ai-omni-ontology-lab\\ocr-regression\\s2-05-ocr-T760-TESTOCR123.png";
const ASR_SAMPLE = process.env.S205_ASR_SAMPLE || "D:\\workbuddy-test-runtime\\ai-omni-ontology-lab\\asr-regression\\s2-05-asr-whisper-small-T760.mp4";
const INSTALL_TOKEN = process.env.OPENCLAW_INSTALL_TOKEN || process.env.S205_OPENCLAW_INSTALL_TOKEN || "";
const RUN_MEDIA_REGRESSION = process.env.S205_RUN_MEDIA_REGRESSION === "1";

const SOURCE_CASES = [
  { source: "抖音/视频号", workspaceScope: "douyin", keyword: `${RUN_ID}_DY` },
  { source: "小红书", workspaceScope: "xiaohongshu", keyword: `${RUN_ID}_XHS` },
  { source: "公众号", workspaceScope: "wechat", keyword: `${RUN_ID}_WX` },
  { source: "用户上传", workspaceScope: "douyin", originKind: "user_upload", sourceKind: "material_library_upload", keyword: `${RUN_ID}_USER` },
];

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    runId: RUN_ID,
    message: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});

async function main() {
  const results = [];
  await assertHealth();
  results.push(await verifyTextSourceCases());
  results.push(await verifyMultipartUpload(`${RUN_ID}_DIRECT`, API_BASE));
  results.push(await verifyMultipartUpload(`${RUN_ID}_WEB`, `${WEB_BASE}/api`));
  results.push(await verifyTaskReuseEvidenceLink());
  results.push(await verifyMcpToolsList());
  results.push(await verifyKnownOcrSearch());
  results.push(await verifyKnownAsrSearch());
  if (RUN_MEDIA_REGRESSION) {
    results.push(await verifyOcrRegistration());
    results.push(await verifyAsrRegistration());
  }
  results.push(await verifyMcpSearchIfToken());

  console.log(JSON.stringify({
    ok: true,
    runId: RUN_ID,
    apiBase: API_BASE,
    webBase: WEB_BASE,
    brandId: BRAND_ID,
    results,
  }, null, 2));
}

async function assertHealth() {
  const payload = await getJson(`${API_BASE}/health`);
  if (payload.status !== "ok") {
    throw new Error(`Lab health check failed: ${JSON.stringify(payload)}`);
  }
}

async function verifyTextSourceCases() {
  const checks = [];
  for (const item of SOURCE_CASES) {
    const originKind = item.originKind || "manual_external";
    const sourceKind = item.sourceKind || "ai_control_center_upload";
    const payload = {
      brandId: BRAND_ID,
      source: "creative_material",
      originKind,
      sourceKind,
      workspaceScope: item.workspaceScope,
      title: `S2-05回归_${item.source}_${item.keyword}`,
      materialType: "文字",
      materialTags: [item.source, "文字", item.keyword],
      textContent: `S2-05 asset archive regression ${item.keyword}`,
      confirmNoGeneration: true,
      idempotencyKey: `${BRAND_ID}:s2-05-regression:text:${item.keyword}`,
    };
    const registered = await postJson(`${API_BASE}/ai-control/assets/archive-registration`, payload);
    assertOk(registered.ok, `text registration failed for ${item.keyword}`);
    const searched = await searchArchive({ materialType: "文字", materialSource: item.source, keyword: item.keyword });
    assertEqual(searched.total, 1, `text search failed for ${item.keyword}`);
    checks.push({
      source: item.source,
      keyword: item.keyword,
      recordId: searched.items[0]?.id,
      title: searched.items[0]?.title,
    });
  }
  return { name: "text_source_search", ok: true, checks };
}

async function verifyMultipartUpload(keyword, baseUrl) {
  await mkdir(SAMPLE_DIR, { recursive: true });
  const samplePath = join(SAMPLE_DIR, `${keyword}.txt`);
  await writeFile(samplePath, `S2-05 multipart regression ${keyword}\n`, "utf8");
  const file = await readFile(samplePath);
  const form = new FormData();
  appendFields(form, {
    brandId: BRAND_ID,
    source: "creative_material",
    originKind: "user_upload",
    sourceKind: "material_library_upload",
    workspaceScope: "douyin",
    title: `S2-05 multipart regression ${keyword}`,
    materialType: "文字",
    materialTags: ["用户上传", "文字", keyword],
    confirmNoGeneration: true,
    idempotencyKey: `${BRAND_ID}:s2-05-regression:multipart:${keyword}`,
  });
  form.append("file", new Blob([file], { type: "text/plain" }), `${keyword}.txt`);
  const registered = await postForm(`${baseUrl}/ai-control/assets/archive-registration/upload`, form);
  assertOk(registered.ok && registered.uploadMode === "multipart", `multipart registration failed for ${keyword}`);
  const searched = await searchArchive({ materialType: "文字", materialSource: "用户上传", keyword }, baseUrl);
  assertEqual(searched.total, 1, `multipart search failed for ${keyword}`);
  const link = searched.items[0]?.links?.source;
  const response = await fetch(link);
  assertEqual(response.status, 200, `multipart file link failed for ${keyword}`);
  return {
    name: baseUrl.includes("23001") ? "multipart_web_proxy" : "multipart_server",
    ok: true,
    keyword,
    recordId: searched.items[0]?.id,
    storageKey: searched.items[0]?.storageKey,
    tags: searched.items[0]?.materialTags || [],
    linkStatus: response.status,
  };
}

async function verifyMcpToolsList() {
  const payload = await postJson(`${API_BASE}/ai-control-center/mcp`, {
    jsonrpc: "2.0",
    id: `s2-05-tools-list-${RUN_ID}`,
    method: "tools/list",
    params: {},
  });
  if (payload?.error) {
    throw new Error(`MCP tools/list failed: ${JSON.stringify(payload.error)}`);
  }
  const tools = Array.isArray(payload?.result?.tools) ? payload.result.tools : [];
  const names = new Set(tools.map((tool) => tool?.name).filter(Boolean));
  const required = [
    "search_ai_control_center_asset_archive",
    "record_ai_control_center_material_reuse_evidence",
  ];
  for (const name of required) {
    assertOk(names.has(name), `MCP tools/list missing ${name}`);
  }
  return {
    name: "mcp_tools_list",
    ok: true,
    toolCount: tools.length,
    required,
  };
}

async function verifyTaskReuseEvidenceLink() {
  const taskId = `task_s205_reuse_${safeId(RUN_ID)}`;
  const createTask = await postJson(`${API_BASE}/workflow-core/handlers/create_task`, {
    schema_version: "1.0.0",
    command_id: taskId,
    idempotency_key: `${BRAND_ID}:s2-05-regression:task:${RUN_ID}`,
    brand_id: BRAND_ID,
    goal: `S2-05素材复用证据回归 ${RUN_ID}`,
    scope_end: "验证素材检索结果可以绑定回任务阶段治理账本",
    route_hint: "stage-4-content-execution",
    source_refs: [],
  });
  assertOk(createTask.ok, "task creation failed for material reuse evidence regression");
  const stageRunId = createTask.payload?.stage_run_id;
  assertOk(stageRunId, "task creation did not return stage_run_id");

  const searched = await searchArchive({ materialType: "文字", materialSource: "用户上传", keyword: RUN_ID });
  assertOk(searched.total >= 1, "no registered user-upload material found for reuse evidence regression");
  const material = searched.items[0];
  const reuse = await postJson(`${API_BASE}/ai-control/assets/reuse-evidence`, {
    brandId: BRAND_ID,
    taskId,
    stageRunId,
    actionName: "select_reference_material",
    actionLabel: "选择复用素材",
    subjectKind: "skill",
    subjectId: "s2-05-regression-agent",
    invocationId: `s2_05_reuse_${safeId(RUN_ID)}`,
    attemptNo: 1,
    usageNote: "S2-05回归脚本验证素材搜索结果可写入任务治理证据",
    materialRefs: [{
      source: material.source,
      id: material.id,
      title: material.title,
      usageRole: "reference",
      selectedReason: `matched ${RUN_ID}`,
    }],
    idempotencyKey: `${BRAND_ID}:s2-05-regression:reuse:${RUN_ID}`,
    confirmEvidenceOnly: true,
  });
  assertOk(reuse.ok && reuse.evidenceOnly === true && reuse.generated === false, "reuse evidence write failed");

  const detail = await getJson(`${API_BASE}/workflow-core/tasks/${encodeURIComponent(taskId)}/governance-detail`);
  assertOk(detail.ok && detail.payload?.found === true, "task governance detail not found after reuse evidence write");
  const evidenceRefs = flattenEvidenceRefs(detail.payload?.execution_events || []);
  assertOk(evidenceRefs.some((item) => item?.kind === "ai_control_center_material_reuse"), "governance detail missing material reuse summary evidence");
  assertOk(evidenceRefs.some((item) => item?.kind === "asset_archive_item"), "governance detail missing asset archive item evidence");

  const events = await getJson(`${API_BASE}/workflow-core/tasks/${encodeURIComponent(taskId)}/execution-events?stageRunId=${encodeURIComponent(stageRunId)}&limit=10`);
  assertOk(events.ok && events.payload?.total >= 1, "execution events list missing reuse evidence event");

  return {
    name: "task_reuse_evidence_link",
    ok: true,
    taskId,
    stageRunId,
    material: pickItem(material),
    eventId: reuse.event?.payload?.event_id,
    evidenceKinds: Array.from(new Set(evidenceRefs.map((item) => item?.kind).filter(Boolean))),
  };
}

async function verifyKnownOcrSearch() {
  const searched = await searchArchive({ materialType: "图片", materialSource: "用户上传", keyword: "TESTOCR123" });
  if (searched.total < 1) {
    return {
      name: "known_ocr_search",
      ok: true,
      total: searched.total,
      skipped: "未找到 TESTOCR123 既有图片 OCR 回归素材；可设置 S205_RUN_MEDIA_REGRESSION=1 创建新样本",
      first: null,
    };
  }
  return {
    name: "known_ocr_search",
    ok: true,
    total: searched.total,
    first: pickItem(searched.items[0]),
  };
}

async function verifyKnownAsrSearch() {
  const searched = await searchArchive({ materialType: "视频", materialSource: "用户上传", keyword: "ASR:whisper" });
  if (searched.total < 1) {
    return {
      name: "known_asr_search",
      ok: true,
      total: searched.total,
      skipped: "未找到 ASR:whisper 既有视频 ASR 回归素材；可设置 S205_RUN_MEDIA_REGRESSION=1 创建新样本",
      first: null,
    };
  }
  return {
    name: "known_asr_search",
    ok: true,
    total: searched.total,
    first: pickItem(searched.items[0]),
  };
}

async function verifyOcrRegistration() {
  if (!existsSync(OCR_SAMPLE)) {
    return { name: "ocr_registration", ok: true, skipped: `OCR sample not found: ${OCR_SAMPLE}` };
  }
  const keyword = `${RUN_ID}_OCR`;
  const form = new FormData();
  appendFields(form, {
    brandId: BRAND_ID,
    source: "creative_material",
    originKind: "user_upload",
    sourceKind: "material_library_upload",
    workspaceScope: "douyin",
    title: `S2-05 OCR regression ${keyword}`,
    materialType: "图片",
    materialTags: ["用户上传", "图片", keyword],
    confirmNoGeneration: true,
    idempotencyKey: `${BRAND_ID}:s2-05-regression:ocr:${keyword}`,
  });
  const buffer = await readFile(OCR_SAMPLE);
  form.append("file", new Blob([buffer], { type: "image/png" }), `${keyword}.png`);
  const registered = await postForm(`${API_BASE}/ai-control/assets/archive-registration/upload`, form);
  assertOk(registered.ok, "OCR registration failed");
  const searched = await searchArchive({ materialType: "图片", materialSource: "用户上传", keyword });
  assertEqual(searched.total, 1, "OCR registration search failed");
  return { name: "ocr_registration", ok: true, keyword, first: pickItem(searched.items[0]) };
}

async function verifyAsrRegistration() {
  if (!existsSync(ASR_SAMPLE)) {
    return { name: "asr_registration", ok: true, skipped: `ASR sample not found: ${ASR_SAMPLE}` };
  }
  const keyword = `${RUN_ID}_ASR`;
  const form = new FormData();
  appendFields(form, {
    brandId: BRAND_ID,
    source: "creative_material",
    originKind: "user_upload",
    sourceKind: "material_library_upload",
    workspaceScope: "douyin",
    title: `S2-05 ASR regression ${keyword}`,
    materialType: "视频",
    materialTags: ["用户上传", "视频", keyword],
    confirmNoGeneration: true,
    idempotencyKey: `${BRAND_ID}:s2-05-regression:asr:${keyword}`,
  });
  const buffer = await readFile(ASR_SAMPLE);
  form.append("file", new Blob([buffer], { type: "video/mp4" }), `${keyword}.mp4`);
  const registered = await postForm(`${API_BASE}/ai-control/assets/archive-registration/upload`, form);
  assertOk(registered.ok, "ASR registration failed");
  const searched = await searchArchive({ materialType: "视频", materialSource: "用户上传", keyword });
  assertEqual(searched.total, 1, "ASR registration search failed");
  return { name: "asr_registration", ok: true, keyword, first: pickItem(searched.items[0]) };
}

async function verifyMcpSearchIfToken() {
  if (!INSTALL_TOKEN) {
    return { name: "mcp_tools_call", ok: true, skipped: "OPENCLAW_INSTALL_TOKEN/S205_OPENCLAW_INSTALL_TOKEN 未设置，跳过 MCP tools/call" };
  }

  const taskId = `task_s205_mcp_${safeId(RUN_ID)}`;
  const createTask = await postJson(`${API_BASE}/workflow-core/handlers/create_task`, {
    schema_version: "1.0.0",
    command_id: taskId,
    idempotency_key: `${BRAND_ID}:s2-05-regression:mcp-task:${RUN_ID}`,
    brand_id: BRAND_ID,
    goal: `S2-05 MCP素材复用证据回归 ${RUN_ID}`,
    scope_end: "验证 MCP tools/call 可完成素材检索和复用证据记账",
    route_hint: "stage-4-content-execution",
    source_refs: [],
  });
  assertOk(createTask.ok, "MCP regression task creation failed");
  const stageRunId = createTask.payload?.stage_run_id;
  assertOk(stageRunId, "MCP regression task creation did not return stage_run_id");

  const search = await callMcpTool("search_ai_control_center_asset_archive", {
    materialType: "文字",
    materialSource: "用户上传",
    keyword: RUN_ID,
    limit: 5,
  });
  const items = Array.isArray(search?.data?.items) ? search.data.items : [];
  assertOk(items.length >= 1, "MCP search returned no material items");
  const material = items[0];

  const reuse = await callMcpTool("record_ai_control_center_material_reuse_evidence", {
    taskId,
    stageRunId,
    actionName: "select_reference_material",
    actionLabel: "选择复用素材",
    subjectKind: "skill",
    subjectId: "s2-05-mcp-regression-agent",
    invocationId: `s2_05_mcp_${safeId(RUN_ID)}`,
    attemptNo: 1,
    usageNote: "S2-05回归脚本验证 MCP tools/call 可写入素材复用证据",
    materialRefs: [{
      evidenceTable: material.evidence?.table,
      recordId: material.evidence?.recordId,
      source: material.source,
      id: material.id,
      title: material.title,
      usageRole: "reference",
      selectedReason: `MCP matched ${RUN_ID}`,
    }],
    idempotencyKey: `${BRAND_ID}:s2-05-regression:mcp-reuse:${RUN_ID}`,
    confirmEvidenceOnly: true,
  });
  assertOk(reuse?.data?.ok && reuse.data.evidenceOnly === true && reuse.data.generated === false, "MCP reuse evidence write failed");

  const detail = await getJson(`${API_BASE}/workflow-core/tasks/${encodeURIComponent(taskId)}/governance-detail`);
  const evidenceRefs = flattenEvidenceRefs(detail.payload?.execution_events || []);
  assertOk(evidenceRefs.some((item) => item?.kind === "ai_control_center_material_reuse"), "MCP task detail missing material reuse evidence");
  assertOk(evidenceRefs.some((item) => item?.kind === "asset_archive_item"), "MCP task detail missing asset archive item evidence");

  return {
    name: "mcp_tools_call",
    ok: true,
    taskId,
    stageRunId,
    material: pickItem(material),
    eventId: reuse.data?.event?.payload?.event_id,
    evidenceKinds: Array.from(new Set(evidenceRefs.map((item) => item?.kind).filter(Boolean))),
  };
}

async function callMcpTool(name, args) {
  const response = await fetch(`${API_BASE}/ai-control-center/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${INSTALL_TOKEN}`,
      "X-Brand-Id": BRAND_ID,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `s2-05-${name}-${RUN_ID}`,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const payload = await response.json().catch(() => null);
  assertEqual(response.status, 200, `MCP ${name} HTTP failed: ${JSON.stringify(payload)}`);
  if (payload?.error) {
    throw new Error(`MCP ${name} failed: ${JSON.stringify(payload.error)}`);
  }
  if (payload?.result?.isError) {
    const text = payload.result.content?.[0]?.text || JSON.stringify(payload.result);
    throw new Error(`MCP ${name} returned isError: ${text}`);
  }
  const text = payload?.result?.content?.[0]?.text;
  if (!text) return payload?.result || payload;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function searchArchive(query, baseUrl = API_BASE) {
  const params = new URLSearchParams({ brandId: BRAND_ID, limit: "10" });
  for (const [key, value] of Object.entries(query)) params.set(key, value);
  return getJson(`${baseUrl}/ai-control/assets/archive?${params.toString()}`);
}

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  return parseJsonResponse(response, url);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJsonResponse(response, url);
}

async function postForm(url, form) {
  const response = await fetch(url, { method: "POST", body: form });
  return parseJsonResponse(response, url);
}

async function parseJsonResponse(response, url) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${url} -> HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 1000)}`);
  }
  return payload;
}

function appendFields(form, fields) {
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) form.append(key, JSON.stringify(value));
    else form.append(key, String(value));
  }
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function pickItem(item) {
  return {
    id: item?.id,
    source: item?.source,
    title: item?.title,
    storageKey: item?.storageKey,
    tags: item?.materialTags || [],
  };
}

function flattenEvidenceRefs(events) {
  if (!Array.isArray(events)) return [];
  return events.flatMap((event) => Array.isArray(event?.evidenceRefsJson) ? event.evidenceRefsJson : []);
}

function safeId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40);
}

function assertOk(value, message) {
  if (!value) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}; expected=${expected}; actual=${actual}`);
  }
}
