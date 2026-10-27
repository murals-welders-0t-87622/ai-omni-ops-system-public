const { readFile } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { homedir } = require("node:os");

const API_BASE = normalizeBaseUrl(process.env.S302Z_API_BASE_URL || "http://127.0.0.1:23011/api");
const MCP_CONFIG_PATH = process.env.S302Z_WORKBUDDY_MCP_CONFIG || join(homedir(), ".workbuddy", "mcp.json");
const CONNECTOR_NAME = process.env.S302Z_WORKBUDDY_CONNECTOR_NAME || "ai-omni-ops-ontology-lab";
const EXPECTED_BRAND_ID = process.env.S302Z_BRAND_ID || "brand-demo-cleaning";
const FLOW_KEY = process.env.S302Z_FLOW_KEY || "ontology_expert_expert_douyin_fullflow_ops_agents_douyin_digital_musicefd_dictdraft";
const USER_INTENT = process.env.S302Z_USER_INTENT || "验证 WorkBuddy 启动前只读联调";
const RUN_ID = process.env.S302Z_RUN_ID || `S302Z${Date.now()}`;
const TASK_ID = normalizeOptional(process.env.S302Z_TASK_ID);
const STAGE_RUN_ID = normalizeOptional(process.env.S302Z_STAGE_RUN_ID);
const SUBJECT_KIND = normalizeOptional(process.env.S302Z_SUBJECT_KIND) || "expert";
const SUBJECT_ID = normalizeOptional(process.env.S302Z_SUBJECT_ID) || "expert:douyin-fullflow-ops/agents/douyin-digital-human-video-expert.md";
const NODE_KEY = normalizeOptional(process.env.S302Z_NODE_KEY);
const NODE_STATUS = normalizeOptional(process.env.S302Z_NODE_STATUS) || "started";
const CONFIRM_REAL_EVIDENCE = String(process.env.S302Z_CONFIRM_REAL_EVIDENCE || "").trim().toLowerCase() === "true";

const REQUIRED_TOOLS = [
  "get_ai_control_center_published_ontology_contract",
  "get_ai_control_center_ontology_execution_plan",
  "get_ai_control_center_ontology_expert_source_diff_preview",
  "record_ai_control_center_ontology_execution_plan_evidence",
  "record_ai_control_center_ontology_node_execution_evidence",
];

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    runId: RUN_ID,
    connectorName: CONNECTOR_NAME,
    flowKey: FLOW_KEY,
    mode: resolveModeLabel(),
    message: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});

