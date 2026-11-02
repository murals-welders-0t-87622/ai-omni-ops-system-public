# 多元探索文本输出上限

- `generate_duoyuanx_text` 不再默认请求 2048 token，也不再将用户显式设置限制为 4096。显式指定值必须为正安全整数。
- 未指定上限时，先只读请求当前品牌凭据对应的模型元数据；若返回明确的输出上限则采用该值。元数据未提供时，仅对 `gemini-3.1-pro-preview` 使用 Google 文档列示的 65536；平台、渠道或账号可能另有限制。
- 其他模型如果无法取得明确上限，不发送输出长度参数并返回 `provider_default_unknown`；平台默认值未必是该模型最大值。返回数据区分有效请求上限及来源，供调用方判断。
- 单次生成超时由 120 秒扩至 540 秒，超时不自动重试。该次上游是否处理和计费仍是未知；不会自动续写或自动归档。
- 图片大小及视频时长不受本次文本 token 参数控制，仍按各自模型与业务规格执行；多元探索视频执行链尚未完成。
- 依据：[Google Gemini 3.1 Pro 模型文档](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview)、[多元探索文本模型支持矩阵](https://docs.deepwl.cn/duoyuanx/zh/texts/model-matrix)。
