const {test}=require('node:test');
const assert=require('node:assert/strict');
const {SOONSTUDIO_MODELS,listSoonStudioModels,getSoonStudioModel,SOONSTUDIO_MODEL_CATALOG_INFO}=require('../apps/server/dist/apps/server/src/common/soonstudio-model-catalog');
const {SYSTEM_API_PROVIDER_SEEDS}=require('../apps/server/dist/apps/server/src/common/api-provider-catalog');
const {THIRD_PARTY_PLATFORM_SEEDS}=require('../apps/server/dist/apps/server/src/common/third-party-platform-catalog');
test('all official international model IDs remain in one SoonStudio platform without replacing defaults',()=>{
 assert.equal(SOONSTUDIO_MODELS.length,1596);assert.equal(new Set(SOONSTUDIO_MODELS.map(m=>m.id)).size,1596);
 const platform=THIRD_PARTY_PLATFORM_SEEDS.find(p=>p.baseUrl==='https://api.soonstudio.ai');
 assert.equal(platform.name,'SoonStudio 平台');assert.equal(platform.websiteUrl,'https://soonstudio.ai');assert.equal(platform.modelIds.length,1596);
 const seed=SYSTEM_API_PROVIDER_SEEDS.find(p=>p.id==='provider_soonstudio_catalog');assert.equal(seed.status,'DRAFT');assert.equal(seed.apiKey,'');
 assert.equal(SOONSTUDIO_MODEL_CATALOG_INFO.inferenceVerified,false);
});
test('pagination and modality search do not send all schemas to the Agent',()=>{
 const page=listSoonStudioModels({primaryType:'video',limit:3});assert.equal(page.data.length,3);assert.ok(page.total>200);assert.equal(page.hasMore,true);
 assert.ok(page.data.every(m=>m.primaryType==='video'&&!m.apiExamples));
 assert.equal(listSoonStudioModels({includeDeprecated:true,limit:200}).total,1596);
 assert.ok(getSoonStudioModel('gpt-5.5').apiExamples.some(x=>x.path==='/v1/responses'));
});
test('native media never inherits a fake Chat contract and unsupported models are explicit',()=>{
 for(const m of SOONSTUDIO_MODELS.filter(m=>m.endpoints.includes('runware-native'))) assert.ok(!(m.apiExamples||[]).some(f=>f.path==='/v1/chat/completions'),m.id);
 const unsupported=SOONSTUDIO_MODELS.filter(m=>m.unsupportedReason);assert.equal(unsupported.length,55);
 for(const m of SOONSTUDIO_MODELS.filter(m=>/marble/i.test(m.id)))assert.ok(m.unsupportedReason,m.id);
 assert.ok(SOONSTUDIO_MODELS.filter(m=>m.deprecated).length===18);
});
test('curated contracts only use official relative paths and do not contain authorization credentials',()=>{
 for(const m of SOONSTUDIO_MODELS)for(const f of m.apiExamples||[]){assert.match(f.path,/^\/(?!\/)/);assert.ok(!/authorization|api[-_]?key/i.test(Object.keys(f.headers||{}).join(' ')));}
 const body=getSoonStudioModel('gpt-5.5').apiExamples[0].bodyTemplate;
 assert.ok(!JSON.stringify(body).includes('stop'));assert.ok(!Object.hasOwn(body,'max_tokens'));
});
