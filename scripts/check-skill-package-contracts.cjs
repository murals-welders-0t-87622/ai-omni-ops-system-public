const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const filesToCheck = [
  path.join(root, "docs/ai-control-center/skill-package/03-Ontology五元素候选全集.md"),
  path.join(root, "apps/server/src/modules/ai-control/data/ontology-atlas.seed.json"),
];
const openclawServicePath = path.join(root, "apps/server/src/modules/openclaw/openclaw.service.ts");

// 这组别名属于当前故意保留的统一编排动作，必须继续由后端真实实现承接。
const allowedLegacyNames = new Set([
  "create_openclaw_marketing_plan",
  "get_openclaw_marketing_plans",
]);

const openclawService = readFileSync(openclawServicePath, "utf8");
const implementedNames = new Set([
  ...matchAll(openclawService, /name:\s*"([a-z0-9_]+)"/g),
  ...matchAll(openclawService, /case\s+"([a-z0-9_]+)"/g),
]);

const issues = [];
for (const filePath of filesToCheck) {
  const text = readFileSync(filePath, "utf8");
  const names = Array.from(new Set(matchAll(text, /\b(?:get|create|update|delete|move|request|record|sync|search|add|remove|extract|fetch|route|manage|check|publish|rebuild|set|generate|list)_[a-z0-9_]+\b/g)));

  for (const name of names) {
    if (name.includes("openclaw")) {
      if (!allowedLegacyNames.has(name)) {
        issues.push(`${relative(filePath)} 引用了未授权的 legacy 名称: ${name}`);
        continue;
      }
      if (!implementedNames.has(name)) {
        issues.push(`${relative(filePath)} 引用了 legacy 名称但后端未实现: ${name}`);
      }
      continue;
    }

    if (name.includes("ai_control_center") && !implementedNames.has(name)) {
      issues.push(`${relative(filePath)} 引用了不存在的 AI 智控中心工具: ${name}`);
    }
  }
}

if (issues.length > 0) {
  console.error("SKILL_PACKAGE_CONTRACT_CHECK_FAILED");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("SKILL_PACKAGE_CONTRACT_CHECK_OK");
console.log(`Checked files: ${filesToCheck.map(relative).join(", ")}`);
console.log(`Allowed legacy names: ${Array.from(allowedLegacyNames).join(", ")}`);

function matchAll(text, pattern) {
  return Array.from(text.matchAll(pattern), (match) => match[1] || match[0]);
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}
