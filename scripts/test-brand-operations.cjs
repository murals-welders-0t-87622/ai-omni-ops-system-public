const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');require('reflect-metadata');
const dir=path.resolve(__dirname,'../apps/server/dist/apps/server/src/modules/openclaw');
const {AIControlCenterService}=require(path.join(dir,'openclaw.service.js'));
const {AIControlCenterInstallationService}=require(path.join(dir,'openclaw-installation.service.js'));
const {connectionTools}=require(path.join(dir,'brand-connection.contract.js'));
const {BRAND_OPERATIONS_ACTIONS,HELD_CONNECTION_TOOLS}=require(path.join(dir,'brand-operations.policy.js'));
const actor=(tools=connectionTools('brand'))=>({userId:'owner',brandId:'a',source:'token',connectionId:'c',allowedMcpTools:tools});
const service=(a=actor())=>{const s=Object.create(AIControlCenterService.prototype);s.authorizeMcpRequest=async()=>a;return s};
const rpc=(s,name,args={})=>s.handleMcpRpcRequest({}, {id:1,method:'tools/call',params:{name,arguments:args}});
test('every runtime tool is explicitly granted or held, with no accidental new-tool inheritance',async()=>{
 const s=service({userId:'catalog',brandId:'a'}),all=(await s.handleMcpRpcRequest({}, {id:1,method:'tools/list'})).result.tools.map(t=>t.name),brand=connectionTools('brand');
 assert.equal(new Set(brand).size,brand.length);assert.ok(brand.length>200);assert.ok(['manage_brand_library','sync_douyin_brand_works','sync_xiaohongshu_brand_notes','fetch_wechat_brand_articles','create_knowledge_base','create_ai_control_center_creative_material'].every(n=>brand.includes(n)));
 assert.deepEqual([...brand,...Object.keys(HELD_CONNECTION_TOOLS)].sort(),[...all].sort());assert.equal(connectionTools('read').length,14);assert.equal(connectionTools('work').length,24);
});
test('all held paid, publication, human-review and platform tools fail before execution',async()=>{
 const s=service();let calls=0;s.handleCachedToolCall=async()=>{calls++;return {}};
 for(const name of Object.keys(HELD_CONNECTION_TOOLS)){const r=await rpc(s,name);assert.equal(r.result.isError,true,name)}assert.equal(calls,0);
});
test('multiplexed tools reject paid/publication, case variants, and unknown actions before execution',async()=>{
 const s=service();let calls=0;s.handleCachedToolCall=async()=>{calls++;return {}};
 for(const[name,args]of [['manage_wechat_workflow',{action:'publish_workflow'}],['manage_wechat_workflow',{action:'update_publish_confirm'}],['manage_wechat_workflow',{action:'generate_images'}],['manage_growth_reports',{action:'generate_visual_growth_report'}],['manage_xiaohongshu_video',{action:'generate'}],['manage_douyin_video_production',{section:'runninghub',action:'generate'}],['manage_douyin_video_production',{section:'digital_human',action:'generate_complete_video'}],['manage_douyin_video_production',{section:'runninghub',action:'LIST_WORKS_UNKNOWN'}],['manage_brand_library',{action:'upsert_feishu_binding'}]])assert.equal((await rpc(s,name,args)).result.isError,true,name);
 assert.equal(calls,0);
});
test('approved brand-library actions route and nested foreign scopes never reach dispatch',async()=>{
 const s=service();let calls=0;s.handleCachedToolCall=async()=>{calls++;return {ok:true}};
 assert.ok(!(await rpc(s,'manage_brand_library',{action:'create_product',payload:{productName:'fixture'}})).result.isError);assert.equal(calls,1);
 assert.equal((await rpc(s,'manage_brand_library',{action:'create_product',payload:{nested:{brand_id:'b'}}})).result.isError,true);assert.equal(calls,1);
});
test('listed multiplex action schema exposes only approved actions and leaves shared catalog unchanged',async()=>{
 const legacy=service({userId:'legacy',brandId:'a'}),before=JSON.stringify((await legacy.handleMcpRpcRequest({}, {id:0,method:'tools/list'})).result.tools);const s=service(),tools=(await s.handleMcpRpcRequest({}, {id:1,method:'tools/list'})).result.tools;
 for(const name of Object.keys(BRAND_OPERATIONS_ACTIONS)){const tool=tools.find(t=>t.name===name);assert.ok(tool);assert.ok(!tool.inputSchema.properties.action.enum.includes('publish_workflow'));assert.ok(!tool.inputSchema.properties.action.enum.includes('generate'))}
 const all=(await legacy.handleMcpRpcRequest({}, {id:2,method:'tools/list'})).result.tools;assert.equal(JSON.stringify(all),before);
});
test('narrow grants and their scopes remain unchanged without opt-in',async()=>{
 for(const access of ['read','work']){const s=service(actor(connectionTools(access))),tools=(await s.handleMcpRpcRequest({}, {id:1,method:'tools/list'})).result.tools;assert.equal(tools.length,connectionTools(access).length);assert.ok(!tools.some(t=>t.name==='manage_brand_library'))}
});
test('grant mutation needs explicit confirmation, management scope, and execution-role checks',async()=>{
 const s=new AIControlCenterInstallationService({}, {}, {});s.requireBrandConnection=async()=>({brandId:'a'});let commits=0;s.commitConnectionAuthorization=async()=>{commits++;return {}};
 await assert.rejects(()=>s.updateBrandConnectionAuthorization(actor(),'c',{access:'brand'}),/确认/);await assert.rejects(()=>s.updateBrandConnectionAuthorization(actor(),'c',{access:'work',confirmed:true}),/仅升级/);assert.equal(commits,0);
 s.requireBrandConnection=async()=>{throw Error('foreign connection')};await assert.rejects(()=>s.updateBrandConnectionAuthorization(actor(),'b',{access:'brand',confirmed:true}),/foreign/);
});
test('downgraded broad-grant execution identity is rejected on next token request',async()=>{
 const s=new AIControlCenterInstallationService({}, {assertBrandAccess:async()=>({role:'EMPLOYEE'}),assertActiveExecutionUser:async()=>{}},{});s.findActiveTokenByHash=async()=>({id:'t',brandId:'a',createdByUserId:'u',status:'ACTIVE',connectionId:'c',toolAllowlistJson:JSON.stringify(connectionTools('brand'))});s.touchTokenIfNeeded=async()=>{};
 await assert.rejects(()=>s.resolveInstallToken({authorization:'Bearer ocp_fixture','x-brand-id':'a'}),/品牌管理权限/);
});
