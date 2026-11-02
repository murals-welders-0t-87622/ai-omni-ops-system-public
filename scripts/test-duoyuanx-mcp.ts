import "reflect-metadata";
import assert from "node:assert/strict";
import { AIControlCenterService } from "../apps/server/src/modules/openclaw/openclaw.service";
import { CONNECTION_BRAND_TOOLS } from "../apps/server/src/modules/openclaw/brand-operations.policy";
import { effectiveConnectionTools } from "../apps/server/src/modules/openclaw/connection-production-grant";

async function main() {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("/v1/models/")) return new Response(JSON.stringify({id:"gemini-3.1-pro-preview",max_output_tokens:65536}), {status:200});
    calls++; assert.equal(JSON.parse(String(init?.body)).max_tokens,65536);
    return new Response(JSON.stringify({model: "gemini-3.1-pro-preview", choices: [{message: {content: "模拟回答"}, finish_reason: "stop"}]}), {status: 200});
  };
  try {
    const full = effectiveConnectionTools({tools: [...CONNECTION_BRAND_TOOLS]});
    const actor = {userId: "user-a", brandId: "brand-a", connectionId: "connection-a", allowedMcpTools: full, allowedMcpProductionCapabilities: ["image_generation"]};
    const service: any = Object.create(AIControlCenterService.prototype);
    service.authorizeMcpRequest = async () => actor;
    service.requireAuth = async () => actor;
    service.requireCurrentBrandId = async () => "brand-a";
    service.authService = {assertBrandPermission: async (brandId: string, _scope: string, mode: string) => { assert.equal(brandId, "brand-a"); assert.equal(mode, "edit"); }};
    service.thirdPartyPlatformsService = {resolveBrandRuntimeApiKeys: async (brandId: string) => { assert.equal(brandId, "brand-a"); return {status: "resolved", apiKeys: ["fixture-key"]}; }};
    service.handleCachedToolCall = async (headers: any, name: string, args: any) => service.executeToolCall(headers, name, args);
    const rpc = (method: string, params?: any) => service.handleMcpRpcRequest({}, {id: 1, method, params});
    const list = await rpc("tools/list");
    assert.ok(list.result.tools.some((tool: any) => tool.name === "generate_duoyuanx_text"));
    const ok = await rpc("tools/call", {name: "generate_duoyuanx_text", arguments: {model: "gemini-3.1-pro-preview", prompt: "模拟"}});
    assert.equal(ok.result.isError, false);
    assert.ok(JSON.stringify(ok).includes("模拟回答"));
    assert.ok(!JSON.stringify(ok).includes("fixture-key"));
    assert.equal(calls, 1);
    const foreign = await rpc("tools/call", {name: "generate_duoyuanx_text", arguments: {brandId: "brand-b", model: "x", prompt: "模拟"}});
    assert.equal(foreign.result.isError, true);
    actor.allowedMcpTools = ["get_current_brand_context"];
    const denied = await rpc("tools/call", {name: "generate_duoyuanx_text", arguments: {model: "x", prompt: "模拟"}});
    assert.equal(denied.result.isError, true);
    assert.equal(calls, 1);
    console.log("多元探索文本 MCP 模拟调用、品牌范围和窄授权拒绝检查通过；未访问供应商。");
  } finally { globalThis.fetch = originalFetch; }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
