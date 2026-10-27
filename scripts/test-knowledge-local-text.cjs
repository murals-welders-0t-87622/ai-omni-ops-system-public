const assert=require('node:assert/strict');
const {KnowledgeBasesService}=require('../apps/server/dist/apps/server/src/modules/admin/knowledge-bases.service.js');
(async()=>{
 const s=Object.create(KnowledgeBasesService.prototype);let parsed=0,keys=[];
 s.extractBusinessAssetsBrandId=()=> 'brand-a';s.resolveBusinessAssetSourceInfo=async()=>({storedFileName:'source.md',fileUrl:''});
 s.ossStorageService={getObject:async key=>{keys.push(key);return {buffer:Buffer.from('# 产品说明\n真实正文：品牌甲，未配置外部服务。'),contentType:'text/markdown'}}};
 s.glmOpenService={parseFile:async()=>{parsed++;throw Error('brand provider not configured')}};
 let r=await s.extractKnowledgeBaseFileText({knowledgeBaseId:'kb-brand-a',fileName:'source.md'});
 assert.equal(parsed,0);assert.equal(r.usedFallback,false);assert.equal(r.sourceLabel,'file-parser-local');assert.match(r.content,/真实正文/);assert.equal(keys[0],'brands/brand-a/asset-files/source.md');
 s.ossStorageService.getObject=async()=>null;r=await s.extractKnowledgeBaseFileText({knowledgeBaseId:'kb-brand-a',fileName:'source.md'});assert.equal(r.usedFallback,true);assert.equal(parsed,0);
 console.log('PASS 实际文本、无第三方调用、当前品牌存储键及缺失文件不伪称正文（7项断言）');
})().catch(e=>{console.error(e);process.exitCode=1});
