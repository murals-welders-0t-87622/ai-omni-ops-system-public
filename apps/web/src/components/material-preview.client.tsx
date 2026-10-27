"use client";
import { useEffect, useState } from "react";
import { mediaPresentation, materialPreviewAddress } from "@ai-omni/shared/media-presentation";
import { API_BASE_URL, requestBlobByUrl } from "../services/http";
import { requireCurrentBrandId } from "../services/auth-session";

type Row = { id?: string; title?: string; description?: string; storageKey?: string; fileName?: string; fileUrl?: string; videoUrl?: string; url?: string; htmlUrl?: string; mimeType?: string; materialType?: string; textContent?: string; htmlContent?: string; content?: string };
type Preview = { kind: string; url?: string; text?: string; name?: string; warnings: number };

export default function MaterialPreview({ item }: { item: Row }) {
  const brandId = requireCurrentBrandId(), presentation = mediaPresentation(item);
  const [preview, setPreview] = useState<Preview | null>(null), [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; const allocated: string[] = [], fetched = new Map<string, Promise<{ url: string; text: string; name: string }>>();
    setPreview(null); setError("");
    const allocate = (blob: Blob) => { const url = URL.createObjectURL(blob); if (!active) URL.revokeObjectURL(url); else allocated.push(url); return url; };
    const address = (url: string, base?: string) => materialPreviewAddress(url, brandId, window.location.origin, API_BASE_URL, base);
    const asset = (raw: string, base?: string) => {
      const resolved = address(raw, base);
      if (!resolved.trusted) return Promise.resolve({ url: resolved.url, text: "", name: "" });
      if (!fetched.has(resolved.url)) fetched.set(resolved.url, requestBlobByUrl(resolved.url).then(async result => {
        if (!active) throw new Error("预览已关闭");
        return { url: allocate(result.blob), text: /text\/|application\/(json|xml)/i.test(result.contentType) ? await result.blob.text() : "", name: result.fileName };
      }));
      return fetched.get(resolved.url)!;
    };
    const load = async () => {
      let primary = String(item.fileUrl || item.videoUrl || item.htmlUrl || item.url || "").trim();
      if (item.storageKey) primary = `/api/ai-control/assets/storage?storageKey=${encodeURIComponent(item.storageKey)}`;
      const body = String(item.htmlContent || item.textContent || item.content || "");
      const name = item.fileName || item.title || "素材";
      if (presentation.kind === "html") {
        let html = body, base = primary ? address(primary).url : window.location.origin;
        if (!html && primary && !address(primary).trusted) { if (active) setPreview({ kind: "html", url: address(primary).url, name, warnings: 0 }); return; }
        if (!html && primary) { const r = await asset(primary); html = r.text; if (!html) throw new Error("文档未返回可读取的 HTML 正文"); }
        const doc = new DOMParser().parseFromString(html, "text/html");
        doc.querySelectorAll("base,script,iframe,object,embed,meta[http-equiv]").forEach(el => el.remove());
        // Static document preview: same-origin permits Blob media, while sandbox disables all document scripts.
        const resources: { el: Element; attr: string }[] = [];
        doc.querySelectorAll("img[src],video[src],audio[src],source[src],track[src]").forEach(el => resources.push({ el, attr: "src" }));
        doc.querySelectorAll("video[poster]").forEach(el => resources.push({ el, attr: "poster" }));
        doc.querySelectorAll("a[href]").forEach(el => resources.push({ el, attr: "href" }));
        let warnings = 0;
        for (const { el, attr } of resources) {
          if (!active) return;
          const raw = el.getAttribute(attr) || ""; if (!raw || raw.startsWith("#") || raw.startsWith("data:")) continue;
          try {
            const resolved = address(raw, base);
            if (!resolved.trusted) { el.setAttribute(attr, resolved.url); if (attr === "href") { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noreferrer"); } continue; }
            const result = await asset(raw, base); el.setAttribute(attr, result.url);
            if (attr === "href") { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noreferrer"); }
            if (el.tagName === "IMG") el.removeAttribute("srcset");
          } catch {
            warnings++;
            if (attr === "poster") el.removeAttribute(attr);
            else { const note = doc.createElement("p"); note.textContent = "这项内嵌素材暂不可读取，请核对文件是否仍然有效。"; (el.tagName === "SOURCE" && el.parentElement && ["VIDEO", "AUDIO"].includes(el.parentElement.tagName) ? el.parentElement : el).replaceWith(note); }
          }
        }
        const style = doc.createElement("style"); style.textContent = "html{overflow-wrap:anywhere}img,video{max-width:100%;height:auto}audio{max-width:100%}"; doc.head.appendChild(style);
        if (active) setPreview({ kind: "html", url: allocate(new Blob(["<!doctype html>" + doc.documentElement.outerHTML], { type: "text/html;charset=utf-8" })), name, warnings });
        return;
      }
      if (presentation.kind === "text") {
        const text = body || (primary ? (await asset(primary)).text : "");
        if (active) setPreview({ kind: "text", text: text || "暂无文本内容", name, warnings: 0 }); return;
      }
      if (!primary) throw new Error("当前记录未关联可读取的素材文件");
      const result = await asset(primary);
      if (active) setPreview({ kind: presentation.kind, url: result.url, name: item.fileName || result.name || name, warnings: 0 });
    };
    load().catch(() => { if (active) setError("素材暂时无法读取。请确认登录有效、文件存在，或点击重试。"); });
    return () => { active = false; allocated.forEach(url => URL.revokeObjectURL(url)); };
  }, [item, brandId, attempt, presentation.kind]);
  return <section aria-label="素材内容预览" className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700">{presentation.label}</span><span className="min-w-0 break-words text-sm font-medium">{item.title || item.fileName || "素材预览"}</span></div>
    {item.description && <p className="whitespace-pre-wrap break-words text-sm text-slate-500">{item.description}</p>}
    {error ? <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}<button onClick={() => setAttempt(n => n + 1)} className="ml-3 underline">重试</button></div> : !preview ? <p role="status" className="p-5 text-center text-sm text-slate-500">正在读取素材…</p> : <>
      {preview.warnings > 0 && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">有 {preview.warnings} 项内嵌素材暂不可读取，文档正文仍可查看。</p>}
      {preview.kind === "video" ? <video aria-label="素材视频" controls preload="metadata" className="max-h-[65vh] w-full rounded-xl bg-black" src={preview.url} onError={() => setError("视频未能解码，请重试或下载原文件检查格式。")} /> :
        preview.kind === "audio" ? <audio aria-label="素材音频" controls preload="metadata" className="w-full" src={preview.url} onError={() => setError("音频未能解码，请重试或下载原文件检查格式。")} /> :
        preview.kind === "image" ? <img alt={item.title || "素材图片"} className="max-h-[65vh] max-w-full rounded-xl object-contain" src={preview.url} onError={() => setError("图片未能解码，请重试或下载原文件检查格式。")} /> :
        preview.kind === "html" ? <iframe title="HTML文档预览" sandbox="allow-same-origin allow-downloads allow-popups" className="h-[65vh] w-full rounded-xl border border-slate-200" src={preview.url} /> :
        preview.kind === "text" ? <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm">{preview.text}</pre> : <p className="p-4 text-sm text-slate-500">此格式可下载后查看。</p>}
    </>}
    {preview?.url && preview.kind !== "html" && <a href={preview.url} download={preview.name} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm text-indigo-700">下载 / 打开文件</a>}
  </section>;
}
