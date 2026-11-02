import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";

/** One explicit model, one request, no automatic provider or model fallback. */
export async function generateDuoyuanxText(apiKey: string, model: string, prompt: string, maxTokens: number, fetcher: typeof fetch = fetch) {
  if (!/^[a-zA-Z0-9._:/-]{1,128}$/.test(model)) throw new BadRequestException("模型名称不合法");
  if (!prompt.trim() || prompt.length > 30000) throw new BadRequestException("请输入不超过 30000 字符的文本要求");
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 4096) throw new BadRequestException("输出长度须在 1 至 4096 之间");
  let response: Response;
  try {
    response = await fetcher("https://duoyuanx.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: maxTokens, stream: false }),
      redirect: "error",
      signal: AbortSignal.timeout(120000),
    });
  } catch {
    throw new ServiceUnavailableException("多元探索请求中断或超时；上游是否已处理及计费未知。系统未自动重试，请先核对平台用量。");
  }
  if (!response.ok) throw new ServiceUnavailableException(`多元探索文本调用失败（HTTP ${response.status}）；请核对模型、账号权限及平台状态。`);
  let result: any;
  try { result = await response.json(); } catch { throw new ServiceUnavailableException("多元探索返回的内容无法解析"); }
  const choice = result?.choices?.[0];
  const text = choice?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new ServiceUnavailableException("多元探索未返回可用文本");
  const usage = result.usage && typeof result.usage === "object" ? Object.fromEntries(
    ["prompt_tokens", "completion_tokens", "total_tokens"].filter((key) => typeof result.usage[key] === "number").map((key) => [key, result.usage[key]]),
  ) : null;
  return { text, requestedModel: model, reportedModel: typeof result.model === "string" ? result.model : null, finishReason: typeof choice.finish_reason === "string" ? choice.finish_reason : null, usage };
}
