const { readFile } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { homedir } = require("node:os");

const API_BASE = normalizeBaseUrl(process.env.S3_API_BASE_URL || "http://127.0.0.1:23011/api");
const MCP_CONFIG_PATH = process.env.S3_WORKBUDDY_MCP_CONFIG || join(homedir(), ".workbuddy", "mcp.json");
const CONNECTOR_NAME = process.env.S3_WORKBUDDY_CONNECTOR_NAME || "ai-omni-ops-ontology-lab";
const EXPECTED_BRAND_ID = process.env.S3_BRAND_ID || "brand-demo-cleaning";
const RUN_ID = process.env.S3_RUN_ID || `S3WB${Date.now()}`;
const REQUIRED_TOOLS = [
  "search_ai_control_center_asset_archive",
  "record_ai_control_center_material_reuse_evidence",
];

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    runId: RUN_ID,
    connectorName: CONNECTOR_NAME,
    message: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});

async function main() {
  const connector = await readConnector();
  await assertHealth();
  const toolsList = await verifyToolsList(connector);
  const material = await registerSeedMaterial();
  const task = await createTask();
  const mcpSearch = await callMcpTool(connector, "search_ai_control_center_asset_archive", {
    materialType: "文字",
    materialSource: "用户上传",
    keyword: RUN_ID,
    limit: 5,
  });
  const items = Array.isArray(mcpSearch?.data?.items) ? mcpSearch.data.items : [];
  assertOk(items.some((item) => item?.id === material.itemId || item?.title === material.title), "MCP search did not return the S3 seed material");
  const selected = items.find((item) => item?.id === material.itemId || item?.title === material.title) || items[0];

  const reuse = await callMcpTool(connector, "record_ai_control_center_material_reuse_evidence", {
    taskId: task.taskId,
    stageRunId: task.stageRunId,
    actionName: "select_reference_material",
    actionLabel: "选择复用素材",
    subjectKind: "skill",
    subjectId: "s3-workbuddy-lab-connector-check",
    invocationId: `s3_wb_${safeId(RUN_ID)}`,
    attemptNo: 1,
    usageNote: "S3 check: WorkBuddy connector token can write material reuse evidence through MCP tools/call",
    materialRefs: [{
      evidenceTable: selected.evidence?.table,
      recordId: selected.evidence?.recordId,
      source: selected.source,
      id: selected.id,
      title: selected.title,
      usageRole: "reference",
      selectedReason: `MCP matched ${RUN_ID}`,
    }],
    idempotencyKey: `${EXPECTED_BRAND_ID}:s3-workbuddy-connector:reuse:${RUN_ID}`,
    confirmEvidenceOnly: true,
  });
  assertOk(reuse?.data?.ok && reuse.data.evidenceOnly === true && reuse.data.generated === false, "MCP reuse evidence write failed");

  const governance = await getJson(`${API_BASE}/workflow-core/tasks/${encodeURIComponent(task.taskId)}/governance-detail`);
  const evidenceRefs = flattenEvidenceRefs(governance.payload?.execution_events || []);
  assertOk(evidenceRefs.some((item) => item?.kind === "ai_control_center_material_reuse"), "governance detail missing material reuse evidence");
  assertOk(evidenceRefs.some((item) => item?.kind === "asset_archive_item"), "governance detail missing asset archive item evidence");

  console.log(JSON.stringify({
    ok: true,
    runId: RUN_ID,
    apiBase: API_BASE,
    connector: {
      name: CONNECTOR_NAME,
      url: connector.url,
      type: connector.type,
      brandId: connector.brandId,
      authorizationPreview: previewSecret(connector.authorization),
    },
    toolsList,
    task,
    material,
    mcpToolsCall: {
      ok: true,
      searchedItems: items.length,
      selectedMaterialId: selected.id,
      eventId: reuse.data?.event?.payload?.event_id,
      evidenceKinds: Array.from(new Set(evidenceRefs.map((item) => item?.kind).filter(Boolean))),
    },
  }, null, 2));
}

