export const PRIVATE_OPS_VERSION = "private-operations/1.6.0";
export const PRIVATE_OPS_PERMISSION = "privateRepurchase.operations";
export const PRIVATE_OPS_ACTIONS = ["private_get_workspace","private_list_records","private_get_record","private_get_history","private_preview_segment","private_get_customer_context","private_save_record","private_bind_shop","private_link_customer","private_save_snapshot","private_get_growth_analysis","private_save_growth_data","private_get_business_board","private_save_analytics","private_get_analytics"] as const;
export const PRIVATE_OPS_READ_ACTIONS: readonly string[] = [...PRIVATE_OPS_ACTIONS.slice(0,6),"private_get_growth_analysis","private_get_business_board","private_get_analytics"];
export const PRIVATE_OPS_ENTITIES = ["strategy","tactic","task","tag","assertion","need","segment","journey","benefit","review"] as const;
export type PrivateOpsEntity = typeof PRIVATE_OPS_ENTITIES[number];
export type PrivateOpsField = {key:string;label:string;required?:boolean;type?:"textarea"|"customer"|"record"|"datetime-local"|"date";options?:readonly string[]};
const f=(key:string,label:string,required=false,type?:PrivateOpsField["type"],options?:readonly string[]):PrivateOpsField=>({key,label,required,type,options});
const state=f("status","状态",true,undefined,["draft","ready","in_progress","completed","blocked","archived"]);
const base=[f("name","名称",true),f("owner","负责人",true),state];
const metricFields=[f("metricKey","这项安排要改善什么指标",false,undefined,["","traffic","conversion","aov","repeat","ads","sales"]),f("targetValue","目标数值（未知留空）"),f("targetDate","目标日期",false,"date"),f("targetShopId","目标店铺")];
const evidence=f("evidence","来源与依据",true,"textarea");
export const PRIVATE_OPS_FIELDS:Record<PrivateOpsEntity,readonly PrivateOpsField[]>={
 strategy:[...base,f("businessModel","品牌生意模式与私域承接",false,"textarea"),f("stagePlan","阶段路径（由AI整理）",false,"textarea"),f("diagnosis","经营诊断",true,"textarea"),f("customerValue","为客户解决什么问题",true,"textarea"),f("goal","目标、指标口径与阶段验收",true,"textarea"),f("resources","货盘、毛利、团队与履约约束",true,"textarea"),f("content","运营主线与增长路径",true,"textarea"),f("audience","目标客户与经营场景",false,"textarea"),f("offerPlan","商品、内容与会员价值设计",false,"textarea"),f("channelPlan","渠道承接与运营节奏",false,"textarea"),f("dataComparison","运营思路与数据对照",false,"textarea"),f("limitations","缺口与不确定性",true,"textarea"),evidence],
 tactic:[...base,f("businessTrackId","承接哪条经营路线"),...metricFields,f("activityPlan","具体活动单（由AI整理）",false,"textarea"),f("ownerSummary","老板看的一句话行动",false,"textarea"),f("parentId","关联战略",true,"record"),f("audience","适用人群与场景",true,"textarea"),f("customerValue","客户价值",true,"textarea"),f("content","运营打法与客户参与理由",true,"textarea"),f("executionPlan","内容、渠道与具体执行安排",false,"textarea"),f("dataComparison","运营思路与数据对照",false,"textarea"),f("executionSpec","有赞功能与执行配置",false,"textarea"),f("audienceRule","标签规则与人群依据",false,"textarea"),f("measurementPlan","效果验证与调整规则",false,"textarea"),f("economics","预算、成本、毛利与权益叠加",true,"textarea"),f("successMetric","验收口径与对照方法",true,"textarea"),f("exitRule","退出与不适用条件",true,"textarea"),evidence],
 task:[...base,f("metricKey","要改善的指标（留空沿用关联策略）",false,undefined,["","traffic","conversion","aov","repeat","ads","sales"]),f("parentId","关联策略或旅程",false,"record"),f("customerId","关联客户",false,"customer"),f("dueAt","计划时间",true,"datetime-local"),f("content","具体行动与交付物",true,"textarea"),f("channel","执行平台",true,undefined,["youzan","3chat","content","ecommerce","manual"]),f("capacity","库存、人员、服务与触达容量",true,"textarea"),f("outcome","实际结果",false,"textarea"),f("receipt","执行回执、外部任务与查询方式",false,"textarea"),evidence],
 tag:[...base,f("group","标签组",true),f("cardinality","组内规则",true,undefined,["multiple","exclusive"]),f("definition","定义与适用范围",true,"textarea"),f("rule","人工/自动依据与重算规则",true,"textarea"),evidence],
 assertion:[...base,f("customerId","客户",true,"customer"),f("tagId","标签定义",true,"record"),f("value","标签值",true),f("context","适用场景",true),f("state","依据状态",true,undefined,["candidate","confirmed","conflict","revoked"]),f("sourceType","来源",true,undefined,["customer_stated","provider_receipt","manual_confirmed","rule_derived"]),f("observedAt","事实发生时间",true,"datetime-local"),f("validUntil","有效至",false,"datetime-local"),f("confidence","置信度（0—1，可空）"),evidence],
 need:[...base,f("customerId","客户",true,"customer"),f("context","当前场景与角色",true),f("content","需求、偏好与价值目标",true,"textarea"),f("constraints","不适用条件与服务限制",true,"textarea"),f("dueAt","复核时间",false,"datetime-local"),evidence],
 segment:[...base,f("definition","人群目的与统计口径",true,"textarea"),f("conditions","标签条件（由AI维护）",true,"textarea"),f("content","对应服务与行动",true,"textarea"),evidence],
 journey:[...base,f("customerId","客户（留空为人群旅程）",false,"customer"),f("parentId","关联策略",false,"record"),f("trigger","进入条件与触发依据",true,"textarea"),f("content","逐次服务、内容、推荐与行动",true,"textarea"),f("exitRule","成交、服务、退订、疲劳与重复旅程停止条件",true,"textarea"),f("successMetric","客户价值与经营验收",true,"textarea"),evidence],
 benefit:[...base,f("type","类型",true,undefined,["membership","points","coupon","stored_value","gift_card","service"]),f("content","权益、适用人群、规则与服务",true,"textarea"),f("economics","成本、负债、叠加与履约测算",true,"textarea"),f("externalId","有赞现有权益标识"),evidence],
 review:[...base,f("periodStart","开始时间",true,"datetime-local"),f("periodEnd","结束时间",true,"datetime-local"),f("definition","指标定义、分母与时间窗",true,"textarea"),f("content","客户价值、经营效果与原因分析",true,"textarea"),f("limitations","覆盖范围、归因与证据缺口",true,"textarea"),f("actions","调整动作、负责人、期限与验收",true,"textarea"),evidence],
};
export const PRIVATE_OPS_LABELS:Record<string,string>={traffic:"进店人数",conversion:"付款转化率",aov:"客单价",repeat:"复购买家占比",ads:"广告成交回报",sales:"付款金额",strategy:"战略规划",tactic:"运营策略",task:"执行任务",tag:"标签定义",assertion:"客户标签",need:"场景需求",segment:"客户分群",journey:"客户旅程",benefit:"会员权益",review:"经营复盘",draft:"草稿",ready:"待执行",in_progress:"进行中",completed:"已完成",blocked:"待解决",archived:"归档",candidate:"待确认",confirmed:"有依据",conflict:"有冲突",revoked:"已撤销",multiple:"可并存",exclusive:"互斥",customer_stated:"客户表达",provider_receipt:"连接器回执",manual_confirmed:"人工确认",rule_derived:"规则计算",youzan:"有赞",content:"内容获客",ecommerce:"电商",manual:"人工",membership:"会员等级",points:"积分",coupon:"优惠券",stored_value:"储值",gift_card:"礼品卡",service:"服务"};
const str={type:"string"};
const bodyProperties=Object.fromEntries([...new Set(Object.values(PRIVATE_OPS_FIELDS).flatMap(v=>v.map(x=>x.key)))].map(key=>[key,{...str,description:Object.entries(PRIVATE_OPS_FIELDS).flatMap(([entity,fields])=>fields.filter(f=>f.key===key).map(f=>`${entity}：${f.label}${f.required?"（必填）":""}${f.options?"；选项="+f.options.join("|"):""}${f.type==="datetime-local"?"；ISO8601带时区":""}`)).join("；")} ]));
bodyProperties.businessModel.description+="；brand-business-model/1 JSON字符串；先从品牌资料、全域增长报告和经营事实解释客户/收入线/货盘/渠道/私域职责/并行路线；完整结构见技能15，不以单品试点替代全品牌。";
bodyProperties.businessTrackId.description+="；关联战略businessModel.tracks中真实id；新式战略下策略必须选择匹配路线，其metricKey须属于该路线goals。";
bodyProperties.stagePlan.description+="；private-roadmap/1 JSON字符串，当前阶段/依据/本轮重点/有先后顺序的阶段目标与进入下一阶段条件；先读技能12。";
bodyProperties.activityPlan.description+="；private-activity/1 JSON字符串，阶段、四指标之一、商品/SKU、拟议价与库存、起止时间、人群、逐项日历、有赞配置、完整文案、目标测算、复盘分支；先读技能12，默认草案，不会创建真实活动。";
bodyProperties.dataComparison.description+="；JSON数组字符串，1至12条，每条metric/baseline/period/insight/action/target/actual/source为必填字符串，scope/limitations可选；每字段最多4000字；预期写target，执行实际写actual，未执行明确注明，不得混同。";
export const PRIVATE_OPS_SCHEMA={type:"object",additionalProperties:false,properties:{
 entity:{type:"string",enum:PRIVATE_OPS_ENTITIES},recordId:str,customerId:str,keyword:str,status:str,offset:{type:"integer",minimum:0},limit:{type:"integer",minimum:1,maximum:100},
 businessDate:{type:"string",description:"经营日期YYYY-MM-DD，东八区；private_get_business_board使用，不以14日累计替代当日"},dataId:str,data:{type:"string",description:"private-growth-data/1明细或private-growth-report/1来源汇总 JSON字符串；仅同绑定店铺、脱敏稳定客户键、最小订单/会员数据，最多2000单/5000客户/2MB，完整性和历史范围如实声明；MCP使用前读技能数据契约。"},tag:str,idempotencyKey:str,expectedRevision:{type:"integer",minimum:0},body:{type:"object",additionalProperties:false,properties:bodyProperties},
 analytics:{type:"string",description:"private_save_analytics使用：private-analytics/1 JSON字符串；各经营分区独立记录日期/店铺渠道范围/来源/完整性，指标及真实序列、活动/人群对象；未知null，不编趋势。完整契约见技能16。private_get_analytics可用bindingId或dataId读回。"},
 shopId:str,shopName:str,bindingId:str,evidence:str,enabled:{type:"boolean"},externalCustomerId:str,
 snapshot:{type:"object",additionalProperties:false,properties:{domain:str,shopId:str,capturedAt:str,windowStart:str,windowEnd:str,coverage:str,toolName:str,workSessionId:str,workRequestId:str,receipt:str,limitations:str,reportedTotal:{type:"integer",minimum:0},returnedCount:{type:"integer",minimum:0}},required:["domain","shopId","capturedAt","coverage","toolName","workSessionId","workRequestId","receipt","limitations","returnedCount"]},
}} as const;


