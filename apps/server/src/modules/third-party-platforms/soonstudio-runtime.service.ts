import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { SOONSTUDIO_MODELS, getSoonStudioModel, listSoonStudioModels, type SoonStudioModelQuery } from '../../common/soonstudio-model-catalog';
import { PrismaService } from '../../prisma/prisma.service';
import { ThirdPartyPlatformsService } from './third-party-platforms.service';
import { createSoonStudioClient, getSoonStudioModelProfiles, SOONSTUDIO_API_ORIGIN, SoonStudioInputError, type SoonStudioCall, type SoonStudioReceipt } from './soonstudio-api';

const TYPE = 'soonstudio_generation';
const obj = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function canonical(value: any): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
export type SoonStudioSubmitPayload = { requestId: string; model: string; profile: SoonStudioCall['profile']; endpoint?: string; body: SoonStudioCall['body']; files?: SoonStudioCall['files'] };

// Never put input bodies, upload bytes or credentials into the Task table. Output
// is bounded, strips inline images/audio and redacts the current credential even
// if an upstream mistakenly reflects it. Media URLs are receipts, not archives.
function safeValue(value: unknown, secret = '', depth = 0): any {
  if (depth > 12) return '[omitted: nesting limit]';
  if (typeof value === 'string') {
    if (/^(?:data:|[A-Za-z0-9+/]{200,}={0,2}$)/i.test(value)) return '[omitted: inline binary]';
    const redacted = secret ? value.split(secret).join('[redacted]') : value;
    return redacted.slice(0, 100_000);
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 100).map(item => safeValue(item, secret, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 200).filter(([key]) => !/api[-_]?key|authorization|access[-_]?token|secret|base64|b64_json/i.test(key)).map(([key, item]) => [key.slice(0, 160), safeValue(item, secret, depth + 1)]));
  return null;
}
function hasInlineBinary(value: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (typeof value === 'string') return /^(?:data:|[A-Za-z0-9+/]{200,}={0,2}$)/i.test(value);
  if (Array.isArray(value)) return value.some(item => hasInlineBinary(item, depth + 1));
  return !!value && typeof value === 'object' && Object.entries(value).some(([key, item]) => /base64|b64_json/i.test(key) && !!item || hasInlineBinary(item, depth + 1));
}

@Injectable()
export class SoonStudioRuntimeService {
  protected client = createSoonStudioClient(SOONSTUDIO_MODELS);
  private readonly workerId = randomUUID();
  private readonly refreshing = new Map<string, Promise<any>>();
  constructor(private readonly db: PrismaService, private readonly platforms: ThirdPartyPlatformsService) {}

