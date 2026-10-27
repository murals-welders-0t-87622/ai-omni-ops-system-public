import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Response } from "express";
import { AuthService } from "../auth/auth.service";
import { MaterialQuery } from "./material-index.contract";
import { AiControlAssetArchiveService } from "./ai-control-asset-archive.service";
import { AiControlMdWriterService } from "./ai-control-md-writer.service";
import { AiControlOntologyOrchestrationService, type OntologyAiDraftGenerateInput, type OntologyEdgeDraftInput, type OntologyExecutionNodeEvidenceInput, type OntologyExecutionPlanEvidenceInput, type OntologyExecutionPlanQuery, type OntologyExpertSourceWritebackRequestInput, type OntologyFlowDraftInput, type OntologyFlowRulesInput, type OntologyNodeDraftInput, type OntologyNodeReferencesInput, type OntologyPublishAndSyncInput, type OntologyPublishInput, type OntologyPublishedContractQuery } from "./ai-control-ontology-orchestration.service";
import * as MdWriter from "@ai-omni/shared/md-writer-core";

const AI_CONTROL_ARCHIVE_UPLOAD_TMP_DIR = join(tmpdir(), "ai-omni-archive-uploads");
const AI_CONTROL_ARCHIVE_UPLOAD_LIMIT_BYTES = Math.max(1, Number(process.env.AI_CONTROL_ARCHIVE_UPLOAD_LIMIT_MB || "2048")) * 1024 * 1024;
mkdirSync(AI_CONTROL_ARCHIVE_UPLOAD_TMP_DIR, { recursive: true });

function resolveHttpByteRange(rangeHeader: string | undefined, totalBytes: number) {
  if (!rangeHeader || totalBytes <= 0) {
    return null;
  }
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) {
    return "invalid" as const;
  }
  const [, startToken, endToken] = match;
  let start = 0;
  let end = totalBytes - 1;
  if (startToken) {
    start = Number(startToken);
    end = endToken ? Number(endToken) : totalBytes - 1;
  } else if (endToken) {
    const suffixLength = Number(endToken);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return "invalid" as const;
    }
    start = Math.max(totalBytes - suffixLength, 0);
    end = totalBytes - 1;
  } else {
    return "invalid" as const;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= totalBytes) {
    return "invalid" as const;
  }
  return {
    start,
    end: Math.min(end, totalBytes - 1),
  };
}

@Controller("ai-control")
export class AiControlController {
  constructor(
    private readonly authService: AuthService,
    private readonly svc: AiControlMdWriterService,
    private readonly assetArchive: AiControlAssetArchiveService,
    private readonly ontologyOrchestration: AiControlOntologyOrchestrationService,
  ) {}

  /** GET /api/ai-control/tree：真实扫描 expert-source 4 级目录（UI 4 级资源树数据来源） */
  @Get("tree")
  async tree(@Query("section") section?: string, @Query("filesOnly") filesOnly?: string) {
    return this.svc.listTree({ section: section ?? null, filesOnly: filesOnly === "1" || filesOnly === "true" });
  }

