import { Injectable } from "@nestjs/common";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as MdWriter from "@ai-omni/shared/md-writer-core";
import type { MarkdownKind } from "@ai-omni/shared/md-writer-core";

const TREE_SCAN_CACHE_TTL_MS = 5_000;
const TREE_SECTIONS = ["agents", "skills", "references", ".codebuddy-plugin"] as const;
type TreeSection = typeof TREE_SECTIONS[number];
let treeScanCache: { key: string; expiresAt: number; value: any } | null = null;

@Injectable()
export class AiControlMdWriterService {
  constructor() {}

  // ---- 读写核心 ----
  async toMarkdown(kind: MarkdownKind, fields: Record<string, unknown>): Promise<string> {
    return MdWriter.toMarkdown(kind, fields as any);
  }

  async preview(opts: {
    kind: MarkdownKind;
    rel_or_abs_path: string;
    fields: Record<string, unknown>;
  }) {
    return MdWriter.previewMarkdownUpdate(opts.kind, opts.rel_or_abs_path, opts.fields as any);
  }

  async writePolicy() {
    const sourceRoot = MdWriter.resolveSourceRoot();
    let gitRoot: string | null = null;
    try {
      gitRoot = MdWriter.resolveGitRoot();
    } catch (error) {
      if (!(error instanceof MdWriter.GitRootMissingError)) throw error;
    }
    if (!gitRoot) {
      const writeEnabled = process.env.EXPERT_CONFIG_WRITE_ENABLED === "1";
      const writableMount = probeDirectoryWritable(sourceRoot);
      const localExecutorEnabled = process.env.EXPERT_CONFIG_LOCAL_WRITEBACK_EXECUTOR_ENABLED === "1";
      const blockedReasons = [
        !writeEnabled ? "EXPERT_CONFIG_WRITE_ENABLED 未开启" : null,
        !writableMount.writable ? "expert-source 当前不是可写挂载" : null,
        !localExecutorEnabled ? "EXPERT_CONFIG_LOCAL_WRITEBACK_EXECUTOR_ENABLED 未开启" : null,
      ].filter(Boolean);
      return {
        source_root: sourceRoot,
        source_mode: "readonly_non_git",
        git_root: null,
        git_head: null,
        write_enabled: writeEnabled,
        git_clean: false,
        git_clean_raw: false,
        git_clean_strategy: "not_available_non_git_source",
        writable_mount: writableMount.writable,
        writable_probe: writableMount,
        local_writeback_executor_enabled: localExecutorEnabled,
        commit_identity_configured: false,
        commit_identity: {
          user_name: "",
          user_email: "",
        },
        dirty_count_raw: 0,
        dirty_details: "",
        dirty_details_raw_sample: "",
        local_history_root: resolveLocalHistoryRoot(),
        local_history_available: true,
        required_gates: [
          "server_dry_run_preview",
          "explicit_diff_confirmation",
          "local_snapshot_history",
          "writable_expert_source_mount",
          "explicit_user_authorization",
        ],
        blocked_reason: blockedReasons.length
          ? `当前专家源是非 Git 的 WorkBuddy 本机插件目录；真实保存仍被拦截：${blockedReasons.join("、")}。`
          : "当前专家源是非 Git 的 WorkBuddy 本机插件目录；仅允许通过本机快照原子写盘执行器写回。",
        diagnosis: "读取源已与 Git 保存链路分离：非 Git 目录只能通过本机快照原子写盘执行器写回，不能走普通 Git save。",
      };
    }
    const rawPorcelain = MdWriter.gitStatusPorcelain(gitRoot);
    const normalizedPorcelain = MdWriter.gitStatusPorcelainWithAutocrlf(gitRoot);
    const writableMount = MdWriter.probeGitRootWritable(gitRoot);
    const commitIdentity = MdWriter.gitCommitIdentity(gitRoot);
    const head = MdWriter.gitHeadShort(gitRoot);
    const writeEnabled = process.env.EXPERT_CONFIG_WRITE_ENABLED === "1";
    const normalizedClean = normalizedPorcelain.trim() === "";
    const rawDirtyCount = rawPorcelain ? rawPorcelain.split(/\r?\n/).filter(Boolean).length : 0;
    const blockedReasons = [
      !writeEnabled ? "EXPERT_CONFIG_WRITE_ENABLED 未开启" : null,
      !normalizedClean ? "Git 工作区非 clean" : null,
      !writableMount.writable ? "expert-source 当前不是可写挂载" : null,
      !commitIdentity.configured ? "Git 提交身份未配置" : null,
    ].filter(Boolean);
    return {
      source_root: sourceRoot,
      source_mode: "git_source",
      git_root: gitRoot,
      git_head: head,
      write_enabled: writeEnabled,
      git_clean: normalizedClean,
      git_clean_raw: rawPorcelain.trim() === "",
      git_clean_strategy: "core.autocrlf=true",
      writable_mount: writableMount.writable,
      writable_probe: writableMount,
      commit_identity_configured: commitIdentity.configured,
      commit_identity: {
        user_name: commitIdentity.user_name,
        user_email: commitIdentity.user_email,
      },
      dirty_count_raw: rawDirtyCount,
      dirty_details: normalizedPorcelain,
      dirty_details_raw_sample: rawPorcelain.split(/\r?\n/).filter(Boolean).slice(0, 20).join("\n"),
      local_history_root: resolveLocalHistoryRoot(),
      local_history_available: true,
      required_gates: [
        "server_dry_run_preview",
        "explicit_diff_confirmation",
        "git_clean",
        "writable_expert_source_mount",
        "commit_and_rollback_evidence",
      ],
      blocked_reason: blockedReasons.length ? `${blockedReasons.join("；")}，当前只允许预览与 dry-run` : null,
      diagnosis: rawDirtyCount > 0 && normalizedClean
        ? "容器原始 Git 状态存在 CRLF/LF 视角差异；已用临时 core.autocrlf=true 对齐保存闸判断，未修改 Git 配置。"
        : null,
    };
  }

  async expertSourceMountGuide() {
    const policy = await this.writePolicy();
    const tree = await this.listTree();
    const latestRequest = readLatestSourceMountRequest();
    const hostPathHint = process.env.EXPERT_CONFIG_SOURCE_HOST_HINT
      ?? process.env.WORKBUDDY_EXPERT_SOURCE_HOST_PATH
      ?? "C:\\Users\\Administrator\\.workbuddy\\plugins\\marketplaces\\my-experts\\plugins";
    const writebackReadyNow = policy.write_enabled === true
      && policy.writable_mount === true
      && (policy as any).local_writeback_executor_enabled === true;
    return {
      ok: true,
      current: {
        source_root: policy.source_root,
        source_mode: policy.source_mode,
        write_enabled: policy.write_enabled,
        writable_mount: policy.writable_mount,
        local_history_root: policy.local_history_root,
        plugin_count: (tree as any)?.plugin_count ?? 0,
        agents_count: countTreeFiles((tree as any)?.tree?.agents),
        skills_count: countTreeFiles((tree as any)?.tree?.skills),
      },
      suggested: {
        host_path: hostPathHint,
        container_path: process.env.EXPERT_CONFIG_SOURCE_ROOT ?? "/expert-source",
        mount_mode: "writable",
        env_name: "WORKBUDDY_EXPERT_SOURCE_HOST_PATH",
      },
      latest_request: latestRequest,
      capabilities: {
        browser_can_read_host_path: false,
        can_apply_without_restart: false,
        can_enable_writeback_now: true,
      },
      commands: buildSourceMountCommands(hostPathHint),
      blocked_reason: writebackReadyNow
        ? null
        : "当前只差把 Lab 容器按可写专家源方式重建；重建后系统会自动开启真实写回，不需要用户再额外点开关。",
    };
  }

  async requestExpertSourceMount(opts: { host_path: string; mount_mode?: string | null }) {
    const hostPath = sanitizeHostPath(opts.host_path);
    const mountMode = opts.mount_mode === "readonly" ? "readonly" : "writable";
    const now = new Date().toISOString();
    const id = `${now.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}-${crypto.randomBytes(3).toString("hex")}`;
    const request = {
      id,
      created_at: now,
      requested_host_path: hostPath,
      requested_mount_mode: mountMode,
      container_path: process.env.EXPERT_CONFIG_SOURCE_ROOT ?? "/expert-source",
      status: "pending_docker_recreate",
      writeback_enabled_after_apply: true,
      note: mountMode === "writable"
        ? "已记录可写挂载申请；应用后 Lab 默认会直接开启真实写回。"
        : "已记录只读挂载申请；应用后仅用于扫描、预览、字段解析和本机快照。",
    };
    fs.appendFileSync(localSourceMountRequestPath(), `${JSON.stringify(request)}\n`, "utf-8");
    return {
      ok: true,
      request,
      commands: buildSourceMountCommands(hostPath),
      blocked_reason: "已记录挂载申请；重建 server/web/ingress 后会自动生效，并默认打通真实写回。",
    };
  }

