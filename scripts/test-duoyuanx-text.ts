import assert from "node:assert/strict";
import { generateDuoyuanxText } from "../apps/server/src/modules/openclaw/duoyuanx-text";
import { CONNECTION_BRAND_TOOLS } from "../apps/server/src/modules/openclaw/brand-operations.policy";
import { effectiveConnectionTools } from "../apps/server/src/modules/openclaw/connection-production-grant";

async function main() {
  let requests = 0;
  const mock: typeof fetch = async (url, init) => {
    requests++;
    assert.equal(url, "https://duoyuanx.com/v1/chat/completions");
    assert.equal(init?.redirect, "error");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "gemini-3.7-flash");
    assert.equal(body.messages[0].content, "测试内容");
    return new Response(JSON.stringify({ model: "gemini-3.7-flash", choices: [{ message: { content: "测试结果" }, finish_reason: "stop" }] }), { status: 200 });
  };
  const result = await generateDuoyuanxText("test-key", "gemini-3.7-flash", "测试内容", 100, mock);
  assert.equal(result.text, "测试结果");
  assert.equal(result.reportedModel, "gemini-3.7-flash");
  assert.ok(!JSON.stringify(result).includes("test-key"));
  await assert.rejects(() => generateDuoyuanxText("test-key", "../bad?model", "测试内容", 100, mock));
  await assert.rejects(() => generateDuoyuanxText("test-key", "gemini-3.7-flash", "", 100, mock));
  assert.equal(requests, 1);
  let failures = 0;
  await assert.rejects(() => generateDuoyuanxText("test-key", "gemini-3.7-flash", "测试", 100, async () => { failures++; throw new Error("test-key"); }), (error: Error) => !error.message.includes("test-key"));
  assert.equal(failures, 1); // No duplicate paid request after an ambiguous failure.
  const requestBodies: Record<string, unknown>[] = [];
  const withMetadata: typeof fetch = async (url, init) => {
    if (String(url).includes("/v1/models/")) return new Response(JSON.stringify({ id: "other-model", max_output_tokens: 131072 }), { status: 200 });
    requestBodies.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ model: "other-model", choices: [{ message: { content: "完整输出" }, finish_reason: "stop" }] }), { status: 200 });
  };
  const metadataResult = await generateDuoyuanxText("test-key", "other-model", "测试", undefined, withMetadata);
  assert.equal(requestBodies[0].max_tokens, 131072);
  assert.equal(metadataResult.outputLimitSource, "provider_metadata");
  const fallback: typeof fetch = async (url, init) => {
    if (String(url).includes("/v1/models/")) return new Response(JSON.stringify({ id: "model" }), { status: 200 });
    requestBodies.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ choices: [{ message: { content: "输出" }, finish_reason: "stop" }] }), { status: 200 });
  };
  const known = await generateDuoyuanxText("test-key", "gemini-3.1-pro-preview", "测试", undefined, fallback);
  assert.equal(requestBodies[1].max_tokens, 65536);
  assert.equal(known.outputLimitSource, "model_documentation");
  const unknown = await generateDuoyuanxText("test-key", "unknown-model", "测试", undefined, fallback);
  assert.equal(Object.hasOwn(requestBodies[2], "max_tokens"), false);
  assert.equal(unknown.outputLimitSource, "provider_default_unknown");
  const explicit = await generateDuoyuanxText("test-key", "unknown-model", "测试", 32768, fallback);
  assert.equal(requestBodies[3].max_tokens, 32768);
  assert.equal(explicit.outputLimitSource, "explicit");
  assert.ok(effectiveConnectionTools({ tools: [...CONNECTION_BRAND_TOOLS] }).includes("generate_duoyuanx_text"));
  assert.ok(!effectiveConnectionTools({ tools: ["get_current_brand_context"] }).includes("generate_duoyuanx_text"));
  console.log("多元探索文本请求及连接权限隔离测试通过；未调用供应商。");
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
