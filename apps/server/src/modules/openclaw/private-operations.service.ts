import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AssetCategory } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { calendarFields, calendarText } from "@ai-omni/shared/marketing-calendar";
import { PRIVATE_OPS_ACTIONS, PRIVATE_OPS_ENTITIES, PRIVATE_OPS_FIELDS, PRIVATE_OPS_SCHEMA, PRIVATE_OPS_VERSION, normalizePrivateComparison, type PrivateOpsEntity } from "@ai-omni/shared/private-operations";

import { normalizeGrowthData,analyzeGrowthData,GROWTH_TAGS } from "@ai-omni/shared/private-growth";

import {normalizeGrowthReport,projectGrowthReport} from "@ai-omni/shared/private-growth-report";
import {normalizeOwnerDay,ownerDate,chinaDate,ownerValues,ownerProgress,ownerTargets,OWNER_METRICS} from "@ai-omni/shared/private-owner";

import {normalizePrivateRoadmap,normalizePrivateActivity} from "@ai-omni/shared/private-plan";

import {normalizePrivateBusiness} from "@ai-omni/shared/private-business";
import {normalizePrivateAnalytics} from "@ai-omni/shared/private-analytics";

const canonical=(x:any):any=>Array.isArray(x)?x.map(canonical):x&&typeof x==="object"?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const hash=(x:any)=>createHash("sha256").update(JSON.stringify(canonical(x))).digest("hex");
const text=(x:any,max=4000)=>calendarText(x,max);
const required=(x:any,max=4000)=>{const s=text(x,max);if(!s)throw Error("请填写必填内容");return s;};
const date=(x:any)=>{const s=required(x,60);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s.slice(0,10)).toISOString().slice(0,10)!==s.slice(0,10))throw Error("时间须为有效ISO日期并带时区");return new Date(s).toISOString();};
const where=(brandId:string,kind="PRIVATE_RECORD",extra:any[]=[])=>({brandId,category:AssetCategory.GENERATED_REPORT,AND:[{metadataJson:{path:["kind"],equals:kind}},...extra]});
const eq=(path:string[],value:any)=>({metadataJson:{path,equals:value}});
export function normalizePrivateBody(entity:PrivateOpsEntity,input:any){
 const fields=PRIVATE_OPS_FIELDS[entity];if(!fields)throw Error("不支持的私域记录类型");calendarFields(input,fields.map(x=>x.key),"私域记录");const body:any={};
 for(const f of fields){if(input[f.key]!==undefined&&typeof input[f.key]!=="string")throw Error(`${f.label}必须是文字`);const v=text(input[f.key],f.type==="textarea"?60000:2000);if(f.required&&!v)throw Error(`请填写${f.label}`);if(f.options&&v&&!f.options.includes(v))throw Error(`${f.label}选项无效`);body[f.key]=f.type==="datetime-local"&&v?date(v):v;}
 if(body.businessModel)body.businessModel=JSON.stringify(normalizePrivateBusiness(body.businessModel));
 if(body.stagePlan)body.stagePlan=JSON.stringify(normalizePrivateRoadmap(body.stagePlan));
 if(body.activityPlan)body.activityPlan=JSON.stringify(normalizePrivateActivity(body.activityPlan));
 if(body.activityPlan&&JSON.parse(body.activityPlan).objective!==body.metricKey)throw Error("活动主要目标须与策略指标一致");
 if(body.dataComparison)body.dataComparison=JSON.stringify(normalizePrivateComparison(body.dataComparison));
 if(body.targetDate)ownerDate(body.targetDate);
 if(body.targetValue&&!/^\d{1,10}(?:\.\d{1,2})?$/.test(body.targetValue))throw Error("目标须为非负数值，最多两位小数");
 if(body.targetValue&&(!body.metricKey||!body.targetDate||!body.targetShopId))throw Error("设置目标需要指标、日期和目标店铺");
 if(body.targetValue&&["conversion","repeat"].includes(body.metricKey)&&Number(body.targetValue)>100)throw Error("比例目标不能超过100%");
 if(entity==="assertion"){
  if(body.confidence!==""&&(!/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(body.confidence)))throw Error("置信度须在0至1之间，未知可留空");
  if(body.validUntil&&body.validUntil<=body.observedAt)throw Error("标签有效期须晚于事实发生时间");
  if(Date.parse(body.observedAt)>Date.now()+300000)throw Error("标签发生时间不能在未来");
 }
 if(entity==="task"&&body.status==="completed"&&(!body.outcome||!body.receipt))throw Error("完成任务需要实际结果和执行回执，委托或草稿不等于完成");
 if(entity==="review"&&body.periodStart>body.periodEnd)throw Error("复盘开始时间不能晚于结束时间");
 if(entity==="segment"){let conditions;try{conditions=JSON.parse(body.conditions);}catch{throw Error("分群条件须为标签条件JSON数组");}if(!Array.isArray(conditions)||conditions.length<1||conditions.length>12)throw Error("分群需要1至12个标签条件");for(const c of conditions){calendarFields(c,["tagId","value"],"分群条件");required(c.tagId,160);required(c.value,2000);}body.conditions=JSON.stringify(conditions);}
 return body;
}
export function projectPrivateAssertions(records:any[],tags:any[],now=new Date().toISOString()){
 const map=new Map(tags.map(x=>[x.id,x]));const rows=records.map(r=>{const b=r.body,t:any=map.get(b.tagId);let effectiveState=b.state;if(b.status==="archived"||b.state==="revoked")effectiveState="revoked";else if(b.validUntil&&b.validUntil<=now)effectiveState="expired";else if(!t||t.body.status==="archived"||t.revision!==r.tagRevision)effectiveState="definition_changed";return {...r,effectiveState,tagName:t?.title,group:t?.body.group,cardinality:t?.body.cardinality};});
 const groups=new Map<string,Set<string>>();for(const r of rows)if(r.effectiveState==="confirmed"&&r.cardinality==="exclusive"){const k=JSON.stringify([r.body.customerId,r.group,r.body.context]);groups.set(k,(groups.get(k)||new Set()).add(JSON.stringify([r.body.tagId,r.body.value])));}
 return rows.map(r=>r.effectiveState==="confirmed"&&r.cardinality==="exclusive"&&(groups.get(JSON.stringify([r.body.customerId,r.group,r.body.context]))?.size||0)>1?{...r,effectiveState:"conflict"}:r);
}

