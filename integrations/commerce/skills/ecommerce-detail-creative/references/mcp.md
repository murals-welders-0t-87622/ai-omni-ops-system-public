# 电商中台读写与生成

先调用当前连接 `tools/list`，读取 `manage_growth_reports.inputSchema.properties.payload.properties.commerce` 的完整schema。以下为兼容1.1.0动作名，未知字段不要猜。当前连接必须是用户目标品牌，不能用宿主默认品牌替代。

工具：`manage_growth_reports`。参数形状：`{action:"commerce_get_workspace",payload:{commerce:{area:"detail"}}}`。HTTP页面调用 `/api/ai-control-center/brands/:brandId/commerce` 及 `/actions`，与MCP复用同一服务。

- `commerce_get_workspace`：产品完整资料、制作项目、当前版本和可引用媒体清单。资料列表不是生成任务。
- `commerce_create_detail_project`：productId、instructions、pageCount（默认10，1—20）、可选title、idempotencyKey。返回稳定项目id及revision=1，冻结产品资料。只在确需新委托时创建。
- `commerce_save_detail_revision`：projectId、expectedRevision、body、idempotencyKey。body必须完整保留 sellingPointReport、sellingPoints、pages、video；每次新revision，原版保留，旧视频确认清空。先读再写，冲突不强盖。
- `commerce_get_detail_history`：projectId，读取不可变版本。
- `commerce_confirm_video`：projectId、expectedRevision、用户confirmationText、idempotencyKey；只记录当前已保存创意/参数的确认，不启动生成。

body示意（具体以实时schema为准）：

```json
{
  "sellingPointReport":"完整报告",
  "sellingPoints":[{"title":"卖点","benefit":"用户利益与场景","evidence":"具体产品字段或附件依据"}],
  "pages":[{"title":"主视觉封面","copy":"逐字文案","prompt":"完整画面提示词","evidence":"事实依据"}],
  "video":{"concept":"","prompt":"","appKey":"seedance20-mini-multi-reference","resolution":"480p","ratio":"9:16","duration":10}
}
```

图片或视频成功后先归档再给对应页/视频增加 `mediaRef:{table:"MediaAsset"或"AIControlCenterCreativeMaterial",recordId:"真实本品牌记录ID"}`。后端核对品牌、实际MIME类型及受控storageKey；不能杜撰记录ID。中台 `mediaItems` 可帮助定位已生成产物；数量较多时使用现有素材检索工具精确查找。页面可预览的地址由服务端生成，不能手填外部临时链接冒充归档。

图片使用当前品牌多元探索 `gpt-image-2`，读取 `create_design_work` 与图像服务实时schema、品牌凭据状态和参考图输入方式，再调用；保持brandId/productId/账号角色/每页目的与任务引用。已有素材应复用，不为“保存”再生成。视频使用 `manage_douyin_video_production` 的runninghub动作读取应用、上传、generate、查询和作品归档，必须采用实时schema，不照抄别的应用字段。

幂等键每个逻辑写入固定一个，重试同一body沿用；改body用新键。所有成功写入随后回读并核对当前品牌、项目、revision和mediaRef。保存成功、真实模型生成、文件可播放、用户认可分别报告。

## 1.1 主图和商品文案

body可选mainImages（最多12，每项同pages的title/copy/prompt/evidence/mediaRef）、listing（title/keywords/description/identityLock/platformRulesEvidence/faq）；FAQ每项question/answer/evidence。主图必须有依据，媒体必须本品牌、真实图片类型和受控副本。旧项目省略新增字段兼容，已有字段更新时完整保留，不能丢掉原产物。

运营方案的growth.experiments[].projectId可关联该制作项目；执行端在报告中记明确revision和实际上线回执，项目保存本身不会发布到商家端。

## 1.3 内容修订

修订任务与mediaStale规则见[按钮执行](button-execution.md)。原图读取按当前版本与所选页定位，不接受任意URL/跨品牌mediaRef。保存body时保留未修改字段；媒体更新与视频确认均对应当前版本。