  async writebackReadiness() {
    const policy = await this.writePolicy();
    const samples = await this.findMinimalWritebackSamples();
    const recommended = samples[0] ?? null;
    const gates = [
      {
        key: "real_source_mounted",
        label: "真实专家源已挂载",
        ok: !!policy.source_root,
        detail: policy.source_root ?? "未检测到 /expert-source",
      },
      {
        key: "minimal_sample_selected",
        label: "最小样本已识别",
        ok: !!recommended,
        detail: recommended ? `${recommended.rel_posix} · ${recommended.bytes} bytes` : "未找到可用于首次验证的 Markdown 文件",
      },
      {
        key: "local_history_available",
        label: "本机快照历史可用",
        ok: policy.local_history_available === true,
        detail: policy.local_history_root ?? "未配置本机历史目录",
      },
      {
        key: "write_enabled",
        label: "写入总开关",
        ok: policy.write_enabled === true,
        detail: policy.write_enabled ? "EXPERT_CONFIG_WRITE_ENABLED=1" : "EXPERT_CONFIG_WRITE_ENABLED 未开启",
      },
      {
        key: "writable_mount",
        label: "可写挂载",
        ok: policy.writable_mount === true,
        detail: policy.writable_mount ? "当前挂载可写" : "当前仍为只读或非 Git 真源",
      },
      {
        key: "non_git_writeback_executor",
        label: "本机快照写盘执行器",
        ok: (policy as any).local_writeback_executor_enabled === true,
        detail: (policy as any).local_writeback_executor_enabled
          ? "EXPERT_CONFIG_LOCAL_WRITEBACK_EXECUTOR_ENABLED=1"
          : "当前真实保存执行器仍未开放；首次验证前需明确采用本机快照写盘链路，不能绕过确认闸直接写 WorkBuddy 真源。",
      },
      {
        key: "explicit_user_authorization",
        label: "用户显式授权",
        ok: false,
        detail: "尚未授权真实保存写回。",
      },
    ];
    const blockers = gates.filter((gate) => !gate.ok);
    return {
      ok: false,
      action: "expert_config_writeback_readiness",
      ready_for_real_writeback: false,
      recommended_sample: recommended,
      candidate_samples: samples,
      gates,
      blockers: blockers.map((gate) => gate.key),
      next_required_steps: [
        "用户确认首次真实写回的样本文件",
        "将 /expert-source 切换为可写挂载并重启 lab 容器",
        "开启 EXPERT_CONFIG_WRITE_ENABLED=1",
        "保存前创建本机快照并确认完整 Diff SHA",
        "写入后立即回读同一路径并校验 SHA",
        "必要时用写前快照执行恢复预览和恢复请求",
      ],
      not_recommended_for_first_writeback: [
        "专家团主理人入口文件",
        "包含多专家调度规则的大型专家文档",
        "MCP/连接器签名文件",
        "用户正在生产调用的核心 Skill",
      ],
      policy: {
        source_root: policy.source_root,
        source_mode: policy.source_mode,
        write_enabled: policy.write_enabled,
        writable_mount: policy.writable_mount,
        local_writeback_executor_enabled: (policy as any).local_writeback_executor_enabled === true,
        local_history_root: policy.local_history_root,
        blocked_reason: policy.blocked_reason,
      },
      boundary: "本接口只做授权前检查和样本推荐，不创建快照、不写文件、不提交、不恢复。",
    };
  }

  async writebackExecutorPlan(opts?: { path?: string | null }) {
    const readiness = await this.writebackReadiness();
    const policy = await this.writePolicy();
    const targetPath = String(opts?.path ?? "").trim() || readiness.recommended_sample?.rel_posix || "";
    const current = targetPath ? MdWriter.readMarkdownAtomic(targetPath) : null;
    const executorEnabled = false;
    return {
      ok: false,
      action: "local_snapshot_writeback_executor_plan",
      executor_enabled: executorEnabled,
      executor_mode: "local_snapshot_atomic_write",
      target: current
        ? {
            rel_posix: current.rel_posix,
            current_sha256: current.md_sha256,
            current_bytes: Buffer.byteLength(current.md_text, "utf-8"),
          }
        : null,
      readiness: {
        ready_for_real_writeback: readiness.ready_for_real_writeback,
        blockers: readiness.blockers,
        recommended_sample: readiness.recommended_sample,
      },
      phases: [
        {
          key: "preflight",
          label: "写前预检",
          required: [
            "确认目标路径仍在 /expert-source 内",
            "确认 readiness 推荐样本或用户选择样本未变",
            "确认写入开关、可写挂载和用户授权均已通过",
          ],
        },
        {
          key: "pre_write_snapshot",
          label: "写前快照",
          required: [
            "读取当前文件并计算 SHA256",
            "写入本机快照 content.md 与 manifest.json",
            "把快照 ID 写入本机 index.jsonl",
          ],
        },
        {
          key: "candidate_validation",
          label: "候选稿校验",
          required: [
            "服务端 dry-run 生成候选 Markdown",
            "校验完整 Diff SHA 与候选 Markdown SHA",
            "确认候选稿只影响目标单文件",
          ],
        },
        {
          key: "atomic_write",
          label: "原子写盘",
          required: [
            "同目录写入临时文件",
            "fsync 临时文件内容",
            "rename 覆盖目标文件",
            "失败时删除临时文件并保留写前快照",
          ],
        },
        {
          key: "post_write_readback",
          label: "写后回读校验",
          required: [
            "重新读取同一路径",
            "重新计算 SHA256",
            "确认写后 SHA 等于候选 Markdown SHA",
          ],
        },
        {
          key: "audit_and_recovery",
          label: "审计与恢复锚点",
          required: [
            "追加本机写盘审计 JSONL",
            "返回写前快照 ID 与恢复预览接口",
            "若写后 SHA 不一致，进入恢复请求链路",
          ],
        },
      ],
      hard_blocks: [
        "当前接口只返回执行器草案，不执行写盘",
        "EXPERT_CONFIG_WRITE_ENABLED 未开启时不得写盘",
        "writable_mount=false 时不得写盘",
        "没有写前快照 ID 时不得写盘",
        "没有完整 Diff SHA 与候选 SHA 二次确认时不得写盘",
        "没有用户显式授权时不得写盘",
      ],
      audit_plan: {
        history_root: policy.local_history_root,
        pre_write_snapshot_index: "index.jsonl",
        save_request_audit: "save-write-requests.jsonl",
        future_execution_audit: "local-writeback-executions.jsonl",
        evidence_fields: [
          "execution_id",
          "rel_posix",
          "pre_write_snapshot_id",
          "before_sha256",
          "candidate_sha256",
          "after_sha256",
          "diff_sha256",
          "started_at",
          "finished_at",
          "result",
          "rollback_endpoint",
        ],
      },
      rollback_design: {
        source: "pre_write_snapshot",
        preview_endpoint: current ? `/api/ai-control/local-history/restore-preview?snapshotId={pre_write_snapshot_id}` : null,
        request_endpoint: "/api/ai-control/local-history/restore-request",
        required_before_restore: [
          "恢复预览 Diff 已读取",
          "恢复 Diff SHA 已二次确认",
          "恢复前再次创建当前文件快照",
          "可写挂载与用户授权仍有效",
        ],
      },
      policy: {
        source_root: policy.source_root,
        source_mode: policy.source_mode,
        write_enabled: policy.write_enabled,
        writable_mount: policy.writable_mount,
        local_history_root: policy.local_history_root,
        blocked_reason: policy.blocked_reason,
      },
      boundary: "本接口是本机快照写盘执行器草案，不创建快照、不写 WorkBuddy 真源、不提交、不恢复。",
    };
  }

