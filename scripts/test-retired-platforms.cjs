const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ApiProvidersService } = require('../apps/server/dist/apps/server/src/modules/admin/api-providers.service');
const { ThirdPartyPlatformsService } = require('../apps/server/dist/apps/server/src/modules/third-party-platforms/third-party-platforms.service');
const { database } = require('../apps/server/dist/apps/server/src/common/mock-data');
const { isRetiredPlatformBaseUrl, isRetiredApiProvider } = require('../apps/server/dist/apps/server/src/common/retired-platforms');
const { isDecommissionedPlatformBaseUrl, THIRD_PARTY_PLATFORM_SEEDS } = require('../apps/server/dist/apps/server/src/common/third-party-platform-catalog');
const { SYSTEM_API_PROVIDER_SEEDS } = require('../apps/server/dist/apps/server/src/common/api-provider-catalog');
const { WorksService } = require('../apps/server/dist/apps/server/src/modules/works/works.service');

const oldId = 'provider_runtime_video_xjjuhe';
const oldPlatformId = 'platform_https_xjjuhe_site';
const provider = (id, baseUrl) => ({ id, name: id, status: 'ACTIVE', providerType: 'CUSTOM', baseUrl, updatedAt: '2026-01-01T00:00:00Z', extraParams: { runtimeKey: 'video-generation' } });
const platform = (id, baseUrl) => ({ id, name: id, status: 'ACTIVE', providerType: 'CUSTOM', baseUrl, websiteUrl: baseUrl, tutorialUrl: '', defaultModel: 'synthetic-model', modelIds: ['synthetic-model'], remark: '', updatedAt: '2026-01-01T00:00:00Z' });
function apiService() { return new ApiProvidersService({ canUseDatabase: async () => false }); }
function platformService() {
  const service = new ThirdPartyPlatformsService({ canUseDatabase: async () => false }, {}, {});
  // Synthetic tests never consult deployment environment credentials.
  service.resolveLocalEnvApiKeysForPlatform = () => [];
  return service;
}

test('retirement matches the actual host and aliases without retiring unrelated similarly named domains', () => {
  assert.equal(isRetiredPlatformBaseUrl('https://xjjuhe.site/v1'), true);
  assert.equal(isRetiredPlatformBaseUrl('https://API.XJJUHE.SITE:8443/v1'), true);
  for (const url of ['https://xjjuhe.site.example.com', 'https://example.com/xjjuhe.site', 'https://soonstudio.ai', 'not-a-url']) assert.equal(isRetiredPlatformBaseUrl(url), false);
  assert.equal(isRetiredApiProvider({ id: 'custom', baseUrl: 'https://example.com', extraParams: { baseUrls: ['https://xjjuhe.site'] } }), true);
  assert.equal(isRetiredApiProvider({ id: 'custom', baseUrl: 'https://example.com', extraParams: { platformBaseUrls: ['https://xjjuhe.site'] } }), true);
  assert.equal(isDecommissionedPlatformBaseUrl('https://xjjuhe.site'), false, 'soft retirement must not trigger credential DELETE cleanup');
});

test('new installations do not seed the retired platform or any of its three provider choices', () => {
  assert.equal(THIRD_PARTY_PLATFORM_SEEDS.some(row => row.baseUrl === 'https://xjjuhe.site'), false);
  for (const id of ['provider_runtime_text_xjjuhe', 'provider_runtime_image_xjjuhe', oldId]) assert.equal(SYSTEM_API_PROVIDER_SEEDS.some(row => row.id === id), false);
});

test('new runtime choices hide retired provider records while an existing receipt can retain a raw lookup', async () => {
  const previous = database.apiProviders;
  try {
    database.apiProviders = [provider(oldId, 'https://xjjuhe.site'), provider('kept', 'https://example.com')];
    const before = JSON.stringify(database.apiProviders), service = apiService();
    assert.deepEqual((await service.listProviders()).map(row => row.id), ['kept']);
    assert.deepEqual((await service.listActiveProvidersByRuntimeKey('video-generation')).map(row => row.id), ['kept']);
    assert.equal((await service.getProviderForExistingTask(oldId)).id, oldId);
    assert.equal(JSON.stringify(database.apiProviders), before, 'listing must not delete or edit provider history');
  } finally { database.apiProviders = previous; }
});

test('retired providers cannot be recreated through base URL aliases or re-enabled by ID', async () => {
  const service = apiService();
  await assert.rejects(() => service.createProvider({ name: 'new', providerType: 'CUSTOM', baseUrl: 'https://xjjuhe.site' }), /已移除/);
  await assert.rejects(() => service.createProvider({ name: 'new', providerType: 'CUSTOM', baseUrl: 'https://example.com', extraParams: { baseUrls: ['https://xjjuhe.site'] } }), /已移除/);
  await assert.rejects(() => service.updateProvider(oldId, { status: 'ACTIVE' }), /已移除/);
});

