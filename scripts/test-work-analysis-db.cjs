// Isolated Lab integration test. Every fixture and domain event is rolled back.
require('reflect-metadata');
const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
const {WorkAnalysisService}=require('../apps/server/dist/apps/server/src/modules/openclaw/work-analysis.service.js');
const {WORK_ANALYSIS_DICTIONARIES}=require('../apps/server/dist/apps/server/src/modules/openclaw/work-analysis.contract.js');
if(process.env.APP_ENVIRONMENT!=='ontology-lab')throw new Error('Lab only');
const prisma=new PrismaClient();
const id='work-analysis-rollback-fixture-'+Date.now();
const checks=[];const sentinel=new Error('ROLLBACK_TEST_FIXTURES');
(async()=>{
 try{
  await prisma.$transaction(async tx=>{
   const adapter=new Proxy(tx,{get(target,key){if(key==='canUseDatabase')return async()=>true;if(key==='$transaction')return async fn=>Array.isArray(fn)?Promise.all(fn):fn(tx);return target[key];}});
   const service=new WorkAnalysisService(adapter);
   await tx.businessAsset.create({data:{id,brandId:'brand-demo-cleaning',category:'PLATFORM_EXPORT',title:'回滚测试夹具（非真实作品）',metadataJson:{kind:'XHS_BRAND_NOTE',description:'测试文本',collectedAt:'2026-10-21T00:00:00Z',inMaterialLibrary:false}}});
   const context=await service.source('brand-demo-cleaning',id,'xiaohongshu');
   assert.equal(context.sourceId,id);checks.push('unregistered_collected_work_read');
   await assert.rejects(()=>service.source('brand-demo-cleaning',id,'wechat'));checks.push('wrong_platform_source_rejected');
   const input={platform:'xiaohongshu',sourceId:id,forms:['text'],goal:'事务回滚契约测试，非业务执行',idempotencyKey:id};
   const first=await service.create('brand-demo-cleaning','fixture-actor',input);
   assert.equal((await service.create('brand-demo-cleaning','fixture-actor',input)).id,first.id);checks.push('create_idempotent');
   await assert.rejects(()=>service.create('brand-demo-cleaning','fixture-actor',{...input,goal:'different'}));checks.push('same_key_different_payload_rejected');
   const claimed=await service.update('brand-demo-cleaning','fixture-actor',{platform:'xiaohongshu',requestId:first.id,expectedRevision:1,action:'claim'});
   await assert.rejects(()=>service.update('brand-demo-cleaning','fixture-other',{platform:'xiaohongshu',requestId:first.id,expectedRevision:1,action:'claim'}));checks.push('stale_revision_claim_rejected');
   const profile={form:'text',schemaVersion:'text-work-analysis-1.0.0',dictionaryVersion:'text-1.0.0',sourceSnapshotRef:context.contentHash,inputCoverage:{bodyComplete:true},structure:[{unitRef:'p1',function:'测试',explanation:'只验证保存契约'}],transferConditions:['测试夹具，不用于创作'],limitations:['不代表专家执行'],annotations:WORK_ANALYSIS_DICTIONARIES.text.dimensions.map((d,i)=>({dimensionId:d.id,status:i?'unknown':'observed',values:i?[]:['测试标签'],observation:i?'':'回滚测试观察',reason:'测试夹具',evidence:i?[]:[{snapshotRef:context.contentHash,paragraphId:'p1',startChar:0,endChar:2,quote:'测试'}]}))};
   const submit={platform:'xiaohongshu',requestId:first.id,expectedRevision:claimed.revision,idempotencyKey:id+'-submit',title:'事务回滚结果',reportMarkdown:'仅数据库契约夹具，不代表真实拆解或专家执行',profiles:[profile],sourceSnapshotRef:context.contentHash,methodVersions:{expertPackage:'test-fixture-only',skills:['test-fixture-only']}};
   await assert.rejects(()=>service.submit('wrong-brand','fixture-actor',submit));checks.push('wrong_brand_submit_rejected');
   await assert.rejects(()=>service.submit('brand-demo-cleaning','fixture-other',submit));checks.push('wrong_claim_identity_rejected');
   const saved=await service.submit('brand-demo-cleaning','fixture-actor',submit);
   assert.equal((await service.submit('brand-demo-cleaning','fixture-actor',submit)).revisionId,saved.revisionId);checks.push('submit_idempotent');
   await assert.rejects(()=>service.submit('brand-demo-cleaning','fixture-actor',{...submit,title:'different'}));checks.push('submit_key_conflict_rejected');
   let detail=await service.get('brand-demo-cleaning',first.id,'xiaohongshu');assert.equal(detail.results.length,1);assert.equal(detail.status,'completed');checks.push('same_platform_readback');
   const immutable=JSON.stringify(detail.results[0]);
   await service.review('brand-demo-cleaning','fixture-actor',{platform:'xiaohongshu',requestId:first.id,expectedRevision:detail.revision,revisionId:saved.revisionId,decision:'accepted'});
   detail=await service.get('brand-demo-cleaning',first.id,'xiaohongshu');assert.equal(JSON.stringify(detail.results[0]),immutable);checks.push('review_does_not_overwrite_result');
   const again=await service.update('brand-demo-cleaning','fixture-actor',{platform:'xiaohongshu',requestId:first.id,expectedRevision:detail.revision,action:'reanalyse'});assert.equal(again.id,first.id);assert.equal(again.generation,2);
   const second=await service.update('brand-demo-cleaning','fixture-actor',{platform:'xiaohongshu',requestId:first.id,expectedRevision:again.revision,action:'claim'});
   await service.submit('brand-demo-cleaning','fixture-actor',{...submit,expectedRevision:second.revision,idempotencyKey:id+'-second'});
   detail=await service.get('brand-demo-cleaning',first.id,'xiaohongshu');assert.equal(detail.results.length,2);assert.equal(JSON.stringify(detail.results[1]),immutable);checks.push('reanalysis_preserves_previous_revision');
   const list=await service.list('brand-demo-cleaning',{platform:'xiaohongshu',keyword:'测试标签'});assert.ok(list.items.some(i=>i.id===first.id));checks.push('content_tag_search');
   const excluded=await service.listSources('brand-demo-cleaning',{platform:'xiaohongshu',keyword:'回滚测试夹具',excludePreviouslyRequested:true});assert.ok(!excluded.items.some(i=>i.sourceId===id));checks.push('automatic_selection_excludes_existing_before_pagination');
   const third=await service.update('brand-demo-cleaning','fixture-actor',{platform:'xiaohongshu',requestId:first.id,expectedRevision:detail.revision,action:'reanalyse'});
   const cancelled=await service.update('brand-demo-cleaning','fixture-actor',{platform:'xiaohongshu',requestId:first.id,expectedRevision:third.revision,action:'cancel',message:'回滚测试取消'});
   const hidden=await service.list('brand-demo-cleaning',{platform:'xiaohongshu',keyword:'测试标签'});assert.ok(!hidden.items.some(i=>i.id===first.id));checks.push('cancelled_excluded_from_normal_list');
   const cancelledList=await service.list('brand-demo-cleaning',{platform:'xiaohongshu',status:'cancelled'});assert.equal(cancelledList.total,0);checks.push('cancelled_not_reintroduced_by_filter');
   await assert.rejects(()=>service.submit('brand-demo-cleaning','fixture-actor',submit));checks.push('cancelled_rejects_even_old_submission_replay');
   for(const action of ['claim','resume','reanalyse'])await assert.rejects(()=>service.update('brand-demo-cleaning','fixture-actor',{platform:'xiaohongshu',requestId:first.id,expectedRevision:cancelled.revision,action}));checks.push('cancelled_cannot_reactivate');
   const retained=await service.get('brand-demo-cleaning',first.id,'xiaohongshu');assert.equal(retained.results.length,2);assert.equal((await service.source('brand-demo-cleaning',id,'xiaohongshu')).sourceId,id);checks.push('cancel_retains_audit_and_original_source');
   const available=await service.listSources('brand-demo-cleaning',{platform:'xiaohongshu',keyword:'回滚测试夹具',excludePreviouslyRequested:true});assert.ok(available.items.some(i=>i.sourceId===id));checks.push('new_authorization_can_select_cancelled_original');
   await assert.rejects(()=>service.listSources('brand-demo-cleaning',{platform:'xiaohongshu',excludePreviouslyRequested:'false-invalid'}));checks.push('invalid_selection_filter_rejected');
   throw sentinel;
  },{timeout:30000});
 }catch(e){if(e!==sentinel)throw e;}
 assert.equal(await prisma.businessAsset.count({where:{id}}),0);assert.equal(await prisma.workAnalysisRequest.count({where:{idempotencyKey:id}}),0);checks.push('all_fixtures_rolled_back');
 console.log(JSON.stringify({pass:true,scope:'real Lab PostgreSQL transaction with full rollback; no business/expert execution',checks}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
