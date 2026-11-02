import assert from "node:assert/strict";
import { SYSTEM_API_PROVIDER_SEEDS } from "../apps/server/src/common/api-provider-catalog";
import { THIRD_PARTY_PLATFORM_SEEDS } from "../apps/server/src/common/third-party-platform-catalog";

const text = SYSTEM_API_PROVIDER_SEEDS.find((item) => item.id === "provider_runtime_text_duoyuanx_unified");
const image = SYSTEM_API_PROVIDER_SEEDS.find((item) => item.id === "provider_runtime_image_duoyuanx_unified");
const video = SYSTEM_API_PROVIDER_SEEDS.find((item) => item.id === "provider_runtime_video_duoyuanx_unified");
assert.ok(text && image && video);
for (const [provider, models] of [
  [text, ["gemini-3.7-flash", "gemini-3.8-flash", "claude-opus-5-5", "claude-sonnet-5-5"]],
  [image, ["gpt-image-2.5-flare", "gpt-image-2.5-sunburst"]],
  [video, ["grok-1.5-video", "grok-1.5-video-15s"]],
] as const) {
  for (const model of models) assert.equal(provider.modelWhitelist.filter((item) => item === model).length, 1, model);
}
const platform = THIRD_PARTY_PLATFORM_SEEDS.find((item) => item.baseUrl === "https://duoyuanx.com");
assert.ok(platform);
for (const model of ["gemini-3.7-flash", "gemini-3.8-flash", "gpt-image-2.5-flare", "gpt-image-2.5-sunburst", "claude-opus-5-5", "claude-sonnet-5-5", "grok-1.5-video", "grok-1.5-video-15s"]) {
  assert.ok(platform.modelIds.includes(model), model);
}
assert.equal(text.status, "DRAFT");
assert.equal(video.status, "DRAFT");
assert.equal(platform.websiteUrl, "https://duoyuanx.com"); // Provider grouping and credential identity stay stable.
console.log("多元探索模型目录与品牌平台种子检查通过；未调用供应商。");