  async writebackExecutorSimulation(opts?: { path?: string | null }) {
    const plan = await this.writebackExecutorPlan(opts);
    const policy = await this.writePolicy();
    const targetPath = plan.target?.rel_posix ?? plan.readiness?.recommended_sample?.rel_posix ?? "";
    const current = targetPath ? MdWriter.readMarkdownAtomic(targetPath) : null;
    const now = new Date().toISOString();
    const executionId = `${now.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}-${crypto.randomBytes(3).toString("hex")}`;
    const candidateSha = current?.md_sha256 ?? null;
    const simulatedDiffSha = MdWriter.sha256String("");
    const gates = [
      {
        key: "target_readable",
        label: "目标文件可读",
        ok: !!current,
        detail: current ? current.rel_posix : "未找到可模拟目标",
      },
      {
        key: "readiness",
        label: "readiness 通过",
        ok: plan.readiness?.ready_for_real_writeback === true,
        detail: plan.readiness?.ready_for_real_writeback ? "可进入真实写回" : `仍被拦截：${(plan.readiness?.blockers ?? []).join(",") || "unknown"}`,
      },
      {
        key: "executor_enabled",
        label: "执行器开放",
        ok: plan.executor_enabled === true,
        detail: plan.executor_enabled ? "已开放" : "当前只允许只读模拟",
      },
      {
        key: "write_enabled",
        label: "写入开关",
        ok: policy.write_enabled === true,
        detail: policy.write_enabled ? "EXPERT_CONFIG_WRITE_ENABLED=1" : "EXPERT_CONFIG_WRITE_ENABLED 未开启",
      },
      {
        key: "writable_mount",
        label: "可写挂载",
        ok: policy.writable_mount === true,
        detail: policy.writable_mount ? "当前挂载可写" : "当前仍为只读挂载或非 Git 真源",
      },
      {
        key: "pre_write_snapshot",
        label: "写前快照",
        ok: false,
        detail: "模拟模式不创建快照；真实写盘必须先创建快照。",
      },
      {
        key: "diff_and_candidate_confirmed",
        label: "Diff/SHA 二次确认",
        ok: false,
        detail: "模拟模式不接收二次确认；真实写盘必须确认完整 Diff SHA 和候选 Markdown SHA。",
      },
      {
        key: "explicit_user_authorization",
        label: "用户显式授权",
        ok: false,
        detail: "尚未授权真实写回。",
      },
    ];
    const blocked = gates.filter((gate) => !gate.ok);
    return {
      ok: false,
      action: "local_snapshot_writeback_executor_simulation",
      simulation_only: true,
      execution_id: executionId,
      result: "blocked_before_write",
      target: current
        ? {
            rel_posix: current.rel_posix,
            before_sha256: current.md_sha256,
            before_bytes: Buffer.byteLength(current.md_text, "utf-8"),
          }
        : null,
      simulated_candidate: current
        ? {
            sha256: candidateSha,
            bytes: Buffer.byteLength(current.md_text, "utf-8"),
            changed: false,
            diff_sha256: simulatedDiffSha,
            note: "只读模拟未生成新候选稿；真实执行时必须来自服务端 dry-run 候选 Markdown。",
          }
        : null,
      gates,
      blocked_gates: blocked.map((gate) => gate.key),
      would_execute_phases: (plan.phases ?? []).map((phase: any) => ({
        key: phase.key,
        label: phase.label,
        status: blocked.length ? "blocked" : "ready",
        evidence: phase.key === "atomic_write"
          ? "模拟模式不会创建临时文件、不会 fsync、不会 rename。"
          : "模拟模式只校验阶段条件，不产生写盘副作用。",
      })),
      audit_preview: {
        audit_file: path.posix.join(String(policy.local_history_root ?? "/data/expert-config-history"), "local-writeback-executions.jsonl"),
        would_append: false,
        record: {
          execution_id: executionId,
          rel_posix: current?.rel_posix ?? null,
          pre_write_snapshot_id: null,
          before_sha256: current?.md_sha256 ?? null,
          candidate_sha256: candidateSha,
          after_sha256: null,
          diff_sha256: simulatedDiffSha,
          started_at: now,
          finished_at: now,
          result: "blocked_before_write",
          blocked_gates: blocked.map((gate) => gate.key),
          rollback_endpoint: "/api/ai-control/local-history/restore-request",
        },
      },
      policy: {
        source_root: policy.source_root,
        source_mode: policy.source_mode,
        write_enabled: policy.write_enabled,
        writable_mount: policy.writable_mount,
        local_history_root: policy.local_history_root,
        blocked_reason: policy.blocked_reason,
      },
      boundary: "本接口只做只读模拟报告，不创建快照、不写审计、不写 WorkBuddy 真源、不提交、不恢复。",
    };
  }

  async writebackExecutorContractTests() {
    const startedAt = new Date().toISOString();
    const auditPath = localWritebackExecutionAuditPath();
    const auditLinesBefore = countExistingLines(auditPath);
    const readiness = await this.writebackReadiness();
    const samplePath = readiness.recommended_sample?.rel_posix ?? "";
    const tests: Array<{
      key: string;
      label: string;
      passed: boolean;
      expected: string;
      actual: string;
      evidence?: Record<string, unknown>;
    }> = [];

    const add = (input: typeof tests[number]) => tests.push(input);
    const captureExpectedFailure = async (key: string, label: string, expected: string, run: () => Promise<unknown>) => {
      try {
        const actual = await run();
        add({
          key,
          label,
          passed: false,
          expected,
          actual: `unexpected_success:${JSON.stringify(actual).slice(0, 200)}`,
        });
      } catch (error: any) {
        add({
          key,
          label,
          passed: true,
          expected,
          actual: error?.message ?? String(error),
          evidence: {
            error_name: error?.name ?? null,
            error_code: error?.code ?? null,
          },
        });
      }
    };

    const simulation = await this.writebackExecutorSimulation({ path: samplePath });
    add({
      key: "simulation_blocks_before_write",
      label: "模拟执行必须停在写盘前",
      passed: simulation.simulation_only === true
        && simulation.result === "blocked_before_write"
        && simulation.audit_preview?.would_append === false,
      expected: "simulation_only=true, result=blocked_before_write, would_append=false",
      actual: `simulation_only=${simulation.simulation_only}; result=${simulation.result}; would_append=${simulation.audit_preview?.would_append}`,
      evidence: {
        blocked_gates: simulation.blocked_gates,
      },
    });

    await captureExpectedFailure(
      "path_traversal_rejected",
      "路径穿越必须被拒绝",
      "PathOutsideExpertSourceError 或等价拒绝",
      async () => this.writebackExecutorPlan({ path: "../outside.md" }),
    );

    await captureExpectedFailure(
      "missing_target_rejected",
      "不存在目标必须被拒绝",
      "ENOENT 或文件不存在",
      async () => this.writebackExecutorPlan({ path: "missing/never-exists.md" }),
    );

    await captureExpectedFailure(
      "invalid_snapshot_id_rejected",
      "非法快照 ID 必须被拒绝",
      "snapshot_id 格式不合法",
      async () => this.previewLocalSnapshotRestore({ snapshot_id: "../bad" }),
    );

    await captureExpectedFailure(
      "direct_save_requires_write_switch",
      "直打 save 必须先过写入总开关",
      "EXPERT_CONFIG_WRITE_ENABLED 未开启",
      async () => this.save({
        kind: "skill",
        rel_or_abs_path: samplePath,
        fields: {},
        commit_message: null,
      }),
    );

    const auditLinesAfter = countExistingLines(auditPath);
    add({
      key: "simulation_audit_side_effect_free",
      label: "合同测试不得追加真实写盘审计",
      passed: auditLinesAfter === auditLinesBefore,
      expected: `audit line count unchanged: ${auditLinesBefore}`,
      actual: `before=${auditLinesBefore}; after=${auditLinesAfter}`,
      evidence: {
        audit_path: auditPath,
      },
    });

    const passedCount = tests.filter((test) => test.passed).length;
    return {
      ok: passedCount === tests.length,
      action: "local_snapshot_writeback_executor_contract_tests",
      readonly: true,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      target: samplePath || null,
      total: tests.length,
      passed: passedCount,
      failed: tests.length - passedCount,
      tests,
      boundary: "本接口只跑只读合同测试，不创建快照、不写审计、不写 WorkBuddy 真源、不提交、不恢复。",
    };
  }

  private async findMinimalWritebackSamples() {
    const tree = await this.listTree({ filesOnly: true });
    const entries = [
      ...(((tree as any)?.tree?.skills ?? []) as any[]).map((entry) => ({ ...entry, kind: "skill" as const })),
      ...(((tree as any)?.tree?.agents ?? []) as any[]).map((entry) => ({ ...entry, kind: "expert" as const })),
    ].filter((entry) => entry?.type === "file" && /\.md$/i.test(String(entry.rel ?? "")));
    const candidates: Array<{
      kind: "expert" | "skill";
      rel_posix: string;
      name: string;
      bytes: number;
      sha256: string;
      risk_level: "low" | "medium";
      reason: string;
      score: number;
    }> = [];
    for (const entry of entries) {
      try {
        const current = MdWriter.readMarkdownAtomic(entry.rel);
        const rel = current.rel_posix;
        const name = path.posix.basename(rel);
        const bytes = Buffer.byteLength(current.md_text, "utf-8");
        const systemDocPenalty = /(^|\/)(README|AGENTS|START-HERE|CHANGELOG|index)\.md$/i.test(rel) ? 8_000 : 0;
        const referencePenalty = /(^|\/)references\//i.test(rel) ? 7_000 : 0;
        const configEntryBonus = /(^|\/)SKILL\.md$/i.test(rel) ? -12_000 : 0;
        const centralPenalty = /(主理人|总控|orchestrator|director|router|governance|gateway|mcp|接口|连接器)/i.test(rel) ? 5_000 : 0;
        const kindPenalty = entry.kind === "expert" ? 2_000 : 0;
        const sizePenalty = bytes > 20_000 ? bytes : Math.round(bytes / 10);
        const score = sizePenalty + systemDocPenalty + referencePenalty + centralPenalty + kindPenalty + configEntryBonus;
        candidates.push({
          kind: entry.kind,
          rel_posix: rel,
          name,
          bytes,
          sha256: current.md_sha256,
          risk_level: systemDocPenalty || centralPenalty || bytes > 20_000 ? "medium" : "low",
          reason: entry.kind === "skill"
            ? "优先选择单个 Skill Markdown，范围小、回滚边界清楚。"
            : "专家文件会影响调度理解，仅在没有更小 Skill 样本时作为候选。",
          score,
        });
      } catch {
        continue;
      }
    }
    return candidates
      .sort((a, b) => a.score - b.score || a.rel_posix.localeCompare(b.rel_posix))
      .slice(0, 5)
      .map(({ score: _score, ...candidate }) => candidate);
  }

