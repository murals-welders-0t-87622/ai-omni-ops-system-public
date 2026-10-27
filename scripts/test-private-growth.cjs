const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {normalizeGrowthData,analyzeGrowthData}=require('@ai-omni/shared/private-growth');
const key=x=>crypto.createHash('sha256').update('fixture:'+x).digest('hex');
const order=(id,who,at,paid,refund='0')=>({id,customerKey:key(who),createdAt:at,paidAt:at,paymentState:'paid',paidFen:paid,refundFen:refund,channel:'fixture-channel',items:[{itemId:'fixture-product',skuId:'fixture-sku',quantity:1,paidFen:paid}]});
function fixture(){return {version:'private-growth-data/1',shopId:'383001',capturedAt:'2026-10-26T01:00:00+08:00',historyStart:'2026-06-01T00:00:00+08:00',asOf:'2026-10-26T00:00:00+08:00',ordersComplete:true,membersComplete:true,historyFromFirstTrade:true,coverage:'明确隔离夹具，不是真实品牌或经营成效',source:{toolName:'agent_call',workSessionId:'fixture383',workRequestId:'fixture383',evidence:'明确模拟明细，非供应商实调'},orders:[order('a1','a','2026-07-01T12:00:00+08:00','1000'),order('a2','a','2026-07-10T12:00:00+08:00','2000','500'),order('b1','b','2026-10-20T12:00:00+08:00','3000'),order('c1','c','2026-09-01T12:00:00+08:00','1000','1000'),order('f1','f','2026-08-01T12:00:00+08:00','1000'),order('f2','f','2026-10-21T12:00:00+08:00','1000')],members:['a','b','c','d','f'].map(x=>({customerKey:key(x),joinedAt:'2026-06-01T00:00:00+08:00',isMember:true}))};}
if(require.main===module){
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name)};
check('净额用整数分且全额退款不作净购',()=>{const x=analyzeGrowthData(fixture());assert.equal(x.metrics.paidFen,'9000');assert.equal(x.metrics.netFen,'7500');assert.equal(x.metrics.retainedBuyers,3)});
check('成熟首购队列与观察期多购不同',()=>{const x=analyzeGrowthData(fixture());assert.deepEqual(x.cohorts.map(c=>[c.numerator,c.denominator,c.immature]),[[1,2,1],[1,2,1]]);assert.equal(x.metrics.observedRepeat.value,0.6667)});
check('全额退款者仍可看到退款事实',()=>{const x=analyzeGrowthData(fixture());assert.ok(x.customers.find(c=>c.customerKey===key('c')).tags.includes('refund_observed'));assert.equal(x.tagSummary.find(t=>t.key==='refund_observed').count,2)});
check('不完整订单不冒充全店复购或标签',()=>{const d=fixture();d.ordersComplete=false;const x=analyzeGrowthData(d);assert.equal(x.metrics.observedRepeat,null);assert.equal(x.tagSummary[0].count,null);assert.equal(x.cohorts[0].available,false)});
check('退款未知不按0计算净额',()=>{const d=fixture();d.orders[0].refundFen=null;const x=analyzeGrowthData(d);assert.equal(x.metrics.netFen,null);assert.equal(x.tagSummary[0].count,null)});
check('会员未购需要会员与订单两侧完整',()=>{const d=fixture();d.membersComplete=false;assert.equal(analyzeGrowthData(d).tagSummary.find(t=>t.key==='member_no_observed').count,null)});
check('历史不足不称真实首购',()=>{const d=fixture();d.historyFromFirstTrade=false;assert.match(analyzeGrowthData(d).cohorts[0].historyBasis,/观察期/)});
check('窗口不成熟不报告0%二购',()=>{const d=fixture();d.historyStart='2026-10-01T00:00:00+08:00';const x=analyzeGrowthData(d);assert.equal(x.cohorts[0].denominator,0);assert.equal(x.cohorts[0].value,null)});
check('不同统计窗口正确归属',()=>{const x=analyzeGrowthData(fixture());assert.equal(x.periods[0].paidFen,'4000');assert.equal(x.periods[1].paidFen,'0');assert.ok(x.periods.every(p=>p.covered))});
check('商品分摊缺失不会重复计整单金额',()=>{const d=fixture();d.orders[0].items[0].paidFen=null;assert.equal(analyzeGrowthData(d).products[0].allocatedPaidFen,null)});
check('重复或矛盾订单必须先核',()=>{const d=fixture();d.orders.push({...d.orders[0]});assert.throws(()=>normalizeGrowthData(d))});
check('禁止浮点元混入分和退款超实付',()=>{for(const val of [1.3,'1.3','-2']){const d=fixture();d.orders[0].paidFen=val;assert.throws(()=>normalizeGrowthData(d))}const d=fixture();d.orders[0].refundFen='1001';assert.throws(()=>normalizeGrowthData(d))});
check('不接收原始手机号或额外个人字段',()=>{const d=fixture();d.orders[0].customerKey='13800000000';assert.throws(()=>normalizeGrowthData(d));const e=fixture();e.members[0].phone='13800000000';assert.throws(()=>normalizeGrowthData(e))});
check('非法日期和未来窗口拒绝',()=>{const d=fixture();d.orders[0].paidAt='2026-02-30T12:00:00+08:00';assert.throws(()=>normalizeGrowthData(d));const e=fixture();e.capturedAt='2026-10-25T00:00:00+08:00';assert.throws(()=>normalizeGrowthData(e))});
check('付款状态未知只记质量问题不猜已付',()=>{const d=fixture();d.orders.push({...order('unknown','g','2026-10-22T00:00:00+08:00','500'),paymentState:'unknown',paidAt:null});const x=analyzeGrowthData(d);assert.equal(x.metrics.unknownPayment,1);assert.equal(x.metrics.paidFen,'9000')});
console.log(JSON.stringify({checks}));}
module.exports={fixture};
