"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import MaterialIndexEditor, { MATERIAL_ROLES, MATERIAL_AVAILABILITY, MATERIAL_RECOMMENDATION } from "./MaterialIndexEditor.client";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardPlus,
  Database,
  FileText,
  FolderOpen,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  Video,
} from "lucide-react";
import { archiveControlDestination } from "../../services/workspace-access";
import { requireCurrentBrandId, getStoredAuthSession } from "../../services/auth-session";
import { authenticatedFetch, requestBlobByUrl } from "../../services/http";

function archiveHeaders() { const session=getStoredAuthSession(); return { Authorization: `Bearer ${session?.accessToken || ""}`, "x-brand-id": requireCurrentBrandId() }; }

type ArchiveSource = "creative_material" | "video_work" | "media_asset" | "business_asset" | "workflow_artifact" | "collected_work";

type ArchiveItem = {
  id: string;
  source: ArchiveSource;
  kind: string;
  materialType?: string;
  title: string;
  description?: string;
  textContent?: string;
  brandId: string;
  workspaceScope?: string;
  taskId?: string;
  taskGoal?: string;
  assetUrl?: string;
  storageKey?: string;
  localPath?: string;
  mimeType?: string;
  sourceKind?: string;
  materialTags?: string[];
  tagCandidates?: any[]; legacyTags?: string[]; mediaVerification?: any; collection?: any; index?: any; indexRevision?: number;
  products?: { id: string; name: string }[]; libraryState?: string; availability?: string; recommendation?: string; relations?: any[]; versionState?: any;
  createdAt?: string;
  updatedAt?: string;
  evidence: {
    table: string;
    recordId: string;
  };
  links: {
    task?: string;
    source?: string;
  };
};

type ArchivePayload = {
  ok: boolean;
  readonly: boolean;
  brandId: string;
  total: number;
  products?: { id: string; productName: string }[];
  productCoverage?: any;
  summary: {
    total: number;
    linkedTasks: number;
    bySource: Record<string, number>;
    byKind: Record<string, number>;
  };
  items: ArchiveItem[];
  sources: Array<{ key: ArchiveSource; label: string; table: string }>;
  filters?: {
    applied: {
      materialType: string;
      materialSource: string;
      keyword: string;
    };
    materialTypes: string[];
    materialSources: string[];
  };
  boundary: string;
};

type RegistrationForm = {
  source: "creative_material" | "video_work";
  originKind: "manual_external" | "user_upload" | "user_folder" | "workbuddy_generated" | "third_party_generated";
  workspaceScope: string;
  title: string;
  materialType: string;
  assetUrl: string;
  textContent: string;
  folderPath: string;
  folderMode: "browser_directory" | "";
  folderFileCount: number;
  folderSampleFiles: string[];
  taskId: string;
};

type PreflightPayload = {
  ok: boolean;
  readonly: boolean;
  generated: boolean;
  status: "ready" | "warning" | "blocked";
  ready: boolean;
  checks: Array<{
    key: string;
    label: string;
    status: "pass" | "warning" | "block";
    message: string;
  }>;
  boundary: string;
};

type ArchivePreviewState = {
  type: "IMAGE" | "VIDEO" | "AUDIO" | "TEXT" | "LINK";
  title: string;
  url?: string;
  textContent?: string;
  downloadUrl?: string;
  downloadName?: string;
  errorMessage?: string;
};

const SOURCE_LABELS: Record<ArchiveSource, string> = {
  collected_work: "已采集原作",
  creative_material: "创作素材",
  video_work: "视频作品",
  media_asset: "媒体资产",
  business_asset: "品牌资料",
  workflow_artifact: "任务产物",
};

const SOURCE_ICONS: Record<ArchiveSource, typeof Boxes> = {
  collected_work: Video,
  creative_material: ImageIcon,
  video_work: Video,
  media_asset: Boxes,
  business_asset: Database,
  workflow_artifact: FileText,
};

const MATERIAL_TYPE_OPTIONS = ["视频", "图片", "音频", "文字"];
const MATERIAL_SOURCE_OPTIONS = ["抖音/视频号", "小红书", "公众号", "用户上传"];
const CLIP_FILTER_KEYS = ["sku", "scene", "action", "framing", "surface"] as const;