  assertWriteEnabled() {
    if (process.env.EXPERT_CONFIG_WRITE_ENABLED !== "1") {
      throw new MdWriter.MdWriterError("[md-writer] EXPERT_CONFIG_WRITE_ENABLED 未开启，当前禁止写入 expert-source。");
    }
  }

  async save(opts: {
    kind: MarkdownKind;
    rel_or_abs_path: string;
    fields: Record<string, unknown>;
    commit_message?: string | null;
  }) {
    this.assertWriteEnabled();
    const gitRoot = MdWriter.resolveGitRoot();
    const policy = await this.writePolicy();
    if (!policy.git_clean || !policy.writable_mount || !policy.commit_identity_configured) {
      throw new MdWriter.MdWriterError(`[md-writer] 写入闸门未全部通过：${policy.blocked_reason ?? "未知阻塞"}`);
    }
    const preview = MdWriter.previewMarkdownUpdate(opts.kind, opts.rel_or_abs_path, opts.fields as any, { git_root: gitRoot });
    const md_text = preview.candidate_md_text;
    const w = MdWriter.writeMarkdownAtomic(opts.rel_or_abs_path, md_text, { git_root: gitRoot });
    let commit = null as null | MdWriter.CommitResult;
    if (opts.commit_message && opts.commit_message.trim()) {
      commit = MdWriter.commitAfterWrite(opts.commit_message.trim(), { git_root: gitRoot });
    }
    return { write: w, commit, preview };
  }

  async requestSaveWriteback(opts: {
    kind: MarkdownKind;
    rel_or_abs_path: string;
    fields: Record<string, unknown>;
    confirm_diff_sha256?: string | null;
    confirm_candidate_sha256?: string | null;
    create_pre_write_snapshot?: boolean | null;
    explicit_user_authorized?: boolean | null;
  }) {
    const preview = MdWriter.previewMarkdownUpdate(opts.kind, opts.rel_or_abs_path, opts.fields as any);
    const current = MdWriter.readMarkdownAtomic(opts.rel_or_abs_path);
    const policy = await this.writePolicy();
    const actualDiffSha = MdWriter.sha256String(preview.diff ?? "");
    const requestedDiffSha = String(opts.confirm_diff_sha256 ?? "").trim();
    const requestedCandidateSha = String(opts.confirm_candidate_sha256 ?? "").trim();
    let preWriteSnapshot: any = null;
    if (opts.create_pre_write_snapshot === true) {
      preWriteSnapshot = (await this.createLocalSnapshot({
        path: current.rel_posix,
        note: `pre_write_snapshot_for_save_request_${new Date().toISOString()}`,
      })).snapshot;
    }
    const gates = [
      {
        key: "server_dry_run_preview",
        label: "服务端 Dry-run 预览",
        ok: true,
        detail: preview.changed ? "候选稿与当前真源有差异" : "候选稿与当前真源一致",
      },
      {
        key: "full_diff_confirmed",
        label: "完整 Diff 已二次确认",
        ok: requestedDiffSha.length > 0 && requestedDiffSha === actualDiffSha,
        detail: requestedDiffSha ? `提交 ${requestedDiffSha.slice(0, 12)} / 当前 ${actualDiffSha.slice(0, 12)}` : "尚未提交 Diff SHA 确认",
      },
      {
        key: "candidate_sha_confirmed",
        label: "候选 Markdown SHA 已确认",
        ok: requestedCandidateSha.length > 0 && requestedCandidateSha === preview.candidate_sha256,
        detail: requestedCandidateSha ? `提交 ${requestedCandidateSha.slice(0, 12)} / 当前 ${preview.candidate_sha256.slice(0, 12)}` : "尚未提交候选 SHA 确认",
      },
      {
        key: "pre_write_snapshot",
        label: "写前本机快照",
        ok: !!preWriteSnapshot,
        detail: preWriteSnapshot?.id ?? "尚未创建写前快照",
      },
      {
        key: "write_enabled",
        label: "写入开关",
        ok: policy.write_enabled === true,
        detail: policy.write_enabled ? "EXPERT_CONFIG_WRITE_ENABLED=1" : "EXPERT_CONFIG_WRITE_ENABLED 未开启",
      },
      {
        key: "writable_mount",
        label: "WorkBuddy 真源可写挂载",
        ok: policy.writable_mount === true,
        detail: policy.writable_mount ? "可写" : "当前只读或非 Git 真源",
      },
      {
        key: "explicit_user_authorization",
        label: "用户显式授权",
        ok: opts.explicit_user_authorized === true,
        detail: opts.explicit_user_authorized ? "已确认" : "未授权真实保存写回",
      },
    ];
    const blocked = gates.filter((gate) => !gate.ok);
    const audit = appendSaveWriteRequestAudit({
      action: "expert_config_save_writeback",
      rel_posix: current.rel_posix,
      kind: opts.kind,
      created_at: new Date().toISOString(),
      current_sha256: current.md_sha256,
      candidate_sha256: preview.candidate_sha256,
      diff_sha256: actualDiffSha,
      changed: preview.changed,
      pre_write_snapshot_id: preWriteSnapshot?.id ?? null,
      expected_post_write_sha256: preview.candidate_sha256,
      blocked_gates: blocked.map((gate) => gate.key),
      save_enabled: false,
    });
    return {
      ok: false,
      action: "expert_config_save_writeback",
      save_enabled: false,
      save_blocked_reason: blocked.length
        ? `保存写回仍被拦截：${blocked.map((gate) => gate.label).join("、")} 未通过。`
        : "保存写回总闸仍未开放；当前版本只返回确认闸证据，不执行写盘。",
      audit,
      gates,
      preview: {
        rel_posix: preview.rel_posix,
        changed: preview.changed,
        current: {
          sha256: current.md_sha256,
          bytes: Buffer.byteLength(current.md_text, "utf-8"),
        },
        candidate: {
          sha256: preview.candidate_sha256,
          bytes: preview.candidate_bytes,
        },
        diff_sha256: actualDiffSha,
        diff_length: (preview.diff ?? "").length,
        changed_fields: preview.changed_fields,
      },
      pre_write_snapshot: preWriteSnapshot,
      post_write_verification: {
        expected_sha256: preview.candidate_sha256,
        expected_bytes: preview.candidate_bytes,
        verify_by_readback: true,
        readback_path: current.rel_posix,
        required_checks: [
          "写入后重新读取同一路径",
          "重新计算文件 SHA256",
          "确认写后 SHA 等于候选 Markdown SHA",
          "确认审计记录写入本机历史卷",
          "确认 WorkBuddy 真源文件只发生预期单文件变化",
        ],
      },
      rollback_plan: {
        available: !!preWriteSnapshot,
        snapshot_id: preWriteSnapshot?.id ?? null,
        restore_preview_endpoint: preWriteSnapshot?.id
          ? `/api/ai-control/local-history/restore-preview?snapshotId=${preWriteSnapshot.id}`
          : null,
        restore_request_endpoint: "/api/ai-control/local-history/restore-request",
        required_before_restore: [
          "读取恢复预览 Diff",
          "二次确认恢复 Diff SHA",
          "恢复前再次创建快照",
          "确认可写挂载与写入开关",
          "用户显式授权",
        ],
      },
      policy: {
        source_root: policy.source_root,
        source_mode: policy.source_mode,
        write_enabled: policy.write_enabled,
        writable_mount: policy.writable_mount,
        local_history_root: policy.local_history_root,
        blocked_reason: policy.blocked_reason,
      },
    };
  }

