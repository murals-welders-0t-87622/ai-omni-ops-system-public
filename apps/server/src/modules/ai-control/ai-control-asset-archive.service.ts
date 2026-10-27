import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { basename } from "node:path";
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";
import { OssStorageService } from "../../storage/oss-storage.service";
import { LocalAsrService } from "../third-party-platforms/local-asr.service";
import { LocalOcrService } from "../third-party-platforms/local-ocr.service";
import { WorkflowCoreService } from "../workflow-core/workflow-core.service";
import { normalizeAIControlCenterWorkspaceScope } from "../openclaw/openclaw-workspace-scope";

import { WorkAnalysisService } from "../openclaw/work-analysis.service";
import { MaterialIndexStore } from "./material-index.store";
import { MaterialQuery, MaterialIndex, materialRef, validateMaterialIndex, mediaType, tagCandidates, cleanCandidate } from "./material-index.contract";
import { probeMaterialBuffer } from "./material-probe";

type ArchiveSource = "creative_material" | "video_work" | "media_asset" | "business_asset" | "workflow_artifact" | "collected_work";

type ArchiveRow = {
  id: string;
  source: ArchiveSource;
  kind: string;
  title: string;
  description: string | null;
  textContent: string | null;
  brandId: string;
  workspaceScope: string | null;
  taskId: string | null;
  taskGoal: string | null;
  assetUrl: string | null;
  storageKey: string | null;
  localPath: string | null;
  mimeType: string | null;
  sourceKind: string | null;
  materialTags: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  evidenceTable: string;
  evidenceRecordId: string;
  metadataJson?: any;
  collection?: any;
};

type ArchiveItem = {
  id: string;
  source: ArchiveSource;
  kind: string;
  materialType?: string;
  title: string;
  description?: string;
  textContent?: string;
  brandId: string;
  workspaceScope?: string;
  taskId?: string;
  taskGoal?: string;
  assetUrl?: string;
  storageKey?: string;
  localPath?: string;
  mimeType?: string;
  sourceKind?: string;
  materialTags?: string[];
  tagCandidates?: any[];
  legacyTags?: string[];
  mediaVerification?: any;
  collection?: any;
  index?: MaterialIndex;
  indexRevision?: number;
  libraryState?: string;
  availability?: string;
  recommendation?: string;
  products?: { id: string; name: string }[];
  relations?: any[];
  versionState?: any;
  origin?: any;
  createdAt?: string;
  updatedAt?: string;
  evidence: {
    table: string;
    recordId: string;
  };
  links: {
    task?: string;
    source?: string;
  };
};

type ArchiveRegisterSource = "creative_material" | "video_work";
type ArchiveOriginKind = "user_upload" | "user_folder" | "third_party_generated" | "workbuddy_generated" | "manual_external";

type ArchiveRegistrationRequest = {
  brandId?: string;
  source?: ArchiveRegisterSource;
  workspaceScope?: string;
  createdByUserId?: string;
  title?: string;
  description?: string;
  materialType?: string;
  materialTags?: string[] | string;
  assetUrl?: string;
  fileName?: string;
  mimeType?: string;
  storageKey?: string;
  textContent?: string;
  originKind?: ArchiveOriginKind;
  folderPath?: string;
  folderMode?: "browser_directory" | "";
  folderFileCount?: number;
  folderSampleFiles?: string[];
  sourceKind?: string;
  upload?: {
    fileName?: string;
    contentType?: string;
    dataBase64?: string;
  };
  coverImageUrl?: string;
  scriptContent?: string;
  taskId?: string;
  stageRunId?: string;
  artifactKind?: string;
  idempotencyKey?: string;
  confirmNoGeneration?: boolean;
};

type MaterialReuseReferenceInput = {
  evidenceTable?: string;
  recordId?: string;
  source?: ArchiveSource;
  id?: string;
  title?: string;
  usageRole?: string;
  selectedReason?: string;
};

type MaterialReuseEvidenceRequest = {
  brandId?: string;
  taskId?: string;
  stageRunId?: string;
  actionName?: string;
  actionLabel?: string;
  subjectKind?: "expert" | "skill";
  subjectId?: string;
  invocationId?: string;
  parentInvocationId?: string;
  attemptNo?: number;
  usageNote?: string;
  materialRefs?: MaterialReuseReferenceInput[];
  idempotencyKey?: string;
  confirmEvidenceOnly?: boolean;
};

type ArchiveUploadedFile = {
  path?: string;
  originalname?: string;
  mimetype?: string;
  size?: number;
};

type ArchivePreflightCheck = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  message: string;
};

const ARCHIVE_MATERIAL_TYPES = ["视频", "图片", "音频", "文字"] as const;
const ARCHIVE_MATERIAL_SOURCES = ["抖音/视频号", "小红书", "公众号", "用户上传"] as const;
type ArchiveMaterialSource = typeof ARCHIVE_MATERIAL_SOURCES[number];

