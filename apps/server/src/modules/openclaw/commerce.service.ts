import { assertPlanningResultTargets } from "@ai-omni/shared/commerce-planning";
import { normalizeCommerceScorecard, commerceScorecardReview } from "@ai-omni/shared/commerce-scorecard";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AssetCategory, Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { calendarDate, calendarFields, calendarText } from "@ai-omni/shared/marketing-calendar";
import { COMMERCE_ACTIONS, COMMERCE_SCHEMA, COMMERCE_STAGES, COMMERCE_VIDEO_DEFAULTS, DETAIL_PAGE_TITLES, type DetailBody } from "@ai-omni/shared/commerce";

import { normalizeCommerceGrowth, commerceGrowthReview } from "@ai-omni/shared/commerce-growth";
import { normalizeCommerceOperatingMap } from "@ai-omni/shared/commerce-operating-map";
import { detailTaskAction, detailTaskView } from "./commerce-detail-tasks";
import { commerceOperatorAction, commerceOperatorCapabilities } from "./commerce-operator-actions";
import { OssStorageService } from "../../storage/oss-storage.service";
import { BrandsService } from "../brands/brands.service";

const digest = (v: unknown) => { const canonical = (x: any): any => Array.isArray(x) ? x.map(canonical) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x; return createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex"); };
const text = (v: unknown, max = 2000) => calendarText(v, max);
const required = (v: unknown, max = 2000) => { const s = text(v, max); if (!s) throw Error("请填写必填内容"); return s; };
const list = (v: any, max: number) => { if (!Array.isArray(v) || v.length > max) throw Error(`列表最多${max}项`); return v; };
const stages = COMMERCE_STAGES.map(s => s.key as string);
export function commerceArea(action: string, p: any): "detail" | "operations" {
  if (action === "commerce_get_workspace") { if (!["detail", "operations"].includes(p.area)) throw new BadRequestException("请选择电商工作区"); return p.area; }
  return action.includes("detail") || action === "commerce_confirm_video" ? "detail" : "operations";
}
export function normalizeDetailBody(v: any): DetailBody {
  calendarFields(v, ["sellingPointReport", "sellingPoints", "pages", "video", "mainImages", "listing"], "详情页内容");
  const sellingPoints = list(v.sellingPoints, 12).map(s => {
    calendarFields(s, ["title", "benefit", "evidence"], "卖点");
    return { title: required(s.title, 200), benefit: text(s.benefit), evidence: required(s.evidence, 4000) };
  });
  const pages = list(v.pages, 20).map(p => {
    calendarFields(p, ["title", "copy", "prompt", "evidence", "mediaRef", "mediaStale"], "详情页");
    return { title: required(p.title, 200), copy: text(p.copy, 6000), prompt: text(p.prompt, 10000), evidence: text(p.evidence, 4000), ...(p.mediaRef ? { mediaRef: p.mediaRef } : {}) };
  });
  if (!pages.length) throw Error("至少保留一页");
  const additions: Pick<DetailBody, "mainImages" | "listing"> = {};
  if (v.mainImages !== undefined) additions.mainImages = list(v.mainImages, 12).map(p => {
    calendarFields(p, ["title", "copy", "prompt", "evidence", "mediaRef", "mediaStale"], "主图");
    return { title: required(p.title, 200), copy: text(p.copy, 6000), prompt: text(p.prompt, 10000), evidence: required(p.evidence, 4000), ...(p.mediaRef ? { mediaRef: p.mediaRef } : {}) };
  });
  if (v.listing !== undefined) {
    const l = v.listing; calendarFields(l, ["title", "keywords", "description", "identityLock", "platformRulesEvidence", "faq"], "商品文案");
    additions.listing = { title: text(l.title, 1000), keywords: list(l.keywords, 60).map(k => required(k, 120)), description: text(l.description, 16000), identityLock: required(l.identityLock, 6000), platformRulesEvidence: text(l.platformRulesEvidence, 6000), faq: list(l.faq, 20).map(f => { calendarFields(f, ["question", "answer", "evidence"], "购买问答"); return { question: required(f.question, 1000), answer: required(f.answer, 4000), evidence: required(f.evidence, 4000) }; }) };
  }
  const video = v.video;
  calendarFields(video, ["concept", "prompt", "appKey", "resolution", "ratio", "duration", "mediaRef", "mediaStale"], "视频");
  if (video.appKey !== COMMERCE_VIDEO_DEFAULTS.appKey || !["480p", "720p", "1080p"].includes(video.resolution) || !["9:16", "16:9", "1:1"].includes(video.ratio) || !Number.isInteger(video.duration) || video.duration < 4 || video.duration > 15) throw Error("视频应用或参数不合法，请核对应用实时参数");
  return { ...additions, sellingPointReport: text(v.sellingPointReport, 30000), sellingPoints, pages, video: { concept: text(video.concept, 10000), prompt: text(video.prompt, 16000), appKey: video.appKey, resolution: video.resolution, ratio: video.ratio, duration: video.duration, ...(video.mediaRef ? { mediaRef: video.mediaRef } : {}) } };
}

@Injectable()
export class CommerceService {
  private executors = new Map<string, any>();
  constructor(private readonly prisma: PrismaService, private readonly brands: BrandsService, private readonly storage: OssStorageService) {}
  private async rows(db: any, brandId: string, kind: string) {
    return db.businessAsset.findMany({ where: { brandId, category: AssetCategory.GENERATED_REPORT, metadataJson: { path: ["kind"], equals: kind } }, orderBy: { createdAt: "desc" }, take: 200 });
  }
  private meta(r: any) { return { ...r.metadataJson, id: r.id, title: r.title, createdAt: r.createdAt }; }
  private create(db: any, brandId: string, actorId: string, kind: string, title: string, data: any, id = "commerce_" + randomUUID()) {
    return db.businessAsset.create({ data: { id, brandId, category: AssetCategory.GENERATED_REPORT, title, metadataJson: { ...data, kind, actorId } as Prisma.InputJsonValue } });
  }
  private async record(db: any, brandId: string, id: any, kind: string) {
    const r = await db.businessAsset.findFirst({ where: { id: required(id, 160), brandId } });
    if (!r || r.metadataJson?.kind !== kind) throw new NotFoundException("本品牌记录不存在");
    return r;
  }
  private async media(db: any, brandId: string, ref: any, kind: "image" | "video") {
    calendarFields(ref, ["table", "recordId"], "产物引用");
    const id = required(ref.recordId, 160);
    const r = ref.table === "MediaAsset" ? await db.mediaAsset.findFirst({ where: { id, brandId } }) : ref.table === "AIControlCenterCreativeMaterial" ? await db.aIControlCenterCreativeMaterial.findFirst({ where: { id, brandId } }) : null;
    if (!r) throw Error("产物引用不属于当前品牌");
    const mime = String(r.mimeType || "").toLowerCase();
    const type = mime ? mime.split("/")[0] : String(r.mediaType || r.materialType || "").toLowerCase();
    if (type !== kind && type !== (kind === "image" ? "图片" : "视频")) throw Error("产物实际类型与此位置不一致");
    if (!r.storageKey) throw Error("请先将产物保存到中台受控存储，再关联详情页");
    return { table: ref.table, recordId: id };
  }
  private revision(p: any, m: any) { if (!Number.isSafeInteger(p.expectedRevision) || p.expectedRevision !== m.revision) throw new ConflictException({ message: "内容已更新，请刷新后保存", currentRevision: m.revision }); }
  async workspace(brandId: string, area: "detail" | "operations") {
    if (area === "detail") {
      const projects = (await this.rows(this.prisma, brandId, "COMMERCE_DETAIL")).map((r: any) => this.meta(r));
      const products = await this.prisma.product.findMany({ where: { brandId }, orderBy: { createdAt: "desc" } });
      const [media, creative] = await Promise.all([
        // Keep ordering and the 200-record window unchanged; only transfer fields
        // used to construct mediaItems. Original metadata/content stays in DB.
        this.prisma.mediaAsset.findMany({ where: { brandId }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, title: true, taskId: true, mimeType: true, storageKey: true } }),
        this.prisma.aIControlCenterCreativeMaterial.findMany({ where: { brandId }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, title: true, mimeType: true, storageKey: true } }),
      ]);
      const mediaItems = [["MediaAsset", media], ["AIControlCenterCreativeMaterial", creative]].flatMap(([table, records]: any) => records.filter((r: any) => r.storageKey).map((r: any) => {
        const prefix = `works/${brandId}/`;
        const href = String(r.storageKey).startsWith(prefix) ? `/api/works/brands/${encodeURIComponent(brandId)}/assets?fileName=${encodeURIComponent(r.storageKey.slice(prefix.length))}` : "";
        return { table, recordId: r.id, title: r.title, taskId: r.taskId || "", mimeType: r.mimeType || "", href };
      }));
      const tasks = await this.prisma.task.findMany({ where: { brandId, taskType: "commerce_detail_ai" }, orderBy: { createdAt: "desc" }, take: 50 });
      const executor = this.executors.get(brandId);
      return { area, projects, products, mediaItems, tasks: tasks.map(detailTaskView), executor: executor && Date.now() - executor.at <= 90000 ? { online: true, capabilities: executor.capabilities } : { online: false, capabilities: [] }, execution: "codex-local", imageModel: "gpt-image-2", videoDefaults: COMMERCE_VIDEO_DEFAULTS };
    }
    const [shops, snapshots, plans, operationDrafts, operationReceipts] = await Promise.all(["COMMERCE_SHOP", "COMMERCE_SHOP_SNAPSHOT", "COMMERCE_OPERATIONS_PLAN", "COMMERCE_OPERATION", "COMMERCE_OPERATION_RECEIPT"].map(k => this.rows(this.prisma, brandId, k)));
    return { area, shops: shops.map((r: any) => this.meta(r)), snapshots: snapshots.map((r: any) => this.meta(r)), plans: plans.map((r: any) => ({ ...this.meta(r), tracking: commerceScorecardReview(this.meta(r), snapshots.map((s: any) => this.meta(s))), growthReview: commerceGrowthReview((r.metadataJson as any).growth, snapshots.map((s: any) => this.meta(s))) })), tasks: (await this.prisma.task.findMany({ where: { brandId, taskType: "commerce_detail_ai", inputJson: { path: ["jobKind"], equals: "operations_replan" } }, orderBy: { createdAt: "desc" }, take: 30 })).map(detailTaskView), executor: this.executors.get(brandId) && Date.now() - this.executors.get(brandId).at <= 90000 ? { online: true, capabilities: this.executors.get(brandId).capabilities } : { online: false, capabilities: [] }, externalWriteEnabled: false, operationDrafts: operationDrafts.map((r: any) => this.meta(r)), operationReceipts: operationReceipts.map((r: any) => this.meta(r)), operationCapabilities: commerceOperatorCapabilities };
  }
  async run(brandId: string, actorId: string, action: string, p: any): Promise<any> {
    try {
      if (!COMMERCE_ACTIONS.includes(action as any)) throw Error("不支持的电商操作");
      calendarFields(p, Object.keys(COMMERCE_SCHEMA.properties), "电商参数");
      if (JSON.stringify(p).length > 1500000) throw Error("本次内容过大，请按周期或业务板块拆分快照");
      const area = commerceArea(action, p);
      if (!await this.prisma.canUseDatabase()) throw new ServiceUnavailableException("电商工作区数据库不可用");
      if (action === "commerce_get_workspace") return this.workspace(brandId, area);
      if (action === "commerce_get_detail_reference") {
        const row = await this.record(this.prisma, brandId, p.projectId, "COMMERCE_DETAIL"), m: any = row.metadataJson;
        this.revision(p, m);
        if (p.referenceSection !== undefined) {
          if (!["main", "detail"].includes(p.referenceSection) || !Number.isInteger(p.referenceIndex)) throw Error("请选择具体的原画面");
          const page = (p.referenceSection === "main" ? m.body.mainImages : m.body.pages)?.[p.referenceIndex];
          if (!page?.mediaRef) throw Error("当前所选画面尚未生成，无法按原图修改");
          const ref = await this.media(this.prisma, brandId, page.mediaRef, "image");
          const asset: any = ref.table === "MediaAsset" ? await this.prisma.mediaAsset.findFirst({ where: { id: ref.recordId, brandId } }) : await this.prisma.aIControlCenterCreativeMaterial.findFirst({ where: { id: ref.recordId, brandId } });
          const prefix = `works/${brandId}/`;
          if (!String(asset.storageKey).startsWith(prefix) || String(asset.storageKey).slice(prefix.length).split(/[\\/]/).some((x: string) => !x || x === "." || x === "..") || /[\\?#]/.test(asset.storageKey)) throw Error("原画面不是本品牌受控作品");
          const file = await this.storage.getObject(asset.storageKey);
          if (!file || !file.contentType.startsWith("image/") || file.buffer.length > 16 * 1024 * 1024) throw Error("原画面不存在或超出参考图限制");
          return { referenceImage: { fileName: String(asset.storageKey).split("/").pop(), contentType: file.contentType, dataBase64: file.buffer.toString("base64") } };
        }
        const url = new URL(String(m.productSnapshot?.imageUrl || ""), "http://localhost");
        const prefix = `/api/brands/${brandId}/product-images/`;
        if (!url.pathname.startsWith(prefix) || url.search || url.hash) throw Error("当前商品缺少本品牌受控产品原图");
        const fileName = decodeURIComponent(url.pathname.slice(prefix.length));
        if (!fileName || /[\\/]/.test(fileName)) throw Error("产品图片引用无效");
        const file = await this.brands.getProductImage(brandId, fileName);
        if (!file.contentType.startsWith("image/") || file.buffer.length > 16 * 1024 * 1024) throw Error("产品原图类型或大小不适合制作");
        return { referenceImage: { fileName, contentType: file.contentType, dataBase64: file.buffer.toString("base64") } };
      }
      if (action === "commerce_report_detail_executor") {
        if (typeof p.executorId !== "string" || !p.executorId.trim() || p.executorId.length > 160 || !Array.isArray(p.capabilities) || !p.capabilities.length || p.capabilities.length > 7 || p.capabilities.some((k: string) => !["operations_replan", "main_copy", "detail_copy", "video_concept", "main_images", "detail_images", "video_generate"].includes(k))) throw Error("执行器能力无效");
        const current = this.executors.get(brandId);
        if (current && Date.now() - current.at <= 90000 && current.executorId !== p.executorId) throw Error("此品牌已有在线执行器，请先停止旧执行器");
        this.executors.set(brandId, { executorId: p.executorId, capabilities: p.capabilities, actorId, at: Date.now() });
        return { result: { online: true } };
      }
      if (action === "commerce_get_detail_history") {
        await this.record(this.prisma, brandId, p.projectId, "COMMERCE_DETAIL");
        return (await this.prisma.businessAsset.findMany({ where: { brandId, category: AssetCategory.GENERATED_REPORT, AND: [{ metadataJson: { path: ["kind"], equals: "COMMERCE_DETAIL_REVISION" } }, { metadataJson: { path: ["projectId"], equals: p.projectId } }] }, orderBy: { createdAt: "desc" } })).map((r: any) => this.meta(r));
      }
      const key = required(p.idempotencyKey, 160); if (key.length < 8) throw Error("幂等键至少8字符");
      const receiptId = "commerce_receipt_" + digest([brandId, key]);
      const commandHash = digest({ action, p });
      const result = await this.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"commerce:" + brandId}))::text`;
        const receipt = await tx.businessAsset.findFirst({ where: { id: receiptId, brandId } });
        if (receipt) { const m: any = receipt.metadataJson; if (m.commandHash !== commandHash) throw new ConflictException("幂等键已用于其他内容"); return { ...m.result, replayed: true }; }
        let out: any;
        if (["commerce_request_plan_task", "commerce_request_detail_task", "commerce_claim_detail_task", "commerce_report_detail_task"].includes(action)) {
          out = await detailTaskAction(tx, brandId, actorId, action, p, this.executors.get(brandId));
        } else if (["commerce_save_operation_draft", "commerce_record_operation_receipt", "commerce_execute_operation"].includes(action)) {
          out = await commerceOperatorAction(tx, brandId, actorId, action, p);
        } else if (action === "commerce_create_detail_project") {
          const product = await tx.product.findFirst({ where: { id: required(p.productId, 160), brandId } });
          if (!product) throw Error("请从本品牌产品资料库选择产品");
          const count = p.pageCount ?? 10; if (!Number.isInteger(count) || count < 1 || count > 20) throw Error("详情页数量须为1—20");
          const body: DetailBody = { sellingPointReport: "", sellingPoints: [], pages: Array.from({ length: count }, (_, i) => ({ title: DETAIL_PAGE_TITLES[i] || `详情第${i + 1}页`, copy: "", prompt: "", evidence: "" })), video: { ...COMMERCE_VIDEO_DEFAULTS, concept: "", prompt: "" } };
          const row = await this.create(tx, brandId, actorId, "COMMERCE_DETAIL", text(p.title, 200) || product.productName + "详情页", { productId: product.id, productSnapshot: JSON.parse(JSON.stringify(product)), instructions: text(p.instructions, 6000), revision: 1, body, videoConfirmation: null, executor: "client" });
          await this.create(tx, brandId, actorId, "COMMERCE_DETAIL_REVISION", row.title, { ...(row.metadataJson as any), kind: "COMMERCE_DETAIL_REVISION", projectId: row.id });
          out = { id: row.id, revision: 1 };
        } else if (action === "commerce_save_detail_revision") {
          const old = await this.record(tx, brandId, p.projectId, "COMMERCE_DETAIL"), m: any = old.metadataJson; this.revision(p, m);
          const body = normalizeDetailBody({ ...(m.body.mainImages !== undefined ? { mainImages: m.body.mainImages } : {}), ...(m.body.listing !== undefined ? { listing: m.body.listing } : {}), ...p.body });
          for (const page of [...body.pages, ...(body.mainImages || [])]) if (page.mediaRef) page.mediaRef = await this.media(tx, brandId, page.mediaRef, "image");
          if (body.video.mediaRef) body.video.mediaRef = await this.media(tx, brandId, body.video.mediaRef, "video");
          const stale = (old: any, current: any, fields: string[]) => !!current.mediaRef && JSON.stringify(old?.mediaRef) === JSON.stringify(current.mediaRef) && (old?.mediaStale || fields.some(k => old?.[k] !== current[k]));
          for (const key of ["mainImages", "pages"] as const) (body[key] || []).forEach((page: any, index: number) => { if (page.mediaRef) page.mediaStale = stale(m.body[key]?.[index], page, ["copy", "prompt"]); });
          if (body.video.mediaRef) body.video.mediaStale = stale(m.body.video, body.video, ["concept", "prompt", "resolution", "ratio", "duration"]);
          const data = { ...m, body, revision: m.revision + 1, videoConfirmation: null };
          await tx.businessAsset.update({ where: { id: old.id }, data: { metadataJson: data } });
          await this.create(tx, brandId, actorId, "COMMERCE_DETAIL_REVISION", old.title, { ...data, projectId: old.id });
          out = { id: old.id, revision: data.revision };
        } else if (action === "commerce_confirm_video") {
          const old = await this.record(tx, brandId, p.projectId, "COMMERCE_DETAIL"), m: any = old.metadataJson; this.revision(p, m);
          if (!m.body.video.concept || !m.body.video.prompt) throw Error("请先保存视频创意与提示词");
          const confirmation = { revision: m.revision, parameters: m.body.video, confirmationText: required(p.confirmationText, 2000), actorId, confirmedAt: new Date().toISOString() };
          await tx.businessAsset.update({ where: { id: old.id }, data: { metadataJson: { ...m, videoConfirmation: confirmation } } });
          await this.create(tx, brandId, actorId, "COMMERCE_VIDEO_CONFIRMATION", old.title, { projectId: old.id, ...confirmation });
          out = { id: old.id, confirmed: true, generated: false };
        } else if (action === "commerce_bind_shop") {
          const brand = await tx.brand.findUnique({ where: { id: brandId } }), member = await tx.brandMember.findFirst({ where: { brandId, userId: actorId, status: "ACTIVE" } });
          if (brand?.ownerUserId !== actorId && member?.role !== "ADMIN") throw new ForbiddenException("仅品牌所有者或管理员可确认店铺归属");
          if (!["taobao", "tmall"].includes(p.platform)) throw Error("请选择淘宝或天猫");
          const externalShopId = required(p.externalShopId, 160);
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"commerce-shop:" + p.platform + ":" + externalShopId}))::text`;
          const id = "commerce_shop_" + digest([p.platform, externalShopId]);
          const existing = await tx.businessAsset.findUnique({ where: { id } });
          if (existing) { if (existing.brandId !== brandId) throw new ForbiddenException("店铺归属需要核对，不能关联到当前品牌"); throw new ConflictException("此店铺已关联，请选择已有店铺"); }
          const row = await this.create(tx, brandId, actorId, "COMMERCE_SHOP", required(p.shopName, 200), { externalShopId, platform: p.platform, mappingEvidence: required(p.mappingEvidence, 4000), confirmedBy: actorId, externalWriteEnabled: false }, id);
          out = { id: row.id };
        } else if (action === "commerce_save_shop_snapshot") {
          const shop = await this.record(tx, brandId, p.shopId, "COMMERCE_SHOP");
          calendarFields(p.period, ["start", "end", "timezone"], "统计周期");
          const start = calendarDate(p.period.start), end = calendarDate(p.period.end);
          const today = new Date(Date.now() + 28800000).toISOString().slice(0, 10);
          if (start > end || end > today || p.period.timezone !== "Asia/Shanghai" || p.currency !== "CNY") throw Error("统计周期、时区或币种不合法");
          if (!["unverified", "provider_reported", "test_data"].includes(p.sourceStatus)) throw Error("请标记数据来源可信状态");
          const sections = list(p.sections, 6).map(s => {
            calendarFields(s, ["key", "summary", "metrics", "evidence", "limitations", "tables"], "经营板块");
            if (!stages.includes(s.key)) throw Error("经营板块无效");
            const metrics = list(s.metrics, 30).map((m: any) => {
              calendarFields(m, ["key", "label", "value", "unit", "definition"], "经营指标");
              if (m.value !== null && (typeof m.value !== "string" || !/^-?\d{1,18}(\.\d{1,8})?$/.test(m.value))) throw Error("指标须为十进制字符串；缺失写null，不能填0");
              return { key: required(m.key, 100), label: required(m.label, 100), value: m.value, unit: required(m.unit, 60), definition: required(m.definition, 1000) };
            });
            if (new Set(metrics.map((m: any) => m.key)).size !== metrics.length) throw Error("同板块指标键不能重复");
            const tables = list(s.tables || [], 6).map((t: any) => {
              calendarFields(t, ["title", "columns", "rows"], "经营明细表");
              const columns = list(t.columns, 12).map((c: any) => { calendarFields(c, ["key", "label"], "明细列"); return { key: required(c.key, 60), label: required(c.label, 120) }; });
              if (!columns.length || new Set(columns.map((c: any) => c.key)).size !== columns.length) throw Error("明细列不能为空或重复");
              const rows = list(t.rows, 200).map((r: any) => { calendarFields(r, columns.map((c: any) => c.key), "明细行"); return Object.fromEntries(columns.map((c: any) => [c.key, text(r[c.key], 1000)])); });
              return { title: required(t.title, 200), columns, rows };
            });
            return { key: s.key, summary: text(s.summary, 10000), metrics, tables, evidence: required(s.evidence, 6000), limitations: text(s.limitations, 6000) };
          });
          if (!sections.length || new Set(sections.map(s => s.key)).size !== sections.length) throw Error("经营板块不能为空或重复");
          const row = await this.create(tx, brandId, actorId, "COMMERCE_SHOP_SNAPSHOT", text(p.title, 200) || shop.title + "经营快照", { shopId: shop.id, period: { start, end, timezone: "Asia/Shanghai" }, currency: "CNY", sourceStatus: p.sourceStatus, toolName: required(p.toolName, 300), sourceEvidence: required(p.sourceEvidence, 12000), sections, contentHash: digest(sections), capturedAt: new Date().toISOString(), skillVersion: required(p.skillVersion, 80) });
          out = { id: row.id };
        } else if (action === "commerce_save_operations_plan") {
          await this.record(tx, brandId, p.shopId, "COMMERCE_SHOP");
          if (p.snapshotId) { const snap = await this.record(tx, brandId, p.snapshotId, "COMMERCE_SHOP_SNAPSHOT"); if ((snap.metadataJson as any).shopId !== p.shopId) throw Error("快照属于其他店铺"); }
          const old = p.planId ? await this.record(tx, brandId, p.planId, "COMMERCE_OPERATIONS_PLAN") : null;
          if (old && (old.metadataJson as any).shopId !== p.shopId) throw Error("计划属于其他店铺");
          const revision = Number((old?.metadataJson as any)?.revision || 0); this.revision(p, { revision });
          const actions = list(p.actions, 50).map(a => {
            calendarFields(a, ["key", "stage", "title", "body", "owner", "dueDate", "successMetric", "status"], "运营动作");
            if (!stages.includes(a.stage) || !["proposed", "in_progress", "review", "closed"].includes(a.status)) throw Error("运营阶段或状态不合法");
            return { ...(a.key ? { key: required(a.key, 160) } : {}), stage: a.stage, title: required(a.title, 300), body: required(a.body, 6000), owner: required(a.owner, 200), dueDate: a.dueDate ? calendarDate(a.dueDate) : "", successMetric: required(a.successMetric, 2000), status: a.status };
          });
          const growth = p.growth !== undefined ? normalizeCommerceGrowth(p.growth, actions, stages) : (old?.metadataJson as any)?.growth;
          if (growth) {
            // Updating a legacy client cannot silently orphan an existing experiment.
            normalizeCommerceGrowth(growth, actions, stages);
            for (const e of growth.experiments) {
              for (const id of [e.baselineSnapshotId, e.resultSnapshotId].filter(Boolean)) {
                const snap = await this.record(tx, brandId, id, "COMMERCE_SHOP_SNAPSHOT");
                if ((snap.metadataJson as any).shopId !== p.shopId) throw Error("复测快照属于其他店铺");
              }
              if (e.projectId) await this.record(tx, brandId, e.projectId, "COMMERCE_DETAIL");
            }
          }
          const scorecard = p.scorecard !== undefined ? normalizeCommerceScorecard(p.scorecard, actions, stages) : (old?.metadataJson as any)?.scorecard;
          if (scorecard) {
            normalizeCommerceScorecard(scorecard, actions, stages);
            const baseline = await this.record(tx, brandId, scorecard.baselineSnapshotId, "COMMERCE_SHOP_SNAPSHOT");
            if ((baseline.metadataJson as any).shopId !== p.shopId) throw Error("目标基线属于其他店铺");
            if ((baseline.metadataJson as any).period.end >= scorecard.start) throw Error("经营目标周期须在基线窗口之后，不能用观察结果倒填目标");
          }
          const operatingMap = p.operatingMap !== undefined ? normalizeCommerceOperatingMap(p.operatingMap, actions, scorecard) : (old?.metadataJson as any)?.operatingMap;
          if (operatingMap) {
            normalizeCommerceOperatingMap(operatingMap, actions, scorecard);
            for (const i of operatingMap.initiatives) {
              if (i.productId && !await tx.product.findFirst({ where: { id: i.productId, brandId } })) throw Error("策略商品不属于本品牌");
              if (i.projectId) { const project = await this.record(tx, brandId, i.projectId, "COMMERCE_DETAIL"); if (i.productId && (project.metadataJson as any).productId !== i.productId) throw Error("策略项目与商品不匹配"); }
            }
          }
          if (p.planTaskId) {
            const task = await tx.task.findFirst({ where: { id: p.planTaskId, brandId, taskType: "commerce_detail_ai", taskStatus: "RUNNING" } }), input: any = task?.inputJson;
            if (!task || input.jobKind !== "operations_replan" || input.projectId !== old?.id || input.revision !== revision || input.lease?.token !== p.leaseToken || input.lease?.executorId !== p.executorId || Date.parse(input.lease?.expiresAt || "") < Date.now() || this.executors.get(brandId)?.actorId !== actorId) throw Error("规划任务租约或源版本已失效");
            assertPlanningResultTargets(operatingMap, scorecard, input.targetScenario);
          }
          const data = { ...(p.planTaskId ? { replanTaskId: p.planTaskId } : {}), ...(operatingMap ? { operatingMap } : {}), ...(scorecard ? { scorecard } : {}), ...(growth ? { growth } : {}), shopId: p.shopId, snapshotId: text(p.snapshotId, 160), report: required(p.report, 60000), actions, revision: revision + 1, skillVersion: required(p.skillVersion, 80), externalExecuted: false };
          const title = required(p.title, 200);
          const row = old ? await tx.businessAsset.update({ where: { id: old.id }, data: { title, metadataJson: { ...data, kind: "COMMERCE_OPERATIONS_PLAN", actorId } } }) : await this.create(tx, brandId, actorId, "COMMERCE_OPERATIONS_PLAN", title, data);
          await this.create(tx, brandId, actorId, "COMMERCE_OPERATIONS_PLAN_REVISION", title, { ...data, planId: row.id }); out = { id: row.id, revision: data.revision };
        }
        if (!out) throw Error("操作未完成");
        if (!(action === "commerce_claim_detail_task" && !out.job) && !(action === "commerce_report_detail_task" && p.taskState === "progress")) await this.create(tx, brandId, actorId, "COMMERCE_RECEIPT", "电商操作回执", { commandHash, result: out }, receiptId);
        return out;
      }, { timeout: 30000 });
      return ["commerce_claim_detail_task", "commerce_report_detail_task"].includes(action) ? { result } : { result, ...await this.workspace(brandId, area) };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof ConflictException || e instanceof ForbiddenException || e instanceof NotFoundException || e instanceof ServiceUnavailableException) throw e;
      throw new BadRequestException(e instanceof Error ? e.message : "电商操作失败");
    }
  }
}
