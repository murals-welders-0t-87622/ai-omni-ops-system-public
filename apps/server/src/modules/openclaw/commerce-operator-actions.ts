import { randomUUID } from "node:crypto";
import { normalizeCommerceOperationSpec } from "@ai-omni/shared/commerce-operations";
// Qwen's desktop authorization is not inherited by this server or by Codex.
export const commerceOperatorCapabilities = { directExecution: false, provider: "qwen-taobao-desktop", observedAt: "2026-10-27", message: "本轮千问工具目录未发现广告实体修改、改价或发品工具。可保存完整执行单，交店铺后台操作并回填真实回执；小万广告诉求提交不等于店铺已变更。" };
const text = (v: any, max = 12000) => { if (typeof v !== "string" || v.length > max) throw Error("运营内容格式不正确"); return v.trim(); };
export async function commerceOperatorAction(db: any, brandId: string, actorId: string, action: string, p: any) {
  const get = async (id: string, kind: string) => { const row = await db.businessAsset.findFirst({ where: { id, brandId } }); if (row?.metadataJson?.kind !== kind) throw Error("当前品牌未找到对应经营对象"); return row; };
  const create = (id: string, kind: string, title: string, metadataJson: any) => db.businessAsset.create({ data: { id, brandId, category: "GENERATED_REPORT", title, metadataJson: { ...metadataJson, kind, actorId } } });
  if (action === "commerce_execute_operation") throw Error(commerceOperatorCapabilities.message);
  if (action === "commerce_save_operation_draft") {
    const plan = await get(text(p.planId, 160), "COMMERCE_OPERATIONS_PLAN"), m = plan.metadataJson;
    if (m.revision !== p.planRevision) throw Error("策略已更新，请重新进入当前策略后核对条件");
    const initiative = m.operatingMap?.initiatives?.find((i: any) => i.id === p.initiativeId);
    if (!initiative) throw Error("策略不存在，不能用地址中的条件代替已保存策略");
    const operation = normalizeCommerceOperationSpec(p.operation);
    if (initiative.operation && initiative.operation.module !== operation.module) throw Error("运营板块与来源策略不一致");
    const old = p.operationId ? await get(text(p.operationId, 160), "COMMERCE_OPERATION") : null;
    if (old && (old.metadataJson.planId !== plan.id || old.metadataJson.initiativeId !== initiative.id)) throw Error("执行单不属于本策略");
    if (p.expectedRevision !== (old?.metadataJson.revision || 0)) throw Error("执行单已更新，请刷新核对后保存");
    const id = old?.id || "commerce_operation_" + randomUUID(), revision = (old?.metadataJson.revision || 0) + 1;
    const data = { kind: "COMMERCE_OPERATION", planId: plan.id, planRevision: m.revision, initiativeId: initiative.id, actionKey: initiative.actionKey, shopId: m.shopId, productId: initiative.productId, projectId: initiative.projectId, sourceSettings: initiative.settings, sourceTitle: initiative.title, operation, executionNotes: text(p.executionNotes || ""), status: "draft", revision, actorId, updatedAt: new Date().toISOString() };
    if (old) await db.businessAsset.update({ where: { id }, data: { metadataJson: data } }); else await create(id, "COMMERCE_OPERATION", initiative.title, data);
    await create("commerce_operation_revision_" + randomUUID(), "COMMERCE_OPERATION_REVISION", initiative.title, { ...data, operationId: id });
    return { id, revision, externalExecuted: false };
  }
  if (action === "commerce_record_operation_receipt") {
    const row = await get(text(p.operationId, 160), "COMMERCE_OPERATION"), m = row.metadataJson;
    if (m.revision !== p.expectedRevision) throw Error("执行单已变化，请重新核对当前版本");
    const r = p.operationReceipt;
    if (!r || Object.keys(r).some(k => !["status", "toolName", "externalTaskId", "evidence", "afterEvidence"].includes(k)) || !["submitted", "reported_success", "failed", "unknown"].includes(r.status)) throw Error("执行回执格式无效");
    const receipt = { status: r.status, toolName: text(r.toolName, 300), externalTaskId: text(r.externalTaskId, 300), evidence: text(r.evidence, 24000), afterEvidence: text(r.afterEvidence, 12000) };
    if (!receipt.toolName || !receipt.evidence || (r.status === "reported_success" && !receipt.afterEvidence)) throw Error("请填写真实工具回执，成功上报须有操作后的状态证据");
    const id = "commerce_operation_receipt_" + randomUUID(), data = { operationId: row.id, operationRevision: m.revision, planId: m.planId, shopId: m.shopId, receipt, evidenceStatus: "user_reported", reportedAt: new Date().toISOString() };
    await create(id, "COMMERCE_OPERATION_RECEIPT", row.title, data);
    return { id, evidenceStatus: "user_reported", externalExecuted: false };
  }
  throw Error("不支持的运营工作台动作");
}