@Injectable()
export class AiControlAssetArchiveService {
  private readonly appConfigService = new AppConfigService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowCore: WorkflowCoreService,
    private readonly ossStorage: OssStorageService,
    private readonly localAsrService: LocalAsrService,
    private readonly localOcrService: LocalOcrService,
  ) {}

  private async loadArchiveItems(brandId: string): Promise<ArchiveItem[]> {
    if (!await this.prisma.canUseDatabase()) throw new ServiceUnavailableException("数据库不可用，无法确认素材覆盖范围");
    // Filter before pagination, never silently limit each source before exact-ID/product search.
    const [creative, videos, media, business, artifacts, revisions, products] = await Promise.all([
      this.listCreativeMaterials(brandId, 2147483647), this.listVideoWorks(brandId, 2147483647), this.listMediaAssets(brandId, 2147483647),
      this.listBusinessAssets(brandId, 2147483647), this.listWorkflowArtifacts(brandId, 2147483647),
      new MaterialIndexStore(this.prisma).list(brandId), this.prisma.product.findMany({ where: { brandId }, select: { id: true, productName: true } }),
    ]);
    const indexes = new Map(revisions.map(r => [`${r.evidenceTable}:${r.recordId}`, r]));
    const rows = [...creative, ...videos, ...media, ...business, ...artifacts];
    const rowsByRef = new Map(rows.map(r => [`${r.evidenceTable}:${r.evidenceRecordId}`, r]));
    const importedFrom = new Map(revisions.filter(r => r.data.importedId).map(r => [r.data.importedId!, r]));
    const result = rows.map(row => {
      const item = this.toArchiveItem(row), revision = indexes.get(`${item.evidence.table}:${item.evidence.recordId}`), index = revision?.data || validateMaterialIndex({});
      const inferredProducts = [row.metadataJson?.productId, ...(Array.isArray(row.metadataJson?.productIds) ? row.metadataJson.productIds : [])].filter(v => typeof v === "string");
      const origin = importedFrom.get(row.id), originRow = origin ? rowsByRef.get(`${origin.evidenceTable}:${origin.recordId}`) : null;
      const productIds = index?.productIds.length ? index.productIds : origin?.data.productIds.length ? origin.data.productIds : inferredProducts;
      if (origin && originRow) { item.origin = { table: origin.evidenceTable, recordId: origin.recordId, title: originRow.title }; item.collection = originRow.collection; }
      item.index = index; item.indexRevision = revision?.revision || 0;
      item.products = products.filter(p => productIds.includes(p.id)).map(p => ({ id: p.id, name: p.productName }));
      item.libraryState = item.source === "collected_work" ? (index?.importedId ? "in_library" : "collected") : "in_library";
      item.availability = index?.availability || "unverified"; item.recommendation = index?.recommendation || "unverified";
      item.materialTags = [...new Set([...(index?.confirmedTags || []), ...(item.legacyTags || []).map(cleanCandidate).filter(Boolean)])];
      if (index?.probe) { item.materialType = index.probe.materialType; item.mimeType = index.probe.mimeType; item.mediaVerification = { ...index.probe, decoded: true, conflict: item.mediaVerification?.materialType !== index.probe.materialType }; }
      else if (index?.declaredType) { item.materialType = index.declaredType; item.mediaVerification = { ...item.mediaVerification, basis: "manual_correction", evidence: index.typeEvidence, decoded: false }; }
      return item;
    });
    const key = (i: ArchiveItem) => `${i.evidence.table}:${i.evidence.recordId}`;
    const replacements = new Map<string, any[]>();
    for (const i of result) if (i.index?.supersedes) { const k = `${i.index.supersedes.table}:${i.index.supersedes.recordId}`; replacements.set(k, [...(replacements.get(k) || []), { ...i.evidence, title: i.title }]); }
    const byRef = new Map(result.map(i => [key(i), i]));
    const incoming = new Map<string, any[]>();
    for (const item of result) for (const relation of item.index?.relations || []) {
      const k = `${relation.table}:${relation.recordId}`;
      incoming.set(k, [...(incoming.get(k) || []), { ...relation, table: item.evidence.table, recordId: item.id, title: item.title, direction: "incoming" }]);
    }
    for (const item of result) {
      if (replacements.has(key(item))) item.recommendation = "not_recommended";
      item.relations = [...(item.index?.relations || []).map((r: any) => ({ ...r, title: byRef.get(`${r.table}:${r.recordId}`)?.title || "", direction: "outgoing" })), ...(incoming.get(key(item)) || []), ...(item.origin ? [{ ...item.origin, type: "derived_from", direction: "outgoing", evidence: "explicit_single_item_library_import" }] : [])];
      item.versionState = { supersedes: item.index?.supersedes ? { ...item.index.supersedes, title: byRef.get(`${item.index.supersedes.table}:${item.index.supersedes.recordId}`)?.title || "" } : null, supersededBy: replacements.get(key(item)) || [] };
    }
    // Preserve distinct evidence records, including the collected original and imported copy.
    return result.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")) || key(a).localeCompare(key(b)));
  }

  async getArchive(params: MaterialQuery) {
    const brandId = this.normalizeBrandId(params.brandId), limit = this.clampInt(params.limit, 1, 200, 80);
    const offset = params.offset === undefined ? 0 : Number(params.offset);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new BadRequestException("分页起点不正确");
    const all = await this.loadArchiveItems(brandId), search = this.normalizeArchiveSearch(params);
    const matches = this.filterArchiveItems(all, search).filter(item => {
      const idx = item.index;
      if (params.productId && !item.products?.some(p => p.id === params.productId)) return false;
      if (params.sku && idx?.sku !== params.sku) return false;
      for (const k of ["libraryState", "availability", "recommendation"] as const) if (params[k] && item[k] !== params[k]) return false;
      if (params.role && idx?.role !== params.role) return false;
      const clipKeys = ["scene", "action", "framing", "surface"] as const;
      if (clipKeys.some(k => params[k]) && !idx?.clips.some((clip: any) => clipKeys.every(k => !params[k] || clip[k].toLowerCase().includes(params[k]!.toLowerCase())))) return false;
      const used = !!item.relations?.some(r => r.type === "used_in" || (r.type === "derived_from" && r.direction === "incoming"));
      if (params.usage && (params.usage === "used") !== used) return false;
      return true;
    });
    // Candidate tags do not participate in search or ordering. Derive them only
    // for the returned page, after all sources and exact filters are applied.
    const items = matches.slice(offset, offset + limit).map(item => ({
      ...item,
      tagCandidates: [
        ...(item.legacyTags || []).map(cleanCandidate).filter(Boolean).map(value => ({ value, source: "legacy_unspecified", status: "unverified", confidence: null })),
        ...tagCandidates(item.title, item.description || "", item.textContent || ""),
      ],
    }));
    return { ok: true, readonly: true, brandId, total: matches.length, returned: items.length, offset, limit,
      coverage: "all_current_brand_archive_and_collected_records", summary: this.buildSummary(matches), items, sources: this.sourceLabels(),
      filters: { ...this.buildArchiveFilterMetadata(all, search), applied: { ...params, ...search, brandId: undefined } },
      products: await this.prisma.product.findMany({ where: { brandId }, select: { id: true, productName: true } }),
      productCoverage: params.productId ? { indexedScenes: [...new Set(matches.flatMap(i => i.index?.clips.map((c: any) => c.scene).filter(Boolean) || []))], indexedClips: matches.flatMap(i => (i.index?.clips || []).map((c: any) => ({ ...c, material: i.evidence, used: i.relations?.some(r => r.clipId === c.id && r.type === "used_in") || false }))), boundary: "仅已登记片段；未返回不代表不存在，场景覆盖以人工索引为准" } : undefined,
      boundary: "联查采集记录不等于已入库、可剪辑或已获商用授权；未知保持未知，不自动入库。" };
  }

  async manageMaterial(brandId: string, actorId: string, operation: string, payload: any) {
    const ref = materialRef(payload?.ref), all = await this.loadArchiveItems(brandId);
    const item = all.find(i => i.evidence.table === ref.table && i.evidence.recordId === ref.recordId);
    if (!item) throw new NotFoundException("素材不存在或不属于当前品牌");
    const store = new MaterialIndexStore(this.prisma);
    if (operation === "import_collected_material") {
      if (item.source !== "collected_work") throw new BadRequestException("请选择采集原片");
      if (item.index?.importedId) return { ok: true, importedId: item.index.importedId, reused: true };
      const id = `collected_${createHash("sha256").update(`${brandId}:${item.id}`).digest("hex").slice(0, 32)}`;
      // Deterministic ID + transaction-safe SQL; source remains untouched. Copy reference, never download or generate.
      const result = await store.append(brandId, actorId, ref, item.indexRevision || 0, async (previous, tx) => {
      await tx.$executeRaw`INSERT INTO "AIControlCenterCreativeMaterial" ("id","brandId","workspaceScope","createdByUserId","sourceKind","title","description","materialType","materialTags","fileUrl","mimeType","textContent","createdAt","updatedAt") VALUES (${id},${brandId},${item.workspaceScope || "douyin"},${actorId},'ai_control_center_upload',${item.title},${`采集来源：${item.id}；原作：${item.collection?.originalWorkId || ""}`},${item.materialType || "素材"},'[]',${item.assetUrl || null},${item.mimeType || null},${item.textContent || null},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING`;
        return { ...(previous || validateMaterialIndex({})), importedId: id };
      }, operation);
      return { ok: true, importedId: id, ...result, copyMode: "reference_only_not_media_verified" };
    }
    if (operation === "probe_material_file") {
      if (!item.storageKey || !["works", "brands", "materials"].some(p => item.storageKey!.startsWith(`${p}/${brandId}/`)) || /\\|(?:^|\/)\.\.(?:\/|$)/.test(item.storageKey)) throw new BadRequestException("仅核验本品牌站内缓存文件；外链或本机文件需先上传，不会自动抓取");
      const object = await this.ossStorage.getObject(item.storageKey);
      if (!object?.buffer?.length) throw new BadRequestException("站内文件不可读取，类型及可用性仍待核验");
      const probe = await probeMaterialBuffer(object.buffer);
      return { ok: true, ...await store.append(brandId, actorId, ref, payload.expectedRevision, previous => ({ ...(previous || validateMaterialIndex({})), probe }), operation) };
    }
    if (operation !== "update_material_index") throw new BadRequestException("不支持的素材动作");
    const index = validateMaterialIndex(payload.index);
    if (index.clips.length && !["视频", "音频"].includes(item.materialType || "")) throw new BadRequestException("时间窗只适用于视频或音频素材");
    const products = await this.prisma.product.count({ where: { brandId, id: { in: index.productIds } } });
    if (products !== index.productIds.length) throw new BadRequestException("关联产品不属于当前品牌");
    for (const r of [...index.relations, ...(index.supersedes ? [index.supersedes] : [])]) {
      if (r.table === ref.table && r.recordId === ref.recordId) throw new BadRequestException("素材不能关联自身");
      if (!all.some(i => i.evidence.table === r.table && i.id === r.recordId)) throw new BadRequestException("关联素材不属于当前品牌或不存在");
    }
    if (index.supersedes) {
      const seen = new Set([`${ref.table}:${ref.recordId}`]); let r: any = index.supersedes;
      while (r) { const k = `${r.table}:${r.recordId}`; if (seen.has(k)) throw new BadRequestException("版本关系不能成环"); seen.add(k); r = all.find(i => i.evidence.table === r.table && i.id === r.recordId)?.index?.supersedes; }
    }
    if (item.index?.probe?.durationMs && index.clips.some((c: any) => c.endMs > item.index!.probe!.durationMs!)) throw new BadRequestException("片段超出已核验的文件时长");
    const result = await store.append(brandId, actorId, ref, payload.expectedRevision, previous => ({ ...index, ...(previous?.probe ? { probe: previous.probe } : {}), ...(previous?.importedId ? { importedId: previous.importedId } : {}) }), operation);
    return { ok: true, ...result };
  }

  async fetchArchiveStoredObject(storageKey?: string | null) {
    const normalizedStorageKey = String(storageKey || "").trim();
    if (!normalizedStorageKey) {
      throw new BadRequestException("storageKey 必填");
    }
    const storedObject = await this.ossStorage.getObject(normalizedStorageKey);
    if (!storedObject?.buffer?.length) {
      throw new ServiceUnavailableException("站内缓存文件不存在或已失效");
    }
    return {
      buffer: storedObject.buffer,
      contentType: storedObject.contentType || "application/octet-stream",
      fileName: basename(normalizedStorageKey) || "archive-file",
    };
  }

  async preflightArchiveRegistration(payload: ArchiveRegistrationRequest) {
    const brandId = this.normalizeBrandId(payload.brandId);
    const checks: ArchivePreflightCheck[] = [];
    const source = this.safeRegisterSource(payload.source);
    const title = this.optionalText(payload.title, 160);
    const assetUrl = String(payload.assetUrl || "").trim();
    const storageKey = this.optionalText(payload.storageKey, 1024);
    const textContent = this.optionalText(payload.textContent, 50_000);
    const originKind = this.normalizeOriginKind(payload.originKind);
    const folderPath = this.optionalText(payload.folderPath, 2000);
    const folderMode = this.optionalText(payload.folderMode, 64);
    const folderFileCount = this.clampInt(String(payload.folderFileCount ?? 0), 0, 100_000, 0);
    const upload = this.normalizeUploadPayload(payload.upload);
    const taskId = this.optionalText(payload.taskId, 64);
    const resource = this.classifyResourceEvidence({ assetUrl, storageKey, textContent, folderPath, folderMode, folderFileCount, hasUpload: Boolean(upload) });

    checks.push(source
      ? this.check("source", "档案类型", "pass", source === "video_work" ? "视频作品" : "创作素材")
      : this.check("source", "档案类型", "block", "source 必须是 creative_material 或 video_work"));
    checks.push(this.check("origin", "素材来源", "pass", this.originLabel(originKind)));
    checks.push(payload?.confirmNoGeneration === true
      ? this.check("no_generation", "生成边界", "pass", "只登记已有素材/作品")
      : this.check("no_generation", "生成边界", "block", "必须确认不触发第三方生成"));
    checks.push(title
      ? this.check("title", "标题", "pass", "已填写")
      : this.check("title", "标题", "block", "请填写档案标题"));

    if (source === "video_work") {
      checks.push(assetUrl
        ? this.check("content", "作品地址", "pass", "已提供视频地址")
        : this.check("content", "作品地址", "block", "视频作品必须提供视频地址"));
    } else if (source === "creative_material") {
      checks.push(assetUrl || textContent || folderPath || upload
        ? this.check("content", "素材内容", "pass", upload ? "已选择上传文件" : folderPath ? "已选择素材文件夹" : assetUrl ? "已提供文件地址" : "已提供文本内容")
        : this.check("content", "素材内容", "block", "创作素材需提供文件地址、文本内容、上传文件或素材文件夹"));
    }

    checks.push(this.check("resource_evidence", "资源证据", resource.status, resource.message));

    const taskCheck = await this.preflightTaskLink({ brandId, taskId });
    checks.push(taskCheck);

    const status = checks.some((item) => item.status === "block")
      ? "blocked"
      : checks.some((item) => item.status === "warning")
        ? "warning"
        : "ready";

    return {
      ok: true,
      readonly: true,
      generated: false,
      brandId,
      source: source || null,
      originKind,
      status,
      ready: status !== "blocked",
      checks,
      resource,
      boundary: "登记前预检只读执行，不写数据库、不下载资源、不触发第三方生成。",
    };
  }

  async registerArchiveItem(payload: ArchiveRegistrationRequest) {
    if (payload?.confirmNoGeneration !== true) {
      throw new BadRequestException("必须确认本次只登记已有素材/作品，不触发第三方生成");
    }
    if (!(await this.prisma.canUseDatabase())) {
      throw new ServiceUnavailableException("数据库不可用，不能登记素材或作品档案");
    }

    const brandId = this.normalizeBrandId(payload.brandId);
    const source = this.normalizeRegisterSource(payload.source);
    const workspaceScope = normalizeAIControlCenterWorkspaceScope(payload.workspaceScope);
    const createdByUserId = this.optionalText(payload.createdByUserId, 128) || "ai-control-archive-operator";
    const originKind = this.normalizeOriginKind(payload.originKind);
    const sourceKind = this.normalizeMaterialSourceKind(payload.sourceKind, originKind);
    const title = this.requiredText(payload.title, "请填写档案标题", 160);
    const description = this.optionalText(payload.description, 10_000);
    const assetUrl = this.optionalUrlOrPath(payload.assetUrl, "文件地址");
    let storageKey = this.optionalText(payload.storageKey, 1024);
    let fileUrl = assetUrl;
    let mimeType = this.optionalText(payload.mimeType, 160);
    let fileName = this.optionalText(payload.fileName, 260);
    const textContent = this.optionalText(payload.textContent, 50_000);
    const folderPath = this.optionalText(payload.folderPath, 2000);
    const folderMode = this.optionalText(payload.folderMode, 64);
    const folderFileCount = this.clampInt(String(payload.folderFileCount ?? 0), 0, 100_000, 0);
    const folderSampleFiles = Array.isArray(payload.folderSampleFiles) ? payload.folderSampleFiles.map((item) => this.optionalText(item, 500)).filter(Boolean).slice(0, 10) : [];
    const id = this.makeRecordId(source, payload.idempotencyKey);
    const upload = this.normalizeUploadPayload(payload.upload);
    let derivedTags = this.serializeTags(payload.materialTags, originKind);
    let derivedDescription = description;

    if (source === "creative_material" && upload) {
      const uploaded = await this.persistUploadedMaterialFile({
        brandId,
        title,
        materialType: payload.materialType || mimeType || fileName,
        sourceKind,
        upload,
      });
      fileUrl = uploaded.fileUrl;
      storageKey = uploaded.storageKey;
      fileName = fileName || uploaded.fileName;
      mimeType = mimeType || uploaded.mimeType;
      const enrichment = await this.deriveUploadTags({ upload, originKind, materialType: payload.materialType || "", fileName, mimeType });
      derivedTags = this.serializeTags([...(this.parseTags(derivedTags)), ...enrichment.tags], originKind);
      derivedDescription = [description, enrichment.note].filter(Boolean).join("\n");
    }
    if (source === "creative_material" && !fileUrl && !textContent && !folderPath) {
      throw new BadRequestException("登记创作素材时，请至少提供文件地址、文本内容、上传文件或素材文件夹");
    }
    if (source === "video_work" && !fileUrl) {
      throw new BadRequestException("登记视频作品时，请提供视频地址");
    }

    const record = source === "video_work"
      ? await this.upsertVideoWork({
          id,
          brandId,
          workspaceScope,
          createdByUserId,
          title,
          description,
          videoUrl: fileUrl,
          coverImageUrl: this.optionalUrlOrPath(payload.coverImageUrl, "封面地址"),
          scriptContent: this.optionalText(payload.scriptContent, 50_000),
        })
      : await this.upsertCreativeMaterial({
          id,
          brandId,
          workspaceScope,
          createdByUserId,
          sourceKind,
          title,
          description: this.decorateDescription(derivedDescription, { originKind, folderPath, folderMode, folderFileCount, folderSampleFiles }),
          materialType: this.requiredText(payload.materialType || this.inferMaterialType(mimeType, fileName, textContent, folderPath), "请填写素材类型", 80),
          materialTags: derivedTags,
          fileUrl,
          fileName,
          mimeType,
          textContent: folderPath ? [`素材文件夹：${folderPath}`, folderFileCount ? `文件数量：${folderFileCount}` : "", ...folderSampleFiles.map((item) => `样例：${item}`)].filter(Boolean).join("\n") : textContent,
          storageKey,
        });

    const artifact = payload.taskId
      ? await this.registerWorkflowArtifact({
          brandId,
          taskId: this.requiredText(payload.taskId, "任务 ID 不能为空", 64),
          stageRunId: this.optionalText(payload.stageRunId, 128),
          source,
          recordId: record.id,
          title,
          description,
          assetUrl: fileUrl,
          storageKey,
          mimeType,
          artifactKind: this.optionalText(payload.artifactKind, 128) || (source === "video_work" ? "video_work" : "creative_material"),
          idempotencyKey: payload.idempotencyKey,
        })
      : null;

    const archive = await this.getArchive({ brandId, limit: "120" });
    const item = archive.items.find((entry) => entry.evidence.recordId === record.id && entry.source === source) ?? null;

    return {
      ok: true,
      generated: false,
      brandId,
      source,
      record,
      artifact,
      item,
      boundary: "只登记已有素材或作品，不触发第三方生成，不写 WorkBuddy 真源。",
    };
  }

  async registerArchiveItemFromFile(payload: ArchiveRegistrationRequest, file: ArchiveUploadedFile) {
    if (payload?.confirmNoGeneration !== true) {
      throw new BadRequestException("必须确认本次只登记已有素材/作品，不触发第三方生成");
    }
    if (!(await this.prisma.canUseDatabase())) {
      throw new ServiceUnavailableException("数据库不可用，不能登记素材或作品档案");
    }
    const filePath = this.requiredText(file?.path, "上传文件为空", 2000);
    const originalName = this.optionalText(file?.originalname, 260) || this.optionalText(payload.fileName, 260) || `ai-control-material-${Date.now()}`;
    const uploadedMimeType = this.optionalText(file?.mimetype, 160) || this.optionalText(payload.mimeType, 160) || "application/octet-stream";

    const brandId = this.normalizeBrandId(payload.brandId);
    const source = this.normalizeRegisterSource(payload.source);
    const workspaceScope = normalizeAIControlCenterWorkspaceScope(payload.workspaceScope);
    const createdByUserId = this.optionalText(payload.createdByUserId, 128) || "ai-control-archive-operator";
    const originKind = this.normalizeOriginKind(payload.originKind);
    const sourceKind = this.normalizeMaterialSourceKind(payload.sourceKind, originKind);
    const title = this.requiredText(payload.title || originalName, "请填写档案标题", 160);
    const description = this.optionalText(payload.description, 10_000);
    const textContent = this.optionalText(payload.textContent, 50_000);
    const folderPath = this.optionalText(payload.folderPath, 2000);
    const folderMode = this.optionalText(payload.folderMode, 64);
    const folderFileCount = this.clampInt(String(payload.folderFileCount ?? 0), 0, 100_000, 0);
    const folderSampleFiles = this.normalizeStringList(payload.folderSampleFiles, 500, 10);
    const materialType = this.requiredText(payload.materialType || this.inferMaterialType(uploadedMimeType, originalName, textContent, folderPath), "请填写素材类型", 80);
    const id = this.makeRecordId(source, payload.idempotencyKey);

    const uploaded = await this.persistUploadedMaterialDiskFile({
      brandId,
      title,
      materialType,
      sourceKind,
      filePath,
      fileName: originalName,
      mimeType: uploadedMimeType,
    });

    const enrichment = source === "creative_material"
      ? await this.deriveUploadFileTags({
          filePath,
          originKind,
          materialType,
          fileName: originalName,
          mimeType: uploadedMimeType,
        })
      : { tags: [], note: "" };
    const derivedTags = this.serializeTags([...(this.parseTags(this.serializeTags(payload.materialTags, originKind))), ...enrichment.tags], originKind);
    const derivedDescription = [description, enrichment.note].filter(Boolean).join("\n");

    const record = source === "video_work"
      ? await this.upsertVideoWork({
          id,
          brandId,
          workspaceScope,
          createdByUserId,
          title,
          description: derivedDescription || description,
          videoUrl: uploaded.fileUrl,
          coverImageUrl: this.optionalUrlOrPath(payload.coverImageUrl, "封面地址"),
          scriptContent: this.optionalText(payload.scriptContent, 50_000),
        })
      : await this.upsertCreativeMaterial({
          id,
          brandId,
          workspaceScope,
          createdByUserId,
          sourceKind,
          title,
          description: this.decorateDescription(derivedDescription, { originKind, folderPath, folderMode, folderFileCount, folderSampleFiles }),
          materialType,
          materialTags: derivedTags,
          fileUrl: uploaded.fileUrl,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          textContent,
          storageKey: uploaded.storageKey,
        });

    const artifact = payload.taskId
      ? await this.registerWorkflowArtifact({
          brandId,
          taskId: this.requiredText(payload.taskId, "任务 ID 不能为空", 64),
          stageRunId: this.optionalText(payload.stageRunId, 128),
          source,
          recordId: record.id,
          title,
          description,
          assetUrl: uploaded.fileUrl,
          storageKey: uploaded.storageKey,
          mimeType: uploaded.mimeType,
          artifactKind: this.optionalText(payload.artifactKind, 128) || (source === "video_work" ? "video_work" : "creative_material"),
          idempotencyKey: payload.idempotencyKey,
        })
      : null;

    const archive = await this.getArchive({ brandId, limit: "120" });
    const item = archive.items.find((entry) => entry.evidence.recordId === record.id && entry.source === source) ?? null;

    return {
      ok: true,
      generated: false,
      uploadMode: "multipart",
      brandId,
      source,
      record,
      artifact,
      item,
      boundary: "只登记已有素材或作品，不触发第三方生成，不写 WorkBuddy 真源。",
    };
  }

  async recordMaterialReuseEvidence(payload: MaterialReuseEvidenceRequest) {
    if (payload?.confirmEvidenceOnly !== true) {
      throw new BadRequestException("必须确认本次只记录素材复用证据，不生成内容、不发布、不写 WorkBuddy 真源");
    }
    if (!(await this.prisma.canUseDatabase())) {
      throw new ServiceUnavailableException("数据库不可用，不能记录素材复用证据");
    }

    const brandId = this.normalizeBrandId(payload.brandId);
    const taskId = this.requiredText(payload.taskId, "任务 ID 不能为空", 64);
    const stageRunId = this.requiredText(payload.stageRunId, "阶段 ID 不能为空", 128);
    const actionName = this.requiredText(payload.actionName, "动作名称不能为空", 160);
    const materialRefs = this.normalizeMaterialReuseRefs(payload.materialRefs);
    const task = await this.requireTaskStageBinding({ brandId, taskId, stageRunId });
    const materials = await this.resolveMaterialReuseItems(brandId, materialRefs);
    const subjectKind = payload.subjectKind === "expert" ? "expert" : "skill";
    const subjectId = this.optionalText(payload.subjectId, 128) || "workbuddy-agent-material-reuse";
    const attemptNo = this.clampInt(String(payload.attemptNo ?? 1), 1, 1000, 1);
    const invocationId = this.optionalText(payload.invocationId, 128)
      || `material_reuse_${this.shortHash([taskId, stageRunId, actionName, JSON.stringify(materialRefs)].join(":"))}`;
    const commandId = `material_reuse_${this.shortHash(payload.idempotencyKey || invocationId)}`;
    const usageNote = this.optionalText(payload.usageNote, 2000);
    const actionLabel = this.optionalText(payload.actionLabel, 160);

    const event = await this.workflowCore.recordExecutionEvent({
      command_id: commandId,
      task_id: taskId,
      stage_run_id: stageRunId,
      invocation_id: invocationId,
      parent_invocation_id: this.optionalText(payload.parentInvocationId, 128) || undefined,
      subject_kind: subjectKind,
      subject_id: subjectId,
      event_type: "succeeded",
      attempt_no: attemptNo,
      source_level: "workbuddy_tool_reported",
      evidence_refs: [
        {
          kind: "ai_control_center_material_reuse",
          id: `${taskId}/${stageRunId}/${actionName}`,
          meta: {
            brand_id: brandId,
            task_id: taskId,
            stage_run_id: stageRunId,
            stage_key: task.stageKey,
            action_name: actionName,
            action_label: actionLabel || null,
            usage_note: usageNote || null,
            material_count: materials.length,
            evidence_only: true,
          },
        },
        ...materials.map((item) => ({
          kind: "asset_archive_item",
          id: `${item.evidence.table}/${item.evidence.recordId}`,
          ...(item.links.source ? { href: item.links.source } : {}),
          meta: {
            archive_source: item.source,
            archive_id: item.id,
            title: item.title,
            material_type: item.materialType || item.kind,
            material_tags: item.materialTags || [],
            storage_key: item.storageKey || null,
            local_path: item.localPath || null,
            mime_type: item.mimeType || null,
            task_id: item.taskId || null,
            usage_role: materialRefs.find((ref) => this.isSameMaterialRef(ref, item))?.usageRole || null,
            selected_reason: materialRefs.find((ref) => this.isSameMaterialRef(ref, item))?.selectedReason || null,
          },
        })),
      ],
    });

    return {
      ok: true,
      generated: false,
      evidenceOnly: true,
      brandId,
      taskId,
      stageRunId,
      actionName,
      materialCount: materials.length,
      materials,
      event,
      boundary: "只记录 Agent 素材复用证据；不创建素材、不触发第三方生成、不写 WorkBuddy 真源。",
    };
  }

  private async upsertCreativeMaterial(input: {
    id: string;
    brandId: string;
    workspaceScope: string;
    createdByUserId: string;
    sourceKind: "material_library_upload" | "ai_control_center_upload";
    title: string;
    description: string;
    materialType: string;
    materialTags: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    textContent: string;
    storageKey: string;
  }) {
    if (!(await this.prisma.tableExists("AIControlCenterCreativeMaterial"))) {
      throw new BadRequestException("AIControlCenterCreativeMaterial 表不存在，不能登记创作素材");
    }
    const existing = await this.findCreativeMaterial(input.id);
    if (!existing) {
      await this.prisma.$executeRaw`
        INSERT INTO "AIControlCenterCreativeMaterial" (
          "id", "brandId", "workspaceScope", "createdByUserId", "sourceKind", "title", "description",
          "materialType", "materialTags", "fileUrl", "fileName", "mimeType", "textContent", "storageKey",
          "createdAt", "updatedAt"
        )
        VALUES (
          ${input.id}, ${input.brandId}, ${input.workspaceScope}, ${input.createdByUserId}, ${input.sourceKind},
          ${input.title}, ${input.description}, ${input.materialType}, ${input.materialTags}, ${input.fileUrl || null},
          ${input.fileName || null}, ${input.mimeType || null}, ${input.textContent || null}, ${input.storageKey || null},
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `;
    }
    return (await this.findCreativeMaterial(input.id)) ?? { id: input.id, evidenceTable: "AIControlCenterCreativeMaterial" };
  }

  private async upsertVideoWork(input: {
    id: string;
    brandId: string;
    workspaceScope: string;
    createdByUserId: string;
    title: string;
    description: string;
    videoUrl: string;
    coverImageUrl: string;
    scriptContent: string;
  }) {
    if (!(await this.prisma.tableExists("AIControlCenterVideoWork"))) {
      throw new BadRequestException("AIControlCenterVideoWork 表不存在，不能登记视频作品");
    }
    const existing = await this.findVideoWork(input.id);
    if (!existing) {
      await this.prisma.$executeRaw`
        INSERT INTO "AIControlCenterVideoWork" (
          "id", "brandId", "workspaceScope", "createdByUserId", "title", "description",
          "scriptContent", "coverImageUrl", "videoUrl", "createdAt", "updatedAt"
        )
        VALUES (
          ${input.id}, ${input.brandId}, ${input.workspaceScope}, ${input.createdByUserId}, ${input.title},
          ${input.description}, ${input.scriptContent}, ${input.coverImageUrl || null}, ${input.videoUrl},
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `;
    }
    return (await this.findVideoWork(input.id)) ?? { id: input.id, evidenceTable: "AIControlCenterVideoWork" };
  }

  private async registerWorkflowArtifact(input: {
    brandId: string;
    taskId: string;
    stageRunId: string;
    source: ArchiveRegisterSource;
    recordId: string;
    title: string;
    description: string;
    assetUrl: string;
    storageKey: string;
    mimeType: string;
    artifactKind: string;
    idempotencyKey?: string;
  }) {
    if (!(await this.prisma.tableExists("wf_tasks")) || !(await this.prisma.tableExists("wf_artifacts"))) {
      throw new BadRequestException("workflow-core 表不存在，不能关联任务产物");
    }
    const task = await this.prisma.wfTask.findUnique({
      where: { taskId: input.taskId },
      select: { brandId: true },
    });
    if (!task) {
      throw new BadRequestException(`任务不存在：${input.taskId}`);
    }
    if (task.brandId !== input.brandId) {
      throw new BadRequestException(`任务 ${input.taskId} 不属于品牌 ${input.brandId}`);
    }
    const stageRunId = input.stageRunId || await this.latestStageRunId(input.taskId) || "archive-registration";
    const localPath = input.storageKey || input.assetUrl || `ai-control-archive://${input.source}/${input.recordId}`;
    return this.workflowCore.registerArtifact({
      command_id: `archive_${this.shortHash(input.idempotencyKey || input.recordId)}`,
      idempotency_key: input.idempotencyKey || `archive:${input.source}:${input.recordId}`,
      task_id: input.taskId,
      stage_run_id: stageRunId,
      kind: input.artifactKind,
      local_path: localPath,
      metadata: {
        registered_by: "ai-control-assets",
        archive_source: input.source,
        archive_record_id: input.recordId,
        title: input.title,
        description: input.description,
        asset_url: input.assetUrl || null,
        storage_key: input.storageKey || null,
        mime_type: input.mimeType || null,
        sha256: this.sha256(localPath),
      },
      source_refs: [
        {
          kind: input.source,
          id: input.recordId,
          ...(input.assetUrl ? { href: input.assetUrl } : {}),
          meta: { evidence_table: input.source === "video_work" ? "AIControlCenterVideoWork" : "AIControlCenterCreativeMaterial" },
        },
      ],
    });
  }

  private async findCreativeMaterial(id: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; evidenceTable: string }>>`
      SELECT "id", 'AIControlCenterCreativeMaterial' AS "evidenceTable"
      FROM "AIControlCenterCreativeMaterial"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  private async findVideoWork(id: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; evidenceTable: string }>>`
      SELECT "id", 'AIControlCenterVideoWork' AS "evidenceTable"
      FROM "AIControlCenterVideoWork"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  private async latestStageRunId(taskId: string) {
    if (!(await this.prisma.tableExists("wf_stage_runs"))) return "";
    const rows = await this.prisma.wfStageRun.findMany({
      where: { taskId },
      orderBy: [{ createdAt: "desc" }],
      take: 1,
      select: { stageRunId: true },
    });
    return rows[0]?.stageRunId ?? "";
  }

  private normalizeMaterialReuseRefs(value: MaterialReuseEvidenceRequest["materialRefs"]): MaterialReuseReferenceInput[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException("请提供 materialRefs，至少包含一个 MCP 检索返回的素材证据引用");
    }
    const refs = value.slice(0, 20).map((ref) => {
      const source = this.optionalText(ref?.source, 80);
      return {
        evidenceTable: this.optionalText(ref?.evidenceTable, 160) || undefined,
        recordId: this.optionalText(ref?.recordId, 160) || undefined,
        source: source ? (source as ArchiveSource) : undefined,
        id: this.optionalText(ref?.id, 160) || undefined,
        title: this.optionalText(ref?.title, 300) || undefined,
        usageRole: this.optionalText(ref?.usageRole, 120) || undefined,
        selectedReason: this.optionalText(ref?.selectedReason, 600) || undefined,
      };
    });
    for (const ref of refs) {
      if ((!ref.evidenceTable || !ref.recordId) && (!ref.source || !ref.id)) {
        throw new BadRequestException("materialRefs 每一项必须包含 evidenceTable+recordId，或 source+id");
      }
    }
    return refs;
  }

  private async requireTaskStageBinding(input: { brandId: string; taskId: string; stageRunId: string }) {
    const task = await this.prisma.wfTask.findUnique({
      where: { taskId: input.taskId },
      select: { brandId: true },
    });
    if (!task) {
      throw new BadRequestException(`任务不存在：${input.taskId}`);
    }
    if (task.brandId !== input.brandId) {
      throw new BadRequestException(`任务 ${input.taskId} 不属于品牌 ${input.brandId}`);
    }
    const stage = await this.prisma.wfStageRun.findUnique({
      where: { stageRunId: input.stageRunId },
      select: { taskId: true, stageKey: true },
    });
    if (!stage || stage.taskId !== input.taskId) {
      throw new BadRequestException(`阶段 ${input.stageRunId} 不属于任务 ${input.taskId}`);
    }
    return { brandId: task.brandId, stageKey: stage.stageKey };
  }

  private async resolveMaterialReuseItems(brandId: string, refs: MaterialReuseReferenceInput[]) {
    const archive = await this.getArchive({ brandId, limit: "200" });
    const items = refs.map((ref) => {
      const matched = archive.items.find((item) => this.isSameMaterialRef(ref, item));
      if (!matched) {
        const label = ref.evidenceTable && ref.recordId
          ? `${ref.evidenceTable}/${ref.recordId}`
          : `${ref.source}/${ref.id}`;
        throw new BadRequestException(`素材引用不存在或不属于当前品牌：${label}`);
      }
      return matched;
    });
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.evidence.table}/${item.evidence.recordId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private isSameMaterialRef(ref: MaterialReuseReferenceInput, item: ArchiveItem) {
    if (ref.evidenceTable && ref.recordId) {
      return item.evidence.table === ref.evidenceTable && item.evidence.recordId === ref.recordId;
    }
    if (ref.source && ref.id) {
      return item.source === ref.source && item.id === ref.id;
    }
    return false;
  }

  private async listCreativeMaterials(brandId: string, limit: number): Promise<ArchiveRow[]> {
    if (!(await this.prisma.tableExists("AIControlCenterCreativeMaterial"))) return [];
    return this.prisma.$queryRaw<ArchiveRow[]>`
      SELECT
        "id",
        'creative_material' AS "source",
        COALESCE(NULLIF("materialType", ''), 'material') AS "kind",
        COALESCE(NULLIF("title", ''), "fileName", "id") AS "title",
        NULLIF("description", '') AS "description",
        NULLIF("textContent", '') AS "textContent",
        "brandId",
        "workspaceScope",
        NULL AS "taskId",
        NULL AS "taskGoal",
        NULLIF("fileUrl", '') AS "assetUrl",
        "storageKey",
        NULL AS "localPath",
        "mimeType",
        "sourceKind",
        "materialTags",
        "createdAt",
        "updatedAt",
        'AIControlCenterCreativeMaterial' AS "evidenceTable",
        "id" AS "evidenceRecordId"
      FROM "AIControlCenterCreativeMaterial"
      WHERE "brandId" = ${brandId}
        AND COALESCE(NULLIF("materialType", ''), '') <> '文件夹'
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;
  }

  private async listVideoWorks(brandId: string, limit: number): Promise<ArchiveRow[]> {
    if (!(await this.prisma.tableExists("AIControlCenterVideoWork"))) return [];
    return this.prisma.$queryRaw<ArchiveRow[]>`
      SELECT
        "id",
        'video_work' AS "source",
        'video' AS "kind",
        COALESCE(NULLIF("title", ''), "id") AS "title",
        NULLIF("description", '') AS "description",
        NULL AS "textContent",
        "brandId",
        "workspaceScope",
        NULL AS "taskId",
        NULL AS "taskGoal",
        "videoUrl" AS "assetUrl",
        NULL AS "storageKey",
        NULL AS "localPath",
        NULL AS "mimeType",
        NULL AS "sourceKind",
        NULL AS "materialTags",
        "createdAt",
        "updatedAt",
        'AIControlCenterVideoWork' AS "evidenceTable",
        "id" AS "evidenceRecordId"
      FROM "AIControlCenterVideoWork"
      WHERE "brandId" = ${brandId}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;
  }

  private async listMediaAssets(brandId: string, limit: number): Promise<ArchiveRow[]> {
    if (!(await this.prisma.tableExists("MediaAsset"))) return [];
    return this.prisma.$queryRaw<ArchiveRow[]>`
      SELECT
        m."id",
        'media_asset' AS "source",
        CAST(m."mediaType" AS TEXT) AS "kind",
        COALESCE(NULLIF(m."title", ''), m."id") AS "title",
        NULL AS "description",
        NULL AS "textContent",
        COALESCE(m."brandId", ${brandId}) AS "brandId",
        NULL AS "workspaceScope",
        m."taskId",
        t."taskTitle" AS "taskGoal",
        m."sourceUrl" AS "assetUrl",
        m."storageKey",
        NULL AS "localPath",
        m."mimeType",
        m."metadataJson",
        NULL AS "sourceKind",
        NULL AS "materialTags",
        m."createdAt",
        m."updatedAt",
        'MediaAsset' AS "evidenceTable",
        m."id" AS "evidenceRecordId"
      FROM "MediaAsset" m
      LEFT JOIN "Task" t ON t."id" = m."taskId"
      WHERE m."brandId" = ${brandId}
      ORDER BY m."createdAt" DESC
      LIMIT ${limit}
    `;
  }

  private async listBusinessAssets(brandId: string, limit: number): Promise<ArchiveRow[]> {
    if (!(await this.prisma.tableExists("BusinessAsset"))) return [];
    const rows = await this.prisma.$queryRaw<ArchiveRow[]>`
      SELECT
        "id",
        'business_asset' AS "source",
        COALESCE(NULLIF("metadataJson"->>'kind', ''), CAST("category" AS TEXT)) AS "kind",
        COALESCE(NULLIF("title", ''), "id") AS "title",
        NULLIF("description", '') AS "description",
        COALESCE(
          NULLIF("metadataJson"->>'htmlContent', ''),
          NULLIF("metadataJson"->>'reportMarkdown', ''),
          NULLIF("metadataJson"->>'textContent', '')
        ) AS "textContent",
        "brandId",
        NULL AS "workspaceScope",
        NULL AS "taskId",
        NULL AS "taskGoal",
        COALESCE(
          NULLIF("metadataJson"->>'videoUrl', ''),
          NULLIF("metadataJson"->>'videoSourceUrl', ''),
          "fileUrl"
        ) AS "assetUrl",
        CASE
          WHEN COALESCE("metadataJson"->>'videoCacheStatus', '') = 'READY' THEN NULLIF("metadataJson"->>'videoStorageKey', '')
          ELSE NULL
        END AS "storageKey",
        NULL AS "localPath",
        NULLIF("metadataJson"->>'videoContentType', '') AS "mimeType",
        -- rawFields is the original collector response. Archive conversion and
        -- work snapshots use normalized fields; keep the original in the DB.
        CASE WHEN jsonb_typeof("metadataJson"::jsonb) = 'object'
          THEN "metadataJson"::jsonb - 'rawFields'
          ELSE "metadataJson"::jsonb
        END AS "metadataJson",
        NULL AS "sourceKind",
        NULL AS "materialTags",
        "createdAt",
        "updatedAt",
        'BusinessAsset' AS "evidenceTable",
        "id" AS "evidenceRecordId"
      FROM "BusinessAsset"
      WHERE "brandId" = ${brandId}
        AND COALESCE("metadataJson"->>'kind', '') NOT LIKE 'OCEAN_AD_%'
        -- These exact normalized kinds cannot be collected works and were
        -- already rejected by isRenderableBusinessAsset after fetching.
        AND COALESCE(NULLIF("metadataJson"->>'kind', ''), CAST("category" AS TEXT)) NOT IN (
          'DOUYIN_COMMENT', 'XHS_NOTE_COMMENT', 'DOUYIN_CREATOR_SEARCH_RESULT',
          'DOUYIN_TARGET_USER', 'XHS_TARGET_USER', 'DOUYIN_KEYWORD_RECOMMENDATION',
          'DOUYIN_COMPETITOR_ACCOUNT', 'DOUYIN_BRAND_ACCOUNT'
        )
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;
    return rows.map(row => {
      const work = new WorkAnalysisService(this.prisma).snapshot({ id: row.id, brandId: row.brandId, title: row.title, description: row.description, fileUrl: row.assetUrl, metadataJson: row.metadataJson, updatedAt: new Date(row.updatedAt || 0) });
      if (!work) return this.isRenderableBusinessAsset(row) ? row : null;
      return { ...row, source: "collected_work" as ArchiveSource, kind: work.videoUrl ? "video" : work.images.length ? "image" : work.platform === "douyin" ? "video" : "text", mimeType: row.mimeType || null, workspaceScope: work.platform, assetUrl: work.videoUrl || work.images[0]?.url || work.workUrl, textContent: work.body || null, collection: work };
    }).filter((row): row is ArchiveRow => !!row);
  }

  private isRenderableBusinessAsset(row: ArchiveRow) {
    const kind = String(row.kind || "").trim().toUpperCase();
    const assetUrl = String(row.assetUrl || "").trim().toLowerCase();
    const mimeType = String(row.mimeType || "").trim().toLowerCase();
    const title = String(row.title || "").trim().toLowerCase();
    const description = String(row.description || "").trim().toLowerCase();
    const hasTextContent = Boolean(String(row.textContent || "").trim());

    if (
      /(?:^|_)(?:BRAND|COMPETITOR)_ACCOUNT$/.test(kind)
      || /(?:^|_)TARGET_USER$/.test(kind)
      || /(?:^|_)COMMENT(?:_DATA)?$/.test(kind)
      || /(?:^|_)KEYWORD_RECOMMENDATION$/.test(kind)
      || /(?:^|_)CITY_HOTSPOT$/.test(kind)
      || /(?:^|_)CREATOR_SEARCH_RESULT$/.test(kind)
      || /(?:^|_)CREATOR_PROFILE_RESULT$/.test(kind)
      || /(?:^|_)CREATOR_DEEP_FETCH_TASK$/.test(kind)
    ) {
      return false;
    }

    if (/\/user\/profile\/|\/user\/[^/?#]+$|\/share\/user\/|author_homepage/.test(assetUrl)) {
      return false;
    }

    if (hasTextContent) {
      return true;
    }

    if (/text\/|application\/(json|xml)/.test(mimeType)) {
      return true;
    }

    if (
      /(?:^|\.)(?:html?|md|markdown|txt|csv|json|xml|ya?ml)(?:$|\?)/.test(assetUrl)
      || /(?:^|\.)(?:mp4|mov|m4v|webm|avi|m3u8|png|jpe?g|gif|webp|svg|bmp)(?:$|\?)/.test(assetUrl)
    ) {
      return true;
    }

    if (
      /GENERATED_REPORT|BUSINESS_DATA|INDUSTRY_REPORT|DOUYIN_MARKETING_PLAN/.test(kind)
      || /方案|策划|报告|文案|脚本|图文|视频|图片/.test(`${title} ${description}`)
    ) {
      return true;
    }

    return false;
  }

  private async listWorkflowArtifacts(brandId: string, limit: number): Promise<ArchiveRow[]> {
    if (!(await this.prisma.tableExists("wf_artifacts")) || !(await this.prisma.tableExists("wf_tasks"))) return [];
    return this.prisma.$queryRaw<ArchiveRow[]>`
      SELECT
        a."artifactRevisionId" AS "id",
        'workflow_artifact' AS "source",
        a."kind" AS "kind",
        CONCAT(a."kind", ' · r', a."revisionNo") AS "title",
        NULL AS "description",
        NULL AS "textContent",
        t."brandId",
        NULL AS "workspaceScope",
        a."taskId",
        t."goal" AS "taskGoal",
        NULL AS "assetUrl",
        NULL AS "storageKey",
        a."localPath",
        a."mimeType",
        NULL AS "sourceKind",
        NULL AS "materialTags",
        a."createdAt",
        a."createdAt" AS "updatedAt",
        'wf_artifacts' AS "evidenceTable",
        a."artifactRevisionId" AS "evidenceRecordId"
      FROM "wf_artifacts" a
      INNER JOIN "wf_tasks" t ON t."taskId" = a."taskId"
      WHERE t."brandId" = ${brandId}
      ORDER BY a."createdAt" DESC
      LIMIT ${limit}
    `;
  }

  private toArchiveItem(row: ArchiveRow): ArchiveItem {
    const assetUrl = this.resolveAssetUrl(row.brandId, row.storageKey, row.assetUrl, row.localPath);
    const materialType = this.resolveArchiveMaterialType(row, assetUrl);
    const workspaceScope = this.resolveArchiveWorkspaceScope(row.workspaceScope, assetUrl, row.title, row.description);
    const sourceKind = this.resolveArchiveSourceKind(row.sourceKind, row.kind);
    const legacyTags = row.materialTags ? this.parseTags(row.materialTags) : [];
    const materialTags = legacyTags.map(cleanCandidate).filter(Boolean);
    return {
      id: String(row.id),
      source: row.source,
      kind: String(row.kind || "asset"),
      materialType,
      mediaVerification: mediaType(row.mimeType || "", row.kind, row.storageKey || row.assetUrl || row.localPath || "", !!row.textContent),
      legacyTags,
      ...(row.collection ? { collection: row.collection } : {}),
      title: String(row.title || row.id),
      ...(row.description ? { description: String(row.description) } : {}),
      ...(row.textContent ? { textContent: String(row.textContent) } : {}),
      brandId: String(row.brandId),
      ...(workspaceScope ? { workspaceScope } : {}),
      ...(row.taskId ? { taskId: String(row.taskId) } : {}),
      ...(row.taskGoal ? { taskGoal: String(row.taskGoal) } : {}),
      ...(assetUrl ? { assetUrl } : {}),
      ...(row.storageKey ? { storageKey: String(row.storageKey) } : {}),
      ...(row.localPath ? { localPath: String(row.localPath) } : {}),
      ...(row.mimeType ? { mimeType: String(row.mimeType) } : {}),
      ...(sourceKind ? { sourceKind } : {}),
      ...(materialTags.length ? { materialTags } : {}),
      ...(row.createdAt ? { createdAt: this.toIso(row.createdAt) } : {}),
      ...(row.updatedAt ? { updatedAt: this.toIso(row.updatedAt) } : {}),
      evidence: {
        table: row.evidenceTable,
        recordId: row.evidenceRecordId,
      },
      links: {
        ...(row.taskId ? { task: `/ai-control/task-governance?taskId=${encodeURIComponent(String(row.taskId))}` } : {}),
        ...(assetUrl ? { source: assetUrl } : {}),
      },
    };
  }

  private deduplicateArchiveItems(items: ArchiveItem[]) {
    const deduplicated = new Map<string, ArchiveItem>();
    for (const item of items) {
      const dedupeKey = this.buildArchiveDedupKey(item);
      if (!dedupeKey) {
        deduplicated.set(`${item.source}:${item.id}`, item);
        continue;
      }
      const current = deduplicated.get(dedupeKey);
      if (!current || this.compareArchiveItemPriority(item, current) < 0) {
        deduplicated.set(dedupeKey, item);
      }
    }
    return Array.from(deduplicated.values());
  }

  private buildArchiveDedupKey(item: ArchiveItem) {
    const title = this.normalizeArchiveDedupText(item.title);
    if (!title) {
      return "";
    }
    const materialType = this.normalizeArchiveDedupText(item.materialType);
    const storageKey = this.normalizeArchiveDedupText(item.storageKey);
    const assetUrl = this.normalizeArchiveDedupAssetUrl(item.assetUrl);
    const textContent = this.normalizeArchiveDedupText(item.textContent);
    const description = this.normalizeArchiveDedupText(item.description);
    const contentSeed = assetUrl
      || storageKey
      || (textContent ? `text:${createHash("sha1").update(textContent.slice(0, 4000)).digest("hex").slice(0, 16)}` : "")
      || (description ? `desc:${createHash("sha1").update(description.slice(0, 1000)).digest("hex").slice(0, 16)}` : "");
    if (!contentSeed) {
      return "";
    }
    return [title, materialType, contentSeed].filter(Boolean).join("|");
  }

  private compareArchiveItemPriority(left: ArchiveItem, right: ArchiveItem) {
    const sourcePriority = (item: ArchiveItem) => {
      switch (item.source) {
        case "creative_material":
          return 0;
        case "video_work":
          return 1;
        case "media_asset":
          return 2;
        case "business_asset":
          return 3;
        case "workflow_artifact":
          return 4;
        default:
          return 9;
      }
    };
    const priorityDiff = sourcePriority(left) - sourcePriority(right);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
  }

  private normalizeArchiveDedupText(value?: string) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  private normalizeArchiveDedupAssetUrl(value?: string) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) {
      return "";
    }
    return normalized.replace(/[?#].*$/, "");
  }

  private resolveArchiveMaterialType(row: ArchiveRow, assetUrl: string) {
    return mediaType(row.mimeType || "", row.kind, row.storageKey || row.assetUrl || row.localPath || assetUrl, !!row.textContent).materialType;
  }

  private resolveArchiveWorkspaceScope(
    workspaceScope: string | null,
    assetUrl: string,
    title: string | null,
    description: string | null,
  ) {
    const normalized = this.optionalText(workspaceScope || "", 120);
    if (normalized) {
      return normalized;
    }
    const text = [assetUrl, title, description].map((value) => String(value || "").toLowerCase()).join(" ");
    if (/douyin|iesdouyin|aweme|sec_uid|sec_user_id/.test(text)) {
      return "douyin";
    }
    if (/xiaohongshu|xhs|little red book|explore\//.test(text)) {
      return "xiaohongshu";
    }
    if (/mp\.weixin\.qq\.com|weixin|wechat|公众号/.test(text)) {
      return "wechat";
    }
    return "";
  }

  private resolveArchiveSourceKind(sourceKind: string | null, kind: string | null) {
    const normalizedSourceKind = this.optionalText(sourceKind || "", 120);
    if (normalizedSourceKind) {
      return normalizedSourceKind;
    }
    const normalizedKind = this.optionalText(kind || "", 120);
    if (normalizedKind.toUpperCase() === "PLATFORM_EXPORT") {
      return "platform_export";
    }
    return "";
  }

  private resolveArchiveMaterialTags(
    row: ArchiveRow,
    materialType: string,
    workspaceScope: string,
    sourceKind: string,
    assetUrl: string,
  ) {
    const tags = new Set<string>();
    const workspaceSource = this.workspaceScopeSourceLabel(workspaceScope);
    const sourceKindLabel = sourceKind === "platform_export" ? "平台导出" : "";
    const genericTags = new Set(
      [
        materialType,
        workspaceSource,
        sourceKindLabel,
        "视频分享",
        "图文分享",
        "归档登记",
        "品牌资料",
        "创作素材",
        "视频作品",
        "媒体资产",
      ]
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    );
    const pushTag = (value: string) => {
      const normalized = this.normalizeArchiveContentTag(value);
      if (!normalized || genericTags.has(normalized)) {
        return;
      }
      tags.add(normalized);
    };

    for (const tag of row.materialTags ? this.parseTags(row.materialTags) : []) {
      pushTag(tag);
    }

    const contentText = [row.title, row.description, row.textContent].map((value) => String(value || "")).filter(Boolean).join("\n");
    for (const tag of this.extractArchiveHashtagTags(contentText)) {
      pushTag(tag);
    }
    for (const tag of this.extractArchiveSummaryTextTags(row.title || "", 3)) {
      pushTag(tag);
    }
    for (const tag of this.extractArchiveSummaryTextTags(row.description || "", 4)) {
      pushTag(tag);
    }
    if (!tags.size && row.textContent) {
      for (const tag of this.textKeywordTags(row.textContent).slice(0, 4)) {
        pushTag(tag);
      }
    }

    if (!tags.size) {
      if (materialType) tags.add(materialType);
      if (workspaceSource) tags.add(workspaceSource);
      if (sourceKindLabel) tags.add(sourceKindLabel);
      const text = [assetUrl, row.title, row.description].map((value) => String(value || "").toLowerCase()).join(" ");
      if (/\/share\/video\//.test(text)) tags.add("视频分享");
      if (/\/share\/note\/|schema_type=37/.test(text)) tags.add("图文分享");
    }

    return Array.from(tags).filter(Boolean).slice(0, 12);
  }

  private normalizeArchiveContentTag(value: string) {
    let normalized = String(value || "").trim();
    if (!normalized) {
      return "";
    }
    normalized = normalized.replace(/^#+/u, "").replace(/^[@＠]+/u, "");
    normalized = normalized.replace(/[“”"'`]+/gu, "");
    normalized = normalized.replace(/[=＝].*$/u, "");
    normalized = normalized.replace(/^[这那该此]?[一二三四五六七八九十0-9]+(?:台|个|条|篇|款|辆|位|种|套|段|则|份|版|张|件)/u, "");
    normalized = normalized.replace(/^(关于|有关|这是|这个|那个|一种|一个|一条)/u, "");
    normalized = normalized.replace(/\s+/g, "");
    if (!normalized || /^https?:\/\//i.test(normalized) || /^www\./i.test(normalized)) {
      return "";
    }
    if (/^(视频|图片|文字|素材|内容|作品|标题|描述|文案|正文|标签)$/u.test(normalized)) {
      return "";
    }
    if (normalized.length < 2 || normalized.length > 18) {
      return "";
    }
    return normalized;
  }

  private extractArchiveHashtagTags(text: string) {
    const tags: string[] = [];
    for (const match of String(text || "").matchAll(/#([^#\s,，。.!！?？;；:：/\\|]+)/gu)) {
      const candidate = this.normalizeArchiveContentTag(match[1] || "");
      if (candidate) {
        tags.push(candidate);
      }
      if (tags.length >= 8) {
        break;
      }
    }
    return Array.from(new Set(tags)).slice(0, 8);
  }

  private extractArchiveSummaryTextTags(text: string, limit: number) {
    const candidates = String(text || "")
      .replace(/#([^#\s]+)/gu, " ")
      .split(/[\n\r\t,，。.!！?？;；:：/\\|｜()（）【】\[\]<>《》]/g)
      .map((item) => this.normalizeArchiveContentTag(item))
      .filter(Boolean);
    return Array.from(new Set(candidates)).slice(0, limit);
  }

  private buildSummary(items: ArchiveItem[]) {
    const bySource = new Map<string, number>();
    const byKind = new Map<string, number>();
    const linkedTasks = new Set<string>();
    for (const item of items) {
      bySource.set(item.source, (bySource.get(item.source) ?? 0) + 1);
      byKind.set(item.kind, (byKind.get(item.kind) ?? 0) + 1);
      if (item.taskId) linkedTasks.add(item.taskId);
    }
    return {
      total: items.length,
      linkedTasks: linkedTasks.size,
      bySource: Object.fromEntries(bySource),
      byKind: Object.fromEntries(byKind),
    };
  }

  private normalizeArchiveSearch(params: { materialType?: string; materialSource?: string; keyword?: string }) {
    return {
      materialType: this.canonicalMaterialType(this.optionalText(params.materialType, 80)),
      materialSource: this.materialSourceFilterLabel(this.optionalText(params.materialSource, 80)),
      keyword: this.optionalText(params.keyword, 120).toLowerCase(),
    };
  }

  private filterArchiveItems(items: ArchiveItem[], search: { materialType: string; materialSource: string; keyword: string }) {
    return items.filter((item) => {
      if (search.materialType && this.canonicalMaterialType(String(item.materialType || item.kind || "")) !== search.materialType) {
        return false;
      }
      if (search.materialSource && !this.archiveItemMaterialSources(item).includes(search.materialSource as ArchiveMaterialSource)) {
        return false;
      }
      if (search.keyword && !this.archiveSearchText(item).includes(search.keyword)) {
        return false;
      }
      return true;
    });
  }

  private buildArchiveFilterMetadata(items: ArchiveItem[], search: { materialType: string; materialSource: string; keyword: string }) {
    return {
      applied: {
        materialType: search.materialType,
        materialSource: search.materialSource,
        keyword: search.keyword,
      },
      materialTypes: [...ARCHIVE_MATERIAL_TYPES],
      materialSources: [...ARCHIVE_MATERIAL_SOURCES],
    };
  }

  private archiveItemMaterialSources(item: ArchiveItem) {
    const sources = new Set<string>();
    const workspaceSource = this.workspaceScopeSourceLabel(item.workspaceScope);
    if (workspaceSource) sources.add(workspaceSource);
    for (const tag of item.materialTags || []) {
      const label = this.materialSourceFilterLabel(tag);
      if (label) sources.add(label);
    }
    if (item.description) {
      for (const label of this.knownMaterialSourceLabels()) {
        if (item.description.includes(`来源：${label}`) || item.description.includes(label)) {
          const normalized = this.materialSourceFilterLabel(label);
          if (normalized) sources.add(normalized);
        }
      }
    }
    if (this.isUserUploadedItem(item)) sources.add("用户上传");
    return Array.from(sources).filter((source): source is ArchiveMaterialSource => ARCHIVE_MATERIAL_SOURCES.includes(source as ArchiveMaterialSource));
  }

  private archiveSearchText(item: ArchiveItem) {
    return [
      item.collection?.originalWorkId,
      item.collection?.workUrl,
      ...(item.products || []).map(p => p.name),
      item.index?.sku,
      ...(item.index?.clips || []).flatMap((c: any) => [c.scene, c.action, c.framing, c.surface]),
      item.title,
      item.description,
      item.textContent,
      item.kind,
      item.materialType,
      item.source,
      item.sourceKind,
      item.workspaceScope,
      item.taskId,
      item.taskGoal,
      item.assetUrl,
      item.storageKey,
      item.localPath,
      item.mimeType,
      item.evidence.table,
      item.evidence.recordId,
      ...(item.materialTags || []),
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
  }

  private materialSourceFilterLabel(value: string) {
    const normalized = String(value || "").trim();
    const aliases: Record<string, string> = {
      douyin: "抖音/视频号",
      video_account: "抖音/视频号",
      wechat_channel: "抖音/视频号",
      shipinhao: "抖音/视频号",
      xiaohongshu: "小红书",
      rednote: "小红书",
      wechat: "公众号",
      official_account: "公众号",
      user_upload: "用户上传",
      user_folder: "用户上传",
      material_library_upload: "用户上传",
      用户文件夹: "用户上传",
      用户素材: "用户上传",
    };
    const label = aliases[normalized] || normalized;
    return ARCHIVE_MATERIAL_SOURCES.includes(label as any) ? label : "";
  }

  private knownMaterialSourceLabels() {
    return ["抖音/视频号", "小红书", "公众号", "用户上传", "用户文件夹", "用户素材"];
  }

  private workspaceScopeSourceLabel(value?: string) {
    return this.materialSourceFilterLabel(String(value || ""));
  }

  private isUserUploadedItem(item: ArchiveItem) {
    const text = [
      item.sourceKind,
      item.description,
      ...(item.materialTags || []),
    ].map((value) => String(value || "")).join(" ");
    return /user_upload|user_folder|material_library_upload|用户上传|用户文件夹|用户素材/.test(text);
  }

  private canonicalMaterialType(value: string) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "";
    if (/视频|video|mp4|mov|webm/.test(normalized)) return "视频";
    if (/图片|image|png|jpe?g|gif|webp|svg/.test(normalized)) return "图片";
    if (/音频|语音|audio|mp3|wav|m4a|aac|ogg|flac/.test(normalized)) return "音频";
    if (/文字|文本|text|文案|copy/.test(normalized)) return "文字";
    return ARCHIVE_MATERIAL_TYPES.includes(value as any) ? value : "";
  }

  private sourceLabels() {
    return [
      { key: "collected_work", label: "已采集原作", table: "BusinessAsset" },
      { key: "creative_material", label: "创作素材", table: "AIControlCenterCreativeMaterial" },
      { key: "video_work", label: "视频作品", table: "AIControlCenterVideoWork" },
      { key: "media_asset", label: "媒体资产", table: "MediaAsset" },
      { key: "business_asset", label: "品牌资料", table: "BusinessAsset" },
      { key: "workflow_artifact", label: "任务产物", table: "wf_artifacts" },
    ];
  }

  private normalizeRegisterSource(value?: string): ArchiveRegisterSource {
    const normalized = String(value || "").trim();
    if (normalized === "creative_material" || normalized === "video_work") {
      return normalized;
    }
    throw new BadRequestException("source 必须是 creative_material 或 video_work");
  }

  private safeRegisterSource(value?: string): ArchiveRegisterSource | null {
    const normalized = String(value || "").trim();
    return normalized === "creative_material" || normalized === "video_work" ? normalized : null;
  }

  private normalizeOriginKind(value?: string): ArchiveOriginKind {
    const normalized = String(value || "").trim();
    if (
      normalized === "user_upload"
      || normalized === "user_folder"
      || normalized === "third_party_generated"
      || normalized === "workbuddy_generated"
      || normalized === "manual_external"
    ) {
      return normalized;
    }
    return "manual_external";
  }

  private normalizeMaterialSourceKind(value: string | undefined, originKind: ArchiveOriginKind) {
    const normalized = String(value || "").trim();
    if (normalized === "material_library_upload" || normalized === "ai_control_center_upload") {
      return normalized;
    }
    return originKind === "user_upload" || originKind === "user_folder" ? "material_library_upload" : "ai_control_center_upload";
  }

  private originLabel(value: ArchiveOriginKind) {
    const labels: Record<ArchiveOriginKind, string> = {
      user_upload: "用户上传",
      user_folder: "用户上传",
      third_party_generated: "第三方模型生成",
      workbuddy_generated: "WorkBuddy 生成",
      manual_external: "手动登记",
    };
    return labels[value];
  }

  private classifyResourceEvidence(input: { assetUrl: string; storageKey: string; textContent: string; folderPath?: string; folderMode?: string; folderFileCount?: number; hasUpload?: boolean }) {
    const assetUrl = input.assetUrl.trim();
    const storageKey = input.storageKey.trim();
    const folderPath = String(input.folderPath || "").trim();
    if (input.hasUpload) {
      return {
        kind: "pending_controlled_upload",
        status: "pass" as const,
        message: "上传后将写入受控素材库",
      };
    }
    if (folderPath) {
      if (input.folderMode === "browser_directory") {
        return {
          kind: "browser_selected_folder",
          status: "warning" as const,
          message: `已通过弹窗选择文件夹，将按 ${input.folderFileCount || 0} 个图片/视频素材文件逐条建档`,
        };
      }
      return {
        kind: this.isLikelyAbsolutePath(folderPath) ? "registered_local_folder" : "relative_folder_reference",
        status: this.isLikelyAbsolutePath(folderPath) ? "warning" as const : "block" as const,
        message: this.isLikelyAbsolutePath(folderPath) ? "已登记本机素材文件夹，需通过本机挂载或安装态读取" : "素材文件夹需填写绝对路径",
      };
    }
    if (storageKey || /^(works|reports)\//i.test(assetUrl) || assetUrl.startsWith("/api/")) {
      return {
        kind: storageKey ? "controlled_storage_key" : "controlled_internal_path",
        status: "pass" as const,
        message: "已具备受控资源引用",
      };
    }
    if (!assetUrl && input.textContent.trim()) {
      return {
        kind: "text_only",
        status: "pass" as const,
        message: "文本素材可直接归档",
      };
    }
    if (/^https?:\/\//i.test(assetUrl)) {
      const isLikelyShortLink = /(tmp|temp|expire|signature|expires|x-amz-|oss-|cos-|token=|sign=)/i.test(assetUrl);
      return {
        kind: isLikelyShortLink ? "external_short_lived_url" : "external_url",
        status: "warning" as const,
        message: isLikelyShortLink ? "疑似第三方临时链接，后续需补受控副本" : "外部链接可登记，但后续需沉淀受控副本",
      };
    }
    if (assetUrl) {
      return {
        kind: "invalid_resource",
        status: "block" as const,
        message: "资源地址必须是 http/https、站内 /api 地址或受控 storageKey",
      };
    }
    return {
      kind: "missing_resource",
      status: "warning" as const,
      message: "未提供资源地址；仅文本素材可直接归档",
    };
  }

  private async preflightTaskLink(input: { brandId: string; taskId: string }): Promise<ArchivePreflightCheck> {
    if (!input.taskId) {
      return this.check("task_link", "任务关联", "warning", "未填写任务 ID，登记后不能回到任务治理链");
    }
    if (!(await this.prisma.canUseDatabase())) {
      return this.check("task_link", "任务关联", "warning", "数据库不可用，暂不能核验任务 ID");
    }
    if (!(await this.prisma.tableExists("wf_tasks"))) {
      return this.check("task_link", "任务关联", "warning", "wf_tasks 表不存在，暂不能核验任务 ID");
    }
    const task = await this.prisma.wfTask.findUnique({
      where: { taskId: input.taskId },
      select: { brandId: true },
    });
    if (!task) {
      return this.check("task_link", "任务关联", "block", `任务不存在：${input.taskId}`);
    }
    if (task.brandId !== input.brandId) {
      return this.check("task_link", "任务关联", "block", `任务不属于品牌 ${input.brandId}`);
    }
    return this.check("task_link", "任务关联", "pass", "任务 ID 可关联");
  }

  private check(key: string, label: string, status: ArchivePreflightCheck["status"], message: string): ArchivePreflightCheck {
    return { key, label, status, message };
  }

  private makeRecordId(source: ArchiveRegisterSource, idempotencyKey?: string) {
    const prefix = source === "video_work" ? "ai_control_center_video_work" : "ai_control_center_creative_material";
    if (idempotencyKey) {
      return `${prefix}_archive_${this.shortHash(idempotencyKey)}`;
    }
    return `${prefix}_${randomUUID()}`;
  }

  private serializeTags(value?: string[] | string, originKind?: ArchiveOriginKind) {
    const tags = Array.isArray(value) ? value : String(value || "").split(/[,\n|]/g);
    const sourceTag = originKind ? this.originLabel(originKind) : "";
    const normalized = Array.from(new Set([sourceTag, ...tags].map((item) => String(item || "").trim()).filter(Boolean))).slice(0, 12);
    return JSON.stringify(normalized.length ? normalized : ["归档登记"]);
  }

  private parseTags(value: string) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12);
      }
    } catch {
      // Fall through to delimiter parsing for legacy rows.
    }
    return String(value || "")
      .split(/[,\n|]/g)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  private async deriveUploadTags(input: {
    upload: NonNullable<ReturnType<AiControlAssetArchiveService["normalizeUploadPayload"]>>;
    originKind: ArchiveOriginKind;
    materialType: string;
    fileName: string;
    mimeType: string;
  }) {
    const tags = new Set<string>();
    const fileName = input.fileName || input.upload.fileName;
    const mimeType = input.mimeType || input.upload.contentType;
    const materialType = this.normalizeDisplayMaterialType(input.materialType, this.inferMaterialType(mimeType, fileName, "", ""));
    tags.add(this.originLabel(input.originKind));
    tags.add(materialType);
    for (const tag of this.filenameTags(fileName)) tags.add(tag);
    if (materialType === "图片") {
      try {
        const ocr = await this.localOcrService.recognizeImageBuffer(Buffer.from(input.upload.dataBase64, "base64"), {
          fileName,
          mimeType,
        });
        if (ocr.text) {
          tags.add("已识图");
          tags.add(`OCR:${ocr.engine}`);
          for (const tag of this.textKeywordTags(ocr.text)) tags.add(tag);
          return {
            tags: Array.from(tags),
            note: [`标签来源：文件名、类型、本地OCR识别。`, `OCR引擎：${ocr.engine}`, `识别摘要：${ocr.text.slice(0, 300)}`].join("\n"),
          };
        }
        tags.add("待识图");
        return { tags: Array.from(tags), note: "标签来源：文件名与类型；本地OCR未识别出可用文字。" };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || "unknown");
        tags.add("待识图");
        tags.add("本地OCR未就绪");
        return {
          tags: Array.from(tags),
          note: `标签来源：文件名与类型；本地OCR暂未完成：${message.slice(0, 240)}`,
        };
      }
    }
    if (materialType !== "视频" && materialType !== "语音") {
      return { tags: Array.from(tags), note: "标签来源：文件名与类型。" };
    }
    try {
      const transcript = await this.localAsrService.transcribeVideoBuffer(Buffer.from(input.upload.dataBase64, "base64"), {
        fileName,
        mimeType,
      });
      tags.add("已转写");
      tags.add(`ASR:${transcript.engine}`);
      for (const tag of this.textKeywordTags(transcript.text)) tags.add(tag);
      return {
        tags: Array.from(tags),
        note: [`标签来源：文件名、类型、本地ASR转写。`, `ASR引擎：${transcript.engine}`, `转写摘要：${transcript.text.slice(0, 300)}`].join("\n"),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || "unknown");
      tags.add("待转写");
      tags.add("本地ASR未就绪");
      return {
        tags: Array.from(tags),
        note: `标签来源：文件名与类型；本地ASR暂未完成：${message.slice(0, 240)}`,
      };
    }
  }

  private async deriveUploadFileTags(input: {
    filePath: string;
    originKind: ArchiveOriginKind;
    materialType: string;
    fileName: string;
    mimeType: string;
  }) {
    const tags = new Set<string>();
    const fileName = input.fileName;
    const mimeType = input.mimeType;
    const materialType = this.normalizeDisplayMaterialType(input.materialType, this.inferMaterialType(mimeType, fileName, "", ""));
    tags.add(this.originLabel(input.originKind));
    tags.add(materialType);
    for (const tag of this.filenameTags(fileName)) tags.add(tag);
    if (materialType === "图片") {
      try {
        const ocr = await this.localOcrService.recognizeImageFile(input.filePath, {
          fileName,
          mimeType,
        });
        if (ocr.text) {
          tags.add("已识图");
          tags.add(`OCR:${ocr.engine}`);
          for (const tag of this.textKeywordTags(ocr.text)) tags.add(tag);
          return {
            tags: Array.from(tags),
            note: [`标签来源：文件名、类型、本地OCR识别。`, `OCR引擎：${ocr.engine}`, `识别摘要：${ocr.text.slice(0, 300)}`].join("\n"),
          };
        }
        tags.add("待识图");
        return { tags: Array.from(tags), note: "标签来源：文件名与类型；本地OCR未识别出可用文字。" };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || "unknown");
        tags.add("待识图");
        tags.add("本地OCR未就绪");
        return {
          tags: Array.from(tags),
          note: `标签来源：文件名与类型；本地OCR暂未完成：${message.slice(0, 240)}`,
        };
      }
    }
    if (materialType !== "视频" && materialType !== "语音") {
      return { tags: Array.from(tags), note: "标签来源：文件名与类型。" };
    }
    try {
      const transcript = await this.localAsrService.transcribeVideoFile(input.filePath, {
        fileName,
        mimeType,
      });
      tags.add("已转写");
      tags.add(`ASR:${transcript.engine}`);
      for (const tag of this.textKeywordTags(transcript.text)) tags.add(tag);
      return {
        tags: Array.from(tags),
        note: [`标签来源：文件名、类型、本地ASR转写。`, `ASR引擎：${transcript.engine}`, `转写摘要：${transcript.text.slice(0, 300)}`].join("\n"),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || "unknown");
      tags.add("待转写");
      tags.add("本地ASR未就绪");
      return {
        tags: Array.from(tags),
        note: `标签来源：文件名与类型；本地ASR暂未完成：${message.slice(0, 240)}`,
      };
    }
  }

  private filenameTags(fileName: string) {
    return String(fileName || "")
      .replace(/\.[^.]+$/, "")
      .split(/[\s_\-·,，.。/\\]+/g)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
      .slice(0, 8);
  }

  private textKeywordTags(text: string) {
    const normalized = String(text || "").replace(/[^\p{Script=Han}a-zA-Z0-9]+/gu, " ");
    const chunks = normalized
      .split(/\s+/g)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2);
    const tags: string[] = [];
    for (const chunk of chunks) {
      if (/^[\p{Script=Han}]{4,}$/u.test(chunk)) {
        for (let index = 0; index < chunk.length - 1 && tags.length < 8; index += 2) {
          tags.push(chunk.slice(index, index + 4));
        }
      } else {
        tags.push(chunk);
      }
      if (tags.length >= 8) break;
    }
    return Array.from(new Set(tags)).slice(0, 8);
  }

  private inferMaterialType(mimeType: string, fileName: string, textContent: string, folderPath?: string) {
    const normalizedMime = mimeType.toLowerCase();
    const normalizedFileName = fileName.toLowerCase();
    if (normalizedMime.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(normalizedFileName)) return "图片";
    if (normalizedMime.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(normalizedFileName)) return "语音";
    if (normalizedMime.startsWith("video/") || /\.(mp4|mov|webm|avi|m4v)$/i.test(normalizedFileName)) return "视频";
    if (normalizedMime.startsWith("text/") || /\.(txt|md|csv|json|srt|vtt)$/i.test(normalizedFileName)) return "文字";
    if (folderPath) return "文件夹";
    if (textContent) return "文字";
    return "素材";
  }

  private normalizeDisplayMaterialType(value: string, fallback: string) {
    const normalized = this.optionalText(value, 80);
    return (ARCHIVE_MATERIAL_TYPES as readonly string[]).includes(normalized) ? normalized : fallback;
  }

  private decorateDescription(description: string, input: { originKind: ArchiveOriginKind; folderPath: string; folderMode?: string; folderFileCount?: number; folderSampleFiles?: string[] }) {
    const lines = [description];
    lines.push(`来源：${this.originLabel(input.originKind)}`);
    if (input.folderPath) {
      lines.push(`素材文件夹：${input.folderPath}`);
    }
    if (input.folderMode) {
      lines.push(`选择方式：${input.folderMode}`);
    }
    if (input.folderFileCount) {
      lines.push(`文件数量：${input.folderFileCount}`);
    }
    for (const file of input.folderSampleFiles || []) {
      lines.push(`样例：${file}`);
    }
    return lines.filter(Boolean).join("\n").slice(0, 10_000);
  }

  private normalizeUploadPayload(payload?: ArchiveRegistrationRequest["upload"]) {
    if (!payload || typeof payload !== "object") return null;
    const dataBase64 = String(payload.dataBase64 || "").trim();
    if (!dataBase64) return null;
    return {
      fileName: this.optionalText(payload.fileName, 260) || `ai-control-material-${Date.now()}`,
      contentType: this.optionalText(payload.contentType, 160) || "application/octet-stream",
      dataBase64,
    };
  }

  private async persistUploadedMaterialFile(input: {
    brandId: string;
    title: string;
    materialType: string;
    sourceKind: "material_library_upload" | "ai_control_center_upload";
    upload: NonNullable<ReturnType<AiControlAssetArchiveService["normalizeUploadPayload"]>>;
  }) {
    const extension = this.resolveExtension(input.upload.fileName, input.upload.contentType);
    const category = this.materialCategoryForStorage(input.materialType, input.upload.contentType, input.upload.fileName);
    const baseName = this.stripFileExtension(this.slugifyFileName(input.title || input.upload.fileName), extension);
    const relativePath = input.sourceKind === "material_library_upload"
      ? `material-library/${category}/${this.datePath()}/${Date.now()}-${baseName}${extension}`
      : `ai-control-center/creative-materials/${randomUUID()}-${baseName}${extension}`;
    const storageKey = `works/${input.brandId}/${relativePath}`;
    await this.ossStorage.putObject(storageKey, Buffer.from(input.upload.dataBase64, "base64"), input.upload.contentType);
    return {
      fileUrl: `${this.appConfigService.getServerBaseUrl()}/api/works/brands/${input.brandId}/assets?fileName=${encodeURIComponent(relativePath)}`,
      fileName: input.upload.fileName,
      mimeType: input.upload.contentType,
      storageKey,
    };
  }

  private async persistUploadedMaterialDiskFile(input: {
    brandId: string;
    title: string;
    materialType: string;
    sourceKind: "material_library_upload" | "ai_control_center_upload";
    filePath: string;
    fileName: string;
    mimeType: string;
  }) {
    const extension = this.resolveExtension(input.fileName, input.mimeType);
    const category = this.materialCategoryForStorage(input.materialType, input.mimeType, input.fileName);
    const baseName = this.stripFileExtension(this.slugifyFileName(input.title || input.fileName), extension);
    const relativePath = input.sourceKind === "material_library_upload"
      ? `material-library/${category}/${this.datePath()}/${Date.now()}-${baseName}${extension}`
      : `ai-control-center/creative-materials/${randomUUID()}-${baseName}${extension}`;
    const storageKey = `works/${input.brandId}/${relativePath}`;
    await this.ossStorage.putObjectFromFile(storageKey, input.filePath, input.mimeType);
    return {
      fileUrl: `${this.appConfigService.getServerBaseUrl()}/api/works/brands/${input.brandId}/assets?fileName=${encodeURIComponent(relativePath)}`,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storageKey,
    };
  }

  private normalizeStringList(value: unknown, maxLength: number, limit: number) {
    const source = Array.isArray(value)
      ? value
      : typeof value === "string" && value.trim().startsWith("[")
        ? this.parseJsonStringList(value)
        : typeof value === "string"
          ? value.split(/[\n|,]/g)
          : [];
    return source
      .map((item) => this.optionalText(String(item || ""), maxLength))
      .filter(Boolean)
      .slice(0, limit);
  }

  private parseJsonStringList(value: string) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private materialCategoryForStorage(materialType: string, mimeType: string, fileName: string) {
    const inferred = this.inferMaterialType(mimeType, fileName, "", "");
    if (inferred === "图片" || /图片|image/i.test(materialType)) return "image";
    if (inferred === "语音" || /语音|音频|audio/i.test(materialType)) return "audio";
    if (inferred === "视频" || /视频|video/i.test(materialType)) return "video";
    return "text";
  }

  private resolveExtension(fileName: string, contentType: string) {
    const matched = /\.[a-zA-Z0-9]+$/.exec(String(fileName || "").trim());
    if (matched) return matched[0].toLowerCase();
    const normalizedType = String(contentType || "").trim().toLowerCase();
    if (normalizedType === "image/png") return ".png";
    if (normalizedType === "image/webp") return ".webp";
    if (normalizedType === "image/gif") return ".gif";
    if (normalizedType === "image/jpeg" || normalizedType === "image/jpg") return ".jpg";
    if (normalizedType === "video/mp4") return ".mp4";
    if (normalizedType === "audio/mpeg") return ".mp3";
    if (normalizedType === "audio/wav" || normalizedType === "audio/x-wav") return ".wav";
    if (normalizedType === "text/plain") return ".txt";
    return ".bin";
  }

  private datePath() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}/${year}-${month}`;
  }

  private slugifyFileName(value: string) {
    return String(value || "material")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "material";
  }

  private stripFileExtension(value: string, extension: string) {
    const normalized = String(value || "material");
    const suffix = String(extension || "").toLowerCase();
    return suffix && normalized.toLowerCase().endsWith(suffix)
      ? normalized.slice(0, -suffix.length) || "material"
      : normalized;
  }

  private isLikelyAbsolutePath(value: string) {
    return /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith("\\\\") || value.startsWith("/");
  }

  private requiredText(value: string | undefined, message: string, maxLength: number) {
    const normalized = String(value || "").trim();
    if (!normalized) throw new BadRequestException(message);
    return normalized.slice(0, maxLength);
  }

  private optionalText(value: string | undefined, maxLength: number) {
    const normalized = String(value || "").trim();
    return normalized ? normalized.slice(0, maxLength) : "";
  }

  private optionalUrlOrPath(value: string | undefined, label: string) {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    if (/^https?:\/\//i.test(normalized) || normalized.startsWith("/api/") || normalized.startsWith("works/") || normalized.startsWith("reports/")) {
      return normalized.slice(0, 2000);
    }
    throw new BadRequestException(`${label} 必须是 http/https、站内 /api 地址或受控 storageKey`);
  }

  private shortHash(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 24);
  }

  private sha256(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private resolveAssetUrl(brandId: string, storageKey?: string | null, sourceUrl?: string | null, localPath?: string | null) {
    const normalizedStorageKey = String(storageKey || "").trim();
    const normalizedSourceUrl = String(sourceUrl || "").trim();
    const normalizedLocalPath = String(localPath || "").trim();
    const match = /^works\/([^/]+)\/(.+)$/.exec(normalizedStorageKey);
    if (match && match[1] === brandId) {
      return `${this.appConfigService.getServerBaseUrl()}/api/works/brands/${brandId}/assets?fileName=${encodeURIComponent(match[2])}`;
    }
    const sourceWorkMatch = /^works\/([^/]+)\/(.+)$/.exec(normalizedSourceUrl);
    if (sourceWorkMatch && sourceWorkMatch[1] === brandId) {
      return `${this.appConfigService.getServerBaseUrl()}/api/works/brands/${brandId}/assets?fileName=${encodeURIComponent(sourceWorkMatch[2])}`;
    }
    if (/^(works|reports)\/.+$/i.test(normalizedSourceUrl)) {
      return `${this.appConfigService.getServerBaseUrl()}/api/works/brands/${brandId}/assets?fileName=${encodeURIComponent(normalizedSourceUrl)}`;
    }
    if (/^(works|reports)\/.+$/i.test(normalizedLocalPath)) {
      return `${this.appConfigService.getServerBaseUrl()}/api/works/brands/${brandId}/assets?fileName=${encodeURIComponent(normalizedLocalPath)}`;
    }
    if (normalizedStorageKey) {
      return `/api/ai-control/assets/storage?storageKey=${encodeURIComponent(normalizedStorageKey)}`;
    }
    return normalizedSourceUrl;
  }

  private normalizeBrandId(value?: string) {
    const normalized = String(value || "").trim();
    return normalized || "brand-demo-cleaning";
  }

  private clampInt(value: string | undefined, min: number, max: number, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(parsed)));
  }

  private toIso(value: Date | string) {
    return value instanceof Date ? value.toISOString() : String(value);
  }
}
