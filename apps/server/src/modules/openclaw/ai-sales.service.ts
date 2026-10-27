import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AssetCategory } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { calendarFields, calendarText } from "@ai-omni/shared/marketing-calendar";
import { SALES_ACTIONS, SALES_ENTITIES, SALES_FIELDS, SALES_LABELS, SALES_READ_ACTIONS, SALES_SCHEMA, SALES_VERSION, THREECHAT_TOOLS, type SalesEntity } from "@ai-omni/shared/ai-sales";

const canonical=(x:any):any=>Array.isArray(x)?x.map(canonical):x&&typeof x==="object"?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=(x:any)=>createHash("sha256").update(JSON.stringify(canonical(x))).digest("hex");
const txt=(x:any,n=4000)=>calendarText(x,n);
const required=(x:any,n=4000)=>{const v=txt(x,n);if(!v)throw Error("请填写必填内容");return v;};
const array=(x:any,n=100)=>{if(!Array.isArray(x)||x.length>n)throw Error(`列表最多${n}项`);return x;};
const iso=(x:any)=>{const s=required(x,60);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s.slice(0,10)).toISOString().slice(0,10)!==s.slice(0,10))throw Error("时间需要有效的ISO日期与明确时区");return new Date(s).toISOString();};
const cents=(s:string)=>{if(!/^\d{1,12}(\.\d{1,2})?$/.test(s))throw Error("金额须为非负十进制字符串，最多两位小数");const [a,b=""]=s.split(".");return BigInt(a)*100n+BigInt(b.padEnd(2,"0"));};
export function normalizeSalesBody(entity:SalesEntity,input:any):any {
 const fields=SALES_FIELDS[entity];if(!fields)throw Error("不支持的销售记录类型");calendarFields(input,fields.map(f=>f.key),"销售资料");const b:any={};
 for(const f of fields){if(["products","content"].includes(f.type||"")){b[f.key]=array(input[f.key]??[],20).map(x=>required(x,160));if(new Set(b[f.key]).size!==b[f.key].length)throw Error("关联资料不能重复");continue;}
  const raw=input[f.key];if(raw!==undefined&&typeof raw!=="string")throw Error(`${f.label}必须是文字`);b[f.key]=txt(raw,f.type==="textarea"?40000:1000);if(f.required&&!b[f.key])throw Error(`请填写${f.label}`);
  if(f.options&&b[f.key]&&!f.options.includes(b[f.key]))throw Error(`${f.label}选项无效`);
  if(f.type==="datetime-local"&&b[f.key])b[f.key]=iso(b[f.key]);
  if(f.type==="date"&&b[f.key]&&(!/^\d{4}-\d{2}-\d{2}$/.test(b[f.key])||new Date(b[f.key]).toISOString().slice(0,10)!==b[f.key]))throw Error(`${f.label}无效`);
 }
 if(entity==="customer"&&b.contactPreference!=="unknown"&&!b.contactEvidence)throw Error("联系偏好需要客户原话或有效依据");
 if(entity==="opportunity"){
  if(b.amountCny)cents(b.amountCny);
  if(!["new","lost","nurture"].includes(b.stage)&&(!b.need||!b.stageEvidence||!b.nextAction||!b.nextDue))throw Error("推进商机需要客户需求、本阶段依据、下一步和时间");
  if(b.mode==="B2B"&&["solution","negotiation","won","delivery","retained"].includes(b.stage)&&(!b.decisionChain||!b.qualification||!b.solutionOwner||!b.deliveryOwner))throw Error("大客户商机需要决策链、资格依据、方案与交付负责人");
  if(["solution","negotiation","won","delivery","retained"].includes(b.stage)&&!b.valueProposal)throw Error("请先保存匹配客户需求的价值方案");
  if(["won","delivery","retained"].includes(b.stage)&&!b.contractEvidence)throw Error("签约阶段需要真实合同或订单依据");
  if(["delivery","retained"].includes(b.stage)&&!b.deliveryEvidence)throw Error("交付阶段需要履约依据");
  if(b.stage==="retained"&&!b.paymentEvidence)throw Error("客户经营阶段需要到账依据；聊天意向不能当成交");
  if(["lost","nurture"].includes(b.stage)&&!b.lossReason)throw Error("请记录丢单或培育原因");
 }
 if(entity==="activity"&&b.status==="done"&&!b.outcome)throw Error("完成跟进需要实际结果");
 if(entity==="service"&&b.status==="resolved"&&(!b.resolution||!b.evidence))throw Error("服务解决需要结果与依据");
 if(entity==="order"){
  const amount=cents(b.amountCny),paid=cents(b.paidCny),refund=cents(b.refundedCny);if(paid>amount||refund>paid)throw Error("实收不能超过订单金额，退款不能超过累计实收");
  if((paid>0n||refund>0n||["paid","fulfilled","refunded"].includes(b.status))&&(!b.paymentEvidence||!b.paidAt))throw Error("付款/退款需要支付时间与业务回执依据");
  if(["pending","cancelled"].includes(b.status)&&(paid!==refund))throw Error("待付或已取消订单不能保留未退款的实收");
  if(b.status==="paid"&&paid<=refund)throw Error("已付款订单需要正净实收");
  if(b.status==="fulfilled"&&!b.deliveryEvidence)throw Error("履约需要交付依据");
  if(b.status==="refunded"&&(refund===0n||refund!==paid))throw Error("已退款状态需要全额退款依据；部分退款保留付款/履约状态");
 }
 if(entity==="insight"&&b.periodStart>b.periodEnd)throw Error("复盘开始时间不能晚于结束时间");
 return b;
}

