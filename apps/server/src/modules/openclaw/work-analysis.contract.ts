import { createHash } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import textDictionary from "./data/work-analysis/text.json";
import imageDictionary from "./data/work-analysis/image.json";
import videoDictionary from "./data/work-analysis/video.json";

export const WORK_ANALYSIS_PLATFORMS = ["douyin", "xiaohongshu", "wechat"] as const;
export const WORK_ANALYSIS_FORMS = ["text", "image", "video"] as const;
export type AnalysisPlatform = typeof WORK_ANALYSIS_PLATFORMS[number];
export type AnalysisForm = typeof WORK_ANALYSIS_FORMS[number];
export const WORK_ANALYSIS_DICTIONARIES = { text: textDictionary, image: imageDictionary, video: videoDictionary };
export const workAnalysisHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function analysisPlatform(value: unknown): AnalysisPlatform {
  if (!WORK_ANALYSIS_PLATFORMS.includes(value as AnalysisPlatform)) throw new BadRequestException("请选择抖音/视频号、小红书或公众号，禁止默认回退平台");
  return value as AnalysisPlatform;
}
export function analysisText(value: unknown, label: string, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new BadRequestException(`${label}缺失或超过${max}字符`);
  return value.trim();
}
export function analysisForms(value: unknown): AnalysisForm[] {
  if (!Array.isArray(value) || !value.length || value.length > 3 || new Set(value).size !== value.length || value.some(v => !WORK_ANALYSIS_FORMS.includes(v))) throw new BadRequestException("内容形式须为text/image/video的非空不重复列表");
  return value;
}
export type WorkSnapshot = {
  sourceId: string; platform: AnalysisPlatform; sourceKind: string; title: string; authorName: string;
  originalWorkId: string; workUrl: string; collectedAt: string; publishedAt: string; metricsAt: string;
  metrics: Record<string, number | null>; body: string; paragraphs: { id: string; text: string }[];
  images: { id: string; url: string }[]; videoUrl: string; transcript: string; durationMs: number | null;
  contentHash: string;
};

