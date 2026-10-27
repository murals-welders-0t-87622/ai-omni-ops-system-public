import { randomUUID } from "node:crypto";
import { normalizePlanningTarget } from "@ai-omni/shared/commerce-planning";
const kinds = ["main_copy", "detail_copy", "video_concept", "main_images", "detail_images", "video_generate"];
const labels: Record<string, string> = { main_copy: "主图与商品文案", detail_copy: "详情页文案与画面方案", video_concept: "商品视频创意", main_images: "主图画面", detail_images: "详情页画面", video_generate: "商品视频" };
const active = ["QUEUED", "RUNNING"];
const obj = (v: any) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
const txt = (v: any, max = 2000) => { if (typeof v !== "string" || !v.trim() || v.length > max) throw Error("任务参数不完整"); return v.trim(); };
export function detailTaskView(t: any) {
  const i = obj(t.inputJson), o = obj(t.outputJson);
  return { id: t.id, title: t.taskTitle, projectId: i.projectId, jobKind: i.jobKind, targetScenario: i.targetScenario, generationMode: i.generationMode || "create", targetIndexes: i.targetIndexes || [], projectRevision: i.revision, state: t.taskStatus, message: t.errorMessage || o.message || "", createdAt: t.createdAt, finishedAt: t.finishedAt, resultRevision: o.revision ?? null, interrupted: t.taskStatus === "RUNNING" && Date.parse(i.lease?.expiresAt || "") < Date.now() };
}
export async function detailTaskAction(db: any, brandId: string, actorId: string, action: string, p: any, executor: any) {
  const now = new Date();
  if (action === "commerce_request_plan_task") {
    if (!executor || !executor.capabilities.includes("operations_replan") || Date.now() - executor.at > 90000) throw Error("本机Codex经营规划能力尚未就绪，请连接执行器后重试");
    const row = await db.businessAsset.findFirst({ where: { id: txt(p.planId, 160), brandId } }), m = obj(row?.metadataJson);
    if (m.kind !== "COMMERCE_OPERATIONS_PLAN" || m.revision !== p.expectedRevision || !m.operatingMap || !m.scorecard) throw Error("当前经营方案已更新或尚未建立目标，请刷新后重排");
    const targetScenario = normalizePlanningTarget(p.targetScenario);
    if (await db.task.findFirst({ where: { brandId, taskType: "commerce_detail_ai", taskStatus: { in: active }, inputJson: { path: ["projectId"], equals: row.id } } })) throw Error("该方案已有Codex重排任务，完成后再调整目标");
    const job = await db.task.create({ data: { userId: actorId, brandId, taskType: "commerce_detail_ai", taskStatus: "QUEUED", taskTitle: row.title + " · 按新目标重排指标与策略", modelName: "codex-local", inputJson: { projectId: row.id, revision: m.revision, jobKind: "operations_replan", targetScenario, sourcePlan: { ...m, id: row.id, title: row.title }, instructions: typeof p.instructions === "string" ? p.instructions.slice(0, 6000) : "" } } });
    return { id: job.id, queued: true };
  }
  if (action === "commerce_request_detail_task") {
    if (!kinds.includes(p.jobKind)) throw Error("不支持的制作任务");
    if (!executor || !executor.capabilities.includes(p.jobKind) || Date.now() - executor.at > 90000) throw Error("本机Codex执行器未就绪或不支持此制作，请先连接后重试");
    const row = await db.businessAsset.findFirst({ where: { id: txt(p.projectId, 160), brandId } }), m = obj(row?.metadataJson);
    if (m.kind !== "COMMERCE_DETAIL" || m.revision !== p.expectedRevision) throw Error("产品项目已更新，请刷新后生成");
    if (p.jobKind === "video_generate" && m.videoConfirmation?.revision !== m.revision) throw Error("先确认当前版本的视频创意及参数");
    if (["main_images", "detail_images"].includes(p.jobKind) && !p.confirmationText) throw Error("请确认本次画面生成范围与服务额度使用");
    const generationMode = p.generationMode || "create";
    if (!["create", "revise"].includes(generationMode)) throw Error("制作模式无效");
    const targetIndexes = p.targetIndexes || [];
    if (!Array.isArray(targetIndexes) || targetIndexes.length > 20 || new Set(targetIndexes).size !== targetIndexes.length || targetIndexes.some((n: any) => !Number.isInteger(n) || n < 0 || n > 19)) throw Error("请选择有效且不重复的修改页码");
    const section = p.jobKind.startsWith("main") ? m.body.mainImages : m.body.pages;
    const revisionScope = p.revisionScope || (p.jobKind === "video_concept" ? "video" : "pages");
    if (!["pages", "listing", "selling_points", "video"].includes(revisionScope) || (revisionScope === "listing" && p.jobKind !== "main_copy") || (revisionScope === "selling_points" && !["main_copy", "detail_copy"].includes(p.jobKind)) || (generationMode === "revise" && p.jobKind.endsWith("images") && revisionScope !== "pages") || (generationMode === "revise" && (revisionScope === "video") !== (p.jobKind === "video_concept"))) throw Error("修改范围与任务类型不匹配");
    if (generationMode === "revise") {
      txt(p.instructions, 6000);
      if (p.jobKind === "video_generate") throw Error("先按意见修改视频创意，审核当前创意和参数后重新制作视频");
      if (revisionScope === "pages" && (!targetIndexes.length || targetIndexes.some((n: number) => !section?.[n]))) throw Error("请明确选择要修改的主图或详情页");
      if (p.jobKind.endsWith("images") && targetIndexes.some((n: number) => !section[n].mediaRef)) throw Error("所选画面尚未生成，不能作为原图修改");
    }
    const sourceMedia = generationMode === "revise" && p.jobKind.endsWith("images") ? targetIndexes.map((n: number) => section[n].mediaRef) : [];
    const existing = await db.task.findFirst({ where: { brandId, taskType: "commerce_detail_ai", taskStatus: { in: active }, inputJson: { path: ["projectId"], equals: row.id } } });
    if (existing) throw Error("此产品已有制作任务，请等完成后再提交；中断的任务需先处理，避免重复生成");
    const job = await db.task.create({ data: { userId: actorId, brandId, taskType: "commerce_detail_ai", taskStatus: "QUEUED", taskTitle: `${row.title} · ${labels[p.jobKind]}`, modelName: "codex-local", inputJson: { projectId: row.id, revision: m.revision, jobKind: p.jobKind, generationMode, revisionScope, targetIndexes, sourceMedia, instructions: typeof p.instructions === "string" ? p.instructions.slice(0, 6000) : "", confirmationText: typeof p.confirmationText === "string" ? p.confirmationText.slice(0, 2000) : "" } } });
    return { id: job.id, queued: true };
  }
  if (action === "commerce_claim_detail_task") {
    const executorId = txt(p.executorId, 160);
    if (!executor || executor.executorId !== executorId || executor.actorId !== actorId || Date.now() - executor.at > 90000) throw Error("请先报告本机执行器状态");
    // Expired executions are failed for manual reconciliation, never replayed automatically.
    const running = await db.task.findMany({ where: { brandId, taskType: "commerce_detail_ai", taskStatus: "RUNNING" } });
    for (const t of running) if (Date.parse(obj(t.inputJson).lease?.expiresAt || "") < Date.now()) await db.task.update({ where: { id: t.id }, data: { taskStatus: "FAILED", errorMessage: "执行器中断：核对已产生的版本或供应商任务后再重试", finishedAt: now } });
    const job = await db.task.findFirst({ where: { brandId, taskType: "commerce_detail_ai", taskStatus: "QUEUED" }, orderBy: { createdAt: "asc" } });
    if (!job) return { job: null };
    const input = obj(job.inputJson);
    if (!executor.capabilities.includes(input.jobKind)) return { job: null };
    const project = await db.businessAsset.findFirst({ where: { id: input.projectId, brandId } });
    if (obj(project?.metadataJson).revision !== input.revision) { await db.task.update({ where: { id: job.id }, data: { taskStatus: "FAILED", errorMessage: "等待期间产品项目已更新，请从新版本重新发起", finishedAt: now } }); return { job: null }; }
    const lease = { executorId, token: randomUUID(), expiresAt: new Date(Date.now() + 120000).toISOString() };
    await db.task.update({ where: { id: job.id }, data: { taskStatus: "RUNNING", startedAt: now, inputJson: { ...input, lease }, outputJson: { message: "Codex正在读取产品资料与制作要求" } } });
    return { job: { id: job.id, ...input, leaseToken: lease.token } };
  }
  if (action === "commerce_report_detail_task") {
    const job = await db.task.findFirst({ where: { id: txt(p.jobId, 160), brandId, taskType: "commerce_detail_ai" } }), input = obj(job?.inputJson);
    if (!executor || executor.actorId !== actorId || !job || job.taskStatus !== "RUNNING" || input.lease?.token !== p.leaseToken || input.lease?.executorId !== p.executorId || Date.parse(input.lease?.expiresAt || "") < Date.now()) throw Error("任务租约已失效，不能写回完成状态");
    if (!["progress", "success", "failed"].includes(p.taskState)) throw Error("任务状态无效");
    let revision: number | null = null;
    if (p.taskState === "success") {
      const row = await db.businessAsset.findFirst({ where: { id: input.projectId, brandId } }), m = obj(row?.metadataJson);
      if (!(m.revision > input.revision)) throw Error("制作内容尚未保存为新版本");
      const body = obj(m.body);
      if (input.jobKind === "operations_replan" && (m.kind !== "COMMERCE_OPERATIONS_PLAN" || m.replanTaskId !== job.id || Number(m.scorecard?.goal?.target) !== Number(input.targetScenario?.gmv))) throw Error("新目标的完整经营方案尚未回写，不得标记成功");
      if (input.jobKind === "main_copy" && !(input.generationMode === "revise" && input.revisionScope === "selling_points") && !(body.listing?.identityLock && (input.revisionScope === "listing" || body.mainImages?.length))) throw Error("主图方案与商品文案尚未完成");
      if (input.generationMode === "revise" && input.revisionScope === "selling_points" && !(body.sellingPointReport && body.sellingPoints?.length)) throw Error("卖点修改尚未保存");
      if (input.jobKind === "detail_copy" && !(input.generationMode === "revise" && input.revisionScope === "selling_points") && !(input.generationMode === "revise" && input.revisionScope === "pages" ? input.targetIndexes.every((n: number) => body.pages?.[n]?.copy && body.pages[n].prompt) : body.pages?.every((x: any) => x.copy && x.prompt))) throw Error("详情文案或提示词尚未完成");
      if (input.jobKind === "video_concept" && !(body.video?.concept && body.video?.prompt)) throw Error("视频创意尚未保存");
      if (input.jobKind === "main_images" && !(body.mainImages?.length && (input.generationMode === "revise" ? input.targetIndexes.every((n: number, k: number) => body.mainImages[n]?.mediaRef && JSON.stringify(body.mainImages[n].mediaRef) !== JSON.stringify(input.sourceMedia[k])) : body.mainImages.every((x: any) => x.mediaRef)))) throw Error("主图产物尚未完整关联");
      if (input.jobKind === "detail_images" && !(input.generationMode === "revise" ? input.targetIndexes.every((n: number, k: number) => body.pages?.[n]?.mediaRef && JSON.stringify(body.pages[n].mediaRef) !== JSON.stringify(input.sourceMedia[k])) : body.pages?.every((x: any) => x.mediaRef))) throw Error("详情画面产物尚未完整关联");
      if (input.jobKind === "video_generate" && !body.video?.mediaRef) throw Error("视频产物尚未关联");
      revision = m.revision;
    }
    const message = txt(p.message, 4000);
    await db.task.update({ where: { id: job.id }, data: { taskStatus: p.taskState === "progress" ? "RUNNING" : p.taskState === "success" ? "SUCCESS" : "FAILED", inputJson: { ...input, lease: { ...input.lease, expiresAt: new Date(Date.now() + 120000).toISOString() } }, outputJson: { message, revision, evidenceStatus: "executor_reported" }, ...(p.taskState === "failed" ? { errorMessage: message } : {}), ...(p.taskState !== "progress" ? { finishedAt: now } : {}) } });
    return { id: job.id, state: p.taskState, revision };
  }
  throw Error("制作任务操作无效");
}
