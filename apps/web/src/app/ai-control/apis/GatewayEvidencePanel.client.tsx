"use client";

import { useEffect, useMemo, useState } from "react";
import type { UserThirdPartyPlatformRecord } from "../../../services/personal-center";
import {
  getDouyinDigitalHumanTemplateTags,
  getDouyinDigitalHumanTemplates,
  getDouyinDigitalHumanVideoWorks,
  getDouyinRunningHubAppDetail,
  getDouyinRunningHubApps,
  getDouyinRunningHubWorks,
  getDouyinVoiceLibrary,
  type DigitalHumanTemplateRecord,
  type DouyinDigitalHumanVideoWorkRecord,
  type DouyinRunningHubAppCardRecord,
  type DouyinRunningHubAppDetailRecord,
  type DouyinRunningHubWorkRecord,
  type DouyinVoiceLibraryRecord,
} from "../../../services/works";

type EvidenceStatus = "idle" | "loading" | "ready" | "error";

type EvidenceState = {
  status: EvidenceStatus;
  errors: string[];
  runningHub: {
    apps: DouyinRunningHubAppCardRecord[];
    detail?: DouyinRunningHubAppDetailRecord;
    works: DouyinRunningHubWorkRecord[];
  };
  chanjing: {
    tagCount: number;
    templates: DigitalHumanTemplateRecord[];
    voices: DouyinVoiceLibraryRecord[];
    videoWorks: DouyinDigitalHumanVideoWorkRecord[];
  };
};

const emptyEvidence: EvidenceState = {
  status: "idle",
  errors: [],
  runningHub: {
    apps: [],
    works: [],
  },
  chanjing: {
    tagCount: 0,
    templates: [],
    voices: [],
    videoWorks: [],
  },
};

type GatewayEvidencePanelProps = {
  brandId: string;
  platform?: UserThirdPartyPlatformRecord;
};

