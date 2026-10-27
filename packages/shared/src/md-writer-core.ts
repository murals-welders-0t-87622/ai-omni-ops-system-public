/**
 * md-writer-core.ts
 * -----------------------------------------------------------------------------
 * AI 智控中心（FR-03 Task 1.3）md-writer 纯函数核心库。
 *
 * 设计目标（verbatim from spec v2 §7）：
 *   5 层桥接 = UI 表单编辑 → md-writer-core 拼 md → 原子写 A包/.../expert-source/
 *             同一物理文件 → 子进程 config-center-git commit → WorkBuddy 下次读
 *             同一文件 → 回读无损。
 *
 * 红线（永不破）：
 *   1. 权威源 = PROJECT_ROOT/A-专家团优化开发交接包/references/expert-source
 *   2. writeMarkdownAtomic 默认 must_git_clean=true：写前必须 `git status --porcelain`
 *      空，否则抛 GitDirtyError（避免覆盖用户手工编辑）
 *   3. 所有写入都是 rename 原子（先写 .tmp，fs.renameSync 覆盖），保证回滚可读
 *   4. 3 类 field 集合严格一一对应：
 *        expert  : title, role, use, constraint, owner, contract, exceptions
 *        skill   : title, role, use, constraint, owner, input_schema, output_schema, fallback
 *        prompt  : title, role, use, constraint, owner, variables, template
 *      其他字段不接受（抛 UnknownFieldError），防止 211 MCP 必填漂移
 * -----------------------------------------------------------------------------
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as child_process from 'node:child_process';

/* -------------------- 0. 路径与常量（不可写死相对路径，通过 CLI / env 传） -------------------- */
/** 项目根（= 项目总控/tools/../..，与 config-center-git.py 保持一致）
 *  计算逻辑：从 packages/shared/src/md-writer-core.ts 往上数 6 层到项目根：
 *  src → shared → packages → repo → ai-omni-ops-system-lab-source → development → 项目根
 */
const SELF_PATH = __filename;
const __selfAbs = path.isAbsolute(SELF_PATH) ? SELF_PATH : path.resolve(process.cwd(), SELF_PATH);
const PACKAGES_SHARED_SRC = path.dirname(__selfAbs);
const PACKAGES_SHARED = path.dirname(PACKAGES_SHARED_SRC);
const PACKAGES = path.dirname(PACKAGES_SHARED);
const REPO_ROOT = path.dirname(PACKAGES);
const LAB_SOURCE_ROOT = path.dirname(REPO_ROOT);
const DEVELOPMENT_ROOT = path.dirname(LAB_SOURCE_ROOT);
export const PROJECT_ROOT_DEFAULT = path.dirname(DEVELOPMENT_ROOT);
export const EXPERT_SOURCE_DEFAULT = path.join(
  PROJECT_ROOT_DEFAULT,
  'A-专家团优化开发交接包',
  'references',
  'expert-source',
);

export function resolveSourceRoot(source_root?: string | null): string {
  const raw = source_root
    ?? process.env.EXPERT_CONFIG_SOURCE_ROOT
    ?? process.env.EXPERT_CONFIG_GIT_ROOT
    ?? EXPERT_SOURCE_DEFAULT;
  const abs = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  if (!fs.existsSync(abs)) {
    throw new SourceRootMissingError(abs);
  }
  return abs;
}

export function resolveGitRoot(git_root?: string | null): string {
  const raw = git_root ?? process.env.EXPERT_CONFIG_GIT_ROOT ?? EXPERT_SOURCE_DEFAULT;
  const abs = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  if (!fs.existsSync(path.join(abs, '.git'))) {
    throw new GitRootMissingError(abs);
  }
  return abs;
}

export const CONFIG_CENTER_GIT_PY = path.join(
  PROJECT_ROOT_DEFAULT,
  '项目总控',
  'tools',
  'config-center-git.py',
);

