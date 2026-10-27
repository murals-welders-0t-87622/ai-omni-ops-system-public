import { BadRequestException } from "@nestjs/common";

export type MaterialQuery = { brandId?: string; limit?: string; offset?: string; materialType?: string; materialSource?: string; keyword?: string; productId?: string; sku?: string; libraryState?: string; availability?: string; recommendation?: string; role?: string; scene?: string; action?: string; framing?: string; surface?: string; usage?: string };
export const MATERIAL_QUERY_FIELDS = ["offset", "productId", "sku", "libraryState", "availability", "recommendation", "role", "scene", "action", "framing", "surface", "usage"] as const;
export type MaterialRef = { table: string; recordId: string };
export type MaterialIndex = ReturnType<typeof validateMaterialIndex> & { probe?: { materialType: string; mimeType: string; sha256: string; checkedAt: string; evidenceLevel: string; durationMs?: number }; importedId?: string };
export function mediaType(mime = "", kind = "", path = "", hasText = false) {
  const byMime = /^image\//i.test(mime) ? "图片" : /^video\//i.test(mime) ? "视频" : /^audio\//i.test(mime) ? "音频" : /^(text\/|application\/(json|xml))/i.test(mime) ? "文字" : "";
  const byKind = /^(image|图片)$/i.test(kind) ? "图片" : /^(video|视频)$/i.test(kind) ? "视频" : /^(audio|音频|语音)$/i.test(kind) ? "音频" : /^(text|html|markdown|文字|文案)$/i.test(kind) ? "文字" : "";
  const ext = path.split(/[?#]/)[0].split(".").pop()?.toLowerCase() || "";
  const byPath = /^(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(ext) ? "图片" : /^(mp4|mov|m4v|webm|avi|m3u8)$/.test(ext) ? "视频" : /^(mp3|wav|m4a|aac|ogg|flac|opus)$/.test(ext) ? "音频" : /^(txt|md|html?|json|csv|xml|ya?ml)$/.test(ext) ? "文字" : "";
  const type = byMime || byKind || byPath || (hasText ? "文字" : "素材");
  return { materialType: type, basis: byMime ? "declared_mime" : byKind ? "declared_kind" : byPath ? "extension_unverified" : "unverified", decoded: false, conflict: new Set([byMime, byKind, byPath].filter(Boolean)).size > 1 };
}
export function cleanCandidate(value: unknown) {
  const t = String(value || "").replace(/^#+/, "").trim();
  if (t.length < 2 || t.length > 18 || /[<>={};&\n\r]/.test(t) || /^(?:前|第)?\d+(?:条|个|页|秒)?$/.test(t) || /^(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(t) || /^(?:https?|rgba?|hsl|font|padding|margin|color|background|border|width|height|px|rem|div|span|class|style)\b/i.test(t)) return "";
  return t;
}
export function tagCandidates(title = "", description = "", body = "") {
  const text = [title, description, body].join("\n").replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ");
  const tags = new Map<string, { value: string; source: string; confidence: number; status: string }>();
  // Only explicit hashtags are suggested. Splitting HTML/prose into arbitrary fragments was noisy.
  for (const m of text.matchAll(/#([^#\s,，。.!！?？;；:：/\\|]+)/gu)) { const value = cleanCandidate(m[1]); if (value) tags.set(value, { value, source: "source_hashtag", confidence: 0.6, status: "candidate" }); }
  return [...tags.values()].slice(0, 20);
}
const object = (v: any) => v && typeof v === "object" && !Array.isArray(v);
function text(v: any, max = 1000) { if (v == null) return ""; if (typeof v !== "string" || v.length > max) throw new BadRequestException("索引文字格式或长度不正确"); return v.trim(); }
function list(v: any, max = 30) { if (v == null) return [] as string[]; if (!Array.isArray(v) || v.length > max) throw new BadRequestException("索引列表格式错误"); return [...new Set(v.map(x => text(x, 120)).filter(Boolean))]; }
function choice(v: any, choices: string[], fallback: string) { if (v == null || v === "") return fallback; if (!choices.includes(v)) throw new BadRequestException("索引状态不正确"); return String(v); }
export function materialRef(v: any): MaterialRef { if (!object(v) || !text(v.table, 80) || !text(v.recordId, 160)) throw new BadRequestException("缺少素材引用"); return { table: v.table, recordId: v.recordId }; }
function rights(v: any) {
  if (v != null && !object(v)) throw new BadRequestException("素材核验格式不正确");
  const result = Object.fromEntries(["watermark", "subtitles", "sound", "sameSku", "commercial"].map(k => [k, { status: choice(v?.[k]?.status, ["unknown", "confirmed", "blocked"], "unknown"), evidence: text(v?.[k]?.evidence, 2000) }]));
  for (const r of Object.values(result)) if (r.status !== "unknown" && !r.evidence) throw new BadRequestException("确认或不通过时需填写核验证据/适用范围");
  return result;
}
export function validateMaterialIndex(v: any) {
  if (!object(v)) throw new BadRequestException("索引格式错误");
  const allowed = ["productIds", "sku", "confirmedTags", "availability", "recommendation", "role", "note", "clips", "relations", "rights", "versionGroup", "versionNumber", "supersedes", "declaredType", "typeEvidence"];
  if (Object.keys(v).some(k => !allowed.includes(k))) throw new BadRequestException("存在不支持的索引字段");
  const availability = choice(v.availability, ["unverified", "usable", "unavailable"], "unverified"), recommendation = choice(v.recommendation, ["unverified", "recommended", "not_recommended"], "unverified"), note = text(v.note, 4000);
  if ((availability !== "unverified" || recommendation !== "unverified") && !note) throw new BadRequestException("可用性或推荐决定需填写原因/证据");
  if (v.clips != null && (!Array.isArray(v.clips) || v.clips.length > 100)) throw new BadRequestException("片段最多100个");
  const clips = (v.clips || []).map((c: any, i: number) => {
    if (!object(c) || !Number.isSafeInteger(c.startMs) || !Number.isSafeInteger(c.endMs) || c.startMs < 0 || c.endMs <= c.startMs || c.endMs > 86400000) throw new BadRequestException("片段起止时间不正确");
    return { id: text(c.id || `clip-${i + 1}`, 80), startMs: c.startMs, endMs: c.endMs, scene: text(c.scene, 120), action: text(c.action, 120), framing: text(c.framing, 120), surface: text(c.surface, 120), note: text(c.note, 2000), rights: rights(c.rights) };
  });
  if (new Set(clips.map((c: any) => c.id)).size !== clips.length) throw new BadRequestException("片段标识重复");
  if (v.relations != null && (!Array.isArray(v.relations) || v.relations.length > 100)) throw new BadRequestException("关联最多100项");
  const relations = (v.relations || []).map((r: any) => ({ ...materialRef(r), type: choice(r.type, ["derived_from", "used_in", "script", "finished"], "derived_from"), clipId: text(r.clipId, 80), evidence: text(r.evidence, 2000) }));
  if (relations.some((r: any) => !r.evidence || (r.clipId && !clips.some((c: any) => c.id === r.clipId)))) throw new BadRequestException("关联需有证据，片段引用须存在");
  const declaredType = choice(v.declaredType, ["", "视频", "图片", "音频", "文字"], ""), typeEvidence = text(v.typeEvidence, 2000);
  if (declaredType && !typeEvidence) throw new BadRequestException("修正类型需要证据");
  const versionNumber = v.versionNumber == null || v.versionNumber === "" ? null : Number(v.versionNumber);
  if (versionNumber != null && (!Number.isSafeInteger(versionNumber) || versionNumber < 1)) throw new BadRequestException("版本号需为正整数");
  return { productIds: list(v.productIds), sku: text(v.sku, 120), confirmedTags: list(v.confirmedTags, 100), availability, recommendation, role: choice(v.role, ["unclassified", "original", "reference", "voice", "script", "finished", "plan"], "unclassified"), note, clips, relations, rights: rights(v.rights), versionGroup: text(v.versionGroup, 160), versionNumber, supersedes: v.supersedes ? materialRef(v.supersedes) : null, declaredType, typeEvidence };
}
