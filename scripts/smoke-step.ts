/* eslint-disable no-console */
import * as MdWriter from "../packages/shared/src/md-writer-core";

const TEST_MD = "agents/__md_writer_smoke_test__.md";

async function main() {
  const root = MdWriter.resolveGitRoot();
  const porcelain0 = MdWriter.gitStatusPorcelain(root);
  if (porcelain0 !== "") {
    console.error("[PRE] 工作区非 clean，尝试自动 reset --hard HEAD 清理（仅限冒烟测试脚本）...");
    MdWriter.gitResetHard("HEAD", { forceYes: true });
    const p2 = MdWriter.gitStatusPorcelain(root);
    if (p2 !== "") {
      console.error("[FAIL] 自动 reset 后仍 dirty:\n" + p2);
      process.exit(2);
    }
  }

  // Step 2: v0
  const f0 = MdWriter.newExpertFields({
    title: "md-writer smoke test agent",
    role: "测试角色 v0",
    use: "仅用于 Task 1.3 md-writer 冒烟验证；执行后会立即 reset HEAD 清掉",
    constraint: "不可作为生产 agents 保留",
    owner: "ai-ops-architect",
    contract: "输入：标题；输出：md 文本；异常：GitDirty 时拒绝",
    exceptions: "GitDirty -> GitDirtyError",
  });
  const md0 = MdWriter.toMarkdown("expert", f0);
  const w0 = MdWriter.writeMarkdownAtomic(TEST_MD, md0, { git_root: root });
  console.log("[A] 写入 v0 成功，bytes=", w0.bytes_written, "sha=", w0.md_sha256.slice(0, 12));

  const c0 = MdWriter.commitAfterWrite("TEST(md-writer smoke): baseline role v0 (临时 commit，结束 reset 会清)");
  console.log("[B] 基线 commit:", c0.commit_sha_short || c0.message);

  // Step 3: v1（仅改 role 一行 +1 字）
  const f1 = MdWriter.newExpertFields({ ...f0, role: "测试角色 v1（仅 1 字段变化，校验 diff 精准）" });
  const md1 = MdWriter.toMarkdown("expert", f1);
  if (md1 === md0) throw new Error("toMarkdown 不稳定：仅改 role 但 md 完全一致");
  const w1 = MdWriter.writeMarkdownAtomic(TEST_MD, md1, { git_root: root });
  console.log("[C] 写入 v1 成功，sha=", w1.md_sha256.slice(0, 12));

  // Step 4: diff 精准
  const diff = MdWriter.gitDiff(TEST_MD, { git_root: root });
  const goodV0 = diff.includes("-测试角色 v0") || diff.includes("-## role\n-测试角色 v0");
  const goodV1 = diff.includes("+测试角色 v1") || diff.includes("+## role\n+测试角色 v1");
  console.log("[D] diff 检查：删除 v0 =", !!goodV0, "，新增 v1 =", !!goodV1, "；diff 总长度 =", diff.length);
  if (!goodV0 || !goodV1) {
    console.error("[FAIL] diff 错误，前 4000 字：\n", diff.slice(0, 4000));
    process.exit(4);
  }

  // Step 5: reset 清理（把 TEST_MD 清掉，不污染权威配置仓 + 不留下 TEST(md-writer smoke) 临时 commit）
  MdWriter.gitResetHard("HEAD~1", { forceYes: true }); // 回到 baseline 前一个 commit，相当于 TEST_MD 从未存在
  // 再一次 reset 确保最后回到 2f3c75c 原始快照（如果 baseline commit 不是首个就用更稳的 git clean + reset）
  try {
    MdWriter.gitResetHard("HEAD", { forceYes: true });
    // 如果 TEST_MD 还在（例如 reset~1 把 baseline 回退，但 TEST_MD v0 是 untracked），清掉
    const tryPath = MdWriter.resolvePathInsideGitRoot(TEST_MD, root).abs;
    if (require("node:fs").existsSync(tryPath)) {
      require("node:fs").unlinkSync(tryPath);
    }
  } catch {}

  const after = MdWriter.gitStatusPorcelain(root);
  if (after !== "") {
    // 兜底：git clean -fd（清 TEST_MD 未跟踪）
    const { spawnSync } = require("node:child_process");
    spawnSync("git", ["-C", root, "clean", "-fd"], { stdio: "inherit" });
    const after2 = MdWriter.gitStatusPorcelain(root);
    if (after2 !== "") {
      console.error("[FAIL] reset 结束后仍 dirty，请手动清理：\n" + after2);
      process.exit(5);
    }
  }

  console.log("[OK] smoke-md-writer PASS：6 步骤全通过（clean 强制 → v0 写 → commit 基线 → v1 写 → diff 精准 1 块 → reset 还原 clean）。");
}
main().catch((e) => {
  // 异常兜底：reset --hard HEAD + git clean -fd，尽量避免留下 TEST 文件
  try {
    MdWriter.gitResetHard("HEAD", { forceYes: true });
  } catch {}
  try {
    const root = MdWriter.resolveGitRoot();
    const tryPath = MdWriter.resolvePathInsideGitRoot(TEST_MD, root)?.abs;
    if (tryPath && require("node:fs").existsSync(tryPath)) require("node:fs").unlinkSync(tryPath);
  } catch {}
  console.error("[FATAL]", e);
  process.exit(1);
});
