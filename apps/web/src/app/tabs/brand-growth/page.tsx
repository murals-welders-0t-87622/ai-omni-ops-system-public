"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, BookMarked, Lightbulb, Package, FileBarChart, Save, Plus, Trash2, RefreshCw, PlayCircle, DollarSign, Tag, Image, FileText, Eye, MessageSquare } from "lucide-react";
import { Toast, withToast } from "../_data/dashboard-data-provider";
import { getRuntimeMode } from "../../../lib/runtime-mode";
import { getMe } from "../../../services/auth";
import { getStoredAuthSession, getStoredCurrentBrandId, setStoredAuthSession, setStoredCurrentBrandContext } from "../../../services/auth-session";
import { AIControlCenterCommentThread } from "../../(dashboard)/brand-growth/openclaw-comment-thread";
import {
  BRAND_SURVEY_SECTIONS,
  createDefaultBrandSurveyAnswers,
  normalizeBrandSurveyAnswers,
  type BrandSurveyAnswer,
} from "../../../services/brand-growth";
import { getAIControlCenterCommentWorkspace } from "../../../services/openclaw";

type TabKey =
  | "brand-library"
  | "ip-library"
  | "product-library"
  | "public-domain-info"
  | "private-domain-info"
  | "resources-constraints"
  | "target-info"
  | "growth-report";

const TABS: Array<{ key: TabKey; title: string; icon: typeof BookMarked; desc: string }> = [
  { key: "brand-library", title: "品牌资料库", icon: BookMarked, desc: "行业、门店规模、品牌介绍、企业介绍" },
  { key: "ip-library", title: "IP 资料库", icon: Lightbulb, desc: "IP 人设、金句、吉祥物、视觉资产、语音" },
  { key: "product-library", title: "产品资料库", icon: Package, desc: "产品型号、卖点、SKU 矩阵、竞品对比、包装图" },
  { key: "public-domain-info", title: "公域经营信息", icon: FileText, desc: "小红书、抖音、视频号、其他公域平台" },
  { key: "private-domain-info", title: "私域经营信息", icon: FileText, desc: "企微、社群、会员、商城、标签自动化" },
  { key: "resources-constraints", title: "资源与约束", icon: FileText, desc: "预算、团队、门店、系统、关键限制" },
  { key: "target-info", title: "目标信息", icon: FileText, desc: "未来 12 个月目标与增长优先级" },
  { key: "growth-report", title: "品牌增长报告", icon: FileBarChart, desc: "增长策略母版、获客结构、ROI 全景" },
];

function CardShell({ title, icon: Icon, children }: { title: string; icon: typeof BookMarked; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 ring-1 ring-indigo-200">
          <Icon className="h-4 w-4" />
        </div>
        <h4 className="text-[13px] font-semibold tracking-tight text-slate-900">{title}</h4>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-[12px] font-medium text-slate-700">
      {children}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { value: string | number }) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 ring-1 ring-slate-100 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 " +
        (props.className || "")
      }
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  return (
    <textarea
      {...props}
      className={
        "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-6 text-slate-900 ring-1 ring-slate-100 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 " +
        (props.className || "")
      }
    />
  );
}

type BrandBackground = {
  brandName: string;
  industry: string;
  storeCount: number;
  foundedYear: number;
  brandDescription: string;
  enterpriseIntro: string;
};

type IpProfile = {
  ipName: string;
  imageUrls: string[];
  voiceUrl: string;
  voiceFileName: string;
  voiceDurationSec: number;
  ipPositioning: string;
  ipStory: string;
  ipValues: string;
  ipStyle: string;
  douyinAccountLink: string;
  xiaohongshuAccountLink: string;
};

type ProductRecord = {
  id: string;
  productName: string;
  productType: string;
  price: number;
  productPositioning: string;
  targetAudience: string;
  painPoint: string;
  usageScenario: string;
  differentiators: string;
  marketPosition: string;
  detailDescription: string;
  imageUrl: string;
  imageUrls: string[];
};

type ReportRecord = {
  id: string;
  brandId: string;
  workspaceScope: "brand_growth";
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  htmlContent: string;
  reportMarkdown: string;
  commentCount: number;
  status: "READY" | "RUNNING" | "FAILED";
  cycleLabel: string;
};

const OMNI_GROWTH_SURVEY_TITLES = new Set(["公域经营信息", "私域经营信息", "资源与约束", "目标信息"]);
const OMNI_GROWTH_SURVEY_SECTIONS = BRAND_SURVEY_SECTIONS.filter((section) => OMNI_GROWTH_SURVEY_TITLES.has(section.title));

function emptyBrand(): BrandBackground {
  return { brandName: "", industry: "", storeCount: 0, foundedYear: 0, brandDescription: "", enterpriseIntro: "" };
}
function emptyIp(): IpProfile {
  return { ipName: "", imageUrls: [], voiceUrl: "", voiceFileName: "", voiceDurationSec: 0, ipPositioning: "", ipStory: "", ipValues: "", ipStyle: "", douyinAccountLink: "", xiaohongshuAccountLink: "" };
}
function emptyProduct(): ProductRecord {
  return { id: "", productName: "", productType: "", price: 0, productPositioning: "", targetAudience: "", painPoint: "", usageScenario: "", differentiators: "", marketPosition: "", detailDescription: "", imageUrl: "", imageUrls: [] };
}

function normalizeProductRecord(product: Partial<ProductRecord> | ProductRecord): ProductRecord {
  const normalizedImageUrls = Array.from(
    new Set(
      [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])]
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );

  return {
    ...emptyProduct(),
    ...product,
    imageUrl: normalizedImageUrls[0] || "",
    imageUrls: normalizedImageUrls,
  };
}

const DEFAULT_BRAND_ID = "brand-demo-cleaning";