async function main() {
  assertEvidenceModeIsSafe();
  const connector = await readConnector();
  await assertHealth();
  const toolsList = await verifyToolsList(connector);

  const contract = await callMcpTool(connector, "get_ai_control_center_published_ontology_contract", {
    flowKey: FLOW_KEY,
  });
  const plan = await callMcpTool(connector, "get_ai_control_center_ontology_execution_plan", {
    flowKey: FLOW_KEY,
    userIntent: USER_INTENT,
    ...(TASK_ID ? { taskId: TASK_ID } : {}),
  });
  const preview = await callMcpTool(connector, "get_ai_control_center_ontology_expert_source_diff_preview", {
    flowKey: FLOW_KEY,
  });

  assertOk(contract?.data?.published === true, "published_contract probe did not return published=true");
  assertOk(contract?.data?.readonly === true, "published_contract probe did not stay readonly");
  assertOk(contract?.data?.item?.flowKey === FLOW_KEY, `published_contract returned unexpected flowKey: ${contract?.data?.item?.flowKey}`);

  assertOk(plan?.data?.published === true, "execution_plan probe did not return published=true");
  assertOk(plan?.data?.executionPlanOnly === true, "execution_plan probe did not stay executionPlanOnly=true");
  assertOk(plan?.data?.item?.flowKey === FLOW_KEY, `execution_plan returned unexpected flowKey: ${plan?.data?.item?.flowKey}`);

  assertOk(preview?.data?.readonly === true, "diff preview did not stay readonly");
  assertOk(preview?.data?.previewOnly === true, "diff preview did not stay previewOnly=true");
  assertOk(preview?.data?.item?.targetSummary?.targetCount === 1, `diff preview targetCount expected 1, actual ${preview?.data?.item?.targetSummary?.targetCount}`);
  const previewTargets = Array.isArray(preview?.data?.item?.targets) ? preview.data.item.targets : [];
  assertOk(previewTargets.length === 1, `diff preview targets length expected 1, actual ${previewTargets.length}`);
  assertOk(previewTargets[0]?.target?.source === "flow.targetId", `diff preview target source expected flow.targetId, actual ${previewTargets[0]?.target?.source}`);

  const result = {
    ok: true,
    runId: RUN_ID,
    mode: resolveModeLabel(),
    connector: {
      name: CONNECTOR_NAME,
      url: connector.url,
      type: connector.type,
      brandId: connector.brandId,
      authorizationPreview: previewSecret(connector.authorization),
    },
    toolsList,
    publishedContract: {
      status: contract.status,
      readonly: contract.data.readonly,
      published: contract.data.published,
      previewOnly: contract.data.previewOnly,
      flowKey: contract.data.item.flowKey,
      flowStatus: contract.data.item.flowStatus,
      versionNo: contract.data.item.versionNo,
      versionStatus: contract.data.item.versionStatus,
      targetKind: contract.data.item.targetKind,
      targetId: contract.data.item.targetId,
      targetName: contract.data.item.targetName,
      nodeCount: Array.isArray(contract.data.item.contract?.nodes) ? contract.data.item.contract.nodes.length : 0,
      edgeCount: Array.isArray(contract.data.item.contract?.edges) ? contract.data.item.contract.edges.length : 0,
    },
    executionPlan: {
      status: plan.status,
      readonly: plan.data.readonly,
      published: plan.data.published,
      executionPlanOnly: plan.data.executionPlanOnly,
      flowKey: plan.data.item.flowKey,
      versionNo: plan.data.item.versionNo,
      taskIdEchoed: plan.data.item.taskId || null,
      userIntentEchoed: plan.data.item.userIntent || null,
      stepCount: plan.data.item.stepCount,
      edgeCount: plan.data.item.edgeCount,
      startNodeKeys: plan.data.item.startNodeKeys,
      firstStepTitle: plan.data.item.steps?.[0]?.title || null,
    },
    diffPreview: {
      status: preview.status,
      readonly: preview.data.readonly,
      previewOnly: preview.data.previewOnly,
      writebackEnabled: preview.data.writebackEnabled,
      targetCount: preview.data.item.targetSummary.targetCount,
      previewedCount: preview.data.item.targetSummary.previewedCount,
      changedCount: preview.data.item.targetSummary.changedCount,
      blockerCount: preview.data.item.targetSummary.blockerCount,
      targetRelPath: previewTargets[0]?.target?.relPath || null,
      targetSource: previewTargets[0]?.target?.source || null,
      policy: preview.data.item.policy,
    },
    governance: {
      evidenceModeEnabled: Boolean(TASK_ID && STAGE_RUN_ID),
      wrotePreflightEvidence: false,
      wroteNodeEvidence: false,
      note: TASK_ID && STAGE_RUN_ID
        ? "已提供真实任务上下文，可继续进入显式确认后的留证验证。"
        : "当前未提供真实 taskId/stageRunId，本轮保持只读，不写任何执行证据。",
    },
  };

  if (TASK_ID && STAGE_RUN_ID) {
    const preflight = await callMcpTool(connector, "record_ai_control_center_ontology_execution_plan_evidence", {
      taskId: TASK_ID,
      stageRunId: STAGE_RUN_ID,
      flowKey: FLOW_KEY,
      userIntent: USER_INTENT,
      subjectKind: SUBJECT_KIND,
      subjectId: SUBJECT_ID,
      invocationId: `s302z_preflight_${safeId(RUN_ID)}`,
      attemptNo: 1,
      confirmedBy: "s3-02z-startup-read-check",
      confirmationNote: "Real-task ontology preflight validation via WorkBuddy MCP connector",
      idempotencyKey: `${EXPECTED_BRAND_ID}:s3-02z:preflight:${RUN_ID}`,
      confirmPreflightOnly: true,
    });
    result.governance.wrotePreflightEvidence = Boolean(preflight?.data?.ok);
    result.governance.preflightEvidence = {
      ok: preflight?.data?.ok === true,
      generated: preflight?.data?.generated === true,
      evidenceOnly: preflight?.data?.evidenceOnly === true,
      eventId: preflight?.data?.event?.payload?.event_id || null,
    };

    if (NODE_KEY) {
      const node = await callMcpTool(connector, "record_ai_control_center_ontology_node_execution_evidence", {
        taskId: TASK_ID,
        stageRunId: STAGE_RUN_ID,
        flowKey: FLOW_KEY,
        nodeKey: NODE_KEY,
        nodeStatus: NODE_STATUS,
        userIntent: USER_INTENT,
        subjectKind: SUBJECT_KIND,
        subjectId: SUBJECT_ID,
        invocationId: `s302z_node_${safeId(RUN_ID)}`,
        attemptNo: 1,
        outcome: "Ontology startup read validation script recorded controlled node evidence",
        idempotencyKey: `${EXPECTED_BRAND_ID}:s3-02z:node:${NODE_KEY}:${RUN_ID}`,
        confirmControlledExecutionOnly: true,
      });
      result.governance.wroteNodeEvidence = Boolean(node?.data?.ok);
      result.governance.nodeEvidence = {
        ok: node?.data?.ok === true,
        generated: node?.data?.generated === true,
        evidenceOnly: node?.data?.evidenceOnly === true,
        eventId: node?.data?.event?.payload?.event_id || null,
        nodeKey: NODE_KEY,
        nodeStatus: NODE_STATUS,
      };
    }

    const governance = await getJson(`${API_BASE}/workflow-core/tasks/${encodeURIComponent(TASK_ID)}/governance-detail`);
    const evidenceRefs = flattenEvidenceRefs(governance.payload?.execution_events || []);
    result.governance.evidenceKinds = Array.from(new Set(evidenceRefs.map((item) => item?.kind).filter(Boolean)));
    result.governance.preflightReadback = evidenceRefs.some((item) => item?.kind === "ontology_execution_preflight");
    result.governance.nodeReadback = NODE_KEY
      ? evidenceRefs.some((item) => item?.kind === "ontology_node_execution" && String(item?.meta?.node_key || item?.meta?.nodeKey || "") === NODE_KEY)
      : false;
  }

  console.log(JSON.stringify(result, null, 2));
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
    id: `s302z-tools-list-${RUN_ID}`,
    method: "tools/list",
    params: {},
  }, connector.authorization, connector.brandId);
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

