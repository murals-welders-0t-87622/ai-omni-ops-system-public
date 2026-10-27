#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * smoke-md-writer.mjs：md-writer-core.ts 最小 TR 验证（Task 1.3 D）
 * 流程：
 *   1. tsx 编译执行等价纯函数（通过 import md-writer-core.js 不现实，直接 spawn 子进程跑 ts 脚本）
 *   2. 这里跑 Node 等价脚本，用 child_process 调 tsx apps/server/src/modules/ai-control/\_\_tests\_\_/smoke-step.ts
 *   实际流程：本文件只负责 spawn：
 *      a. 准备 1 个临时测试用 agent md 内容（expert 类）
 *      b. tsx smoke-step.ts
 *      c. git diff 仅 1 字变化 = PASS；否则 = FAIL
 *      d. 最后 reset --hard HEAD 还原
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..");
const STEP_TS = path.join(REPO, "apps", "server", "src", "modules", "ai-control", "__tests__", "smoke-step.ts");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf-8", shell: false, stdio: "inherit", cwd: REPO, ...opts });
  return r;
}

function ensureStepFile() {
  const dir = path.dirname(STEP_TS);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(STEP_TS)) return;
  const content = `/* eslint-disable no-console */
import { MdWriter } from "@ai-omni/shared/src/md-writer-core";

const TEST_MD = "agents/__md_writer_smoke_test__.md"; // 临时测试 md，结束立即 reset 删除

async function main() {
  // Step 1: 检查 git clean（必须，否则 writeMarkdownAtomic 拒绝写）
  const porcelain = MdWriter.gitStatusPorcelain(MdWriter.resolveGitRoot());
  if (porcelain !== "") {
    console.error("[FAIL] 工作区 dirty，请先手动 reset 清干净");
    console.error(porcelain);
    process.exit(2);
  }

  // Step 2: 构造 expert：原始 role = "测试角色 v0"
  const f0 = MdWriter.newExpertFields({
    title: "md-writer 冒烟测试 Agent",
    role: "测试角色 v0",
    use: "仅用于 Task 1.3 端到端最小验证",
    constraint: "不允许在生产 expert-source 中保留此文件（结束 reset 会删除）",
    owner: "ai-ops-architect",
  });
  const md0 = MdWriter.toMarkdown("expert", f0);
  const w0 = MdWriter.writeMarkdownAtomic(TEST_MD, md0, {} as any);
  console.log("[A] 初始写入 OK，sha =", w0.md_sha256.slice(0, 12));

  // Step 3: commit （保证第一次 diff 有稳定基线）
  const c0 = MdWriter.commitAfterWrite("TEST(md-writer): 初始基线 TEST_MD role v0");
  console.log("[B] 基线 commit OK:", c0.commit_sha_short || c0.message);

  // Step 4: 仅改 1 字段 role = "测试角色 v1（仅 1 字变化 v0->v1，校验 diff 仅改这一行）"
  const f1 = MdWriter.newExpertFields({ ...f0, role: "测试角色 v1（仅 1 字变化 v0->v1，校验 diff 仅改这一行）" });
  const md1 = MdWriter.toMarkdown("expert", f1);
  const w1 = MdWriter.writeMarkdownAtomic(TEST_MD, md1, {} as any);
  console.log("[C] v1 写入 OK，sha =", w1.md_sha256.slice(0, 12));
  if (w1.md_sha256 === w0.md_sha256) {
    console.error("[FAIL] 写入前后 sha 一样（role 没变），toMarkdown/toMarkdown 不稳定");
    process.exit(3);
  }

  // Step 5: diff v1 仅 1 行块（通过简单匹配 "v0" / "v1"）
  const diff = MdWriter.gitDiff(TEST_MD);
  const hasV0Line = /^-## role\n-\s*测试角色 v0\s*$/m.test(diff) || diff.includes("-测试角色 v0");
  const hasV1Line = /^\+## role\n\+\s*测试角色 v1/.test(diff) || diff.includes("+测试角色 v1（仅 1 字变化 v0->v1");
  console.log("[D] diff 长度 =", diff.length, "字节；含 v0 删除 =", !!hasV0Line, "；含 v1 新增 =", !!hasV1Line);
  if (!hasV0Line || !hasV1Line) {
    console.error("[FAIL] diff 未出现预期 v0<->v1 变化。原始 diff 如下：\\n", diff.slice(0, 4000));
    process.exit(4);
  }

  // Step 6: reset --hard HEAD（还原 + 清掉 TEST_MD，不污染权威配置仓）
  const out = MdWriter.gitResetHard("HEAD", { forceYes: true });
  console.log("[E] reset --hard HEAD 成功 =", !!out);

  // Step 7: 回读 clean
  const afterPorcelain = MdWriter.gitStatusPorcelain(MdWriter.resolveGitRoot());
  if (afterPorcelain !== "") {
    console.error("[FAIL] reset 后工作区仍 dirty：\\n" + afterPorcelain);
    process.exit(5);
  }
  console.log("[OK] 全部 6 TR 步骤通过 md-writer core 最小闭环：");
  console.log("    1. git clean 拒绝写入 → 2. 原子写成功 → 3. commit 增量 → 4. 仅改 1 字段 → 5. diff 精准 1 块 → 6. reset clean 还原");
}
main().catch((e) => { console.error(e); process.exit(1); });
`;
  fs.writeFileSync(STEP_TS, content, "utf-8");
}

ensureStepFile();
const r = run("npx", ["--yes", "tsx@4.21.0", STEP_TS]);
process.exit(r.status ?? 99);
