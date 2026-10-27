const assert = require('node:assert/strict');
const {CommerceService}=require('../apps/server/dist/apps/server/src/modules/openclaw/commerce.service.js');
const brand='brand-one';
const media=[
 {id:'valid',brandId:brand,title:'Stored',taskId:'task-one',mimeType:'image/png',storageKey:`works/${brand}/image.png`,metadataJson:{large:'not-needed'}},
 ...Array.from({length:199},(_,i)=>({id:`blank-${i}`,brandId:brand,title:'No storage',taskId:null,mimeType:null,storageKey:null,metadataJson:{large:'not-needed'}})),
 {id:'beyond-window',brandId:brand,title:'Outside 200',taskId:null,mimeType:'image/png',storageKey:`works/${brand}/late.png`},
 {id:'other-brand',brandId:'brand-two',title:'Other',taskId:null,mimeType:'image/png',storageKey:'works/brand-two/secret.png'},
];
const creative=[{id:'creative',brandId:brand,title:'Creative',mimeType:'video/mp4',storageKey:`works/${brand}/video.mp4`,textContent:'not-needed'},{id:'remote',brandId:brand,title:'Nonlocal',mimeType:null,storageKey:'other/key'}];
function find(rows,expectedKeys){return async args=>{
 assert.equal(args.where.brandId,brand);
 assert.equal(args.take,200);
 assert.deepEqual(args.orderBy,{createdAt:'desc'});
 assert.deepEqual(Object.keys(args.select).sort(),expectedKeys.sort());
 return rows.filter(r=>r.brandId===args.where.brandId).slice(0,args.take).map(r=>Object.fromEntries(Object.keys(args.select).map(k=>[k,r[k]])));
};}
const db={
 businessAsset:{findMany:async()=>[]},product:{findMany:async()=>[]},task:{findMany:async()=>[]},
 mediaAsset:{findMany:find(media,['id','title','taskId','mimeType','storageKey'])},
 aIControlCenterCreativeMaterial:{findMany:find(creative,['id','title','mimeType','storageKey'])},
};
(async()=>{
 const result=await new CommerceService(db,{},{}).workspace(brand,'detail');
 assert.deepEqual(result.mediaItems,[
  {table:'MediaAsset',recordId:'valid',title:'Stored',taskId:'task-one',mimeType:'image/png',href:`/api/works/brands/${brand}/assets?fileName=image.png`},
  {table:'AIControlCenterCreativeMaterial',recordId:'creative',title:'Creative',taskId:'',mimeType:'video/mp4',href:`/api/works/brands/${brand}/assets?fileName=video.mp4`},
  {table:'AIControlCenterCreativeMaterial',recordId:'remote',title:'Nonlocal',taskId:'',mimeType:'',href:''},
 ]);
 console.log('PASS commerce workspace media projection, brand isolation, original 200-record window and media references');
})().catch(e=>{console.error(e);process.exitCode=1});