@Injectable()
export class AISalesService {
 constructor(private readonly prisma:PrismaService){}
 private meta(r:any){const m=r.metadataJson;return {...m,id:r.id,title:r.title,createdAt:r.createdAt,updatedAt:r.updatedAt,...(m?.entity==="message"?{contentHash:digest(m.body),executionKey:digest([r.brandId,r.id,m.revision,digest(m.body)])}:{})};}
 private where(brandId:string,kind:string,extra:any[]=[]){return {brandId,category:AssetCategory.GENERATED_REPORT,AND:[{metadataJson:{path:["kind"],equals:kind}},...extra]};}
 private async find(db:any,brandId:string,id:any,kind="SALES_RECORD",entity?:string){const r=await db.businessAsset.findFirst({where:{id:required(id,160),...this.where(brandId,kind)}});if(!r||(entity&&r.metadataJson?.entity!==entity))throw new NotFoundException("本品牌销售记录不存在");return r;}
 private searchText(b:any){return [b.name,b.phone,b.email,b.owner,b.need,b.tags,b.sourceAccount,b.externalOrderId,b.valueProposal,b.issue].filter(Boolean).join(" ").slice(0,12000);}
 private create(db:any,brandId:string,actorId:string,kind:string,title:string,data:any,id="sales_"+randomUUID()){return db.businessAsset.create({data:{id,brandId,category:AssetCategory.GENERATED_REPORT,title,...(kind==="SALES_RECORD"?{description:this.searchText(data.body)}:{}),metadataJson:{...data,kind,actorId,schemaVersion:SALES_VERSION}}});}
 private revision(p:any,m:any){if(!Number.isSafeInteger(p.expectedRevision)||p.expectedRevision!==m.revision)throw new ConflictException({message:"资料已更新，请重新读取后保存",currentRevision:m.revision});}
 private async manager(db:any,brandId:string,actorId:string){const b=await db.brand.findUnique({where:{id:brandId}}),m=await db.brandMember.findFirst({where:{brandId,userId:actorId,status:"ACTIVE"}});if(b?.ownerUserId!==actorId&&m?.role!=="ADMIN")throw new ForbiddenException("连接归属仅品牌所有者或管理员可设置");}
 private async save(db:any,brandId:string,actorId:string,old:any,entity:SalesEntity,body:any,extras:any={}){
  const m=old?.metadataJson??{},data={...m,...extras,entity,body,revision:(m.revision??0)+1};
  const row=old?await db.businessAsset.update({where:{id:old.id},data:{title:body.name,description:this.searchText(body),metadataJson:{...data,actorId}}}):await this.create(db,brandId,actorId,"SALES_RECORD",body.name,data);
  await this.create(db,brandId,actorId,"SALES_REVISION",body.name,{...data,recordId:row.id,kind:"SALES_REVISION"});return this.meta(row);
 }
 private async references(db:any,brandId:string,b:any){
  for(const [key,entity] of [["customerId","customer"],["accountId","account"],["opportunityId","opportunity"]])if(b[key]){const r=await this.find(db,brandId,b[key],"SALES_RECORD",entity);if(key==="opportunityId"&&b.customerId&&r.metadataJson.body.customerId!==b.customerId)throw Error("商机与客户不一致");}
  for(const id of b.productIds??[])if(!await db.product.findFirst({where:{id,brandId}}))throw Error("产品不属于当前品牌");
  for(const id of b.contentRefs??[]){const asset=await db.businessAsset.findFirst({where:{id,brandId}}),media=asset?null:await db.mediaAsset.findFirst({where:{id,brandId}});if(!asset&&!media)throw Error("内容不属于当前品牌");if(asset&&String(asset.metadataJson?.kind||"").startsWith("SALES_"))throw Error("请关联品牌产品/案例/营销内容，不能把客户私密档案作为触达附件");}
 }
 private async list(brandId:string,p:any){
  const entity=p.entity as SalesEntity;if(!SALES_ENTITIES.includes(entity))throw Error("请选择销售记录类型");
  const limit=Number(p.limit??30),offset=Number(p.offset??0);if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>1000000)throw Error("分页范围不合法");
  const filters:any[]=[{metadataJson:{path:["entity"],equals:entity}}];if(p.customerId){await this.find(this.prisma,brandId,p.customerId,"SALES_RECORD","customer");filters.push({metadataJson:{path:["body","customerId"],equals:p.customerId}});}
  if(entity==="service"&&p.status==="unresolved")filters.push({NOT:{metadataJson:{path:["body","status"],equals:"resolved"}}});
  else if(p.status)filters.push({metadataJson:{path:["body",entity==="opportunity"?"stage":entity==="customer"?"lifecycle":"status"],equals:required(p.status,80)}});
  if(p.dueBefore){if(entity!=="activity")throw Error("到期筛选适用于跟进任务");filters.push({metadataJson:{path:["body","dueAt"],lte:iso(p.dueBefore)}});}
  const where:any=this.where(brandId,"SALES_RECORD",filters);if(p.keyword)where.OR=[{title:{contains:required(p.keyword,200),mode:"insensitive"}},{description:{contains:required(p.keyword,200),mode:"insensitive"}}];
  const [rows,total]=await Promise.all([this.prisma.businessAsset.findMany({where,orderBy:[{updatedAt:"desc"},{id:"asc"}],skip:offset,take:limit}),this.prisma.businessAsset.count({where})]);return {items:rows.map(r=>this.meta(r)),total,offset,limit,hasMore:offset+rows.length<total};
 }
 private async workspace(brandId:string){
  const counts=Object.fromEntries(await Promise.all(SALES_ENTITIES.map(async entity=>[entity,await this.prisma.businessAsset.count({where:this.where(brandId,"SALES_RECORD",[{metadataJson:{path:["entity"],equals:entity}}])})])));
  const pipeline=await Promise.all(["new","qualified","solution","negotiation","won","delivery","retained","lost","nurture"].map(async stage=>({stage,count:await this.prisma.businessAsset.count({where:this.where(brandId,"SALES_RECORD",[{metadataJson:{path:["entity"],equals:"opportunity"}},{metadataJson:{path:["body","stage"],equals:stage}}])})})));
  const [bindings,products,content]=await Promise.all([
   this.prisma.businessAsset.findMany({where:this.where(brandId,"SALES_BINDING"),orderBy:{createdAt:"desc"},take:100}),
   this.prisma.product.findMany({where:{brandId},select:{id:true,productName:true},take:500,orderBy:{createdAt:"desc"}}),
   this.prisma.businessAsset.findMany({where:{brandId,NOT:{id:{startsWith:"sales_"}}},select:{id:true,title:true,category:true},take:60,orderBy:{updatedAt:"desc"}}),
  ]);
  const money:any=await this.prisma.$queryRaw`SELECT COUNT(*)::text AS count, COALESCE(SUM(("metadataJson"#>>'{body,paidCny}')::numeric - ("metadataJson"#>>'{body,refundedCny}')::numeric),0)::text AS net FROM "BusinessAsset" WHERE "brandId"=${brandId} AND "metadataJson"->>'kind'='SALES_RECORD' AND "metadataJson"->>'entity'='order' AND "metadataJson"#>>'{body,sourceStatus}' IN ('provider_reported','manual_confirmed')`;
  return {schemaVersion:SALES_VERSION,brandId,counts,pipeline,bindings:bindings.map(r=>this.meta(r)),products,content,productsLimit:500,contentLimit:60,tools:THREECHAT_TOOLS,netReceiptsCny:Number(money[0]?.count)>0?money[0].net:null,metricsScope:"当前品牌已保存订单的上报累计净实收；非周期收入或独立财务核验",externalSendEnabled:false,configurationApplied:false};
 }
 async run(brandId:string,actorId:string,action:string,p:any):Promise<any>{try{
  if(!SALES_ACTIONS.includes(action as any))throw Error("不支持的AI销售操作");calendarFields(p,Object.keys(SALES_SCHEMA.properties),"AI销售参数");if(JSON.stringify(p).length>800000)throw Error("内容过大，请分页保存");if(!await this.prisma.canUseDatabase())throw new ServiceUnavailableException("AI销售数据库不可用");
  if(action==="sales_get_workspace")return this.workspace(brandId);
  if(action==="sales_list_records")return this.list(brandId,p);
  if(action==="sales_get_record"||action==="sales_get_history"){
   const r=await this.find(this.prisma,brandId,p.recordId);const kind=action==="sales_get_history"?"SALES_REVISION":"SALES_CONTEXT",path=action==="sales_get_history"?"recordId":"customerId";
   const rows=await this.prisma.businessAsset.findMany({where:this.where(brandId,kind,[{metadataJson:{path:[path],equals:r.id}}]),orderBy:[{createdAt:"desc"},{id:"desc"}],take:100});
   return action==="sales_get_history"?{items:rows.map(x=>this.meta(x)),limit:100}: {record:this.meta(r),contexts:rows.map(x=>this.meta(x))};
  }
  const key=required(p.idempotencyKey,160);if(key.length<8)throw Error("操作编号过短");const receiptId="sales_receipt_"+digest([brandId,actorId,key]),requestHash=digest({action,p});
  return await this.prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"sales:"+brandId}))::text`;
   const receipt=await tx.businessAsset.findFirst({where:{id:receiptId,brandId}});if(receipt){const m:any=receipt.metadataJson;if(m.requestHash!==requestHash)throw new ConflictException("同一操作编号的内容不同");return {...m.result,replayed:true};}
   let result:any;
   if(action==="sales_save_record"){
    const entity=p.entity as SalesEntity,body=normalizeSalesBody(entity,p.body);await this.references(tx,brandId,body);
    const old=p.recordId?await this.find(tx,brandId,p.recordId,"SALES_RECORD",entity):null;this.revision(p,old?.metadataJson??{revision:0});
    if(entity==="message"&&(old?.metadataJson as any)?.delivery)throw Error("此草稿已提交发送回执，请新建草稿保留发送版本");
    if(entity==="order"){
     const duplicate=await tx.businessAsset.findFirst({where:{...this.where(brandId,"SALES_RECORD",[{metadataJson:{path:["entity"],equals:"order"}},{metadataJson:{path:["body","sourceAccount"],equals:body.sourceAccount}},{metadataJson:{path:["body","externalOrderId"],equals:body.externalOrderId}}]),...(old?{id:{not:old.id}}:{})}});if(duplicate)throw new ConflictException("该业务订单已经存在，请更新原订单，不能重复计入回款");
    }
    result=await this.save(tx,brandId,actorId,old,entity,body);
    if(entity==="message"){result.contentHash=digest(body);result.executionKey=digest([brandId,result.id,result.revision,result.contentHash]);}
   }else if(action==="sales_save_binding"){
    await this.manager(tx,brandId,actorId);const spaceId=required(p.spaceId,160),channelAccountId=required(p.channelAccountId,160),label=required(p.label,200),evidence=required(p.evidence,8000);
    if(typeof p.enabled!=="boolean")throw Error("请选择连接是否启用");
    const id="sales_binding_"+digest([spaceId,channelAccountId]);await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
    const old=await tx.businessAsset.findUnique({where:{id}});if(old&&old.brandId!==brandId)throw new ForbiddenException("该外部渠道已有品牌归属，需要先核对归属");this.revision(p,old?.metadataJson??{revision:0});
    const data={spaceId,channelAccountId,channelType:required(p.channelType,120),enabled:p.enabled,evidence,revision:Number((old?.metadataJson as any)?.revision??0)+1,kind:"SALES_BINDING",actorId,schemaVersion:SALES_VERSION,confirmedAt:new Date().toISOString(),liveStatus:"unverified"};
    const row=old?await tx.businessAsset.update({where:{id},data:{title:label,metadataJson:data}}):await this.create(tx,brandId,actorId,"SALES_BINDING",label,data,id);
    await this.create(tx,brandId,actorId,"SALES_BINDING_REVISION",label,{...data,bindingId:id});result=this.meta(row);
   }else if(action==="sales_link_customer"){
    const old=await this.find(tx,brandId,p.recordId,"SALES_RECORD","customer"),m:any=old.metadataJson;this.revision(p,m);const binding=await this.binding(tx,brandId,p.bindingId),customerId=required(p.externalCustomerId,160),identityId="sales_identity_"+digest([binding.id,customerId]);
    const taken=await tx.businessAsset.findUnique({where:{id:identityId}});if(taken)throw new ConflictException("该3Chat客户已有档案，请使用原档案，不能按姓名自动合并");
    if(m.external)throw Error("该档案已有外部身份，不能覆盖；请核对原映射");
    const evidence=required(p.evidence,8000);await this.create(tx,brandId,actorId,"SALES_IDENTITY","3Chat客户身份映射",{recordId:old.id,bindingId:binding.id,customerId,evidence},identityId);
    result=await this.save(tx,brandId,actorId,old,"customer",m.body,{external:{bindingId:binding.id,customerId,spaceId:binding.metadataJson.spaceId,channelAccountId:binding.metadataJson.channelAccountId,identityEvidence:evidence}});
   }else if(action==="sales_import_customers"){
    const binding=await this.binding(tx,brandId,p.bindingId),toolName=required(p.toolName,200);if(toolName!=="search_3chat_customers")throw Error("客户快照需要客户查询工具的真实回执");const sourceEvidence=required(p.sourceEvidence,12000),items=array(p.customers,100),seen=new Set();const imported=[],skipped=[];
    for(const item of items){calendarFields(item,["customerId","name","updatedAt","profile","evidence"],"客户快照");const customerId=required(item.customerId,160);if(seen.has(customerId))throw Error("本页包含重复客户");seen.add(customerId);const sourceUpdatedAt=iso(item.updatedAt);if(Date.parse(sourceUpdatedAt)>Date.now()+300000)throw Error("来源更新时间不能在未来");
     const identityId="sales_identity_"+digest([binding.id,customerId]);const identity=await tx.businessAsset.findFirst({where:{id:identityId,brandId}});const old=identity?await this.find(tx,brandId,(identity.metadataJson as any).recordId,"SALES_RECORD","customer"):null,m:any=old?.metadataJson??{};
     if(!item.profile||typeof item.profile!=="object"||Array.isArray(item.profile)||Object.keys(item.profile).length>60)throw Error("客户快照字段过多或格式错误");const profile=Object.fromEntries(Object.entries(item.profile).map(([k,v])=>[required(k,120),txt(v,3000)]));
     const name=required(item.name,200),evidence=required(item.evidence,8000),snapshotHash=digest({name,profile});
     if(m.external?.sourceUpdatedAt&&m.external.sourceUpdatedAt>=sourceUpdatedAt){if(m.external.sourceUpdatedAt===sourceUpdatedAt&&m.external.snapshotHash&&m.external.snapshotHash!==snapshotHash)throw new ConflictException("来源同一时间的客户快照内容冲突，请核对后重取");skipped.push(customerId);continue;}
     const body=old?m.body:normalizeSalesBody("customer",{name,owner:"待分配",lifecycle:"prospect",contactPreference:"unknown",sourceEvidence:evidence});
     const row=await this.save(tx,brandId,actorId,old,"customer",body,{external:{...m.external,bindingId:binding.id,customerId,spaceId:binding.metadataJson.spaceId,channelAccountId:binding.metadataJson.channelAccountId,sourceUpdatedAt,profile,snapshotHash,reportedName:name,toolName,sourceEvidence,evidence,sourceStatus:"provider_reported"}});
     if(!identity)await this.create(tx,brandId,actorId,"SALES_IDENTITY","3Chat客户身份映射",{recordId:row.id,bindingId:binding.id,customerId,evidence},identityId);imported.push(row.id);
    }result={imported,skipped,importedCount:imported.length,skippedCount:skipped.length,fullSpaceSynced:false};
    await this.create(tx,brandId,actorId,"SALES_SYNC_PAGE","3Chat客户分页回写",{bindingId:binding.id,toolName,sourceEvidence,...result,capturedAt:new Date().toISOString()});
    await tx.businessAsset.update({where:{id:binding.id},data:{metadataJson:{...binding.metadataJson,lastImportAt:new Date().toISOString(),lastPageCount:items.length}}});
   }else if(action==="sales_record_context"){
    const customer=await this.find(tx,brandId,p.customerId,"SALES_RECORD","customer"),m:any=customer.metadataJson;if(!m.external)throw Error("请先核对3Chat客户身份映射");await this.binding(tx,brandId,m.external.bindingId);
    if(!["search_3chat_customers_context","search_3chat_conversations"].includes(p.toolName))throw Error("请提供真实上下文或会话查询回执");
    calendarFields(p.context,["summary","windowStart","windowEnd","coverage","conversationIds","facts"],"客户上下文");const c=p.context;
    const facts=array(c.facts,40).map(f=>{calendarFields(f,["field","value","state","source","confidence"],"客户事实");if(!["confirmed","inferred","unknown"].includes(f.state))throw Error("请区分事实、推断与未知");if(f.confidence!==undefined&&(typeof f.confidence!=="number"||f.confidence<0||f.confidence>1))throw Error("置信度无效");return {field:required(f.field,120),value:txt(f.value,4000),state:f.state,source:required(f.source,4000),...(f.confidence!==undefined?{confidence:f.confidence}:{})};});
    const context={summary:required(c.summary,30000),coverage:required(c.coverage,4000),conversationIds:array(c.conversationIds,100).map(x=>required(x,160)),facts,windowStart:c.windowStart?iso(c.windowStart):null,windowEnd:c.windowEnd?iso(c.windowEnd):null};if(context.windowStart&&context.windowEnd&&context.windowStart>context.windowEnd)throw Error("上下文时间窗无效");
    result=this.meta(await this.create(tx,brandId,actorId,"SALES_CONTEXT","客户沟通摘要与依据",{customerId:customer.id,context,toolName:p.toolName,sourceEvidence:required(p.sourceEvidence,12000),sourceStatus:"executor_reported",capturedAt:new Date().toISOString()}));
   }else if(action==="sales_record_delivery"){
    const draft=await this.find(tx,brandId,p.recordId,"SALES_RECORD","message"),m:any=draft.metadataJson;const customer=await this.find(tx,brandId,m.body.customerId,"SALES_RECORD","customer"),cm:any=customer.metadataJson;
    if(!cm.external)throw Error("客户尚未关联3Chat身份");await this.binding(tx,brandId,cm.external.bindingId);
    calendarFields(p.delivery,["draftRevision","contentHash","executionKey","confirmationText","confirmationSource","toolName","jobId","status","providerEvidence"],"发送回执");const d=p.delivery,contentHash=digest(m.body),executionKey=digest([brandId,draft.id,m.revision,contentHash]);
    if(d.draftRevision!==m.revision||d.contentHash!==contentHash||d.executionKey!==executionKey)throw new ConflictException("发送版本与当前草稿不一致，请保留原文并核对");
    if(!["processing","processed","failed","unknown"].includes(d.status))throw Error("发送状态无效");
    const allowed=["send_3chat_customer_message","send_3chat_customer_messages","send_3chat_customer_whatsapp_template","get_3chat_batch_send_status"];
    if(!allowed.includes(d.toolName))throw Error("请提交对应客户的实际发送或状态工具回执");
    if(m.delivery){if(["processed","failed"].includes(m.delivery.status))throw new ConflictException("此发送已终结，保留原回执，不能重复提交或改为新发送");if(!m.delivery.jobId||m.delivery.jobId!==d.jobId||d.toolName!=="get_3chat_batch_send_status")throw Error("已有提交只能按同一job查询；未知单发结果不能自动重发");}
    if(d.toolName==="get_3chat_batch_send_status"&&!m.delivery)throw Error("请先保存原发送受理回执");
    if(d.toolName==="send_3chat_customer_messages"&&["processing","processed"].includes(d.status)&&!d.jobId)throw Error("批次受理需要job_id；结果不明请保留未知并人工核对");
    const delivery={...d,confirmationText:required(d.confirmationText,4000),confirmationSource:required(d.confirmationSource,4000),providerEvidence:required(d.providerEvidence,16000),jobId:txt(d.jobId,160),recordedBy:actorId,recordedAt:new Date().toISOString(),evidenceLevel:"executor_reported",deliveredVerified:false};
    await tx.businessAsset.update({where:{id:draft.id},data:{metadataJson:{...m,delivery}}});result=this.meta(await this.create(tx,brandId,actorId,"SALES_DELIVERY",draft.title,{recordId:draft.id,customerId:customer.id,...delivery}));
   }
   if(!result)throw Error("销售操作未完成");await this.create(tx,brandId,actorId,"SALES_RECEIPT","AI销售操作回执",{requestHash,result},receiptId);return result;
  },{timeout:30000});
 }catch(e){if(e instanceof BadRequestException||e instanceof ConflictException||e instanceof ForbiddenException||e instanceof NotFoundException||e instanceof ServiceUnavailableException)throw e;throw new BadRequestException(e instanceof Error?e.message:"AI销售操作失败");}}
 private async binding(db:any,brandId:string,id:any){const r=await this.find(db,brandId,id,"SALES_BINDING");if(!r.metadataJson.enabled)throw Error("该渠道映射已停用");return r;}
}
