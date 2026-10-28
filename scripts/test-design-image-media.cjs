const { test } = require('node:test');
const assert = require('node:assert/strict');
const { designImageMedia, registerDesignImageMedia } = require('../apps/server/dist/apps/server/src/modules/works/design-image-media');
const base = 'http://127.0.0.1:23011', brand = 'brand-1', task = 'task-1';
const local = `${base}/api/works/brands/${brand}/assets?fileName=${task}-cover-1.png`;
test('registered image references exactly the task and brand controlled object', () => {
  assert.deepEqual(designImageMedia(local, base, brand, task), {storageKey:'works/brand-1/task-1-cover-1.png',mimeType:'image/png'});
  assert.equal(designImageMedia(local.replace('.png','.webp'), base, brand, task).mimeType, 'image/webp');
});
test('remote, different brand/task and malformed URLs cannot be registered', () => {
  for (const url of [local.replace('127.0.0.1','example.com'), local.replace(brand,'another'), local.replace(task,'other'), local+'&fileName=another', local+'&x=1', local.replace('task-1-cover-1.png','..%2Ftask-1-cover-1.png'), 'not-a-url']) assert.equal(designImageMedia(url,base,brand,task),null);
});
test('successful local output is registered once for its original brand and task', async () => {
  const rows=[];
  const db={canUseDatabase:async()=>true,mediaAsset:{findFirst:async({where})=>rows.find(r=>r.brandId===where.brandId && r.taskId===where.taskId && r.storageKey===where.storageKey),create:async({data})=>{rows.push(data);return data}}};
  const info={url:local,serverBase:base,brandId:brand,taskId:task,userId:'user-1',title:'cover'};
  await registerDesignImageMedia(db,info); await registerDesignImageMedia(db,info);
  assert.equal(rows.length,1); assert.equal(rows[0].mediaType,'IMAGE'); assert.equal(rows[0].mimeType,'image/png');
  await registerDesignImageMedia(db,{...info,url:local.replace('127.0.0.1','example.com')});
  assert.equal(rows.length,1);
});
