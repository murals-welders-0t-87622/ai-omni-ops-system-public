// Verify archive metadata projection does not alter work snapshots.
const assert = require('node:assert/strict');
const {WorkAnalysisService}=require('../apps/server/dist/apps/server/src/modules/openclaw/work-analysis.service.js');
const service=new WorkAnalysisService({});
const omitted=['body','result','items','operatingMap','htmlContent','reportMarkdown','textContent','scorecard','authorAvatar','actions','report','productSnapshot','hashtags','receipt','growth','coverUrl','videoStorageKey'];
const kinds=['XHS_BRAND_NOTE','XHS_BENCHMARK_NOTE','XHS_SEARCH_NOTE','DOUYIN_BRAND_WORK','DOUYIN_COMPETITOR_WORK','DOUYIN_BENCHMARK_WORK','DOUYIN_SEARCH_WORK','DOUYIN_LOW_FAN_EXPLOSIVE_WORK','DOUYIN_HIGH_COMPLETION_RATE_WORK','DOUYIN_HIGH_LIKE_RATE_WORK','WECHAT_MP_ARTICLE','WECHAT_MP_BENCHMARK_ARTICLE','WECHAT_SEARCH_ITEM','UNKNOWN'];
for(const kind of kinds){
 const metadata={kind,body:'omitted body',result:{value:'x'},items:['x'],operatingMap:{value:1},htmlContent:'<p>text</p>',reportMarkdown:'report',textContent:'text',scorecard:{value:1},authorAvatar:'https://example.invalid/avatar',actions:[{title:'x'}],report:'report',productSnapshot:{id:'p'},hashtags:['x'],receipt:{id:'r'},growth:{value:1},coverUrl:'https://example.invalid/cover',videoStorageKey:'video/key',
  articleContent:'article',description:'description',content:'content',videoCopy:'video copy',url:'https://mp.weixin.qq.com/s/example',workId:'work-1',noteId:'note-1',productId:'product-1',productIds:['product-1'],workUrl:'https://example.invalid/work',videoUrl:'https://example.invalid/video.mp4',sourceVideoUrl:'https://example.invalid/source.mp4',imageList:['https://example.invalid/image.png'],videoTranscriptText:'transcript',durationMs:2000,playCount:5,authorName:'author'};
 const projected={...metadata};for(const key of omitted)delete projected[key];
 const source={id:'one',brandId:'test-brand',title:'title',description:'fallback',fileUrl:null,updatedAt:new Date('2026-01-01T00:00:00Z')};
 assert.deepEqual(service.snapshot({...source,metadataJson:metadata}),service.snapshot({...source,metadataJson:projected}),`snapshot changed for ${kind}`);
}
console.log(`PASS work snapshot parity across ${kinds.length} content kinds`);
