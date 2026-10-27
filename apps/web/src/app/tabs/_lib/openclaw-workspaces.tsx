"use client";

import { useEffect, useRef, useState } from "react";
import { requireCurrentBrandId } from "../../../services/auth-session";
import MaterialPreview from "../../../components/material-preview.client";
import { mediaPresentation } from "@ai-omni/shared/media-presentation";
import { request } from "../../../services/http";
import {
  RefreshCw, Trash2, Eye, Edit3, Save, MessageSquare,
  FileImage, FileVideo, Music2, FileText,
} from "lucide-react";
import { Modal } from "../_data";

const API_PREFIX = "/ai-control-center/brands";
function buildOpenClawWorkspaceHeaders() { return { "x-brand-id": requireCurrentBrandId(), "x-dashboard-client": "nextjs-tabs" }; }

function normalizeScope(raw: string): string {
  if (!raw) return "xiaohongshu";
  if (raw === "douyin" || raw.startsWith("抖音") || raw === "daren") return "douyin";
  if (raw === "wechat" || raw.startsWith("公众") || raw === "weixin") return "wechat";
  return "xiaohongshu";
}

function looksLikeHtml(value: unknown) {
  return /<(?:!doctype|html|head|body|main|section|article|table|div)\b/i.test(String(value || ""));
}

function isLikelyOpenableUrl(value: string) {
  return /^(?:https?:\/\/|\/|blob:|data:)/i.test(String(value || "").trim());
}