async function callMcpTool(connector, name, args) {
  const payload = await postJson(connector.url, {
    jsonrpc: "2.0",
    id: `s302z-${name}-${RUN_ID}`,
    method: "tools/call",
    params: { name, arguments: args },
  }, connector.authorization, connector.brandId);
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

async function postJson(url, body, authorization, brandId) {
  const headers = { "Content-Type": "application/json" };
  if (authorization) headers.Authorization = authorization;
  if (brandId) headers["X-Brand-Id"] = brandId;
  const response = await fetch(url, {
    method: "POST",
    headers,
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
    throw new Error(`${url} -> HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 1200)}`);
  }
  return payload;
}

function flattenEvidenceRefs(events) {
  if (!Array.isArray(events)) return [];
  return events.flatMap((event) => Array.isArray(event?.evidenceRefsJson) ? event.evidenceRefsJson : []);
}

function resolveModeLabel() {
  return TASK_ID && STAGE_RUN_ID ? "real_task_probe" : "readonly_probe";
}

function assertEvidenceModeIsSafe() {
  const hasTask = Boolean(TASK_ID);
  const hasStage = Boolean(STAGE_RUN_ID);
  assertOk(hasTask === hasStage, "S302Z evidence mode requires taskId and stageRunId together; do not pass only one of them");
  if (hasTask && hasStage) {
    assertOk(CONFIRM_REAL_EVIDENCE, "S302Z real-task probe requires S302Z_CONFIRM_REAL_EVIDENCE=true to avoid accidental governance writes");
  }
  if (NODE_KEY) {
    assertOk(hasTask && hasStage, "S302Z node evidence requires a real taskId and stageRunId");
  }
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function normalizeOptional(value) {
  const text = String(value || "").trim();
  return text || null;
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
