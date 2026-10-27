import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService, RequestAuthContext } from "../auth/auth.service";
import { GROWTH_METRICS, GROWTH_PLAN_PERMISSION, GROWTH_SCOPES, GrowthMetricSpec, addGrowthDays, growthDate, growthDay, growthHash, growthSpec, growthText, growthWindow, nextGrowthCheck, validateGrowthPlan } from "./growth-cockpit.contract";
type Input = Record<string, any>;
type Metric = { key: string; label: string; unit: string; meaning: string; scope: string; value: number | null; status: string; sampleSize: number; observedAt: string | null; source: string; basis?: string; evidence?: any; points?: { date: string; value: number }[] };
@Injectable()
export class GrowthCockpitService {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService) {}
  private readonly executors = new Map<string, any>();
  async executorState(brandId: string, actor: RequestAuthContext) { await this.authorizePlan(brandId, actor); const row = this.executors.get(brandId); return row ? { ...row, online: row.status !== "paused" && Date.now() - Date.parse(row.observedAt) < 90000, evidenceLevel: "authenticated_client_report" } : { online: false, status: "offline", evidenceLevel: "no_heartbeat" }; }
  async reportExecutor(brandId: string, actor: RequestAuthContext, input: Input) { await this.authorizePlan(brandId, actor, true); const workerId = growthText(input.workerId, "本机执行器", 100); if (!["idle", "running", "error", "paused"].includes(input.state)) throw new BadRequestException("执行器状态错误"); const row = { workerId, status: input.state, observedAt: new Date().toISOString(), actorId: actor.userId, packageVersion: growthText(input.packageVersion, "专家包版本", 100), activePlanId: String(input.activePlanId || "").slice(0,100), sessionId: String(input.sessionId || "").slice(0,100), errorCode: String(input.errorCode || "").slice(0,100) }; this.executors.set(brandId,row); return { accepted:true, observedAt:row.observedAt }; }
  private async ready() { if (!await this.prisma.canUseDatabase()) throw new ServiceUnavailableException("驾驶舱数据库不可用，未保存任何记录"); }
  private permission(spec: GrowthMetricSpec) { return spec.platform ? `brandGrowth.collection.${spec.platform === "douyin" ? "douyinCollection" : spec.platform === "wechat" ? "wechatMpCollection" : "xiaohongshuCollection"}` : GROWTH_PLAN_PERMISSION; }
  async authorizeMetric(brandId: string, key: string, actor: RequestAuthContext, write = false) { const spec = growthSpec(key); if (spec.scope === "content" && !spec.platform) for (const platform of ["douyin", "xiaohongshu", "wechat"]) await this.auth.assertBrandPermission(brandId, this.permission({ ...spec, platform }) as any, write ? "edit" : "view", actor); return this.auth.assertBrandPermission(brandId, this.permission(spec) as any, write ? "edit" : "view", actor); }
  async authorizePlan(brandId: string, actor: RequestAuthContext, write = false) { return this.auth.assertBrandPermission(brandId, GROWTH_PLAN_PERMISSION, write ? "edit" : "view", actor); }
  async snapshot(brandId: string, input: Input, actor: RequestAuthContext) {
    await this.ready(); const window = growthWindow(input); const cache = new Map<string, Metric>();
    const metric = async (spec: GrowthMetricSpec): Promise<Metric> => {
      if (cache.has(spec.key)) return cache.get(spec.key)!;
      const base: Metric = { key: spec.key, label: spec.label, unit: spec.unit, meaning: spec.meaning, scope: spec.scope, value: null, status: "unknown", sampleSize: 0, observedAt: null, source: spec.model || "structured_source_required" };
      try { await this.authorizeMetric(brandId, spec.key, actor); } catch { return { ...base, status: "forbidden", source: "无查看权限" }; }
      if (!window.observedDays) return { ...base, status: "no_observation", source: "所选时段尚无完整自然日" };
      try {
        let result: Metric;
        if (spec.model) {
          const model = (this.prisma as any)[spec.model];
          const where = { brandId, ...spec.filter, createdAt: { gte: window.from, lt: window.until } };
          // Full SQL COUNT is independent of listing limits. Only process records, never inferred performance.
          const table = spec.model === "businessAsset" ? "BusinessAsset" : spec.model === "workAnalysisResult" ? "WorkAnalysisResult" : spec.model.replace(/^aI/, "AI");
          const scope = spec.filter?.workspaceScope ? Prisma.sql` AND t."workspaceScope"=${spec.filter.workspaceScope}` : Prisma.empty;
          const category = spec.filter?.category ? Prisma.sql` AND t."category"=${spec.filter.category}::"AssetCategory"` : Prisma.empty;
          const active = spec.model === "workAnalysisResult" ? Prisma.sql` AND EXISTS (SELECT 1 FROM "WorkAnalysisRequest" r WHERE r."id"=t."requestId" AND r."status"<>'cancelled')` : Prisma.empty;
          const [count, groups] = await Promise.all([model.count({ where }), this.prisma.$queryRaw<{ date: string; value: number }[]>(Prisma.sql`SELECT to_char((t."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai','YYYY-MM-DD') AS date, count(*)::int AS value FROM ${Prisma.raw('"' + table + '"')} t WHERE t."brandId"=${brandId} AND t."createdAt">=${window.from} AND t."createdAt"<${window.until}${scope}${category}${active} GROUP BY 1 ORDER BY 1`)]);
          result = { ...base, value: count, sampleSize: count, status: "ready", observedAt: new Date().toISOString(), source: `${spec.model}:当前授权品牌的本期全量记录`, points: groups };
        } else if (spec.sum) {
          const values = await Promise.all(spec.sum.map(k => metric(growthSpec(k)))); const complete = values.every(v => v.status === "reported" && v.value !== null);
          result = { ...base, value: complete ? values.reduce((n, v) => n + v.value!, 0) : null, status: complete ? "reported" : "needs_data", sampleSize: values.reduce((n, v) => n + v.sampleSize, 0), observedAt: complete ? values.map(v => v.observedAt!).sort()[0] : null, basis: values.map(v => v.basis || "").join("|"), source: "广告实际消耗与达人结算来源上报之和，未独立核验", evidence: values };
        } else if (spec.ratio) {
          const [n, den] = await Promise.all(spec.ratio.map(k => metric(growthSpec(k))));
          const valid = n.status === "reported" && den.status === "reported" && n.basis === den.basis && n.value !== null && den.value !== null && den.value > 0 && (!spec.percentage || n.value <= den.value);
          result = { ...base, value: valid ? n.value! / den.value! * (spec.percentage ? 100 : 1) : null, status: valid ? "reported" : "needs_data", sampleSize: den.value || 0, observedAt: n.observedAt && den.observedAt ? (n.observedAt < den.observedAt ? n.observedAt : den.observedAt) : null, basis: n.basis, source: valid ? "结构化上报值推导；未独立核验" : "缺少同口径完整分子/分母或有效样本", evidence: { numerator: n, denominator: den } };
        } else {
          const rows = await this.prisma.growthMetricFact.findMany({ where: { brandId, metricKey: spec.key, date: { gte: window.start, lte: window.observedEnd } }, orderBy: [{ date: "asc" }, { revision: "desc" }] });
          const current = new Map<string, typeof rows[number]>(); for (const row of rows) if (!current.has(row.date)) current.set(row.date, row);
          const facts = [...current.values()], bases = new Set(facts.map(f => f.basis)), complete = facts.length === window.observedDays && bases.size === 1;
          result = { ...base, value: complete ? facts.reduce((n, f) => n + f.value, 0) : null, status: complete ? "reported" : facts.length ? "partial" : "needs_data", sampleSize: facts.reduce((n, f) => n + f.sampleSize, 0), observedAt: facts.length ? facts[facts.length - 1].observedAt.toISOString() : null, basis: bases.size === 1 ? facts[0].basis : undefined, source: "结构化来源上报，尚未平台独立验真", evidence: { coverageDays: facts.length, expectedDays: window.observedDays, sourceRefs: facts.map(f => ({ id: f.id, date: f.date, revision: f.revision, ref: f.sourceRef })) }, points: facts.map(f => ({ date: f.date, value: f.value })) };
        }
        cache.set(spec.key, result); return result;
      } catch { return { ...base, status: "error", source: "该指标读取失败；未按0计算" }; }
    };
    const metrics: Metric[] = []; for (const spec of GROWTH_METRICS) metrics.push(await metric(spec));
    const snapshot = { schemaVersion: "growth-cockpit-1.0.0", brandId, window, metrics, asOf: new Date().toISOString(), professionalExecution: "workbuddy_scoped_host_worker_when_online", sourceAuthority: "database_counts_and_explicit_reported_facts" };
    return { ...snapshot, contentHash: growthHash(snapshot) };
  }
  async overview(brandId: string, input: Input, actor: RequestAuthContext) { const current = await this.snapshot(brandId, input, actor); const comparison = current.window.observedDays && current.window.previousStart >= "2000-01-01" ? await this.snapshot(brandId, { dimension: "custom", start: current.window.previousStart, end: current.window.previousEnd }, actor) : null; return { ...current, comparison, executor: await this.executorState(brandId, actor) }; }
  private async redact(brandId: string, snapshot: any, actor: RequestAuthContext) { const metrics = []; for (const m of snapshot.metrics || []) { try { await this.authorizeMetric(brandId, m.key, actor); metrics.push(m); } catch { metrics.push({ key: m.key, label: m.label, scope: m.scope, unit: m.unit, value: null, status: "forbidden" }); } } return { ...snapshot, metrics }; }
  private async checkedView(brandId: string, row: any, actor: RequestAuthContext) { return { ...row, snapshotJson: JSON.stringify(await this.redact(brandId, JSON.parse(row.snapshotJson), actor)) }; }
  private page(input: Input) { const offset = Number(input.offset ?? 0), limit = Number(input.limit ?? 20); if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException("分页范围错误"); return { offset, limit }; }
  private view(row: any) { const { snapshotJson, eventsJson, payloadHash, idempotencyKey, ...rest } = row; return { ...rest, snapshot: undefined, events: eventsJson ? JSON.parse(eventsJson) : undefined }; }
  async list(brandId: string, input: Input, actor: RequestAuthContext) { await this.authorizePlan(brandId, actor); const { offset, limit } = this.page(input); const where = { brandId, ...(input.status ? { status: String(input.status) } : {}) }; const [total, rows] = await this.prisma.$transaction([this.prisma.growthPlan.count({ where }), this.prisma.growthPlan.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: offset, take: limit })]); return { total, offset, limit, items: rows.map(r => ({ ...this.view(r), snapshot: undefined })) }; }
  async get(brandId: string, id: string, actor: RequestAuthContext) {
    await this.authorizePlan(brandId, actor); const row = await this.prisma.growthPlan.findFirst({ where: { brandId, id }, include: { versions: { orderBy: { version: "desc" } }, checks: { orderBy: { createdAt: "desc" }, take: 50 }, proposals: { orderBy: { createdAt: "desc" }, take: 50 } } });
    if (!row) throw new NotFoundException("计划不存在或无权访问");
    for (const v of row.versions) await this.authorizeMetric(brandId, JSON.parse(v.bodyJson).metricKey, actor);
    const versions = []; for (const v of row.versions) { const { snapshotJson, ...rest } = v; versions.push({ ...rest, body: JSON.parse(v.bodyJson), snapshot: await this.redact(brandId, JSON.parse(snapshotJson), actor), methodVersions: JSON.parse(v.methodVersionsJson), evidenceLevel: "expert_reported_not_client_independently_verified" }); }
    const checks = []; for (const c of row.checks) { const { snapshotJson, ...rest } = c; checks.push({ ...rest, snapshot: await this.redact(brandId, JSON.parse(snapshotJson), actor) }); }
    return { ...this.view(row), snapshot: await this.redact(brandId, JSON.parse(row.snapshotJson), actor), versions, checks, proposals: row.proposals.map(p => ({ ...p, actions: JSON.parse(p.actionsJson), methodVersions: JSON.parse(p.methodVersionsJson), obsolete: p.baseVersion !== row.currentVersion || row.status !== "active" })), historyWindow: "最新50次检查与建议；版本完整保留" };
  }
  async create(brandId: string, actor: RequestAuthContext, input: Input) {
    await this.authorizePlan(brandId, actor, true); const title = growthText(input.title, "计划名称", 200), goal = growthText(input.goal, "经营目标", 8000), scope = String(input.scope || "brand"), startDate = growthDate(input.startDate), endDate = growthDate(input.endDate), frequency = String(input.frequency || "daily"), idempotencyKey = growthText(input.idempotencyKey, "重试键", 200);
    if (!GROWTH_SCOPES.includes(scope as any) || startDate > endDate || !["daily", "weekly"].includes(frequency)) throw new BadRequestException("板块、计划周期或检查频率不正确");
    const payloadHash = growthHash({ title, goal, scope, startDate, endDate, frequency, window: input.window || {} });
    const old = await this.prisma.growthPlan.findUnique({ where: { brandId_createdBy_idempotencyKey: { brandId, createdBy: actor.userId, idempotencyKey } } }); if (old) { if (old.payloadHash !== payloadHash) throw new ConflictException("重试键对应不同计划"); return this.view(old); }
    const snapshot = await this.snapshot(brandId, input.window || {}, actor);
    try { return this.view(await this.prisma.growthPlan.create({ data: { id: `gp_${randomUUID()}`, brandId, createdBy: actor.userId, title, goal, scope, startDate, endDate, frequency, idempotencyKey, payloadHash, snapshotJson: JSON.stringify(snapshot), eventsJson: JSON.stringify([{ at: new Date().toISOString(), action: "requested", actorId: actor.userId }]) } })); } catch (e) { const row = await this.prisma.growthPlan.findUnique({ where: { brandId_createdBy_idempotencyKey: { brandId, createdBy: actor.userId, idempotencyKey } } }); if (row?.payloadHash === payloadHash) return this.view(row); throw e; }
  }
  private async lock(tx: any, brandId: string, id: string) { const rows = await tx.$queryRaw`SELECT * FROM "GrowthPlan" WHERE "brandId"=${brandId} AND "id"=${id} FOR UPDATE`; if (!rows[0]) throw new NotFoundException("计划不存在或品牌错配"); return rows[0]; }
  private event(row: any, action: string, actorId: string, extra: any = {}) { return JSON.stringify([...JSON.parse(row.eventsJson), { at: new Date().toISOString(), action, actorId, ...extra }]); }
  async update(brandId: string, actor: RequestAuthContext, input: Input) {
    await this.authorizePlan(brandId, actor, true); const id = growthText(input.planId, "计划引用");
    return this.prisma.$transaction(async tx => {
      const row = await this.lock(tx, brandId, id); if (row.revision !== input.expectedRevision) throw new ConflictException("计划已变化，请重新读取"); const action = String(input.action);
      const allowed: Record<string, string[]> = { claim: ["awaiting_expert", "planning"], activate: ["draft"], pause: ["active"], resume: ["paused"], close: ["awaiting_expert", "planning", "draft", "active", "paused"] };
      if (!allowed[action]?.includes(row.status)) throw new ConflictException("当前计划状态不允许该动作");
      if (action === "claim" && row.status === "planning" && row.leaseUntil && row.leaseUntil > new Date()) throw new ConflictException("已有专家持有效接单租约");
      if (["activate", "resume"].includes(action)) { if (row.endDate < growthDay()) throw new ConflictException("计划已过有效期"); const v = await tx.growthPlanVersion.findFirst({ where: { planId: id, version: row.currentVersion } }); if (!v) throw new ConflictException("尚无专家结构化计划"); await this.authorizeMetric(brandId, JSON.parse(v.bodyJson).metricKey, actor); }
      const statuses: Record<string, string> = { claim: "planning", activate: "active", pause: "paused", resume: "active", close: "closed" };
      return this.view(await tx.growthPlan.update({ where: { id }, data: { status: statuses[action], revision: { increment: 1 }, claimedBy: action === "claim" ? actor.userId : "", leaseUntil: action === "claim" ? new Date(Date.now() + 30 * 60000) : null, nextCheckAt: ["activate", "resume"].includes(action) ? new Date() : null, eventsJson: this.event(row, action, actor.userId) } }));
    });
  }
  private methods(v: any) { if (!v || typeof v !== "object" || typeof v.expertPackage !== "string" || !v.expertPackage.trim() || !Array.isArray(v.skills) || !v.skills.length || v.skills.some((s: any) => typeof s !== "string" || !s.trim())) throw new BadRequestException("须声明实际使用的专家包及Skill版本"); return v; }
  async submit(brandId: string, actor: RequestAuthContext, input: Input) {
    await this.authorizePlan(brandId, actor, true); const body = validateGrowthPlan(input.body); await this.authorizeMetric(brandId, body.metricKey, actor);
    const id = growthText(input.planId, "计划引用"), key = growthText(input.idempotencyKey, "提交重试键", 200), reportMarkdown = growthText(input.reportMarkdown, "完整计划报告", 120000), methods = this.methods(input.methodVersions), hash = growthHash({ body, reportMarkdown, methods, snapshotRef: input.snapshotRef });
    return this.prisma.$transaction(async tx => { const row = await this.lock(tx, brandId, id); if (["closed", "paused"].includes(row.status)) throw new ConflictException("计划已结束或暂停");
      const old = await tx.growthPlanVersion.findUnique({ where: { planId_idempotencyKey: { planId: id, idempotencyKey: key } } }); if (old) { if (old.payloadHash !== hash || old.actorId !== actor.userId) throw new ConflictException("提交重试键冲突"); return { planId: id, versionId: old.id, version: old.version }; }
      if (row.status !== "planning" || row.revision !== input.expectedRevision || row.claimedBy !== actor.userId || !row.leaseUntil || row.leaseUntil < new Date()) throw new ConflictException("须当前接单身份、有效租约与最新revision");
      const snapshot = JSON.parse(row.snapshotJson); if (input.snapshotRef !== snapshot.contentHash) throw new ConflictException("计划来源快照错配");
      const metric = snapshot.metrics.find((m: any) => m.key === body.metricKey); if (!metric || metric.status === "forbidden") throw new ConflictException("快照中无可用指标权限");
      const version = await tx.growthPlanVersion.create({ data: { id: `gpv_${randomUUID()}`, planId: id, brandId, version: 1, bodyJson: JSON.stringify({ ...body, baseline: metric.value, baselineStatus: metric.status }), reportMarkdown, methodVersionsJson: JSON.stringify(methods), snapshotJson: row.snapshotJson, actorId: actor.userId, idempotencyKey: key, payloadHash: hash } });
      await tx.growthPlan.update({ where: { id }, data: { status: "draft", currentVersion: 1, revision: { increment: 1 }, claimedBy: "", leaseUntil: null, eventsJson: this.event(row, "expert_plan_submitted", actor.userId, { versionId: version.id }) } }); return { planId: id, versionId: version.id, version: 1 };
    });
  }
  async recordFact(brandId: string, actor: RequestAuthContext, input: Input) {
    const spec = growthSpec(input.metricKey); if (!spec.fact) throw new BadRequestException("该指标由数据库或分子分母推导，不接受直接覆盖"); await this.authorizeMetric(brandId, spec.key, actor, true);
    const date = growthDate(input.date), value = Number(input.value), sampleSize = Number(input.sampleSize), basis = growthText(input.basis, "去重/归因/题库与模型口径", 1000), sourceRef = growthText(input.sourceRef, "原始证据引用", 2000), idempotencyKey = growthText(input.idempotencyKey, "重试键", 200), observedAt = new Date(input.observedAt);
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(sampleSize) || sampleSize < 0 || (spec.unit !== "元" && !Number.isInteger(value)) || !Number.isFinite(observedAt.getTime()) || observedAt > new Date(Date.now() + 300000) || date >= growthDay()) throw new BadRequestException("只接受已结束自然日、真实非负数值/样本与合法观察时间");
    const hash = growthHash({ key: spec.key, date, value, sampleSize, basis, sourceRef, observedAt: observedAt.toISOString(), expectedRevision: input.expectedRevision });
    return this.prisma.$transaction(async tx => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${brandId + ':' + spec.key + ':' + date}, 0))`;
      const old = await tx.growthMetricFact.findUnique({ where: { brandId_actorId_idempotencyKey: { brandId, actorId: actor.userId, idempotencyKey } } }); if (old) { if (old.payloadHash !== hash) throw new ConflictException("上报重试键冲突"); return { id: old.id, revision: old.revision, evidenceLevel: "reported_not_independently_verified" }; }
      const last = await tx.growthMetricFact.findFirst({ where: { brandId, metricKey: spec.key, date }, orderBy: { revision: "desc" } }); if ((last?.revision || 0) !== input.expectedRevision) throw new ConflictException("来源已变化，请先读取当前指标证据版本");
      const row = await tx.growthMetricFact.create({ data: { id: `gmf_${randomUUID()}`, brandId, metricKey: spec.key, date, value, sampleSize, basis, sourceRef, actorId: actor.userId, revision: (last?.revision || 0) + 1, observedAt, idempotencyKey, payloadHash: hash } }); return { id: row.id, revision: row.revision, evidenceLevel: "reported_not_independently_verified" };
    });
  }
  async check(brandId: string, actor: RequestAuthContext, input: Input) {
    await this.authorizePlan(brandId, actor, true); const id = growthText(input.planId, "计划引用"); const plan = await this.get(brandId, id, actor); if (plan.status !== "active") throw new ConflictException("只检查生效计划");
    const v = plan.versions.find((v: any) => v.version === plan.currentVersion); if (!v) throw new ConflictException("缺计划版本"); const body = v.body; await this.authorizeMetric(brandId, body.metricKey, actor);
    const end = [addGrowthDays(growthDay(), -1), plan.endDate].sort()[0], start = [addGrowthDays(end, 1 - body.windowDays), plan.startDate].sort().at(-1)!;
    if (start > end) return { status: "not_started", reason: "计划尚未有完整观察日" };
    const snapshot = await this.snapshot(brandId, { dimension: "custom", start, end }, actor), m = snapshot.metrics.find(m => m.key === body.metricKey)!;
    const stable = { key: m.key, value: m.value, status: m.status, sampleSize: m.sampleSize, basis: m.basis, evidence: m.evidence, points: m.points }; const snapshotHash = growthHash(stable);
    const stale = m.status === "reported" && (!m.observedAt || Date.now() - Date.parse(m.observedAt) > 36 * 3600000);
    const state = !["ready", "reported"].includes(m.status) || m.value === null ? "needs_data" : stale ? "stale" : m.sampleSize < body.minSample ? "insufficient_sample" : (body.direction === "higher" ? m.value < body.target : m.value > body.target) ? "needs_expert" : "on_track";
    const reasons: Record<string, string> = { needs_data: "指标来源/覆盖/口径不完整，不判断经营效果", stale: "数据过期，先补齐新鲜快照", insufficient_sample: "样本未达计划门槛，继续观察", needs_expert: "指标偏离目标，等待WorkBuddy专业团队读取证据提出意见", on_track: "当前观察达到目标；不代表最终经营验收" };
    return this.prisma.$transaction(async tx => { const row = await this.lock(tx, brandId, id); if (row.status !== "active" || row.currentVersion !== v.version) throw new ConflictException("检查期间计划已变更");
      const old = await tx.growthPlanCheck.findFirst({ where: { planId: id, version: v.version, windowEnd: end, snapshotHash } }); if (old) return this.checkedView(brandId, { ...old, idempotent: true }, actor);
      const saved = await tx.growthPlanCheck.create({ data: { id: `gpc_${randomUUID()}`, planId: id, brandId, version: v.version, windowStart: start, windowEnd: end, snapshotHash, snapshotJson: JSON.stringify({ ...snapshot, monitoredMetric: m }), status: state, reason: reasons[state] } });
      await tx.growthPlan.update({ where: { id }, data: { nextCheckAt: nextGrowthCheck(row.frequency), eventsJson: this.event(row, "data_checked", actor.userId, { checkId: saved.id, status: state }), revision: { increment: 1 } } }); return this.checkedView(brandId, saved, actor);
    });
  }
  async queue(brandId: string, actor: RequestAuthContext) { await this.authorizePlan(brandId, actor); const now = new Date(); const [plans, checks] = await Promise.all([this.prisma.growthPlan.findMany({ where: { brandId, OR: [{ status: "awaiting_expert" }, { status: "planning", leaseUntil: { lt: now } }] }, take: 50, orderBy: { createdAt: "asc" } }), this.prisma.growthPlanCheck.findMany({ where: { brandId, OR: [{ status: "needs_expert" }, { status: "analyzing", leaseUntil: { lt: now } }], plan: { status: "active" } }, take: 50, orderBy: { createdAt: "asc" }, include: { plan: { select: { currentVersion: true } } } })]); return { dispatch: "scoped_host_worker_when_online", plans: plans.map(p => this.view(p)), checks: checks.filter(c => c.version === c.plan.currentVersion).map(({ snapshotJson, ...c }) => ({ ...c, snapshotRef: JSON.parse(snapshotJson).contentHash })) }; }
  async claimCheck(brandId: string, actor: RequestAuthContext, input: Input) { await this.authorizePlan(brandId, actor, true); return this.prisma.$transaction(async tx => {
    const plan = await this.lock(tx, brandId, growthText(input.planId, "计划引用")); const c = await tx.growthPlanCheck.findFirst({ where: { id: input.checkId, planId: plan.id, brandId } });
    const version = await tx.growthPlanVersion.findFirst({ where: {planId: plan.id, version: plan.currentVersion} }); if (version) await this.authorizeMetric(brandId, JSON.parse(version.bodyJson).metricKey, actor);
    if (!c || plan.status !== "active" || c.version !== plan.currentVersion || c.revision !== input.expectedRevision || !(c.status === "needs_expert" || (c.status === "analyzing" && c.leaseUntil && c.leaseUntil < new Date()))) throw new ConflictException("检查意见队列状态/版本/租约已变化");
    return this.checkedView(brandId, await tx.growthPlanCheck.update({ where: { id: c.id }, data: { claimedBy: actor.userId, status: "analyzing", leaseUntil: new Date(Date.now() + 30 * 60000), revision: { increment: 1 } } }), actor);
  }); }
  async submitProposal(brandId: string, actor: RequestAuthContext, input: Input) {
    await this.authorizePlan(brandId, actor, true); const reportMarkdown = growthText(input.reportMarkdown, "依据/假设/调整/限制报告", 120000), key = growthText(input.idempotencyKey, "重试键", 200), methods = this.methods(input.methodVersions);
    if (!Array.isArray(input.actions) || !input.actions.length || input.actions.length > 20) throw new BadRequestException("缺调整措施"); const actions = input.actions.map((a: any) => ({ title: growthText(a?.title, "措施", 1000), owner: growthText(a?.owner, "负责人", 200), acceptance: growthText(a?.acceptance, "验收", 2000) })); const hash = growthHash({ reportMarkdown, actions, methods, checkId: input.checkId, snapshotRef: input.snapshotRef });
    return this.prisma.$transaction(async tx => { const plan = await this.lock(tx, brandId, input.planId); if (plan.status !== "active") throw new ConflictException("计划已暂停或结束"); const old = await tx.growthPlanProposal.findUnique({ where: { planId_idempotencyKey: { planId: plan.id, idempotencyKey: key } } }); if (old) { if (old.payloadHash !== hash || old.actorId !== actor.userId || old.baseVersion !== plan.currentVersion) throw new ConflictException("重试内容/版本冲突"); return old; }
      const current = await tx.growthPlanVersion.findFirstOrThrow({ where: {planId: plan.id, version: plan.currentVersion} }); await this.authorizeMetric(brandId, JSON.parse(current.bodyJson).metricKey, actor);
      const c = await tx.growthPlanCheck.findFirst({ where: { id: input.checkId, planId: plan.id, brandId } }); if (!c || c.status !== "analyzing" || c.claimedBy !== actor.userId || c.version !== plan.currentVersion || c.revision !== input.expectedRevision || !c.leaseUntil || c.leaseUntil < new Date() || JSON.parse(c.snapshotJson).contentHash !== input.snapshotRef) throw new ConflictException("分析租约/身份/来源/版本错配");
      const proposal = await tx.growthPlanProposal.create({ data: { id: `gpp_${randomUUID()}`, planId: plan.id, brandId, checkId: c.id, baseVersion: plan.currentVersion, actionsJson: JSON.stringify(actions), reportMarkdown, methodVersionsJson: JSON.stringify(methods), actorId: actor.userId, idempotencyKey: key, payloadHash: hash } }); await tx.growthPlanCheck.update({ where: { id: c.id }, data: { status: "proposal_submitted", revision: { increment: 1 }, claimedBy: "", leaseUntil: null } }); await tx.growthPlan.update({ where: { id: plan.id }, data: { revision: { increment: 1 }, eventsJson: this.event(plan, "proposal_submitted", actor.userId, { proposalId: proposal.id }) } }); return proposal;
    });
  }
  async reviewProposal(brandId: string, actor: RequestAuthContext, input: Input) { await this.authorizePlan(brandId, actor, true); if (!["accept", "reject"].includes(input.decision)) throw new BadRequestException("建议决定错误"); return this.prisma.$transaction(async tx => {
    const row = await this.lock(tx, brandId, input.planId); const p = await tx.growthPlanProposal.findFirst({ where: { id: input.proposalId, planId: row.id, brandId } }); if (!p || p.decision !== "pending" || row.status !== "active" || row.revision !== input.expectedRevision || p.baseVersion !== row.currentVersion) throw new ConflictException("建议或计划已变化，旧建议不能覆盖当前版本");
    if (input.decision === "accept") { const old = await tx.growthPlanVersion.findFirstOrThrow({ where: { planId: row.id, version: row.currentVersion } }); const body = JSON.parse(old.bodyJson); await this.authorizeMetric(brandId, body.metricKey, actor); await tx.growthPlanVersion.create({ data: { id: `gpv_${randomUUID()}`, planId: row.id, brandId, version: row.currentVersion + 1, bodyJson: JSON.stringify({ ...body, actions: JSON.parse(p.actionsJson) }), reportMarkdown: p.reportMarkdown, methodVersionsJson: p.methodVersionsJson, snapshotJson: old.snapshotJson, actorId: actor.userId, idempotencyKey: `proposal:${p.id}`, payloadHash: p.payloadHash } }); }
    await tx.growthPlanProposal.update({ where: { id: p.id }, data: { decision: input.decision === "accept" ? "accepted" : "rejected" } }); return this.view(await tx.growthPlan.update({ where: { id: row.id }, data: { revision: { increment: 1 }, ...(input.decision === "accept" ? { currentVersion: { increment: 1 } } : {}), eventsJson: this.event(row, "proposal_" + input.decision, actor.userId, { proposalId: p.id }) } }));
  }); }
  async runDue() {
    await this.ready();
    const due = await this.prisma.growthPlan.findMany({ where: { status: "active", nextCheckAt: { lte: new Date() } }, take: 20, orderBy: { nextCheckAt: "asc" } });
    for (const row of due) {
      const actor: RequestAuthContext = { userId: row.createdBy, source: "token", brandId: row.brandId };
      try {
        const user = await this.prisma.user.findUnique({ where: { id: row.createdBy }, select: { status: true } });
        if (!user || user.status !== "ACTIVE") { await this.prisma.growthPlan.updateMany({ where: {id:row.id,status:"active",revision:row.revision}, data:{status:"paused",nextCheckAt:null,revision:{increment:1},eventsJson:this.event(row,"monitor_permission_lost","system:plan-monitor",{reason:"计划责任人不可用，已暂停检查"})} }); continue; }
        const result: any = await this.check(row.brandId, actor, { planId: row.id });
        const current = await this.prisma.growthPlan.findUnique({where:{id:row.id}});
        if (!current || current.status !== "active" || current.currentVersion !== row.currentVersion) continue;
        const ended = row.endDate < growthDay();
        if (ended || result.status === "not_started" || result.idempotent) await this.prisma.growthPlan.updateMany({ where: { id: row.id, status: "active", revision:current.revision }, data: { nextCheckAt: ended ? null : nextGrowthCheck(row.frequency), ...(ended ? {eventsJson:this.event(current,"observation_period_finished","system:plan-monitor",{reason:"观察周期结束，最终检查已保留；等待复盘，不再定时检查"}),revision:{increment:1}} : {}) } });
      } catch (error: any) {
        const current = await this.prisma.growthPlan.findUnique({where:{id:row.id}}).catch(()=>null);
        if (!current || current.status !== "active" || current.currentVersion !== row.currentVersion) continue;
        const lostPermission = [401,403].includes(error?.getStatus?.());
        await this.prisma.growthPlan.updateMany({where:{id:row.id,status:"active",revision:current.revision},data:{...(lostPermission?{status:"paused",nextCheckAt:null}:{nextCheckAt:new Date(Date.now()+5*60000)}),revision:{increment:1},eventsJson:this.event(current,lostPermission?"monitor_permission_lost":"monitor_error","system:plan-monitor",{reason:lostPermission?"责任人权限已变化，暂停检查":"数据检查未完成，等待服务恢复后重试"})}}).catch(()=>undefined);
      }
    }
    return { examined: due.length };
  }
  async execute(name: string, brandId: string, actor: RequestAuthContext, input: Input) {
    await this.ready(); switch (name) { case "get_growth_executor_state": return this.executorState(brandId, actor); case "report_growth_executor_state": return this.reportExecutor(brandId, actor, input); case "get_growth_cockpit": return this.overview(brandId, input, actor); case "create_growth_plan_request": return this.create(brandId, actor, input); case "list_growth_plans": return this.list(brandId, input, actor); case "get_growth_plan": return this.get(brandId, input.planId, actor); case "update_growth_plan": return this.update(brandId, actor, input); case "submit_growth_plan": return this.submit(brandId, actor, input); case "record_growth_metric_fact": return this.recordFact(brandId, actor, input); case "check_growth_plan": return this.check(brandId, actor, input); case "list_growth_expert_queue": return this.queue(brandId, actor); case "claim_growth_plan_check": return this.claimCheck(brandId, actor, input); case "submit_growth_plan_proposal": return this.submitProposal(brandId, actor, input); case "review_growth_plan_proposal": return this.reviewProposal(brandId, actor, input); default: throw new BadRequestException("未知驾驶舱操作"); }
  }
}