/* -------------------- 1. 错误类型 -------------------- */
export class MdWriterError extends Error { name = 'MdWriterError'; }
export class GitDirtyError extends MdWriterError {
  name = 'GitDirtyError';
  constructor(public readonly porcelain: string, public readonly git_root: string) {
    super(
      `[md-writer] Git 工作区非 clean（${git_root}），禁止写盘。请先手动 Diff / Stash / Reset 清干净再保存。\n未提交改动：\n${porcelain}`,
    );
  }
}
export class GitRootMissingError extends MdWriterError {
  name = 'GitRootMissingError';
  constructor(public readonly expected: string) {
    super(`[md-writer] 找不到权威配置 Git 仓：${expected}（无 .git 子目录）`);
  }
}
export class SourceRootMissingError extends MdWriterError {
  name = 'SourceRootMissingError';
  constructor(public readonly expected: string) {
    super(`[md-writer] 找不到专家配置源目录：${expected}`);
  }
}
export class PathOutsideExpertSourceError extends MdWriterError {
  name = 'PathOutsideExpertSourceError';
  constructor(public readonly rel: string, public readonly git_root: string) {
    super(`[md-writer] 目标路径越界：${rel} 不在权威配置仓 ${git_root} 下（禁止写 Git 仓外部）`);
  }
}
export class UnknownFieldError extends MdWriterError {
  name = 'UnknownFieldError';
  constructor(public readonly kind: MarkdownKind, public readonly field: string, public readonly allowed: readonly string[]) {
    super(`[md-writer] ${kind} 类不支持字段 "${field}"，允许字段：${allowed.join(', ')}`);
  }
}
export class UnknownKindError extends MdWriterError {
  name = 'UnknownKindError';
  constructor(kind: string) {
    super(`[md-writer] 未知 kind "${kind}"，只接受 expert | skill | prompt`);
  }
}
export class MarkdownMergeError extends MdWriterError {
  name = 'MarkdownMergeError';
  constructor(message: string) {
    super(`[md-writer] Markdown 结构化合并失败：${message}`);
  }
}
export class GitInvocationError extends MdWriterError {
  name = 'GitInvocationError';
  constructor(public readonly cmd: string, public readonly code: number | null, public readonly stderr: string) {
    super(`[md-writer] git 封装调用失败（${cmd}，exit=${code ?? 'SIGNAL'}）：\n${stderr}`);
  }
}

/* -------------------- 2. 字段白名单（严格对齐 Task 1.2 分字段表单 3 类） -------------------- */
export type MarkdownKind = 'expert' | 'skill' | 'prompt';

export const EXPERT_FIELDS = [
  'title',
  'role',
  'use',
  'constraint',
  'owner',
  'contract',
  'exceptions',
] as const;
export const SKILL_FIELDS = [
  'title',
  'role',
  'use',
  'constraint',
  'owner',
  'input_schema',
  'output_schema',
  'fallback',
] as const;
export const PROMPT_FIELDS = [
  'title',
  'role',
  'use',
  'constraint',
  'owner',
  'variables',
  'template',
] as const;

export const ALLOWED_FIELDS: Record<MarkdownKind, readonly string[]> = {
  expert: EXPERT_FIELDS,
  skill: SKILL_FIELDS,
  prompt: PROMPT_FIELDS,
};

export type ExpertFields = { title: string; role: string; use: string; constraint: string; owner: string; contract?: string; exceptions?: string };
export type SkillFields  = { title: string; role: string; use: string; constraint: string; owner: string; input_schema?: string; output_schema?: string; fallback?: string };
export type PromptFields = { title: string; role: string; use: string; constraint: string; owner: string; variables?: string; template?: string };
export type FieldsByKind = {
  expert: ExpertFields;
  skill:  SkillFields;
  prompt: PromptFields;
};

/* -------------------- 3. toMarkdown(fields) -> string（稳定生成，纯字符串无 Date/random） -------------------- */
function headerBlock(title: string): string {
  const t = (title ?? '').trim();
  return `# ${t || '(未命名)'}\n\n`;
}
function h2(k: string, v: string | undefined): string {
  const content = (v ?? '').trim();
  if (!content) return '';
  return `## ${k}\n${content}\n\n`;
}
function enforceWhitelist(kind: MarkdownKind, fields: Record<string, unknown>): void {
  const allowed = ALLOWED_FIELDS[kind];
  for (const k of Object.keys(fields)) {
    if (!allowed.includes(k)) throw new UnknownFieldError(kind, k, allowed);
  }
}

/** toMarkdown：3 类稳定拼 md（字段顺序与白名单顺序一致；空白字段省略 ## header） */
export function toMarkdown<K extends MarkdownKind>(kind: K, fields: FieldsByKind[K]): string {
  if (kind !== 'expert' && kind !== 'skill' && kind !== 'prompt') throw new UnknownKindError(kind);
  enforceWhitelist(kind, fields as unknown as Record<string, unknown>);
  const f = fields as unknown as Record<string, string | undefined>;
  const sections: string[] = [headerBlock(f.title || '')];
  for (const key of ALLOWED_FIELDS[kind]) {
    if (key === 'title') continue;
    sections.push(h2(key, f[key]));
  }
  const md = sections.join('').replace(/\n{4,}/g, '\n\n\n').trimEnd() + '\n';
  return md;
}

