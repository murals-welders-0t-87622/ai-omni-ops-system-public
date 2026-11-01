export function detailStageRequest(studio: string, mode: string): string {
  if (mode === "media") return studio === "video" ? "制作商品视频：先核对已保存创意及参数，由用户确认后调用当前应用并回写" : `按当前已保存的${studio === "main" ? "主图" : "详情页"}画面方案逐张生成并归档，保留已完成页面`;
  return studio === "selling" ? "分析用户需求与产品卖点并保存" : studio === "main" ? "规划主图并编写商品文案和提示词" : studio === "detail" ? "编写详情页逐页文案与画面提示词" : "策划商品视频创意与分镜，先不生成视频";
}
export function detailRevisionRequest(studio: string, target: string, indexes: number[], feedback: string, media: boolean): string {
  const scope = studio === "video" ? "视频创意与分镜" : target === "pages" ? `${studio === "main" ? "主图" : "详情页"}第 ${indexes.map(i => i + 1).join("、")} 页` : target === "listing" ? "商品标题、关键词与FAQ" : "产品卖点";
  return `按用户意见修改${scope}的${media ? "图片画面，使用对应旧图作参考" : "文案或创意"}；仅更改所选范围，保留其他内容与历史产物。用户意见：${feedback}`;
}