  /** GET /api/ai-control/diff?path=agents%2Fxxx.md 或 path 留空 = 全量 HEAD vs working-tree */
  @Get("diff")
  async diff(@Query("path") path?: string) {
    try {
      return { diff: await this.svc.diff(path ?? null) };
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/log?n=10 */
  @Get("log")
  async log(@Query("n") nRaw?: string) {
    const n = nRaw ? Math.max(1, Math.min(200, Number(nRaw) || 10)) : 10;
    return { n, log: await this.svc.log(n) };
  }

  /** GET /api/ai-control/local-history：读取本机专家/Skill 快照历史，不依赖 Git，不读取远程 */
  @Get("local-history")
  async localHistory(@Query("path") path?: string, @Query("n") nRaw?: string) {
    const n = nRaw ? Math.max(1, Math.min(100, Number(nRaw) || 20)) : 20;
    try {
      return await this.svc.listLocalHistory({ path: path ?? null, limit: n });
    } catch (e: any) {
      if (e instanceof MdWriter.PathOutsideExpertSourceError || e instanceof MdWriter.SourceRootMissingError) throw new BadRequestException(e.message);
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/local-history/snapshot：给当前文件创建本机回滚点，不写 WorkBuddy 真源 */
  @Post("local-history/snapshot")
  @HttpCode(HttpStatus.OK)
  async createLocalSnapshot(@Body() body: { path: string; note?: string | null }) {
    if (!body?.path) throw new BadRequestException("path 必填（专家源内相对路径）");
    try {
      return await this.svc.createLocalSnapshot({
        path: body.path,
        note: body.note ?? null,
      });
    } catch (e: any) {
      if (e instanceof MdWriter.PathOutsideExpertSourceError || e instanceof MdWriter.SourceRootMissingError || e instanceof MdWriter.MdWriterError) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: null,
        });
      }
      if (e?.code === "ENOENT") throw new NotFoundException(`文件不存在：${body.path}`);
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/local-history/restore-preview：预览恢复到某个本机快照的完整 Diff，不写 WorkBuddy 真源 */
  @Get("local-history/restore-preview")
  async localHistoryRestorePreview(@Query("snapshotId") snapshotId?: string) {
    if (!snapshotId) throw new BadRequestException("snapshotId 必填");
    try {
      return await this.svc.previewLocalSnapshotRestore({ snapshot_id: snapshotId });
    } catch (e: any) {
      if (e instanceof MdWriter.PathOutsideExpertSourceError || e instanceof MdWriter.SourceRootMissingError || e instanceof MdWriter.MdWriterError) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: null,
        });
      }
      if (e?.code === "ENOENT") throw new NotFoundException(`快照不存在：${snapshotId}`);
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/local-history/restore-request：恢复写回确认闸，只返回阻断证据，不写 WorkBuddy 真源 */
  @Post("local-history/restore-request")
  @HttpCode(HttpStatus.OK)
  async localHistoryRestoreRequest(@Body() body: {
    snapshotId?: string;
    confirmDiffSha256?: string | null;
    confirmChanged?: boolean | null;
    createPreRestoreSnapshot?: boolean | null;
    explicitUserAuthorized?: boolean | null;
  }) {
    if (!body?.snapshotId) throw new BadRequestException("snapshotId 必填");
    try {
      return await this.svc.requestLocalSnapshotRestore({
        snapshot_id: body.snapshotId,
        confirm_diff_sha256: body.confirmDiffSha256 ?? null,
        confirm_changed: body.confirmChanged ?? null,
        create_pre_restore_snapshot: body.createPreRestoreSnapshot ?? null,
        explicit_user_authorized: body.explicitUserAuthorized ?? null,
      });
    } catch (e: any) {
      if (e instanceof MdWriter.PathOutsideExpertSourceError || e instanceof MdWriter.SourceRootMissingError || e instanceof MdWriter.MdWriterError) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: null,
        });
      }
      if (e?.code === "ENOENT") throw new NotFoundException(`快照不存在：${body.snapshotId}`);
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/local-history/restore-execute：在完整 Diff 确认和用户显式授权后，真实恢复到本机快照 */
  @Post("local-history/restore-execute")
  @HttpCode(HttpStatus.OK)
  async localHistoryRestoreExecute(@Body() body: {
    snapshotId?: string;
    confirmDiffSha256?: string | null;
    confirmChanged?: boolean | null;
    createPreRestoreSnapshot?: boolean | null;
    explicitUserAuthorized?: boolean | null;
    requestedBy?: string | null;
    note?: string | null;
  }) {
    if (!body?.snapshotId) throw new BadRequestException("snapshotId 必填");
    try {
      return await this.svc.executeLocalSnapshotRestore({
        snapshot_id: body.snapshotId,
        confirm_diff_sha256: body.confirmDiffSha256 ?? null,
        confirm_changed: body.confirmChanged ?? null,
        create_pre_restore_snapshot: body.createPreRestoreSnapshot ?? null,
        explicit_user_authorized: body.explicitUserAuthorized ?? null,
        requested_by: body.requestedBy ?? null,
        note: body.note ?? null,
      });
    } catch (e: any) {
      if (e instanceof MdWriter.PathOutsideExpertSourceError || e instanceof MdWriter.SourceRootMissingError || e instanceof MdWriter.MdWriterError) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: null,
        });
      }
      if (e?.code === "ENOENT") throw new NotFoundException(`快照不存在：${body.snapshotId}`);
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/read?path=agents%2Fxxx.md 无损回读 */
  @Get("read")
  async read(@Query("path") path?: string) {
    if (!path) throw new BadRequestException("需要 path 查询参数（Git 仓内相对路径或绝对路径）");
    try {
      return MdWriter.readMarkdownAtomic(path);
    } catch (e: any) {
      if (e instanceof MdWriter.PathOutsideExpertSourceError || e instanceof MdWriter.GitRootMissingError || e instanceof MdWriter.SourceRootMissingError) throw new BadRequestException(e.message);
      if (e?.code === "ENOENT") throw new NotFoundException(`文件不存在：${path}`);
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/write-policy = 当前专家/Skill 真源写入闸状态 */
  @Get("write-policy")
  async writePolicy() {
    try {
      return await this.svc.writePolicy();
    } catch (e: any) {
      if (e instanceof MdWriter.GitRootMissingError) throw new BadRequestException(e.message);
      if (e instanceof MdWriter.GitInvocationError) {
        throw new InternalServerErrorException({ error_name: e.name, message: e.message, code: e.code, stderr: e.stderr });
      }
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/writeback-readiness：真实写回授权前检查清单与最小样本推荐，只读不写盘 */
  @Get("writeback-readiness")
  async writebackReadiness() {
    try {
      return await this.svc.writebackReadiness();
    } catch (e: any) {
      if (e instanceof MdWriter.PathOutsideExpertSourceError || e instanceof MdWriter.SourceRootMissingError || e instanceof MdWriter.MdWriterError) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: null,
        });
      }
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/writeback-executor-plan：本机快照写盘执行器草案，只读不写盘 */
  @Get("writeback-executor-plan")
  async writebackExecutorPlan(@Query("path") path?: string) {
    try {
      return await this.svc.writebackExecutorPlan({ path: path ?? null });
    } catch (e: any) {
      if (e instanceof MdWriter.PathOutsideExpertSourceError || e instanceof MdWriter.SourceRootMissingError || e instanceof MdWriter.MdWriterError) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: null,
        });
      }
      if (e?.code === "ENOENT") throw new NotFoundException(`文件不存在：${path}`);
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/writeback-executor-simulation：本机快照写盘执行器只读模拟报告，零副作用 */
  @Get("writeback-executor-simulation")
  async writebackExecutorSimulation(@Query("path") path?: string) {
    try {
      return await this.svc.writebackExecutorSimulation({ path: path ?? null });
    } catch (e: any) {
      if (e instanceof MdWriter.PathOutsideExpertSourceError || e instanceof MdWriter.SourceRootMissingError || e instanceof MdWriter.MdWriterError) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: null,
        });
      }
      if (e?.code === "ENOENT") throw new NotFoundException(`文件不存在：${path}`);
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/writeback-executor-contract-tests：真实写盘执行器开放前只读合同测试 */
  @Get("writeback-executor-contract-tests")
  async writebackExecutorContractTests() {
    try {
      return await this.svc.writebackExecutorContractTests();
    } catch (e: any) {
      if (e instanceof MdWriter.PathOutsideExpertSourceError || e instanceof MdWriter.SourceRootMissingError || e instanceof MdWriter.MdWriterError) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: null,
        });
      }
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/assets/archive：统一素材与作品归档只读聚合索引 */
  @Get("assets/archive")
  async assetArchiveIndex(@Query() query: MaterialQuery, @Headers() headers: Record<string, string | string[] | undefined>) {
    const actor = await this.authService.resolveRequestAuthContext(headers);
    if (query.brandId && actor?.brandId && query.brandId !== actor.brandId) throw new ForbiddenException("素材查询品牌与当前工作区不一致");
    const brandId = query.brandId || actor?.brandId;
    if (!brandId) throw new BadRequestException("请先选择品牌");
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", actor);
    return this.assetArchive.getArchive({ ...query, brandId });
  }

