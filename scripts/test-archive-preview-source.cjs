const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('apps/web/src/app/ai-control/archive-preview-source.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, URL };
vm.runInNewContext(js, context);
const normalize = context.exports.archivePreviewSource;
const file = '/api/works/brands/brand-a/assets?fileName=a%20b.mp4';
assert.equal(normalize('http://127.0.0.1:23011' + file, 'http://127.0.0.1:23001'), file);
assert.equal(normalize('http://localhost:13011' + file, 'http://localhost:13001'), file);
assert.equal(normalize('/api/ai-control/assets/storage?storageKey=a', 'http://127.0.0.1:23001'), '/api/ai-control/assets/storage?storageKey=a');
for (const url of [
  'https://attacker.example/api/works/brands/brand-a/assets?fileName=x',
  'http://127.0.0.1:23011/api/auth/profile',
  'http://127.0.0.1:9999' + file,
  'http://user@127.0.0.1:23011' + file,
]) assert.equal(normalize(url, 'http://127.0.0.1:23001'), url);
assert.equal(normalize('http://127.0.0.1:23011' + file, 'https://example.com'), 'http://127.0.0.1:23011' + file);
const taskLink = context.exports.isArchiveTaskNavigation;
assert.equal(taskLink('/ai-control/task-governance?taskId=123', 'http://127.0.0.1:23001'), true);
assert.equal(taskLink('/personal-center/tasks/123', 'http://127.0.0.1:23001'), true);
assert.equal(taskLink('https://attacker.example/ai-control/task-governance', 'http://127.0.0.1:23001'), false);
assert.equal(taskLink(file, 'http://127.0.0.1:23001'), false);
console.log('PASS: media origin isolation and task link classification');
