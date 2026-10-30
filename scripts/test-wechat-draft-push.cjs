const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('reflect-metadata');
const base=path.resolve(__dirname,'../apps/server/dist/apps/server/src/modules');
const {WechatOfficialAccountApiService}=require(path.join(base,'works/wechat-official-account-api.service.js'));
const {WorksService}=require(path.join(base,'works/works.service.js'));
const {AIControlCenterService}=require(path.join(base,'openclaw/openclaw.service.js'));
const {projectBrandOperationsSchema}=require(path.join(base,'openclaw/brand-operations.policy.js'));

test('草稿接口使用同品牌受保护素材并取得真实 media_id 的模拟回执',async()=>{
 const old=global.fetch, calls=[]; global.fetch=async(url,init)=>{calls.push(String(url));if(String(url).includes('/cgi-bin/token'))return Response.json({access_token:'fixture-token'});if(String(url).includes('add_material'))return Response.json({media_id:'cover-id'});if(String(url).includes('uploadimg'))return Response.json({url:'https://mmbiz.qpic.cn/fixture'});if(String(url).includes('draft/add')){const body=JSON.parse(init.body);assert.match(body.articles[0].content,/mmbiz\.qpic\.cn/);return Response.json({media_id:'draft-id'})}throw Error('unexpected network')};
 try{const s=new WechatOfficialAccountApiService({getServerPort:()=>3011});const seen=[];const result=await s.publishDraft({appId:'id',appSecret:'secret'},{title:'fixture',htmlContent:'<img src="/api/works/brands/a/assets?fileName=body.png">',coverImageUrl:'/api/works/brands/a/assets?fileName=cover.png',needOpenComment:false,onlyFansCanComment:false},async url=>{seen.push(url);return {buffer:Buffer.from('fixture'),contentType:'image/png'}});assert.equal(result.mediaId,'draft-id');assert.equal(seen.length,2);assert.equal(calls.length,4)}finally{global.fetch=old}
});
test('站内素材严格限定品牌，路径仍由共享工具校验',async()=>{
 const s=Object.create(WorksService.prototype);s.appConfigService={getServerBaseUrl:()=> 'http://127.0.0.1:23011'};const seen=[];s.getGeneratedAsset=async(b,f)=>{seen.push([b,f]);return {buffer:Buffer.from('x'),contentType:'image/png'}};
 await s.resolveWechatLocalImage('a','http://127.0.0.1:23011/api/works/brands/a/assets?fileName=one.png');assert.deepEqual(seen,[['a','one.png']]);
 await assert.rejects(()=>s.resolveWechatLocalImage('a','http://127.0.0.1:23011/api/works/brands/b/assets?fileName=one.png'),/不属于/);
 assert.equal(await s.resolveWechatLocalImage('a','https://external.example/image.png'),null);
});
test('品牌 MCP 显示草稿动作，未显式确认时不调用公众号',async()=>{
 const schema=projectBrandOperationsSchema('manage_wechat_workflow',{properties:{action:{type:'string'}}},['manage_brand_library']);assert.ok(schema.properties.action.enum.includes('push_to_wechat_draft'));assert.ok(!schema.properties.action.enum.includes('publish_workflow'));
 const s=Object.create(AIControlCenterService.prototype);let calls=0;s.publishWechatWorkflow=async()=>{calls++;return {ok:true}};
 await assert.rejects(()=>s.manageWechatWorkflow({}, {action:'push_to_wechat_draft',workflowId:'w',payload:{}}),/授权/);assert.equal(calls,0);
 await s.manageWechatWorkflow({}, {action:'push_to_wechat_draft',workflowId:'w',payload:{confirmDraft:true}});assert.equal(calls,1);
});
test('微信 HTTP 错误不泄露 access token 或 secret',async()=>{
 const old=global.fetch;global.fetch=async()=>new Response('failure',{status:503});try{const s=new WechatOfficialAccountApiService({});await assert.rejects(()=>s.publishDraft({appId:'id',appSecret:'secret-example'},{title:'x',htmlContent:'x',coverImageUrl:'x',needOpenComment:false,onlyFansCanComment:false}),e=>{assert.ok(!e.message.includes('secret-example'));return true})}finally{global.fetch=old}
});
test('已有草稿回执禁止重复提交',async()=>{
 const s=Object.create(WorksService.prototype);s.loadWechatWorkflowSessionStoreItem=async()=>({status:'PUBLISHED',publishConfig:{mediaId:'fixture'}});await assert.rejects(()=>s.publishWechatWorkflow('a','w'),/避免重复/);
});
test('草稿请求断线时提示结果未知，禁止直接重试',async()=>{
 const old=global.fetch;global.fetch=async(url)=>{if(String(url).includes('/cgi-bin/token'))return Response.json({access_token:'fixture-token'});if(String(url).includes('add_material'))return Response.json({media_id:'cover'});if(String(url).includes('draft/add'))throw Error('connection reset');throw Error('unexpected')};
 try{const s=new WechatOfficialAccountApiService({});await assert.rejects(()=>s.publishDraft({appId:'id',appSecret:'secret'},{title:'x',htmlContent:'x',coverImageUrl:'/local',needOpenComment:false,onlyFansCanComment:false},async()=>({buffer:Buffer.from('x'),contentType:'image/png'})),/结果未知/)}finally{global.fetch=old}
 const s=Object.create(WorksService.prototype);s.loadWechatWorkflowSessionStoreItem=async()=>({status:'FAILED',errorDetail:'公众号草稿提交结果未知'});await assert.rejects(()=>s.publishWechatWorkflow('a','w'),/避免重复/);
});
