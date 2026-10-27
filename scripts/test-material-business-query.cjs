// Postgres read-only test. Uses synthetic VALUES, never writes a table.
// Run after build:server with DATABASE_URL pointing to a test Postgres.
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { AiControlAssetArchiveService } = require(process.env.ARCHIVE_SERVICE_MODULE || '../apps/server/dist/apps/server/src/modules/ai-control/ai-control-asset-archive.service.js');
const db = new PrismaClient();
let result;
const fixture = `fixture("id","brandId","title","description","fileUrl","category","createdAt","updatedAt","metadataJson") AS (VALUES
  ('object','test-brand','object',NULL::text,NULL::text,'REPORT',timestamp '2026-01-01',timestamp '2026-01-01', '{"kind":"REPORT","htmlContent":"hello","videoUrl":"video.mp4","videoCacheStatus":"READY","videoStorageKey":"key","videoContentType":"video/mp4","rawFields":{"secret":"excluded"},"nested":{"rawFields":"retained"}}'::jsonb),
  ('array','test-brand','array',NULL::text,NULL::text,'REPORT',timestamp '2026-01-02',timestamp '2026-01-02', '[1,2]'::jsonb),
  ('scalar','test-brand','scalar',NULL::text,NULL::text,'REPORT',timestamp '2026-01-03',timestamp '2026-01-03', '"value"'::jsonb),
  ('null','test-brand','null',NULL::text,NULL::text,'REPORT',timestamp '2026-01-04',timestamp '2026-01-04', NULL::jsonb),
  ('other-brand','other-brand','other',NULL::text,NULL::text,'REPORT',timestamp '2026-01-05',timestamp '2026-01-05', '{}'::jsonb),
  ('comment','test-brand','comment',NULL::text,NULL::text,'REPORT',timestamp '2026-01-06',timestamp '2026-01-06', '{"kind":"DOUYIN_COMMENT"}'::jsonb),
  ('ocean','test-brand','ocean',NULL::text,NULL::text,'REPORT',timestamp '2026-01-07',timestamp '2026-01-07', '{"kind":"OCEAN_AD_REPORT"}'::jsonb)
)`;
const facade = {
  canUseDatabase: async () => true,
  tableExists: async name => name === 'BusinessAsset',
  product: { findMany: async () => [] },
  $queryRaw: async (parts, ...values) => {
    let query = parts.reduce((s, part, i) => s + part + (i < parts.length - 1 ? `$${i+1}` : ''), '');
    assert.match(query, /WITH normalized AS MATERIALIZED/);
    query = query.replace('WITH normalized AS MATERIALIZED', `WITH ${fixture}, normalized AS MATERIALIZED`)
      .replace('FROM "BusinessAsset"', 'FROM fixture');
    result = await db.$queryRawUnsafe(query, ...values);
    return result;
  },
};
(async () => {
  const svc = new AiControlAssetArchiveService(facade, {}, {}, {}, {});
  await svc.listBusinessAssets('test-brand', 100);
  assert.deepEqual(result.map(r => r.id).sort(), ['array','null','object','scalar']);
  const byId = Object.fromEntries(result.map(r => [r.id,r]));
  assert.equal(byId.object.textContent, 'hello');
  assert.equal(byId.object.assetUrl, 'video.mp4');
  assert.equal(byId.object.storageKey, 'key');
  assert.equal(byId.object.mimeType, 'video/mp4');
  assert.equal(byId.object.metadataJson.rawFields, undefined);
  assert.equal(byId.object.metadataJson.htmlContent, undefined);
  assert.deepEqual(byId.object.metadataJson.nested, {rawFields:'retained'});
  assert.deepEqual(byId.array.metadataJson, [1,2]);
  assert.equal(byId.scalar.metadataJson, 'value');
  assert.equal(byId.null.metadataJson, null);
  svc.listCreativeMaterials = svc.listVideoWorks = svc.listMediaAssets = svc.listWorkflowArtifacts = async () => [];
  const matches = await svc.getArchive({ brandId: 'test-brand', keyword: 'hello', limit: '20' });
  assert.equal(matches.total, 1);
  assert.equal(matches.items[0].id, 'object');
  assert.equal(matches.items[0].textContent, 'hello');
  console.log('PASS business archive SQL: brand isolation, exclusions, object/array/scalar/null metadata, projected fields');
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
