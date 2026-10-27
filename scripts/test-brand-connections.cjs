const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');require('reflect-metadata');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'apps/server/dist/apps/server/src/modules');
const {connectionTools,assertConnectionBrandScope}=require(path.join(dist,'openclaw/brand-connection.contract.js'));
const {AIControlCenterService}=require(path.join(dist,'openclaw/openclaw.service.js'));
const {AIControlCenterInstallationService}=require(path.join(dist,'openclaw/openclaw-installation.service.js'));
const {TenantAccessGuard}=require(path.join(dist,'auth/tenant-access.guard.js'));
test('exact read/work grants resolve to actual catalog entries and no paid or publishing tools',async()=>{
 const s=Object.create(AIControlCenterService.prototype);s.authorizeMcpRequest=async()=>({userId:'u',brandId:'a',connectionId:'c',allowedMcpTools:connectionTools('work')});
 const r=await s.handleMcpRpcRequest({}, {id:1,method:'tools/list'});assert.deepEqual(r.result.tools.map(x=>x.name).sort(),connectionTools('work').sort());
 assert.ok(connectionTools('read').every(x=>connectionTools('work').includes(x)));assert.ok(!connectionTools('work').some(x=>/publish|payment|generate_|record_growth_metric_fact/.test(x)));
});
test('a denied MCP tool never reaches execution, including unknown write tool',async()=>{
 const s=Object.create(AIControlCenterService.prototype);let called=false;s.authorizeMcpRequest=async()=>({userId:'u',brandId:'a',connectionId:'c',allowedMcpTools:connectionTools('read')});s.handleCachedToolCall=async()=>{called=true};
 const r=await s.handleMcpRpcRequest({}, {id:2,method:'tools/call',params:{name:'create_growth_plan_request',arguments:{}}});assert.equal(r.result.isError,true);assert.equal(called,false);
});
test('nested brand scopes cannot switch a connection or browser execution',()=>{
 assert.doesNotThrow(()=>assertConnectionBrandScope({body:{brandId:'a'}},'a'));
 for(const v of [{brandId:'b'},{body:[{brand_id:'b'}]},{brandId:['a']}])assert.throws(()=>assertConnectionBrandScope(v,'a'));
});
test('token response has no stored hash, encrypted value or grant JSON',()=>{
 const s=Object.create(AIControlCenterInstallationService.prototype);const r=s.publicToken({id:'t',brandId:'a',tokenHash:'hidden',encryptedToken:'hidden',toolAllowlistJson:'hidden'});assert.equal(r.brandId,'a');for(const k of ['tokenHash','encryptedToken','toolAllowlistJson'])assert.equal(k in r,false);
});

test('connection workspace loads scoped metadata without revealing or decrypting a token',async()=>{
 const permissionCalls=[];const s=new AIControlCenterInstallationService({}, {assertBrandPermission:async(...args)=>permissionCalls.push(args),getMe:async()=>({brands:[{id:'a',brandName:'A'}]})}, {});
 s.listTokenRecords=async brand=>brand==='a'?[{id:'t',brandId:'a',connectionId:'c',status:'ACTIVE'}]:[];
 s.revealInstallationToken=async()=>{throw Error('Metadata must never reveal credentials')};s.decryptToken=()=>{throw Error('Metadata must never decrypt')};
 s.buildWorkspace=async input=>input;
 const result=await s.getBrandConnectionWorkspace({userId:'u',brandId:'a'},'c');assert.equal(result.activeToken.id,'t');assert.equal(result.brandName,'A');assert.equal('rawToken' in result,false);assert.equal(permissionCalls[0][0],'a');assert.equal(permissionCalls[0][2],'edit');
 await assert.rejects(()=>s.getBrandConnectionWorkspace({userId:'u',brandId:'b'},'c'),/不可访问/);
});