  async executeSaveWriteback(opts: {
    kind: MarkdownKind;
    rel_or_abs_path: string;
    fields: Record<string, unknown>;
    confirm_diff_sha256?: string | null;
    confirm_candidate_sha256?: string | null;
    create_pre_write_snapshot?: boolean | null;
    explicit_user_authorized?: boolean | null;
    requested_by?: string | null;
    note?: string | null;
  }) {
    const preview = MdWriter.previewMarkdownUpdate(opts.kind, opts.rel_or_abs_path, opts.fields as any);
    const current = MdWriter.readMarkdownAtomic(opts.rel_or_abs_path);
    const policy = await this.writePolicy();
    const actualDiffSha = MdWriter.sha256String(preview.diff ?? "");
    const requestedDiffSha = String(opts.confirm_diff_sha256 ?? "").trim();
    const requestedCandidateSha = String(opts.confirm_candidate_sha256 ?? "").trim();
    let preWriteSnapshot: any = null;
    if (opts.create_pre_write_snapshot === true) {
      preWriteSnapshot = (await this.createLocalSnapshot({
        path: current.rel_posix,
        note: `pre_write_snapshot_for_execute_${new Date().toISOString()}`,
      })).snapshot;
    }
    const gates = [
      {
        key: "server_dry_run_preview",
        label: "服务端 Dry-run 预览",
        ok: true,
        detail: preview.changed ? "候选稿与当前真源有差异" : "候选稿与当前真源一致",
      },
      {
        key: "full_diff_confirmed",
        label: "完整 Diff 已二次确认",
        ok: requestedDiffSha.length > 0 && requestedDiffSha === actualDiffSha,
        detail: requestedDiffSha ? `提交 ${requestedDiffSha.slice(0, 12)} / 当前 ${actualDiffSha.slice(0, 12)}` : "尚未提交 Diff SHA 确认",
      },
      {
        key: "candidate_sha_confirmed",
        label: "候选 Markdown SHA 已确认",
        ok: requestedCandidateSha.length > 0 && requestedCandidateSha === preview.candidate_sha256,
        detail: requestedCandidateSha ? `提交 ${requestedCandidateSha.slice(0, 12)} / 当前 ${preview.candidate_sha256.slice(0, 12)}` : "尚未提交候选 SHA 确认",
      },
      {
        key: "pre_write_snapshot",
        label: "写前本机快照",
        ok: !!preWriteSnapshot,
        detail: preWriteSnapshot?.id ?? "尚未创建写前快照",
      },
      {
        key: "local_writeback_executor_enabled",
        label: "本机原子写盘执行器开关",
        ok: (policy as any).local_writeback_executor_enabled === true,
        detail: (policy as any).local_writeback_executor_enabled
          ? "EXPERT_CONFIG_LOCAL_WRITEBACK_EXECUTOR_ENABLED=1"
          : "EXPERT_CONFIG_LOCAL_WRITEBACK_EXECUTOR_ENABLED 未开启",
      },
      {
        key: "write_enabled",
        label: "写入开关",
        ok: policy.write_enabled === true,
        detail: policy.write_enabled ? "EXPERT_CONFIG_WRITE_ENABLED=1" : "EXPERT_CONFIG_WRITE_ENABLED 未开启",
      },
      {
        key: "writable_mount",
        label: "WorkBuddy 真源可写挂载",
        ok: policy.writable_mount === true,
        detail: policy.writable_mount ? "可写" : "当前只读或非 Git 真源",
      },
      {
        key: "explicit_user_authorization",
        label: "用户显式授权",
        ok: opts.explicit_user_authorized === true,
        detail: opts.explicit_user_authorized ? "已确认" : "未授权真实保存写回",
      },
    ];
    const blocked = gates.filter((gate) => !gate.ok);
    const startedAt = new Date().toISOString();
    const executionId = `${startedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}-${crypto.randomBytes(3).toString("hex")}`;
    if (blocked.length) {
      const audit = appendLocalWritebackExecutionAudit({
        execution_id: executionId,
        action: "local_snapshot_writeback_execute",
        result: "blocked_before_write",
        rel_posix: current.rel_posix,
        kind: opts.kind,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        before_sha256: current.md_sha256,
        candidate_sha256: preview.candidate_sha256,
        after_sha256: null,
        diff_sha256: actualDiffSha,
        pre_write_snapshot_id: preWriteSnapshot?.id ?? null,
        requested_by: String(opts.requested_by ?? "unknown").slice(0, 128),
        note: String(opts.note ?? "").slice(0, 500) || null,
        blocked_gates: blocked.map((gate) => gate.key),
      });
      return this.buildExecuteWritebackResult({
        ok: false,
        result: "blocked_before_write",
        executionId,
        current,
        preview,
        actualDiffSha,
        gates,
        preWriteSnapshot,
      postWriteSnapshot: null,
        policy,
        audit,
        write: null,
        after: null,
      });
    }

    const write = atomicWriteExistingMarkdown(current.abs, preview.candidate_md_text);
    const after = MdWriter.readMarkdownAtomic(current.rel_posix);
    const verified = after.md_sha256 === preview.candidate_sha256;
    let postWriteSnapshot: any = null;
    if (verified) {
      postWriteSnapshot = (await this.createLocalSnapshot({
        path: current.rel_posix,
        note: `post_write_snapshot_for_execute_${new Date().toISOString()}`,
      })).snapshot;
    }
    const audit = appendLocalWritebackExecutionAudit({
      execution_id: executionId,
      action: "local_snapshot_writeback_execute",
      result: verified ? "written_and_verified" : "written_but_verification_failed",
      rel_posix: current.rel_posix,
      kind: opts.kind,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      before_sha256: current.md_sha256,
      candidate_sha256: preview.candidate_sha256,
      after_sha256: after.md_sha256,
      diff_sha256: actualDiffSha,
      pre_write_snapshot_id: preWriteSnapshot?.id ?? null,
      requested_by: String(opts.requested_by ?? "unknown").slice(0, 128),
      note: String(opts.note ?? "").slice(0, 500) || null,
      blocked_gates: [],
      bytes_written: write.bytes_written,
    });
    return this.buildExecuteWritebackResult({
      ok: verified,
      result: verified ? "written_and_verified" : "written_but_verification_failed",
      executionId,
      current,
      preview,
      actualDiffSha,
      gates,
      preWriteSnapshot,
      postWriteSnapshot,
      policy,
      audit,
      write,
      after,
    });
  }

  private buildExecuteWritebackResult(input: {
    ok: boolean;
    result: string;
    executionId: string;
    current: { rel_posix: string; md_text: string; md_sha256: string };
    preview: any;
    actualDiffSha: string;
    gates: Array<{ key: string; label: string; ok: boolean; detail: string }>;
    preWriteSnapshot: any;
    postWriteSnapshot: any;
    policy: any;
    audit: any;
    write: null | { bytes_written: number; md_sha256: string };
    after: null | { md_sha256: string; md_text: string };
  }) {
    const blocked = input.gates.filter((gate) => !gate.ok);
    return {
      ok: input.ok,
      action: "local_snapshot_writeback_execute",
      result: input.result,
      execution_id: input.executionId,
      save_enabled: input.ok,
      write_executed: !!input.write,
      save_blocked_reason: blocked.length
        ? `真实写回仍被拦截：${blocked.map((gate) => gate.label).join("、")} 未通过。`
        : null,
      audit: input.audit,
      gates: input.gates,
      preview: {
        rel_posix: input.preview.rel_posix,
        changed: input.preview.changed,
        current: {
          sha256: input.current.md_sha256,
          bytes: Buffer.byteLength(input.current.md_text, "utf-8"),
        },
        candidate: {
          sha256: input.preview.candidate_sha256,
          bytes: input.preview.candidate_bytes,
        },
        diff_sha256: input.actualDiffSha,
        diff_length: (input.preview.diff ?? "").length,
        changed_fields: input.preview.changed_fields,
      },
      pre_write_snapshot: input.preWriteSnapshot,
      post_write_snapshot: input.postWriteSnapshot,
      write: input.write,
      post_write_verification: {
        expected_sha256: input.preview.candidate_sha256,
        actual_sha256: input.after?.md_sha256 ?? null,
        verified: input.after ? input.after.md_sha256 === input.preview.candidate_sha256 : false,
        readback_path: input.current.rel_posix,
      },
      rollback_plan: {
        available: !!input.preWriteSnapshot,
        snapshot_id: input.preWriteSnapshot?.id ?? null,
        restore_preview_endpoint: input.preWriteSnapshot?.id
          ? `/api/ai-control/local-history/restore-preview?snapshotId=${input.preWriteSnapshot.id}`
          : null,
        restore_request_endpoint: "/api/ai-control/local-history/restore-request",
      },
      policy: {
        source_root: input.policy.source_root,
        source_mode: input.policy.source_mode,
        write_enabled: input.policy.write_enabled,
        writable_mount: input.policy.writable_mount,
        local_writeback_executor_enabled: (input.policy as any).local_writeback_executor_enabled === true,
        local_history_root: input.policy.local_history_root,
        blocked_reason: input.policy.blocked_reason,
      },
      boundary: "该接口只服务于已确认的写回闸；未通过全部 gates 时不会写盘。写回成功也不提交 Git、不触发 WorkBuddy 业务执行。",
    };
  }

  async diff(path?: string | null) {
    try {
      return MdWriter.gitDiff(path ?? null);
    } catch (error) {
      if (error instanceof MdWriter.GitRootMissingError) {
        return "当前专家源不是 Git 仓；Diff/历史将在本机版本历史机制完成后开放。";
      }
      throw error;
    }
  }

  async log(n: number) {
    try {
      return MdWriter.gitLog(Math.max(1, Math.min(100, n)));
    } catch (error) {
      if (error instanceof MdWriter.GitRootMissingError) {
        return "当前专家源不是 Git 仓；历史记录将在本机快照机制完成后开放。";
      }
      throw error;
    }
  }

  async resetHard(hash: string, force_yes: boolean) {
    return MdWriter.gitResetHard(hash, { forceYes: !!force_yes });
  }

  async listLocalHistory(opts: { path?: string | null; limit?: number | null }) {
    const historyRoot = resolveLocalHistoryRoot();
    const indexPath = localHistoryIndexPath(historyRoot);
    const limit = Math.max(1, Math.min(100, opts.limit ?? 20));
    const relFilter = opts.path ? MdWriter.resolvePathInsideSourceRoot(opts.path, MdWriter.resolveSourceRoot()).rel_posix : null;
    const entries = fs.existsSync(indexPath)
      ? fs.readFileSync(indexPath, "utf-8")
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter((entry) => entry && (!relFilter || entry.rel_posix === relFilter))
          .slice(-limit)
          .reverse()
      : [];
    return {
      history_root: historyRoot,
      source_root: MdWriter.resolveSourceRoot(),
      path: relFilter,
      count: entries.length,
      entries,
    };
  }

