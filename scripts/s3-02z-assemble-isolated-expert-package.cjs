const { cp, mkdir, readFile, writeFile } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { basename, dirname, join, normalize, resolve } = require("node:path");

const RUN_ID = process.env.S302Z_ASSEMBLE_RUN_ID || `S302ZPKG${Date.now()}`;
const SOURCE_PACKAGE_ROOT = resolveSafeSourcePackage(process.env.S302Z_SOURCE_PACKAGE_ROOT
  || "D:\\workbuddyproject\\示例\\AI全域运营系统\\development\\douyin-fullflow-ops-next");
const PREVIEW_BUNDLE_ROOT = resolveSafePreviewBundle(process.env.S302Z_PREVIEW_BUNDLE_ROOT
  || "D:\\workbuddyproject\\示例\\AI全域运营系统\\development\\ai-omni-ops-system-lab-source\\repo\\runtime\\s3-02z-expert-preview-bundles\\S302ZEXPORT1791094212540");
const OUTPUT_ROOT = resolveSafeOutputRoot(process.env.S302Z_OUTPUT_ROOT
  || join(process.cwd(), "runtime", "s3-02z-isolated-expert-packages", RUN_ID));

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    runId: RUN_ID,
    sourcePackageRoot: SOURCE_PACKAGE_ROOT,
    previewBundleRoot: PREVIEW_BUNDLE_ROOT,
    outputRoot: OUTPUT_ROOT,
    message: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});