export default function GatewayEvidencePanel({ brandId, platform }: GatewayEvidencePanelProps) {
  const [selectedRunningHubAppKey, setSelectedRunningHubAppKey] = useState("");
  const [evidence, setEvidence] = useState<EvidenceState>(emptyEvidence);

  const platformKind = useMemo(() => resolvePlatformKind(platform), [platform]);
  const isCorePlatform = platformKind === "runninghub" || platformKind === "chanjing";
  const effectiveBrandId = brandId || "brand-demo-cleaning";

  useEffect(() => {
    let cancelled = false;

    async function loadEvidence() {
      if (!platform || !isCorePlatform) {
        setEvidence(emptyEvidence);
        return;
      }

      setEvidence((current) => ({ ...current, status: "loading", errors: [] }));
      const next: EvidenceState = {
        ...emptyEvidence,
        status: "ready",
        runningHub: { apps: [], works: [] },
        chanjing: { tagCount: 0, templates: [], voices: [], videoWorks: [] },
      };
      const errors: string[] = [];

      if (platformKind === "runninghub") {
        try {
          const appsResult = await getDouyinRunningHubApps(effectiveBrandId);
          next.runningHub.apps = appsResult.items || [];
          const appKey = selectedRunningHubAppKey || next.runningHub.apps[0]?.key || "";
          if (appKey) {
            try {
              const detailResult = await getDouyinRunningHubAppDetail(effectiveBrandId, appKey);
              next.runningHub.detail = detailResult.item;
            } catch (error) {
              errors.push(`RunningHub 参数：${readError(error)}`);
            }
          }
        } catch (error) {
          errors.push(`RunningHub 应用：${readError(error)}`);
        }

        try {
          const worksResult = await getDouyinRunningHubWorks(effectiveBrandId);
          next.runningHub.works = worksResult.items || [];
        } catch (error) {
          errors.push(`RunningHub 作业：${readError(error)}`);
        }
      }

      if (platformKind === "chanjing") {
        try {
          const tagsResult = await getDouyinDigitalHumanTemplateTags(effectiveBrandId);
          next.chanjing.tagCount = (tagsResult.list || []).reduce((sum, group) => sum + (group.tagList?.length || 0), 0);
        } catch (error) {
          errors.push(`蝉镜标签：${readError(error)}`);
        }

        try {
          const templatesResult = await getDouyinDigitalHumanTemplates(effectiveBrandId, { page: 1, size: 12 });
          next.chanjing.templates = templatesResult.list || [];
        } catch (error) {
          errors.push(`蝉镜模板：${readError(error)}`);
        }

        try {
          const voicesResult = await getDouyinVoiceLibrary(effectiveBrandId, { page: 1, size: 12 });
          next.chanjing.voices = voicesResult.list || [];
        } catch (error) {
          errors.push(`蝉镜声音：${readError(error)}`);
        }

        try {
          const videoWorksResult = await getDouyinDigitalHumanVideoWorks(effectiveBrandId);
          next.chanjing.videoWorks = videoWorksResult.items || [];
        } catch (error) {
          errors.push(`蝉镜视频：${readError(error)}`);
        }
      }

      next.errors = errors;
      if (errors.length && !next.runningHub.apps.length && !next.chanjing.templates.length && !next.chanjing.voices.length) {
        next.status = "error";
      }
      if (!cancelled) {
        setEvidence(next);
      }
    }

    void loadEvidence();
    return () => {
      cancelled = true;
    };
  }, [effectiveBrandId, isCorePlatform, platform, platformKind, selectedRunningHubAppKey]);

  if (!platform) return null;

  if (!isCorePlatform) {
    return (
      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <PanelHeader title="能力证据" badge="未接入" />
        <p className="mt-3 text-sm font-medium text-slate-500">当前平台暂无能力证据面板。</p>
      </section>
    );
  }

  const isConfigured = Boolean(platform.apiKey);
  const runningDetail = evidence.runningHub.detail;
  const nodeInfoList = runningDetail?.nodeInfoList || [];
  const runningProviderTaskCount = evidence.runningHub.works.filter((item) => Boolean(item.providerTaskId)).length;
  const chanjingCoverCount = evidence.chanjing.templates.filter((item) => item.figures?.some((figure) => Boolean(figure.cover))).length;
  const chanjingProviderTaskCount = evidence.chanjing.videoWorks.filter((item) => Boolean(item.providerTaskId)).length;
  const evidenceLevel = resolveEvidenceLevel({
    isConfigured,
    platformKind,
    nodeInfoCount: nodeInfoList.length,
    chanjingCoverCount,
    runningProviderTaskCount,
    chanjingProviderTaskCount,
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <PanelHeader
        title="能力证据"
        badge={evidence.status === "loading" ? "同步中" : evidenceLevel.label}
        badgeClassName={evidenceLevel.className}
      />

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="凭证" value={isConfigured ? "已配置" : "待配置"} tone={isConfigured ? "good" : "muted"} />
        {platformKind === "runninghub" ? (
          <>
            <MetricCard label="应用" value={String(evidence.runningHub.apps.length)} />
            <MetricCard label="参数" value={String(nodeInfoList.length)} tone={nodeInfoList.length ? "good" : "warn"} />
            <MetricCard label="作业" value={String(runningProviderTaskCount)} />
          </>
        ) : (
          <>
            <MetricCard label="模板" value={String(evidence.chanjing.templates.length)} />
            <MetricCard label="封面" value={String(chanjingCoverCount)} tone={chanjingCoverCount ? "good" : "warn"} />
            <MetricCard label="声音" value={String(evidence.chanjing.voices.length)} />
          </>
        )}
      </div>

      {evidence.errors.length ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {evidence.errors.slice(0, 2).join("；")}
        </div>
      ) : null}

      {platformKind === "runninghub" ? (
        <RunningHubEvidence
          apps={evidence.runningHub.apps}
          detail={runningDetail}
          works={evidence.runningHub.works}
          selectedAppKey={selectedRunningHubAppKey || runningDetail?.key || evidence.runningHub.apps[0]?.key || ""}
          onSelectApp={setSelectedRunningHubAppKey}
        />
      ) : (
        <ChanjingEvidence
          tagCount={evidence.chanjing.tagCount}
          templates={evidence.chanjing.templates}
          voices={evidence.chanjing.voices}
          videoWorks={evidence.chanjing.videoWorks}
        />
      )}
    </section>
  );
}