async function readConnector() {
  assertOk(existsSync(MCP_CONFIG_PATH), `WorkBuddy MCP config not found: ${MCP_CONFIG_PATH}`);
  const raw = await readFile(MCP_CONFIG_PATH, "utf8");
  const config = JSON.parse(raw);
  const servers = config?.mcpServers || config?.mcp?.servers || {};
  const connector = servers[CONNECTOR_NAME];
  assertOk(connector, `Connector not found in WorkBuddy MCP config: ${CONNECTOR_NAME}`);
  const url = normalizeBaseUrl(connector.url);
  const headers = connector.headers || {};
  const authorization = String(headers.Authorization || headers.authorization || "").trim();
  const brandId = String(headers["x-brand-id"] || headers["X-Brand-Id"] || "").trim();
  assertOk(url === `${API_BASE}/ai-control-center/mcp`, `Connector URL mismatch; expected ${API_BASE}/ai-control-center/mcp, actual ${url}`);
  assertOk(String(connector.type || "").toLowerCase() === "streamablehttp", `Connector type must be streamableHttp, actual ${connector.type}`);
  assertOk(brandId === EXPECTED_BRAND_ID, `Connector brand mismatch; expected ${EXPECTED_BRAND_ID}, actual ${brandId}`);
  assertOk(/^Bearer\s+ocp_[A-Za-z0-9_-]+$/.test(authorization), "Connector Authorization must be a Bearer ocp_ token");
  assertOk(connector.disabled !== true && connector.enabled !== false, "Connector is disabled in WorkBuddy MCP config");
  return { url, type: connector.type, brandId, authorization };
}

async function assertHealth() {
  const payload = await getJson(`${API_BASE}/health`);
  assertOk(payload.status === "ok", `Lab health check failed: ${JSON.stringify(payload)}`);
}

async function verifyToolsList(connector) {
  const payload = await postJson(connector.url, {
    jsonrpc: "2.0",
    id: `s3-tools-list-${RUN_ID}`,
    method: "tools/list",
    params: {},
  });
  if (payload?.error) {
    throw new Error(`MCP tools/list failed: ${JSON.stringify(payload.error)}`);
  }
  const tools = Array.isArray(payload?.result?.tools) ? payload.result.tools : [];
  const names = new Set(tools.map((tool) => tool?.name).filter(Boolean));
  for (const name of REQUIRED_TOOLS) {
    assertOk(names.has(name), `MCP tools/list missing ${name}`);
  }
  return { ok: true, toolCount: tools.length, required: REQUIRED_TOOLS };
}

async function registerSeedMaterial() {
  const title = `S3 WorkBuddy connector material ${RUN_ID}`;
  const payload = await postJson(`${API_BASE}/ai-control/assets/archive-registration`, {
    brandId: EXPECTED_BRAND_ID,
    source: "creative_material",
    originKind: "user_upload",
    sourceKind: "material_library_upload",
    workspaceScope: "douyin",
    title,
    materialType: "文字",
    materialTags: ["用户上传", "文字", RUN_ID, "S3连接器验收"],
    textContent: `S3 WorkBuddy lab connector material reuse check ${RUN_ID}`,
    confirmNoGeneration: true,
    idempotencyKey: `${EXPECTED_BRAND_ID}:s3-workbuddy-connector:material:${RUN_ID}`,
  });
  assertOk(payload.ok, "Seed material registration failed");
  const searched = await getJson(`${API_BASE}/ai-control/assets/archive?${new URLSearchParams({
    brandId: EXPECTED_BRAND_ID,
    materialType: "文字",
    materialSource: "用户上传",
    keyword: RUN_ID,
    limit: "5",
  }).toString()}`);
  assertOk(searched.total >= 1, "Seed material search failed");
  const item = searched.items?.[0] || {};
  return {
    title,
    itemId: item.id,
    storageKey: item.storageKey,
    tags: item.materialTags || [],
  };
}

async function createTask() {
  const taskId = `task_s3_wb_${safeId(RUN_ID)}`;
  const payload = await postJson(`${API_BASE}/workflow-core/handlers/create_task`, {
    schema_version: "1.0.0",
    command_id: taskId,
    idempotency_key: `${EXPECTED_BRAND_ID}:s3-workbuddy-connector:task:${RUN_ID}`,
    brand_id: EXPECTED_BRAND_ID,
    goal: `S3 WorkBuddy Lab connector check ${RUN_ID}`,
    scope_end: "Verify WorkBuddy connector token can call Lab MCP material tools and write governance evidence",
    route_hint: "stage-4-content-execution",
    source_refs: [],
  });
  assertOk(payload.ok, "Task creation failed");
  assertOk(payload.payload?.stage_run_id, "Task creation did not return stage_run_id");
  return { taskId, stageRunId: payload.payload.stage_run_id };
}

async function callMcpTool(connector, name, args) {
  const response = await fetch(connector.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": connector.authorization,
      "X-Brand-Id": connector.brandId,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `s3-${name}-${RUN_ID}`,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const payload = await parseJsonResponse(response, connector.url);
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

function flattenEvidenceRefs(events) {
  if (!Array.isArray(events)) return [];
  return events.flatMap((event) => Array.isArray(event?.evidenceRefsJson) ? event.evidenceRefsJson : []);
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function safeId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40);
}

function previewSecret(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 18) return "PRESENT_REDACTED";
  return `${text.slice(0, 12)}********${text.slice(-6)}`;
}

function assertOk(value, message) {
  if (!value) throw new Error(message);
}
