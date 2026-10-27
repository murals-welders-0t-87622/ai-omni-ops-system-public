const { readdir, readFile, stat } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { basename, join, resolve } = require("node:path");
const { createHash } = require("node:crypto");

const REPO_ROOT = process.cwd();
const ISOLATED_PACKAGES_ROOT = resolve(process.env.S302Z_ISOLATED_PACKAGES_ROOT || join(REPO_ROOT, "runtime", "s3-02z-isolated-expert-packages"));
const PREVIEW_BUNDLES_ROOT = resolve(process.env.S302Z_PREVIEW_BUNDLES_ROOT || join(REPO_ROOT, "runtime", "s3-02z-expert-preview-bundles"));
const EXPLICIT_PACKAGE_ROOT = normalizeOptional(process.env.S302Z_ISOLATED_PACKAGE_ROOT);
const EXPLICIT_PREVIEW_BUNDLE_ROOT = normalizeOptional(process.env.S302Z_PREVIEW_BUNDLE_ROOT);

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: error instanceof Error ? error.message : String(error),
    isolatedPackagesRoot: ISOLATED_PACKAGES_ROOT,
    previewBundlesRoot: PREVIEW_BUNDLES_ROOT,
  }, null, 2));
  process.exit(1);
});

async function main() {
  const isolatedPackageRoot = EXPLICIT_PACKAGE_ROOT
    ? resolve(EXPLICIT_PACKAGE_ROOT)
    : await resolveLatestIsolatedPackageRoot();
  const previewBundleRoot = EXPLICIT_PREVIEW_BUNDLE_ROOT
    ? resolve(EXPLICIT_PREVIEW_BUNDLE_ROOT)
    : await resolveLatestPreviewBundleRoot();

  const pluginPath = join(isolatedPackageRoot, ".codebuddy-plugin", "plugin.json");
  assertOk(existsSync(pluginPath), `plugin.json not found: ${pluginPath}`);
  const plugin = JSON.parse(await readFile(pluginPath, "utf8"));

  const startupEntryAgent = String(plugin?.agentName || plugin?.teamInfo?.leadAgent || "").trim();
  assertOk(startupEntryAgent, "plugin.json missing agentName/teamInfo.leadAgent");
  const startupEntryPath = join(isolatedPackageRoot, "agents", `${startupEntryAgent}.md`);
  assertOk(existsSync(startupEntryPath), `Startup entry agent file not found: ${startupEntryPath}`);
  const startupEntryContent = await readFile(startupEntryPath, "utf8");

  const startupBridge = parseStartupBridge(startupEntryContent);

  const assembleManifestPath = join(resolve(isolatedPackageRoot, ".."), "assemble-manifest.json");
  const assembleManifest = existsSync(assembleManifestPath)
    ? JSON.parse(await readFile(assembleManifestPath, "utf8"))
    : null;

  const targetAgentRelativePath = String(
    startupBridge.targetAgentPath
      || assembleManifest?.startupBridge?.targetAgentPath
      || assembleManifest?.appliedTargets?.find((item) => String(item?.packageRelativePath || "").startsWith("agents/"))?.packageRelativePath
      || ""
  ).trim();
  assertOk(targetAgentRelativePath, "Unable to resolve target agent path from startup bridge or assemble manifest");

  const targetAgentPath = join(isolatedPackageRoot, ...targetAgentRelativePath.split("/"));
  assertOk(existsSync(targetAgentPath), `Target agent file not found: ${targetAgentPath}`);
  const targetAgentContent = await readFile(targetAgentPath, "utf8");
  assertOk(hasOntologyRules(targetAgentContent), "Target agent file does not contain Ontology startup rules");

  const previewManifestPath = join(previewBundleRoot, "manifest.json");
  assertOk(existsSync(previewManifestPath), `Preview bundle manifest not found: ${previewManifestPath}`);
  const previewManifest = JSON.parse(await readFile(previewManifestPath, "utf8"));
  const previewTarget = Array.isArray(previewManifest?.writtenTargets)
    ? previewManifest.writtenTargets.find((item) => basename(String(item?.candidatePath || "")) === basename(targetAgentPath))
    : null;
  assertOk(previewTarget?.candidatePath && existsSync(previewTarget.candidatePath), "Matching preview candidate file not found for target agent");

  const targetSha = sha256(targetAgentContent);
  const previewCandidateContent = await readFile(previewTarget.candidatePath, "utf8");
  const previewSha = sha256(previewCandidateContent);

  const result = {
    ok: true,
    isolatedPackageRoot,
    previewBundleRoot,
    package: {
      name: plugin?.name || null,
      plugin: plugin?.plugin || null,
      version: plugin?.version || null,
      startupEntryAgent,
      startupEntryPath,
    },
    startupEntry: {
      hasOntologyRules: hasOntologyRules(startupEntryContent),
      hasBridgeOnly: startupBridge.present,
      bridgeTargetAgentId: startupBridge.targetAgentId,
      bridgeTargetAgentPath: startupBridge.targetAgentPath,
      bridgeFlowKey: startupBridge.flowKey,
      bridgeVersionNo: startupBridge.versionNo,
    },
    targetAgent: {
      relativePath: targetAgentRelativePath,
      path: targetAgentPath,
      hasOntologyRules: hasOntologyRules(targetAgentContent),
      sha256: targetSha,
    },
    previewCandidate: {
      candidatePath: previewTarget.candidatePath,
      candidateSha256: previewSha,
      manifestCandidateSha256: previewTarget.candidateSha256 || null,
      shaMatchesTarget: targetSha === previewSha,
    },
    assembleManifest: assembleManifest
      ? {
          runId: assembleManifest.runId || null,
          startupBridgeInjected: assembleManifest?.startupBridge?.injected === true,
          startupBridgeReason: assembleManifest?.startupBridge?.reason || null,
          startupBridgeTargetAgentId: assembleManifest?.startupBridge?.targetAgentId || null,
        }
      : null,
  };

  console.log(JSON.stringify(result, null, 2));
}