  listModels(input: SoonStudioModelQuery & { type?: string; kind?: string; query?: string } = {}) {
    const primaryType = input.primaryType || input.type || input.kind;
    if (primaryType && !['text', 'image', 'video', 'audio'].includes(primaryType)) throw new BadRequestException('模型类型不正确');
    return { ...listSoonStudioModels({ ...input, search: input.search || input.query, primaryType: primaryType as SoonStudioModelQuery['primaryType'], limit: Math.max(1, Math.min(100, Math.trunc(Number(input.limit) || 30))), includeDeprecated: String(input.includeDeprecated) === 'true', supportedOnly: String(input.supportedOnly) === 'true', includeContracts: false }), inferenceVerified: false };
  }
  getModel(modelId: string) {
    const model = getSoonStudioModel(modelId);
    if (!model) throw new NotFoundException('SoonStudio模型不在已同步官方目录中');
    const profiles = getSoonStudioModelProfiles(model);
    return { ...model, profiles, runtimeAvailable: profiles.length > 0 && !model.deprecated && !model.unsupportedReason, inferenceVerified: false };
  }
  private brand(brandId: string) { if (typeof brandId !== 'string' || !brandId.trim() || brandId.length > 160) throw new BadRequestException('请先选择品牌'); }
  private async key(brandId: string) {
    const access = await this.platforms.resolveBrandRuntimeApiKeys(brandId, [SOONSTUDIO_API_ORIGIN]);
    if (access.status !== 'resolved' || access.resolvedFrom !== 'brand' || !access.apiKeys[0]) throw new BadRequestException('请先在当前品牌配置SoonStudio凭据');
    return access.apiKeys[0];
  }
  private async owned(brandId: string, id: string) {
    this.brand(brandId);
    if (typeof id !== 'string' || !/^ss_[a-f0-9]{64}$/.test(id)) throw new NotFoundException('SoonStudio任务不存在');
    const row = await this.db.task.findFirst({ where: { id, brandId, taskType: TYPE } });
    if (!row) throw new NotFoundException('SoonStudio任务不存在或不属于当前品牌');
    return row;
  }
  async submit(brandId: string, payload: SoonStudioSubmitPayload, userId: string) {
    this.brand(brandId);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).some(key => !['requestId', 'model', 'profile', 'endpoint', 'body', 'files'].includes(key)) || typeof payload.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,160}$/.test(payload.requestId) || typeof userId !== 'string' || !userId.trim() || typeof payload.model !== 'string' || typeof payload.profile !== 'string' || !payload.profile || payload.profile.length > 80 || (payload.endpoint !== undefined && (typeof payload.endpoint !== 'string' || payload.endpoint.length > 200)) || !payload.body || typeof payload.body !== 'object') throw new BadRequestException('请核对模型、请求标识及官方请求参数');
    const model = this.getModel(payload.model);
    if (model.deprecated || model.unsupportedReason) throw new BadRequestException(model.unsupportedReason || '该模型已被官方停用');
    if (Buffer.byteLength(JSON.stringify(payload.body)) > 1024 * 1024) throw new BadRequestException('请求参数超过1MB，请减少输入内容');
    if (payload.files !== undefined && (!Array.isArray(payload.files) || payload.files.length > 5 || payload.files.some(file => !file || typeof file.dataBase64 !== 'string' || file.dataBase64.length > 14 * 1024 * 1024) || payload.files.reduce((sum, file) => sum + file.dataBase64.length, 0) > 28 * 1024 * 1024)) throw new BadRequestException('上传内容过大或格式不正确');
    const id = 'ss_' + hash(brandId + '\0' + payload.requestId), requestHash = hash(canonical({ model: model.id, profile: payload.profile, endpoint: payload.endpoint, body: payload.body, files: payload.files }));
    const previous = await this.db.task.findFirst({ where: { id, brandId, taskType: TYPE } });
    if (previous) { if (obj(previous.inputJson).requestHash !== requestHash) throw new ConflictException('该请求标识已用于其他输入；请先读取原任务'); return this.view(previous); }
    const key = await this.key(brandId);
    const nativeTaskId = payload.profile === 'runware' || payload.profile === 'runware-native' || payload.endpoint === '/runware/v1' || model.endpoints.includes('runware-native') ? randomUUID() : undefined;
    let row;
    try { row = await this.db.task.create({ data: { id, brandId, userId, taskType: TYPE, taskStatus: 'RUNNING', taskTitle: `SoonStudio · ${model.name}`.slice(0, 180), modelName: model.id, startedAt: new Date(), inputJson: { model: model.id, profile: payload.profile, requestHash, workerId: this.workerId, ...(nativeTaskId ? { nativeTaskId } : {}) } } }); }
    catch (error: any) { if (error?.code !== 'P2002') throw error; const existing = await this.owned(brandId, id); if (obj(existing.inputJson).requestHash !== requestHash) throw new ConflictException('该请求标识已用于其他输入'); return this.view(existing); }
    // Reservation is committed before the one paid POST. Lost responses never
    // cause automatic replay; refresh can only query a saved provider receipt.
    void this.execute(row.id, key, { model: model.id, profile: payload.profile, endpoint: payload.endpoint, body: payload.body, files: payload.files, nativeTaskId }).catch(() => {});
    return this.view(row);
  }
  async read(brandId: string, taskId: string) { return this.view(await this.owned(brandId, taskId)); }
  async refresh(brandId: string, taskId: string) {
    const row = await this.owned(brandId, taskId), receipt = obj(row.outputJson).receipt as SoonStudioReceipt | undefined;
    if (!receipt?.query || !receipt.providerTaskId) {
      if (receipt?.status === 'SUCCESS' || receipt?.status === 'FAILED') return this.view(row);
      throw new ConflictException('没有可核验的原平台任务查询回执；请先核对平台用量，系统不会重新生成');
    }
    if (receipt.status === 'SUCCESS' || receipt.status === 'FAILED') return this.view(row);
    const pending = this.refreshing.get(taskId); if (pending) return pending;
    const operation = (async () => { const key = await this.key(brandId); try { return this.view(await this.persist(taskId, await this.client.query(key, receipt), key)); } catch { throw new BadRequestException('原平台任务查询未确认；原回执已保留，没有重新生成'); } })().finally(() => this.refreshing.delete(taskId));
    this.refreshing.set(taskId, operation); return operation;
  }
  private async execute(id: string, key: string, call: SoonStudioCall) {
    try { await this.persist(id, await this.client.submit(key, call), key); }
    catch (error) {
      const state = error instanceof SoonStudioInputError ? 'FAILED' : 'UNKNOWN';
      await this.db.task.update({ where: { id }, data: { taskStatus: 'FAILED', finishedAt: new Date(), outputJson: { state, message: state === 'FAILED' ? '官方请求契约校验未通过，没有发出生成请求。' : '提交结果和费用待核对；系统不会重发生成请求。' } } });
    }
  }
  private async persist(id: string, receipt: SoonStudioReceipt, key: string) {
    let safe = safeValue(receipt, key) as SoonStudioReceipt;
    let artifactOmitted = hasInlineBinary(receipt.result);
    if (Buffer.byteLength(JSON.stringify(safe)) > 512 * 1024) { artifactOmitted = true; safe = { model: safe.model, profile: safe.profile, status: safe.status, ...(safe.providerTaskId ? { providerTaskId: safe.providerTaskId } : {}), ...(safe.query ? { query: safe.query } : {}), result: { omitted: '结果超过512KB，保留原平台任务回执，请查询平台结果。' } }; }
    return this.db.task.update({ where: { id }, data: { taskStatus: receipt.status === 'SUCCESS' ? 'SUCCESS' : receipt.status === 'IN_PROGRESS' ? 'RUNNING' : 'FAILED', finishedAt: receipt.status === 'IN_PROGRESS' ? null : new Date(), outputJson: { state: receipt.status, receipt: safe, mediaArchived: false, artifactOmitted, resultNeedsArchive: artifactOmitted, deliveryState: artifactOmitted ? 'INCOMPLETE' : 'RECEIPT_ONLY', ...(artifactOmitted ? { message: '平台已返回，但内嵌二进制或超限结果未归档，不能视为素材交付完成；请核对原平台结果，不要重新生成。' } : {}) } as any } });
  }
  private view(row: any) {
    const input = obj(row.inputJson), output = obj(row.outputJson), receipt = output.receipt;
    const interrupted = !output.state && row.taskStatus === 'RUNNING' && input.workerId !== this.workerId;
    return { id: row.id, model: input.model, profile: input.profile, state: interrupted ? 'UNKNOWN' : output.state || 'RUNNING', createdAt: row.createdAt, updatedAt: row.updatedAt, ...(receipt ? { receipt } : {}), mediaArchived: false, artifactOmitted: output.artifactOmitted === true, resultNeedsArchive: output.resultNeedsArchive === true, deliveryState: output.deliveryState || 'PENDING', ...(interrupted ? { message: '执行进程已更换，提交结果与费用待核对；系统不会重发。' } : output.message ? { message: output.message } : {}) };
  }
}