@Injectable()
export class PrivateOperationsService {
 constructor(private readonly prisma:PrismaService){}
 private meta(r:any){return {...r.metadataJson,id:r.id,title:r.title,createdAt:r.createdAt,updatedAt:r.updatedAt};}
 private async find(db:any,brandId:string,id:any,kind="PRIVATE_RECORD",entity?:string){const r=await db.businessAsset.findFirst({where:{id:required(id,160),...where(brandId,kind)}});if(!r||(entity&&r.metadataJson?.entity!==entity))throw new NotFoundException("本品牌记录不存在");return r;}
 private async customer(db:any,brandId:string,id:any){const r=await db.businessAsset.findFirst({where:{id:required(id,160),...where(brandId,"SALES_RECORD",[eq(["entity"],"customer")])}});if(!r)throw new NotFoundException("请选择本品牌AI销售客户档案");return r;}
 private revision(p:any,m:any){if(!Number.isSafeInteger(p.expectedRevision)||p.expectedRevision!==(m?.revision||0))throw new ConflictException("资料已更新，请重新读取后保存");}
 private create(db:any,brandId:string,actorId:string,kind:string,title:string,data:any,id="private_"+randomUUID()) {return db.businessAsset.create({data:{id,brandId,category:AssetCategory.GENERATED_REPORT,title,description:[data.body?.customerValue,data.body?.context,data.body?.content,data.body?.evidence].filter(Boolean).join(" ").slice(0,10000),metadataJson:{...data,kind,actorId,schemaVersion:PRIVATE_OPS_VERSION}}});}
 private async manager(db:any,brandId:string,actorId:string){const [b,m]=await Promise.all([db.brand.findUnique({where:{id:brandId}}),db.brandMember.findFirst({where:{brandId,userId:actorId,status:"ACTIVE"}})]);if(b?.ownerUserId!==actorId&&m?.role!=="ADMIN")throw new ForbiddenException("仅品牌所有者或管理员可核定店铺归属");}
 private async list(brandId:string,p:any){
  if(!PRIVATE_OPS_ENTITIES.includes(p.entity))throw Error("请选择私域记录类型");const limit=Number(p.limit??30),offset=Number(p.offset??0);if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>1000000)throw Error("分页范围无效");
  const filters=[eq(["entity"],p.entity)];if(p.status)filters.push(eq(["body","status"],required(p.status,60)));if(p.customerId){await this.customer(this.prisma,brandId,p.customerId);filters.push(eq(["body","customerId"],p.customerId));}
  const w:any=where(brandId,"PRIVATE_RECORD",filters);if(p.keyword)w.OR=[{title:{contains:required(p.keyword,200),mode:"insensitive"}},{description:{contains:p.keyword,mode:"insensitive"}}];
  const [rows,total]=await Promise.all([this.prisma.businessAsset.findMany({where:w,orderBy:[{updatedAt:"desc"},{id:"asc"}],take:limit,skip:offset}),this.prisma.businessAsset.count({where:w})]);return {items:rows.map(r=>this.meta(r)),total,offset,limit,hasMore:offset+rows.length<total};
 }
 private async tags(db:any,brandId:string){const rows=await db.businessAsset.findMany({where:where(brandId,"PRIVATE_RECORD",[eq(["entity"],"tag")]),take:10001});if(rows.length>10000)throw Error("标签定义超过本次计算上限，请缩小工作区范围");return rows.map((r:any)=>this.meta(r));}
 private async context(brandId:string,id:string){
  const customer=await this.customer(this.prisma,brandId,id),w=where(brandId,"PRIVATE_RECORD",[eq(["body","customerId"],id)]);
  const [rows,total,tags,identities,assertionRows]=await Promise.all([this.prisma.businessAsset.findMany({where:w,take:100,orderBy:{updatedAt:"desc"}}),this.prisma.businessAsset.count({where:w}),this.tags(this.prisma,brandId),this.prisma.businessAsset.findMany({where:where(brandId,"PRIVATE_IDENTITY",[eq(["customerId"],id)]),take:100}),this.prisma.businessAsset.findMany({where:where(brandId,"PRIVATE_RECORD",[eq(["body","customerId"],id),eq(["entity"],"assertion")]),take:10001})]);
  if(assertionRows.length>10000)throw Error("客户标签超过计算上限，未作不完整画像判断");
  const records=rows.map(x=>this.meta(x));return {customerId:id,customerRevision:(customer.metadataJson as any).revision,records,assertions:projectPrivateAssertions(assertionRows.map(x=>this.meta(x)),tags),identities:identities.map(r=>this.meta(r)),total,limit:100,complete:total<=100};
 }
 private async preview(brandId:string,id:string){
  const segment=this.meta(await this.find(this.prisma,brandId,id,"PRIVATE_RECORD","segment")),conditions=JSON.parse(segment.body.conditions);
  for(const c of conditions)await this.find(this.prisma,brandId,c.tagId,"PRIVATE_RECORD","tag");
  const rows=await this.prisma.businessAsset.findMany({where:where(brandId,"PRIVATE_RECORD",[eq(["entity"],"assertion")]),take:10001});if(rows.length>10000)throw Error("当前预览超过10000条标签记录，需缩小数据范围后计算，未生成不完整人群");
  const assertions=projectPrivateAssertions(rows.map(r=>this.meta(r)),await this.tags(this.prisma,brandId));const customers=new Set(assertions.map(x=>x.body.customerId));
  const ids=[...customers].filter(customerId=>conditions.every((c:any)=>assertions.some(x=>x.body.customerId===customerId&&x.body.tagId===c.tagId&&x.body.value===c.value&&x.effectiveState==="confirmed")));
  return {segmentId:id,segmentRevision:segment.revision,computedAt:new Date().toISOString(),matchedCustomerIds:ids.slice(0,100),total:ids.length,limit:100,hasMore:ids.length>100,applied:false,definition:"全部条件同时满足；只使用当前定义下有效且无冲突的有依据标签。仅预览，未发券或触达。"};
 }
 async run(brandId:string,actorId:string,action:string,p:any):Promise<any>{try{
  if(!PRIVATE_OPS_ACTIONS.includes(action as any))throw Error("不支持的私域运营操作");calendarFields(p,Object.keys(PRIVATE_OPS_SCHEMA.properties),"私域参数");if(JSON.stringify(p).length>(["private_save_growth_data","private_save_analytics"].includes(action)?2200000:500000))throw Error("资料过大，请分批保存");if(!await this.prisma.canUseDatabase())throw new ServiceUnavailableException("私域数据库不可用");
  if(action==="private_get_workspace"){
   const counts=Object.fromEntries(await Promise.all(PRIVATE_OPS_ENTITIES.map(async entity=>[entity,await this.prisma.businessAsset.count({where:where(brandId,"PRIVATE_RECORD",[eq(["entity"],entity)])})])));
   const [bindings,snapshots]=await Promise.all([this.prisma.businessAsset.findMany({where:where(brandId,"PRIVATE_BINDING"),orderBy:{createdAt:"desc"},take:100}),this.prisma.businessAsset.findMany({where:where(brandId,"PRIVATE_SNAPSHOT"),orderBy:{createdAt:"desc"},take:30})]);
   return {brandId,counts,bindings:bindings.map(r=>this.meta(r)),snapshots:snapshots.map(r=>this.meta(r)),snapshotLimit:30,externalExecutionEnabled:false,customerSource:"AI销售客户主档",schemaVersion:PRIVATE_OPS_VERSION};
  }
  if(action==="private_get_analytics"){
   let binding:any=null;if(p.bindingId){binding=this.meta(await this.find(this.prisma,brandId,p.bindingId,"PRIVATE_BINDING"));if(!binding.enabled)throw Error("店铺映射已停用");}
   const row=p.dataId?await this.find(this.prisma,brandId,p.dataId,"PRIVATE_ANALYTICS"):await this.prisma.businessAsset.findFirst({where:where(brandId,"PRIVATE_ANALYTICS",binding?[eq(["bindingId"],binding.id)]:[]),orderBy:[{createdAt:"desc"},{id:"desc"}]});
   if(!row)return{available:false,reason:"尚未保存经营图表数据，请让AI同步真实经营报表。"};
   const meta:any=row.metadataJson;if(binding&&meta.bindingId!==binding.id)throw Error("经营分析不属于所选店铺");binding=this.meta(await this.find(this.prisma,brandId,meta.bindingId,"PRIVATE_BINDING"));if(!binding.enabled)throw Error("店铺映射已停用");
   return{available:true,dataId:row.id,bindingId:binding.id,data:normalizePrivateAnalytics(meta.data),sourceHash:meta.sourceHash,externalExecutionEnabled:false};
  }
  if(action==="private_get_growth_analysis"){
   const row=p.dataId?await this.find(this.prisma,brandId,p.dataId,"PRIVATE_GROWTH_DATA"):await this.prisma.businessAsset.findFirst({where:where(brandId,"PRIVATE_GROWTH_DATA"),orderBy:{createdAt:"desc"}});
   if(!row)return {available:false,reason:"尚无可复算订单/会员数据；请通过有赞读取并保存完整窗口明细，不以快照文字冒充分析。",tagRules:GROWTH_TAGS};
   const meta:any=row.metadataJson,binding=this.meta(await this.find(this.prisma,brandId,meta.bindingId,"PRIVATE_BINDING"));if(!binding.enabled)throw Error("店铺映射已停用");
   const analysis=meta.data.version==="private-growth-report/1"?projectGrowthReport(meta.data):analyzeGrowthData(meta.data),all=analysis.customers.filter(c=>!p.tag||c.tags.includes(p.tag));const offset=Number(p.offset||0),limit=Number(p.limit||30);if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>100)throw Error("分页无效");
   return {available:true,dataId:row.id,...analysis,customers:all.slice(offset,offset+limit),customerTotal:all.length,tag:p.tag||"",offset,limit,hasMore:offset+limit<all.length};
  }
  if(action==="private_get_business_board"){
   const businessDate=ownerDate(p.businessDate||chinaDate()),previousDate=new Date(Date.parse(businessDate)-86400000).toISOString().slice(0,10);
   const bindingRows=await this.prisma.businessAsset.findMany({where:where(brandId,"PRIVATE_BINDING",[eq(["enabled"],true)]),take:101});
   const bindings=bindingRows.map(r=>this.meta(r));if(bindings.length>100)throw Error("店铺超过本次经营台范围");const binding=p.bindingId?bindings.find(b=>b.id===p.bindingId):bindings.length===1?bindings[0]:null;if(p.bindingId&&!binding)throw new NotFoundException("当前品牌可用店铺不存在");
   const records=await this.prisma.businessAsset.findMany({where:where(brandId,"PRIVATE_RECORD",[{OR:["tactic","task","journey","review"].map(x=>eq(["entity"],x))}]),take:2001,orderBy:{updatedAt:"desc"}}),progress=ownerProgress(records.slice(0,2000).map(r=>this.meta(r)),businessDate);
   const readDay=async(day:string)=>{if(!binding)return null;const idx=await this.prisma.businessAsset.findFirst({where:{id:"private_day_"+hash([brandId,binding.id,day]),...where(brandId,"PRIVATE_OWNER_CURRENT")}});if(!idx)return null;const r=await this.find(this.prisma,brandId,(idx.metadataJson as any).snapshotId,"PRIVATE_SNAPSHOT"),m=this.meta(r);return{...normalizeOwnerDay(JSON.parse(m.receipt)),snapshotId:r.id,source:{toolName:m.toolName,workSessionId:m.workSessionId,workRequestId:m.workRequestId,capturedAt:m.capturedAt,evidenceLevel:m.evidenceLevel,limitations:m.limitations}}};
   const [today,previous]=await Promise.all([readDay(businessDate),readDay(previousDate)]),values=ownerValues(today),previousValues=ownerValues(previous);
   return{businessDate,bindings:bindings.map(b=>({id:b.id,title:b.title,shopId:b.shopId})),binding:binding?{id:binding.id,title:binding.title,shopId:binding.shopId}:null,day:today,previous,values,previousValues,comparable:!!today&&!!previous&&today.complete&&previous.complete&&today.queryStatus==="COMPLETED"&&previous.queryStatus==="COMPLETED"&&today.scope===previous.scope,metrics:OWNER_METRICS,progress,recordsComplete:records.length<=2000,targets:ownerTargets(progress.tactics,values,today,binding?.shopId||""),externalExecutionEnabled:false};
  }
  if(action==="private_list_records")return this.list(brandId,p);
  if(action==="private_get_customer_context")return this.context(brandId,p.customerId);
  if(action==="private_preview_segment")return this.preview(brandId,p.recordId);
  if(action==="private_get_record"||action==="private_get_history"){
   const r=await this.find(this.prisma,brandId,p.recordId);if(action==="private_get_record")return this.meta(r);
   const rows=await this.prisma.businessAsset.findMany({where:where(brandId,"PRIVATE_REVISION",[eq(["recordId"],r.id)]),orderBy:{createdAt:"desc"},take:100});return {items:rows.map(x=>this.meta(x)),limit:100};
  }
  const key=required(p.idempotencyKey,160);if(key.length<8)throw Error("操作编号过短");const receiptId="private_receipt_"+hash([brandId,actorId,key]),requestHash=hash({action,p});
  return await this.prisma.$transaction(async tx=>{
   // Same lock as AI销售: identity/tag edits cannot race with customer changes.
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"sales:"+brandId}))::text`;
   const receipt=await tx.businessAsset.findFirst({where:{id:receiptId,brandId}});if(receipt){const m:any=receipt.metadataJson;if(m.requestHash!==requestHash)throw new ConflictException("同一操作编号的内容不同");return {...m.result,replayed:true};}
   let result:any;
   if(action==="private_save_analytics"){
    const binding=this.meta(await this.find(tx,brandId,p.bindingId,"PRIVATE_BINDING"));if(!binding.enabled)throw Error("店铺映射已停用");
    if(typeof p.analytics!=="string"||p.analytics.length>2000000)throw Error("经营分析须为不超过2MB的JSON字符串");let input;try{input=JSON.parse(p.analytics)}catch{throw Error("经营分析不是有效JSON")}
    const data=normalizePrivateAnalytics(input);if(data.shopId!==binding.shopId)throw Error("经营分析店铺与绑定不符");if(Date.parse(data.capturedAt)>Date.now()+300000)throw Error("采集时间不能在未来");
    const row=await this.create(tx,brandId,actorId,"PRIVATE_ANALYTICS",`${binding.title} · 经营图表`,{bindingId:binding.id,data,sourceHash:hash(data),capturedAt:data.capturedAt});result={dataId:row.id,bindingId:binding.id,sections:data.sections.length,sourceHash:hash(data),schemaVersion:PRIVATE_OPS_VERSION};
   }else if(action==="private_save_growth_data"){
    const binding=this.meta(await this.find(tx,brandId,p.bindingId,"PRIVATE_BINDING"));if(!binding.enabled)throw Error("店铺映射已停用");
    if(typeof p.data!=="string"||p.data.length>2000000)throw Error("增长明细须为不超过2MB的JSON字符串");let input;try{input=JSON.parse(p.data)}catch{throw Error("增长明细不是有效JSON")}
    const data=input.version==="private-growth-report/1"?normalizeGrowthReport(input):normalizeGrowthData(input);if(data.shopId!==binding.shopId)throw Error("增长数据店铺与本品牌绑定不符");if(Date.parse(data.capturedAt)>Date.now()+300000)throw Error("数据采集时间不能在未来");
    const row=await this.create(tx,brandId,actorId,"PRIVATE_GROWTH_DATA",`${binding.title} · 经营数据`,{bindingId:binding.id,shopId:binding.shopId,data,sourceHash:hash(data),capturedAt:data.capturedAt});
    result={dataId:row.id,shopId:data.shopId,orders:data.orders?.length??0,members:data.members?.length??0,mode:data.version==="private-growth-report/1"?"reported_summary":"provided_rows",sourceHash:hash(data),schemaVersion:PRIVATE_OPS_VERSION};
   }else if(action==="private_save_record"){
    const entity=p.entity as PrivateOpsEntity,body=normalizePrivateBody(entity,p.body);if(entity==="strategy"&&p.recordId||entity==="tactic"&&body.parentId){const lockKey="private-strategy:"+brandId+":"+(entity==="strategy"?p.recordId:body.parentId);await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))::text`;}const old=p.recordId?await this.find(tx,brandId,p.recordId,"PRIVATE_RECORD",entity):null;this.revision(p,old?.metadataJson);
    if(["ads","sales"].includes(body.metricKey)&&!(old&&(old.metadataJson as any).body.metricKey===body.metricKey))throw Error("私域新增目标只限流量、转化、客单、复购");
    if(body.targetShopId){const mapped=await tx.businessAsset.findFirst({where:where(brandId,"PRIVATE_BINDING",[eq(["shopId"],body.targetShopId),eq(["enabled"],true)])});if(!mapped)throw Error("请选择本品牌已关联店铺");}
    if(body.customerId)await this.customer(tx,brandId,body.customerId);
    if(body.parentId){const parent=this.meta(await this.find(tx,brandId,body.parentId));const allowed=entity==="tactic"?["strategy"]:entity==="journey"?["tactic"]:["tactic","journey"];if(!allowed.includes(parent.entity))throw Error("请选择匹配的上层规划");if(entity==="tactic"&&body.status!=="archived"&&(parent.body.businessModel||body.businessTrackId)){const model=parent.body.businessModel?normalizePrivateBusiness(parent.body.businessModel):null;const track=model?.tracks.find(t=>t.id===body.businessTrackId);if(!track)throw Error("策略须承接关联战略中的经营路线");if(!track.goals.includes(body.metricKey))throw Error("策略指标须承接经营路线目标");}}
    let tagRevision:any;
    if(entity==="strategy"&&p.recordId&&(body.businessModel||(old?.metadataJson as any)?.body?.businessModel)){const model=body.businessModel?normalizePrivateBusiness(body.businessModel):null;const children=await tx.businessAsset.findMany({where:where(brandId,"PRIVATE_RECORD",[eq(["entity"],"tactic"),eq(["body","parentId"],p.recordId)]),take:2001});if(children.length>2000)throw Error("关联策略较多，请先整理后更新战略");for(const child of children.map(r=>this.meta(r))){if(child.body.status==="archived"||!child.body.businessTrackId)continue;const track=model?.tracks.find(t=>t.id===child.body.businessTrackId);if(!track||child.body.metricKey&&!track.goals.includes(child.body.metricKey))throw Error("仍有运营策略使用该路线，请先调整关联策略再删除或改变目标");}}
    if(entity==="tag"){
     const peers=await tx.businessAsset.findMany({where:where(brandId,"PRIVATE_RECORD",[eq(["entity"],"tag"),eq(["body","group"],body.group)]),take:10001});if(peers.length>10000)throw Error("标签组过大");if(peers.some((r:any)=>r.id!==old?.id&&r.metadataJson.body.status!=="archived"&&r.metadataJson.body.cardinality!==body.cardinality))throw Error("同一标签组的可并存/互斥规则必须一致");
    }
    if(entity==="assertion"){const tag=this.meta(await this.find(tx,brandId,body.tagId,"PRIVATE_RECORD","tag"));if(tag.body.status==="archived")throw Error("标签定义已归档");tagRevision=tag.revision;}
    if(entity==="segment")for(const c of JSON.parse(body.conditions))await this.find(tx,brandId,c.tagId,"PRIVATE_RECORD","tag");
    const data={kind:"PRIVATE_RECORD",entity,body,revision:Number((old?.metadataJson as any)?.revision||0)+1,...(tagRevision?{tagRevision}:{}),actorId,schemaVersion:PRIVATE_OPS_VERSION};
    const row=old?await tx.businessAsset.update({where:{id:old.id},data:{title:body.name,description:[body.content,body.context,body.evidence].filter(Boolean).join(" ").slice(0,10000),metadataJson:data}}):await this.create(tx,brandId,actorId,"PRIVATE_RECORD",body.name,data);
    await this.create(tx,brandId,actorId,"PRIVATE_REVISION",body.name,{...data,recordId:row.id});result=this.meta(row);
   }else if(action==="private_bind_shop"){
    await this.manager(tx,brandId,actorId);const shopId=required(p.shopId,160);if(!/^\d{1,30}$/.test(shopId))throw Error("有赞店铺标识须为原始kdt_id数字");if(typeof p.enabled!=="boolean")throw Error("请选择映射是否启用");
    const id="private_shop_"+hash(shopId);await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;const old=await tx.businessAsset.findUnique({where:{id}});if(old&&old.brandId!==brandId)throw new ForbiddenException("该有赞店铺已有品牌归属");this.revision(p,old?.metadataJson);
    const data={shopId,enabled:p.enabled,evidence:required(p.evidence,12000),revision:Number((old?.metadataJson as any)?.revision||0)+1,externalStatus:"executor_reported",schemaVersion:PRIVATE_OPS_VERSION,kind:"PRIVATE_BINDING",actorId};const name=required(p.shopName,300);
    const row=old?await tx.businessAsset.update({where:{id},data:{title:name,metadataJson:data}}):await this.create(tx,brandId,actorId,"PRIVATE_BINDING",name,data,id);await this.create(tx,brandId,actorId,"PRIVATE_BINDING_REVISION",name,{...data,bindingId:id});result=this.meta(row);
   }else{
    const binding=this.meta(await this.find(tx,brandId,p.bindingId,"PRIVATE_BINDING"));if(!binding.enabled)throw Error("店铺映射已停用");
    if(action==="private_link_customer"){
     await this.customer(tx,brandId,p.customerId);const externalId=required(p.externalCustomerId,160);if(/[*＊]|(?:示例|脱敏|placeholder|customer_\d+$)/i.test(externalId))throw Error("请提供实际稳定客户标识，不能使用脱敏或示例编号");
     const id="private_identity_"+hash([binding.id,externalId]);const old=await tx.businessAsset.findUnique({where:{id}});if(old)throw new ConflictException("该有赞客户已有映射，请核对原客户，不能按姓名自动合并");result=this.meta(await this.create(tx,brandId,actorId,"PRIVATE_IDENTITY","有赞客户身份",{bindingId:binding.id,shopId:binding.shopId,customerId:p.customerId,externalCustomerId:externalId,evidence:required(p.evidence,12000)},id));
    }else if(action==="private_save_snapshot"){
     const s=p.snapshot;calendarFields(s,["domain","shopId","capturedAt","windowStart","windowEnd","coverage","toolName","workSessionId","workRequestId","receipt","limitations","reportedTotal","returnedCount"],"店铺快照");if(s.shopId!==binding.shopId)throw Error("回执店铺与绑定店铺不一致，请隔离核查");
     if(!["shop","products","members","tags","segments","orders","refunds","coupons","benefits","traffic","fulfillment","distribution","capability"].includes(s.domain))throw Error("快照领域无效");if(!["youzan_query","agent_call"].includes(s.toolName))throw Error("需要有赞真实查询回执");
     const capturedAt=date(s.capturedAt);if(Date.parse(capturedAt)>Date.now()+300000)throw Error("采集时间不能在未来");const windowStart=s.windowStart?date(s.windowStart):null,windowEnd=s.windowEnd?date(s.windowEnd):null;if(windowStart&&windowEnd&&windowStart>windowEnd)throw Error("快照时间窗无效");
     if(!Number.isSafeInteger(s.returnedCount)||s.returnedCount<0||(s.reportedTotal!==undefined&&(!Number.isSafeInteger(s.reportedTotal)||s.reportedTotal<s.returnedCount)))throw Error("返回条数或上报总数无效");
     const data={bindingId:binding.id,shopId:binding.shopId,domain:s.domain,capturedAt,windowStart,windowEnd,coverage:required(s.coverage,8000),toolName:s.toolName,workSessionId:required(s.workSessionId,64),workRequestId:required(s.workRequestId,48),receipt:required(s.receipt,120000),limitations:required(s.limitations,16000),reportedTotal:s.reportedTotal??null,returnedCount:s.returnedCount,evidenceLevel:"executor_reported",fullSyncVerified:false};
     let ownerDay:any;try{const parsed=JSON.parse(s.receipt);if(parsed.version==="private-owner-day/1")ownerDay=normalizeOwnerDay(parsed)}catch(e){if(s.receipt.includes('"private-owner-day/1"'))throw e;}
     if(ownerDay&&(s.domain!=="traffic"||windowStart!==new Date(ownerDay.date+"T00:00:00+08:00").toISOString()||windowEnd!==ownerDay.cutoff||Date.parse(capturedAt)<Date.parse(ownerDay.cutoff)))throw Error("经营日报需traffic领域及一致的开始/截止/采集时间");
     result=this.meta(await this.create(tx,brandId,actorId,"PRIVATE_SNAPSHOT",`${binding.title} · ${s.domain}`,{...data,...(ownerDay?{businessDate:ownerDay.date}:{})}));
     if(ownerDay){const id="private_day_"+hash([brandId,binding.id,ownerDay.date]),old=await tx.businessAsset.findUnique({where:{id}}),m:any=old?.metadataJson;if(!m||ownerDay.cutoff>m.cutoff||ownerDay.cutoff===m.cutoff&&capturedAt>=m.capturedAt&&!(m.queryStatus==="COMPLETED"&&ownerDay.queryStatus==="UNKNOWN")){const v={kind:"PRIVATE_OWNER_CURRENT",bindingId:binding.id,businessDate:ownerDay.date,snapshotId:result.id,cutoff:ownerDay.cutoff,queryStatus:ownerDay.queryStatus,capturedAt,actorId,schemaVersion:PRIVATE_OPS_VERSION};if(old)await tx.businessAsset.update({where:{id},data:{metadataJson:v}});else await this.create(tx,brandId,actorId,"PRIVATE_OWNER_CURRENT",`${binding.title} · ${ownerDay.date}`,v,id);}}
    }
   }
   if(!result)throw Error("私域操作未完成");await this.create(tx,brandId,actorId,"PRIVATE_RECEIPT","私域运营保存回执",{requestHash,result},receiptId);return result;
  },{timeout:30000});
 }catch(e){if(e instanceof BadRequestException||e instanceof ConflictException||e instanceof ForbiddenException||e instanceof NotFoundException||e instanceof ServiceUnavailableException)throw e;throw new BadRequestException(e instanceof Error?e.message:"私域操作失败");}}
}
