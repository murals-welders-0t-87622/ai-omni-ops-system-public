// Pure contract tests. No database, business tasks, expert invocations or external requests.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {join}=require('node:path');
require('reflect-metadata');
const dir=join(__dirname,'../apps/server/dist/apps/server/src/modules/openclaw');
const {validateAnalysisProfiles,analysisPlatform,analysisForms,analysisReportHtml,WORK_ANALYSIS_DICTIONARIES}=require(join(dir,'work-analysis.contract.js'));
const {WorkAnalysisService}=require(join(dir,'work-analysis.service.js'));
const snapshot={sourceId:'fixture-source',platform:'xiaohongshu',contentHash:'fixture-hash',body:'食品厂清洁需要比较条件',paragraphs:[{id:'p1',text:'食品厂清洁需要比较条件'}],images:[{id:'image-1',url:'https://example.invalid/original.png'}],videoUrl:'https://example.invalid/work.mp4',durationMs:10000};
function fixture(form){
 const evidence=form==='text'?{snapshotRef:'fixture-hash',paragraphId:'p1',startChar:0,endChar:3,quote:'食品厂'}:form==='image'?{imageRef:'image-1',imageSha256:'a'.repeat(64),pageIndex:0,bbox:[0,0,0.5,0.5]}:{videoRef:'fixture-source',startMs:0,endMs:3000,modalitiesUsed:['visual','audio'],frameRefs:['fixture-frame'],audioTrackRef:'fixture-audio'};
 return {form,schemaVersion:form+'-work-analysis-1.0.0',dictionaryVersion:form+'-1.0.0',sourceSnapshotRef:'fixture-hash',inputCoverage:{bodyComplete:true,originalImagesReadable:true,pageOrderKnown:true,visualReadable:true,audioReadable:true,transcriptReadable:true,alignmentKnown:true},structure:[{unitRef:'p1',function:'引入',explanation:'仅测试契约'}],transferConditions:['测试夹具不是专业分析'],limitations:[],annotations:WORK_ANALYSIS_DICTIONARIES[form].dimensions.map((d,i)=>({dimensionId:d.id,status:i===0?'observed':'unknown',values:i===0?['测试值']:[],observation:i===0?'测试观察':'',reason:'测试夹具，不冒充真实分析',evidence:i===0?[evidence]:[]}))};
}
for(const form of ['text','image','video']){
 test(form+' independent contract accepts supported profile',()=>assert.doesNotThrow(()=>validateAnalysisProfiles([fixture(form)],[form],snapshot)));
 test(form+' rejects missing dimensions',()=>{const p=fixture(form);p.annotations.pop();assert.throws(()=>validateAnalysisProfiles([p],[form],snapshot));});
 test(form+' rejects duplicate dimensions',()=>{const p=fixture(form);p.annotations[1].dimensionId=p.annotations[0].dimensionId;assert.throws(()=>validateAnalysisProfiles([p],[form],snapshot));});
 test(form+' rejects wrong input snapshot',()=>{const p=fixture(form);p.sourceSnapshotRef='other';assert.throws(()=>validateAnalysisProfiles([p],[form],snapshot));});
 test(form+' schema includes its own form and evidence',()=>{const d=WORK_ANALYSIS_DICTIONARIES[form];assert.equal(d.outputSchema.properties.form.const,form);assert.equal(d.dimensions.length,32);});
}
test('text rejects fabricated quote',()=>{const p=fixture('text');p.annotations[0].evidence[0].quote='其他厂';assert.throws(()=>validateAnalysisProfiles([p],['text'],snapshot));});
test('image rejects off-canvas region',()=>{const p=fixture('image');p.annotations[0].evidence[0].bbox=[0.8,0,0.5,0.5];assert.throws(()=>validateAnalysisProfiles([p],['image'],snapshot));});
test('image rejects wrong page',()=>{const p=fixture('image');p.annotations[0].evidence[0].pageIndex=1;assert.throws(()=>validateAnalysisProfiles([p],['image'],snapshot));});
test('video rejects transcript-only completion',()=>{const p=fixture('video');p.inputCoverage.visualReadable=false;assert.throws(()=>validateAnalysisProfiles([p],['video'],snapshot));});
test('video rejects out-of-range time',()=>{const p=fixture('video');p.annotations[0].evidence[0].endMs=10001;assert.throws(()=>validateAnalysisProfiles([p],['video'],snapshot));});
test('video rejects no frame reference for visual judgement',()=>{const p=fixture('video');p.annotations[0].evidence[0].frameRefs=[];assert.throws(()=>validateAnalysisProfiles([p],['video'],snapshot));});
test('mixed forms remain one source with independent profiles',()=>assert.doesNotThrow(()=>validateAnalysisProfiles([fixture('text'),fixture('image')],['text','image'],snapshot)));
test('wrong platform never falls back',()=>assert.throws(()=>analysisPlatform('brand_growth')));
test('duplicate forms rejected',()=>assert.throws(()=>analysisForms(['text','text'])));
test('malformed evidence yields rejection rather than false completion',()=>{const p=fixture('text');p.annotations[0].evidence=[null];assert.throws(()=>validateAnalysisProfiles([p],['text'],snapshot));});
test('report escapes scripts and has restrictive CSP',()=>{const html=analysisReportHtml('<script>x</script>','<img src=x onerror=alert(1)>');assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes("default-src 'none'"));});
test('unknown taxonomy prototype name rejected',()=>assert.throws(()=>new WorkAnalysisService({}).taxonomy('__proto__')));
test('source mapping admits unregistered collected brand work',()=>{const a=new WorkAnalysisService({}).snapshot({id:'source',title:'fixture',description:'',fileUrl:null,updatedAt:new Date(),metadataJson:{kind:'DOUYIN_BRAND_WORK',inMaterialLibrary:false,videoUrl:'https://example.invalid/test.mp4'}});assert.equal(a.platform,'douyin');assert.equal(a.sourceId,'source');});
test('source mapping excludes non-work records and WeChat account results',()=>{const s=new WorkAnalysisService({});const base={id:'a',title:'fixture',description:'',fileUrl:null,updatedAt:new Date()};assert.equal(s.snapshot({...base,metadataJson:{kind:'DOUYIN_COMMENT'}}),null);assert.equal(s.snapshot({...base,metadataJson:{kind:'WECHAT_SEARCH_ITEM',url:'https://example.invalid/account'}}),null);});
test('malformed report structures are rejected before UI readback',()=>{const p=fixture('text');p.structure=[null];assert.throws(()=>validateAnalysisProfiles([p],['text'],snapshot));});
test('observed labels must have a usable label value',()=>{const p=fixture('text');p.annotations[0].values=[];assert.throws(()=>validateAnalysisProfiles([p],['text'],snapshot));});
test('source mapping uses actual description column and millisecond duration',()=>{const s=new WorkAnalysisService({}).snapshot({id:'fixture',title:'fixture',description:'实际正文',fileUrl:null,updatedAt:new Date(),metadataJson:{kind:'DOUYIN_BRAND_WORK',durationMs:12345}});assert.equal(s.body,'实际正文');assert.equal(s.durationMs,12345);});
test('partial cached images do not hide complete original page order',()=>{const s=new WorkAnalysisService({}).snapshot({id:'fixture',title:'fixture',description:'',fileUrl:null,updatedAt:new Date(),metadataJson:{kind:'XHS_SEARCH_NOTE',imageList:['invalid-relative'],imageSourceList:['https://example.invalid/a.png','https://example.invalid/b.png']}});assert.equal(s.images.length,2);assert.equal(s.images[1].id,'image-2');});
test('unresolvable cached video falls back to declared source and unknown metrics stay unknown',()=>{const s=new WorkAnalysisService({}).snapshot({id:'fixture',title:'fixture',description:'',fileUrl:null,updatedAt:new Date(),metadataJson:{kind:'DOUYIN_BRAND_WORK',videoUrl:'unknown-relative',videoSourceUrl:'https://example.invalid/a.mp4'}});assert.equal(s.videoUrl,'https://example.invalid/a.mp4');assert.equal(s.metricsAt,'');assert.equal(s.metrics.likeCount,null);});
