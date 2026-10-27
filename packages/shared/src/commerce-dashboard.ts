export function dashboardMetric(snapshot: any, keys: string[], stage?: string) {
  const sections = stage ? (snapshot?.sections || []).filter((s: any) => s.key === stage) : snapshot?.sections || [];
  for (const key of keys) for (const s of sections) { const m = s.metrics?.find((m: any) => m.key === key); if (m && m.value !== null && /^-?\d+(\.\d+)?$/.test(String(m.value))) return { ...m, value: Number(m.value), stage: s.key }; }
  return null;
}
export function commerceDashboard(snapshot: any, snapshots: any[]) {
  const get = (keys: string[], stage?: string) => dashboardMetric(snapshot, keys, stage);
  const pay=get(['payAmt']),orders=get(['orders']),visitors=get(['uv','visitors','uvWireless']),summaryVisitors=get(['uvSum']),spend=get(['campaignCharge','charge']),attributed=get(['campaignAttributed','attributed']),refund=get(['refundAmt','refundAmount']);
  const aov=pay&&orders&&orders.value>0&&pay.unit==='元'&&orders.unit==='单'?{key:'derivedOrderValue',label:'每单支付金额',value:pay.value/orders.value,unit:'元',definition:`${pay.definition} ÷ ${orders.definition}；同快照派生，不等每买家客单`}:get(['orderValue']);
  const roas=get(['campaignRoas','roas']);
  const cards=[{id:'pay',label:'支付GMV',metric:pay},{id:'orders',label:'支付订单',metric:orders},{id:'aov',label:'每单支付金额',metric:aov},{id:'visitors',label:visitors?'店铺访客':'平台访客汇总',metric:visitors||summaryVisitors},{id:'spend',label:'广告花费',metric:spend},{id:'attributed',label:'广告归因成交',metric:attributed},{id:'roas',label:'广告ROAS',metric:roas},{id:'refund',label:'成功退款金额',metric:refund}];
  const duration=(s:any)=>Date.parse(s.period.end)-Date.parse(s.period.start), overlap=(a:any,b:any)=>a.period.start<=b.period.end&&b.period.start<=a.period.end;
  const candidates=(snapshots||[]).filter(s=>snapshot&&s.shopId===snapshot.shopId&&s.currency===snapshot.currency&&s.sourceStatus===snapshot.sourceStatus&&duration(s)===duration(snapshot)&&s.period.end<=snapshot.period.end).sort((a,b)=>b.period.end.localeCompare(a.period.end)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  const history:any[]=[];
  for(const s of candidates){const m=dashboardMetric(s,['payAmt']);if(!pay||!m||m.definition!==pay.definition||m.unit!==pay.unit||history.some(p=>overlap(p,s)))continue;history.push(s);if(history.length===8)break;}
  history.reverse();
  const trend=history.map(s=>({label:s.period.start.slice(5)+'—'+s.period.end.slice(5),value:dashboardMetric(s,['payAmt'])!.value}));
  const table=(pattern:RegExp)=>(snapshot?.sections||[]).flatMap((s:any)=>(s.tables||[]).map((t:any)=>({...t,stage:s.key}))).find((t:any)=>pattern.test(t.title));
  const numeric=(row:any,keys:string[])=>{for(const k of keys){if(row[k]!==null&&row[k]!==undefined&&/^-?\d+(\.\d+)?$/.test(String(row[k])))return Number(row[k]);}return null;};
  const productTable=table(/商品排行|商品回执|商品排名/),products=(productTable?.rows||[]).map((r:any)=>({label:String(r.item||r.itemId||r.name||r.title||'未命名商品'),value:numeric(r,['pay','payAmt','payment']),buyers:numeric(r,['buyers','buyerCount']),refund:numeric(r,['refund','refundAmt'])})).filter((r:any)=>r.value!==null).sort((a:any,b:any)=>b.value-a.value).slice(0,8);
  const channelTable=table(/来源树|渠道|来源分布/),channels=(channelTable?.rows||[]).map((r:any)=>({label:String(r.group||r.channel||r.name||'未命名来源'),value:numeric(r,['pay','payAmt','amount']),visitors:numeric(r,['uv','visitors'])})).filter((r:any)=>r.value!==null).slice(0,8);
  const adTable=table(/计划报表|广告计划|推广计划/),ads=(adTable?.rows||[]).map((r:any)=>({label:String(r.id||r.name||'未命名计划'),value:numeric(r,['charge','spend']),second:numeric(r,['attributed','gmv']),roas:numeric(r,['roas'])})).filter((r:any)=>r.value!==null).sort((a:any,b:any)=>b.value-a.value).slice(0,8);
  const funnel=[{label:'去重访客',metric:visitors},{label:'加购人数',metric:get(['addCartUsers','cartUsers'])},{label:'下单人数',metric:get(['orderUsers'])},{label:'支付人数',metric:get(['payBuyers','buyerCount'])}];
  return {cards,trend,products,channels,ads,funnel,channelTitle:channelTable?.title||'',sourceStatus:snapshot?.sourceStatus,period:snapshot?.period,customerMetrics:[{label:'新成交买家',metric:get(['newBuyers','newBuyerCnt'])},{label:'老成交买家',metric:get(['oldBuyers','oldBuyerCnt'])},{label:'成熟首购队列复购率',metric:get(['repurchase90','repeat30'])},{label:'会员购买率',metric:get(['memberConversion'])}]};
}
