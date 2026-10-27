const assert=require('node:assert/strict'),{normalizeGrowthReport,projectGrowthReport}=require('@ai-omni/shared/private-growth-report');
const report={version:'private-growth-report/1',shopId:'383001',historyStart:'2026-06-01T00:00:00+08:00',asOf:'2026-10-26T00:00:00+08:00',capturedAt:'2026-10-26T00:01:00+08:00',coverage:'明确隔离汇总夹具',source:{toolName:'agent_call',workSessionId:'fixture383',workRequestId:'fixture383',evidence:'隔离测试，非供应商实调'},reportedOrders:10,paidOrders:6,paidBuyers:3,paidFen:null,refundFen:'100',paymentBasis:'独立上报退款范围，不能相减',frequency:{once:1,twice:1,threePlus:1,definition:'明确观察期次数'},cohorts:[{windowDays:30,numerator:1,denominator:2,basis:'仅上报，未获明细'}],periods:[],channels:[{channel:'fixture',orders:10,basis:'全部订单'}],products:[],capabilities:'未知',limitations:'明确模拟'};
let checks=0;const check=(name,f)=>{f();checks++;console.log('PASS '+name)};
check('来源汇总不生成明细或个人标签',()=>{const p=projectGrowthReport(report);assert.equal(p.mode,'reported_summary');assert.deepEqual(p.customers,[]);assert.equal(p.metrics.netFen,null)});
check('上报队列仅核分子分母算术',()=>{const p=projectGrowthReport(report);assert.equal(p.cohorts[0].value,0.5);assert.match(p.cohorts[0].historyBasis,/未独立复算/)});
check('购次分层合计不符拒绝',()=>assert.throws(()=>normalizeGrowthReport({...report,frequency:{...report.frequency,once:0}})));
check('混合退款口径不自动相减',()=>assert.equal(projectGrowthReport({...report,paidFen:'100000'}).metrics.netFen,null));
check('分子大于分母和额外字段拒绝',()=>{assert.throws(()=>normalizeGrowthReport({...report,cohorts:[{...report.cohorts[0],numerator:3}]}));assert.throws(()=>normalizeGrowthReport({...report,executed:true}))});
console.log(JSON.stringify({checks}));