export default function AssetsArchiveWorkspace({ returnHref }: { returnHref?: "/brand-admin" } = {}) {
  const homeHref = returnHref || archiveControlDestination(getStoredAuthSession());
  const [data, setData] = useState<ArchivePayload | null>(null);
  const [extraFilters, setExtraFilters] = useState<Record<string, string>>({});
  const [clipDraft, setClipDraft] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0), [jump, setJump] = useState("1");
  const [editing, setEditing] = useState<ArchiveItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [materialTypeFilter, setMaterialTypeFilter] = useState("");
  const [materialSourceFilter, setMaterialSourceFilter] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [registering, setRegistering] = useState(false);
  const [preflighting, setPreflighting] = useState(false);
  const [preflight, setPreflight] = useState<PreflightPayload | null>(null);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<File[]>([]);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const requestVersionRef = useRef(0);
  const appliedClipRef = useRef<Record<string, string>>({});
  const [archivePreview, setArchivePreview] = useState<ArchivePreviewState | null>(null);
  const [previewingId, setPreviewingId] = useState("");
  const [openingId, setOpeningId] = useState("");
  const [form, setForm] = useState<RegistrationForm>({
    source: "creative_material",
    originKind: "manual_external",
    workspaceScope: "douyin",
    title: "",
    materialType: "文字",
    assetUrl: "",
    textContent: "",
    folderPath: "",
    folderMode: "",
    folderFileCount: 0,
    folderSampleFiles: [],
    taskId: "",
  });

  const load = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ brandId: requireCurrentBrandId(), limit: "40", offset: String(page * 40), ...extraFilters });
      if (materialTypeFilter) query.set("materialType", materialTypeFilter);
      if (materialSourceFilter) query.set("materialSource", materialSourceFilter);
      if (keywordFilter) query.set("keyword", keywordFilter);
      const res = await authenticatedFetch(`/api/ai-control/assets/archive?${query.toString()}`, { cache: "no-store", headers:archiveHeaders() });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as ArchivePayload;
      if (requestVersion === requestVersionRef.current) setData(payload);
    } catch (err) {
      if (requestVersion === requestVersionRef.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false);
    }
  }, [keywordFilter, materialSourceFilter, materialTypeFilter, extraFilters, page]);
  const resetPage = useCallback(() => { setPage(0); setJump("1"); }, []);
  useEffect(() => () => { requestVersionRef.current++; }, []);
  useEffect(() => {
    if (CLIP_FILTER_KEYS.every(key => (clipDraft[key] || "") === (appliedClipRef.current[key] || ""))) return;
    const timer = window.setTimeout(() => {
      appliedClipRef.current = { ...clipDraft };
      resetPage();
      setExtraFilters(previous => {
        const next = { ...previous, ...clipDraft };
        return Object.keys(clipDraft).every(key => (previous[key] || "") === (next[key] || "")) ? previous : next;
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [clipDraft, resetPage]);

  const registrationPayload = useCallback((current: RegistrationForm, file: File | null, options?: { folderFile?: File; includeUploadMarker?: boolean }) => {
    const activeFile = options?.folderFile ?? file;
    const fileTags = activeFile ? buildMaterialTags(activeFile, current) : [];
    return {
      brandId: requireCurrentBrandId(),
      source: current.source,
      originKind: current.originKind,
      sourceKind: current.originKind === "user_upload" || current.originKind === "user_folder" ? "material_library_upload" : "ai_control_center_upload",
      workspaceScope: current.workspaceScope,
      title: options?.folderFile ? options.folderFile.name : current.title || file?.name || "",
      materialType: options?.folderFile ? inferMaterialTypeFromFile(options.folderFile) : current.materialType,
      materialTags: fileTags,
      assetUrl: current.originKind === "user_upload" ? "" : current.assetUrl,
      textContent: current.textContent,
      folderPath: current.originKind === "user_folder" ? current.folderPath : "",
      folderMode: current.originKind === "user_folder" ? current.folderMode : "",
      folderFileCount: current.originKind === "user_folder" ? current.folderFileCount : 0,
      folderSampleFiles: options?.folderFile ? [options.folderFile.webkitRelativePath || options.folderFile.name] : current.originKind === "user_folder" ? current.folderSampleFiles : [],
      taskId: current.taskId,
      confirmNoGeneration: true,
      upload: options?.includeUploadMarker && activeFile ? {
        fileName: activeFile.name,
        contentType: activeFile.type || "application/octet-stream",
        dataBase64: "__multipart_file_selected__",
      } : undefined,
      idempotencyKey: `${requireCurrentBrandId()}:${current.source}:${current.originKind}:${current.workspaceScope}:${options?.folderFile?.webkitRelativePath || current.title || file?.name}:${current.assetUrl || current.textContent || current.folderPath || file?.name}:${current.taskId}`,
    };
  }, []);

  useEffect(() => {
    setPreflight(null);
  }, [form, selectedFile, selectedFolderFiles]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  const rememberObjectUrl = useCallback((objectUrl: string) => {
    objectUrlsRef.current.push(objectUrl);
    return objectUrl;
  }, []);

  const resolvePreviewAsset = useCallback(async (item: ArchiveItem) => {
    const sourceUrl = item.links.source?.trim();
    if (!sourceUrl) {
      return null;
    }
    if (isExternalArchivePreviewLink(sourceUrl)) {
      return {
        url: sourceUrl,
        fileName: resolveArchiveFileName(item, sourceUrl),
        external: true,
      };
    }
    if (!isProtectedArchiveSource(sourceUrl)) {
      return {
        url: sourceUrl,
        fileName: resolveArchiveFileName(item, sourceUrl),
        external: false,
      };
    }
    const response = await requestBlobByUrl(sourceUrl);
    return {
      url: rememberObjectUrl(URL.createObjectURL(response.blob)),
      fileName: response.fileName || resolveArchiveFileName(item, sourceUrl),
      external: false,
    };
  }, [rememberObjectUrl]);

  const resolvePreviewText = useCallback(async (item: ArchiveItem) => {
    if (item.textContent?.trim()) {
      return item.textContent.trim();
    }
    if (item.description?.trim() && detectArchivePreviewType(item) === "TEXT") {
      return item.description.trim();
    }
    const sourceUrl = item.links.source?.trim();
    if (!sourceUrl) {
      return "";
    }
    if (isProtectedArchiveSource(sourceUrl)) {
      const response = await requestBlobByUrl(sourceUrl);
      return (await response.blob.text()).trim();
    }
    const response = await authenticatedFetch(sourceUrl, { cache: "no-store", headers:archiveHeaders() });
    if (!response.ok) {
      throw new Error(`读取文本失败（HTTP ${response.status}）`);
    }
    return (await response.text()).trim();
  }, []);

  const handlePreviewArchiveItem = useCallback(async (item: ArchiveItem) => {
    const previewType = detectArchivePreviewType(item);
    if (!previewType) {
      return;
    }
    setPreviewingId(`${item.source}:${item.id}`);
    setArchivePreview(null);
    try {
      if (previewType === "TEXT") {
        const textContent = await resolvePreviewText(item);
        setArchivePreview({
          type: "TEXT",
          title: item.title,
          textContent: textContent || "暂无可预览正文",
          downloadUrl: item.links.source,
          downloadName: resolveArchiveFileName(item, item.links.source),
        });
        return;
      }
      if (previewType === "LINK") {
        setArchivePreview({
          type: "LINK",
          title: item.title,
          url: item.links.source,
          textContent: item.description || item.textContent || "",
        });
        return;
      }
      const asset = await resolvePreviewAsset(item);
      if (!asset?.url) {
        throw new Error("当前素材暂无可预览文件");
      }
      if (asset.external) {
        setArchivePreview({
          type: "LINK",
          title: item.title,
          url: asset.url,
          textContent: item.description || item.textContent || "",
        });
        return;
      }
      setArchivePreview({
        type: previewType,
        title: item.title,
        url: asset.url,
        downloadUrl: asset.url,
        downloadName: asset.fileName,
      });
    } catch (error) {
      setArchivePreview({
        type: previewType,
        title: item.title,
        errorMessage: error instanceof Error ? error.message : "预览失败",
      });
    } finally {
      setPreviewingId("");
    }
  }, [resolvePreviewAsset, resolvePreviewText]);

  const handleOpenArchiveItem = useCallback(async (item: ArchiveItem) => {
    const actionKey = `${item.source}:${item.id}`;
    const previewType = detectArchivePreviewType(item);
    let pendingWindow: Window | null = null;
    setOpeningId(actionKey);
    try {
      const sourceUrl = item.links.source?.trim();
      if (!sourceUrl) {
        if (previewType === "TEXT") {
          await handlePreviewArchiveItem(item);
          return;
        }
        throw new Error("当前素材暂无可打开文件");
      }
      if (!isProtectedArchiveSource(sourceUrl)) {
        const opened = window.open(sourceUrl, "_blank", "noopener,noreferrer");
        if (!opened && previewType) {
          await handlePreviewArchiveItem(item);
        }
        return;
      }
      pendingWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!pendingWindow) {
        await handlePreviewArchiveItem(item);
        return;
      }
      writeArchiveLoadingWindow(pendingWindow, item.title);
      const response = await requestBlobByUrl(sourceUrl);
      const objectUrl = rememberObjectUrl(URL.createObjectURL(response.blob));
      pendingWindow.location.replace(objectUrl);
      pendingWindow = null;
    } catch (error) {
      pendingWindow?.close();
      setArchivePreview({
        type: previewType || "TEXT",
        title: item.title,
        errorMessage: error instanceof Error ? error.message : "打开失败",
      });
    } finally {
      setOpeningId("");
    }
  }, [handlePreviewArchiveItem, rememberObjectUrl]);

  const preflightRegistration = useCallback(async () => {
    setPreflighting(true);
    setRegistrationMessage("");
    setRegistrationError("");
    try {
      const res = await authenticatedFetch("/api/ai-control/assets/archive-registration/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...archiveHeaders() },
        body: JSON.stringify(registrationPayload(form, selectedFile, form.originKind === "user_folder" ? { folderFile: selectedFolderFiles[0], includeUploadMarker: true } : { includeUploadMarker: form.originKind === "user_upload" })),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const message = payload?.message ? (Array.isArray(payload.message) ? payload.message.join("；") : payload.message) : `HTTP ${res.status}`;
        throw new Error(message);
      }
      setPreflight(payload as PreflightPayload);
    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : String(err));
    } finally {
      setPreflighting(false);
    }
  }, [form, registrationPayload, selectedFile, selectedFolderFiles]);

  useEffect(() => {
    load();
  }, [load]);

  const registerArchiveItem = useCallback(async () => {
    setRegistering(true);
    setRegistrationMessage("");
    setRegistrationError("");
    try {
      if (form.originKind === "user_folder") {
        const targetFiles = selectedFolderFiles.filter(isReusableMaterialFile);
        if (!targetFiles.length) {
          throw new Error("请选择包含图片或视频的素材文件夹");
        }
        for (const file of targetFiles) {
          const res = await submitArchiveRegistrationUpload(registrationPayload(form, null, { folderFile: file }), file);
          if (!res.ok) {
            const message = await parseRegistrationError(res);
            throw new Error(`${file.name}：${message}`);
          }
        }
        setRegistrationMessage(`已登记 ${targetFiles.length} 个素材`);
      } else if (form.originKind === "user_upload" && selectedFile) {
        const res = await submitArchiveRegistrationUpload(registrationPayload(form, selectedFile), selectedFile);
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const message = await parseRegistrationError(res, payload);
          throw new Error(message);
        }
        setRegistrationMessage(payload?.artifact ? "已登记并关联任务" : "已登记");
      } else {
        const res = await authenticatedFetch("/api/ai-control/assets/archive-registration", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...archiveHeaders() },
          body: JSON.stringify(registrationPayload(form, selectedFile)),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const message = await parseRegistrationError(res, payload);
          throw new Error(message);
        }
        setRegistrationMessage(payload?.artifact ? "已登记并关联任务" : "已登记");
      }
      setForm((current) => ({ ...current, title: "", assetUrl: "", textContent: "", folderPath: "", folderMode: "", folderFileCount: 0, folderSampleFiles: [], taskId: "" }));
      setSelectedFile(null);
      setSelectedFolderFiles([]);
      await load();
    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegistering(false);
    }
  }, [form, load, registrationPayload, selectedFile, selectedFolderFiles]);

  const items = data?.items ?? [];

  const sources = data?.sources ?? [];
  const summary = data?.summary;
  const materialTypes = MATERIAL_TYPE_OPTIONS;
  const materialSources = MATERIAL_SOURCE_OPTIONS;
  const hasArchiveSearch = Boolean(materialTypeFilter || materialSourceFilter || keywordFilter);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Link href={homeHref} aria-label="返回智控中心" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-indigo-50 hover:text-indigo-700">
                <ArrowLeft className="h-3.5 w-3.5" />
                AI 智控中心
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-700">统一素材管理</span>
            </div>
<span className="text-xs text-slate-500">采集、入库、可用分别核验</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                <Boxes className="h-3.5 w-3.5" />
                archive-index
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">统一素材管理</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                查找采集原作、参考图、配音与成片，按产品和片段取用。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={materialTypeFilter}
                onChange={(event) => { resetPage(); setMaterialTypeFilter(event.target.value); }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">全部类型</option>
                {materialTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={materialSourceFilter}
                onChange={(event) => { resetPage(); setMaterialSourceFilter(event.target.value); }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">全部素材来源</option>
                {materialSources.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
                <Search className="ml-3 h-4 w-4 text-slate-400" />
                <input
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") { resetPage(); setKeywordFilter(keywordInput.trim()); }
                  }}
                  placeholder="关键词"
                  className="w-44 rounded-xl px-2 py-2 text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => { resetPage(); setKeywordFilter(keywordInput.trim()); }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                搜索
              </button>
              {hasArchiveSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    resetPage();
                    setMaterialTypeFilter("");
                    setMaterialSourceFilter("");
                    setKeywordInput("");
                    setKeywordFilter("");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm hover:bg-slate-50"
                >
                  清空
                </button>
              ) : null}
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                刷新
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-5 px-6 py-6">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <select aria-label="产品筛选" className="max-w-full rounded-lg border p-2 text-sm" value={extraFilters.productId || ""} onChange={e => { const value = e.target.value; resetPage(); setExtraFilters(f => ({ ...f, productId: value })); }}><option value="">全部产品</option>{(data?.products || []).map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}</select>
            {([["libraryState", "入库状态", { collected: "已采集未入库", in_library: "已入素材库" }], ["availability", "可用性", MATERIAL_AVAILABILITY], ["recommendation", "推荐状态", MATERIAL_RECOMMENDATION], ["role", "素材用途", MATERIAL_ROLES], ["usage", "使用状态", { used: "已有使用记录", not_recorded: "未登记使用" }]] as const).map(([key, label, values]) => <select aria-label={label} key={key} className="rounded-lg border p-2 text-sm" value={extraFilters[key] || ""} onChange={e => { const value = e.target.value; resetPage(); setExtraFilters(f => ({ ...f, [key]: value })); }}><option value="">全部{label}</option>{Object.entries(values).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>)}
            <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => { resetPage(); setExtraFilters({}); appliedClipRef.current = {}; setClipDraft({}); }}>清空条件</button>
          </div>
          <details className="mt-3"><summary className="cursor-pointer text-sm text-slate-600">按镜头找素材</summary><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">{[["sku", "SKU"], ["scene", "场景"], ["action", "动作"], ["framing", "景别"], ["surface", "表面"]].map(([key, label]) => <input aria-label={`${label}筛选`} key={key} className="min-w-0 rounded-lg border p-2 text-sm" placeholder={label} value={clipDraft[key] || ""} onChange={e => { const value = e.target.value; setClipDraft(f => ({ ...f, [key]: value })); }} />)}</div></details>
          {data?.productCoverage && <p className="mt-3 text-xs text-slate-500">已登记场景：{data.productCoverage.indexedScenes.join("、") || "暂无"} · 可剪片段 {data.productCoverage.indexedClips.length} 段。未登记不等于不存在。</p>}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="档案" value={summary?.total ?? 0} />
          <MetricCard label="采集原作" value={summary?.bySource.collected_work ?? 0} />
          <MetricCard label="创作素材" value={summary?.bySource.creative_material ?? 0} />
          <MetricCard label="视频作品" value={summary?.bySource.video_work ?? 0} />
          <MetricCard label="任务产物" value={summary?.bySource.workflow_artifact ?? 0} />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-8">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">档案索引</h2>
                <p className="mt-1 text-xs text-slate-500">品牌：{data?.brandId ?? requireCurrentBrandId()}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                {loading ? "加载中" : hasArchiveSearch ? `${items.length} 条` : `${items.length}/${data?.total ?? 0}`}
              </span>
            </div>
            <div className="grid gap-2 border-b border-slate-100 px-5 py-3 text-xs text-slate-500 md:grid-cols-3">
              <div>类型：{materialTypeFilter || "全部"}</div>
              <div>来源：{materialSourceFilter || "全部"}</div>
              <div>关键词：{keywordFilter || "全部"}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b p-3 text-xs">
              <button className="rounded border px-3 py-2 disabled:opacity-40" disabled={!page || loading} onClick={() => setPage(p => p - 1)}>上一页</button><span>第 {page + 1} / {Math.max(1, Math.ceil((data?.total || 0) / 40))} 页 · 共 {data?.total || 0} 条</span><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={loading || (page + 1) * 40 >= (data?.total || 0)} onClick={() => setPage(p => p + 1)}>下一页</button><input aria-label="素材页码" className="w-16 rounded border p-2" type="number" min={1} value={jump} onChange={e => setJump(e.target.value)} /><button className="rounded border px-3 py-2" onClick={() => setPage(Math.max(0, Math.min(Math.ceil((data?.total || 1) / 40) - 1, (Number(jump) || 1) - 1)))}>跳转</button>
            </div>
            <div className="max-h-[720px] overflow-auto p-3">
              {items.length ? (
                <div className="space-y-2">
                  {items.map((item) => (
                    <ArchiveCard
                      key={`${item.source}:${item.id}`}
                      item={item}
                      previewing={previewingId === `${item.source}:${item.id}`}
                      opening={openingId === `${item.source}:${item.id}`}
                      onPreview={handlePreviewArchiveItem}
                      onOpen={handleOpenArchiveItem}
                      onIndex={setEditing}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState loading={loading} title={hasArchiveSearch ? "无匹配素材" : "暂无档案"} />
              )}
            </div>
          </div>

          <aside className="space-y-5 xl:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardPlus className="h-4 w-4 text-indigo-600" />
                归档登记
              </div>
              <div className="mt-4 grid gap-3">
                <select
                  value={form.source}
                  onChange={(event) => setForm((current) => ({ ...current, source: event.target.value as RegistrationForm["source"] }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="creative_material">创作素材</option>
                  <option value="video_work">视频作品</option>
                </select>
                <select
                  value={form.originKind}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    originKind: event.target.value as RegistrationForm["originKind"],
                    source: event.target.value === "user_upload" || event.target.value === "user_folder" ? "creative_material" : current.source,
                  }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="manual_external">手动登记</option>
                  <option value="user_upload">用户上传</option>
                  <option value="user_folder">用户文件夹</option>
                  <option value="workbuddy_generated">WorkBuddy 生成</option>
                  <option value="third_party_generated">第三方模型生成</option>
                </select>
                <select
                  value={form.workspaceScope}
                  onChange={(event) => setForm((current) => ({ ...current, workspaceScope: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="douyin">抖音/视频号</option>
                  <option value="xiaohongshu">小红书</option>
                  <option value="wechat">公众号</option>
                  <option value="brand_growth">品牌增长</option>
                  <option value="geo">GEO获客</option>
                </select>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="标题"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
                {form.source === "creative_material" ? (
                  <select
                    value={form.materialType}
                    onChange={(event) => setForm((current) => ({ ...current, materialType: event.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  >
                    {MATERIAL_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                ) : null}
                {form.originKind === "user_upload" ? (
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600 hover:bg-slate-100">
                    <Upload className="h-4 w-4 text-indigo-600" />
                    <span className="truncate">{selectedFile ? selectedFile.name : "选择上传文件"}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setSelectedFile(file);
                        if (file) {
                          setForm((current) => ({
                            ...current,
                            source: "creative_material",
                            title: current.title || file.name,
                            materialType: inferMaterialTypeFromFile(file),
                          }));
                        }
                      }}
                    />
                  </label>
                ) : form.originKind === "user_folder" ? (
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      <FolderOpen className="h-4 w-4 text-indigo-600" />
                      选择后按图片/视频逐条建档
                    </div>
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-left text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <FolderOpen className="h-4 w-4 shrink-0 text-indigo-600" />
                        <span className="truncate">{form.folderPath || "选择素材文件夹"}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{form.folderFileCount ? `${form.folderFileCount} 素材` : "点击选择"}</span>
                    </button>
                    <input
                      ref={folderInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      {...{ webkitdirectory: "", directory: "" }}
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        const materialFiles = files.filter(isReusableMaterialFile);
                        const firstPath = files[0]?.webkitRelativePath || files[0]?.name || "";
                        const folderName = firstPath.includes("/") ? firstPath.split("/")[0] : firstPath;
                        setSelectedFolderFiles(materialFiles);
                        setForm((current) => ({
                          ...current,
                          source: "creative_material",
                          title: current.title || folderName || "用户素材文件夹",
                          materialType: "视频",
                          folderPath: folderName || "",
                          folderMode: files.length ? "browser_directory" : "",
                          folderFileCount: materialFiles.length,
                          folderSampleFiles: materialFiles.slice(0, 5).map((file) => file.webkitRelativePath || file.name).filter(Boolean),
                        }));
                        event.currentTarget.value = "";
                      }}
                    />
                    {form.folderSampleFiles.length ? (
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        {form.folderSampleFiles.slice(0, 3).map((file) => (
                          <div key={file} className="truncate">{file}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <input
                    value={form.assetUrl}
                    onChange={(event) => setForm((current) => ({ ...current, assetUrl: event.target.value }))}
                    placeholder={form.source === "video_work" ? "视频地址" : "文件地址"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                )}
                {form.source === "creative_material" ? (
                  <textarea
                    value={form.textContent}
                    onChange={(event) => setForm((current) => ({ ...current, textContent: event.target.value }))}
                    placeholder="文本内容"
                    rows={3}
                    className="resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                ) : null}
                <input
                  value={form.taskId}
                  onChange={(event) => setForm((current) => ({ ...current, taskId: event.target.value }))}
                  placeholder="任务ID（可选）"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
                {preflight ? <PreflightResult data={preflight} /> : null}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={preflightRegistration}
                    disabled={preflighting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {preflighting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    预检
                  </button>
                  <button
                    type="button"
                    onClick={registerArchiveItem}
                    disabled={registering || !canSubmitRegistration(form, selectedFile, selectedFolderFiles)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    登记
                  </button>
                </div>
                {registrationMessage ? <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{registrationMessage}</div> : null}
                {registrationError ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{registrationError}</div> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold">档案表</h2>
              <div className="mt-4 space-y-2">
                {sources.map((source) => {
                  const count = summary?.bySource[source.key] ?? 0;
                  return (
                    <div
                      key={source.key}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700"
                    >
                      <span>{source.label}</span>
                      <span className="font-mono text-xs">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                边界
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">{data?.boundary ?? "只读聚合"}</p>
            </div>
          </aside>
        </section>
      </div>
      {archivePreview ? (
        <div className="media-preview-overlay" role="dialog" aria-modal="true" onClick={() => setArchivePreview(null)}>
          <div className="media-preview-dialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 hover:bg-slate-50"
              onClick={() => setArchivePreview(null)}
            >
              关闭
            </button>
            <div className="mt-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900">{archivePreview.title}</div>
              {archivePreview.errorMessage ? (
                <div className="rounded-2xl bg-rose-50 px-4 py-10 text-sm text-rose-700">{archivePreview.errorMessage}</div>
              ) : archivePreview.type === "AUDIO" ? (
                <audio controls src={archivePreview.url} className="w-full" />
              ) : archivePreview.type === "VIDEO" ? (
                <video controls preload="metadata" className="xhs-material-lightbox-video" src={archivePreview.url} />
              ) : archivePreview.type === "IMAGE" ? (
                <img src={archivePreview.url} alt={archivePreview.title} className="max-h-[72vh] w-full rounded-2xl object-contain bg-slate-100" />
              ) : archivePreview.type === "LINK" ? (
                <div className="space-y-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <div>当前素材是平台分享页或外链地址，站内不直接当作原始视频文件播放。</div>
                  {archivePreview.textContent ? (
                    <pre className="max-h-[48vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-white px-4 py-4 text-xs leading-6 text-slate-700">{archivePreview.textContent}</pre>
                  ) : null}
                </div>
              ) : looksLikeHtmlPreviewText(archivePreview.textContent) ? (
                <iframe
                  title={archivePreview.title}
                  srcDoc={archivePreview.textContent || ""}
                  className="h-[72vh] w-full rounded-2xl border border-slate-200 bg-white"
                />
              ) : (
                <pre className="max-h-[72vh] overflow-auto rounded-2xl bg-slate-950 px-4 py-4 text-xs leading-6 text-slate-100">{archivePreview.textContent || ""}</pre>
              )}
              <div className="flex flex-wrap gap-2">
                {archivePreview.downloadUrl && archivePreview.type !== "LINK" ? (
                  <a
                    href={archivePreview.downloadUrl}
                    download={archivePreview.downloadName || undefined}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    下载
                  </a>
                ) : null}
                {archivePreview.url ? (
                  <a
                    href={archivePreview.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    新窗口打开
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {editing && <MaterialIndexEditor item={editing} products={data?.products || []} onClose={() => setEditing(null)} onSaved={() => void load()} />}
    </main>
  );
}

function ArchiveCard(props: {
  item: ArchiveItem;
  previewing?: boolean;
  opening?: boolean;
  onPreview: (item: ArchiveItem) => void | Promise<void>;
  onOpen: (item: ArchiveItem) => void | Promise<void>;
  onIndex: (item: ArchiveItem) => void;
}) {
  const { item } = props;
  const Icon = SOURCE_ICONS[item.source] ?? Boxes;
  const previewType = detectArchivePreviewType(item);
  const sourceSummary = summarizeArchiveSource(item);
  const businessLabel = detectArchiveBusinessLabel(item);
  const displayTags: string[] = item.index?.confirmedTags || [];
  const primaryLabel = previewType === "TEXT" ? "查看内容" : "打开预览";
  const canOpen = Boolean(item.links.source || item.textContent?.trim() || previewType === "TEXT");
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              <Icon className="h-3.5 w-3.5" />
              {SOURCE_LABELS[item.source]}
            </span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{item.materialType || item.kind}</span>
            {item.sourceKind ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">{sourceKindLabel(item.sourceKind)}</span> : null}
            {item.workspaceScope ? <span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500 ring-1 ring-slate-200">{workspaceScopeLabel(item.workspaceScope)}</span> : null}
            {businessLabel ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">{businessLabel}</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span>{item.libraryState === "collected" ? "已采集 · 未入库" : "已加入素材库"}</span><span>可用性：{MATERIAL_AVAILABILITY[item.availability as keyof typeof MATERIAL_AVAILABILITY] || "待核验"}</span><span>{MATERIAL_RECOMMENDATION[item.recommendation as keyof typeof MATERIAL_RECOMMENDATION] || "待核验"}</span>{item.mediaVerification?.conflict && <span className="text-amber-700">类型冲突</span>}<span>{item.mediaVerification?.decoded ? "已解码核验" : "文件未解码核验"}</span></div>
          {item.collection?.originalWorkId && <p className="mt-2 text-xs text-slate-500">原片ID：{item.collection.originalWorkId}</p>}
          {!!item.products?.length && <p className="mt-2 text-xs">产品：{item.products.map(p => p.name).join("、")}</p>}
          {!!item.relations?.length && <p className="mt-2 text-xs text-slate-500">关联：{item.relations.map(r => `${r.type === "used_in" ? "已用" : r.type === "derived_from" ? "来源" : "关联"} ${r.title || "待核对素材"}`).join("；")}</p>}
          {!!item.versionState?.supersededBy?.length && <p className="mt-2 text-xs text-amber-700">替代版本：{item.versionState.supersededBy.map((v: any) => v.title).join("、")}</p>}
          {!!item.index?.clips?.length && <p className="mt-2 text-xs text-slate-500">{item.index.clips.map((c: any) => `${c.startMs / 1000}–${c.endMs / 1000}秒 ${c.scene} ${c.action} ${c.surface}`).join("；")}</p>}
          <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">{item.title}</h3>
          {sourceSummary ? <p className="mt-2 text-xs font-medium text-slate-600">素材标识：{sourceSummary}</p> : null}
          {item.description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p> : null}
          {displayTags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {displayTags.slice(0, 10).map((tag) => (
                <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="text-right text-[11px] text-slate-400">{formatTime(item.createdAt)}</div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-500 md:grid-cols-3">
        <InfoBlock label="证据表" value={item.evidence.table} />
        <InfoBlock label="任务" value={item.taskId ?? "未绑定"} />
        <InfoBlock label="文件" value={item.storageKey ?? item.localPath ?? item.mimeType ?? "-"} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => props.onIndex(item)} className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs text-indigo-700">{item.libraryState === "collected" ? "查看索引 / 加入素材库" : "管理索引"}</button>
        {item.collection?.workUrl && <a href={item.collection.workUrl} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1.5 text-xs">查看采集原作</a>}
        {item.links.task ? (
          <Link href={item.links.task} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
            查看任务
          </Link>
        ) : null}
        {previewType ? (
          <button
            type="button"
            onClick={() => void props.onPreview(item)}
            disabled={props.previewing}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {props.previewing ? "预览中..." : primaryLabel}
          </button>
        ) : null}
        {canOpen ? (
          <button
            type="button"
            onClick={() => void props.onOpen(item)}
            disabled={props.opening}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {props.opening ? "打开中..." : "打开文件"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 truncate font-mono text-[11px] text-slate-700">{value}</div>
    </div>
  );
}

function PreflightResult({ data }: { data: PreflightPayload }) {
  const statusClass = data.status === "blocked"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : data.status === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return (
    <div className={`rounded-xl border px-3 py-3 text-xs ${statusClass}`}>
      <div className="font-medium">{data.status === "ready" ? "可登记" : data.status === "warning" ? "可登记，有提醒" : "需处理后登记"}</div>
      <div className="mt-2 space-y-1.5">
        {data.checks.map((check) => (
          <div key={check.key} className="flex items-start justify-between gap-3">
            <span className="shrink-0 font-medium">{check.label}</span>
            <span className="text-right">{check.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ loading, title }: { loading?: boolean; title: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
      {loading ? <Loader2 className="mb-2 h-5 w-5 animate-spin" /> : null}
      {loading ? "加载中" : title}
    </div>
  );
}

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function detectArchivePreviewType(item: ArchiveItem): ArchivePreviewState["type"] | null {
  const source = String(item.links.source || "");
  if (isExternalArchivePreviewLink(source)) return "LINK";
  if (item.materialType === "音频") return "AUDIO";
  if (item.materialType === "图片") return "IMAGE";
  if (item.materialType === "视频") return "VIDEO";
  if (item.materialType === "文字" || item.textContent?.trim()) return "TEXT";
  return source ? "LINK" : null;
}

function detectArchiveBusinessLabel(item: ArchiveItem) {
  const candidates = [
    "品牌作品信息及数据",
    "竞品作品信息及数据",
    "对标作品信息及数据",
    "品牌账号信息",
    "竞品账号信息",
    "评论数据",
    "搜索笔记",
    "OCR识别",
    "OCR",
    "ASR",
    "平台导出",
  ];
  const pool = [
    item.title || "",
    item.description || "",
    item.taskGoal || "",
    item.storageKey || "",
    item.localPath || "",
    ...(item.materialTags || []),
  ].join(" ");
  return candidates.find((label) => pool.includes(label)) || "";
}

function looksLikeHtmlPreviewText(value?: string) {
  const normalized = String(value || "").trim();
  return /<(?:!doctype|html|head|body|main|section|article|table|div)\b/i.test(normalized);
}

function summarizeArchiveSource(item: ArchiveItem) {
  const labels = [
    item.materialType || item.kind,
    item.workspaceScope ? workspaceScopeLabel(item.workspaceScope) : "",
    item.sourceKind ? sourceKindLabel(item.sourceKind) : "",
    detectArchiveBusinessLabel(item),
  ].filter(Boolean);
  return Array.from(new Set(labels)).join(" · ");
}

function buildArchiveDisplayTags(item: ArchiveItem) {
  const tags = new Set<string>();
  for (const tag of item.materialTags || []) {
    const normalized = String(tag || "").trim();
    if (normalized) tags.add(normalized);
  }
  if (tags.size > 0) {
    return Array.from(tags);
  }
  const materialType = item.materialType || item.kind;
  if (materialType) tags.add(materialType);
  if (item.sourceKind) tags.add(sourceKindLabel(item.sourceKind));
  if (item.workspaceScope) tags.add(workspaceScopeLabel(item.workspaceScope));
  const businessLabel = detectArchiveBusinessLabel(item);
  if (businessLabel) tags.add(businessLabel);
  return Array.from(tags);
}

function resolveArchiveFileName(item: ArchiveItem, sourceUrl?: string) {
  const candidates = [
    item.storageKey,
    item.localPath,
    sourceUrl,
  ].map((value) => String(value || "").trim()).filter(Boolean);
  for (const candidate of candidates) {
    const normalized = candidate.replace(/[?#].*$/, "");
    const segment = normalized.split("/").filter(Boolean).pop();
    if (segment) {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    }
  }
  return item.title || "archive-item";
}

function isProtectedArchiveSource(sourceUrl?: string) {
  if (!sourceUrl) {
    return false;
  }
  const normalized = sourceUrl.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized.startsWith("/")) {
    return true;
  }
  try {
    const resolved = new URL(sourceUrl, "https://local.invalid");
    return resolved.pathname.startsWith("/api/");
  } catch {
    return normalized.includes("/api/");
  }
}

function isExternalArchivePreviewLink(sourceUrl?: string) {
  const normalized = String(sourceUrl || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return /iesdouyin\.com\/share\/(video|note)\//.test(normalized)
    || /douyin\.com\/video\//.test(normalized)
    || /xiaohongshu\.com\/explore\//.test(normalized)
    || /mp\.weixin\.qq\.com\//.test(normalized);
}

function writeArchiveLoadingWindow(target: Window, title: string) {
  try {
    target.document.title = title || "素材打开中";
    target.document.body.innerHTML = "<div style=\"padding:24px;font:14px/1.6 sans-serif;color:#334155;\">素材加载中...</div>";
  } catch {
    // Ignore cross-window write failures and continue navigation.
  }
}

function canSubmitRegistration(form: RegistrationForm, file: File | null, folderFiles: File[] = []) {
  if (!(form.title.trim() || file?.name)) return false;
  if (form.originKind === "user_upload") return Boolean(file);
  if (form.originKind === "user_folder") return Boolean(form.folderPath.trim() && form.folderMode === "browser_directory" && folderFiles.some(isReusableMaterialFile));
  if (form.source === "video_work") return Boolean(form.assetUrl.trim());
  return Boolean(form.assetUrl.trim() || form.textContent.trim());
}

async function parseRegistrationError(res: Response, knownPayload?: unknown) {
  const payload = knownPayload ?? (await res.clone().json().catch(() => null));
  const message = typeof payload === "object" && payload && "message" in payload
    ? Array.isArray((payload as { message?: unknown }).message)
      ? (payload as { message: unknown[] }).message.join("；")
      : String((payload as { message?: unknown }).message || "")
    : "";
  const fallbackText = message || (await res.clone().text().catch(() => ""));
  if (res.status === 413 || /body exceeded|request entity too large|payload too large|socket hang up/i.test(fallbackText)) {
    return "文件超过当前大文件登记上限，请拆分后重试或改用后台导入队列";
  }
  return fallbackText || `HTTP ${res.status}`;
}

async function submitArchiveRegistrationUpload(payload: Record<string, unknown>, file: File) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || key === "upload") continue;
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  }
  formData.append("fileName", file.name);
  formData.append("mimeType", file.type || "application/octet-stream");
  formData.append("file", file, file.name);
  return authenticatedFetch("/api/ai-control/assets/archive-registration/upload", {
    method: "POST",
    headers: archiveHeaders(),
    body: formData,
  });
}

function isReusableMaterialFile(file: File) {
  return file.type.startsWith("image/") || file.type.startsWith("video/") || /\.(png|jpg|jpeg|gif|webp|bmp|svg|mp4|mov|webm|avi|m4v)$/i.test(file.name);
}

function buildMaterialTags(file: File, form: RegistrationForm) {
  const tags = new Set<string>();
  const materialType = inferMaterialTypeFromFile(file);
  tags.add(form.originKind === "user_folder" || form.originKind === "user_upload" ? "用户上传" : "归档登记");
  tags.add(materialType);
  if (materialType === "视频") tags.add("待转写");
  if (materialType === "图片") tags.add("待识图");
  if (form.folderPath) tags.add(form.folderPath);
  const words = file.name
    .replace(/\.[^.]+$/, "")
    .split(/[\s_\-·,，.。/\\]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 6);
  for (const word of words) tags.add(word);
  return Array.from(tags).slice(0, 10);
}

function inferMaterialTypeFromFile(file: File) {
  if (file.type.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(file.name)) return "图片";
  if (file.type.startsWith("video/") || /\.(mp4|mov|webm|avi|m4v)$/i.test(file.name)) return "视频";
  if (file.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i.test(file.name)) return "音频";
  if (file.type.startsWith("text/")) return "文字";
  return "文字";
}

function sourceKindLabel(value: string) {
  if (value === "material_library_upload") return "用户上传";
  if (value === "ai_control_center_upload") return "AI归档";
  if (value === "platform_export") return "平台导出";
  return value;
}

function workspaceScopeLabel(value: string) {
  if (value === "douyin" || value === "wechat_channel" || value === "video_account") return "抖音/视频号";
  if (value === "xiaohongshu") return "小红书";
  if (value === "wechat") return "公众号";
  return value;
}
