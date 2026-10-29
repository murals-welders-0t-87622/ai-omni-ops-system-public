const {test}=require('node:test');
const assert=require('node:assert/strict');
const {WorksService}=require('../apps/server/dist/apps/server/src/modules/works/works.service');
const {SYSTEM_API_PROVIDER_SEEDS}=require('../apps/server/dist/apps/server/src/common/api-provider-catalog');
const {THIRD_PARTY_PLATFORM_SEEDS}=require('../apps/server/dist/apps/server/src/common/third-party-platform-catalog');
const service=Object.create(WorksService.prototype);
const provider={provider:'IMAGE_API',providerId:'provider_runtime_image_xjjuhe',providerName:'测试平台',baseUrls:['https://xjjuhe.site'],apiKeys:['synthetic'],models:['gpt-image-2'],requestMode:'xjjuhe-task',createPath:'/v1/images/generations',queryPath:'/v1/images/generations/{task_id}',queryMethod:'GET',supportsTextToImage:true,supportsReferenceImages:true,requiresReferenceImages:false};
const params={brandId:'test-brand',taskId:'test-task',title:'测试',workLabel:'测试',role:'COVER',order:0,providers:[provider],prompt:'示例',referenceImageUrls:[]};
test('平台列出且预置凭证为空',()=>{
  const platform=THIRD_PARTY_PLATFORM_SEEDS.find(x=>x.baseUrl==='https://xjjuhe.site');
  assert.equal(platform.name,'鸭屎香聚合平台');
  for(const id of ['provider_runtime_text_xjjuhe','provider_runtime_image_xjjuhe','provider_runtime_video_xjjuhe']) assert.equal(SYSTEM_API_PROVIDER_SEEDS.find(x=>x.id===id).apiKey,'');
});
test('图片请求采用平台参数与正确尺寸',()=>{
  const p=service.buildImageGenerationPayload(provider,'gpt-image-2','提示词',['https://example.com/ref.png'],'social_graphic',{openai:'720x1280'});
  assert.equal(p.aspect_ratio,'9:16');assert.equal(p.n,1);assert.deepEqual(p.reference_images,['https://example.com/ref.png']);
  assert.equal(service.buildImageGenerationPayload(provider,'gpt-image-2.5','提示词',[],'social_graphic',{openai:'720x1280'}).size,'720x1280');
  assert.throws(()=>service.buildImageGenerationPayload(provider,'gpt-image-2','提示词',Array(9).fill('https://example.com/a.png')),/最多支持/);
});
test('查询完成和失败状态均按真实任务识别',()=>{
  const ok=service.readImageTaskSnapshot({id:'task_1',status:'completed',url:'https://example.com/a.png'});
  assert.equal(ok.status,'SUCCESS');assert.equal(ok.asset.url,'https://example.com/a.png');
  assert.equal(service.readImageTaskSnapshot({status:'failed',error:{message:'失败'}}).status,'FAILED');
  assert.equal(service.resolveVideoQueryPath(provider.queryPath,'task_a/b','GET'),'/v1/images/generations/task_a%2Fb');
});
test('提交已返回任务号但轮询失败不重复提交',async()=>{
  const instance=Object.create(WorksService.prototype);let calls=0;
  instance.requestAuthorizedJson=async()=>{calls++;return {id:'task_example',status:'queued'}};
  instance.pollImageGenerationResult=async()=>{throw Error('模拟查询失败')};
  await assert.rejects(instance.generateImageAsset(params),/task_example/);
  assert.equal(calls,1);
});
test('提交结果不明确不会继续提交',async()=>{
  const instance=Object.create(WorksService.prototype);let calls=0;
  instance.requestAuthorizedJson=async()=>{calls++;throw Error('模拟网络断开')};
  await assert.rejects(instance.generateImageAsset(params),/提交结果未确认/);assert.equal(calls,1);
  instance.requestAuthorizedJson=async()=>{calls++;return {status:'queued'}};
  await assert.rejects(instance.generateImageAsset(params),/提交结果未确认/);assert.equal(calls,2);
});
test('Omni 视频按文档构建并拒绝本地素材与不支持的画幅',()=>{
  const config={requestProfile:'xjjuhe_video',createPath:'/v1/videos',queryPath:'/v1/videos/{task_id}',displayLabel:'测试视频',durationOptions:[10]};
  const args={config,modelName:'omni_flash-10s',prompt:'画面',requestedDurationSec:10,requestedAspectRatio:'16:9'};
  const result=service.buildVideoCreatePayload(args);
  assert.deepEqual(result.payload,{model:'omni_flash-10s',prompt:'画面',size:'1280x720'});
  assert.deepEqual(service.buildVideoCreatePayload({...args,referenceImageUrl:'https://example.com/ref.jpg'}).payload.images,['https://example.com/ref.jpg']);
  assert.throws(()=>service.buildVideoCreatePayload({...args,referenceImageUrl:'http://127.0.0.1/file.jpg'}),/公网/);
  assert.throws(()=>service.buildVideoCreatePayload({...args,requestedAspectRatio:'4:3'}),/画幅/);
  const snapshot=service.readVideoTaskSnapshot({id:'cm1',task_id:'task1',status:'completed',video_url:'https://example.com/result.mp4'},'xjjuhe_video',10);
  assert.equal(snapshot.status,'SUCCESS');assert.equal(snapshot.videoUrl,'https://example.com/result.mp4');
});
test('视频网络失败不自动再次提交或切换其他收费模型',async()=>{
  const instance=Object.create(WorksService.prototype);let calls=0;
  instance.buildVideoProviderExecutionPlan=async()=>[{backend:'xjjuhe_video',label:'测试平台',useReferenceImage:false},{backend:'other',label:'其他',useReferenceImage:false}];
  instance.loadVideoProviderConfig=async()=>({backend:'xjjuhe_video',requestProfile:'xjjuhe_video',baseUrls:['https://xjjuhe.site'],apiKeys:['synthetic'],createPath:'/v1/videos',queryPath:'/v1/videos/{task_id}',durationOptions:[10],modelName:'omni_flash-10s',textModel:'omni_flash-10s'});
  instance.requestAuthorizedJson=async()=>{calls++;throw Error('模拟网络断开')};
  await assert.rejects(instance.generateVideoAsset({brandId:'test',taskId:'test',title:'测试',requestedVideoProvider:'xjjuhe_video',prompt:'视频',requestedDurationSec:10,requestedAspectRatio:'16:9'}),/提交结果未确认/);
  assert.equal(calls,1);
});
