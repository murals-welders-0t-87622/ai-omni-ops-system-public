const assert=require('node:assert/strict');
const {WorksService}=require('../apps/server/dist/apps/server/src/modules/works/works.service.js');
(async()=>{
 const service=Object.create(WorksService.prototype);
 const rows=[{id:'pending',metadataJson:{providerTaskId:'vendor-id',status:'RUNNING'}},{id:'done',metadataJson:{providerTaskId:'old',status:'SUCCESS'}}];
 service.listRunningHubWorkRows=async()=>rows;service.readRunningHubWorkMeta=x=>x;service.mapRunningHubWorkRecord=x=>({id:x.id});
 const scheduled=[];service.scheduleListSnapshotRefresh=(scope,brand,ids,refresh)=>{scheduled.push({scope,brand,ids,refresh})};
 let archive=0;service.syncAiControlCenterArchiveForMediaRows=()=>{archive++;return new Promise(()=>{})};
 service.refreshRunningHubWorkSnapshot=()=>new Promise(()=>{});
 const result=await Promise.race([service.listDouyinRunningHubWorks('brand-A'),new Promise((_,r)=>setTimeout(()=>r(Error('List blocked on provider')),200))]);
 assert.deepEqual(result.items,[{id:'pending'},{id:'done'}]);assert.deepEqual(scheduled[0].ids,['pending']);assert.equal(scheduled[0].brand,'brand-A');assert.equal(scheduled[1].scope,'runninghub-archive');assert.equal(scheduled[1].brand,'brand-A');assert.equal(archive,0);
 const actual=Object.create(WorksService.prototype);Object.assign(actual,service);actual.scheduleListSnapshotRefresh=WorksService.prototype.scheduleListSnapshotRefresh;actual.inFlightListSnapshotRefreshes=new Set();actual.listSnapshotBackgroundRefreshLimit=4;let providerCalls=0,archiveCalls=0;actual.refreshRunningHubWorkSnapshot=()=>{providerCalls++;return new Promise(()=>{})};actual.syncAiControlCenterArchiveForMediaRows=()=>{archiveCalls++;return new Promise(()=>{})};await actual.listDouyinRunningHubWorks('brand-A');await actual.listDouyinRunningHubWorks('brand-A');assert.equal(providerCalls,1);assert.equal(archiveCalls,1);
 const catalogue=await service.listDouyinRunningHubApps('brand-A');assert.equal(catalogue.items.length,25);assert.equal(new Set(catalogue.items.map(a=>a.key)).size,25);assert.equal(catalogue.items.find(a=>a.key==='seedance-mini-image-to-video').webappId,'2069739201603661825');
 assert.equal(catalogue.items.find(a=>a.key==='seedance20-mini-multi-reference').webappId,'2089757422163419137');
 const originalFetch=global.fetch,originalTimeout=AbortSignal.timeout;let timeout;
 try{AbortSignal.timeout=ms=>{timeout=ms;return originalTimeout(10)};global.fetch=(_url,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true}));
 await assert.rejects(service.queryRunningHubTask('synthetic-key','synthetic-task'));assert.equal(timeout,15000);await assert.rejects(service.fetchRunningHubAppNodeInfoList('synthetic-key','synthetic-app'));assert.equal(timeout,15000);
 }finally{global.fetch=originalFetch;AbortSignal.timeout=originalTimeout}
 console.log('PASS: saved rows return during hung provider, terminal rows excluded, scoped background refresh, archive compatibility, query abort timeout');
})().catch(e=>{console.error(e);process.exitCode=1});