function RunningHubEvidence({
  apps,
  detail,
  works,
  selectedAppKey,
  onSelectApp,
}: {
  apps: DouyinRunningHubAppCardRecord[];
  detail?: DouyinRunningHubAppDetailRecord;
  works: DouyinRunningHubWorkRecord[];
  selectedAppKey: string;
  onSelectApp: (appKey: string) => void;
}) {
  const fields = detail?.nodeInfoList || [];
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {apps.slice(0, 8).map((app) => (
          <button
            key={app.key}
            type="button"
            onClick={() => onSelectApp(app.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              selectedAppKey === app.key
                ? "bg-indigo-600 text-white ring-indigo-600"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-indigo-50"
            }`}
          >
            {app.name}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-slate-800">{detail?.name || "未选择应用"}</div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            nodeInfoList {fields.length}
          </span>
        </div>
        {fields.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {fields.slice(0, 6).map((field, index) => (
              <div key={`${field.nodeId || index}-${field.fieldName || index}`} className="rounded-lg bg-slate-50 p-2">
                <div className="truncate text-xs font-bold text-slate-800">{field.fieldName || field.nodeName || "字段"}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {field.nodeId || "-"} / {field.fieldType || "-"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm font-medium text-slate-400">参数缺失</div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2 text-sm font-bold text-slate-800">最近作业</div>
        {works.length ? (
          <div className="space-y-2">
            {works.slice(0, 4).map((work) => (
              <div key={work.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-slate-800">{work.title || work.appName}</div>
                  <div className="truncate text-[11px] text-slate-500">{work.providerTaskId || "无 providerTaskId"}</div>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  {work.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm font-medium text-slate-400">暂无作业</div>
        )}
      </div>
    </div>
  );
}

function ChanjingEvidence({
  tagCount,
  templates,
  voices,
  videoWorks,
}: {
  tagCount: number;
  templates: DigitalHumanTemplateRecord[];
  voices: DouyinVoiceLibraryRecord[];
  videoWorks: DouyinDigitalHumanVideoWorkRecord[];
}) {
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-3">
      <EvidenceList
        title="模板"
        items={templates.slice(0, 5).map((item) => ({
          title: item.name,
          meta: `${item.figures?.length || 0} 造型 / ${item.figures?.some((figure) => Boolean(figure.cover)) ? "有封面" : "缺封面"}`,
        }))}
        empty="暂无模板"
      />
      <EvidenceList
        title="声音"
        items={voices.slice(0, 5).map((item) => ({
          title: item.name,
          meta: item.audition ? "有试听" : "无试听",
        }))}
        empty="暂无声音"
      />
      <EvidenceList
        title="作业"
        items={videoWorks.slice(0, 5).map((item) => ({
          title: item.title || item.personName,
          meta: item.providerTaskId || item.stage,
        }))}
        empty="暂无作业"
        footer={`标签 ${tagCount}`}
      />
    </div>
  );
}

function EvidenceList({
  title,
  items,
  empty,
  footer,
}: {
  title: string;
  items: Array<{ title: string; meta: string }>;
  empty: string;
  footer?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-800">{title}</div>
        {footer ? <span className="text-[11px] font-semibold text-slate-400">{footer}</span> : null}
      </div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="truncate text-xs font-bold text-slate-800">{item.title}</div>
              <div className="truncate text-[11px] text-slate-500">{item.meta}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm font-medium text-slate-400">{empty}</div>
      )}
    </div>
  );
}

function PanelHeader({ title, badge, badgeClassName }: { title: string; badge: string; badgeClassName?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassName || "bg-slate-100 text-slate-600"}`}>
        {badge}
      </span>
    </div>
  );
}

function MetricCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "warn" | "muted" }) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "muted"
          ? "text-slate-500"
          : "text-indigo-700";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-semibold text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-extrabold ${toneClass}`}>{value}</div>
    </div>
  );
}

function resolvePlatformKind(platform?: UserThirdPartyPlatformRecord) {
  const raw = [platform?.id, platform?.name, platform?.baseUrl, platform?.websiteUrl, platform?.remark].join(" ").toLowerCase();
  if (raw.includes("runninghub")) return "runninghub";
  if (raw.includes("chanjing") || raw.includes("蝉镜")) return "chanjing";
  return "other";
}

function resolveEvidenceLevel(input: {
  isConfigured: boolean;
  platformKind: "runninghub" | "chanjing" | "other";
  nodeInfoCount: number;
  chanjingCoverCount: number;
  runningProviderTaskCount: number;
  chanjingProviderTaskCount: number;
}) {
  if (!input.isConfigured) {
    return { label: "待配置", className: "bg-slate-100 text-slate-600" };
  }
  if (input.platformKind === "runninghub" && input.nodeInfoCount > 0 && input.runningProviderTaskCount > 0) {
    return { label: "证据完整", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" };
  }
  if (input.platformKind === "chanjing" && input.chanjingCoverCount > 0 && input.chanjingProviderTaskCount > 0) {
    return { label: "证据完整", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" };
  }
  if ((input.platformKind === "runninghub" && input.nodeInfoCount > 0) || (input.platformKind === "chanjing" && input.chanjingCoverCount > 0)) {
    return { label: "参数已验", className: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100" };
  }
  return { label: "部分可用", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-100" };
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "加载失败");
}