async function resolveLatestIsolatedPackageRoot() {
  assertOk(existsSync(ISOLATED_PACKAGES_ROOT), `Isolated packages root not found: ${ISOLATED_PACKAGES_ROOT}`);
  const runDir = await resolveLatestChildDir(ISOLATED_PACKAGES_ROOT, /^S302ZPKG/i);
  const subdirs = await readdir(runDir, { withFileTypes: true });
  const packageDir = subdirs.find((entry) => entry.isDirectory() && existsSync(join(runDir, entry.name, ".codebuddy-plugin", "plugin.json")));
  assertOk(packageDir, `No package directory with plugin.json found under: ${runDir}`);
  return join(runDir, packageDir.name);
}

async function resolveLatestPreviewBundleRoot() {
  assertOk(existsSync(PREVIEW_BUNDLES_ROOT), `Preview bundles root not found: ${PREVIEW_BUNDLES_ROOT}`);
  return resolveLatestChildDir(PREVIEW_BUNDLES_ROOT, /^S302ZEXPORT/i);
}

async function resolveLatestChildDir(root, pattern) {
  const entries = await readdir(root, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !pattern.test(entry.name)) continue;
    const fullPath = join(root, entry.name);
    const info = await stat(fullPath);
    candidates.push({ path: fullPath, mtimeMs: info.mtimeMs });
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  assertOk(candidates.length > 0, `No candidate directories found under ${root} for pattern ${pattern}`);
  return candidates[0].path;
}

function parseStartupBridge(content) {
  const text = String(content || "");
  const present = text.includes("## Ontology 启动桥接（隔离联调包）");
  return {
    present,
    targetAgentId: matchLine(text, /当前目标专家：([^\r\n]+)/),
    targetAgentPath: matchLine(text, /当前目标文件：([^\r\n]+)/),
    flowKey: matchLine(text, /当前联调 flowKey：([^\r\n]+)/),
    versionNo: normalizeVersion(matchLine(text, /当前联调 versionNo：([^\r\n]+)/)),
  };
}

function matchLine(text, regex) {
  const match = String(text || "").match(regex);
  return match ? String(match[1] || "").trim() : null;
}

function normalizeVersion(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : text;
}

function hasOntologyRules(content) {
  const text = String(content || "");
  return text.includes("get_ai_control_center_published_ontology_contract")
    && text.includes("get_ai_control_center_ontology_execution_plan");
}

function sha256(content) {
  return createHash("sha256").update(String(content || ""), "utf8").digest("hex");
}

function normalizeOptional(value) {
  const text = String(value || "").trim();
  return text || null;
}

function assertOk(value, message) {
  if (!value) throw new Error(message);
}
