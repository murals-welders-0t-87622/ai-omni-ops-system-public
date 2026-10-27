const { readFile, mkdir, writeFile } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { dirname, isAbsolute, join, normalize, resolve } = require("node:path");
const { homedir } = require("node:os");

const API_BASE = normalizeBaseUrl(process.env.S302Z_API_BASE_URL || "http://127.0.0.1:23011/api");
const MCP_CONFIG_PATH = process.env.S302Z_WORKBUDDY_MCP_CONFIG || join(homedir(), ".workbuddy", "mcp.json");
const CONNECTOR_NAME = process.env.S302Z_WORKBUDDY_CONNECTOR_NAME || "ai-omni-ops-ontology-lab";
const EXPECTED_BRAND_ID = process.env.S302Z_BRAND_ID || "brand-demo-cleaning";
const FLOW_KEY = process.env.S302Z_FLOW_KEY || "ontology_expert_expert_douyin_fullflow_ops_agents_douyin_digital_musicefd_dictdraft";
const RUN_ID = process.env.S302Z_RUN_ID || `S302ZEXPORT${Date.now()}`;
const EXPORT_ROOT = resolveSafeExportRoot(process.env.S302Z_EXPORT_ROOT);
const WAIT_TIMEOUT_MS = normalizeWaitMs(process.env.S302Z_WAIT_FOR_CANDIDATE_MD_MS, 0);
const WAIT_INTERVAL_MS = normalizeWaitMs(process.env.S302Z_WAIT_INTERVAL_MS, 5000);

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    runId: RUN_ID,
    flowKey: FLOW_KEY,
    exportRoot: EXPORT_ROOT,
    message: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});

async function main() {
  const connector = await readConnector();
  const { payload, attempts, waitedMs } = await waitForPreviewPayload(connector);

  const preview = payload?.data?.item;
  const targets = Array.isArray(preview?.targets) ? preview.targets : [];
  assertOk(targets.length > 0, "No preview targets returned");

  await mkdir(EXPORT_ROOT, { recursive: true });
  const candidateRoot = join(EXPORT_ROOT, "candidate");
  const diffsRoot = join(EXPORT_ROOT, "diffs");
  await mkdir(candidateRoot, { recursive: true });
  await mkdir(diffsRoot, { recursive: true });

  const writtenTargets = [];
  for (const item of targets) {
    const relPosix = String(item?.relPosix || item?.target?.relPath || "").trim();
    const candidateMarkdown = typeof item?.candidateMarkdown === "string" ? item.candidateMarkdown : "";
    assertOk(relPosix, "Preview target missing relPosix");
    assertOk(candidateMarkdown, `Preview target ${relPosix} missing candidateMarkdown; includeCandidateMd may not be enabled`);

    const candidatePath = resolve(candidateRoot, relPosix.replace(/\//g, "\\"));
    assertInside(EXPORT_ROOT, candidatePath, `Candidate path escaped export root: ${candidatePath}`);
    await mkdir(dirname(candidatePath), { recursive: true });
    await writeFile(candidatePath, candidateMarkdown, "utf8");

    const diffFileName = relPosix.replace(/[\\/]/g, "__") + ".diff";
    const diffPath = join(diffsRoot, diffFileName);
    await writeFile(diffPath, String(item?.diff || ""), "utf8");

    writtenTargets.push({
      relPosix,
      candidatePath,
      diffPath,
      changed: item?.changed === true,
      candidateSha256: item?.candidate?.sha256 || null,
      currentSha256: item?.current?.sha256 || null,
      diffSha256: item?.diffSha256 || null,
      mergeWarnings: Array.isArray(item?.mergeReport?.warnings) ? item.mergeReport.warnings : [],
    });
  }

  const manifest = {
    ok: true,
    runId: RUN_ID,
    exportedAt: new Date().toISOString(),
    exportRoot: EXPORT_ROOT,
    connector: {
      name: CONNECTOR_NAME,
      url: connector.url,
      brandId: connector.brandId,
      type: connector.type,
      authorizationPreview: previewSecret(connector.authorization),
    },
    wait: {
      attempts,
      waitedMs,
      timeoutMs: WAIT_TIMEOUT_MS,
      intervalMs: WAIT_INTERVAL_MS,
    },
    sourceContract: preview?.sourceContract || null,
    targetSummary: preview?.targetSummary || null,
    policy: preview?.policy || null,
    boundary: payload?.data?.boundary || payload?.boundary || "只读导出候选稿到隔离目录，不写 WorkBuddy 真源。",
    writtenTargets,
  };

  const manifestPath = join(EXPORT_ROOT, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(JSON.stringify({
    ok: true,
    runId: RUN_ID,
    flowKey: FLOW_KEY,
    exportRoot: EXPORT_ROOT,
    manifestPath,
    attempts,
    waitedMs,
    targetCount: writtenTargets.length,
    targetRelPaths: writtenTargets.map((item) => item.relPosix),
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
  return { url, type: connector.type, brandId, authorization };
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
      id: `${name}-${RUN_ID}`,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const payload = await parseJsonResponse(response, connector.url);
  if (payload?.error) throw new Error(`MCP ${name} failed: ${JSON.stringify(payload.error)}`);
  if (payload?.result?.isError) {
    throw new Error(`MCP ${name} returned isError: ${payload.result.content?.[0]?.text || JSON.stringify(payload.result)}`);
  }
  const text = payload?.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : payload?.result || payload;
}

async function waitForPreviewPayload(connector) {
  const startedAt = Date.now();
  let attempts = 0;
  let lastPayload = null;
  let lastMissingRelPosix = null;

  while (true) {
    attempts += 1;
    const payload = await callMcpTool(connector, "get_ai_control_center_ontology_expert_source_diff_preview", {
      flowKey: FLOW_KEY,
      includeCandidateMd: true,
    });
    lastPayload = payload;

    const targets = Array.isArray(payload?.data?.item?.targets) ? payload.data.item.targets : [];
    const missingTarget = targets.find((item) => typeof item?.candidateMarkdown !== "string" || !item.candidateMarkdown);
    if (!missingTarget) {
      return {
        payload,
        attempts,
        waitedMs: Date.now() - startedAt,
      };
    }

    lastMissingRelPosix = String(missingTarget?.relPosix || missingTarget?.target?.relPath || "unknown");
    const elapsed = Date.now() - startedAt;
    if (WAIT_TIMEOUT_MS <= 0 || elapsed >= WAIT_TIMEOUT_MS) {
      throw new Error(`Preview target ${lastMissingRelPosix} missing candidateMarkdown; includeCandidateMd may not be enabled in current runtime`);
    }
    await sleep(Math.min(WAIT_INTERVAL_MS, Math.max(1000, WAIT_TIMEOUT_MS - elapsed)));
  }
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

function resolveSafeExportRoot(customRoot) {
  const fallback = join(process.cwd(), "runtime", "s3-02z-expert-preview-bundles", RUN_ID);
  const root = resolve(String(customRoot || fallback));
  const normalizedRoot = normalize(root).toLowerCase();
  const forbidden = [
    "\\.workbuddy\\",
    "\\expert-source\\",
    "\\douyin-fullflow-ops\\agents\\",
  ];
  for (const marker of forbidden) {
    assertOk(!normalizedRoot.includes(marker), `Export root not allowed inside real expert source path: ${root}`);
  }
  return root;
}

function assertInside(root, filePath, message) {
  const normalizedRoot = resolve(root);
  const normalizedPath = resolve(filePath);
  assertOk(normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}\\`), message);
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function normalizeWaitMs(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return Math.trunc(numeric);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
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