  @Post("assets/material-index")
  @HttpCode(HttpStatus.OK)
  async materialIndex(@Body() body: any, @Headers() headers: Record<string, string | string[] | undefined>) {
    const actor = await this.authService.resolveRequestAuthContext(headers);
    if (body.brandId && actor?.brandId && body.brandId !== actor.brandId) throw new ForbiddenException("素材写入品牌与当前工作区不一致");
    const brandId = body.brandId || actor?.brandId;
    if (!brandId || !actor?.userId) throw new BadRequestException("请先登录并选择品牌");
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", actor);
    return this.assetArchive.manageMaterial(brandId, actor.userId, body.operation, body);
  }

  /** GET /api/ai-control/assets/storage：统一素材按 storageKey 读取站内缓存文件 */
  @Get("assets/storage")
  async assetArchiveStorage(
    @Res() response: Response,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("storageKey") storageKey?: string,
    @Query("download") download?: string,
  ) {
    try {
      const file = await this.assetArchive.fetchArchiveStoredObject(storageKey);
      const totalBytes = file.buffer.length;
      const rangeHeader = Array.isArray(headers?.range) ? headers.range[0] : headers?.range;
      const byteRange = resolveHttpByteRange(typeof rangeHeader === "string" ? rangeHeader : undefined, totalBytes);
      response.setHeader("Content-Type", file.contentType);
      response.setHeader("Cache-Control", "private, max-age=300");
      response.setHeader("Accept-Ranges", "bytes");
      response.setHeader(
        "Content-Disposition",
        `${download === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      );
      if (byteRange === "invalid") {
        response.setHeader("Content-Range", `bytes */${totalBytes}`);
        return response.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE).send();
      }
      if (byteRange) {
        const chunk = file.buffer.subarray(byteRange.start, byteRange.end + 1);
        response.setHeader("Content-Length", String(chunk.length));
        response.setHeader("Content-Range", `bytes ${byteRange.start}-${byteRange.end}/${totalBytes}`);
        return response.status(HttpStatus.PARTIAL_CONTENT).send(chunk);
      }
      response.setHeader("Content-Length", String(totalBytes));
      return response.status(HttpStatus.OK).send(file.buffer);
    } catch (e: any) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/assets/archive-registration/preflight：归档登记前证据完整性预检，只读不写库 */
  @Post("assets/archive-registration/preflight")
  @HttpCode(HttpStatus.OK)
  async preflightAssetArchiveRegistration(@Body() body: {
    brandId?: string;
    source?: "creative_material" | "video_work";
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
    originKind?: "user_upload" | "user_folder" | "third_party_generated" | "workbuddy_generated" | "manual_external";
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
  }) {
    try {
      return await this.assetArchive.preflightArchiveRegistration(body);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/assets/archive-registration：登记已有素材/作品，不触发第三方生成 */
  @Post("assets/archive-registration")
  @HttpCode(HttpStatus.OK)
  async registerAssetArchiveItem(@Body() body: {
    brandId?: string;
    source?: "creative_material" | "video_work";
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
    originKind?: "user_upload" | "user_folder" | "third_party_generated" | "workbuddy_generated" | "manual_external";
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
  }) {
    try {
      return await this.assetArchive.registerArchiveItem(body);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/assets/archive-registration/upload：multipart 大文件登记，文件字段 file */
  @Post("assets/archive-registration/upload")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("file", {
    dest: AI_CONTROL_ARCHIVE_UPLOAD_TMP_DIR,
    limits: {
      fileSize: AI_CONTROL_ARCHIVE_UPLOAD_LIMIT_BYTES,
      files: 1,
    },
  }))
  async registerAssetArchiveItemUpload(
    @Body() body: Record<string, unknown>,
    @UploadedFile() file?: { path?: string; originalname?: string; mimetype?: string; size?: number },
  ) {
    if (!file?.path) {
      throw new BadRequestException("请选择要登记的素材文件");
    }
    try {
      return await this.assetArchive.registerArchiveItemFromFile(this.normalizeArchiveUploadBody(body), file);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    } finally {
      await rm(file.path, { force: true }).catch(() => undefined);
    }
  }

  /** POST /api/ai-control/assets/reuse-evidence：记录 Agent 已复用素材的任务/阶段/动作证据，不生成内容 */
  @Post("assets/reuse-evidence")
  @HttpCode(HttpStatus.OK)
  async recordAssetReuseEvidence(@Body() body: {
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
    materialRefs?: Array<{
      evidenceTable?: string;
      recordId?: string;
      source?: "creative_material" | "video_work" | "media_asset" | "business_asset" | "workflow_artifact";
      id?: string;
      title?: string;
      usageRole?: string;
      selectedReason?: string;
    }>;
    idempotencyKey?: string;
    confirmEvidenceOnly?: boolean;
  }) {
    try {
      return await this.assetArchive.recordMaterialReuseEvidence(body);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/ontology/flows：Ontology 编排流程草稿列表 */
  @Get("ontology/elements")
  async getOntologyElementLibrary(@Query("refresh") refresh?: string) {
    try {
      const shouldRefresh = ["1", "true", "yes", "refresh"].includes(String(refresh || "").trim().toLowerCase());
      return await this.ontologyOrchestration.getElementLibrary(shouldRefresh);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/ontology/flows：Ontology 编排流程草稿列表 */
  @Get("ontology/flows")
  async listOntologyOrchestrationFlows(
    @Query("brandId") brandId?: string,
    @Query("limit") limit?: string,
  ) {
    try {
      return await this.ontologyOrchestration.listFlows({
        brandId,
        limit: limit ? Number(limit) : undefined,
      });
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/ontology/published-contract：只读读取 latest published_contract，供 WorkBuddy 路由使用 */
  @Get("ontology/published-contract")
  async getPublishedOntologyContract(
    @Query("flowKey") flowKey?: string,
    @Query("flowId") flowId?: string,
    @Query("brandId") brandId?: string,
    @Query("targetKind") targetKind?: string,
    @Query("targetId") targetId?: string,
  ) {
    try {
      const query: OntologyPublishedContractQuery = {
        flowIdOrKey: flowId || flowKey,
        brandId,
        targetKind,
        targetId,
      };
      return await this.ontologyOrchestration.getPublishedContract(query);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/ontology/execution-plan：只读从 published_contract 派生执行前路由计划 */
  @Get("ontology/execution-plan")
  async getOntologyExecutionPlan(
    @Query("flowKey") flowKey?: string,
    @Query("flowId") flowId?: string,
    @Query("brandId") brandId?: string,
    @Query("targetKind") targetKind?: string,
    @Query("targetId") targetId?: string,
    @Query("userIntent") userIntent?: string,
    @Query("taskId") taskId?: string,
  ) {
    try {
      const query: OntologyExecutionPlanQuery = {
        flowIdOrKey: flowId || flowKey,
        brandId,
        targetKind,
        targetId,
        userIntent,
        taskId,
      };
      return await this.ontologyOrchestration.getExecutionPlan(query);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/execution-plan/evidence：记录执行前计划确认/留证，不触发执行 */
  @Post("ontology/execution-plan/evidence")
  @HttpCode(HttpStatus.OK)
  async recordOntologyExecutionPlanEvidence(@Body() body: OntologyExecutionPlanEvidenceInput) {
    try {
      return await this.ontologyOrchestration.recordExecutionPlanEvidence(body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/execution-node/evidence：记录单个 Ontology 节点受控推进证据，不自动执行 */
  @Post("ontology/execution-node/evidence")
  @HttpCode(HttpStatus.OK)
  async recordOntologyExecutionNodeEvidence(@Body() body: OntologyExecutionNodeEvidenceInput) {
    try {
      return await this.ontologyOrchestration.recordExecutionNodeEvidence(body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/ontology/flows/:flowId/publish-preview：发布候选契约预览，只读不发布 */
  @Get("ontology/flows/:flowId/publish-preview")
  async getOntologyPublishPreview(@Param("flowId") flowId: string) {
    try {
      return await this.ontologyOrchestration.getPublishPreview(flowId);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/structure-scan：只读扫描当前画布绑定的 expert-source 文件 */
  @Post("ontology/flows/:flowId/structure-scan")
  @HttpCode(HttpStatus.OK)
  async scanOntologyFlowStructure(@Param("flowId") flowId: string) {
    try {
      return await this.ontologyOrchestration.scanStructure(flowId);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/ontology/flows/:flowId/structure-changes：读取当前画布节点级结构变化摘要 */
  @Get("ontology/flows/:flowId/structure-changes")
  async getOntologyFlowStructureChanges(@Param("flowId") flowId: string) {
    try {
      return await this.ontologyOrchestration.getStructureChanges(flowId);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/canvas-sync：按专家团注册表检测并更新当前画布 */
  @Post("ontology/flows/:flowId/canvas-sync")
  @HttpCode(HttpStatus.OK)
  async syncOntologyFlowCanvas(@Param("flowId") flowId: string, @Body() body: { updatedBy?: string; note?: string }) {
    try {
      return await this.ontologyOrchestration.syncCanvasFromExpertTeam(flowId, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/ontology/flows/:flowId/versions：读取当前项目历史版本列表，供版本回退工作区使用 */
  @Get("ontology/flows/:flowId/versions")
  async getOntologyFlowVersions(@Param("flowId") flowId: string) {
    try {
      return await this.ontologyOrchestration.listFlowVersions(flowId);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey/versions：读取当前节点历史版本摘要 */
  @Get("ontology/flows/:flowId/nodes/:nodeKey/versions")
  async getOntologyNodeVersions(
    @Param("flowId") flowId: string,
    @Param("nodeKey") nodeKey: string,
  ) {
    try {
      return await this.ontologyOrchestration.listNodeVersions(flowId, nodeKey);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/rollback-draft：从指定历史版本生成新的回退草稿 */
  @Post("ontology/flows/:flowId/rollback-draft")
  @HttpCode(HttpStatus.OK)
  async createOntologyRollbackDraft(
    @Param("flowId") flowId: string,
    @Body() body: {
      versionId?: string;
      versionNo?: number;
      rollbackBy?: string;
      note?: string;
    },
  ) {
    try {
      return await this.ontologyOrchestration.createRollbackDraft(flowId, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey/rollback-draft：把当前节点恢复到指定历史版本 */
  @Post("ontology/flows/:flowId/nodes/:nodeKey/rollback-draft")
  @HttpCode(HttpStatus.OK)
  async createOntologyNodeRollbackDraft(
    @Param("flowId") flowId: string,
    @Param("nodeKey") nodeKey: string,
    @Body() body: {
      versionId?: string;
      versionNo?: number;
      rollbackBy?: string;
      note?: string;
    },
  ) {
    try {
      return await this.ontologyOrchestration.createNodeRollbackDraft(flowId, nodeKey, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/publish：确认发布 Ontology 契约版本，不写专家真源 */
  @Post("ontology/flows/:flowId/publish")
  @HttpCode(HttpStatus.OK)
  async publishOntologyFlow(@Param("flowId") flowId: string, @Body() body: OntologyPublishInput) {
    try {
      return await this.ontologyOrchestration.publishFlow(flowId, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/publish-and-sync：发布正式契约并立即尝试同步专家真源 */
  @Post("ontology/flows/:flowId/publish-and-sync")
  @HttpCode(HttpStatus.OK)
  async publishAndSyncOntologyFlow(@Param("flowId") flowId: string, @Body() body: OntologyPublishAndSyncInput) {
    try {
      return await this.ontologyOrchestration.publishAndSyncFlow(flowId, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/ontology/flows/:flowId/expert-source-diff-preview：把 published_contract 翻译为专家源候选 Diff，只读不写盘 */
  @Get("ontology/flows/:flowId/expert-source-diff-preview")
  async getOntologyExpertSourceDiffPreview(
    @Param("flowId") flowId: string,
    @Query("includeCandidateMd") includeCandidateMd?: string,
  ) {
    try {
      const includeCandidate = ["1", "true", "yes", "on"].includes(String(includeCandidateMd || "").trim().toLowerCase());
      return await this.ontologyOrchestration.getExpertSourceDiffPreview(flowId, { includeCandidateMd: includeCandidate });
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/expert-source-writeback-request：Ontology 专家源写回确认闸，只返回闸门证据 */
  @Post("ontology/flows/:flowId/expert-source-writeback-request")
  @HttpCode(HttpStatus.OK)
  async requestOntologyExpertSourceWriteback(
    @Param("flowId") flowId: string,
    @Body() body: OntologyExpertSourceWritebackRequestInput,
  ) {
    try {
      return await this.ontologyOrchestration.requestExpertSourceWriteback(flowId, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/expert-source-writeback-execute：Ontology 专家源受控真实写回；未过闸时不写盘 */
  @Post("ontology/flows/:flowId/expert-source-writeback-execute")
  @HttpCode(HttpStatus.OK)
  async executeOntologyExpertSourceWriteback(
    @Param("flowId") flowId: string,
    @Body() body: OntologyExpertSourceWritebackRequestInput,
  ) {
    try {
      return await this.ontologyOrchestration.executeExpertSourceWriteback(flowId, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/ontology/flows/:flowId：读取 Ontology 编排流程草稿详情 */
  @Get("ontology/flows/:flowId")
  async getOntologyOrchestrationFlow(@Param("flowId") flowId: string) {
    try {
      return await this.ontologyOrchestration.getFlow(flowId);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/ontology/elements/dictionary：读取五元素字典只读种子 */
  @Get("ontology/elements/dictionary")
  async getOntologyElementDictionary(@Query("scope") scope?: string) {
    try {
      return await this.ontologyOrchestration.getElementDictionary(scope);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** DELETE /api/ai-control/ontology/flows/:flowId：删除指定 Ontology 编排项目及其快照，不改 WorkBuddy 真源 */
  @Delete("ontology/flows/:flowId")
  async deleteOntologyOrchestrationFlow(
    @Param("flowId") flowId: string,
    @Body() body: { deletedBy?: string; note?: string },
  ) {
    try {
      return await this.ontologyOrchestration.deleteFlow(flowId, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/draft：保存 Ontology 编排草稿与快照，不发布执行契约 */
  @Post("ontology/flows/draft")
  @HttpCode(HttpStatus.OK)
  async saveOntologyOrchestrationDraft(@Body() body: OntologyFlowDraftInput) {
    try {
      const result = await this.ontologyOrchestration.saveDraft(body || {});
      return {
        ...(result as any),
        flow: (result as any)?.item || null,
      };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/ai-draft：读取专家配置文档并生成 Ontology AI 草案 */
  @Post("ontology/flows/ai-draft")
  @HttpCode(HttpStatus.OK)
  async generateOntologyAiDraft(@Body() body: OntologyAiDraftGenerateInput) {
    try {
      const result = await this.ontologyOrchestration.generateAiDraft(body || {});
      const item = ((result as any)?.item || {}) as Record<string, any>;
      const nodeCount = Array.isArray(item.nodes) ? item.nodes.length : 0;
      const edgeCount = Array.isArray(item.edges) ? item.edges.length : 0;
      const versionCount = Array.isArray(item.versions) ? item.versions.length : 0;
      return {
        ok: (result as any)?.ok ?? true,
        generated: (result as any)?.generated ?? true,
        published: (result as any)?.published ?? false,
        reusedExisting: (result as any)?.reusedExisting ?? false,
        boundary: (result as any)?.boundary,
        aiDraft: (result as any)?.aiDraft,
        item: {
          id: item.id,
          flowKey: item.flowKey,
          name: item.name,
          description: item.description,
          status: item.status,
          brandId: item.brandId,
          workspaceScope: item.workspaceScope,
          targetKind: item.targetKind,
          targetId: item.targetId,
          targetName: item.targetName,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          nodeCount,
          edgeCount,
          versionCount,
        },
        flow: {
          id: item.id,
          flowKey: item.flowKey,
          name: item.name,
          status: item.status,
          targetKind: item.targetKind,
          targetId: item.targetId,
          targetName: item.targetName,
          nodeCount,
          edgeCount,
          versionCount,
        },
      };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey/references：更新草稿节点引用元素，不发布执行契约 */
  @Post("ontology/flows/:flowId/nodes/:nodeKey/references")
  @HttpCode(HttpStatus.OK)
  async updateOntologyNodeReferences(
    @Param("flowId") flowId: string,
    @Param("nodeKey") nodeKey: string,
    @Body() body: OntologyNodeReferencesInput,
  ) {
    try {
      return await this.ontologyOrchestration.updateNodeReferences(flowId, nodeKey, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/nodes：新增或更新草稿节点五元素，不发布执行契约 */
  @Post("ontology/flows/:flowId/nodes")
  @HttpCode(HttpStatus.OK)
  async upsertOntologyNode(
    @Param("flowId") flowId: string,
    @Body() body: OntologyNodeDraftInput,
  ) {
    try {
      return await this.ontologyOrchestration.upsertNode(flowId, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** DELETE /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey：删除草稿节点，不发布执行契约 */
  @Delete("ontology/flows/:flowId/nodes/:nodeKey")
  @HttpCode(HttpStatus.OK)
  async deleteOntologyNode(
    @Param("flowId") flowId: string,
    @Param("nodeKey") nodeKey: string,
    @Body() body: { updatedBy?: string; note?: string } = {},
  ) {
    try {
      return await this.ontologyOrchestration.deleteNode(flowId, nodeKey, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/edges：新增或更新草稿连线规则，不发布执行契约 */
  @Post("ontology/flows/:flowId/edges")
  @HttpCode(HttpStatus.OK)
  async upsertOntologyEdge(
    @Param("flowId") flowId: string,
    @Body() body: OntologyEdgeDraftInput,
  ) {
    try {
      return await this.ontologyOrchestration.upsertEdge(flowId, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** DELETE /api/ai-control/ontology/flows/:flowId/edges/:edgeKey：删除草稿连线规则，不发布执行契约 */
  @Delete("ontology/flows/:flowId/edges/:edgeKey")
  @HttpCode(HttpStatus.OK)
  async deleteOntologyEdge(
    @Param("flowId") flowId: string,
    @Param("edgeKey") edgeKey: string,
    @Body() body: { updatedBy?: string; note?: string } = {},
  ) {
    try {
      return await this.ontologyOrchestration.deleteEdge(flowId, edgeKey, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/ontology/flows/:flowId/rules：更新草稿确认闸与证据规则，不发布执行契约 */
  @Post("ontology/flows/:flowId/rules")
  @HttpCode(HttpStatus.OK)
  async updateOntologyFlowRules(
    @Param("flowId") flowId: string,
    @Body() body: OntologyFlowRulesInput,
  ) {
    try {
      return await this.ontologyOrchestration.updateFlowRules(flowId, body || {});
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/expert-source/mount-guide：读取专家源挂载状态与本机目录向导 */
  @Get("expert-source/mount-guide")
  async expertSourceMountGuide() {
    try {
      return await this.svc.expertSourceMountGuide();
    } catch (e: any) {
      if (e instanceof MdWriter.PathOutsideExpertSourceError || e instanceof MdWriter.SourceRootMissingError || e instanceof MdWriter.MdWriterError) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: null,
        });
      }
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/expert-source/mount-request：记录用户期望挂载的 WorkBuddy 专家源目录，不直接改 Docker */
  @Post("expert-source/mount-request")
  @HttpCode(HttpStatus.OK)
  async expertSourceMountRequest(@Body() body: { hostPath?: string; mountMode?: string | null }) {
    if (!body?.hostPath) throw new BadRequestException("hostPath 必填");
    try {
      return await this.svc.requestExpertSourceMount({
        host_path: body.hostPath,
        mount_mode: body.mountMode ?? null,
      });
    } catch (e: any) {
      if (e instanceof MdWriter.MdWriterError) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: null,
        });
      }
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/preview = 保存前 dry-run：返回候选 Markdown 与完整 diff，不写盘、不提交 */
  @Post("preview")
  @HttpCode(HttpStatus.OK)
  async preview(@Body() body: {
    kind: MdWriter.MarkdownKind;
    path: string;
    fields: Record<string, unknown>;
  }) {
    if (!body?.kind || !["expert", "skill", "prompt"].includes(body.kind)) {
      throw new BadRequestException(`kind 必须是 expert | skill | prompt，收到 ${body?.kind}`);
    }
    if (!body?.path) throw new BadRequestException("path 必填（Git 仓内相对路径，例如 agents/douyin-copy-expert.md）");
    if (!body?.fields || typeof body.fields !== "object") throw new BadRequestException("fields 必填 对象");
    try {
      return await this.svc.preview({
        kind: body.kind,
        rel_or_abs_path: body.path,
        fields: body.fields,
      });
    } catch (e: any) {
      if (
          e instanceof MdWriter.GitRootMissingError ||
          e instanceof MdWriter.SourceRootMissingError ||
        e instanceof MdWriter.PathOutsideExpertSourceError ||
        e instanceof MdWriter.UnknownFieldError ||
        e instanceof MdWriter.UnknownKindError
      ) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: null,
        });
      }
      if (e?.code === "ENOENT") throw new NotFoundException(`文件不存在：${body.path}`);
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/save = md-writer 保存链路（UI 9 板块 Tab ② 提交） */
  @Post("save-request")
  @HttpCode(HttpStatus.OK)
  async saveRequest(@Body() body: {
    kind: MdWriter.MarkdownKind;
    path: string;
    fields: Record<string, unknown>;
    confirmDiffSha256?: string | null;
    confirmCandidateSha256?: string | null;
    createPreWriteSnapshot?: boolean | null;
    explicitUserAuthorized?: boolean | null;
  }) {
    if (!body?.kind || !["expert", "skill", "prompt"].includes(body.kind)) {
      throw new BadRequestException(`kind 必须是 expert | skill | prompt，收到 ${body?.kind}`);
    }
    if (!body?.path) throw new BadRequestException("path 必填（专家源内相对路径）");
    if (!body?.fields || typeof body.fields !== "object") throw new BadRequestException("fields 必填 对象");
    try {
      return await this.svc.requestSaveWriteback({
        kind: body.kind,
        rel_or_abs_path: body.path,
        fields: body.fields,
        confirm_diff_sha256: body.confirmDiffSha256 ?? null,
        confirm_candidate_sha256: body.confirmCandidateSha256 ?? null,
        create_pre_write_snapshot: body.createPreWriteSnapshot ?? null,
        explicit_user_authorized: body.explicitUserAuthorized ?? null,
      });
    } catch (e: any) {
      if (
        e instanceof MdWriter.GitDirtyError ||
        e instanceof MdWriter.GitRootMissingError ||
        e instanceof MdWriter.PathOutsideExpertSourceError ||
        e instanceof MdWriter.MdWriterError ||
        e instanceof MdWriter.UnknownFieldError ||
        e instanceof MdWriter.UnknownKindError
      ) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: (e as any)?.porcelain ?? null,
        });
      }
      if (e?.code === "ENOENT") throw new NotFoundException(`文件不存在：${body.path}`);
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/save = md-writer 保存链路（UI 9 板块 Tab ② 提交） */
  @Post("save")
  @HttpCode(HttpStatus.OK)
  async save(@Body() body: {
    kind: MdWriter.MarkdownKind;
    path: string;
    fields: Record<string, unknown>;
    commit_message?: string | null;
  }) {
    if (!body?.kind || !["expert", "skill", "prompt"].includes(body.kind)) {
      throw new BadRequestException(`kind 必须是 expert | skill | prompt，收到 ${body?.kind}`);
    }
    if (!body?.path) throw new BadRequestException("path 必填（Git 仓内相对路径，例如 agents/douyin-copy-expert.md）");
    if (!body?.fields || typeof body.fields !== "object") throw new BadRequestException("fields 必填 对象");
    try {
      return await this.svc.save({
        kind: body.kind,
        rel_or_abs_path: body.path,
        fields: body.fields,
        commit_message: body.commit_message ?? null,
      });
    } catch (e: any) {
      if (
        e instanceof MdWriter.GitDirtyError ||
        e instanceof MdWriter.GitRootMissingError ||
        e instanceof MdWriter.PathOutsideExpertSourceError ||
        e instanceof MdWriter.MdWriterError ||
        e instanceof MdWriter.UnknownFieldError ||
        e instanceof MdWriter.UnknownKindError
      ) {
        throw new BadRequestException({
          error_name: e.name,
          message: e.message,
          details: (e as any)?.porcelain ?? null,
        });
      }
      if (e instanceof MdWriter.GitInvocationError) {
        throw new InternalServerErrorException({ error_name: e.name, message: e.message, code: e.code, stderr: e.stderr });
      }
      throw new InternalServerErrorException(e?.message ?? String(e));
    }
  }

  /** POST /api/ai-control/reset-hard = 顶栏回滚按钮 → 真实子进程 reset --hard */
  @Post("reset-hard")
  @HttpCode(HttpStatus.OK)
  async resetHard(@Body() body: { hash: string; force_yes: boolean }) {
    if (!body?.hash) throw new BadRequestException("需要 hash（例如 HEAD 或 2f3c75c）");
    if (!body?.force_yes) throw new BadRequestException("需要 force_yes=true，UI 必须先展示 target..HEAD 文件影响面");
    try {
      return { stdout: await this.svc.resetHard(body.hash, true) };
    } catch (e: any) {
      if (e instanceof MdWriter.GitInvocationError) {
        throw new BadRequestException({ error_name: e.name, message: e.message, code: e.code, stderr: e.stderr });
      }
      throw new BadRequestException(e?.message ?? String(e));
    }
  }

  /** GET /api/ai-control/export/readme.md：把 save.md 规范下推给前端 404 页和调试下载用 */
  @Get("export/readme.md")
  async readme(@Res() res: Response) {
    const txt = [
      "# AI 智控中心 md-writer 规范",
      "",
      "- 权威源：A-专家团优化开发交接包/references/expert-source（Git 2f3c75c 首次快照）",
      "- 3 类 kind 白名单字段：",
      "  - expert: title, role, use, constraint, owner, contract, exceptions",
      "  - skill : title, role, use, constraint, owner, input_schema, output_schema, fallback",
      "  - prompt: title, role, use, constraint, owner, variables, template",
      "- save 前必须：git status clean → 否则 GitDirtyError",
      "- reset-hard 必须：force_yes=true；执行前 UI 展示 target..HEAD diff 文件列表让用户确认",
      "- 备份锚点（PASS）：项目总控/证据/backups/backup-env-20260927-150642.zip 1.41GB",
      "",
    ].join("\n");
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.send(txt);
  }

  private normalizeArchiveUploadBody(body: Record<string, unknown>) {
    return {
      brandId: this.textBody(body.brandId),
      source: this.textBody(body.source) as "creative_material" | "video_work" | undefined,
      workspaceScope: this.textBody(body.workspaceScope),
      createdByUserId: this.textBody(body.createdByUserId),
      title: this.textBody(body.title),
      description: this.textBody(body.description),
      materialType: this.textBody(body.materialType),
      materialTags: this.listBody(body.materialTags),
      assetUrl: this.textBody(body.assetUrl),
      fileName: this.textBody(body.fileName),
      mimeType: this.textBody(body.mimeType),
      storageKey: this.textBody(body.storageKey),
      textContent: this.textBody(body.textContent),
      originKind: this.textBody(body.originKind) as any,
      folderPath: this.textBody(body.folderPath),
      folderMode: this.textBody(body.folderMode) as "browser_directory" | "",
      folderFileCount: this.numberBody(body.folderFileCount),
      folderSampleFiles: this.listBody(body.folderSampleFiles),
      sourceKind: this.textBody(body.sourceKind),
      coverImageUrl: this.textBody(body.coverImageUrl),
      scriptContent: this.textBody(body.scriptContent),
      taskId: this.textBody(body.taskId),
      stageRunId: this.textBody(body.stageRunId),
      artifactKind: this.textBody(body.artifactKind),
      idempotencyKey: this.textBody(body.idempotencyKey),
      confirmNoGeneration: this.booleanBody(body.confirmNoGeneration),
    };
  }

  private textBody(value: unknown) {
    return String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim() || undefined;
  }

  private numberBody(value: unknown) {
    const normalized = Number(this.textBody(value) || 0);
    return Number.isFinite(normalized) ? normalized : 0;
  }

  private booleanBody(value: unknown) {
    const normalized = String(this.textBody(value) || "").toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  private listBody(value: unknown) {
    const normalized = this.textBody(value);
    if (!normalized) return [];
    if (normalized.startsWith("[")) {
      try {
        const parsed = JSON.parse(normalized);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item || "").trim()).filter(Boolean);
        }
      } catch {
        return [];
      }
    }
    return normalized.split(/[\n|,]/g).map((item) => item.trim()).filter(Boolean);
  }
}
