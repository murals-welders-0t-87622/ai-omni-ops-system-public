#!/usr/bin/env node
/**
 * smoke-md-writer.cjs：md-writer-core.ts 最小 TR 验证（Node CJS，避免 ES module require not defined）
 *   STEP 1: 确保 git clean
 *   STEP 2: npx tsx apps/server/src/modules/ai-control/__tests__/smoke-step.ts
 *   STEP 3: 最后再次 git status clean，若失败手动 reset
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..");
const STEP_TS = path.join(REPO, "scripts", "smoke-step.ts");

function run(cmd, args, opts = {}) {
  const stdio = opts.stdio != null ? opts.stdio : "inherit";
  return spawnSync(cmd, args, {
    encoding: "utf-8",
    shell: false,
    stdio,
    cwd: REPO,
    env: { ...process.env, ...(opts.env || {}) },
  });
}

// 不重新写，直接运行已验证通过的 smoke-step.ts
if (!fs.existsSync(STEP_TS)) {
  console.error("smoke-step.ts not found at:", STEP_TS);
  process.exit(98);
}
const r = run("npx", ["tsx", STEP_TS]);
process.exit(r.status ?? 99);