/* -------------------- 4. sha256 文本哈希（与 verify-backup / MANIFEST 同一算法） -------------------- */
export function sha256String(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf-8').digest('hex');
}
export function sha256File(p: string): string {
  const buf = fs.readFileSync(p);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/* -------------------- 5. 路径解析与越界保护 -------------------- */
export interface ResolvedRelPath {
  /** 绝对物理路径 = git_root + rel；权威仓内同一文件永写同一路径 */
  abs: string;
  /** 相对 git_root 的 POSIX 路径，用于 git diff/pathspec */
  rel_posix: string;
}
export function resolvePathInsideGitRoot(
  rel_or_abs: string,
  git_root: string,
): ResolvedRelPath {
  return resolvePathInsideSourceRoot(rel_or_abs, git_root);
}

export function resolvePathInsideSourceRoot(
  rel_or_abs: string,
  source_root: string,
): ResolvedRelPath {
  const absCandidate = path.isAbsolute(rel_or_abs)
    ? path.normalize(rel_or_abs)
    : path.resolve(source_root, rel_or_abs);
  const sourceRootNorm = path.normalize(source_root);
  const rel = path.relative(sourceRootNorm, absCandidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new PathOutsideExpertSourceError(rel_or_abs, source_root);
  }
  return { abs: absCandidate, rel_posix: rel.split(path.sep).join('/') };
}

/* -------------------- 6. git status clean 检查（子进程调 config-center-git.py status --porcelain 实现） -------------------- */
export interface GitStatusCleanResult { clean: boolean; porcelain: string; }
export function runGitWrapper(git_root: string, args: readonly string[], { capture = true, check = true }: { capture?: boolean; check?: boolean } = {}): child_process.SpawnSyncReturns<string> {
  const py = CONFIG_CENTER_GIT_PY;
  if (!fs.existsSync(py)) {
    return runGitDirect(git_root, args, { capture, check });
  }
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const allArgs = [py, ...args];
  const env = { ...process.env, EXPERT_CONFIG_GIT_ROOT: git_root, PYTHONIOENCODING: 'utf-8' };
  return child_process.spawnSync(pythonCmd, allArgs, {
    cwd: PROJECT_ROOT_DEFAULT,
    env,
    encoding: 'utf-8',
    shell: false,
    windowsHide: true,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
  }) as child_process.SpawnSyncReturns<string>;
}

function runGitDirect(git_root: string, args: readonly string[], { capture = true, check = true }: { capture?: boolean; check?: boolean } = {}): child_process.SpawnSyncReturns<string> {
  const run = (gitArgs: readonly string[]) => child_process.spawnSync('git', ['-C', git_root, ...gitArgs], {
    encoding: 'utf-8',
    shell: false,
    windowsHide: true,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
  }) as child_process.SpawnSyncReturns<string>;

  const failIfNeeded = (cmd: string, result: child_process.SpawnSyncReturns<string>) => {
    if (check && result.status !== 0) {
      throw new GitInvocationError(cmd, result.status, result.stderr || '');
    }
    return result;
  };

  const [cmd, ...rest] = args;
  if (cmd === 'status') {
    return failIfNeeded('status', run(rest.includes('--porcelain') ? ['status', '--porcelain'] : ['status']));
  }
  if (cmd === 'diff') {
    if (rest[0]) return failIfNeeded('diff', run(['diff', '--', rest[0]]));
    return failIfNeeded('diff', run(['diff', 'HEAD']));
  }
  if (cmd === 'log') {
    const nIdx = rest.indexOf('-n');
    const n = nIdx >= 0 ? rest[nIdx + 1] ?? '10' : '10';
    return failIfNeeded('log', run(['log', '--oneline', '-n', n]));
  }
  if (cmd === 'commit') {
    const message = rest.join(' ').trim();
    if (!message) {
      const empty = child_process.spawnSync('git', ['--version'], {
        encoding: 'utf-8',
        shell: false,
        windowsHide: true,
        stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
      }) as child_process.SpawnSyncReturns<string>;
      empty.status = 2;
      empty.stderr = '[md-writer] commit message 不能为空';
      return failIfNeeded('commit', empty);
    }
    const add = failIfNeeded('add -A', run(['add', '-A']));
    if (add.status !== 0) return add;
    return failIfNeeded('commit', run(['commit', '-m', message]));
  }
  if (cmd === 'rev-parse-short') {
    return failIfNeeded('rev-parse-short', run(['rev-parse', '--short', 'HEAD']));
  }
  if (cmd === 'reset' && rest[0] === '--hard' && rest[1]) {
    return failIfNeeded(`reset --hard ${rest[1]}`, run(['reset', '--hard', rest[1]]));
  }

  throw new MdWriterError(`[md-writer] 容器内未找到 config-center-git.py，且不支持直接 git 命令：${args.join(' ')}`);
}

export function gitStatusPorcelain(git_root: string): string {
  const r = runGitWrapper(git_root, ['status', '--porcelain'], { capture: true, check: false });
  if (r.status !== 0) {
    // config-center-git status = 真 `git -C root status --porcelain`，exit 非 0 不代表 dirty，只当错误
    throw new GitInvocationError('status --porcelain', r.status, r.stderr || '');
  }
  return (r.stdout ?? '').trimEnd();
}

export function gitStatusPorcelainWithAutocrlf(git_root: string): string {
  const r = child_process.spawnSync('git', ['-C', git_root, '-c', 'core.autocrlf=true', 'status', '--porcelain=v1'], {
    encoding: 'utf-8',
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  }) as child_process.SpawnSyncReturns<string>;
  if (r.status !== 0) {
    throw new GitInvocationError('status --porcelain -c core.autocrlf=true', r.status, r.stderr || '');
  }
  return (r.stdout ?? '').trimEnd();
}

export interface WritableMountProbeResult {
  writable: boolean;
  probe_path: string;
  error_code: string | null;
  error_message: string | null;
}

export function probeGitRootWritable(git_root: string): WritableMountProbeResult {
  const probeName = `.ai-control-write-probe-${process.pid}-${crypto.randomBytes(4).toString('hex')}.tmp`;
  const probePath = path.join(git_root, probeName);
  try {
    fs.writeFileSync(probePath, 'ai-control-write-probe\n', { encoding: 'utf-8', flag: 'wx' });
    fs.unlinkSync(probePath);
    return {
      writable: true,
      probe_path: probeName,
      error_code: null,
      error_message: null,
    };
  } catch (error: any) {
    try {
      if (fs.existsSync(probePath)) fs.unlinkSync(probePath);
    } catch (_) {
      // If cleanup fails, keep the original write-probe error for diagnostics.
    }
    return {
      writable: false,
      probe_path: probeName,
      error_code: error?.code ?? null,
      error_message: error?.message ?? String(error),
    };
  }
}

export interface GitCommitIdentityResult {
  configured: boolean;
  user_name: string;
  user_email: string;
}

export function gitCommitIdentity(git_root: string): GitCommitIdentityResult {
  const readConfig = (key: string) => child_process.spawnSync('git', ['-C', git_root, 'config', '--get', key], {
    encoding: 'utf-8',
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  }) as child_process.SpawnSyncReturns<string>;
  const name = (readConfig('user.name').stdout ?? '').trim();
  const email = (readConfig('user.email').stdout ?? '').trim();
  return {
    configured: Boolean(name && email),
    user_name: name,
    user_email: email,
  };
}

export function gitHeadShort(git_root: string): string {
  const r = child_process.spawnSync('git', ['-C', git_root, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf-8',
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  }) as child_process.SpawnSyncReturns<string>;
  if (r.status !== 0) {
    throw new GitInvocationError('rev-parse --short HEAD', r.status, r.stderr || '');
  }
  return (r.stdout ?? '').trim();
}

export function assertGitClean(git_root: string): void {
  const porcelain = gitStatusPorcelainWithAutocrlf(git_root);
  if (porcelain !== '') throw new GitDirtyError(porcelain, git_root);
}

/* -------------------- 7. 原子写 + 写前 clean 检查（核心保存链路） -------------------- */
export interface WriteOptions {
  /**
   * 强制写：跳过 git clean 检查（默认 false = 严格遵守 md-writer 红线 2）。
   * 仅用于 Git reset 内部实现或权威运维脚本；AI 智控中心前端 UI 永不传 true。
   */
  force_unsafe_skip_git_clean_check?: boolean;
  /** 允许用 env / EXPERT_CONFIG_GIT_ROOT 覆盖的 Git 仓根 */
  git_root?: string | null;
  /** 原子写临时文件后缀，默认 .tmp + pid + random6 */
  tmp_suffix?: string;
}
export interface WriteResult {
  abs: string;
  rel_posix: string;
  bytes_written: number;
  md_sha256: string;
  /** 写入前备份的旧 md（若原文件存在则回填，用于 Diff Tab 比较） */
  previous_sha256?: string;
}

export function writeMarkdownAtomic(
  rel_or_abs_path: string,
  md_text: string,
  opts: WriteOptions = {},
): WriteResult {
  const git_root = resolveGitRoot(opts.git_root);
  if (!opts.force_unsafe_skip_git_clean_check) assertGitClean(git_root);

  const { abs, rel_posix } = resolvePathInsideGitRoot(rel_or_abs_path, git_root);
  const parent = path.dirname(abs);
  fs.mkdirSync(parent, { recursive: true });

  const previous_sha256 = fs.existsSync(abs) ? sha256File(abs) : undefined;
  const suffix = opts.tmp_suffix || `.tmp.${process.pid}.${crypto.randomBytes(3).toString('hex')}`;
  const tmp = abs + suffix;
  try {
    fs.writeFileSync(tmp, md_text, { encoding: 'utf-8', flag: 'w' });
    // 强制刷盘 -> rename（Windows/Linux 对同卷 rename 均原子）
    // Windows 上某些权限场景下 fsync 可能 EPERM，此时直接 rename（原子性仍保证）
    try {
      const fd = fs.openSync(tmp, 'r');
      try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    } catch (fsyncErr: any) {
      if (process.platform !== 'win32' || (fsyncErr && fsyncErr.code !== 'EPERM')) {
        throw fsyncErr;
      }
    }
    fs.renameSync(tmp, abs);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }

  const md_sha256 = sha256String(md_text);
  const bytes_written = Buffer.byteLength(md_text, 'utf-8');
  return { abs, rel_posix, bytes_written, md_sha256, previous_sha256 };
}

/* -------------------- 8. 读文件（无损回读）与 git commit 封装 -------------------- */
export function readMarkdownAtomic(rel_or_abs_path: string, opts: Pick<WriteOptions, 'git_root'> = {}): {
  abs: string; rel_posix: string; md_text: string; md_sha256: string;
} {
  const source_root = resolveSourceRoot(opts.git_root);
  const { abs, rel_posix } = resolvePathInsideSourceRoot(rel_or_abs_path, source_root);
  const md_text = fs.readFileSync(abs, 'utf-8');
  return { abs, rel_posix, md_text, md_sha256: sha256String(md_text) };
}

export interface MarkdownPreviewResult {
  kind: MarkdownKind;
  abs: string;
  rel_posix: string;
  original_md_text: string;
  original_sha256: string;
  candidate_md_text: string;
  candidate_sha256: string;
  candidate_bytes: number;
  changed: boolean;
  changed_fields: string[];
  merge_report: MarkdownMergeReport;
  diff: string;
}

export interface MarkdownMergeReport {
  strategy: 'structural_section_merge';
  title_replaced: boolean;
  sections_replaced: string[];
  sections_inserted: string[];
  skipped_empty_fields: string[];
  preserved_heading_count: number;
  preserved_section_count: number;
  matched_aliases: Record<string, string>;
  warnings: string[];
}

interface MarkdownHeading {
  index: number;
  level: number;
  raw: string;
  label: string;
  normalized: string;
}

interface MarkdownReplacement {
  start: number;
  end: number;
  lines: string[];
  field: string;
}

interface StructuralMergeResult {
  md_text: string;
  report: MarkdownMergeReport;
  changed_fields: string[];
}

/** previewMarkdownUpdate：保存前 dry-run，只读原文并在内存中生成候选 Markdown 与完整 diff，绝不写盘。 */
export function previewMarkdownUpdate<K extends MarkdownKind>(
  kind: K,
  rel_or_abs_path: string,
  fields: FieldsByKind[K],
  opts: Pick<WriteOptions, 'git_root'> = {},
): MarkdownPreviewResult {
  const current = readMarkdownAtomic(rel_or_abs_path, opts);
  const merged = buildMergedMarkdown(kind, current.md_text, fields);
  const candidate_md_text = merged.md_text;
  const candidate_sha256 = sha256String(candidate_md_text);
  return {
    kind,
    abs: current.abs,
    rel_posix: current.rel_posix,
    original_md_text: current.md_text,
    original_sha256: current.md_sha256,
    candidate_md_text,
    candidate_sha256,
    candidate_bytes: Buffer.byteLength(candidate_md_text, 'utf-8'),
    changed: current.md_text !== candidate_md_text,
    changed_fields: merged.changed_fields,
    merge_report: merged.report,
    diff: buildUnifiedDiff(current.rel_posix, current.md_text, candidate_md_text),
  };
}

/** buildMergedMarkdown：只替换白名单字段对应的 Markdown 标题块，保留其它原文结构。 */
export function buildMergedMarkdown<K extends MarkdownKind>(
  kind: K,
  original_md_text: string,
  fields: FieldsByKind[K],
): StructuralMergeResult {
  if (kind !== 'expert' && kind !== 'skill' && kind !== 'prompt') throw new UnknownKindError(kind);
  enforceWhitelist(kind, fields as unknown as Record<string, unknown>);

  const preferredEol = original_md_text.includes('\r\n') ? '\r\n' : '\n';
  const text = original_md_text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const hadFinalNewline = /\n$/.test(text);
  const lines = text.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();

  const headings = collectMarkdownHeadings(lines);
  const frontmatter = parseSimpleFrontmatter(lines);
  const touchedHeadingIndexes = new Set<number>();
  const replacements: MarkdownReplacement[] = [];
  const inserted: Array<{ index: number; lines: string[]; field: string; order: number }> = [];
  const changedFields: string[] = [];
  const matchedAliases: Record<string, string> = {};
  const skippedEmptyFields: string[] = [];
  const warnings: string[] = [];
  let titleReplaced = false;

  const fieldValues = fields as unknown as Record<string, string | undefined>;
  const nextTitle = cleanFieldValue(fieldValues.title);
  const firstH1 = headings.find((h) => h.level === 1);
  if (nextTitle) {
    if (firstH1) {
      const nextLine = `# ${nextTitle}`;
      if (lines[firstH1.index] !== nextLine) {
        replacements.push({ start: firstH1.index, end: firstH1.index + 1, lines: [nextLine], field: 'title' });
        changedFields.push('title');
        titleReplaced = true;
      }
      touchedHeadingIndexes.add(firstH1.index);
      matchedAliases.title = firstH1.label;
    } else {
      const insertIndex = frontmatterEndLine(lines);
      inserted.push({ index: insertIndex, lines: [`# ${nextTitle}`, ''], field: 'title', order: 0 });
      changedFields.push('title');
      titleReplaced = true;
      warnings.push('原文没有 H1 标题，已在 frontmatter 后插入标题。');
    }
  } else {
    skippedEmptyFields.push('title');
  }

  for (const key of ALLOWED_FIELDS[kind]) {
    if (key === 'title') continue;
    const nextValue = cleanFieldValue(fieldValues[key]);
    const aliases = getMarkdownFieldAliases(key).map(normalizeMarkdownHeadingKey);
    const matched = headings.find((h) => (h.level === 2 || h.level === 3) && aliases.includes(h.normalized));
    if (!nextValue) {
      skippedEmptyFields.push(key);
      continue;
    }
    if (key === 'owner' && kind === 'expert' && !matched && frontmatter.name === nextValue) {
      matchedAliases[key] = 'frontmatter.name';
      continue;
    }
    if (key === 'role' && kind === 'expert' && !matched && firstH1) {
      const intro = findIntroBlockAfterH1(lines, headings, firstH1);
      if (intro) {
        const nextSection = buildIntroRoleLines(lines, intro, nextValue);
        const before = lines.slice(intro.start, intro.end).join('\n').trimEnd();
        const after = nextSection.join('\n').trimEnd();
        matchedAliases[key] = 'H1 intro';
        if (before !== after) {
          replacements.push({ start: intro.start, end: intro.end, lines: nextSection, field: key });
          changedFields.push(key);
        }
        continue;
      }
    }
    const nextSection = buildSectionLines(matched?.raw ?? key, nextValue, matched?.level ?? 2, matched ? lines[matched.index + 1] === '' : true);
    if (matched) {
      const end = findSectionEnd(lines, headings, matched);
      const before = lines.slice(matched.index, end).join('\n').trimEnd();
      const after = nextSection.join('\n').trimEnd();
      touchedHeadingIndexes.add(matched.index);
      matchedAliases[key] = matched.label;
      if (before !== after) {
        replacements.push({ start: matched.index, end, lines: nextSection, field: key });
        changedFields.push(key);
      }
    } else {
      inserted.push({ index: lines.length, lines: ['', ...nextSection], field: key, order: ALLOWED_FIELDS[kind].indexOf(key) });
      changedFields.push(key);
      warnings.push(`原文未找到 ${key} 对应标题块，已在文末追加 ## ${key}。`);
    }
  }

  const mergedLines = applyMarkdownEdits(lines, replacements, inserted);
  const normalized = `${mergedLines.join('\n').replace(/\n{4,}/g, '\n\n\n').trimEnd()}${hadFinalNewline ? '\n' : '\n'}`;
  const preservedHeadingCount = Math.max(0, headings.length - touchedHeadingIndexes.size);
  const report: MarkdownMergeReport = {
    strategy: 'structural_section_merge',
    title_replaced: titleReplaced,
    sections_replaced: Array.from(new Set(replacements.filter((r) => r.field !== 'title').map((r) => r.field))),
    sections_inserted: Array.from(new Set(inserted.map((i) => i.field))),
    skipped_empty_fields: skippedEmptyFields,
    preserved_heading_count: preservedHeadingCount,
    preserved_section_count: preservedHeadingCount,
    matched_aliases: matchedAliases,
    warnings,
  };

  return {
    md_text: normalized.replace(/\n/g, preferredEol),
    report,
    changed_fields: Array.from(new Set(changedFields)),
  };
}

function collectMarkdownHeadings(lines: string[]): MarkdownHeading[] {
  const out: MarkdownHeading[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const raw = match[2].trim().replace(/\s*#*\s*$/, '');
    const label = stripMarkdownHeadingNoise(match[2]);
    out.push({
      index: i,
      level: match[1].length,
      raw,
      label,
      normalized: normalizeMarkdownHeadingKey(label),
    });
  }
  return out;
}

function findSectionEnd(lines: string[], headings: MarkdownHeading[], target: MarkdownHeading): number {
  const next = headings.find((h) => h.index > target.index && h.level <= target.level);
  return next?.index ?? lines.length;
}

function findIntroBlockAfterH1(lines: string[], headings: MarkdownHeading[], h1: MarkdownHeading): { start: number; end: number } | null {
  const nextHeading = headings.find((h) => h.index > h1.index);
  const endLimit = nextHeading?.index ?? lines.length;
  let start = h1.index + 1;
  while (start < endLimit && !lines[start].trim()) start += 1;
  let end = start;
  while (end < endLimit && lines[end].trim()) end += 1;
  if (start >= end) return null;
  return { start, end };
}

function buildIntroRoleLines(lines: string[], intro: { start: number; end: number }, value: string): string[] {
  const out = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines[intro.end] === '') out.push('');
  return out;
}

function applyMarkdownEdits(lines: string[], replacements: MarkdownReplacement[], insertions: Array<{ index: number; lines: string[]; field: string; order: number }>): string[] {
  const out = [...lines];
  const sortedReplacements = [...replacements].sort((a, b) => b.start - a.start);
  for (const r of sortedReplacements) out.splice(r.start, r.end - r.start, ...r.lines);
  const sortedInsertions = [...insertions].sort((a, b) => (b.index - a.index) || (b.order - a.order));
  for (const ins of sortedInsertions) out.splice(ins.index, 0, ...ins.lines);
  return out;
}

function buildSectionLines(headingLabel: string, value: string, level: number, blankAfterHeading: boolean): string[] {
  const headingLevel = '#'.repeat(Math.max(2, Math.min(3, level)));
  const content = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  return blankAfterHeading ? [`${headingLevel} ${headingLabel.trim()}`, '', ...content, ''] : [`${headingLevel} ${headingLabel.trim()}`, ...content, ''];
}

function cleanFieldValue(value: string | undefined): string {
  return (value ?? '').trim();
}

function frontmatterEndLine(lines: string[]): number {
  if (lines[0] !== '---') return 0;
  const end = lines.findIndex((line, index) => index > 0 && line === '---');
  return end >= 0 ? end + 1 : 0;
}

function parseSimpleFrontmatter(lines: string[]): Record<string, string> {
  if (lines[0] !== '---') return {};
  const end = lines.findIndex((line, index) => index > 0 && line === '---');
  if (end < 0) return {};
  const result: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^['"]|['"]$/g, '').trim();
    if (value) result[match[1]] = value;
  }
  return result;
}

function normalizeMarkdownHeadingKey(raw: string): string {
  const key = stripMarkdownHeadingNoise(raw).trim().toLowerCase();
  if (key.includes('role') || key.includes('角色') || key.includes('定位') || key.includes('身份')) return 'role';
  if (key.includes('路由原则') || key === '路由' || key.includes('skill 路由') || key.includes('skill路由')) return 'use';
  if (key.includes('use') || key.includes('场景') || key.includes('适用') || key.includes('怎么用')) return 'use';
  if (key.includes('执行铁律') || key.includes('铁律')) return 'constraint';
  if (key.includes('constraint') || key.includes('约束') || key.includes('红线') || key.includes('禁止')) return 'constraint';
  if (key.includes('owner') || key.includes('负责人') || key.includes('归属') || key.includes('维护人') || key.includes('真源')) return 'owner';
  if (key.includes('contract') || key.includes('交接') || key.includes('输入输出') || key.includes('handoff')) return 'contract';
  if (key.includes('exception') || key.includes('异常') || key.includes('失败')) return 'exceptions';
  if (key.includes('input_schema') || key.includes('输入要求') || key === '输入' || key.includes('入参') || key === 'input') return 'input_schema';
  if (key.includes('output_schema') || key.includes('输出要求') || key.includes('最低输出要求') || key === '输出' || key.includes('交付物') || key === 'output') return 'output_schema';
  if (key.includes('fallback') || key.includes('降级') || key.includes('补救')) return 'fallback';
  if (key.includes('variables') || key.includes('变量')) return 'variables';
  if (key.includes('template') || key.includes('模板')) return 'template';
  return key.replace(/\s+/g, '_');
}

function stripMarkdownHeadingNoise(raw: string): string {
  return raw
    .replace(/^[\s#`>*-]+/, '')
    .replace(/^[一二三四五六七八九十]+[、.]\s*/, '')
    .replace(/^第[一二三四五六七八九十0-9]+[章节部分、.：:]\s*/, '')
    .trim();
}

function getMarkdownFieldAliases(fieldKey: string): string[] {
  const aliases: Record<string, string[]> = {
    title: ['title'],
    role: ['role', '定位', '一、定位', '角色定位', '身份', 'profession'],
    use: ['use', '适用场景', '现在怎么用', '使用方式', '调用场景', '什么时候使用', '路由原则', '路由', 'Skill 路由'],
    constraint: ['constraint', '禁止事项', '关键约束', '约束', '红线', '不可做', '执行铁律', '铁律'],
    owner: ['owner', '负责人', '当前真源', '归属', '维护人'],
    contract: ['contract', '交接契约', '输入输出', '输入与输出', 'handoff'],
    exceptions: ['exceptions', '异常处理', '失败处理', 'fallback', '降级'],
    input_schema: ['input_schema', '输入要求', '输入', '入参', 'input'],
    output_schema: ['output_schema', '输出要求', '最低输出要求', '输出', '交付物', 'output'],
    fallback: ['fallback', '失败处理', '异常处理', '降级', '补救'],
    variables: ['variables', '变量'],
    template: ['template', '模板'],
  };
  return aliases[fieldKey] ?? [fieldKey];
}

export function buildUnifiedDiff(rel_posix: string, beforeText: string, afterText: string): string {
  if (beforeText === afterText) return '';
  const before = splitDiffLines(beforeText);
  const after = splitDiffLines(afterText);
  const ops = diffLineOps(before, after);
  const out = [`--- a/${rel_posix}`, `+++ b/${rel_posix}`, '@@ dry-run preview @@'];
  for (const op of ops) out.push(`${op.kind} ${op.line}`);
  return out.join('\n') + '\n';
}

function splitDiffLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function diffLineOps(before: string[], after: string[]): Array<{ kind: ' ' | '-' | '+'; line: string }> {
  const dp = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0) as number[]);
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      dp[i][j] = before[i] === after[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: Array<{ kind: ' ' | '-' | '+'; line: string }> = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      ops.push({ kind: ' ', line: before[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ kind: '-', line: before[i] });
      i += 1;
    } else {
      ops.push({ kind: '+', line: after[j] });
      j += 1;
    }
  }
  while (i < before.length) {
    ops.push({ kind: '-', line: before[i] });
    i += 1;
  }
  while (j < after.length) {
    ops.push({ kind: '+', line: after[j] });
    j += 1;
  }
  return ops;
}

export interface CommitResult { commit_sha_short: string; message: string; }
/** 保存后自动版本化：必须先调用 writeMarkdownAtomic 再 commit；必须仍 clean 检查（diff 仅 1 文件才过） */
export function commitAfterWrite(message: string, opts: Pick<WriteOptions, 'git_root'> = {}): CommitResult {
  const git_root = resolveGitRoot(opts.git_root);
  const porcelain = gitStatusPorcelain(git_root);
  if (!porcelain) {
    return { commit_sha_short: '', message: '(no-op, working tree clean)' };
  }
  const r = runGitWrapper(git_root, ['commit', message], { capture: true, check: false });
  if (r.status !== 0) throw new GitInvocationError('commit <msg>', r.status, `${r.stderr || ''}\n${r.stdout || ''}`);
  const short = runGitWrapper(git_root, ['rev-parse-short'], { capture: true, check: false });
  // fallback 直接 git 命令
  let sha = (short.stdout ?? '').trim();
  if (!sha || short.status !== 0) {
    const direct = child_process.spawnSync('git', ['-C', git_root, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf-8' });
    sha = (direct.stdout ?? '').trim();
  }
  return { commit_sha_short: sha, message };
}

/* -------------------- 9. diff / log / show / reset （通过 config-center-git.py 透传；UI Tab ③④ 直接调用） -------------------- */
export function gitDiff(rel_or_abs_path: string | null, opts: Pick<WriteOptions, 'git_root'> = {}): string {
  const git_root = resolveGitRoot(opts.git_root);
  const args = ['diff'];
  if (rel_or_abs_path) {
    const { rel_posix } = resolvePathInsideGitRoot(rel_or_abs_path, git_root);
    args.push(rel_posix);
  }
  const r = runGitWrapper(git_root, args, { capture: true, check: false });
  // config-center-git diff 退出码非 0 只表示「有改动」，不代表失败
  return (r.stdout ?? '') + (r.stderr ?? '');
}
export function gitLog(n = 10, opts: Pick<WriteOptions, 'git_root'> = {}): string {
  const git_root = resolveGitRoot(opts.git_root);
  const r = runGitWrapper(git_root, ['log', '-n', String(n)], { capture: true, check: false });
  return (r.stdout ?? '');
}
export function gitResetHard(hash: string, { forceYes, git_root }: { forceYes: boolean; git_root?: string | null }): string {
  if (!forceYes) throw new MdWriterError('[md-writer] reset --hard 必须显式传 forceYes=true；UI 必须先弹确认影响面（target..HEAD files changed）');
  const gr = resolveGitRoot(git_root);
  const r = runGitWrapper(gr, ['reset', '--hard', hash, '--force-yes'], { capture: true, check: false });
  if (r.status !== 0) throw new GitInvocationError(`reset --hard ${hash} --force-yes`, r.status, r.stderr || '');
  return r.stdout ?? '';
}

/* -------------------- 10. 导出 3 类便捷构造（避免调用方手动写字段顺序） -------------------- */
export function newExpertFields(p: Partial<ExpertFields> & Pick<ExpertFields, 'title'>): ExpertFields {
  const base: ExpertFields = {
    title: p.title, role: p.role ?? '', use: p.use ?? '', constraint: p.constraint ?? '', owner: p.owner ?? '',
    contract: p.contract, exceptions: p.exceptions,
  };
  return base;
}
export function newSkillFields(p: Partial<SkillFields> & Pick<SkillFields, 'title'>): SkillFields {
  return { title: p.title, role: p.role ?? '', use: p.use ?? '', constraint: p.constraint ?? '', owner: p.owner ?? '', input_schema: p.input_schema, output_schema: p.output_schema, fallback: p.fallback };
}
export function newPromptFields(p: Partial<PromptFields> & Pick<PromptFields, 'title'>): PromptFields {
  return { title: p.title, role: p.role ?? '', use: p.use ?? '', constraint: p.constraint ?? '', owner: p.owner ?? '', variables: p.variables, template: p.template };
}
