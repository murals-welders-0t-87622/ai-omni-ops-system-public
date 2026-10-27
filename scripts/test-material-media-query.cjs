// Read-only PostgreSQL regression; synthetic VALUES never write database tables.
// Build server first and set DATABASE_URL to a test PostgreSQL.
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { AiControlAssetArchiveService } = require(process.env.ARCHIVE_SERVICE_MODULE || '../apps/server/dist/apps/server/src/modules/ai-control/ai-control-asset-archive.service.js');
const db = new PrismaClient();
const fixture = `WITH fixture_media("id","brandId","mediaType","title","taskId","sourceUrl","storageKey","mimeType","metadataJson","createdAt","updatedAt") AS (VALUES
 ('single','test-brand','image','single',NULL::text,NULL::text,NULL::text,'image/png','{"productId":"p1","largeUnused":{"original":"do-not-transfer"}}'::jsonb,timestamp '2026-01-01',timestamp '2026-01-01'),
 ('multi','test-brand','video','multi',NULL::text,NULL::text,NULL::text,'video/mp4','{"productIds":["p2","p1","p1"]}'::jsonb,timestamp '2026-01-02',timestamp '2026-01-02'),
 ('scalar','test-brand','image','scalar',NULL::text,NULL::text,NULL::text,'image/png','"value"'::jsonb,timestamp '2026-01-03',timestamp '2026-01-03'),
 ('array','test-brand','image','array',NULL::text,NULL::text,NULL::text,'image/png','[1,2]'::jsonb,timestamp '2026-01-04',timestamp '2026-01-04'),
 ('empty','test-brand','image','empty',NULL::text,NULL::text,NULL::text,'image/png',NULL::jsonb,timestamp '2026-01-05',timestamp '2026-01-05'),
 ('other','other-brand','image','other',NULL::text,NULL::text,NULL::text,'image/png','{"productId":"p1"}'::jsonb,timestamp '2026-01-06',timestamp '2026-01-06')
), fixture_task("id","taskTitle") AS (SELECT NULL::text,NULL::text WHERE false) `;
let lastRows;
const facade = {
  canUseDatabase: async () => true,
  tableExists: async name => name === 'MediaAsset',
  product: {findMany: async () => [{id:'p1',productName:'One'},{id:'p2',productName:'Two'}]},
  $queryRaw: async (parts,...values) => {
    let query = parts.reduce((s,part,i) => s + part + (i < parts.length-1 ? `$${i+1}` : ''), '');
    query = fixture + query.replace('FROM "MediaAsset" m','FROM fixture_media m').replace('LEFT JOIN "Task" t','LEFT JOIN fixture_task t');
    lastRows = await db.$queryRawUnsafe(query,...values);
    return lastRows;
  },
};
(async () => {
  const svc = new AiControlAssetArchiveService(facade,{},{},{},{});
  svc.listCreativeMaterials=svc.listVideoWorks=svc.listBusinessAssets=svc.listWorkflowArtifacts=async()=>[];
  const result=await svc.getArchive({brandId:'test-brand',productId:'p1',limit:'20'});
  assert.equal(lastRows.length,5);
  assert.equal(result.total,2);
  assert.deepEqual(result.items.map(x=>x.id).sort(),['multi','single']);
  assert.deepEqual(result.items.find(x=>x.id==='multi').products.map(x=>x.id),['p1','p2']);
  const single=lastRows.find(r=>r.id==='single');
  assert.equal(single.metadataJson.productId,'p1');
  assert.equal(single.metadataJson.largeUnused,undefined);
  for(const id of ['scalar','array','empty']) assert.equal(lastRows.find(r=>r.id===id).metadataJson.productId,null);
  console.log('PASS media metadata: brand isolation, product links, null/scalar/array and large unused fields');
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
