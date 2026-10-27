const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),compiled='apps/server/dist/apps/server/src/modules/openclaw/';
const {validateBrandUpload}=require(path.join(root,compiled,'brand-upload.js'));
const {assertBrandOperationsAction,projectBrandOperationsSchema}=require(path.join(root,compiled,'brand-operations.policy.js'));
const {AIControlCenterService}=require(path.join(root,compiled,'openclaw.service.js'));
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
const md={fileName:'资料.md',contentType:'text/markdown',dataBase64:Buffer.from('真实品牌资料').toString('base64')};
const png={fileName:'image.png',contentType:'image/png',dataBase64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6b8sAAAAASUVORK5CYII='};
check('文档原文保持',()=>assert.deepEqual(validateBrandUpload(md),md));
check('真实PNG接受',()=>assert.deepEqual(validateBrandUpload(png,true),png));
for(const [name,body,only] of [['路径穿越',{...md,fileName:'../a.md'}],['MIME冲突',{...md,contentType:'image/png'}],['伪装图片',{...png,dataBase64:md.dataBase64},true],['图片位置拒绝文本',md,true],['无效Base64',{...md,dataBase64:'@@@='}],['隐藏字段',{...md,brandId:'another'}],['空文件',{...md,dataBase64:''}]])check(name+'拒绝',()=>assert.throws(()=>validateBrandUpload(body,only)));
check('大文档线性解析',()=>{const dataBase64=Buffer.alloc(1024*1024,65).toString('base64');assert.equal(validateBrandUpload({...md,dataBase64}).dataBase64,dataBase64)});
check('完整品牌连接动作可见，未知动作拒绝',()=>{for(const action of ['upload_asset_file','upload_product_image']){assert.doesNotThrow(()=>assertBrandOperationsAction('manage_brand_library',{action},['manage_brand_library']));assert.throws(()=>assertBrandOperationsAction('manage_brand_library',{action:action+'_unknown'},['manage_brand_library']));}const schema=projectBrandOperationsSchema('manage_brand_library',{properties:{action:{type:'string'}}},['manage_brand_library']);assert.ok(schema.properties.action.enum.includes('upload_asset_file'));assert.ok(schema.properties.action.enum.includes('upload_product_image'));});
(async()=>{
 const service=Object.create(AIControlCenterService.prototype);let calls=[],allow=true;
 service.requireAuth=async()=>({userId:'test',currentBrandId:'brand-a'});service.requireCurrentBrandId=async()=> 'brand-a';
 service.authService={assertBrandAccess:async()=>{},assertBrandPermission:async(brand,key,level)=>{calls.push({brand,key,level});if(!allow)throw Error('denied')}};
 service.brandsService={uploadAssetFile:async(brand,p)=>({brand,...p}),uploadProductImage:async(brand,p)=>({brand,...p})};service.buildManagedOperationResponse=p=>p;
 for(const [action,payload,key] of [['upload_asset_file',md,'brandGrowth.library.businessAssets'],['upload_product_image',png,'brandGrowth.library.products']]){
  const result=await service.manageBrandLibrary({}, {action,payload});check(action+'绑定当前品牌及编辑权限',()=>{assert.equal(result.data.brand,'brand-a');assert.equal(calls.at(-1).key,key);assert.equal(calls.at(-1).level,'edit')});
 }
 allow=false;await assert.rejects(()=>service.manageBrandLibrary({}, {action:'upload_asset_file',payload:md}));checks++;console.log('PASS 无编辑权限拒绝');console.log(JSON.stringify({checks}));
})().catch(e=>{console.error(e.stack);process.exitCode=1});
