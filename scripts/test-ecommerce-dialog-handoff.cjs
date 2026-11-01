const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../apps/web/src/app/tabs/ecommerce');
function loadTs(name) {
  const file = path.join(root, name);
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2021 } });
  const mod = new Module(file, module); mod.filename = file; mod.paths = Module._nodeModulePaths(path.dirname(file)); mod._compile(result.outputText, file); return mod.exports;
}
const handoff = loadTs('detail-handoff.ts');
assert.match(handoff.detailRevisionRequest('detail','pages',[1,3],'减少文字',true), /第 2、4 页.*图片画面.*减少文字/);
assert.match(handoff.detailRevisionRequest('main','listing',[],'调整标题',false), /商品标题、关键词与FAQ.*调整标题/);
assert.match(handoff.detailStageRequest('main','media'), /主图画面方案/);
assert.match(handoff.detailStageRequest('detail','media'), /详情页画面方案/);
assert.match(handoff.detailStageRequest('video','media'), /用户确认/);
assert.match(handoff.detailStageRequest('video','plan'), /先不生成视频/);
const Studio = loadTs('studio-controls.tsx').default;
const props = {studio:'main',setStudio:()=>{},data:{tasks:[]},project:{id:'test'},busy:false,disabled:false,onPrepare:()=>{}};
const view = renderToStaticMarkup(React.createElement(Studio,props));
assert.match(view,/复制主图和文案委托/); assert.match(view,/复制画面制作委托/); assert.doesNotMatch(view,/本机Codex未连接/);
const active = renderToStaticMarkup(React.createElement(Studio,{...props,data:{tasks:[{id:'old',projectId:'test',state:'RUNNING',title:'old'}]}}));
assert.match(active,/旧制作任务执行中/); assert.match(active,/先核对任务结果/); assert.match(active,/<button disabled=""/);
const workspace = ts.createSourceFile('workspace.tsx', fs.readFileSync(path.join(root,'workspace.client.tsx'),'utf8'), ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let creates=0, oldTasks=0;
function visit(node){if(ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text==='command' && ts.isStringLiteral(node.arguments[0])) {if(node.arguments[0].text==='commerce_create_detail_project') creates++; if(node.arguments[0].text==='commerce_request_detail_task') oldTasks++;} ts.forEachChild(node,visit)}
visit(workspace); assert.equal(creates,1); assert.equal(oldTasks,0);
console.log(JSON.stringify({pass:true,revisionSelectionAndFeedback:true,videoConfirmationHandoff:true,activeLegacyTaskVisible:true,creationRetained:true,pageStartsLegacyTasks:false,scope:'component rendering and source contract'}));