function makeAuthHeaders(brandId: string, extra: Record<string, string> = {}): Record<string, string> {
  const session = getStoredAuthSession();
  const headers: Record<string, string> = {
    "x-dashboard-client": "nextjs-tabs",
    "x-brand-id": brandId,
    ...extra,
  };
  if (session?.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`;
  }
  if (typeof window !== "undefined" && !headers["x-app-path"]) {
    headers["x-app-path"] = window.location.pathname || "/";
  }
  if (getRuntimeMode() === "local-single-user" && !headers["X-Lab-Force-Admin"]) {
    headers["X-Lab-Force-Admin"] = "1";
  }
  return headers;
}

function readFileAsBase64(file: File): Promise<{ dataBase64: string; contentType: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("读取文件失败"));
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIdx = result.indexOf(",");
      const dataBase64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
      resolve({ dataBase64, contentType: file.type || "application/octet-stream", fileName: file.name });
    };
    reader.readAsDataURL(file);
  });
}

export default function BrandGrowthPage() {
  const [tab, setTab] = useState<TabKey>("brand-library");
  const [brandId, setBrandId] = useState<string>(() => getStoredCurrentBrandId() || "");
  const [toast, setToast] = useState({ visible: false, message: "", tone: "info" as "success" | "error" | "info" | "warn" });
  const [uploadingIpImages, setUploadingIpImages] = useState(false);
  const [uploadingIpVoice, setUploadingIpVoice] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState("");

  const [brand, setBrand] = useState<BrandBackground>(emptyBrand());
  const [ip, setIp] = useState<IpProfile>(emptyIp());
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState("");
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [survey, setSurvey] = useState<BrandSurveyAnswer[]>(() => createDefaultBrandSurveyAnswers());

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const bindCurrentBrandToSession = async () => {
    const nextBrandName = brand.brandName.trim() || brandId;
    const nextIndustry = brand.industry.trim() || "未填写";
    setStoredCurrentBrandContext({
      id: brandId,
      brandName: nextBrandName,
      industry: nextIndustry,
      role: "OWNER",
    });

    let session = getStoredAuthSession();
    if (!session) {
      await getMe({ force: true }).catch(() => null);
      session = getStoredAuthSession();
    }
    if (!session) {
      return false;
    }
    const previous = session.brands ?? [];
    const existed = previous.find((item) => item.id === brandId);
    const nextBrands = existed
      ? previous.map((item) =>
          item.id === brandId
            ? { ...item, brandName: nextBrandName, industry: nextIndustry }
            : item,
        )
      : [
          ...previous,
          {
            id: brandId,
            brandName: nextBrandName,
            industry: nextIndustry,
            role: "OWNER",
          },
        ];
    setStoredAuthSession({
      ...session,
      currentBrandId: brandId,
      brands: nextBrands,
    });
    return true;
  };

  const activeProduct = useMemo<ProductRecord | null>(() => {
    return products.find((p) => p.id === activeProductId) || products[0] || null;
  }, [products, activeProductId]);

  const activeReport = useMemo<ReportRecord | null>(() => {
    return reports.find((item) => item.id === activeReportId) || null;
  }, [reports, activeReportId]);

  const activeReportPreviewUrl = useMemo(() => {
    if (!activeReport?.htmlContent) {
      return "";
    }
    return URL.createObjectURL(new Blob([activeReport.htmlContent], { type: "text/html;charset=utf-8" }));
  }, [activeReport]);

  useEffect(() => {
    return () => {
      if (activeReportPreviewUrl) {
        URL.revokeObjectURL(activeReportPreviewUrl);
      }
    };
  }, [activeReportPreviewUrl]);

  const formatDateTime = (value?: string) => {
    if (!value) {
      return "-";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString("zh-CN", { hour12: false });
  };

  const loadGrowthReports = async (targetBrandId: string, options?: { silent?: boolean; cancelled?: () => boolean }) => {
    if (!options?.silent) {
      setReportsLoading(true);
    }
    try {
      const reportsResp = await fetch(`/api/reports/brands/${targetBrandId}/growth-report`, {
        headers: makeAuthHeaders(targetBrandId),
      });
      if (!reportsResp.ok) {
        throw new Error(`HTTP ${reportsResp.status}`);
      }
      const data = (await reportsResp.json()) as {
        history?: Array<{
          id: string;
          title: string;
          summary?: string;
          generatedAt?: string;
          reportMarkdown?: string;
          htmlContent?: string;
          metrics?: { cycleDays?: number };
        }>;
        latestTask?: { taskStatus?: "QUEUED" | "RUNNING" | "FAILED" | "COMPLETED" };
      };
      if (options?.cancelled?.()) {
        return;
      }
      const baseReports: ReportRecord[] = (data.history || []).map((item) => ({
        id: item.id,
        brandId: targetBrandId,
        workspaceScope: "brand_growth" as const,
        title: item.title,
        description: item.summary || "",
        createdAt: item.generatedAt || new Date().toISOString(),
        updatedAt: item.generatedAt || new Date().toISOString(),
        htmlContent: item.htmlContent || "",
        reportMarkdown: item.reportMarkdown || "",
        commentCount: 0,
        status:
          data.latestTask?.taskStatus === "FAILED"
            ? "FAILED"
            : data.latestTask?.taskStatus === "RUNNING" || data.latestTask?.taskStatus === "QUEUED"
              ? "RUNNING"
              : "READY",
        cycleLabel:
          typeof item.metrics?.cycleDays === "number" && Number.isFinite(item.metrics.cycleDays)
            ? `近${item.metrics.cycleDays}天`
            : "品牌策略归档",
      }));
      const commentCounts = await Promise.all(
        baseReports.map(async (item) => {
          try {
            const workspace = await getAIControlCenterCommentWorkspace(targetBrandId, "brand_growth", "growth_report", item.id);
            return workspace.total || workspace.items.length || 0;
          } catch {
            return 0;
          }
        }),
      );
      if (options?.cancelled?.()) {
        return;
      }
      setReports(baseReports.map((item, index) => ({ ...item, commentCount: commentCounts[index] || 0 })));
    } finally {
      if (!options?.silent) {
        setReportsLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    const syncBrandId = async () => {
      const localBrandId = getStoredCurrentBrandId() || "";
      if (!cancelled && localBrandId && localBrandId !== brandId) {
        setBrandId(localBrandId);
      }

      const session = getStoredAuthSession();
      if (session?.currentBrandId || session?.brands?.length) {
        return;
      }

      const response = await getMe({ force: true }).catch(() => null);
      const resolvedBrandId = response?.currentBrandId || response?.brands?.[0]?.id || getStoredCurrentBrandId() || "";
      if (!cancelled && resolvedBrandId && resolvedBrandId !== brandId) {
        setBrandId(resolvedBrandId);
      }
    };
    void syncBrandId();
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const brandResp = await fetch(`/api/brands/${brandId}`, {
          headers: makeAuthHeaders(brandId),
        });
        if (brandResp.ok) {
          const data = (await brandResp.json()) as unknown as { brand?: Partial<BrandBackground>; ipProfile?: Partial<IpProfile> };
          if (!cancelled) {
            setBrand({ ...emptyBrand(), ...(data.brand || {}) });
            setIp({ ...emptyIp(), ...(data.ipProfile || {}) });
          }
        }
      } catch {
        /* ignore, fallthrough to fetch below */
      }
      try {
        const archiveResp = await fetch(`/api/brands/${brandId}/archive`, {
          headers: makeAuthHeaders(brandId),
        });
        if (archiveResp.ok && !cancelled) {
          const data = (await archiveResp.json()) as { survey?: BrandSurveyAnswer[] };
          setSurvey(normalizeBrandSurveyAnswers(Array.isArray(data.survey) ? data.survey : []));
        }
      } catch {
        /* ignore */
      }
      try {
        const productsResp = await fetch(`/api/brands/${brandId}/products`, {
          headers: makeAuthHeaders(brandId),
        });
        if (productsResp.ok && !cancelled) {
          const list = ((await productsResp.json()) as ProductRecord[]).map((item) => normalizeProductRecord(item));
          setProducts(list || []);
          if ((list || []).length) setActiveProductId(list[0].id);
        }
      } catch {
        /* ignore */
      }
      try {
        await loadGrowthReports(brandId, { silent: true, cancelled: () => cancelled });
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  const saveBrand = withToast(
    async () => {
      setSaving(true);
      try {
        const r = await fetch(`/api/brands/${brandId}/background`, {
          method: "PATCH",
          headers: makeAuthHeaders(brandId, { "Content-Type": "application/json" }),
          body: JSON.stringify(brand),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const surveyResp = await fetch(`/api/brands/${brandId}/survey`, {
          method: "PATCH",
          headers: makeAuthHeaders(brandId, { "Content-Type": "application/json" }),
          body: JSON.stringify({
            answers: normalizeBrandSurveyAnswers(survey).map((item) => ({
              key: item.key,
              label: item.label,
              value: item.value,
            })),
          }),
        });
        if (!surveyResp.ok) throw new Error(`调研信息保存失败 HTTP ${surveyResp.status}`);
        await bindCurrentBrandToSession();
      } finally {
        setSaving(false);
      }
    },
    setToast,
    "品牌资料库与全域经营信息已保存，并已设为当前品牌",
    "品牌资料库保存失败",
  );

  const updateSurveyValue = (key: string, value: string) => {
    setSurvey((current) => normalizeBrandSurveyAnswers(current).map((item) => (item.key === key ? { ...item, value } : item)));
  };

  const renderSurveySection = (sectionTitle: string, saveLabel: string) => {
    const section = OMNI_GROWTH_SURVEY_SECTIONS.find((item) => item.title === sectionTitle);
    if (!section) return null;
    return (
      <CardShell title={section.title} icon={FileText}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {section.fields?.map((field) => {
            const answer = survey.find((item) => item.key === field.key);
            return (
              <div key={field.key}>
                <Label>{field.label}</Label>
                <Textarea
                  rows={4}
                  value={answer?.value ?? ""}
                  onChange={(e) => updateSurveyValue(field.key, e.target.value)}
                  placeholder="填写现状、数据、问题或待补充项"
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            disabled={saving}
            onClick={saveBrand}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 px-4 text-[12.5px] font-medium text-white shadow-md shadow-indigo-200/60 transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "保存中…" : saveLabel}
          </button>
        </div>
      </CardShell>
    );
  };

  const saveIp = withToast(
    async () => {
      setSaving(true);
      try {
        const r = await fetch(`/api/brands/${brandId}/ip-profile`, {
          method: "PATCH",
          headers: makeAuthHeaders(brandId, { "Content-Type": "application/json" }),
          body: JSON.stringify(ip),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } finally {
        setSaving(false);
      }
    },
    setToast,
    "IP 资料库已保存，Agent 上下文将下次生成时自动注入",
    "IP 资料库保存失败",
  );

  const uploadIpImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingIpImages(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          setToast({ visible: true, message: `图片「${file.name}」超过 5MB，已跳过`, tone: "warn" });
          continue;
        }
        const { dataBase64, contentType, fileName } = await readFileAsBase64(file);
        const r = await fetch(`/api/brands/${brandId}/ip-images`, {
          method: "POST",
          headers: makeAuthHeaders(brandId, { "Content-Type": "application/json" }),
          body: JSON.stringify({ fileName, contentType, dataBase64 }),
        });
        if (!r.ok) throw new Error(`上传「${file.name}」失败: HTTP ${r.status}`);
        const record = (await r.json()) as { imageUrl: string };
        if (record?.imageUrl) newUrls.push(record.imageUrl);
      }
      if (newUrls.length) {
        setIp((prev) => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ...newUrls] }));
      }
      setToast({ visible: true, message: `IP 图片已上传（${newUrls.length}张），点击「保存 IP 资料库」写入权威账本`, tone: "success" });
    } catch (err) {
      console.error(err);
      setToast({ visible: true, message: `IP 图片上传失败：${err instanceof Error ? err.message : String(err)}`, tone: "error" });
    } finally {
      setUploadingIpImages(false);
    }
  };

  const removeIpImage = (idx: number) => {
    setIp((prev) => ({ ...prev, imageUrls: (prev.imageUrls || []).filter((_, i) => i !== idx) }));
  };

  const uploadIpVoice = async (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setToast({ visible: true, message: `语音「${file.name}」超过 10MB`, tone: "error" });
      return;
    }
    setUploadingIpVoice(true);
    try {
      const { dataBase64, contentType, fileName } = await readFileAsBase64(file);
      const r = await fetch(`/api/brands/${brandId}/ip-voices`, {
        method: "POST",
        headers: makeAuthHeaders(brandId, { "Content-Type": "application/json" }),
        body: JSON.stringify({ fileName, contentType, dataBase64 }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const record = (await r.json()) as { audioUrl: string; fileName?: string; durationSec?: number };
      if (record?.audioUrl) {
        setIp((prev) => ({
          ...prev,
          voiceUrl: record.audioUrl,
          voiceFileName: record.fileName || file.name,
          voiceDurationSec: record.durationSec ?? prev.voiceDurationSec ?? 0,
        }));
        setToast({ visible: true, message: `IP 语音已上传，点击「保存 IP 资料库」写入权威账本`, tone: "success" });
      }
    } catch (err) {
      console.error(err);
      setToast({ visible: true, message: `IP 语音上传失败：${err instanceof Error ? err.message : String(err)}`, tone: "error" });
    } finally {
      setUploadingIpVoice(false);
    }
  };

  const addProduct = withToast(
    async () => {
      setSaving(true);
      try {
        const payload = { ...emptyProduct(), productName: `新产品 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`, productType: "核心SKU" };
        const r = await fetch(`/api/brands/${brandId}/products`, {
          method: "POST",
          headers: makeAuthHeaders(brandId, { "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const created = normalizeProductRecord((await r.json()) as ProductRecord);
        setProducts((prev) => [created, ...prev]);
        setActiveProductId(created.id);
      } finally {
        setSaving(false);
      }
    },
    setToast,
    "已新增一条产品资料，点击右侧编辑卖点和竞品对比",
    "新增产品失败",
  );

  const saveActiveProduct = withToast(
    async () => {
      if (!activeProduct) return;
      setSaving(true);
      try {
        const payload = normalizeProductRecord(activeProduct);
        const r = await fetch(`/api/brands/${brandId}/products/${activeProduct.id}`, {
          method: "PATCH",
          headers: makeAuthHeaders(brandId, { "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const updated = normalizeProductRecord((await r.json()) as ProductRecord);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } finally {
        setSaving(false);
      }
    },
    setToast,
    activeProduct ? `产品《${activeProduct.productName}》已保存` : "已保存",
    "产品保存失败",
  );

  const deleteActiveProduct = withToast(
    async () => {
      if (!activeProduct) return;
      setSaving(true);
      try {
        const r = await fetch(`/api/brands/${brandId}/products/${activeProduct.id}`, {
          method: "DELETE",
          headers: makeAuthHeaders(brandId),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setProducts((prev) => prev.filter((p) => p.id !== activeProduct.id));
        setActiveProductId((prevId) => (prevId === activeProduct.id ? null : prevId));
      } finally {
        setSaving(false);
      }
    },
    setToast,
    "产品资料已删除（已同步权威账本 + 版本变更留痕）",
    "删除产品失败",
  );

  const uploadProductImages = async (productId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingProductId(productId);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          setToast({ visible: true, message: `文件「${file.name}」不是图片，已跳过`, tone: "warn" });
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setToast({ visible: true, message: `图片「${file.name}」超过 5MB，已跳过`, tone: "warn" });
          continue;
        }
        const { dataBase64, contentType, fileName } = await readFileAsBase64(file);
        const r = await fetch(`/api/brands/${brandId}/product-images`, {
          method: "POST",
          headers: makeAuthHeaders(brandId, { "Content-Type": "application/json" }),
          body: JSON.stringify({ fileName, contentType, dataBase64 }),
        });
        if (!r.ok) throw new Error(`上传「${file.name}」失败: HTTP ${r.status}`);
        const record = (await r.json()) as { imageUrl?: string };
        if (record?.imageUrl) newUrls.push(record.imageUrl);
      }
      if (newUrls.length) {
        setProducts((prev) =>
          prev.map((product) =>
            product.id === productId
              ? normalizeProductRecord({
                  ...product,
                  imageUrls: [...product.imageUrls, ...newUrls],
                })
              : product,
          ),
        );
      }
      setToast({
        visible: true,
        message: newUrls.length
          ? `产品图片已上传（${newUrls.length}张），点击「保存当前 SKU」写入资料库`
          : "没有可上传的新图片",
        tone: newUrls.length ? "success" : "warn",
      });
    } catch (err) {
      console.error(err);
      setToast({ visible: true, message: `产品图片上传失败：${err instanceof Error ? err.message : String(err)}`, tone: "error" });
    } finally {
      setUploadingProductId("");
    }
  };

  const removeProductImage = (productId: string, imageIndex: number) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? normalizeProductRecord({
              ...product,
              imageUrls: product.imageUrls.filter((_, idx) => idx !== imageIndex),
              imageUrl: product.imageUrls.filter((_, idx) => idx !== imageIndex)[0] || "",
            })
          : product,
      ),
    );
  };

  const refreshGrowthReports = withToast(
    async () => {
      await loadGrowthReports(brandId);
    },
    setToast,
    "品牌增长报告列表已刷新",
    "刷新品牌增长报告失败",
  );

  const deleteGrowthReport = async (report?: ReportRecord | null) => {
    const targetReport = report || activeReport;
    if (!targetReport) {
      setToast({ visible: true, message: "请先选择一条品牌增长报告", tone: "warn" });
      return;
    }
    if (!window.confirm(`确认删除《${targetReport.title}》吗？`)) {
      return;
    }
    setToast({ visible: true, message: "删除中…", tone: "info" });
    setDeletingReportId(targetReport.id);
    try {
      const response = await fetch(`/api/reports/brands/${brandId}/growth-report/${targetReport.id}`, {
        method: "DELETE",
        headers: makeAuthHeaders(brandId),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setActiveReportId((current) => (current === targetReport.id ? null : current));
      await loadGrowthReports(brandId);
      setToast({ visible: true, message: "品牌增长报告已删除", tone: "success" });
    } catch (error) {
      setToast({ visible: true, message: `删除品牌增长报告失败：${error instanceof Error ? error.message : String(error)}`, tone: "error" });
    } finally {
      setDeletingReportId("");
    }
  };

  const openActiveReportInNewWindow = () => {
    if (!activeReportPreviewUrl) {
      return;
    }
    window.open(activeReportPreviewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[12px] text-slate-500">
            <Link href="/tabs/brand-control" className="hover:text-indigo-700">
              首页
            </Link>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span>品牌增长</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-900 md:text-2xl">品牌增长</h2>
            {loading ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-0.5 text-[11.5px] text-slate-500 ring-1 ring-slate-200">
                <RefreshCw className="h-3 w-3 animate-spin" /> 正在从权威账本加载…
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/tabs/brand-control"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-[12.5px] font-medium text-slate-700 shadow-sm hover:border-indigo-200 hover:text-indigo-700"
          >
            ← 返回全局概览
          </Link>
          <span className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-[11.5px] text-slate-500 shadow-sm">
            Brand ID：
            <code className="rounded bg-slate-50 px-1.5 py-0.5 font-mono text-[10.5px] ring-1 ring-slate-200">{brandId}</code>
          </span>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {TABS.map((t, idx) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                "group flex min-w-[180px] flex-1 items-start gap-3 rounded-xl px-3 py-2.5 text-left transition " +
                (active
                  ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/60 ring-1 ring-indigo-700/10"
                  : "text-slate-700 hover:bg-slate-50 ring-1 ring-transparent hover:ring-slate-200")
              }
            >
              <div
                className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " +
                  (active ? "bg-white/15 text-white" : "bg-gradient-to-br from-amber-50 to-orange-100 text-amber-700 ring-1 ring-amber-200")
                }
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={"text-[12.5px] font-semibold " + (active ? "text-white" : "text-slate-900")}>
                    {idx + 1}. {t.title}
                  </span>
                </div>
                <p className={"mt-0.5 truncate text-[11px] leading-4 " + (active ? "text-indigo-100" : "text-slate-500")}>{t.desc}</p>
              </div>
            </button>
          );
        })}
      </section>

      <section>
          {tab === "brand-library" ? (
            <CardShell title="品牌资料库" icon={BookMarked}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label required>品牌名称</Label>
                  <Input value={brand.brandName} onChange={(e) => setBrand((p) => ({ ...p, brandName: e.target.value }))} placeholder="如：光之算法" />
                </div>
                <div>
                  <Label required>行业</Label>
                  <Input value={brand.industry} onChange={(e) => setBrand((p) => ({ ...p, industry: e.target.value }))} placeholder="如：AI 商业咨询、美妆、茶饮连锁" />
                </div>
                <div>
                  <Label>门店数量</Label>
                  <Input type="number" value={brand.storeCount} onChange={(e) => setBrand((p) => ({ ...p, storeCount: Number(e.target.value) || 0 }))} placeholder="门店/办公室/网点数" />
                </div>
                <div>
                  <Label>品牌成立年份</Label>
                  <Input type="number" value={brand.foundedYear} onChange={(e) => setBrand((p) => ({ ...p, foundedYear: Number(e.target.value) || 0 }))} placeholder="如：2024" />
                </div>
              </div>
              <div>
                <Label>品牌介绍（1-2 段，注入 Agent 上下文）</Label>
                <Textarea rows={4} value={brand.brandDescription} onChange={(e) => setBrand((p) => ({ ...p, brandDescription: e.target.value }))} placeholder="一句话定位 + 核心业务 + 目标客户画像" />
              </div>
              <div>
                <Label>企业介绍（更详细，用于长报告）</Label>
                <Textarea rows={5} value={brand.enterpriseIntro} onChange={(e) => setBrand((p) => ({ ...p, enterpriseIntro: e.target.value }))} placeholder="创始人故事、规模、组织架构、核心能力、发展里程碑" />
              </div>
              <div className="flex justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveBrand}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 px-4 text-[12.5px] font-medium text-white shadow-md shadow-indigo-200/60 transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" /> {saving ? "保存中…" : "保存品牌资料库"}
                </button>
              </div>
            </CardShell>
          ) : null}

          {tab === "public-domain-info" ? renderSurveySection("公域经营信息", "保存公域经营信息") : null}

          {tab === "private-domain-info" ? renderSurveySection("私域经营信息", "保存私域经营信息") : null}

          {tab === "resources-constraints" ? renderSurveySection("资源与约束", "保存资源与约束") : null}

          {tab === "target-info" ? renderSurveySection("目标信息", "保存目标信息") : null}

          {tab === "ip-library" ? (
            <CardShell title="IP 资料库" icon={Lightbulb}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label required>IP 名称 / 人设标签</Label>
                  <Input value={ip.ipName} onChange={(e) => setIp((p) => ({ ...p, ipName: e.target.value }))} placeholder="如：小光、阿东哥、品牌吉祥物「光光」" />
                </div>
                <div>
                  <Label>IP 一句话定位</Label>
                  <Input value={ip.ipPositioning} onChange={(e) => setIp((p) => ({ ...p, ipPositioning: e.target.value }))} placeholder="如：30+ 轻熟男 · AI 商业布道者 · 每周一个实操案例" />
                </div>
                <div>
                  <Label>说话风格 / 语气语调</Label>
                  <Input value={ip.ipStyle} onChange={(e) => setIp((p) => ({ ...p, ipStyle: e.target.value }))} placeholder="如：专业但不装、短句、案例、结尾带思考题" />
                </div>
                <div className="md:col-span-2">
                  <Label>IP 故事（注入所有 AI 生成上下文）</Label>
                  <Textarea rows={3} value={ip.ipStory} onChange={(e) => setIp((p) => ({ ...p, ipStory: e.target.value }))} placeholder="人物背景、经历、典型场景、与用户的关系" />
                </div>
                <div className="md:col-span-2">
                  <Label>IP 核心价值观（3-5 条，分号分隔）</Label>
                  <Textarea rows={2} value={ip.ipValues} onChange={(e) => setIp((p) => ({ ...p, ipValues: e.target.value }))} placeholder="如：实战 > 理论；长期主义；把复杂留给中台，把简单留给门店" />
                </div>
                <div>
                  <Label>IP 语音文件（真实上传，mp3/wav/m4a，≤10MB）</Label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-indigo-300 bg-indigo-50/50 px-3 text-[11.5px] text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50">
                        <PlayCircle className="h-3.5 w-3.5" />
                        {uploadingIpVoice ? "上传中…" : "选择语音文件"}
                        <input
                          type="file"
                          accept="audio/mp3,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/*"
                          className="hidden"
                          disabled={uploadingIpVoice}
                          onChange={(e) => uploadIpVoice(e.target.files?.[0] || null)}
                        />
                      </label>
                      {ip.voiceUrl ? (
                        <button
                          type="button"
                          className="inline-flex h-8 items-center gap-1 rounded-full border border-rose-200 bg-rose-50/60 px-3 text-[11px] text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50"
                          onClick={() => setIp((p) => ({ ...p, voiceUrl: "", voiceFileName: "", voiceDurationSec: 0 }))}
                        >
                          <Trash2 className="h-3 w-3" /> 移除语音
                        </button>
                      ) : null}
                    </div>
                    {ip.voiceUrl ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2 ring-1 ring-slate-100">
                        <audio controls className="w-full h-9" src={ip.voiceUrl}>
                          您的浏览器不支持 audio 标签。
                        </audio>
                      </div>
                    ) : null}
                    <details className="rounded-lg border border-slate-200 bg-slate-50/40 p-2 text-[10.5px] text-slate-500 ring-1 ring-slate-100">
                      <summary className="cursor-pointer select-none">高级：手动粘贴 URL 兜底（不推荐）</summary>
                      <div className="mt-2">
                        <Input value={ip.voiceUrl} onChange={(e) => setIp((p) => ({ ...p, voiceUrl: e.target.value }))} placeholder="对象存储 / OSS / CDN mp3 链接" />
                      </div>
                    </details>
                  </div>
                </div>
                <div>
                  <Label>语音文件名 + 时长(秒)</Label>
                  <div className="flex gap-2">
                    <Input value={ip.voiceFileName} onChange={(e) => setIp((p) => ({ ...p, voiceFileName: e.target.value }))} placeholder="如：xiaoguang-v3.mp3" className="flex-1" />
                    <Input type="number" value={ip.voiceDurationSec} onChange={(e) => setIp((p) => ({ ...p, voiceDurationSec: Number(e.target.value) || 0 }))} placeholder="秒" className="w-32" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label>IP 多图照片（真实上传，多选，每张≤5MB）</Label>
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-indigo-300 bg-indigo-50/50 px-3 text-[11.5px] text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50">
                        <Image className="h-3.5 w-3.5" />
                        {uploadingIpImages ? "上传中…" : "选择图片（可多选）"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={uploadingIpImages}
                          onChange={(e) => uploadIpImages(e.target.files)}
                        />
                      </label>
                      {(ip.imageUrls || []).length ? (
                        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10.5px] text-slate-500 ring-1 ring-slate-200">
                          共 {(ip.imageUrls || []).length} 张
                        </span>
                      ) : null}
                    </div>
                    {(ip.imageUrls || []).length ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                        {(ip.imageUrls || []).map((url, idx) => (
                          <div key={`${url}-${idx}`} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm ring-1 ring-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`IP 图 ${idx + 1}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeIpImage(idx)}
                              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-black/75"
                              title="删除这张"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[9.5px] font-medium text-white">
                              #{idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <details className="rounded-lg border border-slate-200 bg-slate-50/40 p-2 text-[10.5px] text-slate-500 ring-1 ring-slate-100">
                      <summary className="cursor-pointer select-none">高级：手动粘贴 URL 逗号分隔兜底（不推荐）</summary>
                      <div className="mt-2">
                        <Input
                          value={(ip.imageUrls || []).join(", ")}
                          onChange={(e) => setIp((p) => ({ ...p, imageUrls: e.target.value.split(/[,;，\s]+/).map((s) => s.trim()).filter(Boolean) }))}
                          placeholder="图1.jpg, 图2.jpg, 图3.jpg"
                        />
                      </div>
                    </details>
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>抖音账号链接</Label>
                    <Input value={ip.douyinAccountLink} onChange={(e) => setIp((p) => ({ ...p, douyinAccountLink: e.target.value }))} placeholder="https://www.iesdouyin.com/share/user/..." />
                  </div>
                  <div>
                    <Label>小红书账号链接</Label>
                    <Input value={ip.xiaohongshuAccountLink} onChange={(e) => setIp((p) => ({ ...p, xiaohongshuAccountLink: e.target.value }))} placeholder="https://www.xiaohongshu.com/user/profile/..." />
                  </div>
                </div>
              </div>
              <div className="flex justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveIp}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 px-4 text-[12.5px] font-medium text-white shadow-md shadow-indigo-200/60 transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" /> {saving ? "保存中…" : "保存 IP 资料库"}
                </button>
              </div>
            </CardShell>
          ) : null}

          {tab === "product-library" ? (
            <CardShell
              title="产品资料库"
              icon={Package}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200">
                  当前共 <b className="text-indigo-700">{products.length}</b> 条 SKU · 当前选中：
                  <code className="ml-1 rounded bg-white px-1.5 py-0.5 font-mono text-[10.5px] ring-1 ring-slate-200">
                    {activeProduct?.productName || "暂无"}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={addProduct} disabled={saving} className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-indigo-300 bg-indigo-50/50 px-3 text-[11.5px] text-indigo-700 ring-1 ring-indigo-200 transition enabled:hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60">
                    <Plus className="h-3.5 w-3.5" /> 新增一条 SKU
                  </button>
                  <button type="button" onClick={deleteActiveProduct} disabled={saving || !activeProduct} className="inline-flex h-8 items-center gap-1 rounded-full border border-rose-200 bg-rose-50/60 px-3 text-[11.5px] text-rose-700 ring-1 ring-rose-200 transition enabled:hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
                    <Trash2 className="h-3.5 w-3.5" /> 删除当前 SKU
                  </button>
                </div>
              </div>
              {/* 产品列表（左小） */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-1 space-y-2">
                  {products.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-[11.5px] leading-5 text-slate-500">
                      还没有产品资料，点击右上角「新增一条 SKU」创建第一条。
                    </div>
                  ) : (
                    products.map((p) => {
                      const selected = p.id === activeProduct?.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setActiveProductId(p.id)}
                          className={
                            "w-full rounded-xl border p-3 text-left transition " +
                            (selected
                              ? "border-indigo-300 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-100"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-slate-900">{p.productName}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px]">
                                <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-700 ring-1 ring-amber-200">
                                  <Tag className="mr-0.5 inline h-2.5 w-2.5" /> {p.productType || "未分类"}
                                </span>
                                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
                                  <DollarSign className="mr-0.5 inline h-2.5 w-2.5" /> ¥{Number(p.price || 0).toFixed(2)}
                                </span>
                              </div>
                              <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-slate-500">{p.productPositioning || p.detailDescription || "（暂无卖点描述）"}</p>
                            </div>
                            <Image className={"h-4 w-4 shrink-0 " + (selected ? "text-indigo-600" : "text-slate-400")} />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                {/* 产品详情编辑（右大） */}
                <div className="md:col-span-2 space-y-4">
                  {activeProduct ? (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label required>产品名称 / SKU 名</Label>
                          <Input value={activeProduct.productName} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === activeProduct.id ? { ...p, productName: e.target.value } : p)))} placeholder="如：全域运营系统 · Pro 版" />
                        </div>
                        <div>
                          <Label>品类 / SKU 标签</Label>
                          <Input value={activeProduct.productType} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === activeProduct.id ? { ...p, productType: e.target.value } : p)))} placeholder="如：核心SKU / 引流品 / 高毛利品 / 服务" />
                        </div>
                        <div>
                          <Label>售价（元）</Label>
                          <Input type="number" value={activeProduct.price} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === activeProduct.id ? { ...p, price: Number(e.target.value) || 0 } : p)))} />
                        </div>
                        <div className="md:col-span-2">
                          <Label>产品图片</Label>
                          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3 ring-1 ring-slate-100">
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-indigo-300 bg-indigo-50/50 px-3 text-[11.5px] text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50">
                                <Image className="h-3.5 w-3.5" />
                                {uploadingProductId === activeProduct.id ? "上传中…" : "上传图片（可多选）"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  disabled={uploadingProductId === activeProduct.id}
                                  onChange={(e) => {
                                    void uploadProductImages(activeProduct.id, e.target.files);
                                    e.currentTarget.value = "";
                                  }}
                                />
                              </label>
                              {activeProduct.imageUrls.length ? (
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] text-slate-500 ring-1 ring-slate-200">
                                  共 {activeProduct.imageUrls.length} 张
                                </span>
                              ) : null}
                            </div>
                            {activeProduct.imageUrls.length ? (
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {activeProduct.imageUrls.map((url, idx) => (
                                  <div key={`${url}-${idx}`} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm ring-1 ring-slate-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={`${activeProduct.productName || "产品"} 图片 ${idx + 1}`} className="h-full w-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => removeProductImage(activeProduct.id, idx)}
                                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-black/75"
                                      title="删除这张"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                    <div className="absolute bottom-1 left-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[9.5px] font-medium text-white">
                                      #{idx + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[11px] leading-5 text-slate-500">
                                支持一次选择多张产品图片，上传后会先追加到当前 SKU，点击「保存当前 SKU」后写入资料库。
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label>产品一句话定位</Label>
                          <Input value={activeProduct.productPositioning} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === activeProduct.id ? { ...p, productPositioning: e.target.value } : p)))} placeholder="如：给中小企业的一站式 AI 获客中台" />
                        </div>
                        <div>
                          <Label>目标客户画像</Label>
                          <Input value={activeProduct.targetAudience} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === activeProduct.id ? { ...p, targetAudience: e.target.value } : p)))} placeholder="如：10-50 人、本地服务、CEO/运营负责人" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label>用户痛点（这条 SKU 解决什么问题）</Label>
                          <Textarea rows={3} value={activeProduct.painPoint} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === activeProduct.id ? { ...p, painPoint: e.target.value } : p)))} />
                        </div>
                        <div>
                          <Label>典型使用场景</Label>
                          <Textarea rows={3} value={activeProduct.usageScenario} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === activeProduct.id ? { ...p, usageScenario: e.target.value } : p)))} />
                        </div>
                        <div>
                          <Label>差异化卖点 / 和竞品的 PK</Label>
                          <Textarea rows={3} value={activeProduct.differentiators} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === activeProduct.id ? { ...p, differentiators: e.target.value } : p)))} placeholder="列 3-5 条：1. xx ；2. xx" />
                        </div>
                        <div>
                          <Label>市场定位 / 价格带</Label>
                          <Textarea rows={3} value={activeProduct.marketPosition} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === activeProduct.id ? { ...p, marketPosition: e.target.value } : p)))} placeholder="如：中端 · 国产替代 · 年度订阅制" />
                        </div>
                      </div>
                      <div>
                        <Label>产品详情长描述（1 段，Agent 做方案时引用）</Label>
                        <Textarea rows={4} value={activeProduct.detailDescription} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === activeProduct.id ? { ...p, detailDescription: e.target.value } : p)))} />
                      </div>
                      <div className="flex justify-end border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={saveActiveProduct}
                          className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 px-4 text-[12.5px] font-medium text-white shadow-md shadow-indigo-200/60 transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Save className="h-3.5 w-3.5" /> {saving ? "保存中…" : `保存当前 SKU`}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-[12px] leading-6 text-slate-500">
                      请点击左侧列表选择 SKU 进行编辑，或使用顶部「新增一条 SKU」创建第一条产品资料。
                    </div>
                  )}
                </div>
              </div>
            </CardShell>
          ) : null}

          {tab === "growth-report" ? (
            <CardShell title="品牌增长报告" icon={FileBarChart}>
              <div className="text-[12px] leading-5 text-slate-600">
                这里展示已归档的品牌增长报告。报告由 WorkBuddy 全域增长策略专家团生成后上传，中台只负责保存和展示。
              </div>
              <article className="workspace-panel strategy-page-card">
                <div className="strategy-card-toolbar">
                  <div>
                    <strong>品牌增长报告列表</strong>
                    <p className="panel-subtext">WorkBuddy 上传 HTML 报告后，可在这里查看预览、留言协作和删除归档。</p>
                  </div>
                  <div className="strategy-inline-actions">
                    <span className="archive-pill status-ready">WorkBuddy 上传 · HTML 查看</span>
                    <button type="button" className="secondary-button" onClick={() => void refreshGrowthReports()} disabled={reportsLoading}>
                      {reportsLoading ? "刷新中..." : "刷新列表"}
                    </button>
                    <span className={`archive-pill ${reports.length ? "status-ready" : "status-pending"}`}>
                      共 {reports.length} 条
                    </span>
                  </div>
                </div>

                {!reports.length ? (
                  <div className="note-empty-state">当前还没有品牌增长报告，等待 WorkBuddy 上传首条 HTML 报告。</div>
                ) : (
                  <div className="table-scroll-shell openclaw-record-table-shell">
                    <table className="soft-table openclaw-record-table">
                      <colgroup>
                        <col className="openclaw-record-table__col-title" />
                        <col className="openclaw-record-table__col-content" />
                        <col className="openclaw-record-table__col-created" />
                        <col className="openclaw-record-table__col-created" />
                        <col className="openclaw-record-table__col-actions" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>标题</th>
                          <th>内容</th>
                          <th>创建时间</th>
                          <th>留言</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((item) => (
                          <tr key={item.id}>
                            <td className="openclaw-record-table__text-cell">
                              <span className="openclaw-record-table__text" title={item.title}>{item.title || "-"}</span>
                            </td>
                            <td>
                              <button type="button" className="secondary-button" onClick={() => setActiveReportId(item.id)}>
                                <Eye className="mr-1 inline h-3.5 w-3.5" /> 查看 HTML
                              </button>
                            </td>
                            <td>{formatDateTime(item.createdAt)}</td>
                            <td>
                              <button type="button" className="note-inline-button" onClick={() => setActiveReportId(item.id)}>
                                <MessageSquare className="mr-1 inline h-3.5 w-3.5" /> {item.commentCount}
                              </button>
                            </td>
                            <td className="openclaw-record-table__action-cell">
                              <div className="openclaw-record-table__actions">
                                <button
                                  type="button"
                                  className="note-inline-button"
                                  onClick={() => void deleteGrowthReport(item)}
                                  disabled={deletingReportId === item.id}
                                >
                                  {deletingReportId === item.id ? "删除中..." : "删除"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            </CardShell>
          ) : null}
      </section>

      {activeReport ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setActiveReportId(null)}>
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 1120 }}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{activeReport.title || "品牌增长报告"}</strong>
                <p>HTML 内容预览 · 创建于 {formatDateTime(activeReport.createdAt)}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="primary-button" onClick={openActiveReportInNewWindow} disabled={!activeReportPreviewUrl}>
                  打开 HTML
                </button>
                <button
                  type="button"
                  className="note-inline-button"
                  onClick={() => void deleteGrowthReport()}
                  disabled={deletingReportId === activeReport.id}
                >
                  {deletingReportId === activeReport.id ? "删除中..." : "删除"}
                </button>
                <button type="button" className="secondary-button" onClick={() => setActiveReportId(null)}>
                  关闭
                </button>
              </div>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>创建时间：{formatDateTime(activeReport.createdAt)}</span>
              <span>更新时间：{formatDateTime(activeReport.updatedAt)}</span>
              <span>{activeReport.cycleLabel}</span>
            </div>
            <div className="openclaw-diary-dialog__content" style={{ display: "grid", gap: 12 }}>
              <div className="panel-subtext">HTML 预览</div>
              {activeReportPreviewUrl ? (
                <iframe
                  title={`${activeReport.title || "品牌增长报告"} HTML 预览`}
                  src={activeReportPreviewUrl}
                  style={{ width: "100%", minHeight: 520, border: "1px solid rgba(148, 163, 184, 0.28)", borderRadius: 16, background: "#fff" }}
                />
              ) : (
                <div className="note-empty-state">当前 HTML 内容为空，暂时无法预览。</div>
              )}
            </div>
            <AIControlCenterCommentThread
              brandId={activeReport.brandId}
              workspaceScope={activeReport.workspaceScope}
              resourceType="growth_report"
              resourceId={activeReport.id}
              formatDateTime={formatDateTime}
            />
          </div>
        </div>
      ) : null}

      <Toast tone={toast.tone} visible={toast.visible} message={toast.message} />
    </div>
  );
}