export const PRIVATE_COMPARISON_FIELDS = [
 {key:"metric",label:"观察指标"},{key:"baseline",label:"已有数据"},{key:"period",label:"数据时间"},{key:"scope",label:"店铺与统计范围"},
 {key:"insight",label:"运营判断"},{key:"action",label:"对应打法"},{key:"target",label:"预期与验证标准"},{key:"actual",label:"执行后实际结果"},
 {key:"source",label:"资料来源"},{key:"limitations",label:"数据说明"}
] as const;
export type PrivateComparisonRow = Record<typeof PRIVATE_COMPARISON_FIELDS[number]["key"],string>;
export function normalizePrivateComparison(value:string):PrivateComparisonRow[]{
 let rows:any;try{rows=JSON.parse(value);}catch{throw Error("数据对照需要结构化条目");}
 if(!Array.isArray(rows)||rows.length<1||rows.length>12)throw Error("数据对照需要1至12条");
 const required=["metric","baseline","period","insight","action","target","actual","source"];
 return rows.map(row=>{
  if(!row||typeof row!=="object"||Array.isArray(row)||Object.keys(row).some(k=>!PRIVATE_COMPARISON_FIELDS.some(f=>f.key===k)))throw Error("数据对照字段无效");
  const result:any={};for(const {key} of PRIVATE_COMPARISON_FIELDS){const v=row[key]===undefined?"":row[key];if(typeof v!=="string"||v.length>4000||required.includes(key)&&!v.trim())throw Error("请完整填写数据、判断、打法、验证与实际结果");result[key]=v.trim();}return result;
 });
}