// This validator checks the contract and source bounds, not the truth of an expert's subjective judgement.
export function validateAnalysisProfiles(value: unknown, forms: AnalysisForm[], snapshot: WorkSnapshot) {
  if (!Array.isArray(value) || value.length !== forms.length) throw new BadRequestException("须提交委托要求的每种形式，缺资料请先标为需补资料");
  const seen = new Set<string>();
  for (const profile of value) {
    if (!profile || typeof profile !== "object") throw new BadRequestException("分析结果格式错误");
    const form = profile.form as AnalysisForm;
    if (!forms.includes(form) || seen.has(form)) throw new BadRequestException("分析形式与委托不符或重复");
    seen.add(form);
    const dictionary = WORK_ANALYSIS_DICTIONARIES[form];
    if (profile.schemaVersion !== `${form}-work-analysis-1.0.0`) throw new BadRequestException("分析schema版本不匹配");
    if (profile.dictionaryVersion !== dictionary.version) throw new BadRequestException("标签字典版本不匹配，请读取本次委托的字典");
    if (profile.sourceSnapshotRef !== snapshot.contentHash) throw new BadRequestException("证据不属于本次来源快照");
    const coverage = profile.inputCoverage;
    if (!coverage || typeof coverage !== "object") throw new BadRequestException("缺少实际阅读范围声明");
    if (dictionary.outputSchema.properties.inputCoverage.required.some(key => typeof coverage[key] !== "boolean")) throw new BadRequestException("须逐项明确实际输入阅读状态");
    if (form === "text" && (!snapshot.body || coverage.bodyComplete !== true)) throw new BadRequestException("文字正文未读完整，请补资料或缩小委托范围");
    if (form === "image" && (!snapshot.images.length || coverage.originalImagesReadable !== true || coverage.pageOrderKnown !== true)) throw new BadRequestException("图片深拆需要实际原图与页序，OCR不能替代");
    if (form === "video" && (!snapshot.videoUrl || coverage.visualReadable !== true || coverage.audioReadable !== true || coverage.alignmentKnown !== true)) throw new BadRequestException("视频深拆需要实际画面、声音与时间对齐，逐字稿不能替代");
    if (!Array.isArray(profile.structure) || !profile.structure.length || !Array.isArray(profile.transferConditions) || !profile.transferConditions.length || !Array.isArray(profile.limitations)) throw new BadRequestException("缺少结构分析、迁移前提或限制说明");
    if (profile.structure.some((part: any) => !part || typeof part !== "object" || [part.unitRef, part.function, part.explanation].some(v => typeof v !== "string" || !v.trim())) || profile.transferConditions.some((v: unknown) => typeof v !== "string" || !v.trim()) || profile.limitations.some((v: unknown) => typeof v !== "string")) throw new BadRequestException("结构单元、迁移前提和限制须为可读的完整说明");
    const dimensions = new Set(dictionary.dimensions.map(d => d.id));
    if (!Array.isArray(profile.annotations) || profile.annotations.length !== dimensions.size) throw new BadRequestException("每个维度须有明确判断状态，不能只提交关键词");
    let observed = 0;
    for (const annotation of profile.annotations) {
      if (!annotation || typeof annotation !== "object" || Array.isArray(annotation)) throw new BadRequestException("标签项格式错误");
      if (!dimensions.delete(annotation.dimensionId)) throw new BadRequestException("标签维度不存在或重复");
      if (!["observed", "not_found", "unknown", "not_applicable"].includes(annotation.status)) throw new BadRequestException("标签状态不正确");
      analysisText(annotation.reason, "判断依据", 6000);
      if (!Array.isArray(annotation.values) || annotation.values.some((v: unknown) => typeof v !== "string") || !Array.isArray(annotation.evidence)) throw new BadRequestException("标签取值或证据格式错误");
      if (annotation.status === "observed" && (!annotation.values.length || annotation.values.some((v: string) => !v.trim() || v.length > 200))) throw new BadRequestException("观察标签须提供明确且简短的内容标签值");
      if (annotation.status !== "observed") continue;
      observed++;
      analysisText(annotation.observation, "具体观察", 6000);
      if (!annotation.evidence.length) throw new BadRequestException("观察标签必须有位置证据");
      for (const evidence of annotation.evidence) {
        if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) throw new BadRequestException("位置证据格式错误");
        if (form === "text") {
          const paragraph = snapshot.paragraphs.find(p => p.id === evidence.paragraphId);
          if (!paragraph || evidence.snapshotRef !== snapshot.contentHash || !Number.isInteger(evidence.startChar) || !Number.isInteger(evidence.endChar) || evidence.startChar < 0 || evidence.endChar <= evidence.startChar || evidence.endChar > paragraph.text.length || paragraph.text.slice(evidence.startChar, evidence.endChar) !== evidence.quote) throw new BadRequestException("文字证据区间或引文与正文快照不符");
        } else if (form === "image") {
          const b = evidence.bbox;
          if (!snapshot.images.some(i => i.id === evidence.imageRef) || !Number.isInteger(evidence.pageIndex) || snapshot.images[evidence.pageIndex]?.id !== evidence.imageRef || !Array.isArray(b) || b.length !== 4 || b.some((n: unknown) => typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1) || b[2] <= 0 || b[3] <= 0 || b[0] + b[2] > 1 || b[1] + b[3] > 1) throw new BadRequestException("图片证据的页序或区域超出来源范围");
          if (typeof evidence.imageSha256 !== "string" || !/^[a-f0-9]{64}$/.test(evidence.imageSha256)) throw new BadRequestException("须提交专家实际读取图片的hash（阅读声明，不是平台独立验真）");
        } else {
          if (evidence.videoRef !== snapshot.sourceId || !Number.isInteger(evidence.startMs) || !Number.isInteger(evidence.endMs) || evidence.startMs < 0 || evidence.endMs <= evidence.startMs || (snapshot.durationMs !== null && evidence.endMs > snapshot.durationMs)) throw new BadRequestException("视频证据时间或作品引用错误");
          if (!Array.isArray(evidence.modalitiesUsed) || !evidence.modalitiesUsed.length || evidence.modalitiesUsed.some((m: string) => !["visual", "audio", "transcript", "subtitle"].includes(m))) throw new BadRequestException("请说明时段证据实际使用的模态");
          if (evidence.modalitiesUsed.includes("visual") && (!Array.isArray(evidence.frameRefs) || !evidence.frameRefs.length)) throw new BadRequestException("视觉判断须提供专家的证据帧引用");
          if (evidence.modalitiesUsed.includes("audio") && !evidence.audioTrackRef) throw new BadRequestException("声音判断须提供音轨引用");
        }
      }
    }
    if (!observed) throw new BadRequestException("没有可观察结论，请标为需补资料而非提交完成");
  }
  return value;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export function analysisReportHtml(title: string, markdown: string) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>${escapeHtml(title)}</title><style>body{max-width:900px;margin:32px auto;padding:20px;font:16px/1.9 sans-serif}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(markdown)}</pre></html>`;
}