async function main() {
  assertOk(existsSync(SOURCE_PACKAGE_ROOT), `Source package root not found: ${SOURCE_PACKAGE_ROOT}`);
  assertOk(existsSync(PREVIEW_BUNDLE_ROOT), `Preview bundle root not found: ${PREVIEW_BUNDLE_ROOT}`);

  const manifestPath = join(PREVIEW_BUNDLE_ROOT, "manifest.json");
  assertOk(existsSync(manifestPath), `Preview bundle manifest not found: ${manifestPath}`);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const writtenTargets = Array.isArray(manifest?.writtenTargets) ? manifest.writtenTargets : [];
  assertOk(writtenTargets.length > 0, "Preview bundle manifest has no writtenTargets");

  await mkdir(OUTPUT_ROOT, { recursive: true });
  const packageName = normalizePackageName(SOURCE_PACKAGE_ROOT);
  const packagePrefixes = await resolvePackagePrefixes(SOURCE_PACKAGE_ROOT, packageName);
  const packagePlugin = await readPackagePlugin(SOURCE_PACKAGE_ROOT);
  const isolatedPackageRoot = join(OUTPUT_ROOT, packageName);
  await cp(SOURCE_PACKAGE_ROOT, isolatedPackageRoot, { recursive: true });

  const appliedTargets = [];
  for (const target of writtenTargets) {
    const relPosix = String(target?.relPosix || "").trim();
    const candidatePath = String(target?.candidatePath || "").trim();
    assertOk(relPosix, "writtenTarget.relPosix missing");
    assertOk(candidatePath && existsSync(candidatePath), `Candidate file missing: ${candidatePath}`);

    const packageRelativePath = stripLeadingPackageSegment(relPosix, packagePrefixes);
    const destinationPath = resolve(isolatedPackageRoot, packageRelativePath.replace(/\//g, "\\"));
    assertInside(isolatedPackageRoot, destinationPath, `Overlay path escaped isolated package root: ${destinationPath}`);
    await mkdir(dirname(destinationPath), { recursive: true });
    await cp(candidatePath, destinationPath, { force: true });

    appliedTargets.push({
      relPosix,
      packageRelativePath,
      candidatePath,
      destinationPath,
      candidateSha256: target?.candidateSha256 || null,
      currentSha256: target?.currentSha256 || null,
      diffSha256: target?.diffSha256 || null,
    });
  }

  const startupBridge = await ensureStartupEntryBridge({
    isolatedPackageRoot,
    manifest,
    packagePlugin,
    appliedTargets,
  });

  const assembleManifest = {
    ok: true,
    runId: RUN_ID,
    assembledAt: new Date().toISOString(),
    sourcePackageRoot: SOURCE_PACKAGE_ROOT,
    previewBundleRoot: PREVIEW_BUNDLE_ROOT,
    isolatedPackageRoot,
    sourcePreviewManifest: manifestPath,
    targetCount: appliedTargets.length,
    appliedTargets,
    startupEntry: startupBridge.startupEntry,
    startupBridge,
    boundary: "仅组装隔离联调包副本，不写真实 WorkBuddy 安装目录，不触发真实写回。",
  };

  const outputManifestPath = join(OUTPUT_ROOT, "assemble-manifest.json");
  await writeFile(outputManifestPath, JSON.stringify(assembleManifest, null, 2), "utf8");

  console.log(JSON.stringify({
    ok: true,
    runId: RUN_ID,
    isolatedPackageRoot,
    outputManifestPath,
    targetCount: appliedTargets.length,
    packageName,
    packagePrefixes,
    startupBridgeInjected: startupBridge.injected,
    appliedPaths: appliedTargets.map((item) => item.packageRelativePath),
  }, null, 2));
}

function stripLeadingPackageSegment(relPosix, packagePrefixes) {
  const normalizedRel = String(relPosix || "").replace(/\\/g, "/");
  for (const prefixBase of packagePrefixes) {
    const prefix = `${prefixBase}/`;
    if (normalizedRel.startsWith(prefix)) return normalizedRel.slice(prefix.length);
  }
  return normalizedRel;
}

function normalizePackageName(packageRoot) {
  return normalize(packageRoot).replace(/\\/g, "/").split("/").filter(Boolean).pop();
}

async function resolvePackagePrefixes(packageRoot, fallbackPackageName) {
  const prefixes = new Set([String(fallbackPackageName || "").trim()].filter(Boolean));
  const pluginManifest = await readPackagePlugin(packageRoot);
  if (!pluginManifest) return Array.from(prefixes);
  const pluginName = String(pluginManifest?.name || "").trim();
  const pluginAlias = String(pluginManifest?.plugin || "").trim();
  if (pluginName) prefixes.add(pluginName);
  if (pluginAlias) prefixes.add(pluginAlias);
  return Array.from(prefixes);
}

async function readPackagePlugin(packageRoot) {
  const pluginManifestPath = join(packageRoot, ".codebuddy-plugin", "plugin.json");
  if (!existsSync(pluginManifestPath)) return null;
  return JSON.parse(await readFile(pluginManifestPath, "utf8"));
}

async function ensureStartupEntryBridge({ isolatedPackageRoot, manifest, packagePlugin, appliedTargets }) {
  const startupEntryAgent = String(packagePlugin?.agentName || packagePlugin?.teamInfo?.leadAgent || "").trim();
  const startupEntryPath = startupEntryAgent
    ? join(isolatedPackageRoot, "agents", `${startupEntryAgent}.md`)
    : null;
  const startupEntry = {
    agentName: startupEntryAgent || null,
    path: startupEntryPath || null,
  };

  if (!startupEntryAgent || !startupEntryPath || !existsSync(startupEntryPath)) {
    return {
      injected: false,
      reason: "startup_entry_not_found",
      startupEntry,
    };
  }

  const expertTarget = appliedTargets.find((item) => String(item.packageRelativePath || "").startsWith("agents/"));
  if (!expertTarget) {
    return {
      injected: false,
      reason: "no_agent_target",
      startupEntry,
    };
  }

  const startupRelativePath = `agents/${startupEntryAgent}.md`;
  if (normalizeRel(expertTarget.packageRelativePath) === normalizeRel(startupRelativePath)) {
    return {
      injected: false,
      reason: "startup_entry_already_target",
      startupEntry,
      targetAgentPath: expertTarget.packageRelativePath,
    };
  }

  const startupContent = await readFile(startupEntryPath, "utf8");
  if (hasOntologyStartupRules(startupContent)) {
    return {
      injected: false,
      reason: "startup_entry_already_contains_rules",
      startupEntry,
      targetAgentPath: expertTarget.packageRelativePath,
    };
  }

  const targetAgentId = basename(String(expertTarget.packageRelativePath || ""), ".md");
  const sourceContract = manifest?.sourceContract || {};
  const bridgeBlock = [
    "",
    "## Ontology 启动桥接（隔离联调包）",
    "",
    "- 说明：当前专家包默认启动入口仍是主理人；本段仅用于 S3-02Z 隔离联调，确保启动入口先读取 Ontology 正式契约，再把任务转交给目标专家。",
    `- 当前联调 flowKey：${String(sourceContract?.flowKey || "unknown")}`,
    `- 当前联调 versionNo：${String(sourceContract?.versionNo ?? "unknown")}`,
    `- 当前目标专家：${targetAgentId}`,
    `- 当前目标文件：${normalizeRel(expertTarget.packageRelativePath)}`,
    "",
    "### 启动前读取动作",
    "",
    "- 第一步：调用 `get_ai_control_center_published_ontology_contract`，按当前 `flowKey` 读取 latest `published_contract`。",
    "- 第二步：调用 `get_ai_control_center_ontology_execution_plan`，读取执行前路线图；已知用户原始意图、taskId、stageRunId 时一并传入。",
    `- 第三步：确认本次路线命中的目标专家为 \`${targetAgentId}\`，再将任务转交给对应专家执行，不得跳过该判断直接沿旧入口习惯执行。`,
    "- 第四步：如不存在真实 `taskId/stageRunId`，只允许只读验证，不得伪造执行证据。",
    "",
    "### 禁止绕过",
    "",
    "- 不得读取 draft、publish-preview 或页面截图作为执行依据。",
    "- 不得因为已进入主理人入口就跳过 Ontology 正式契约读取。",
    "- 本段只服务于隔离联调包副本，不代表真实 WorkBuddy 真源已经更新。",
    "",
  ].join("\n");

  await writeFile(startupEntryPath, `${startupContent.trimEnd()}\n${bridgeBlock}`, "utf8");

  return {
    injected: true,
    reason: "startup_entry_missing_rules",
    startupEntry,
    targetAgentPath: expertTarget.packageRelativePath,
    flowKey: String(sourceContract?.flowKey || ""),
    versionNo: sourceContract?.versionNo ?? null,
    targetAgentId,
  };
}

function hasOntologyStartupRules(content) {
  const text = String(content || "");
  return text.includes("Ontology 启动前读取规则")
    || text.includes("get_ai_control_center_published_ontology_contract")
    || text.includes("get_ai_control_center_ontology_execution_plan");
}

function normalizeRel(value) {
  return String(value || "").replace(/\\/g, "/");
}

function resolveSafeSourcePackage(root) {
  const resolved = resolve(String(root || ""));
  const normalizedRoot = normalize(resolved).toLowerCase();
  assertOk(normalizedRoot.includes("\\development\\douyin-fullflow-ops-next"), `Source package must point to isolated development copy: ${resolved}`);
  assertOk(!normalizedRoot.includes("\\.workbuddy\\"), `Source package cannot point to real WorkBuddy install path: ${resolved}`);
  return resolved;
}

function resolveSafePreviewBundle(root) {
  const resolved = resolve(String(root || ""));
  const normalizedRoot = normalize(resolved).toLowerCase();
  assertOk(normalizedRoot.includes("\\runtime\\s3-02z-expert-preview-bundles\\"), `Preview bundle must come from runtime isolated export path: ${resolved}`);
  return resolved;
}

function resolveSafeOutputRoot(root) {
  const resolved = resolve(String(root || ""));
  const normalizedRoot = normalize(resolved).toLowerCase();
  const forbidden = [
    "\\.workbuddy\\",
    "\\expert-source\\",
    "\\development\\douyin-fullflow-ops-next\\agents\\",
  ];
  for (const marker of forbidden) {
    assertOk(!normalizedRoot.includes(marker), `Output root not allowed inside real or source package path: ${resolved}`);
  }
  return resolved;
}

function assertInside(root, filePath, message) {
  const normalizedRoot = resolve(root);
  const normalizedPath = resolve(filePath);
  assertOk(normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}\\`), message);
}

function assertOk(value, message) {
  if (!value) throw new Error(message);
}