  async createLocalSnapshot(opts: { path: string; note?: string | null }) {
    if (!opts.path) {
      throw new MdWriter.MdWriterError("[local-history] path 必填");
    }
    const historyRoot = resolveLocalHistoryRoot();
    const current = MdWriter.readMarkdownAtomic(opts.path);
    const now = new Date().toISOString();
    const id = `${now.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}-${crypto.randomBytes(3).toString("hex")}`;
    const snapshotDir = path.join(historyRoot, "snapshots", id);
    fs.mkdirSync(snapshotDir, { recursive: true });
    const contentPath = path.join(snapshotDir, "content.md");
    const manifestPath = path.join(snapshotDir, "manifest.json");
    fs.writeFileSync(contentPath, current.md_text, "utf-8");
    const manifest = {
      id,
      created_at: now,
      rel_posix: current.rel_posix,
      source_root: MdWriter.resolveSourceRoot(),
      source_sha256: current.md_sha256,
      bytes: Buffer.byteLength(current.md_text, "utf-8"),
      note: (opts.note ?? "").trim() || "manual_snapshot_before_write",
      content_path: contentPath,
      manifest_path: manifestPath,
      restore_enabled: false,
      restore_blocked_reason: "当前阶段只创建本机回滚点；写回 WorkBuddy 真源需可写挂载、Diff 确认和用户授权。",
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
    fs.appendFileSync(localHistoryIndexPath(historyRoot), `${JSON.stringify(manifest)}\n`, "utf-8");
    return {
      ok: true,
      history_root: historyRoot,
      snapshot: manifest,
    };
  }

  async previewLocalSnapshotRestore(opts: { snapshot_id: string }) {
    const snapshotId = sanitizeSnapshotId(opts.snapshot_id);
    const historyRoot = resolveLocalHistoryRoot();
    const snapshotDir = path.join(historyRoot, "snapshots", snapshotId);
    const manifestPath = path.join(snapshotDir, "manifest.json");
    const contentPath = path.join(snapshotDir, "content.md");
    if (!fs.existsSync(manifestPath) || !fs.existsSync(contentPath)) {
      throw new MdWriter.MdWriterError(`[local-history] 快照不存在：${snapshotId}`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const relPosix = MdWriter.resolvePathInsideSourceRoot(String(manifest.rel_posix ?? ""), MdWriter.resolveSourceRoot()).rel_posix;
    const snapshotText = fs.readFileSync(contentPath, "utf-8");
    const snapshotSha = MdWriter.sha256String(snapshotText);
    if (manifest.source_sha256 && snapshotSha !== manifest.source_sha256) {
      throw new MdWriter.MdWriterError(`[local-history] 快照内容校验失败：${snapshotId}`);
    }

    const current = MdWriter.readMarkdownAtomic(relPosix);
    const changed = current.md_text !== snapshotText;
    return {
      ok: true,
      snapshot: {
        ...manifest,
        content_path: contentPath,
        manifest_path: manifestPath,
      },
      current: {
        rel_posix: current.rel_posix,
        sha256: current.md_sha256,
        bytes: Buffer.byteLength(current.md_text, "utf-8"),
      },
      restore_candidate: {
        sha256: snapshotSha,
        bytes: Buffer.byteLength(snapshotText, "utf-8"),
      },
      changed,
      diff: changed ? MdWriter.buildUnifiedDiff(current.rel_posix, current.md_text, snapshotText) : "",
      diff_sha256: MdWriter.sha256String(changed ? MdWriter.buildUnifiedDiff(current.rel_posix, current.md_text, snapshotText) : ""),
      diff_length: (changed ? MdWriter.buildUnifiedDiff(current.rel_posix, current.md_text, snapshotText) : "").length,
      restore_enabled: false,
      restore_blocked_reason: "当前阶段只允许恢复预览；写回 WorkBuddy 真源需可写挂载、完整 Diff 确认和用户授权。",
    };
  }

  async requestLocalSnapshotRestore(opts: {
    snapshot_id: string;
    confirm_diff_sha256?: string | null;
    confirm_changed?: boolean | null;
    create_pre_restore_snapshot?: boolean | null;
    explicit_user_authorized?: boolean | null;
  }) {
    const preview = await this.previewLocalSnapshotRestore({ snapshot_id: opts.snapshot_id });
    const policy = await this.writePolicy();
    const requestedDiffSha = String(opts.confirm_diff_sha256 ?? "").trim();
    const actualDiffSha = MdWriter.sha256String(preview.diff ?? "");
    const gates = [
      {
        key: "restore_preview_exists",
        label: "已生成恢复预览",
        ok: !!preview.ok,
        detail: preview.snapshot?.id ?? "",
      },
      {
        key: "full_diff_confirmed",
        label: "完整 Diff 已二次确认",
        ok: requestedDiffSha.length > 0 && requestedDiffSha === actualDiffSha && !!opts.confirm_changed === !!preview.changed,
        detail: requestedDiffSha ? `提交 ${requestedDiffSha.slice(0, 12)} / 当前 ${actualDiffSha.slice(0, 12)}` : "尚未提交 Diff SHA 确认",
      },
      {
        key: "pre_restore_snapshot",
        label: "恢复前已要求再建快照",
        ok: opts.create_pre_restore_snapshot === true,
        detail: opts.create_pre_restore_snapshot ? "已确认" : "未确认",
      },
      {
        key: "write_enabled",
        label: "写入开关",
        ok: policy.write_enabled === true,
        detail: policy.write_enabled ? "EXPERT_CONFIG_WRITE_ENABLED=1" : "EXPERT_CONFIG_WRITE_ENABLED 未开启",
      },
      {
        key: "writable_mount",
        label: "WorkBuddy 真源可写挂载",
        ok: policy.writable_mount === true,
        detail: policy.writable_mount ? "可写" : "当前只读或非 Git 真源",
      },
      {
        key: "explicit_user_authorization",
        label: "用户显式授权",
        ok: opts.explicit_user_authorized === true,
        detail: opts.explicit_user_authorized ? "已确认" : "未授权真实恢复写回",
      },
    ];
    const blocked = gates.filter((gate) => !gate.ok);
    return {
      ok: false,
      action: "local_snapshot_restore_writeback",
      snapshot_id: preview.snapshot?.id ?? opts.snapshot_id,
      restore_enabled: false,
      restore_blocked_reason: blocked.length
        ? `恢复写回仍被拦截：${blocked.map((gate) => gate.label).join("、")} 未通过。`
        : "恢复写回总闸仍未开放；当前版本只返回确认闸证据，不执行写盘。",
      gates,
      preview: {
        changed: preview.changed,
        current: preview.current,
        restore_candidate: preview.restore_candidate,
        diff_sha256: actualDiffSha,
        diff_length: (preview.diff ?? "").length,
      },
      policy: {
        source_root: policy.source_root,
        source_mode: policy.source_mode,
        write_enabled: policy.write_enabled,
        writable_mount: policy.writable_mount,
        local_history_root: policy.local_history_root,
        blocked_reason: policy.blocked_reason,
      },
    };
  }

  async executeLocalSnapshotRestore(opts: {
    snapshot_id: string;
    confirm_diff_sha256?: string | null;
    confirm_changed?: boolean | null;
    create_pre_restore_snapshot?: boolean | null;
    explicit_user_authorized?: boolean | null;
    requested_by?: string | null;
    note?: string | null;
  }) {
    const preview = await this.previewLocalSnapshotRestore({ snapshot_id: opts.snapshot_id });
    const policy = await this.writePolicy();
    const relPosix = MdWriter.resolvePathInsideSourceRoot(String(preview.snapshot?.rel_posix ?? ""), MdWriter.resolveSourceRoot()).rel_posix;
    const current = MdWriter.readMarkdownAtomic(relPosix);
    const snapshotText = fs.readFileSync(String(preview.snapshot?.content_path ?? ""), "utf-8");
    const requestedDiffSha = String(opts.confirm_diff_sha256 ?? "").trim();
    const actualDiffSha = MdWriter.sha256String(preview.diff ?? "");
    let preRestoreSnapshot: any = null;
    if (opts.create_pre_restore_snapshot === true) {
      preRestoreSnapshot = (await this.createLocalSnapshot({
        path: current.rel_posix,
        note: `pre_restore_snapshot_for_execute_${new Date().toISOString()}`,
      })).snapshot;
    }
    const gates = [
      {
        key: "restore_preview_exists",
        label: "已生成恢复预览",
        ok: !!preview.ok,
        detail: preview.snapshot?.id ?? "",
      },
      {
        key: "full_diff_confirmed",
        label: "完整 Diff 已二次确认",
        ok: requestedDiffSha.length > 0 && requestedDiffSha === actualDiffSha && !!opts.confirm_changed === !!preview.changed,
        detail: requestedDiffSha ? `提交 ${requestedDiffSha.slice(0, 12)} / 当前 ${actualDiffSha.slice(0, 12)}` : "尚未提交 Diff SHA 确认",
      },
      {
        key: "pre_restore_snapshot",
        label: "恢复前本机快照",
        ok: !!preRestoreSnapshot,
        detail: preRestoreSnapshot?.id ?? "尚未创建恢复前快照",
      },
      {
        key: "local_writeback_executor_enabled",
        label: "本机原子写盘执行器开关",
        ok: (policy as any).local_writeback_executor_enabled === true,
        detail: (policy as any).local_writeback_executor_enabled
          ? "EXPERT_CONFIG_LOCAL_WRITEBACK_EXECUTOR_ENABLED=1"
          : "EXPERT_CONFIG_LOCAL_WRITEBACK_EXECUTOR_ENABLED 未开启",
      },
      {
        key: "write_enabled",
        label: "写入开关",
        ok: policy.write_enabled === true,
        detail: policy.write_enabled ? "EXPERT_CONFIG_WRITE_ENABLED=1" : "EXPERT_CONFIG_WRITE_ENABLED 未开启",
      },
      {
        key: "writable_mount",
        label: "WorkBuddy 真源可写挂载",
        ok: policy.writable_mount === true,
        detail: policy.writable_mount ? "可写" : "当前只读或非 Git 真源",
      },
      {
        key: "explicit_user_authorization",
        label: "用户显式授权",
        ok: opts.explicit_user_authorized === true,
        detail: opts.explicit_user_authorized ? "已确认" : "未授权真实恢复写回",
      },
    ];
    const blocked = gates.filter((gate) => !gate.ok);
    const startedAt = new Date().toISOString();
    const executionId = `${startedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}-${crypto.randomBytes(3).toString("hex")}`;
    const requestedBy = String(opts.requested_by ?? "unknown").slice(0, 128);
    const note = String(opts.note ?? "").slice(0, 500) || null;

    if (blocked.length) {
      const audit = appendLocalWritebackExecutionAudit({
        execution_id: executionId,
        action: "local_snapshot_restore_execute",
        result: "blocked_before_restore",
        rel_posix: current.rel_posix,
        kind: "snapshot_restore",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        before_sha256: current.md_sha256,
        candidate_sha256: preview.restore_candidate?.sha256 ?? null,
        after_sha256: null,
        diff_sha256: actualDiffSha,
        pre_write_snapshot_id: preRestoreSnapshot?.id ?? null,
        requested_by: requestedBy,
        note,
        blocked_gates: blocked.map((gate) => gate.key),
      });
      return {
        ok: false,
        action: "local_snapshot_restore_execute",
        result: "blocked_before_restore",
        execution_id: executionId,
        restore_enabled: false,
        restore_executed: false,
        restore_blocked_reason: `真实恢复仍被拦截：${blocked.map((gate) => gate.label).join("、")} 未通过。`,
        audit,
        gates,
        preview: {
          changed: preview.changed,
          current: preview.current,
          restore_candidate: preview.restore_candidate,
          diff_sha256: actualDiffSha,
          diff_length: (preview.diff ?? "").length,
        },
        pre_restore_snapshot: preRestoreSnapshot,
        post_restore_snapshot: null,
        policy: {
          source_root: policy.source_root,
          source_mode: policy.source_mode,
          write_enabled: policy.write_enabled,
          writable_mount: policy.writable_mount,
          local_history_root: policy.local_history_root,
          blocked_reason: policy.blocked_reason,
        },
      };
    }

    if (!preview.changed) {
      const audit = appendLocalWritebackExecutionAudit({
        execution_id: executionId,
        action: "local_snapshot_restore_execute",
        result: "already_matches_snapshot",
        rel_posix: current.rel_posix,
        kind: "snapshot_restore",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        before_sha256: current.md_sha256,
        candidate_sha256: preview.restore_candidate?.sha256 ?? null,
        after_sha256: current.md_sha256,
        diff_sha256: actualDiffSha,
        pre_write_snapshot_id: preRestoreSnapshot?.id ?? null,
        requested_by: requestedBy,
        note,
        blocked_gates: [],
      });
      return {
        ok: true,
        action: "local_snapshot_restore_execute",
        result: "already_matches_snapshot",
        execution_id: executionId,
        restore_enabled: true,
        restore_executed: false,
        restore_blocked_reason: null,
        audit,
        gates,
        preview: {
          changed: false,
          current: preview.current,
          restore_candidate: preview.restore_candidate,
          diff_sha256: actualDiffSha,
          diff_length: (preview.diff ?? "").length,
        },
        pre_restore_snapshot: preRestoreSnapshot,
        post_restore_snapshot: null,
        policy: {
          source_root: policy.source_root,
          source_mode: policy.source_mode,
          write_enabled: policy.write_enabled,
          writable_mount: policy.writable_mount,
          local_history_root: policy.local_history_root,
          blocked_reason: policy.blocked_reason,
        },
      };
    }

    const write = atomicWriteExistingMarkdown(current.abs, snapshotText);
    const after = MdWriter.readMarkdownAtomic(current.rel_posix);
    const verified = after.md_sha256 === preview.restore_candidate?.sha256;
    let postRestoreSnapshot: any = null;
    if (verified) {
      postRestoreSnapshot = (await this.createLocalSnapshot({
        path: current.rel_posix,
        note: `post_restore_snapshot_for_execute_${new Date().toISOString()}`,
      })).snapshot;
    }
    const audit = appendLocalWritebackExecutionAudit({
      execution_id: executionId,
      action: "local_snapshot_restore_execute",
      result: verified ? "restored_and_verified" : "restored_but_verification_failed",
      rel_posix: current.rel_posix,
      kind: "snapshot_restore",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      before_sha256: current.md_sha256,
      candidate_sha256: preview.restore_candidate?.sha256 ?? null,
      after_sha256: after.md_sha256,
      diff_sha256: actualDiffSha,
      pre_write_snapshot_id: preRestoreSnapshot?.id ?? null,
      requested_by: requestedBy,
      note,
      blocked_gates: [],
      bytes_written: write.bytes_written,
    });
    return {
      ok: verified,
      action: "local_snapshot_restore_execute",
      result: verified ? "restored_and_verified" : "restored_but_verification_failed",
      execution_id: executionId,
      restore_enabled: verified,
      restore_executed: true,
      restore_blocked_reason: verified ? null : "已执行恢复，但写后校验未通过。",
      audit,
      gates,
      preview: {
        changed: true,
        current: preview.current,
        restore_candidate: preview.restore_candidate,
        diff_sha256: actualDiffSha,
        diff_length: (preview.diff ?? "").length,
      },
      pre_restore_snapshot: preRestoreSnapshot,
      post_restore_snapshot: postRestoreSnapshot,
      write: {
        bytes_written: write.bytes_written,
        md_sha256: write.md_sha256,
      },
      after: {
        sha256: after.md_sha256,
        bytes: Buffer.byteLength(after.md_text, "utf-8"),
      },
      policy: {
        source_root: policy.source_root,
        source_mode: policy.source_mode,
        write_enabled: policy.write_enabled,
        writable_mount: policy.writable_mount,
        local_history_root: policy.local_history_root,
        blocked_reason: policy.blocked_reason,
      },
    };
  }

  // ---- 工具：4 级资源树真实读 expert-source 目录（替代 resourceTree.ts 硬编码数据）----
  async listTree(opts?: { section?: string | null; filesOnly?: boolean | null; forceRefresh?: boolean | null }) {
    let root: string;
    try {
      root = MdWriter.resolveSourceRoot();
    } catch (e) {
      if (e instanceof MdWriter.SourceRootMissingError) {
        return {
          source_root: null,
          source_root_missing: true,
          source_root_expected: e.expected,
          tree: { agents: [], skills: [], references: [], ".codebuddy-plugin": [] },
        };
      }
      throw e;
    }
    const section = normalizeTreeSection(opts?.section ?? null);
    const filesOnly = opts?.filesOnly === true;
    const rootStat = fs.statSync(root);
    const cacheKey = `${root}:${rootStat.mtimeMs}:${rootStat.ctimeMs}:${section ?? "all"}:${filesOnly ? "files" : "all"}`;
    if (!opts?.forceRefresh && treeScanCache && treeScanCache.key === cacheKey && treeScanCache.expiresAt > Date.now()) {
      return treeScanCache.value;
    }
    const topEntries = section ? [section] : TREE_SECTIONS;
    const out: Record<string, any> = {};
    const pluginPackages = listWorkBuddyPluginPackages(root);
    for (const d of topEntries) {
      let entries: any[] = [];
      const direct = path.join(root, d);
      if (fs.existsSync(direct)) {
        entries.push(...safeWalkMaxDepth(direct, 4, d, { filesOnly }));
      }
      for (const plugin of pluginPackages) {
        const pluginEntry = path.join(root, plugin.name, d);
        if (!fs.existsSync(pluginEntry)) continue;
        entries.push(...safeWalkMaxDepth(pluginEntry, 4, `${plugin.name}/${d}`, { filesOnly }));
      }
      out[d] = entries;
    }
    const value = {
      source_root: root,
      git_root: fs.existsSync(path.join(root, ".git")) ? root : null,
      source_mode: pluginPackages.length ? "workbuddy_plugins" : "direct_expert_source",
      section,
      files_only: filesOnly,
      plugin_count: pluginPackages.length,
      plugins: pluginPackages,
      tree: out,
    };
    treeScanCache = { key: cacheKey, expiresAt: Date.now() + TREE_SCAN_CACHE_TTL_MS, value };
    return value;
  }

  // ---- 211 MCP 必填保护：对 板块 ③ 接口配置编辑做 whitelist 强制 ----
  // 规则：目标文件是 .codebuddy-plugin/plugin.json 时，任何改动字段名若属于
  // governance-ground-truth-snapshot.json field_whitelist_by_handler_18 的 required 集合，
  // 必须保证值存在且字段名不删除；否则抛 400。
  validateMcpEdit(before: Record<string, any>, after: Record<string, any>, requiredFields: readonly string[]): void {
    for (const f of requiredFields) {
      if (before[f] !== undefined && after[f] === undefined) {
        throw new MdWriter.MdWriterError(`[MCP 红线] 不允许删除必填字段 "${f}"（211 签名保护）`);
      }
      if (after[f] === null || after[f] === "") {
        throw new MdWriter.MdWriterError(`[MCP 红线] 必填字段 "${f}" 不能为空/null`);
      }
    }
  }
}

function listWorkBuddyPluginPackages(rootAbs: string) {
  if (!fs.existsSync(rootAbs)) return [];
  const items = fs.readdirSync(rootAbs, { withFileTypes: true }) as import("fs").Dirent[];
  return items
    .filter((it) => it.isDirectory())
    .map((it) => {
      const pluginRoot = path.join(rootAbs, it.name);
      const hasAgents = fs.existsSync(path.join(pluginRoot, "agents"));
      const hasSkills = fs.existsSync(path.join(pluginRoot, "skills"));
      const hasManifest = fs.existsSync(path.join(pluginRoot, ".codebuddy-plugin"));
      return { name: it.name, has_agents: hasAgents, has_skills: hasSkills, has_manifest: hasManifest };
    })
    .filter((it) => it.has_agents || it.has_skills || it.has_manifest)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function probeDirectoryWritable(rootAbs: string) {
  const probePath = path.join(rootAbs, `.write-probe-${process.pid}-${crypto.randomBytes(3).toString("hex")}`);
  try {
    fs.writeFileSync(probePath, "probe", { encoding: "utf-8", flag: "wx" });
    fs.unlinkSync(probePath);
    return {
      writable: true,
      probe_path: probePath,
      error_code: null,
      error_message: null,
    };
  } catch (error: any) {
    try {
      if (fs.existsSync(probePath)) fs.unlinkSync(probePath);
    } catch {
      // Best-effort cleanup only; this probe is not part of expert-source content.
    }
    return {
      writable: false,
      probe_path: probePath,
      error_code: error?.code ?? null,
      error_message: error?.message ?? String(error),
    };
  }
}

function safeWalkMaxDepth(rootAbs: string, maxDepth: number, relBase = "", opts?: { filesOnly?: boolean }) {
  const out: any[] = [];
  if (!fs.existsSync(rootAbs)) return out;
  function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;
    const items = fs.readdirSync(dir, { withFileTypes: true }) as import("fs").Dirent[];
    for (const it of items.sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, it.name);
      if (it.isDirectory()) {
        if (!opts?.filesOnly) {
          out.push({ type: "dir", name: it.name, rel: joinRel(relBase, path.relative(rootAbs, p)) });
        }
        walk(p, depth + 1);
      } else if (it.isFile() && /\.(md|json|ya?ml|txt)$/.test(it.name)) {
        out.push({ type: "file", name: it.name, rel: joinRel(relBase, path.relative(rootAbs, p)) });
      }
    }
  }
  walk(rootAbs, 1);
  return out;
}

function joinRel(base: string, rel: string) {
  return [base, rel].filter(Boolean).join("/").split(path.sep).join("/");
}

function normalizeTreeSection(section?: string | null): TreeSection | null {
  const clean = String(section ?? "").trim();
  if (!clean) return null;
  return (TREE_SECTIONS as readonly string[]).includes(clean) ? (clean as TreeSection) : null;
}

function resolveLocalHistoryRoot() {
  const raw = process.env.EXPERT_CONFIG_HISTORY_ROOT
    ?? path.join(process.env.LOCAL_APP_DATA_ROOT ?? "/data", "expert-config-history");
  const abs = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  fs.mkdirSync(abs, { recursive: true });
  return abs;
}

function localHistoryIndexPath(historyRoot: string) {
  fs.mkdirSync(historyRoot, { recursive: true });
  return path.join(historyRoot, "index.jsonl");
}

function localSourceMountRequestPath() {
  const historyRoot = resolveLocalHistoryRoot();
  return path.join(historyRoot, "source-mount-requests.jsonl");
}

function readLatestSourceMountRequest() {
  const requestPath = localSourceMountRequestPath();
  if (!fs.existsSync(requestPath)) return null;
  const lines = fs.readFileSync(requestPath, "utf-8").split(/\r?\n/).filter(Boolean);
  for (const line of lines.reverse()) {
    try {
      return JSON.parse(line);
    } catch {
      continue;
    }
  }
  return null;
}

function appendSaveWriteRequestAudit(input: Record<string, unknown>) {
  const historyRoot = resolveLocalHistoryRoot();
  const auditPath = path.join(historyRoot, "save-write-requests.jsonl");
  fs.mkdirSync(historyRoot, { recursive: true });
  const now = String(input.created_at ?? new Date().toISOString());
  const audit = {
    id: `${now.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}-${crypto.randomBytes(3).toString("hex")}`,
    ...input,
    audit_path: auditPath,
  };
  fs.appendFileSync(auditPath, `${JSON.stringify(audit)}\n`, "utf-8");
  return audit;
}

function localWritebackExecutionAuditPath() {
  return path.join(resolveLocalHistoryRoot(), "local-writeback-executions.jsonl");
}

function appendLocalWritebackExecutionAudit(input: Record<string, unknown>) {
  const auditPath = localWritebackExecutionAuditPath();
  fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  const audit = {
    id: String(input.execution_id ?? `${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}-${crypto.randomBytes(3).toString("hex")}`),
    ...input,
    audit_path: auditPath,
  };
  fs.appendFileSync(auditPath, `${JSON.stringify(audit)}\n`, "utf-8");
  return audit;
}

function atomicWriteExistingMarkdown(absPath: string, mdText: string) {
  const parent = path.dirname(absPath);
  const tmp = path.join(parent, `.${path.basename(absPath)}.tmp.${process.pid}.${crypto.randomBytes(3).toString("hex")}`);
  try {
    fs.writeFileSync(tmp, mdText, { encoding: "utf-8", flag: "w" });
    try {
      const fd = fs.openSync(tmp, "r");
      try {
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
    } catch (fsyncErr: any) {
      if (process.platform !== "win32" || fsyncErr?.code !== "EPERM") {
        throw fsyncErr;
      }
    }
    fs.renameSync(tmp, absPath);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
  return {
    abs: absPath,
    bytes_written: Buffer.byteLength(mdText, "utf-8"),
    md_sha256: MdWriter.sha256String(mdText),
  };
}

function countExistingLines(filePath: string) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.readFileSync(filePath, "utf-8").split(/\r?\n/).filter(Boolean).length;
}

function countTreeFiles(entries: any) {
  return Array.isArray(entries) ? entries.filter((entry) => entry?.type === "file").length : 0;
}

function sanitizeHostPath(hostPath: string) {
  const clean = String(hostPath ?? "").trim();
  if (!clean) {
    throw new MdWriter.MdWriterError("[expert-source] host_path 必填");
  }
  if (clean.includes("\0") || /[\r\n]/.test(clean)) {
    throw new MdWriter.MdWriterError("[expert-source] host_path 包含非法字符");
  }
  if (clean.length > 500) {
    throw new MdWriter.MdWriterError("[expert-source] host_path 过长");
  }
  return clean;
}

function buildSourceMountCommands(hostPath: string) {
  const escaped = hostPath.replace(/'/g, "''");
  return {
    powershell: [
      `$env:WORKBUDDY_EXPERT_SOURCE_HOST_PATH='${escaped}'`,
      `$REPO_ROOT = (Resolve-Path ".").Path`,
      `$REPO_DRIVE = Split-Path $REPO_ROOT -Qualifier`,
      `$RUNTIME_ROOT = Join-Path $REPO_DRIVE "workbuddy-test-runtime\\ai-omni-ontology-lab"`,
      `$LAB_ENV = Join-Path $RUNTIME_ROOT "lab.env"`,
      `$COMPOSE = Join-Path $REPO_ROOT "docker\\docker-compose.ontology-lab.yml"`,
      `docker compose --env-file $LAB_ENV -f $COMPOSE up -d --no-deps server web ingress`,
    ],
    note: "需在 lab 仓库根目录执行；该命令会切换 /expert-source 挂载来源，并按 Lab 默认配置自动开启真实写回。",
  };
}

function sanitizeSnapshotId(snapshotId: string) {
  const clean = String(snapshotId ?? "").trim();
  if (!/^[0-9TZ-]+-[a-f0-9]{6}$/i.test(clean)) {
    throw new MdWriter.MdWriterError("[local-history] snapshot_id 格式不合法");
  }
  return clean;
}
