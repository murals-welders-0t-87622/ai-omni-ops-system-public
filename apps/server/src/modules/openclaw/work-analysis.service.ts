import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AssetCategory, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AnalysisPlatform, WorkSnapshot, WORK_ANALYSIS_DICTIONARIES, analysisForms, analysisPlatform, analysisReportHtml, analysisText, validateAnalysisProfiles, workAnalysisHash } from "./work-analysis.contract";

type RequestRow = { id: string; brandId: string; platform: string; sourceId: string; snapshotJson: string; formsJson: string; goal: string; status: string; revision: number; generation: number; actorId: string; claimedBy: string; eventsJson: string; idempotencyKey: string; payloadHash: string; createdAt: Date; updatedAt: Date };
type AnalysisInput = Record<string, any>;
const kindPlatform: Record<string, AnalysisPlatform> = {
  XHS_BRAND_NOTE: "xiaohongshu", XHS_BENCHMARK_NOTE: "xiaohongshu", XHS_SEARCH_NOTE: "xiaohongshu",
  DOUYIN_BRAND_WORK: "douyin", DOUYIN_COMPETITOR_WORK: "douyin", DOUYIN_BENCHMARK_WORK: "douyin", DOUYIN_SEARCH_WORK: "douyin", DOUYIN_LOW_FAN_EXPLOSIVE_WORK: "douyin", DOUYIN_HIGH_COMPLETION_RATE_WORK: "douyin", DOUYIN_HIGH_LIKE_RATE_WORK: "douyin",
  WECHAT_MP_ARTICLE: "wechat", WECHAT_MP_BENCHMARK_ARTICLE: "wechat", WECHAT_SEARCH_ITEM: "wechat",
};
@Injectable()
export class WorkAnalysisService {
  constructor(private readonly prisma: PrismaService) {}
  async execute(operation: string, brandId: string, actorId: string, input: AnalysisInput) {
    switch (operation) {
      case "list_collected_works_for_analysis": return this.listSources(brandId, input);
      case "get_collected_work_analysis_context": return this.source(brandId, input.sourceId, input.platform);
      case "get_work_analysis_taxonomy": return this.taxonomy(input.form);
      case "create_work_analysis_request": return this.create(brandId, actorId, input);
      case "list_work_analysis_requests": return this.list(brandId, input);
      case "update_work_analysis_request": return this.update(brandId, actorId, input);
      case "submit_work_analysis_result": return this.submit(brandId, actorId, input);
      case "list_work_analysis_results": return this.list(brandId, { ...input, status: "completed" });
      case "get_work_analysis_result": return this.get(brandId, input.requestId, input.platform);
      case "review_work_analysis_result": return this.review(brandId, actorId, input);
      default: throw new BadRequestException("未知作品拆解操作");
    }
  }
  private async ready() { if (!await this.prisma.canUseDatabase()) throw new ServiceUnavailableException("作品拆解数据库不可用，未保存任何记录"); }
  taxonomy(form?: string) {
    if (form && !Object.hasOwn(WORK_ANALYSIS_DICTIONARIES, form)) throw new BadRequestException("标签体系只能是text/image/video");
    return form ? WORK_ANALYSIS_DICTIONARIES[form as keyof typeof WORK_ANALYSIS_DICTIONARIES] : WORK_ANALYSIS_DICTIONARIES;
  }
  snapshot(asset: { id: string; brandId?: string; title: string; description: string | null; fileUrl: string | null; metadataJson: unknown; updatedAt: Date }): WorkSnapshot | null {
    const m = (asset.metadataJson && typeof asset.metadataJson === "object" ? asset.metadataJson : {}) as AnalysisInput;
    const platform = kindPlatform[String(m.kind)];
    if (!platform) return null;
    // 搜一搜包括账号/直播等，只有可确认为文章的来源进入公众号作品候选。
    if (m.kind === "WECHAT_SEARCH_ITEM" && !m.articleContent && !/mp\.weixin\.qq\.com\/s(?:[/?]|$)/i.test(String(m.url || ""))) return null;
    const text = (...keys: string[]) => keys.map(k => typeof m[k] === "string" ? m[k] : "").find(Boolean) || "";
    const mediaUrl = (value: unknown) => {
      if (typeof value !== "string" || /batch_get_tmp_download_url/i.test(value)) return "";
      if (/^https?:\/\//i.test(value)) return value;
      const apiBase = String(process.env.API_PUBLIC_BASE_URL || "").replace(/\/$/, "");
      const origin = apiBase.replace(/\/api$/, "");
      const work = /^works\/([^/]+)\//.exec(value);
      if (work && asset.brandId && work[1] === asset.brandId && apiBase) return `${apiBase}/works/brands/${encodeURIComponent(asset.brandId)}/assets?fileName=${encodeURIComponent(value)}`;
      return origin && /^\/(?!\/)/.test(value) ? `${origin}${value}` : "";
    };
    const urls = (...keys: string[]) => {
      const candidates = keys.map(k => Array.isArray(m[k]) ? m[k].map((v: unknown) => mediaUrl(typeof v === "object" && v ? (v as { url?: unknown }).url : v)).filter(Boolean) as string[] : []);
      // Keep complete original ordering when the cached set is partial.
      return candidates.reduce((best, current) => current.length > best.length ? current : best, [] as string[]);
    };
    const body = text("articleContent", "description", "content", "videoCopy") || (/^(XHS_|DOUYIN_)/.test(String(m.kind)) ? asset.description || "" : "");
    const value = {
      sourceId: asset.id, platform, sourceKind: String(m.kind), title: asset.title, authorName: text("authorName", "nickname", "jumpInfoNickName", "accountName"),
      originalWorkId: text("workId", "noteId", "articleId", "appMsgId", "docId"), workUrl: text("workUrl", "noteUrl", "url", "sourceUrl") || asset.fileUrl || "",
      collectedAt: text("collectedAt"), publishedAt: text("publishTimeText", "createdAtText", "publishTime", "createTime"), metricsAt: text("statsUpdatedAt", "collectedAt"),
      metrics: Object.fromEntries(["playCount", "readNum", "likeCount", "collectCount", "commentCount", "shareCount"].map(k => [k, typeof m[k] === "number" && Number.isFinite(m[k]) ? m[k] : null])),
      body, paragraphs: body.split(/\r?\n/).map((text, i) => ({ id: `p${i + 1}`, text })),
      images: urls("imageList", "images", "imageSourceList").map((url, i) => ({ id: `image-${i + 1}`, url })),
      videoUrl: [m.videoUrl, m.sourceVideoUrl, m.videoSourceUrl].map(mediaUrl).find(Boolean) || "", transcript: text("videoTranscriptText", "transcriptText", "transcript"),
      durationMs: typeof m.durationMs === "number" && m.durationMs > 0 ? Math.round(m.durationMs) : typeof m.durationSec === "number" && m.durationSec > 0 ? Math.round(m.durationSec * 1000) : null,
    };
    return { ...value, contentHash: workAnalysisHash(value) };
  }
  async listSources(brandId: string, input: AnalysisInput) {
    await this.ready();
    const platform = analysisPlatform(input.platform);
    // No material-library filter, take window, transcript reconciliation or cache scheduling.
    const assets = await this.prisma.businessAsset.findMany({ where: { brandId, category: AssetCategory.PLATFORM_EXPORT }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] });
    const keyword = String(input.keyword || "").trim().toLocaleLowerCase();
    const excludePreviouslyRequested = input.excludePreviouslyRequested === true || input.excludePreviouslyRequested === "true";
    if (input.excludePreviouslyRequested !== undefined && ![true, false, "true", "false"].includes(input.excludePreviouslyRequested)) throw new BadRequestException("去重筛选须为布尔值");
    const previous = excludePreviouslyRequested ? await this.prisma.workAnalysisRequest.findMany({ where: { brandId, platform, status: { not: "cancelled" } }, select: { sourceId: true } }) : [];
    const requested = new Set(previous.map(row => row.sourceId));
    const all = assets.map(a => this.snapshot(a)).filter((v): v is WorkSnapshot => !!v && v.platform === platform).filter(v => !requested.has(v.sourceId)).filter(v => !keyword || `${v.title} ${v.authorName} ${v.body}`.toLocaleLowerCase().includes(keyword));
    const page = this.page(input);
    return { items: all.slice(page.offset, page.offset + page.limit), total: all.length, ...page, platform, coverage: "current_brand_collected_work_records" };
  }
  async source(brandId: string, sourceId: string, platform: unknown) {
    await this.ready();
    const scope = analysisPlatform(platform);
    const asset = await this.prisma.businessAsset.findFirst({ where: { id: analysisText(sourceId, "采集作品引用"), brandId, category: AssetCategory.PLATFORM_EXPORT } });
    const source = asset ? this.snapshot(asset) : null;
    if (!source || source.platform !== scope) throw new NotFoundException("采集作品不存在或不属于当前品牌/平台");
    return source;
  }
  private page(input: AnalysisInput) {
    const limit = Number(input.limit ?? 20), offset = Number(input.offset ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) throw new BadRequestException("分页范围错误");
    return { limit, offset };
  }
  private requestView(row: RequestRow) {
    const { snapshotJson, formsJson, eventsJson, payloadHash, idempotencyKey, ...rest } = row;
    return { ...rest, source: JSON.parse(snapshotJson), forms: JSON.parse(formsJson), events: JSON.parse(eventsJson), dispatchStatus: row.status === "pending" ? "awaiting_workbuddy_claim" : row.status };
  }
  async create(brandId: string, actorId: string, input: AnalysisInput) {
    const platform = analysisPlatform(input.platform), sourceId = analysisText(input.sourceId, "采集作品引用"), forms = analysisForms(input.forms);
    const goal = analysisText(input.goal, "拆解目标"), idempotencyKey = analysisText(input.idempotencyKey, "重试键", 200);
    const payloadHash = workAnalysisHash({ platform, sourceId, forms, goal });
    await this.ready();
    const existing = await this.prisma.workAnalysisRequest.findUnique({ where: { brandId_actorId_idempotencyKey: { brandId, actorId, idempotencyKey } } });
    if (existing) { if (existing.payloadHash !== payloadHash) throw new ConflictException("同一重试键对应不同委托"); return this.requestView(existing); }
    const source = await this.source(brandId, sourceId, platform);
    const events = [{ at: new Date().toISOString(), actorId, action: "request_confirmed", generation: 1 }];
    try {
      const item = await this.prisma.workAnalysisRequest.create({ data: { id: `wa_${randomUUID()}`, brandId, platform, sourceId, snapshotJson: JSON.stringify(source), formsJson: JSON.stringify(forms), goal, actorId, idempotencyKey, payloadHash, eventsJson: JSON.stringify(events) } });
      return this.requestView(item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const item = await this.prisma.workAnalysisRequest.findUniqueOrThrow({ where: { brandId_actorId_idempotencyKey: { brandId, actorId, idempotencyKey } } });
        if (item.payloadHash !== payloadHash) throw new ConflictException("同一重试键对应不同委托");
        return this.requestView(item);
      }
      throw error;
    }
  }
  async list(brandId: string, input: AnalysisInput) {
    await this.ready();
    const platform = analysisPlatform(input.platform), page = this.page(input);
    const where = { brandId, platform, AND: [{ status: { not: "cancelled" } }], ...(input.status ? { status: String(input.status) } : {}), ...(input.keyword ? { OR: [{ goal: { contains: String(input.keyword), mode: "insensitive" as const } }, { results: { some: { tagsText: { contains: String(input.keyword), mode: "insensitive" as const } } } }] } : {}) };
    const [total, items] = await this.prisma.$transaction([this.prisma.workAnalysisRequest.count({ where }), this.prisma.workAnalysisRequest.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: page.offset, take: page.limit })]);
    return { items: items.map(i => this.requestView(i)), total, ...page };
  }
  async get(brandId: string, requestId: string, platform: unknown) {
    await this.ready();
    const row = await this.prisma.workAnalysisRequest.findFirst({ where: { id: requestId, brandId, platform: analysisPlatform(platform) }, include: { results: { orderBy: { generation: "desc" } } } });
    if (!row) throw new NotFoundException("拆解委托不存在或无权读取");
    return { ...this.requestView(row), results: row.results.map(({ profilesJson, snapshotJson, methodVersionsJson, ...r }) => ({ ...r, profiles: JSON.parse(profilesJson), source: JSON.parse(snapshotJson), methodVersions: JSON.parse(methodVersionsJson), evidenceLevel: "expert_reported_positions_not_independently_media_verified" })) };
  }
  private async lock(tx: Prisma.TransactionClient, brandId: string, requestId: string, platform: unknown) {
    const rows = await tx.$queryRaw<RequestRow[]>`SELECT * FROM "WorkAnalysisRequest" WHERE "id"=${requestId} AND "brandId"=${brandId} AND "platform"=${analysisPlatform(platform)} FOR UPDATE`;
    if (!rows[0]) throw new NotFoundException("拆解委托不存在或平台/品牌不匹配");
    return rows[0];
  }
  async update(brandId: string, actorId: string, input: AnalysisInput) {
    await this.ready();
    const requestId = analysisText(input.requestId, "委托引用");
    return this.prisma.$transaction(async tx => {
      const row = await this.lock(tx, brandId, requestId, input.platform);
      if (row.revision !== input.expectedRevision) throw new ConflictException("委托已变化，请重新读取后继续");
      const action = String(input.action), allowed: Record<string, string[]> = { claim: ["pending"], needs_input: ["running"], fail: ["running"], resume: ["needs_input", "failed"], cancel: ["pending", "running", "needs_input", "failed"], reanalyse: ["completed"] };
      if (!allowed[action]?.includes(row.status)) throw new ConflictException("当前状态不允许此操作");
      if (["needs_input", "fail"].includes(action) && row.claimedBy !== actorId) throw new ConflictException("只能由接单身份提交执行状态");
      const status: Record<string, string> = { claim: "running", needs_input: "needs_input", fail: "failed", resume: "pending", cancel: "cancelled", reanalyse: "pending" };
      const message = ["needs_input", "fail", "cancel"].includes(action) ? analysisText(input.message, "状态原因") : String(input.message || "");
      const events = JSON.parse(row.eventsJson); events.push({ at: new Date().toISOString(), actorId, action, message, generation: row.generation });
      const item = await tx.workAnalysisRequest.update({ where: { id: row.id }, data: { status: status[action], revision: { increment: 1 }, ...(action === "reanalyse" ? { generation: { increment: 1 } } : {}), claimedBy: action === "claim" ? actorId : "", eventsJson: JSON.stringify(events) } });
      return this.requestView(item);
    });
  }
  async submit(brandId: string, actorId: string, input: AnalysisInput) {
    await this.ready();
    const requestId = analysisText(input.requestId, "委托引用"), idempotencyKey = analysisText(input.idempotencyKey, "提交重试键", 200);
    const title = analysisText(input.title, "报告标题", 200), reportMarkdown = analysisText(input.reportMarkdown, "完整拆解报告", 250000);
    const payloadHash = workAnalysisHash({ title, reportMarkdown, profiles: input.profiles, methodVersions: input.methodVersions, sourceSnapshotRef: input.sourceSnapshotRef });
    return this.prisma.$transaction(async tx => {
      const row = await this.lock(tx, brandId, requestId, input.platform);
      if (row.status === "cancelled") throw new ConflictException("委托已取消并移除，不能继续提交");
      const old = await tx.workAnalysisResult.findUnique({ where: { requestId_idempotencyKey: { requestId, idempotencyKey } } });
      if (old) {
        if (old.payloadHash !== payloadHash || old.actorId !== actorId) throw new ConflictException("提交重试键冲突");
        return { analysisId: requestId, revisionId: old.id, generation: old.generation, platform: row.platform, savedAt: old.createdAt };
      }
      if (row.revision !== input.expectedRevision || row.status !== "running" || row.claimedBy !== actorId) throw new ConflictException("提交前须由当前身份接单并读取最新委托");
      const snapshot = JSON.parse(row.snapshotJson) as WorkSnapshot;
      if (input.sourceSnapshotRef !== snapshot.contentHash) throw new ConflictException("来源快照发生错配");
      const profiles = validateAnalysisProfiles(input.profiles, analysisForms(JSON.parse(row.formsJson)), snapshot);
      const methodVersions = input.methodVersions;
      if (!methodVersions || typeof methodVersions !== "object" || Array.isArray(methodVersions) || typeof methodVersions.expertPackage !== "string" || !methodVersions.expertPackage.trim() || !Array.isArray(methodVersions.skills) || !methodVersions.skills.length || methodVersions.skills.some((v: unknown) => typeof v !== "string" || !v.trim())) throw new BadRequestException("缺少实际专家包与Skill版本声明");
      const tagsText = profiles.flatMap(p => p.annotations.filter((a: any) => a.status === "observed").flatMap((a: any) => [a.dimensionId, ...a.values])).join(" ");
      const result = await tx.workAnalysisResult.create({ data: { id: `war_${randomUUID()}`, requestId, brandId, platform: row.platform, generation: row.generation, actorId, title, reportMarkdown, reportHtml: analysisReportHtml(title, reportMarkdown), profilesJson: JSON.stringify(profiles), snapshotJson: row.snapshotJson, methodVersionsJson: JSON.stringify(methodVersions), tagsText, idempotencyKey, payloadHash } });
      const events = JSON.parse(row.eventsJson); events.push({ at: result.createdAt.toISOString(), actorId, action: "result_submitted", revisionId: result.id, generation: row.generation });
      await tx.workAnalysisRequest.update({ where: { id: requestId }, data: { status: "completed", revision: { increment: 1 }, eventsJson: JSON.stringify(events) } });
      return { analysisId: requestId, revisionId: result.id, generation: result.generation, platform: result.platform, savedAt: result.createdAt };
    });
  }
  async review(brandId: string, actorId: string, input: AnalysisInput) {
    await this.ready();
    if (!["accepted", "changes_requested"].includes(input.decision)) throw new BadRequestException("审阅结果错误");
    return this.prisma.$transaction(async tx => {
      const row = await this.lock(tx, brandId, analysisText(input.requestId, "委托引用"), input.platform);
      if (row.revision !== input.expectedRevision || row.status !== "completed") throw new ConflictException("请审阅最新完成结果");
      const result = await tx.workAnalysisResult.findFirst({ where: { id: input.revisionId, requestId: row.id, generation: row.generation } });
      if (!result) throw new ConflictException("审阅目标不是当前结果修订");
      const events = JSON.parse(row.eventsJson); events.push({ at: new Date().toISOString(), actorId, action: "review", decision: input.decision, revisionId: result.id, message: String(input.message || "") });
      return this.requestView(await tx.workAnalysisRequest.update({ where: { id: row.id }, data: { revision: { increment: 1 }, eventsJson: JSON.stringify(events) } }));
    });
  }
}