function escapePreviewHtml(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type MP = Record<string, {
  title: string;
  subtitle: string;
  pill: string;
  empty: string;
  endpoint: string;
}>;

const META: MP = {
  plan: {
    title: "营销策划方案列表",
    subtitle: "查看 OpenClaw 上传的营销策划方案。",
    pill: "OpenClaw 上传 · HTML 查看",
    empty: "当前还没有营销策划方案，等待 OpenClaw 上传首条 HTML 方案。",
    endpoint: "marketing-plans",
  },
  material: {
    title: "创作素材列表",
    subtitle: "创作素材由 OpenClaw 调用站内第三方能力后统一保存到这里。",
    pill: "仅 OpenClaw 可创建",
    empty: "当前还没有创作素材。请由 OpenClaw 生成并保存素材后再来此查看。",
    endpoint: "creative-materials",
  },
  daily: {
    title: "每日计划列表",
    subtitle: "每条计划支持只读查看，打开后不可编辑。",
    pill: "仅 OpenClaw 可创建",
    empty: "当前还没有每日计划。请由 OpenClaw Agent 创建后再来此查看。",
    endpoint: "daily-plans",
  },
  weekly: {
    title: "每周复盘列表",
    subtitle: "点击查看后可直接修改标题、日期与正文内容。",
    pill: "仅 OpenClaw 可创建",
    empty: "当前还没有每周复盘。请由 OpenClaw Agent 创建后再来此查看。",
    endpoint: "lobster-diaries",
  },
  optim: {
    title: "策略优化记录列表",
    subtitle: "OpenClaw 每周复盘后可在这里生成策略优化记录。",
    pill: "OpenClaw 创建 · 人机共维",
    empty: "当前还没有策略优化记录。请由 OpenClaw 在每周复盘后生成，或等待团队后续维护。",
    endpoint: "strategy-optimizations",
  },
  works: {
    title: "视频作品列表",
    subtitle: "这里存放 OpenClaw 最终整合生成的成片与素材。",
    pill: "仅 OpenClaw 可创建",
    empty: "当前还没有视频作品。请由 OpenClaw 生成最终成片后再来此查看。",
    endpoint: "video-works",
  },
  geoVisibility: {
    title: "GEO 可见度诊断报告",
    subtitle: "查看门店 GEO 可见度诊断与覆盖报告。",
    pill: "OpenClaw 上传 · 覆盖分析",
    empty: "当前还没有可见度诊断报告，请由 GEO 专家上传后再来此查看。",
    endpoint: "geo-visibility-reports",
  },
  geoKeywords: {
    title: "关键词挖掘（XLSX / HTML）",
    subtitle: "GEO SEO 关键词挖掘清单与结果文档。",
    pill: "GEO 关键词 · 结果导出",
    empty: "当前还没有关键词挖掘文档，请由专家上传结果后再来此查看。",
    endpoint: "geo-contents?contentType=keyword_research",
  },
  geoSite: {
    title: "网站诊断（DOCX / HTML）",
    subtitle: "品牌官网 / 门店站的 SEO / 体验诊断报告。",
    pill: "网站诊断 · HTML 查看",
    empty: "当前还没有网站诊断报告，待专家上传后查看。",
    endpoint: "geo-contents?contentType=site_diagnosis",
  },
  geoKnowledge: {
    title: "知识库搭建（MD / HTML）",
    subtitle: "品牌知识库与本地问答知识库文档清单。",
    pill: "知识库 · 文档索引",
    empty: "当前还没有知识库文档，待专家搭建后上传。",
    endpoint: "geo-contents?contentType=knowledge_base_setup",
  },
  geoPlan: {
    title: "GEO 优化方案（DOCX / HTML）",
    subtitle: "门店 GEO 整体优化方案。",
    pill: "GEO 方案 · HTML 预览",
    empty: "当前还没有 GEO 优化方案，待专家上传首条方案。",
    endpoint: "geo-contents?contentType=geo_optimization_plan",
  },
  geoSelfMedia: {
    title: "自媒体内容（DOCX 列表）",
    subtitle: "门店自媒体（公众号/抖音/小红书）内容文档。",
    pill: "自媒体文档 · 一键转发",
    empty: "当前还没有自媒体内容，待专家批量上传 DOCX。",
    endpoint: "geo-contents?contentType=self_media_content",
  },
  geoThirdMedia: {
    title: "第三方媒体（DOCX 列表）",
    subtitle: "第三方媒体投放计划与执行结果文档。",
    pill: "三方媒体 · 投放记录",
    empty: "当前还没有第三方媒体记录，请执行投放后上传。",
    endpoint: "geo-contents?contentType=third_party_media",
  },
  geoBrand: {
    title: "品牌网站（DOCX 列表）",
    subtitle: "品牌官网 / 门店站的维护与改动记录。",
    pill: "品牌站 · 文档索引",
    empty: "当前还没有品牌网站文档，待专家上传。",
    endpoint: "geo-contents?contentType=brand_website_content",
  },
  omniComment: {
    title: "评论获客名单",
    subtitle: "小红书 / 抖音评论区挖掘的意向客户。",
    pill: "双平台过滤 · 评论获客",
    empty: "当前还没有评论获客，请由专家筛选后写入名单。",
    endpoint: "comment-leads",
  },
  omniPlatform: {
    title: "平台获客名单",
    subtitle: "全平台获客的企业 / 机构意向名单。",
    pill: "平台获客 · 统一维护",
    empty: "当前还没有平台获客名单，待生成后查看。",
    endpoint: "platform-leads",
  },
  trafficTencent: {
    title: "腾讯广告线索名单",
    subtitle: "腾讯广告投放后的留资名单。",
    pill: "腾讯投流 · 线索跟进",
    empty: "当前还没有腾讯广告线索，待投放后拉取。",
    endpoint: "tencent-ad-leads",
  },
  darenMatching: {
    title: "达人匹配候选池",
    subtitle: "筛选出的达人候选，可批量加入跟踪清单。",
    pill: "达人匹配 · 批量操作",
    empty: "当前还没有达人候选，待匹配后加载。",
    endpoint: "creator-cooperations/matching",
  },
  darenTracking: {
    title: "达人跟踪建档列表",
    subtitle: "已建档的跟踪达人，可下钻查看作品。",
    pill: "达人跟踪 · 作品下钻",
    empty: "当前还没有跟踪达人，请先从匹配池批量加入。",
    endpoint: "creator-cooperations/tracking",
  },
};

type AnyRow = import("@ai-omni/shared/media-presentation").MediaPresentationInput & { id: string; [k: string]: any };

export function OpenClawWorkspace({
  subTabKey,
  platformTab,
  toast,
}: {
  subTabKey: "plan" | "material" | "daily" | "weekly" | "optim" | "works" | string;
  platformTab: string;
  toast: (msg: string, tone?: "ok" | "err") => void;
}) {
  const meta = META[subTabKey as keyof MP];
  if (!meta) return null;

  const multiPlatformKeys = [
    "geoVisibility", "geoKeywords", "geoSite", "geoKnowledge", "geoPlan", "geoSelfMedia", "geoThirdMedia", "geoBrand",
    "omniComment", "omniPlatform",
    "trafficTencent",
    "darenMatching", "darenTracking",
  ];
  const scope = multiPlatformKeys.includes(subTabKey) ? "all" : normalizeScope(platformTab);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mediaRow, setMediaRow] = useState<AnyRow | null>(null);
  const [viewRow, setViewRow] = useState<AnyRow | null>(null);
  const [editRow, setEditRow] = useState<AnyRow | null>(null);
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const htmlObjectUrlRef = useRef<string | null>(null);

  function revokeHtmlObjectUrl() {
    if (htmlObjectUrlRef.current) {
      URL.revokeObjectURL(htmlObjectUrlRef.current);
      htmlObjectUrlRef.current = null;
    }
  }

  function closeHtmlPreview() {
    revokeHtmlObjectUrl();
    setHtmlUrl(null);
  }

  function openHtmlPreview(row: AnyRow) {
    revokeHtmlObjectUrl();
    const inlineHtml = [row.htmlContent, row.textContent, row.content]
      .find((value) => typeof value === "string" && looksLikeHtml(value))
      ?.trim();
    if (inlineHtml) {
      const objectUrl = URL.createObjectURL(new Blob([inlineHtml], { type: "text/html;charset=utf-8" }));
      htmlObjectUrlRef.current = objectUrl;
      setHtmlUrl(objectUrl);
      return;
    }
    const nextUrl = String(row.htmlUrl || row.url || row.fileUrl || "").trim();
    if (nextUrl && isLikelyOpenableUrl(nextUrl)) {
      setHtmlUrl(nextUrl);
      return;
    }
    const plainText = String(row.textContent || row.content || "").trim();
    if (plainText) {
      const fallbackHtml = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapePreviewHtml(row.title || row.fileName || "内容预览")}</title><style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:24px;}main{max-width:900px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:24px;box-shadow:0 12px 30px rgba(15,23,42,.08);}pre{margin:0;white-space:pre-wrap;word-break:break-word;line-height:1.8;font:14px/1.8 inherit;}</style></head><body><main><pre>${escapePreviewHtml(plainText)}</pre></main></body></html>`;
      const objectUrl = URL.createObjectURL(new Blob([fallbackHtml], { type: "text/html;charset=utf-8" }));
      htmlObjectUrlRef.current = objectUrl;
      setHtmlUrl(objectUrl);
      return;
    }
    setViewRow(row);
  }

  function getRecordPreviewKind(row: AnyRow): "image" | "video" | "audio" | "text" | "file" {
    const mimeType = String(row.mimeType || "").toLowerCase();
    const materialType = String(row.materialType || "").toLowerCase();
    const fileUrl = String(row.fileUrl || row.videoUrl || row.coverImageUrl || row.coverUrl || row.url || row.htmlUrl || "").toLowerCase();
    if (mimeType.startsWith("image/") || /image|图片/.test(materialType) || /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(fileUrl)) {
      return "image";
    }
    if (mimeType.startsWith("video/") || /video|视频/.test(materialType) || /\.(mp4|mov|webm|m4v|avi)$/.test(fileUrl)) {
      return "video";
    }
    if (mimeType.startsWith("audio/") || /audio|音乐|音频/.test(materialType) || /\.(mp3|wav|m4a|aac|ogg|flac)$/.test(fileUrl)) {
      return "audio";
    }
    if (row.textContent || row.content || mimeType.includes("text/") || /text|文本|script|copy/.test(materialType)) {
      return "text";
    }
    return "file";
  }

  function openStructuredPreview(row: AnyRow) {
    if (subTabKey === "material" || subTabKey === "works") { setMediaRow(row); return; }
    const previewUrl = String(row.fileUrl || row.videoUrl || row.coverImageUrl || row.coverUrl || row.url || row.htmlUrl || "").trim();
    const htmlLike = looksLikeHtml(row.htmlContent) || looksLikeHtml(row.textContent) || looksLikeHtml(row.content);
    const htmlLikeUrl = /(?:\.html?(?:$|[?#])|content-type=text\/html)/i.test(previewUrl) || String(row.mimeType || "").toLowerCase().includes("text/html");
    if (subTabKey === "daily" && (String(row.htmlContent || "").trim() || htmlLike || htmlLikeUrl)) {
      openHtmlPreview(row);
      return;
    }
    if ((subTabKey === "material" || subTabKey === "works") && (htmlLike || htmlLikeUrl) && !String(row.videoUrl || "").trim()) {
      openHtmlPreview(row);
      return;
    }
    setViewRow(row);
  }

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const base = `${API_PREFIX}/${encodeURIComponent(requireCurrentBrandId())}/${meta.endpoint}`;
      const hasQuery = base.includes("?");
      const sep = hasQuery ? "&" : "?";
      const suffix = subTabKey === "omniComment"
        ? `workspaceScope=${scope}&platformFilter=all&limit=50`
        : `workspaceScope=${scope}&limit=50`;
      const data = await request<any>(`${base}${sep}${suffix}`, {
        headers: buildOpenClawWorkspaceHeaders(),
      });
      const nextRows = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.records)
          ? data.records
          : (Array.isArray(data) ? data : []);
      setRows(nextRows);
      setTotal(typeof data?.total === "number" ? data.total : nextRows.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : "列表加载失败";
      setRows([]);
      setTotal(0);
      setLoadError(message);
      toast(message, "err");
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    if (!confirm("确定要删除这条记录吗？")) return;
    const base = `${API_PREFIX}/${encodeURIComponent(requireCurrentBrandId())}/${meta.endpoint}`;
    const url = base.includes("?")
      ? `${API_PREFIX}/${encodeURIComponent(requireCurrentBrandId())}/${meta.endpoint.split("?")[0]}/${id}?workspaceScope=${scope}&${meta.endpoint.split("?")[1]}`
      : `${API_PREFIX}/${encodeURIComponent(requireCurrentBrandId())}/${meta.endpoint}/${id}?workspaceScope=${scope}`;
    try {
      await request(url, {
        method: "DELETE",
        headers: buildOpenClawWorkspaceHeaders(),
      });
      toast("已删除", "ok");
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "删除失败", "err");
    }
  }

  async function saveEdit() {
    if (!editRow) return;
    const payload: any = { ...editRow, workspaceScope: scope };
    if (subTabKey === "weekly") {
      payload.diaryDate = editRow.diaryDate ?? editRow.planDate ?? new Date().toISOString().slice(0, 10);
      payload.title = editRow.title ?? "";
      payload.content = editRow.content ?? "";
    }
    if (subTabKey === "optim") {
      payload.title = editRow.title ?? "";
      payload.content = editRow.content ?? "";
    }
    try {
      await request(`${API_PREFIX}/${encodeURIComponent(requireCurrentBrandId())}/${meta.endpoint}/${editRow.id}?workspaceScope=${scope}`, {
        method: "PUT",
        headers: buildOpenClawWorkspaceHeaders(),
        body: JSON.stringify(payload),
      });
      toast("已保存", "ok");
      setEditRow(null);
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "保存失败", "err");
    }
  }

  useEffect(() => { load(); }, [subTabKey, scope]);
  useEffect(() => () => {
    if (htmlObjectUrlRef.current) {
      URL.revokeObjectURL(htmlObjectUrlRef.current);
      htmlObjectUrlRef.current = null;
    }
  }, []);

  const isDocLike = /geo(Visibility|Keywords|Site|Knowledge|Plan|SelfMedia|ThirdMedia|Brand)/.test(subTabKey);
  const isPlanLike = subTabKey === "plan";

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900">{meta.title}</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">{meta.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11.5px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            {meta.pill}
          </span>
          <button
            onClick={load}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> 刷新列表
          </button>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-semibold ring-1 ${rows.length > 0 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-500 ring-slate-200"}`}>
            共 {total || rows.length || 0} 条
          </span>
        </div>
      </div>

      <div className="px-5 py-4">
        {loadError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-8 text-center text-[12.5px] text-rose-700">
            {loadError}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-[12.5px] text-slate-500">
            {meta.empty}
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="min-w-full text-[12px]">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  {subTabKey === "plan" && <><th className="text-left px-3 py-2">标题</th><th className="text-left px-3 py-2">内容</th><th className="text-left px-3 py-2">创建时间</th><th className="text-left px-3 py-2">留言</th><th className="text-right px-3 py-2">操作</th></>}
                  {subTabKey === "material" && <><th className="text-left px-3 py-2">文件名</th><th className="text-left px-3 py-2">类型/标签</th><th className="text-left px-3 py-2">预览</th><th className="text-left px-3 py-2">创建时间</th><th className="text-right px-3 py-2">操作</th></>}
                  {subTabKey === "daily" && <><th className="text-left px-3 py-2">日期</th><th className="text-left px-3 py-2">标题</th><th className="text-left px-3 py-2">内容</th><th className="text-left px-3 py-2">创建时间</th><th className="text-right px-3 py-2">操作</th></>}
                  {subTabKey === "weekly" && <><th className="text-left px-3 py-2">日期</th><th className="text-left px-3 py-2">标题</th><th className="text-left px-3 py-2">摘要</th><th className="text-left px-3 py-2">创建时间</th><th className="text-right px-3 py-2">操作</th></>}
                  {subTabKey === "optim" && <><th className="text-left px-3 py-2">标题</th><th className="text-left px-3 py-2">内容摘要</th><th className="text-left px-3 py-2">生成时间</th><th className="text-left px-3 py-2">创建时间</th><th className="text-right px-3 py-2">操作</th></>}
                  {subTabKey === "works" && <><th className="text-left px-3 py-2">作品标题</th><th className="text-left px-3 py-2">描述</th><th className="text-left px-3 py-2">封面/视频</th><th className="text-left px-3 py-2">生成时间</th><th className="text-right px-3 py-2">操作</th></>}
                  {isDocLike && <><th className="text-left px-3 py-2">文档标题</th><th className="text-left px-3 py-2">存储地址 / 格式</th><th className="text-left px-3 py-2">预览</th><th className="text-left px-3 py-2">生成时间</th><th className="text-right px-3 py-2">操作</th></>}
                  {subTabKey === "omniComment" && <><th className="text-left px-3 py-2">用户名</th><th className="text-left px-3 py-2">评论内容</th><th className="text-left px-3 py-2">入选理由</th><th className="text-left px-3 py-2">主页 / 平台</th><th className="text-left px-3 py-2">入选时间</th><th className="text-right px-3 py-2">操作</th></>}
                  {subTabKey === "omniPlatform" && <><th className="text-left px-3 py-2">名称</th><th className="text-left px-3 py-2">业务</th><th className="text-left px-3 py-2">入选理由</th><th className="text-left px-3 py-2">联系方式</th><th className="text-left px-3 py-2">地址</th><th className="text-left px-3 py-2">时间</th><th className="text-right px-3 py-2">操作</th></>}
                  {subTabKey === "trafficTencent" && <><th className="text-left px-3 py-2">线索ID</th><th className="text-left px-3 py-2">昵称</th><th className="text-left px-3 py-2">手机号</th><th className="text-left px-3 py-2">意向产品</th><th className="text-left px-3 py-2">留资时间</th><th className="text-left px-3 py-2">来源计划</th><th className="text-left px-3 py-2">跟进状态</th><th className="text-right px-3 py-2">操作</th></>}
                  {subTabKey === "darenMatching" && <><th className="text-left px-3 py-2">达人ID</th><th className="text-left px-3 py-2">昵称 / 平台</th><th className="text-left px-3 py-2">粉丝数</th><th className="text-left px-3 py-2">行业 / 垂类</th><th className="text-left px-3 py-2">预估报价</th><th className="text-right px-3 py-2">操作</th></>}
                  {subTabKey === "darenTracking" && <><th className="text-left px-3 py-2">跟踪ID</th><th className="text-left px-3 py-2">达人昵称</th><th className="text-left px-3 py-2">平台</th><th className="text-left px-3 py-2">建档时间</th><th className="text-left px-3 py-2">作品总数</th><th className="text-right px-3 py-2">操作</th></>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    {subTabKey === "plan" && (
                      <>
                        <td className="px-3 py-2 font-medium">{r.title ?? r.name ?? "-"}</td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => openHtmlPreview(r)} className="text-sky-600 font-semibold hover:underline inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> 查看 HTML</button>
                        </td>
                        <td className="px-3 py-2 text-slate-500">{r.createdAt ?? r.updated_at ?? "-"}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => setViewRow(r)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"><MessageSquare className="h-3.5 w-3.5" /> {r.comments?.length ?? 0}</button>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => del(r.id)} className="text-rose-600 hover:text-rose-700 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </>
                    )}
                    {subTabKey === "material" && (
                      <>
                        <td className="px-3 py-2 font-medium">{r.fileName ?? r.name ?? r.title ?? "-"}</td>
                        <td className="px-3 py-2">{mediaPresentation(r).label}</td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => openStructuredPreview(r)} className="text-sky-600 font-semibold hover:underline inline-flex items-center gap-1">
                            {mediaPresentation(r).kind === "image" ? <FileImage className="h-4 w-4 text-rose-500" />
                              : mediaPresentation(r).kind === "video" ? <FileVideo className="h-4 w-4 text-sky-500" />
                              : mediaPresentation(r).kind === "audio" ? <Music2 className="h-4 w-4 text-emerald-500" />
                              : <FileText className="h-4 w-4 text-slate-500" />}
                            <span>预览</span>
                          </button>
                        </td>
                        <td className="px-3 py-2 text-slate-500">{r.createdAt ?? "-"}</td>
                        <td className="px-3 py-2 text-right"><button onClick={() => del(r.id)} className="text-rose-600 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button></td>
                      </>
                    )}
                    {subTabKey === "daily" && (
                      <>
                        <td className="px-3 py-2">{r.planDate ?? r.date ?? "-"}</td>
                        <td className="px-3 py-2 font-medium">{r.title ?? "-"}</td>
                        <td className="px-3 py-2 max-w-[280px] truncate">{r.content ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-500">{r.createdAt ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => openStructuredPreview(r)} className="text-sky-600 mr-2 inline-flex items-center gap-0.5"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={() => del(r.id)} className="text-rose-600 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </>
                    )}
                    {subTabKey === "weekly" && (
                      <>
                        <td className="px-3 py-2">{r.diaryDate ?? r.date ?? "-"}</td>
                        <td className="px-3 py-2 font-medium">{r.title ?? "-"}</td>
                        <td className="px-3 py-2 max-w-[320px] truncate">{(r.content ?? "").slice(0, 80)}{(r.content ?? "").length > 80 ? "..." : ""}</td>
                        <td className="px-3 py-2 text-slate-500">{r.createdAt ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => setEditRow({ ...r })} className="text-sky-600 mr-2 inline-flex items-center gap-0.5"><Edit3 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => del(r.id)} className="text-rose-600 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </>
                    )}
                    {subTabKey === "optim" && (
                      <>
                        <td className="px-3 py-2 font-medium">{r.title ?? "-"}</td>
                        <td className="px-3 py-2 max-w-[320px] truncate">{(r.content ?? "").slice(0, 80)}{(r.content ?? "").length > 80 ? "..." : ""}</td>
                        <td className="px-3 py-2 text-slate-500">{r.generatedAt ?? r.createdAt ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-500">{r.createdAt ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => setEditRow({ ...r })} className="text-sky-600 mr-2 inline-flex items-center gap-0.5"><Edit3 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => del(r.id)} className="text-rose-600 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </>
                    )}
                    {subTabKey === "works" && (
                      <>
                        <td className="px-3 py-2 font-medium">{r.title ?? r.name ?? "-"}</td>
                        <td className="px-3 py-2 max-w-[220px] truncate">{r.description ?? r.script ?? "-"}</td>
                        <td className="px-3 py-2">
                          {r.coverImageUrl || r.coverUrl ? <img className="h-10 w-16 object-cover rounded" src={r.coverImageUrl ?? r.coverUrl} alt="" /> : r.videoUrl ? <FileVideo className="h-5 w-5 text-sky-500" /> : "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{r.generatedAt ?? r.createdAt ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => openStructuredPreview(r)} className="text-sky-600 mr-2 inline-flex items-center gap-0.5"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={() => del(r.id)} className="text-rose-600 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </>
                    )}
                    {isDocLike && (
                      <>
                        <td className="px-3 py-2 font-medium">{r.title ?? r.name ?? r.fileName ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-[220px] truncate">{r.storagePath ?? r.format ?? r.contentType ?? r.docType ?? r.url ?? "-"}</td>
                        <td className="px-3 py-2">
                          {r.htmlContent || r.htmlUrl || r.url || r.content ? (
                            <button type="button" onClick={() => openHtmlPreview(r)} className="text-sky-600 font-semibold hover:underline inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> 查看 HTML</button>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{r.generatedAt ?? r.createdAt ?? r.updatedAt ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => del(r.id)} className="text-rose-600 hover:text-rose-700 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </>
                    )}
                    {subTabKey === "omniComment" && (
                      <>
                        <td className="px-3 py-2 font-medium">{r.userName ?? r.username ?? r.nickname ?? "-"}</td>
                        <td className="px-3 py-2 max-w-[280px] truncate">{r.commentContent ?? r.content ?? r.comment ?? "-"}</td>
                        <td className="px-3 py-2">{r.reason ?? r.selectedReason ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.homepage ?? r.profileUrl ?? "-"} · {r.platform ?? r.sourcePlatform ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{r.selectedAt ?? r.time ?? r.createdAt ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => del(r.id)} className="text-rose-600 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </>
                    )}
                    {subTabKey === "omniPlatform" && (
                      <>
                        <td className="px-3 py-2 font-medium">{r.name ?? r.companyName ?? "-"}</td>
                        <td className="px-3 py-2">{r.business ?? r.lineOfBusiness ?? "-"}</td>
                        <td className="px-3 py-2 max-w-[260px] truncate">{r.reason ?? r.selectedReason ?? "-"}</td>
                        <td className="px-3 py-2">{r.contact ?? r.phone ?? r.contactInfo ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-[220px] truncate">{r.address ?? r.location ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-500">{r.time ?? r.createdAt ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => del(r.id)} className="text-rose-600 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </>
                    )}
                    {subTabKey === "trafficTencent" && (
                      <>
                        <td className="px-3 py-2 font-mono text-[11px]">{r.leadId ?? r.lead_id ?? r.id ?? "-"}</td>
                        <td className="px-3 py-2 font-medium">{r.nickname ?? r.name ?? "-"}</td>
                        <td className="px-3 py-2">{r.phone ?? r.mobile ?? "-"}</td>
                        <td className="px-3 py-2">{r.intentionProduct ?? r.product ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-500">{r.leadTime ?? r.createdAt ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-600">{r.sourcePlan ?? r.campaign ?? "-"}</td>
                        <td className="px-3 py-2">{r.followStatus ?? r.status ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => del(r.id)} className="text-rose-600 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </>
                    )}
                    {subTabKey === "darenMatching" && (
                      <>
                        <td className="px-3 py-2 font-mono text-[11px]">{r.creatorId ?? r.darenId ?? r.id}</td>
                        <td className="px-3 py-2 font-medium">{r.nickname ?? r.name ?? "-"} · {r.platform ?? "-"}</td>
                        <td className="px-3 py-2">{r.fans ?? r.followerCount ?? r.fansCount ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-600">{r.industry ?? r.category ?? r.vertical ?? "-"}</td>
                        <td className="px-3 py-2">{r.quotePrice ?? r.price ?? r.budget ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => setViewRow(r)} className="text-sky-600 mr-2 inline-flex items-center gap-0.5 text-[11.5px]">批量加入跟踪</button>
                          <button onClick={() => del(r.id)} className="text-rose-600 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </>
                    )}
                    {subTabKey === "darenTracking" && (
                      <>
                        <td className="px-3 py-2 font-mono text-[11px]">{r.trackingId ?? r.id}</td>
                        <td className="px-3 py-2 font-medium">{r.creatorNickname ?? r.nickname ?? r.name ?? "-"}</td>
                        <td className="px-3 py-2">{r.platform ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-500">{r.createdAt ?? r.createdTime ?? "-"}</td>
                        <td className="px-3 py-2">{r.worksTotal ?? r.workCount ?? r.totalWorks ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => setViewRow(r)} className="text-sky-600 mr-2 inline-flex items-center gap-0.5 text-[11.5px]">查看作品</button>
                          <button onClick={() => del(r.id)} className="text-rose-600 inline-flex items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mediaRow && <div role="dialog" aria-modal="true" aria-label="素材预览" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setMediaRow(null)}>
        <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><h4 className="font-semibold">素材预览</h4><button aria-label="关闭素材预览" className="rounded-full border px-3 py-1" onClick={() => setMediaRow(null)}>×</button></div>
          <MaterialPreview item={mediaRow} />
        </div>
      </div>}

      <Modal
        open={Boolean(viewRow)}
        onClose={() => setViewRow(null)}
        title={subTabKey === "plan" ? "方案详情与留言" : "详情查看"}
      >
        {viewRow && (
          <div className="space-y-3 text-[13px] text-slate-700 max-h-[60vh] overflow-auto pr-1">
            {subTabKey === "works" && (
              <>
                {String(viewRow.videoUrl || "").trim() ? (
                  <video controls preload="metadata" className="w-full rounded-xl border border-slate-200 bg-black" src={viewRow.videoUrl} />
                ) : null}
                {!String(viewRow.videoUrl || "").trim() && String(viewRow.coverImageUrl || viewRow.coverUrl || "").trim() ? (
                  <img src={viewRow.coverImageUrl || viewRow.coverUrl} alt={viewRow.title || "作品封面"} className="w-full rounded-xl border border-slate-200 bg-slate-50" />
                ) : null}
                {String(viewRow.scriptContent || viewRow.description || "").trim() ? (
                  <pre className="rounded-xl border border-slate-200 bg-slate-50 p-3 whitespace-pre-wrap break-words font-inherit">{viewRow.scriptContent || viewRow.description}</pre>
                ) : null}
              </>
            )}
            {subTabKey === "daily" && String(viewRow.content || "").trim() ? (
              <pre className="rounded-xl border border-slate-200 bg-slate-50 p-3 whitespace-pre-wrap break-words font-inherit">{viewRow.content}</pre>
            ) : null}
            {Object.entries(viewRow).filter(([k]) => !["id"].includes(k)).map(([k, v]) => (
              <div key={k} className="border-b border-slate-100 pb-2">
                <div className="font-semibold text-slate-800">{k}</div>
                <div className="whitespace-pre-wrap break-words">{typeof v === "string" ? v : JSON.stringify(v)}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={Boolean(editRow)} onClose={() => setEditRow(null)} title="编辑">
        {editRow && (
          <div className="space-y-3 text-[13px]">
            {(subTabKey === "weekly" || subTabKey === "optim") && (
              <>
                {subTabKey === "weekly" && (
                  <label className="block">
                    <div className="mb-1 text-slate-700 font-semibold">日期</div>
                    <input className="w-full rounded-md border border-slate-200 px-3 py-2" defaultValue={editRow.diaryDate ?? editRow.date ?? ""} onChange={(e) => setEditRow({ ...editRow, diaryDate: e.target.value })} />
                  </label>
                )}
                <label className="block">
                  <div className="mb-1 text-slate-700 font-semibold">标题</div>
                  <input className="w-full rounded-md border border-slate-200 px-3 py-2" defaultValue={editRow.title ?? ""} onChange={(e) => setEditRow({ ...editRow, title: e.target.value })} />
                </label>
                <label className="block">
                  <div className="mb-1 text-slate-700 font-semibold">内容</div>
                  <textarea rows={6} className="w-full rounded-md border border-slate-200 px-3 py-2" defaultValue={editRow.content ?? ""} onChange={(e) => setEditRow({ ...editRow, content: e.target.value })} />
                </label>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditRow(null)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-slate-700">取消</button>
              <button onClick={saveEdit} className="rounded-md bg-sky-600 hover:bg-sky-700 px-4 py-2 text-white inline-flex items-center gap-1"><Save className="h-4 w-4" /> 保存</button>
            </div>
          </div>
        )}
      </Modal>

      {htmlUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeHtmlPreview} />
          <div className="relative z-10 w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-[15px] font-semibold text-slate-900">HTML 方案预览</h4>
              <button type="button" onClick={closeHtmlPreview} className="h-8 w-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">×</button>
            </div>
            <iframe src={htmlUrl} title="方案预览" className="w-full h-[65vh] rounded border border-slate-200 bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