test('connection metadata does not bypass missing brand-management permission',async()=>{
 const s=new AIControlCenterInstallationService({}, {assertBrandPermission:async()=>{throw Error('permission denied')}}, {});
 s.listTokenRecords=async()=>{throw Error('Must not read tokens before permission check')};
 await assert.rejects(()=>s.getBrandConnectionWorkspace({userId:'u',brandId:'a'},'c'),/permission denied/);
});
test('install resolution rechecks membership and disabled account even on repeat requests',async()=>{
 let disabled=false,removed=false,calls=0;const s=new AIControlCenterInstallationService({}, {assertBrandAccess:async()=>{calls++;if(removed)throw Error('membership revoked')},assertActiveExecutionUser:async()=>{if(disabled)throw Error('account disabled')}}, {});
 s.findActiveTokenByHash=async()=>({id:'t',brandId:'a',createdByUserId:'u',status:'ACTIVE',connectionId:'c',toolAllowlistJson:'["get_current_brand_context"]'});s.touchTokenIfNeeded=async()=>{};
 const h={authorization:'Bearer ocp_fixture','x-brand-id':'a'};const a=await s.resolveInstallToken(h);assert.equal(a.connectionId,'c');assert.equal(a.allowedMcpTools[0],'get_current_brand_context');disabled=true;await assert.rejects(()=>s.resolveInstallToken(h),/account disabled/);disabled=false;removed=true;await assert.rejects(()=>s.resolveInstallToken(h),/membership revoked/);assert.equal(calls,3);await assert.rejects(()=>s.resolveInstallToken({...h,'x-brand-id':'b'}),/绑定品牌/);
});
test('only exact RPC endpoint bypasses session guard; debug remains platform-only',async()=>{
 const g=new TenantAccessGuard({resolveRequestAuthContext:async()=>({source:'token',userId:'u',brandId:'a',systemRole:'USER'}),assertBrandAccess:async()=>{}},{isOntologyLab:()=>true,isLocalSingleUserMode:()=>false},{});
 const c=p=>({switchToHttp:()=>({getRequest:()=>({path:p,method:'GET',headers:{},params:{},query:{},body:{}})})});assert.equal(await g.canActivate(c('/api/ai-control-center/mcp')),true);for(const p of ['/api/ai-control-center/mcp/debug/x/logs','/API/AI-CONTROL-CENTER/MCP/DEBUG/X/LOGS'])await assert.rejects(()=>g.canActivate(c(p)),/平台配置/);
});
test('brand task view includes teammates and excludes own work in another brand',async()=>{
 const {TasksService}=require(path.join(dist,'tasks/tasks.service.js'));let where;
 const s=new TasksService({canUseDatabase:async()=>true,task:{findMany:async q=>{where=q.where;return []}}});await s.listTasks({userId:'u',brandId:'a'});assert.deepEqual(where,{brandId:'a'});await s.listTasks({userId:'u'});assert.deepEqual(where,{userId:'u',brandId:null});
});
test('brand media view is brand scoped; personal view excludes brand assets',async()=>{
 const {MediaService}=require(path.join(dist,'media/media.service.js'));let where;
 const s=new MediaService({canUseDatabase:async()=>true,mediaAsset:{findMany:async q=>{where=q.where;return []}}});await s.listMedia({userId:'u',brandId:'a'});assert.deepEqual(where,{brandId:'a'});await s.listMedia({userId:'u'});assert.deepEqual(where,{userId:'u',brandId:null});
});
test('Lab never resolves a missing brand credential from the desktop environment',()=>{
 const {ThirdPartyPlatformsService}=require(path.join(dist,'third-party-platforms/third-party-platforms.service.js'));const s=new ThirdPartyPlatformsService({}, {}, {});const prior=process.env.APP_ENVIRONMENT;process.env.APP_ENVIRONMENT='ontology-lab';try{assert.deepEqual(s.resolveLocalEnvApiKeysForPlatform({baseUrl:'https://openspeech.bytedance.com'}),[])}finally{if(prior===undefined)delete process.env.APP_ENVIRONMENT;else process.env.APP_ENVIRONMENT=prior}
});
