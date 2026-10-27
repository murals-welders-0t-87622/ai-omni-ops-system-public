export type MediaPreviewKind = "image" | "video" | "audio" | "html" | "text" | "file";
export type MediaPresentationInput = { mimeType?: string; materialType?: string; fileName?: string; fileUrl?: string; videoUrl?: string; url?: string; htmlUrl?: string; textContent?: string; htmlContent?: string; content?: string };
export function isHtmlDocument(value: unknown) { return /<(?:!doctype\s+html|html|head|body|main|section|article|table|div|p|h[1-6])(?:\s|>)/i.test(String(value || "")); }
/** MIME is authoritative; a video's caption or an image's description is not its file format. */
export function mediaPresentation(row: MediaPresentationInput) {
  const mime = String(row.mimeType || "").split(";")[0].trim().toLowerCase(), type = String(row.materialType || "").trim().toLowerCase();
  let name = String(row.fileName || "");
  if (!name) try { const url = new URL(String(row.fileUrl || row.videoUrl || row.htmlUrl || row.url || ""), "http://preview.invalid"); name = url.searchParams.get("fileName") || url.pathname; } catch { /* unknown */ }
  const ext = name.split(/[?#]/)[0].split(".").pop()?.toLowerCase() || "";
  const body = String(row.htmlContent || row.textContent || row.content || "");
  let kind: MediaPreviewKind = "file";
  if (mime.startsWith("image/")) kind = "image";
  else if (mime.startsWith("video/")) kind = "video";
  else if (mime.startsWith("audio/")) kind = "audio";
  else if (mime === "text/html" || mime === "application/xhtml+xml") kind = "html";
  else if (mime.startsWith("text/") || /application\/(json|xml)/.test(mime)) kind = isHtmlDocument(body) ? "html" : "text";
  else if (mime && mime !== "application/octet-stream") kind = "file";
  else if (/^(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(ext)) kind = "image";
  else if (/^(mp4|mov|webm|m4v|avi)$/.test(ext)) kind = "video";
  else if (/^(mp3|wav|m4a|aac|ogg|flac|opus)$/.test(ext)) kind = "audio";
  else if (/^html?$/.test(ext) || isHtmlDocument(body)) kind = "html";
  else if (/^(image|图片)$/.test(type)) kind = "image";
  else if (/^(video|视频)$/.test(type)) kind = "video";
  else if (/^(audio|语音|音频|bgm|music)$/.test(type)) kind = "audio";
  else if (body || /^(text|文字|文本|copy|script)$/.test(type) || /^(txt|md|json|csv|srt|vtt)$/.test(ext)) kind = "text";
  const label = { image: "图片", video: "视频", audio: "音频", html: "HTML文档", text: "纯文字", file: "文件" }[kind];
  return { kind, label, category: ["image", "video", "audio"].includes(kind) ? kind as "image" | "video" | "audio" : "text" as const };
}

export function generatedAssetKey(brandId: string, raw: string) {
  if (!brandId || /[\\/\0]/.test(brandId)) throw new Error("品牌不合法");
  let name = String(raw || "");
  for (let i = 0; i < 3 && /%[0-9a-f]{2}/i.test(name); i++) name = decodeURIComponent(name);
  const prefix = `works/${brandId}/`;
  if (name.startsWith(prefix)) name = name.slice(prefix.length);
  if (!name || name.startsWith("works/") || name.startsWith("/") || /[\\\0]/.test(name) || name.split("/").some(p => !p || p === "." || p === "..")) throw new Error("文件不属于本品牌或路径不合法");
  return prefix + name;
}

/** Only normalize trusted application URLs. No token is added to a media URL. */
export function materialPreviewAddress(raw: string, brandId: string, webOrigin: string, apiOrigin: string, baseUrl?: string) {
  const url = new URL(raw, baseUrl || webOrigin);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("素材地址格式不支持");
  const trusted = [new URL(webOrigin).origin, new URL(apiOrigin, webOrigin).origin].includes(url.origin);
  if (trusted) {
    const match = /^\/api\/works\/brands\/([^/]+)\/assets(?:\/|$)/.exec(url.pathname);
    if (match) {
      if (decodeURIComponent(match[1]) !== brandId) throw new Error("素材不属于当前品牌");
      const rawName = url.searchParams.get("fileName") || url.pathname.slice(match[0].length);
      const key = generatedAssetKey(brandId, rawName);
      if (url.searchParams.has("fileName")) url.searchParams.set("fileName", key.slice(`works/${brandId}/`.length));
    }
    if (url.pathname === "/api/ai-control/assets/storage") {
      const key = url.searchParams.get("storageKey") || "";
      if (!key.startsWith(`works/${brandId}/`) && !key.startsWith(`brands/${brandId}/`) && !key.startsWith(`materials/${brandId}/`)) throw new Error("缓存素材不属于当前品牌");
      if (/\\|\0/.test(key) || key.split("/").some(p => p === "." || p === "..")) throw new Error("缓存路径不合法");
    }
  }
  return { url: url.toString(), trusted };
}
