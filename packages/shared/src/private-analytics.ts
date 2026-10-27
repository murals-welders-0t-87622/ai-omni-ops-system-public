export const ANALYTICS_DOMAINS=['business','traffic','products','customers','membership','marketing','retention','audiences'] as const;
export type AnalyticsDomain=typeof ANALYTICS_DOMAINS[number];
export type AnalyticsUnit='CNY'|'COUNT'|'PERCENT'|'RATIO';
export type AnalyticsChart={id:string;title:string;kind:'bar'|'line'|'donut'|'funnel'|'cohort';unit:AnalyticsUnit;definition:string;series:{id:string;label:string}[];rows:{label:string;values:(number|null)[]}[]};
export type AnalyticsSection={id:string;domain:AnalyticsDomain;title:string;periodStart:string;periodEnd:string;scope:string;complete:boolean;source:{kind:'browser_observed'|'provider_report'|'provider_rows'|'manual_report';reference:string;description:string};limitations:string;metrics:{id:string;label:string;value:number|null;unit:AnalyticsUnit;definition:string}[];charts:AnalyticsChart[];objects:{id:string;type:'campaign'|'audience'|'plan'|'product'|'tag';title:string;state:string;details:string;goal?:'traffic'|'conversion'|'aov'|'repeat';reference:string}[]};
export type PrivateAnalytics={version:'private-analytics/1';shopId:string;capturedAt:string;sections:AnalyticsSection[]};
const keys=(v:any,allowed:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('经营分析字段无效');};
const text=(v:any,max=4000)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('经营分析请填写完整名称、口径与来源');};
const list=(v:any,max:number)=>{if(!Array.isArray(v)||v.length>max)throw Error('经营分析条目超出范围');};
const date=(v:any)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('经营期间日期无效');};
const unique=(rows:any[])=>{const used=new Set();for(const r of rows){if(typeof r.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(r.id)||used.has(r.id))throw Error('经营分析条目标识须唯一');used.add(r.id);}};
const unit=(u:any)=>{if(!['CNY','COUNT','PERCENT','RATIO'].includes(u))throw Error('经营分析单位无效');};
function number(v:any,u:AnalyticsUnit){unit(u);if(v===null)return;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e13||u==='COUNT'&&!Number.isSafeInteger(v)||u==='CNY'&&Math.abs(v*100-Math.round(v*100))>0.001)throw Error('经营分析数值无效；未知用null，金额保留分');}
export function normalizePrivateAnalytics(input:unknown):PrivateAnalytics{
 const v:any=input;keys(v,['version','shopId','capturedAt','sections']);if(v.version!=='private-analytics/1'||typeof v.shopId!=='string'||!/^\d{1,30}$/.test(v.shopId))throw Error('经营分析版本或店铺无效');
 if(typeof v.capturedAt!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(v.capturedAt)||!Number.isFinite(Date.parse(v.capturedAt)))throw Error('经营分析采集时间须带时区');
 list(v.sections,32);if(!v.sections.length)throw Error('至少需要一个真实经营数据分区');unique(v.sections);
 for(const s of v.sections){keys(s,['id','domain','title','periodStart','periodEnd','scope','complete','source','limitations','metrics','charts','objects']);if(!ANALYTICS_DOMAINS.includes(s.domain))throw Error('经营分析板块无效');text(s.title,200);text(s.scope,1000);date(s.periodStart);date(s.periodEnd);if(s.periodStart>s.periodEnd||s.periodEnd>new Date(Date.parse(v.capturedAt)+8*3600000).toISOString().slice(0,10))throw Error('经营期间不得倒置或晚于采集日');if(typeof s.complete!=='boolean')throw Error('请说明统计期是否完整');
  keys(s.source,['kind','reference','description']);if(!['browser_observed','provider_report','provider_rows','manual_report'].includes(s.source.kind))throw Error('经营分析来源类型无效');text(s.source.reference,2000);text(s.source.description);text(s.limitations,12000);list(s.metrics,24);list(s.charts,10);list(s.objects,300);unique(s.metrics);unique(s.charts);unique(s.objects);
  for(const m of s.metrics){keys(m,['id','label','value','unit','definition']);text(m.label,160);text(m.definition);number(m.value,m.unit);}
  for(const c of s.charts){keys(c,['id','title','kind','unit','definition','series','rows']);text(c.title,200);text(c.definition);unit(c.unit);if(!['bar','line','donut','funnel','cohort'].includes(c.kind))throw Error('图表类型无效');list(c.series,6);if(!c.series.length)throw Error('图表至少一项指标');unique(c.series);for(const x of c.series){keys(x,['id','label']);text(x.label,160);}list(c.rows,90);if(!c.rows.length||c.kind==='line'&&c.rows.length<2)throw Error('趋势图须有至少两个真实时间点，不能从累计数编趋势');
   for(const r of c.rows){keys(r,['label','values']);text(r.label,160);if(!Array.isArray(r.values)||r.values.length!==c.series.length)throw Error('图表数值与指标不符');r.values.forEach((n:any)=>number(n,c.unit));if(c.kind==='cohort'&&(c.unit!=='PERCENT'||r.values.some((n:any)=>n!==null&&n>100)))throw Error('留存热力图须为0至100的百分比，未成熟用null');}
   if(['donut','funnel'].includes(c.kind)&&c.series.length!==1)throw Error('构成或漏斗须为单一同口径指标');
   if(c.kind==='funnel'&&(c.unit!=='COUNT'||c.rows.some((r:any,i:number)=>r.values[0]===null||i>0&&r.values[0]>c.rows[i-1].values[0])))throw Error('漏斗只接受同范围单调递减人数；不一致的数据应作表格说明');
  }
  for(const o of s.objects){keys(o,['id','type','title','state','details','goal','reference']);if(!['campaign','audience','plan','product','tag'].includes(o.type))throw Error('经营对象类型无效');for(const k of ['title','state','details','reference'])text(o[k],6000);if(o.goal!==undefined&&!['traffic','conversion','aov','repeat'].includes(o.goal))throw Error('私域目标仅流量、转化、客单、复购');}
 }
 return JSON.parse(JSON.stringify(v));
}
