const assert = require('node:assert/strict');
const { normalizeCommerceOperatingMap: normalize } = require('../packages/shared/dist/commerce-operating-map');
const { buildSeedanceNodes } = require('../integrations/commerce/executor/seedance-input.cjs');
const actions = [{ key: 'a' }], score = { start: '2026-10-27', end: '2026-11-09', goal: { target: '100' } };
const sample = () => ({ diagnosis: '阶段判断', targetBasis: '基线资源推演', attributionRule: '一单一个主渠道', selectedScenario: 'base', scenarios: [{ key: 'base', label: '建议', gmv: '100', orders: '10', averageOrderValue: '10', rationale: '提案' }], branches: [{ id: 'natural', parentId: '', title: '自然', mode: 'channel', baselineGmv: null, targetGmv: '100', evidence: '待核渠道基线', rationale: '先修承接', indicators: [], projection: { visits: '1000', conversionRate: '1', orders: '10', averageOrderValue: '10', gmv: '100' } }], initiatives: [{ id: 'i', branchId: 'natural', actionKey: 'a', title: '主图A/B', metric: '点击与支付', method: '一变量', settings: '同SKU', resources: '原图', owner: '内容', startDate: '2026-10-27', endDate: '2026-10-29', budget: '待批', checkpoint: '复测', executionMode: 'ai_content', productId: '', projectId: '', creativeTab: 'main' }] });
let count = 0;
function check(name, work) { work(); count++; console.log('PASS ' + name); }
check('valid target and channel capacity', () => assert.equal(normalize(sample(), actions, score).branches[0].baselineGmv, null));
for (const [name, mutate] of [
  ['scenario mismatch', x => x.scenarios[0].gmv = '101'],
  ['channel sum mismatch', x => { x.branches[0].targetGmv = '99'; delete x.branches[0].projection; }],
  ['projection mismatch', x => x.branches[0].projection.visits = '900'],
  ['cycle', x => x.branches[0].parentId = 'natural'],
  ['orphan action', x => x.initiatives[0].actionKey = 'other'],
  ['out of period', x => x.initiatives[0].endDate = '2026-11-10'],
  ['external navigation field', x => x.initiatives[0].url = 'https://evil.invalid'],
  ['numeric as number', x => x.scenarios[0].orders = 10],
  ['invalid date', x => x.initiatives[0].endDate = '2026-10-39'],
]) check(name, () => { const x = sample(); mutate(x); assert.throws(() => normalize(x, actions, score)); });
check('support not counted twice', () => { const x = sample(); x.branches.push({ ...x.branches[0], id: 'repeat', mode: 'support', targetGmv: '1000', projection: undefined }); delete x.branches[1].projection; assert.equal(normalize(x, actions, score).branches.length, 2); });
check('child totals checked', () => { const x = sample(); x.branches.push({ ...x.branches[0], id: 'child', parentId: 'natural', targetGmv: '99' }); delete x.branches[1].projection; assert.throws(() => normalize(x, actions, score)); });
const template = [{ nodeId: '7', fieldName: 'image', fieldType: 'IMAGE', fieldValue: 'foreign.png', fieldData: '[]' }, { nodeId: '8', fieldName: 'image', fieldType: 'IMAGE', fieldValue: 'foreign.png', fieldData: '[]' }, { nodeId: '20', fieldName: 'file', fieldType: 'VIDEO', fieldValue: 'foreign.mp4', fieldData: '[]' }, { nodeId: '6', fieldName: 'prompt', fieldType: 'STRING', fieldValue: 'old foreign creative', fieldData: '[]' }, ...[['duration', ['10', '15'], '15'], ['ratio', ['16:9', '9:16'], '16:9'], ['resolution', ['480p', '720p'], '720p']].map(([fieldName, options, value]) => ({ nodeId: '4', fieldName, fieldType: 'LIST', fieldValue: value, fieldData: JSON.stringify([options, {}]) }))];
const video = { prompt: 'new current product creative', duration: 10, ratio: '9:16', resolution: '480p' };
check('video replaces every foreign input', () => { const out = buildSeedanceNodes(template, video, { dataBase64: 'actual-image' }); assert.equal(out.filter(n => n.upload).length, 1); assert.equal(out[1].fieldValue, 'None'); assert.equal(out[2].fieldValue, 'None'); assert(!JSON.stringify(out).includes('foreign')); assert.equal(out.find(n => n.fieldName === 'duration').fieldValue, '10'); });
check('unsupported confirmed parameter rejected', () => assert.throws(() => buildSeedanceNodes(template, { ...video, ratio: '4:3' }, { dataBase64: 'a' })));
check('unknown template field rejected', () => assert.throws(() => buildSeedanceNodes([...template, { fieldName: 'unknown' }], video, { dataBase64: 'a' })));
console.log(JSON.stringify({ checks: count }));