test('platform and personal settings hide retirement while original brand credentials stay scoped and intact', async () => {
  const previousPlatforms = database.thirdPartyPlatforms, previousSecrets = database.brandThirdPartyPlatformSecrets;
  try {
    database.thirdPartyPlatforms = [platform(oldPlatformId, 'https://xjjuhe.site'), platform('kept-platform', 'https://example.com')];
    database.brandThirdPartyPlatformSecrets = [{ id: 'synthetic-secret', brandId: 'a', platformId: oldPlatformId, apiKey: 'synthetic-only', updatedAt: '2026-01-01T00:00:00Z' }];
    const before = JSON.stringify({ platforms: database.thirdPartyPlatforms, secrets: database.brandThirdPartyPlatformSecrets });
    const service = platformService();
    assert.deepEqual((await service.listPlatforms()).map(row => row.id), ['kept-platform']);
    assert.deepEqual((await service.listUserPlatforms('viewer', 'a')).map(row => row.id), ['kept-platform']);
    assert.equal((await service.getPlatformById(oldPlatformId)).id, oldPlatformId, 'raw platform lookup remains available for an existing receipt');
    const old = await service.resolveBrandRuntimeApiKeys('a', ['https://xjjuhe.site']);
    assert.equal(old.status, 'resolved'); assert.equal(old.resolvedFrom, 'brand'); assert.deepEqual(old.apiKeys, ['synthetic-only']);
    assert.equal((await service.resolveBrandRuntimeApiKeys('b', ['https://xjjuhe.site'])).status, 'brand-api-key-missing');
    assert.equal(JSON.stringify({ platforms: database.thirdPartyPlatforms, secrets: database.brandThirdPartyPlatformSecrets }), before);
  } finally { database.thirdPartyPlatforms = previousPlatforms; database.brandThirdPartyPlatformSecrets = previousSecrets; }
});

test('retired platform edits and secret replacement are rejected without deleting historical credentials', async () => {
  const previousPlatforms = database.thirdPartyPlatforms, previousSecrets = database.brandThirdPartyPlatformSecrets;
  try {
    database.thirdPartyPlatforms = [platform(oldPlatformId, 'https://xjjuhe.site')];
    database.brandThirdPartyPlatformSecrets = [{ id: 'synthetic-secret', brandId: 'a', platformId: oldPlatformId, apiKey: 'synthetic-only', updatedAt: '2026-01-01T00:00:00Z' }];
    const before = JSON.stringify(database.brandThirdPartyPlatformSecrets), service = platformService();
    await assert.rejects(() => service.createPlatform({ name: 'new', providerType: 'CUSTOM', baseUrl: 'https://xjjuhe.site' }), /已移除/);
    await assert.rejects(() => service.updatePlatform(oldPlatformId, { status: 'ACTIVE' }), /已移除/);
    await assert.rejects(() => service.updateBrandPlatformSecret('a', oldPlatformId, { apiKey: 'synthetic-replacement' }), /已移除/);
    assert.equal(JSON.stringify(database.brandThirdPartyPlatformSecrets), before);
  } finally { database.thirdPartyPlatforms = previousPlatforms; database.brandThirdPartyPlatformSecrets = previousSecrets; }
});

test('retired video config is available only to a real existing Task owned by the current brand, with GET-only recovery', async () => {
  const queries = [], rawLookups = [];
  const old = { ...provider(oldId, 'https://xjjuhe.site'), defaultModel: 'historical-video', modelWhitelist: ['historical-video'], extraParams: { backendKey: 'xjjuhe', queryMethod: 'POST', queryPath: '/unsafe/submit', queryBodyMode: 'task_id-json' } };
  const api = apiService();
  api.listActiveProvidersByRuntimeKey = async () => [];
  api.getProviderForExistingTask = async id => { rawLookups.push(id); return old; };
  const service = Object.create(WorksService.prototype);
  service.apiProvidersService = api;
  service.prismaService = { task: { findFirst: async query => { queries.push(query); return query.where.id === 'owned-task' && query.where.brandId === 'a' ? { id: 'owned-task', brandId: 'a' } : null; } } };
  service.resolveBrandAwareApiKeys = async brandId => { assert.equal(brandId, 'a'); return ['synthetic-only']; };
  await assert.rejects(() => service.loadVideoProviderConfig('a', 'xjjuhe'), /配置读取失败/);
  assert.equal(queries.length, 0, 'new generation cannot perform a historical lookup');
  assert.equal(rawLookups.length, 0);
  for (const [brandId, taskId] of [['a', 'invented-task'], ['b', 'owned-task'], [undefined, 'owned-task']]) await assert.rejects(() => service.loadVideoProviderConfig(brandId, 'xjjuhe', taskId), /配置读取失败/);
  assert.equal(rawLookups.length, 0, 'unowned or invented task never reads historical config');
  const config = await service.loadVideoProviderConfig('a', 'xjjuhe', 'owned-task');
  assert.equal(config.providerId, oldId);
  assert.equal(config.queryMethod, 'GET');
  assert.equal(config.queryPath, '/v1/videos/{task_id}');
  assert.equal(config.queryBodyMode, undefined);
  assert.deepEqual(queries.at(-1), { where: { id: 'owned-task', brandId: 'a' } });
  await assert.rejects(() => service.loadVideoProviderConfig('a', 'different-backend', 'owned-task'), /配置读取失败/);
});
