"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* =========================================================
   S3阶段差异化5tile专用组件总入口
   5个unique key × 8实例 = 跨三平台独立UI
   非OpenClaw/非Skill MCP写=直接走Reports+Works两Controller REST
   ========================================================= */

// Use the same session, refresh, brand and stale-response checks as other workspaces.
import { request } from "../../../services/http";
import StructuredMarketingCalendar from "../../../components/marketing-calendar-workspace.client";

function apiReq<T = any>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}

function unwrapListPayload<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
}

function unwrapItemPayload<T = any>(payload: any): T | null {
  if (!payload) {
    return null;
  }
  if (payload.item && typeof payload.item === "object") {
    return payload.item as T;
  }
  if (payload.data?.item && typeof payload.data.item === "object") {
    return payload.data.item as T;
  }
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data as T;
  }
  return payload as T;
}

/* =======================================================
   ① Tile1 = CalendarWorkspace 营销日历（三平台通用）
   ======================================================= */

type SimpleCalendarItem = {
  id?: string;
  date: string;
  topic?: string;
  noteKeywords?: string[];
  contentType?: string;
  titleSuggestions?: string[];
  expectedPerformance?: string;
  festivalOrSolarTerm?: string;
};

type CalendarWorkspaceInnerProps = {
  brandId: string;
  platformTab: "xiaohongshu" | "douyin" | "wechat" | "all";
  subTabKey: "calendar";
  apiReportKind: "xiaohongshu-marketing-calendar" | "douyin-marketing-calendar" | "wechat-marketing-calendar";
};

function buildMonthMatrix(ymKey: string, items: SimpleCalendarItem[]) {
  const [y, m] = ymKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: any[] = [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const total = 42;
  for (let i = 0; i < total; i++) {
    const dayIdx = i - startOffset + 1;
    const inCurrent = dayIdx >= 1 && dayIdx <= daysInMonth;
    const dateObj = inCurrent
      ? new Date(y, m - 1, dayIdx)
      : dayIdx < 1
      ? new Date(y, m - 2, new Date(y, m - 1, 0).getDate() + dayIdx)
      : new Date(y, m, dayIdx - daysInMonth);
    const dateStr = dateObj.toISOString().slice(0, 10);
    const item = items.find((it) => it.date === dateStr);
    cells.push({
      date: dateStr,
      day: dateObj.getDate(),
      month: dateObj.getMonth() + 1,
      inCurrentMonth: inCurrent,
      isToday: dateStr === todayStr,
      isRestDay: dateObj.getDay() === 0 || dateObj.getDay() === 6,
      item,
      lunarLabel: "",
      gregorianFestivals: [] as string[],
      solarTerm: "",
    });
  }
  return cells;
}

export function CalendarWorkspace(props: CalendarWorkspaceInnerProps) { return <StructuredMarketingCalendar key={`${props.brandId}:${props.platformTab}`} brandId={props.brandId} platform={props.platformTab} />; }

function LegacyCalendarWorkspace(props: CalendarWorkspaceInnerProps) {
  const { brandId, platformTab, apiReportKind } = props;
  const reportPath = `/reports/brands/${brandId}/${apiReportKind}`;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState<SimpleCalendarItem[]>([]);
  const [reportId, setReportId] = useState<string>("");
  const today = new Date();
  const initialYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [visibleYM, setVisibleYM] = useState(initialYM);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selDate, setSelDate] = useState<string>("");
  const [draft, setDraft] = useState<SimpleCalendarItem | null>(null);

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const data = await apiReq<any>(`${reportPath}?workspaceScope=${platformTab === "all" ? "all" : platformTab}`);
      const workspace = data?.latest || data?.data?.latest || data || {};
      const list = (workspace?.items || data?.items || data?.data?.items || data?.calendarItems || []) as any[];
      const normalized: SimpleCalendarItem[] = list.map((it) => ({
        id: it.id,
        date: it.date,
        topic:
          it.topic ||
          it.brandMarketing?.theme ||
          it.xiaohongshu?.brandAccount?.topic ||
          it.douyin?.brandAccount?.topic ||
          it.moments?.topic ||
          "",
        festivalOrSolarTerm: it.festivalOrSolarTerm || "",
        noteKeywords:
          it.xiaohongshu?.brandAccount?.noteKeywords ||
          it.douyin?.brandAccount?.copyKeywords ||
          it.noteKeywords ||
          [],
        titleSuggestions:
          it.xiaohongshu?.brandAccount?.titleSuggestions ||
          it.douyin?.brandAccount?.titleSuggestions ||
          it.titleSuggestions ||
          [],
        contentType:
          it.contentType ||
          it.xiaohongshu?.brandAccount?.contentType ||
          it.douyin?.brandAccount?.contentType ||
          "",
        expectedPerformance:
          it.expectedPerformance ||
          it.xiaohongshu?.brandAccount?.expectedPerformance ||
          it.douyin?.brandAccount?.expectedPerformance ||
          it.moments?.presentationFormat ||
          "",
      }));
      setItems(normalized);
      if (workspace?.id) setReportId(workspace.id);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [brandId, platformTab]);

  const monthCells = useMemo(() => buildMonthMatrix(visibleYM, items), [visibleYM, items]);
  function shift(n: number) {
    const [yy, mm] = visibleYM.split("-").map(Number);
    const d = new Date(yy, mm - 1 + n, 1);
    setVisibleYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function openDetail(date: string, _itemId?: string) {
    const exist = items.find((i) => i.date === date) || null;
    setSelDate(date);
    setDraft(exist || { date, topic: "", noteKeywords: [], titleSuggestions: [] });
    setEditing(false);
    setDetailOpen(true);
  }
  function closeDetail() {
    setDetailOpen(false);
    setDraft(null);
    setEditing(false);
  }
  async function saveDetail() {
    if (!draft) return;
    setSaving(true);
    setErr("");
    try {
      const payload: any = {
        date: draft.date,
        festivalOrSolarTerm: draft.festivalOrSolarTerm || "",
      };
      if (platformTab === "xiaohongshu" || platformTab === "all") {
        payload.xiaohongshu = {
          brandAccount: {
            topic: draft.topic || "",
            noteKeywords: draft.noteKeywords || [],
            contentType: draft.contentType || "",
            titleSuggestions: draft.titleSuggestions || [],
            expectedPerformance: draft.expectedPerformance || "",
          },
        };
      }
      if (platformTab === "douyin" || platformTab === "all") {
        payload.douyin = {
          brandAccount: {
            topic: draft.topic || "",
            copyKeywords: draft.noteKeywords || [],
            contentType: draft.contentType || "",
            presentationFormat: draft.expectedPerformance || "",
            titleSuggestions: draft.titleSuggestions || [],
            expectedPerformance: draft.expectedPerformance || "",
          },
        };
      }
      if (platformTab === "wechat" || platformTab === "all") {
        payload.moments = {
          topic: draft.topic || "",
          presentationFormat: draft.contentType || draft.expectedPerformance || "",
        };
      }
      if (reportId) {
        await apiReq(`${reportPath}/${reportId}/items/${draft.date}?workspaceScope=${platformTab === "all" ? "all" : platformTab}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      await refresh();
      setEditing(false);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  const [yyyy, mmm] = visibleYM.split("-");
  const labelText = `${yyyy}年${Number(mmm)}月`;

  return (
    <article className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>营销日历</strong>
        </div>
        <div className="strategy-inline-actions">
          <button type="button" className="secondary-button" onClick={() => void refresh()} disabled={loading || saving}>
            刷新结果
          </button>
        </div>
      </div>

      <section className="calendar-month-shell">
        <div className="calendar-month-toolbar">
          <div className="calendar-month-toolbar__main">
            <div className="calendar-month-nav">
              <button type="button" className="calendar-nav-button" onClick={() => shift(-1)}>
                &lt;
              </button>
              <button type="button" className="calendar-nav-button" onClick={() => shift(1)}>
                &gt;
              </button>
            </div>
            <div className="calendar-month-toolbar__label">
              <strong>{labelText}</strong>
            </div>
          </div>
        </div>
        {err ? <div className="report-inline-tip report-inline-tip--error">{err}</div> : null}
        {!items.length && !loading ? (
          <div className="calendar-month-empty">本月日历为空</div>
        ) : null}
        <div role="region" aria-label="营销日历，可横向滚动" tabIndex={0} style={{ maxWidth: "100%", overflowX: "auto" }}>
        <div style={{ minWidth: 700 }}>
        <div className="calendar-weekdays" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {["周日", "周一", "周二", "周三", "周四", "周五", "周六"].map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
        <div className="calendar-grid calendar-grid--month calendar-grid--month-view" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {monthCells.map((cell) => (
            <article
              key={cell.date}
              className={[
                "calendar-month-cell",
                cell.inCurrentMonth ? "" : "is-outside-month",
                cell.isToday ? "is-today" : "",
                cell.isRestDay ? "is-rest-day" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="button"
              tabIndex={0}
              onClick={() => openDetail(cell.date, cell.item?.id)}
            >
              <div className="calendar-month-cell__header">
                <div className="calendar-month-cell__date">
                  <strong>{cell.inCurrentMonth ? cell.day : `${cell.month}/${cell.day}`}</strong>
                  <span>{cell.lunarLabel}</span>
                </div>
              </div>
              <div className="calendar-month-cell__body">
                {cell.item ? (
                  <div className="calendar-month-entry">
                    <p className="calendar-month-entry__title">{cell.item.topic || "已创建"}</p>
                  </div>
                ) : (
                  <div className="calendar-month-entry calendar-month-entry--placeholder" />
                )}
              </div>
            </article>
          ))}
        </div>
        </div>
        </div>
      </section>

      {detailOpen && draft ? (
        <div className="media-preview-overlay" onClick={closeDetail}>
          <div className="media-preview-dialog calendar-detail-dialog" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="media-preview-close" onClick={closeDetail}>
              关闭
            </button>
            <article className="entity-card personal-card calendar-detail-card calendar-detail-card--plain">
              <div className="calendar-detail-header">
                <div>
                  <strong>{draft.topic || "填写当天营销日历"}</strong>
                  <p className="personal-meta">{selDate}</p>
                </div>
                <div className="calendar-detail-actions">
                  {editing ? (
                    <>
                      <button type="button" className="secondary-button" onClick={() => setEditing(false)} disabled={saving}>
                        取消
                      </button>
                      <button type="button" className="primary-button" onClick={() => void saveDetail()} disabled={saving}>
                        {saving ? "保存中..." : "保存当天内容"}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="secondary-button" onClick={() => setEditing(true)}>
                      编辑当天内容
                    </button>
                  )}
                </div>
              </div>

              <div className="calendar-detail-plain-grid">
                <div className="calendar-detail-plain-column">
                  <CalField label="日期" value={draft.date} edit={editing} onChange={(v) => setDraft({ ...draft, date: v })} />
                  <CalField
                    label="节日/节气"
                    value={draft.festivalOrSolarTerm || ""}
                    edit={editing}
                    onChange={(v) => setDraft({ ...draft, festivalOrSolarTerm: v })}
                  />
                  <div style={{ margin: "8px 0", fontWeight: 600 }}>品牌营销板块</div>
                  <CalField
                    label="今日营销主题"
                    value={draft.topic || ""}
                    edit={editing}
                    onChange={(v) => setDraft({ ...draft, topic: v })}
                  />
                  <CalField
                    label="作品类型"
                    value={draft.contentType || ""}
                    edit={editing}
                    onChange={(v) => setDraft({ ...draft, contentType: v })}
                  />
                  <CalField
                    label="笔记关键词"
                    value={(draft.noteKeywords || []).join("\n")}
                    multiline
                    edit={editing}
                    onChange={(v) => setDraft({ ...draft, noteKeywords: v.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  />
                  <CalField
                    label="标题建议"
                    value={(draft.titleSuggestions || []).join("\n")}
                    multiline
                    edit={editing}
                    onChange={(v) => setDraft({ ...draft, titleSuggestions: v.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  />
                  <CalField
                    label="预期效果"
                    value={draft.expectedPerformance || ""}
                    multiline
                    edit={editing}
                    onChange={(v) => setDraft({ ...draft, expectedPerformance: v })}
                  />
                </div>
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function CalField(p: { label: string; value: string; edit: boolean; multiline?: boolean; onChange: (v: string) => void }) {
  return (
    <div className="calendar-detail-row">
      <span>{p.label}</span>
      {p.edit ? (
        p.multiline ? (
          <textarea value={p.value} rows={5} onChange={(e) => p.onChange(e.target.value)} />
        ) : (
          <input value={p.value} onChange={(e) => p.onChange(e.target.value)} />
        )
      ) : (
        <strong>{p.value?.trim() || "未填写"}</strong>
      )}
    </div>
  );
}

/* =======================================================
   ② Tile2 = AvatarWorkspace 数字人（仅抖音）
   1:1 对齐原系统 digital-human-workspace + voice-library-workspace
   REST 端点严格对应 works.controller.ts L729-856
   ======================================================= */

type AvatarInnerProps = { brandId: string; platformTab: string };

const AVATAR_MENU: { key: string; label: string; icon: string }[] = [
  { key: "home", label: "数字人工作台", icon: "🏠" },
  { key: "template", label: "模板库", icon: "🖼️" },
  { key: "voice", label: "语音库", icon: "🔊" },
  { key: "custom", label: "自定义数字人", icon: "🧍" },
  { key: "lipsync", label: "口型同步生成", icon: "💋" },
  { key: "generate", label: "作品生成", icon: "🎬" },
  { key: "favorite", label: "收藏夹", icon: "⭐" },
];

type AvatarVoiceRecord = {
  id: string;
  name: string;
  gender?: string;
  lang?: string;
  desc?: string;
  audition?: string;
  isCustom: boolean;
  status?: string;
  raw?: any;
};

type AvatarTemplateRecord = {
  id?: string;
  templateId?: string;
  name?: string;
  title?: string;
  coverUrl?: string;
  audioManId?: string;
  audioName?: string;
  audioPreview?: string;
  audioLang?: string;
  gender?: string;
  figures?: Array<{
    type?: string;
    cover?: string;
    width?: number;
    height?: number;
    previewVideoUrl?: string;
    bgReplace?: boolean;
  }>;
  tags?: string[];
  tagNames?: string[];
  figureType?: string;
};

function getTemplateId(template: AvatarTemplateRecord) {
  return String(template.id || template.templateId || "");
}

function resolveTemplateCover(template: AvatarTemplateRecord) {
  if (template.coverUrl) return template.coverUrl;
  const figures = Array.isArray(template.figures) ? template.figures : [];
  return (
    figures.find((item) => item.type === "whole_body")?.cover ||
    figures.find((item) => item.type === "sit_body")?.cover ||
    figures[0]?.cover ||
    ""
  );
}

function resolveTemplateFigureType(template: AvatarTemplateRecord) {
  if (template.figureType) return template.figureType;
  const figures = Array.isArray(template.figures) ? template.figures : [];
  return figures[0]?.type || "";
}

function resolveTemplateTags(template: AvatarTemplateRecord) {
  return Array.isArray(template.tagNames) && template.tagNames.length ? template.tagNames : (template.tags || []);
}

function getTemplateFigureTypeLabel(type?: string) {
  const value = String(type || "").trim();
  const labels: Record<string, string> = {
    whole_body: "全身",
    sit_body: "半身",
    circle_view: "圆形",
  };
  return labels[value] || value || "造型";
}

type AvatarVideoRecord = {
  id: string;
  title?: string;
  templateName?: string;
  templateId?: string;
  stage?: string;
  status?: string;
  createdAt?: string;
  videoUrl?: string;
  coverUrl?: string;
};

type AvatarCustomPersonRecord = {
  id: string;
  name: string;
  status?: string;
  createdAt?: string;
  coverUrl?: string;
  support4k?: boolean;
};

export function AvatarWorkspace(p: AvatarInnerProps) {
  const { brandId } = p;
  const [menu, setMenu] = useState("home");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  /* ---------- template ---------- */
  const [templateTags, setTemplateTags] = useState<any[]>([]);
  const [templates, setTemplates] = useState<AvatarTemplateRecord[]>([]);
  const [templatePageInfo, setTemplatePageInfo] = useState<any>({});
  const [activeTagId, setActiveTagId] = useState<string>("");
  const [previewTemplateId, setPreviewTemplateId] = useState("");
  const [previewFigureType, setPreviewFigureType] = useState("");

  /* ---------- voice library ---------- */
  const [publicVoices, setPublicVoices] = useState<AvatarVoiceRecord[]>([]);
  const [customVoices, setCustomVoices] = useState<AvatarVoiceRecord[]>([]);
  const [publicVoicePageInfo, setPublicVoicePageInfo] = useState<any>({});
  const [customVoicePageInfo, setCustomVoicePageInfo] = useState<any>({});
  const [voiceTab, setVoiceTab] = useState<"PUBLIC" | "CUSTOM">("PUBLIC");
  const [voiceSearch, setVoiceSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [activeDialog, setActiveDialog] = useState<null | "TEMPLATE" | "CLONE" | "SYNTHESIS">(null);
  const [submitting, setSubmitting] = useState(false);

  /* ---------- voice clone form ---------- */
  const [cloneName, setCloneName] = useState("");
  const [cloneModelType, setCloneModelType] = useState("cicada3.0");
  const [cloneLanguage, setCloneLanguage] = useState("cn");
  const [clonePreviewText, setClonePreviewText] = useState("");
  const [cloneAudioFile, setCloneAudioFile] = useState<File | null>(null);

  /* ---------- voice synthesis form ---------- */
  const [synthesisVoiceId, setSynthesisVoiceId] = useState("");
  const [speechText, setSpeechText] = useState("");
  const [speechSpeed, setSpeechSpeed] = useState("1");
  const [speechPitch, setSpeechPitch] = useState("1");
  const [speechDialect, setSpeechDialect] = useState("0");
  const [currentSpeechTaskId, setCurrentSpeechTaskId] = useState<string>("");
  const [currentSpeechTask, setCurrentSpeechTask] = useState<any>(null);

  /* ---------- works & others ---------- */
  const [videos, setVideos] = useState<AvatarVideoRecord[]>([]);
  const [customPersons, setCustomPersons] = useState<AvatarCustomPersonRecord[]>([]);

  /* ---------- data loaders ---------- */
  async function loadTemplateTags() {
    try {
      const data = await apiReq<any>(`/works/brands/${brandId}/douyin/digital-human/template-tags`);
      setTemplateTags(data?.items || data?.tagGroups || data || []);
    } catch { /* ignore */ }
  }
  async function loadTemplates(page = 1) {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), size: "18" });
      if (activeTagId) qs.set("tagIds", String(activeTagId));
      const data = await apiReq<any>(`/works/brands/${brandId}/douyin/digital-human/templates?${qs.toString()}`);
      const maybe = data?.list ?? data?.items ?? data?.templates ?? data;
      const rows = Array.isArray(maybe) ? (maybe as AvatarTemplateRecord[]) : [];
      setTemplates(rows);
      setTemplatePageInfo({
        page: data?.page || data?.pageInfo?.page || 1,
        totalPage: data?.totalPage || data?.pageInfo?.totalPage || 1,
        totalCount: data?.totalCount || data?.pageInfo?.totalCount || rows.length,
      });
      setMsg("");
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }
  async function loadPublicVoices(page = 1) {
    setLoading(true);
    try {
      const data = await apiReq<any>(`/works/brands/${brandId}/douyin/digital-human/voice-library?page=${page}&size=18`);
      const maybe = data?.list ?? data?.items ?? data?.voices ?? data;
      const rows = Array.isArray(maybe) ? (maybe as any[]) : [];
      const list = rows.map((v: any) => ({
        id: String(v.id || v.voiceId || v.audioManId || v.key || ""),
        name: v.name || v.voiceName || v.label || "未命名声音",
        gender: v.gender,
        lang: v.lang || v.language,
        desc: v.desc || v.description,
        audition: v.audition || v.previewAudio || v.previewUrl,
        isCustom: false,
      }));
      setPublicVoices(list);
      setPublicVoicePageInfo({
        page: data?.page || data?.pageInfo?.page || 1,
        totalPage: data?.totalPage || data?.pageInfo?.totalPage || 1,
        totalCount: data?.totalCount || data?.pageInfo?.totalCount || list.length,
      });
      if (list.length && !selectedVoiceId) setSelectedVoiceId(list[0].id);
      setMsg("");
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }
  async function loadCustomVoices(page = 1) {
    setLoading(true);
    try {
      const data = await apiReq<any>(`/works/brands/${brandId}/douyin/digital-human/voice-library/custom?page=${page}&pageSize=18`);
      const maybe = data?.list ?? data?.items ?? data?.voices ?? data;
      const rows = Array.isArray(maybe) ? (maybe as any[]) : [];
      const list = rows.map((v: any) => ({
        id: String(v.id || v.voiceId || v.customVoiceId || v.key || ""),
        name: v.name || v.voiceName || "我的定制声音",
        gender: v.gender,
        lang: v.lang || v.language,
        desc: v.desc || v.description,
        audition: v.audition || v.previewAudio || v.previewUrl,
        isCustom: true,
        status: v.status || v.trainStatus,
        raw: v,
      }));
      setCustomVoices(list);
      setCustomVoicePageInfo({
        page: data?.page || data?.pageInfo?.page || 1,
        totalPage: data?.totalPage || data?.pageInfo?.totalPage || 1,
        totalCount: data?.totalCount || data?.pageInfo?.totalCount || list.length,
      });
      setMsg("");
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }
  async function loadVideos() {
    setLoading(true);
    try {
      const data = await apiReq<any>(`/works/brands/${brandId}/douyin/digital-human/video`);
      setVideos((data?.items || data?.works || data || []) as AvatarVideoRecord[]);
      setMsg("");
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }
  async function loadCustomPersons() {
    setLoading(true);
    try {
      const data = await apiReq<any>(`/works/brands/${brandId}/douyin/digital-human/custom-person`);
      setCustomPersons((data?.items || data?.persons || data || []) as AvatarCustomPersonRecord[]);
      setMsg("");
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }
  async function refreshSpeechTask(taskId: string) {
    if (!taskId) return;
    try {
      const data = await apiReq<any>(`/works/brands/${brandId}/douyin/digital-human/voice-library/speech/${taskId}`);
      setCurrentSpeechTask(data?.item || data?.task || data);
    } catch { /* ignore */ }
  }
  async function deleteCustomVoice(voiceId: string) {
    if (!voiceId || submitting) return;
    setSubmitting(true);
    try {
      await apiReq(`/works/brands/${brandId}/douyin/digital-human/voice-library/custom/${voiceId}`, { method: "DELETE" });
      await loadCustomVoices();
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }
  async function submitCloneVoice() {
    if (!cloneAudioFile || submitting) return;
    setSubmitting(true);
    setMsg("");
    try {
      const fd = new FormData();
      if (cloneName.trim()) fd.append("name", cloneName.trim());
      fd.append("modelType", cloneModelType);
      fd.append("language", cloneLanguage);
      if (clonePreviewText.trim()) fd.append("text", clonePreviewText.trim());
      fd.append("audioFile", cloneAudioFile);
      await apiReq(`/works/brands/${brandId}/douyin/digital-human/voice-library/custom`, { method: "POST", body: fd });
      setCloneName("");
      setClonePreviewText("");
      setCloneAudioFile(null);
      setActiveDialog(null);
      setVoiceTab("CUSTOM");
      await loadCustomVoices();
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }
  async function submitSynthesis() {
    if (!synthesisVoiceId || !speechText.trim() || submitting) return;
    setSubmitting(true);
    setMsg("");
    try {
      const payload = {
        audioManId: synthesisVoiceId,
        text: speechText.trim(),
        speed: Number(speechSpeed || 1),
        pitch: Number(speechPitch || 1),
        dialect: Number(speechDialect || 0),
      };
      const data = await apiReq<any>(`/works/brands/${brandId}/douyin/digital-human/voice-library/speech`, { method: "POST", body: JSON.stringify(payload) });
      const taskId = data?.item?.id || data?.taskId || data?.id;
      if (taskId) {
        setCurrentSpeechTaskId(String(taskId));
        await refreshSpeechTask(String(taskId));
      }
      setSpeechText("");
      setActiveDialog(null);
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }
  useEffect(() => {
    if (menu === "template") {
      if (!templateTags.length) void loadTemplateTags();
      void loadTemplates();
    } else if (menu === "voice") {
      void loadPublicVoices();
      void loadCustomVoices();
    } else if (menu === "generate" || menu === "home") {
      void loadVideos();
    } else if (menu === "custom") {
      void loadCustomPersons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, brandId]);

  /* ---------- derived voice data ---------- */
  const allVoices: AvatarVoiceRecord[] = [...publicVoices, ...customVoices];
  const activeVoiceList = voiceTab === "PUBLIC" ? publicVoices : customVoices;
  const filteredVoices = useMemo(() => {
    const q = voiceSearch.trim().toLowerCase();
    return activeVoiceList.filter((v) => {
      if (q && !(v.name + " " + (v.desc || "") + " " + (v.lang || "")).toLowerCase().includes(q)) return false;
      if (voiceTab === "PUBLIC") {
        if (genderFilter !== "ALL" && v.gender !== genderFilter) return false;
        if (languageFilter !== "ALL" && v.lang !== languageFilter) return false;
      }
      return true;
    });
  }, [activeVoiceList, voiceSearch, genderFilter, languageFilter, voiceTab]);
  const selectedVoice = useMemo(() => allVoices.find((x) => x.id === selectedVoiceId) || publicVoices[0] || customVoices[0] || null, [allVoices, publicVoices, customVoices, selectedVoiceId]);
  const synthesisVoice = useMemo(() => allVoices.find((x) => x.id === synthesisVoiceId) || selectedVoice || allVoices[0] || null, [allVoices, synthesisVoiceId, selectedVoice]);

  useEffect(() => {
    if (activeDialog !== "SYNTHESIS") return;
    if (synthesisVoiceId && allVoices.some((x) => x.id === synthesisVoiceId)) return;
    if (selectedVoice?.id) { setSynthesisVoiceId(selectedVoice.id); return; }
    if (allVoices[0]?.id) setSynthesisVoiceId(allVoices[0].id);
  }, [activeDialog, synthesisVoiceId, selectedVoice?.id, allVoices]);

  const publicPages = Array.from({ length: publicVoicePageInfo?.totalPage || 0 }, (_, i) => i + 1);
  const customPages = Array.from({ length: customVoicePageInfo?.totalPage || 0 }, (_, i) => i + 1);
  const templatePages = Array.from({ length: templatePageInfo?.totalPage || 0 }, (_, i) => i + 1);
  if (!publicPages.length && publicVoices.length) publicPages.push(1);
  if (!customPages.length && customVoices.length) customPages.push(1);
  if (!templatePages.length && templates.length) templatePages.push(1);

  const previewTemplate = useMemo(
    () => templates.find((item) => getTemplateId(item) === previewTemplateId) || null,
    [templates, previewTemplateId],
  );
  const previewFigure = useMemo(() => {
    if (!previewTemplate) return null;
    const figures = Array.isArray(previewTemplate.figures) ? previewTemplate.figures : [];
    return figures.find((item) => item.type === previewFigureType) || figures[0] || null;
  }, [previewFigureType, previewTemplate]);
  const previewTags = previewTemplate ? resolveTemplateTags(previewTemplate) : [];

  function openTemplatePreview(template: AvatarTemplateRecord, figureType?: string) {
    const templateId = getTemplateId(template);
    if (!templateId) return;
    const figures = Array.isArray(template.figures) ? template.figures : [];
    setPreviewTemplateId(templateId);
    setPreviewFigureType(figureType || figures[0]?.type || "");
    setActiveDialog("TEMPLATE");
  }

  function useTemplateForGenerate(template: AvatarTemplateRecord, figureType?: string) {
    const templateName = template.name || template.title || "模板";
    const nextFigureType = figureType || resolveTemplateFigureType(template);
    setPreviewTemplateId(getTemplateId(template));
    setPreviewFigureType(nextFigureType);
    setMenu("generate");
    setActiveDialog(null);
    setMsg(`已选择 ${templateName}${nextFigureType ? ` · ${getTemplateFigureTypeLabel(nextFigureType)}` : ""}`);
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <header className="mb-3 flex flex-row items-center justify-between gap-2">
        <div>
          <strong className="text-[14px] text-slate-900">数字人工作台</strong>
        </div>
        <button type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          onClick={() => {
          if (menu === "template") { void loadTemplateTags(); void loadTemplates(); }
          else if (menu === "voice") { void loadPublicVoices(); void loadCustomVoices(); }
          else if (menu === "generate" || menu === "home") { void loadVideos(); }
          else if (menu === "custom") { void loadCustomPersons(); }
        }} disabled={loading}>
          刷新
        </button>
      </header>
      {msg ? <div className="report-inline-tip report-inline-tip--error">{msg}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))", gap: 12 }}>
        {AVATAR_MENU.map((m) => (
          <button key={m.key} type="button"
            style={{
              margin: 0,
              padding: "12px 10px",
              background: menu === m.key ? "linear-gradient(135deg,#eef2ff,#e0f2fe)" : "#ffffff",
              borderRadius: 12,
              border: `1px solid ${menu === m.key ? "#6366f1" : "#e2e8f0"}`,
              boxShadow: menu === m.key ? "0 2px 6px rgba(99,102,241,.18)" : "0 1px 3px rgba(15,23,42,.05)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 6,
              cursor: "pointer",
              transition: "all .15s ease",
              width: "100%",
              minHeight: 82,
            }}
            onClick={() => setMenu(m.key)}>
            <div style={{ fontSize: 20, lineHeight: "24px" }}>{m.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", lineHeight: "16px", textAlign: "center", wordBreak: "break-all" }}>{m.label}</div>
          </button>
        ))}
      </div>

      <div className="workspace-list-shell" style={{ marginTop: 18 }}>
        {/* ===== Home / Generate (作品中心) ===== */}
        {(menu === "home" || menu === "generate") ? (
          <>
            {menu === "generate" && previewTemplate ? (
              <div className="entity-card personal-card" style={{ marginBottom: 12 }}>
                <strong>已选模板：{previewTemplate.name || previewTemplate.title || "数字人模板"}</strong>
                <p className="panel-subtext" style={{ marginTop: 8 }}>
                  {[getTemplateFigureTypeLabel(previewFigure?.type || previewFigureType), previewTemplate.audioName ? `默认音色：${previewTemplate.audioName}` : ""].filter(Boolean).join(" / ")}
                </p>
              </div>
            ) : null}
            <SimpleTable
              title={menu === "home" ? "最近作品" : "作品列表"}
              cols={["作品ID", "模板", "状态", "创建时间", "操作"]}
              rows={videos.map((w) => [
                w.id,
                w.templateName || w.templateId || "-",
                w.stage || w.status || "-",
                w.createdAt || "-",
                w.videoUrl ? "预览/删除" : "查看/删除",
              ])}
              loading={loading}
            />
          </>
        ) : menu === "template" ? (
          /* ===== Template Library ===== */
          <div>
            {templateTags.length ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                <button type="button" className={!activeTagId ? "primary-button" : "secondary-button"}
                  onClick={async () => { setActiveTagId(""); await loadTemplates(); }}>
                  全部
                </button>
                {templateTags.map((tg: any) => {
                  const tid = String(tg.id ?? tg.tagId ?? "");
                  const label = tg.name ?? tg.tagName ?? tg.label ?? "";
                  return (
                    <button key={tid} type="button" className={activeTagId === tid ? "primary-button" : "secondary-button"}
                      onClick={async () => { setActiveTagId(tid); await loadTemplates(); }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 8 }}>
              {templates.map((t, idx) => {
                const cover = resolveTemplateCover(t);
                const figureType = resolveTemplateFigureType(t);
                const tags = resolveTemplateTags(t);
                const templateId = getTemplateId(t);
                const isActive = templateId && templateId === previewTemplateId;
                return (
                  <article
                    key={t.id || t.templateId || idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => openTemplatePreview(t, figureType)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openTemplatePreview(t, figureType);
                      }
                    }}
                    style={{
                      background: "#fff",
                      border: `1px solid ${isActive ? "#6366f1" : "#e2e8f0"}`,
                      borderRadius: 12,
                      padding: 10,
                      boxShadow: isActive ? "0 12px 28px rgba(99,102,241,.18)" : "0 1px 2px rgba(15,23,42,.05)",
                      cursor: "pointer",
                    }}
                  >
                    {cover ? (
                      <img src={cover} alt={t.name || t.title || "数字人模板"} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", objectPosition: "center top", borderRadius: 8, background: "#1f2937" }} />
                    ) : (
                      <div style={{ aspectRatio: "3/4", background: "linear-gradient(135deg,#312e81,#6366f1)", borderRadius: 8, color: "#fff", display: "grid", placeItems: "center", fontSize: 12 }}>
                        模板预览
                      </div>
                    )}
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{t.name || t.title || "模板"}</div>
                    <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
                      {figureType ? `${figureType}` : ""}
                      {tags.length ? `${figureType ? " · " : ""}${tags.slice(0, 4).join("·")}` : ""}
                      {!figureType && !tags.length ? "-" : ""}
                    </div>
                    <div className="strategy-inline-actions" style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openTemplatePreview(t, figureType);
                        }}
                      >
                        查看详情
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={!templateId}
                        onClick={(event) => {
                          event.stopPropagation();
                          useTemplateForGenerate(t, figureType);
                        }}
                      >
                        使用模板
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {templatePages.length > 1 ? (
              <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
                {templatePages.map((page) => (
                  <button key={page} type="button" className={(templatePageInfo.page || 1) === page ? "primary-button" : "secondary-button"}
                    disabled={loading || submitting}
                    onClick={() => void loadTemplates(page)}>{page}</button>
                ))}
              </div>
            ) : null}
          </div>
        ) : menu === "voice" ? (
          /* ===== Voice Library (按用户截图 1:1) ===== */
          <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ padding: 0 }}>
            <div className="report-editor-head" style={{ padding: "12px 16px" }}>
              <div>
                <strong>语音库</strong>
              </div>
              <div className="report-editor-actions">
                <span className={`archive-pill ${(publicVoicePageInfo.totalCount || publicVoices.length) || (customVoicePageInfo.totalCount || customVoices.length) ? "status-ready" : "status-in_progress"}`}>
                  公共 {publicVoicePageInfo.totalCount || publicVoices.length} / 我的 {customVoicePageInfo.totalCount || customVoices.length}
                </span>
                <button type="button" className="primary-button" disabled={submitting}
                  onClick={() => setActiveDialog("CLONE")}>
                  声音克隆
                </button>
                <button type="button" className="secondary-button" disabled={submitting || !allVoices.length}
                  onClick={() => { setActiveDialog("SYNTHESIS"); if (selectedVoice?.id) setSynthesisVoiceId(selectedVoice.id); }}>
                  语音合成
                </button>
                <button type="button" className="secondary-button" disabled={submitting || loading}
                  onClick={() => { void loadPublicVoices(); void loadCustomVoices(); }}>
                  刷新列表
                </button>
              </div>
            </div>

            <div style={{ padding: "0 16px 16px" }}>
              <div className="digital-human-voice-library__toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0" }}>
                <div className="strategy-inline-actions">
                  <button type="button" className={voiceTab === "PUBLIC" ? "primary-button" : "secondary-button"} onClick={() => setVoiceTab("PUBLIC")}>公共声音</button>
                  <button type="button" className={voiceTab === "CUSTOM" ? "primary-button" : "secondary-button"} onClick={() => setVoiceTab("CUSTOM")}>我的声音</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: voiceTab === "PUBLIC" ? "repeat(3, minmax(0,1fr))" : "1fr", gap: 10, marginBottom: 12 }}>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span>搜索声音</span>
                  <input value={voiceSearch} onChange={(e) => setVoiceSearch(e.target.value)} placeholder="搜索名称、描述或语种" />
                </label>
                {voiceTab === "PUBLIC" ? (
                  <>
                    <label className="field" style={{ marginBottom: 0 }}>
                      <span>性别</span>
                      <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
                        <option value="ALL">全部</option><option value="female">女声</option><option value="male">男声</option>
                      </select>
                    </label>
                    <label className="field" style={{ marginBottom: 0 }}>
                      <span>语种</span>
                      <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
                        <option value="ALL">全部</option><option value="multilingual">多语种</option><option value="cn">中文</option><option value="en">英文</option>
                      </select>
                    </label>
                  </>
                ) : null}
              </div>

              {selectedVoice ? (
                <div className="entity-card personal-card" style={{ marginBottom: 12 }}>
                  <div>
                    <strong>当前选中：{selectedVoice.name}</strong>
                    <p className="panel-subtext" style={{ marginTop: 8 }}>
                      {[selectedVoice.gender, selectedVoice.lang, selectedVoice.desc].filter(Boolean).join(" / ") || "暂无更多描述"}
                    </p>
                  </div>
                  <div className="strategy-inline-actions" style={{ marginTop: 8 }}>
                    <button type="button" className="primary-button" disabled={submitting}
                      onClick={() => { setSynthesisVoiceId(selectedVoice.id); setActiveDialog("SYNTHESIS"); }}>
                      用这个声音合成
                    </button>
                    {selectedVoice.isCustom ? (
                      <button type="button" className="secondary-button" disabled={submitting} onClick={() => void deleteCustomVoice(selectedVoice.id)}>删除声音</button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <article className="report-editor-pane" style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span>{voiceTab === "PUBLIC" ? "声音列表" : "我的声音"}</span>
                  <small className="panel-subtext">已筛选 {filteredVoices.length} 个声音</small>
                </div>
                {!filteredVoices.length ? (
                  <div className="empty-state" style={{ marginTop: 12 }}>
                    {voiceTab === "PUBLIC" ? "暂无公共声音" : "暂无定制声音"}
                  </div>
                ) : (
                  <div className="xhs-material-card-grid">
                    {filteredVoices.map((item) => (
                      <article key={item.id} className={`entity-card personal-card ${selectedVoice?.id === item.id ? "is-active" : ""}`}>
                        <button type="button" style={{ width: "100%", textAlign: "left" }} onClick={() => setSelectedVoiceId(item.id)}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>{item.isCustom ? "我的声音" : "公共声音"}</span>
                            <span className={`archive-pill status-ready`}>{item.isCustom ? (item.status || "定制中") : "可试听"}</span>
                          </div>
                        </button>
                        <div style={{ marginTop: 8 }}>
                          <strong>{item.name}</strong>
                          <p className="panel-subtext">{[item.gender, item.lang, item.desc].filter(Boolean).join(" / ") || "暂无更多描述"}</p>
                          {item.audition ? (
                            <audio controls preload="none" src={item.audition} style={{ width: "100%", marginTop: 8 }} />
                          ) : <p className="panel-subtext" style={{ marginTop: 8 }}>当前暂无试听音频。</p>}
                          <div className="strategy-inline-actions" style={{ marginTop: 8 }}>
                            <button type="button" className="primary-button" disabled={submitting}
                              onClick={() => { setSynthesisVoiceId(item.id); setActiveDialog("SYNTHESIS"); }}>
                              语音合成
                            </button>
                            {item.isCustom ? (
                              <button type="button" className="secondary-button" disabled={submitting} onClick={() => void deleteCustomVoice(item.id)}>删除</button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {voiceTab === "PUBLIC" && publicPages.length > 1 ? (
                  <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
                    {publicPages.map((page) => (
                      <button key={page} type="button" className={(publicVoicePageInfo.page || 1) === page ? "primary-button" : "secondary-button"}
                        disabled={submitting || loading} onClick={() => void loadPublicVoices(page)}>{page}</button>
                    ))}
                  </div>
                ) : null}
                {voiceTab === "CUSTOM" && customPages.length > 1 ? (
                  <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
                    {customPages.map((page) => (
                      <button key={page} type="button" className={(customVoicePageInfo.page || 1) === page ? "primary-button" : "secondary-button"}
                        disabled={submitting || loading} onClick={() => void loadCustomVoices(page)}>{page}</button>
                    ))}
                  </div>
                ) : null}
              </article>

              <div className="entity-card personal-card" style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>最近一次语音合成</span>
                  <div className="strategy-inline-actions">
                    <small className="panel-subtext">{currentSpeechTaskId || currentSpeechTask?.id || "暂无任务"}</small>
                    <button type="button" className="secondary-button" disabled={submitting || !currentSpeechTaskId}
                      onClick={() => void refreshSpeechTask(currentSpeechTaskId)}>
                      刷新结果
                    </button>
                  </div>
                </div>
                {currentSpeechTask ? (
                  <>
                    <p className="personal-meta" style={{ marginTop: 8 }}>
                      任务状态：{currentSpeechTask.status || currentSpeechTask.stage || "-"}
                    </p>
                    {currentSpeechTask.full?.url || currentSpeechTask.audioUrl ? (
                      <audio controls preload="none" src={currentSpeechTask.full?.url || currentSpeechTask.audioUrl} style={{ width: "100%", marginTop: 12 }} />
                    ) : <p className="panel-subtext" style={{ marginTop: 12 }}>暂无合成链接</p>}
                  </>
                ) : (
                  <div className="empty-state" style={{ marginTop: 12 }}>暂无最近合成</div>
                )}
              </div>
            </div>
          </article>
        ) : menu === "custom" ? (
          /* ===== Custom Person ===== */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            {customPersons.map((c) => (
              <article key={c.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, boxShadow: "0 1px 2px rgba(15,23,42,.05)" }}>
                {c.coverUrl ? (
                  <img src={c.coverUrl} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 8 }} />
                ) : (
                  <div style={{ aspectRatio: "3/4", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", borderRadius: 8, color: "#fff", display: "grid", placeItems: "center" }}>定制数字人</div>
                )}
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{c.name}</div>
                <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
                  状态：{c.status || "-"}{c.support4k ? " · 支持4K" : ""}
                </div>
              </article>
            ))}
            {!customPersons.length && !loading ? (
              <div style={{ gridColumn: "1 / -1", padding: 24, textAlign: "center", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 10, color: "#64748b", fontSize: 12 }}>暂无定制形象</div>
            ) : null}
          </div>
        ) : menu === "lipsync" ? (
          /* ===== LipSync ===== */
          <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
            <strong style={{ display: "block", marginBottom: 10 }}>口型同步生成</strong>
            <div style={{ display: "grid", gap: 10 }}>
              <label className="field"><span>驱动视频</span><input type="file" accept="video/*" /></label>
              <label className="field"><span>口型文案</span><textarea rows={4} placeholder="输入对口型文案" /></label>
              <button type="button" className="primary-button" style={{ marginTop: 4 }}>提交生成</button>
            </div>
          </div>
        ) : menu === "favorite" ? (
          <div className="empty-state">暂无收藏</div>
        ) : null}
      </div>

      {/* ===== Template Preview Dialog ===== */}
      {activeDialog === "TEMPLATE" && previewTemplate ? (
        <div className="digital-human-template-modal-overlay" role="dialog" aria-modal="true" onClick={() => setActiveDialog(null)}>
          <div className="digital-human-template-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="digital-human-template-modal__close" onClick={() => setActiveDialog(null)}>关闭</button>
            <div className="digital-human-template-modal__layout">
              <div className="digital-human-template-modal__preview">
                {previewFigure?.previewVideoUrl ? (
                  <video controls preload="metadata" poster={previewFigure.cover || resolveTemplateCover(previewTemplate)} src={previewFigure.previewVideoUrl} />
                ) : previewFigure?.cover || resolveTemplateCover(previewTemplate) ? (
                  <img src={previewFigure?.cover || resolveTemplateCover(previewTemplate)} alt={previewTemplate.name || previewTemplate.title || "数字人模板"} />
                ) : (
                  <div className="digital-human-template-card__empty">暂无预览</div>
                )}
                <button
                  type="button"
                  className="primary-button digital-human-template-modal__create"
                  onClick={() => useTemplateForGenerate(previewTemplate, previewFigure?.type || previewFigureType)}
                >
                  使用模板
                </button>
              </div>
              <div className="digital-human-template-modal__content">
                <div className="digital-human-template-modal__header">
                  <div>
                    <strong>{previewTemplate.name || previewTemplate.title || "数字人模板"}</strong>
                    <p>{previewTemplate.audioName ? `默认音色：${previewTemplate.audioName}` : "暂无默认音色信息"}</p>
                    {previewTemplate.audioPreview ? (
                      <audio controls preload="none" src={previewTemplate.audioPreview} style={{ width: "100%", marginTop: 12 }} />
                    ) : null}
                  </div>
                </div>
                <div className="digital-human-template-modal__meta">
                  <span className="action-chip">{(previewTemplate.figures || []).length || 1} 个造型</span>
                  {previewTags.slice(0, 8).map((tag) => (
                    <span key={`${getTemplateId(previewTemplate)}-${tag}`} className="action-chip">{tag}</span>
                  ))}
                </div>
                <div className="digital-human-template-modal__figure-grid">
                  {(previewTemplate.figures || []).map((figure, index) => (
                    <button
                      key={`${getTemplateId(previewTemplate)}-${figure.type || index}`}
                      type="button"
                      className={`digital-human-template-modal__figure-card ${previewFigure?.type === figure.type ? "is-active" : ""}`}
                      onClick={() => setPreviewFigureType(figure.type || "")}
                    >
                      {figure.cover ? (
                        <img src={figure.cover} alt={`${previewTemplate.name || previewTemplate.title || "数字人模板"}-${getTemplateFigureTypeLabel(figure.type)}`} />
                      ) : (
                        <div className="digital-human-template-card__empty">暂无封面</div>
                      )}
                      <span>{getTemplateFigureTypeLabel(figure.type)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===== Voice Clone Dialog ===== */}
      {activeDialog === "CLONE" ? (
        <div className="digital-human-template-modal-overlay" onClick={() => setActiveDialog(null)}>
          <div className="digital-human-template-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="digital-human-template-modal__close" onClick={() => setActiveDialog(null)}>关闭</button>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 18 }}>声音克隆</strong>
              </div>
              <div className="personal-grid">
                <label className="field"><span>声音名称</span><input value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="例如：品牌讲师女声" /></label>
                <label className="field"><span>模型</span>
                  <select value={cloneModelType} onChange={(e) => setCloneModelType(e.target.value)}>
                    <option value="cicada1.0">cicada1.0</option>
                    <option value="cicada3.0">cicada3.0</option>
                    <option value="cicada3.0-turbo">cicada3.0-turbo</option>
                  </select>
                </label>
                <label className="field"><span>语种</span>
                  <select value={cloneLanguage} onChange={(e) => setCloneLanguage(e.target.value)}>
                    <option value="cn">中文</option><option value="en">英文</option>
                  </select>
                </label>
                <label className="field field-full"><span>试听文案</span><input value={clonePreviewText} onChange={(e) => setClonePreviewText(e.target.value)} placeholder="最多 50 个字符" /></label>
                <label className="field field-full">
                  <span>克隆音频</span>
                  <input type="file" accept="audio/mp3,audio/mpeg,audio/wav,audio/x-wav,audio/m4a,audio/*"
                    onChange={(e) => setCloneAudioFile(e.target.files?.[0] || null)} disabled={submitting} />
                  <small className="personal-meta">{cloneAudioFile ? `已选择：${cloneAudioFile.name}` : "支持 mp3、wav、m4a；建议干净人声、连续讲话不低于 10 秒。"}</small>
                </label>
              </div>
              <div className="strategy-inline-actions" style={{ marginTop: 20 }}>
                <button type="button" className="primary-button" disabled={submitting || !cloneAudioFile} onClick={() => void submitCloneVoice()}>
                  创建定制声音
                </button>
                <button type="button" className="secondary-button" onClick={() => setActiveDialog(null)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===== Voice Synthesis Dialog ===== */}
      {activeDialog === "SYNTHESIS" ? (
        <div className="digital-human-template-modal-overlay" onClick={() => setActiveDialog(null)}>
          <div className="digital-human-template-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="digital-human-template-modal__close" onClick={() => setActiveDialog(null)}>关闭</button>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 18 }}>语音合成</strong>
              </div>
              <div className="personal-grid">
                <label className="field field-full">
                  <span>当前声音</span>
                  <select value={synthesisVoice?.id || ""} onChange={(e) => setSynthesisVoiceId(e.target.value)}>
                    {allVoices.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} · {v.isCustom ? "我的声音" : "公共声音"}</option>
                    ))}
                  </select>
                </label>
                <label className="field"><span>语速</span><input value={speechSpeed} onChange={(e) => setSpeechSpeed(e.target.value)} placeholder="1" /></label>
                <label className="field"><span>音调</span><input value={speechPitch} onChange={(e) => setSpeechPitch(e.target.value)} placeholder="1" /></label>
                <label className="field">
                  <span>方言</span>
                  <select value={speechDialect} onChange={(e) => setSpeechDialect(e.target.value)}>
                    <option value="0">默认</option><option value="1">东北话</option><option value="2">关中话</option><option value="3">江淮官话</option>
                    <option value="5">冀鲁官话</option><option value="6">青海话</option><option value="7">吴语</option><option value="8">天津话</option>
                    <option value="9">西南官话</option><option value="10">中原官话</option><option value="11">粤语</option><option value="12">闽南语</option>
                  </select>
                </label>
                <label className="field field-full">
                  <span>合成文案</span>
                  <textarea value={speechText} onChange={(e) => setSpeechText(e.target.value)} rows={7} placeholder="输入要合成的文本，长度限制 4000 字以内" />
                </label>
              </div>
              <div className="strategy-inline-actions" style={{ marginTop: 20 }}>
                <button type="button" className="primary-button" disabled={submitting || !synthesisVoice?.id || !speechText.trim()}
                  onClick={() => void submitSynthesis()}>
                  开始合成
                </button>
                <button type="button" className="secondary-button" onClick={() => setActiveDialog(null)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* =======================================================
   ③ Tile3 = RunningWorkspace 自动化应用（仅抖音）
   1:1 对齐原系统 douyin-runninghub-workspace.tsx
   - 头部 2徽章(应用数/作品数) + 2按钮 + 立即生成 Dialog + 作品中心 Dialog + 10秒轮询
   - REST 端点严格对应 works.controller.ts L858-899
   ======================================================= */

type RHInstanceType = "default" | "plus" | "professional";
type RHWorkStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | string;

type RHAppRecord = {
  key: string;
  appKey?: string;
  name: string;
  summary?: string;
  description?: string;
  tags?: string[];
  tutorialUrl?: string;
  icon?: string;
  statusHint?: string;
};

type RHWorkResult = {
  url?: string;
  sourceUrl?: string;
  outputType?: string;
  text?: string;
};

type RHWorkRecord = {
  id: string;
  title?: string;
  appKey?: string;
  appName?: string;
  status?: RHWorkStatus;
  instanceType?: RHInstanceType;
  createdAt?: string;
  finishedAt?: string;
  errMsg?: string;
  results?: RHWorkResult[];
};

type RHAppDetailField = {
  nodeId?: string;
  nodeName?: string;
  fieldName?: string;
  fieldType?: string;
  fieldValue?: string;
  fieldData?: string;
  description?: string;
  descriptionEn?: string;
};

type RHAppDetail = RHAppRecord & {
  nodeInfoList?: RHAppDetailField[];
  configHint?: string;
  configured?: boolean;
};

type RHFieldFormEntry = RHAppDetailField & { value: string; uploadFile: File | null };
type RHFieldSelectOption = { value: string; label: string };

function getRHWorkLabel(s?: RHWorkStatus) {
  switch (s) {
    case "SUCCESS": return "已完成";
    case "FAILED": return "失败";
    case "RUNNING": return "处理中";
    case "PENDING": return "排队中";
    default: return s || "排队中";
  }
}
function getRHWorkClass(s?: RHWorkStatus) {
  switch (s) {
    case "SUCCESS": return "status-ready";
    case "FAILED": return "status-danger";
    case "RUNNING": return "status-in_progress";
    default: return "status-pending";
  }
}
function normalizeRHInstance(v?: string | null): RHInstanceType {
  if (v === "plus" || v === "professional") return v;
  return "default";
}
function buildFieldForm(detail: RHAppDetail | null): RHFieldFormEntry[] {
  return (detail?.nodeInfoList || []).map((f) => ({ ...f, value: resolveInitField(f), uploadFile: null }));
}
function resolveInitField(f: RHAppDetailField) {
  if (/^(IMAGE|VIDEO|AUDIO)$/i.test(String(f.fieldType || ""))) return "";
  const raw = String(f.fieldValue || "").trim();
  if (raw) return raw;
  const options = getFieldSelectOptions(f);
  if (options.length) return options[0]?.value || "";
  const fd = String(f.fieldData || "").trim();
  if (fd && !/^[\[{]/.test(fd)) return fd;
  return "";
}
function getFieldLabel(f: RHAppDetailField) { return f.description || f.fieldName || f.nodeName || "参数"; }
function getFieldDescription(f: RHAppDetailField) {
  if (f.descriptionEn) return f.descriptionEn;
  const raw = String(f.fieldData || "").trim();
  if (!raw || /^[\[{]/.test(raw)) return "";
  return raw;
}
function shouldUseNumberInput(f: RHAppDetailField) {
  if (/^(STRING|TEXT|IMAGE|AUDIO|VIDEO|LIST)$/i.test(String(f.fieldType || ""))) return false;
  const fieldType = String(f.fieldType || "").toLowerCase();
  if (/(^|[^a-z])(int|integer|float|double|decimal|number)([^a-z]|$)/.test(fieldType)) return true;
  const s = [f.fieldName, f.nodeName, f.description, f.descriptionEn, f.fieldData].filter(Boolean).join(" ").toLowerCase();
  return /generate seconds|lip-syncing from|fps|frame rate|width|height|max resolution|generate duration|start time|开始对口型|几秒|秒内|生成秒数|帧率|分辨率|宽度|高度/.test(s);
}
function shouldUseTextarea(f: RHAppDetailField) {
  const s = [f.fieldType, f.fieldName, f.description, f.descriptionEn].filter(Boolean).join(" ").toLowerCase();
  return /textarea|prompt|text|说明|提示词/.test(s);
}
function inferUploadKind(f: RHAppDetailField): "image" | "video" | "audio" | null {
  const type = String(f.fieldType || "").toUpperCase();
  if (type === "IMAGE") return "image";
  if (type === "VIDEO") return "video";
  if (type === "AUDIO") return "audio";
  if (/^(STRING|TEXT|LIST|INT|INTEGER|FLOAT|NUMBER|BOOLEAN)$/.test(type)) return null;
  const s = [f.fieldType, f.fieldName, f.nodeName, f.description, f.descriptionEn, f.fieldData].filter(Boolean).join(" ").toLowerCase();
  if (/image|img|photo|图|参考图|pose image|角色图/.test(s)) return "image";
  if (/video|动作|motion|视频|pose video|driv/.test(s)) return "video";
  if (/audio|voice|音|配音|bgm|song/.test(s)) return "audio";
  return null;
}
function isImgResult(r: RHWorkResult) {
  const u = String(r.url || r.sourceUrl || "").toLowerCase();
  const t = String(r.outputType || "").toLowerCase();
  return /image|png|jpg|jpeg|webp/.test(t) || /\.(png|jpe?g|webp|gif)(\?|$)/.test(u);
}
function isVidResult(r: RHWorkResult) {
  const u = String(r.url || r.sourceUrl || "").toLowerCase();
  const t = String(r.outputType || "").toLowerCase();
  return /video|mp4|mov|webm/.test(t) || /\.(mp4|mov|webm|m4v)(\?|$)/.test(u);
}
function getFieldSelectOptions(f: RHAppDetailField): RHFieldSelectOption[] {
  if (/^(IMAGE|VIDEO|AUDIO)$/i.test(String(f.fieldType || ""))) return [];
  const raw = String(f.fieldData || "").trim();
  if (!raw || !/^[\[{]/.test(raw)) return [];
  try {
    const json = JSON.parse(raw);
    if (Array.isArray(json) && typeof json[0] === "string" && /^(STRING|TEXT|INT|FLOAT|BOOLEAN)$/i.test(json[0])) return [];
    const extract = (v: any): string[] => {
      if (Array.isArray(v)) {
        const prim = v.filter((x) => ["string", "number", "boolean"].includes(typeof x)).map(String);
        if (prim.length >= 2 && prim.length === v.length) return prim;
        return v.reduce<string[]>((best, item) => {
          const c = extract(item);
          return c.length > best.length ? c : best;
        }, []);
      }
      if (v && typeof v === "object") {
        const keys = ["options", "enum", "choices", "items", "values", "list"];
        for (const k of keys) {
          const c = extract((v as any)[k]);
          if (c.length >= 2) return c;
        }
        return Object.values(v).reduce<string[]>((best, item) => {
          const c = extract(item);
          return c.length > best.length ? c : best;
        }, []);
      }
      return [];
    };
    const list = extract(json).filter((x) => x.length <= 40);
    const seen = new Set<string>();
    const labels = list.filter((x) => { if (seen.has(x)) return false; seen.add(x); return true; });
    if (labels.length < 2) return [];
    const rawValue = String(f.fieldValue || "").trim();
    const useIndexValue = !labels.includes(rawValue) && /^\d+$/.test(rawValue) && Number(rawValue) >= 0 && Number(rawValue) < labels.length;
    return labels.map((label, index) => ({ value: useIndexValue ? String(index) : label, label }));
  } catch { return []; }
}
function suggestedTitle(appName?: string) {
  const stamp = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).replace(/\//g, "-");
  return `${appName || "RunningHub"} - ${stamp}`;
}

export function RunningWorkspace(p: AvatarInnerProps) {
  const { brandId } = p;
  const [apps, setApps] = useState<RHAppRecord[]>([]);
  const [works, setWorks] = useState<RHWorkRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [worksLoading, setWorksLoading] = useState(false);
  const refreshSequence = useRef(0);
  const detailSequence = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [worksOpen, setWorksOpen] = useState(false);
  const [selectedAppKey, setSelectedAppKey] = useState<string>("");
  const [detail, setDetail] = useState<RHAppDetail | null>(null);
  const [title, setTitle] = useState("");
  const [instanceType, setInstanceType] = useState<RHInstanceType>("default");
  const [fields, setFields] = useState<RHFieldFormEntry[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [deletingWorkId, setDeletingWorkId] = useState<string | null>(null);

  const refreshWorkspace = useCallback(async () => {
    if (!brandId) return;
    const sequence = ++refreshSequence.current;
    const current = () => refreshSequence.current === sequence;
    setLoading(true);
    setWorksLoading(true);
    setInlineError("");
    const appRequest = apiReq<any>(`/works/brands/${brandId}/douyin/runninghub/apps`).then((aData) => {
      if (!current()) return;
      const aList = ((aData?.items || aData?.apps || aData || []) as any[]).map((x: any) => ({
        key: String(x.key || x.appKey || x.id || ""),
        appKey: String(x.key || x.appKey || x.id || ""),
        name: x.name || x.title || x.label || String(x.key || x.appKey || "应用"),
        summary: x.summary || x.description || "",
        description: x.summary || x.description || "",
        tags: Array.isArray(x.tags) ? x.tags : [],
        tutorialUrl: x.tutorialUrl || x.docUrl || "",
        icon: x.icon || "",
        statusHint: x.statusHint || "",
      }));
      setApps(aList);
    }).catch((e: any) => { if (current()) setInlineError(`应用加载失败：${e.message || String(e)}`); })
      .finally(() => { if (current()) setLoading(false); });
    const workRequest = apiReq<any>(`/works/brands/${brandId}/douyin/runninghub/works`).then((wData) => {
      if (!current()) return;
      const wList = ((wData?.items || wData?.works || wData || []) as any[]).map((x: any) => ({
        id: String(x.id || x.workId || ""),
        title: x.title || x.name || "",
        appKey: x.appKey || "",
        appName: x.appName || "",
        status: x.status || x.stage,
        instanceType: normalizeRHInstance(x.instanceType),
        createdAt: x.createdAt || "",
        finishedAt: x.finishedAt || "",
        errMsg: x.errMsg || x.errorMessage || "",
        results: Array.isArray(x.results) ? x.results : [],
      }));
      setWorks(wList);
      setSelectedWorkId((cur) => {
        if (cur && wList.some((x) => x.id === cur)) return cur;
        return wList[0]?.id || "";
      });
    }).catch((e: any) => { if (current()) setInlineError((previous) => [previous, `作品加载失败：${e.message || String(e)}`].filter(Boolean).join("；")); })
      .finally(() => { if (current()) setWorksLoading(false); });
    await Promise.allSettled([appRequest, workRequest]);
  }, [brandId]);

  useEffect(() => {
    setApps([]);
    setWorks([]);
    setSelectedWorkId("");
    setCreateOpen(false);
    setWorksOpen(false);
    setDetail(null);
    detailSequence.current += 1;
    void refreshWorkspace();
    return () => { refreshSequence.current += 1; detailSequence.current += 1; };
  }, [refreshWorkspace]);

  /* ===== 10秒轮询 处理中任务 ===== */
  const hasPending = works.some((w) => w.status === "PENDING" || w.status === "RUNNING");
  useEffect(() => {
    if (!hasPending) return;
    let disposed = false;
    let timer: number | undefined;
    let polling = false;
    const next = () => {
      if (disposed) return;
      timer = window.setTimeout(() => { void poll(); }, 10000);
    };
    const poll = async () => {
      if (disposed || polling) return;
      if (typeof document !== "undefined" && document.hidden) { next(); return; }
      polling = true;
      try { await refreshWorkspace(); }
      finally { polling = false; next(); }
    };
    next();
    return () => { disposed = true; if (timer) window.clearTimeout(timer); };
  }, [hasPending, refreshWorkspace]);

  const closeCreateDialog = () => {
    detailSequence.current += 1;
    setDetailLoading(false);
    setCreateOpen(false);
    setSubmitError("");
  };
  const openCreateDialog = async (appKey: string) => {
    const sequence = ++detailSequence.current;
    setDetail(null);
    setFields([]);
    setSelectedAppKey(appKey);
    setCreateOpen(true);
    setDetailLoading(true);
    setSubmitError("");
    try {
      const data = await apiReq<any>(`/works/brands/${brandId}/douyin/runninghub/apps/${appKey}`);
      if (detailSequence.current !== sequence) return;
      const d: RHAppDetail = data?.item || data?.detail || data || null;
      setDetail(d);
      if (d?.configured === false) setSubmitError(d.configHint || "应用参数暂不可用，请稍后重试。");
      setTitle(suggestedTitle(d?.name));
      setInstanceType(d?.key === "ltx23-digital-human-lip-sync" ? "plus" : "default");
      setFields(buildFieldForm(d));
    } catch (e: any) {
      if (detailSequence.current !== sequence) return;
      setDetail(null);
      setFields([]);
      setSubmitError(e.message || String(e));
    } finally {
      if (detailSequence.current === sequence) setDetailLoading(false);
    }
  };
  const handleFieldValueChange = (idx: number, v: string) => {
    setFields((cur) => cur.map((x, i) => (i === idx ? { ...x, value: v } : x)));
  };
  const handleFieldFileChange = (idx: number, f: File | null) => {
    setFields((cur) => cur.map((x, i) => (i === idx ? { ...x, uploadFile: f } : x)));
  };
  const handleDeleteWork = async (workId: string) => {
    setDeletingWorkId(workId);
    try {
      await apiReq(`/works/brands/${brandId}/douyin/runninghub/works/${workId}`, { method: "DELETE" });
      setWorks((cur) => {
        const next = cur.filter((w) => w.id !== workId);
        setSelectedWorkId((sel) => (sel === workId ? next[0]?.id || "" : sel));
        return next;
      });
    } catch (e: any) { setInlineError(e.message || String(e)); }
    finally { setDeletingWorkId(null); }
  };
  const handleSubmit = async () => {
    if (!selectedAppKey) { setSubmitError("请先选择一个 RunningHub 应用。"); return; }
    const hasUsable = fields.some((f) => f.uploadFile || f.value.trim());
    if (!hasUsable) { setSubmitError("请至少填写或上传一个有效参数。"); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const fd = new FormData();
      fd.append("title", title.trim() || suggestedTitle(apps.find((a) => a.key === selectedAppKey)?.name));
      fd.append("instanceType", instanceType);
      const nodeInfoJson = fields.map((f) => ({
        nodeId: f.nodeId, nodeName: f.nodeName, fieldName: f.fieldName,
        fieldValue: f.value.trim(), fieldData: f.fieldData, fieldType: f.fieldType,
        description: f.description, descriptionEn: f.descriptionEn,
      }));
      fd.append("nodeInfoList", JSON.stringify(nodeInfoJson));
      let fileCount = 0;
      fields.forEach((f, idx) => { if (f.uploadFile) { fd.append(`file_${idx}`, f.uploadFile); fileCount += 1; } });
      const data = await apiReq<any>(`/works/brands/${brandId}/douyin/runninghub/apps/${selectedAppKey}/generate`, { method: "POST", body: fd });
      const created = data?.item || data?.work || data;
      if (created?.id) {
        setWorks((cur) => [created, ...cur.filter((w) => w.id !== created.id)]);
        setSelectedWorkId(created.id);
      }
      setCreateOpen(false);
      setWorksOpen(true);
      void refreshWorkspace();
    } catch (e: any) { setSubmitError(e.message || String(e)); }
    finally { setSubmitting(false); }
  };
  const selectedApp = apps.find((a) => a.key === selectedAppKey) || null;
  const selectedWork = works.find((w) => w.id === selectedWorkId) || null;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <header className="mb-3 flex flex-row items-center justify-between gap-2">
        <div>
          <strong className="text-[14px] text-slate-900">RunningHub 自动化应用</strong>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            disabled={loading || worksLoading || submitting} onClick={() => void refreshWorkspace()}>
            {loading || worksLoading ? "刷新中..." : "刷新列表"}
          </button>
        </div>
      </header>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 12 }}>
        <div className="report-editor-head">
          <div>
            <strong>应用卡片</strong>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${apps.length ? "status-ready" : "status-in_progress"}`}>
              {apps.length ? `${apps.length} 个应用` : loading ? "应用加载中" : "暂无应用"}
            </span>
            <span className={`archive-pill ${works.length ? "status-ready" : "status-pending"}`}>
              {works.length ? `${works.length} 条作品` : worksLoading ? "作品同步中" : "暂无作品"}
            </span>
            <button type="button" className="secondary-button" onClick={() => setWorksOpen(true)} disabled={loading || submitting}>
              打开作品中心
            </button>
          </div>
        </div>
        {inlineError ? <div className="report-inline-tip report-inline-tip--error">{inlineError}</div> : null}

        {!apps.length && !loading ? (
          <div className="empty-state" style={{ marginTop: 16 }}>暂无应用</div>
        ) : (
          <div className="xhs-material-card-grid" style={{ marginTop: 16 }}>
            {apps.map((app) => (
              <article key={app.key} className="entity-card personal-card">
                <strong>{app.name}</strong>
                <p className="panel-subtext">{app.summary || app.description}</p>
                {app.tags && app.tags.length ? (
                  <div className="ops-prompt-tag-row" style={{ marginTop: 12 }}>
                    {app.tags.map((t) => <span key={t} className="archive-pill status-pending">{t}</span>)}
                  </div>
                ) : null}
                {app.statusHint ? <p className="panel-subtext" style={{ marginTop: 12 }}>{app.statusHint}</p> : null}
                <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
                  <button type="button" className="primary-button" onClick={() => void openCreateDialog(app.key)} disabled={submitting}>
                    立即生成
                  </button>
                  {app.tutorialUrl ? (
                    <a className="secondary-button" href={app.tutorialUrl} target="_blank" rel="noreferrer">查看文档</a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      {/* ===== Create Dialog ===== */}
      {createOpen ? (
        <div className="design-v3-dialog-backdrop" onClick={closeCreateDialog}>
          <div className="design-v3-dialog ops-prompt-dialog" style={{ maxWidth: 760, maxHeight: "86vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="design-v3-dialog__header">
              <div>
                <strong>{selectedApp?.name || detail?.name || "RunningHub 立即生成"}</strong>
              </div>
              <button type="button" className="design-v3-dialog__close" onClick={closeCreateDialog}>✕</button>
            </div>
            <div style={{ padding: "8px 20px 20px" }}>
              {submitError ? <div className="report-inline-tip report-inline-tip--error" style={{ marginBottom: 12 }}>{submitError}</div> : null}
              <div className="personal-grid">
                <label className="field field-full">
                  <span>作品标题</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="便于后续查找" />
                </label>
                <label className="field">
                  <span>运行实例</span>
                  <select value={instanceType} onChange={(e) => setInstanceType(normalizeRHInstance(e.target.value))}>
                    <option value="default">24G 实例（默认）</option>
                    <option value="plus">48G 实例（Plus）</option>
                    <option value="professional">80G 实例（Pro）</option>
                  </select>
                </label>
                <label className="field">
                  <span>目标应用</span>
                  <select value={selectedAppKey} onChange={(e) => void openCreateDialog(e.target.value)}>
                    {apps.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
                  </select>
                </label>
              </div>
              {detailLoading ? (
                <div className="empty-state" style={{ marginTop: 16 }}>正在加载应用动态参数...</div>
              ) : fields.length ? (
                <div style={{ marginTop: 14 }}>
                  <strong style={{ marginBottom: 10, display: "block" }}>应用参数</strong>
                  <div className="personal-grid">
                    {fields.map((f, idx) => {
                      const opts = getFieldSelectOptions(f);
                      const uploadKind = opts.length || shouldUseNumberInput(f) ? null : inferUploadKind(f);
                      const helperText = getFieldDescription(f);
                      return (
                        <label key={`${f.nodeId || "node"}:${f.fieldName || "field"}:${idx}`} className={`field ${shouldUseTextarea(f) || uploadKind ? "field-full" : ""}`}>
                          <span>{getFieldLabel(f)}</span>
                          {uploadKind ? (
                            <>
                              <input type="file"
                                accept={uploadKind === "image" ? "image/*" : uploadKind === "video" ? "video/*" : "audio/*"}
                                onChange={(e) => handleFieldFileChange(idx, e.target.files?.[0] || null)}
                                disabled={submitting} />
                              <small className="personal-meta">
                                {f.uploadFile ? `已选择：${f.uploadFile.name}` : `支持上传${uploadKind === "image" ? "图片" : uploadKind === "video" ? "视频" : "音频"}文件；或在下方填写 URL/参数。`}
                              </small>
                              <input value={f.value} onChange={(e) => handleFieldValueChange(idx, e.target.value)}
                                placeholder="或直接填写参数值 / URL 等" style={{ marginTop: 6 }} />
                            </>
                          ) : opts.length >= 2 ? (
                            <select value={f.value} onChange={(e) => handleFieldValueChange(idx, e.target.value)}>
                              {opts.map((o) => <option key={`${f.nodeId || "node"}-${f.fieldName || "field"}-${o.value}-${o.label}`} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : shouldUseNumberInput(f) ? (
                            <input type="number" inputMode="decimal" value={f.value} onChange={(e) => handleFieldValueChange(idx, e.target.value)} placeholder={helperText || "请输入数值"} />
                          ) : shouldUseTextarea(f) ? (
                            <textarea rows={4} value={f.value} onChange={(e) => handleFieldValueChange(idx, e.target.value)} placeholder={helperText || "请输入参数内容"} />
                          ) : (
                            <input value={f.value} onChange={(e) => handleFieldValueChange(idx, e.target.value)} placeholder={helperText || "请输入参数内容"} />
                          )}
                          {helperText && !shouldUseNumberInput(f) ? <small className="personal-meta">{helperText}</small> : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : detail && detail.configured === false ? (
                <div className="empty-state" style={{ marginTop: 14 }}>应用参数暂不可用，请稍后重试。</div>
              ) : (
                <div className="empty-state" style={{ marginTop: 14 }}>无额外参数，直接提交</div>
              )}
              <div className="strategy-inline-actions" style={{ marginTop: 20 }}>
                <button type="button" className="primary-button" disabled={submitting || detailLoading} onClick={() => void handleSubmit()}>
                  {submitting ? "提交中..." : "提交生成任务"}
                </button>
                <button type="button" className="secondary-button" onClick={closeCreateDialog}>取消</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===== Works Dialog ===== */}
      {worksOpen ? (
        <div className="design-v3-dialog-backdrop" onClick={() => setWorksOpen(false)}>
          <div className="design-v3-dialog ops-prompt-dialog" style={{ maxWidth: 980, maxHeight: "88vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="design-v3-dialog__header">
              <div>
                <strong>RunningHub 作品中心</strong>
              </div>
              <button type="button" className="design-v3-dialog__close" onClick={() => setWorksOpen(false)}>✕</button>
            </div>
            <div style={{ padding: "8px 20px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,320px) 1fr", gap: 12, marginTop: 6 }}>
                <aside style={{ borderRight: "1px solid #e5e7eb", paddingRight: 12 }}>
                  {!works.length ? (
                    <p className="panel-subtext" style={{ padding: 16 }}>暂无作品</p>
                  ) : (
                    <div style={{ display: "grid", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
                      {works.map((w) => {
                        const active = w.id === selectedWorkId;
                        return (
                          <button key={w.id} type="button" onClick={() => setSelectedWorkId(w.id)}
                            style={{
                              textAlign: "left",
                              padding: 10,
                              borderRadius: 10,
                              border: `1px solid ${active ? "#6366f1" : "#e2e8f0"}`,
                              background: active ? "linear-gradient(135deg,#eef2ff,#e0f2fe)" : "#fff",
                              boxShadow: active ? "0 2px 6px rgba(99,102,241,.18)" : "0 1px 2px rgba(15,23,42,.05)",
                              cursor: "pointer",
                              width: "100%",
                            }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <strong style={{ fontSize: 13, color: "#0f172a" }}>{w.title || w.appName || w.id}</strong>
                              <span className={`archive-pill ${getRHWorkClass(w.status)}`}>{getRHWorkLabel(w.status)}</span>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
                              {w.appName || w.appKey || ""} · {w.createdAt?.slice(0, 16) || ""}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </aside>
                <div style={{ minHeight: 320 }}>
                  {selectedWork ? (
                    <article className="entity-card personal-card">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                        <div>
                          <strong>{selectedWork.title || "未命名作品"}</strong>
                          <p className="panel-subtext" style={{ marginTop: 4 }}>
                            {selectedWork.appName || selectedWork.appKey || "RunningHub"} · 实例：{selectedWork.instanceType || "default"} · 创建于 {selectedWork.createdAt?.slice(0, 16) || "-"}
                          </p>
                        </div>
                        <div className="strategy-inline-actions">
                          <span className={`archive-pill ${getRHWorkClass(selectedWork.status)}`}>{getRHWorkLabel(selectedWork.status)}</span>
                          <button type="button" className="secondary-button" disabled={submitting || deletingWorkId === selectedWork.id}
                            onClick={() => void handleDeleteWork(selectedWork.id)}>
                            {deletingWorkId === selectedWork.id ? "删除中..." : "删除作品"}
                          </button>
                        </div>
                      </div>
                      {selectedWork.errMsg ? <div className="report-inline-tip report-inline-tip--error" style={{ marginTop: 12 }}>失败原因：{selectedWork.errMsg}</div> : null}
                      {!selectedWork.results?.length ? (
                        <div className="empty-state" style={{ marginTop: 16 }}>
                          {selectedWork.status === "RUNNING" || selectedWork.status === "PENDING"
                            ? "处理中"
                            : "暂无结果"}
                        </div>
                      ) : (
                        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                          {selectedWork.results.map((r, i) => {
                            const href = r.url || r.sourceUrl;
                            return (
                              <article key={r.url || i} className="entity-card personal-card">
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <strong>结果 #{i + 1}</strong>
                                  <span className="archive-pill status-pending">{r.outputType || "结果"}</span>
                                </div>
                                {isImgResult(r) && href ? (
                                  <img src={href} alt="" style={{ width: "100%", marginTop: 12, borderRadius: 20, border: "1px solid #dfe5f2" }} />
                                ) : null}
                                {isVidResult(r) && href ? (
                                  <video controls preload="metadata" src={href} style={{ width: "100%", marginTop: 12, borderRadius: 20, background: "#0f1525" }} />
                                ) : null}
                                {!isImgResult(r) && !isVidResult(r) && r.text ? <p style={{ marginTop: 12 }}>{r.text}</p> : null}
                                {href ? (
                                  <a href={href} target="_blank" rel="noreferrer" className="secondary-button" style={{ marginTop: 12, display: "inline-flex" }}>
                                    打开结果
                                  </a>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  ) : (
                    <div className="empty-state" style={{ minHeight: 320 }}>请从左侧选择一个作品查看详情。</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* =======================================================
   ④ Tile4 = InitWorkspace 公众号配置初始化（仅公众号）
   ======================================================= */

export function InitWorkspace(p: AvatarInnerProps) {
  const { brandId } = p;
  const [loading, setLoading] = useState(false);
  const [accs, setAccs] = useState<any[]>([]);
  const [prefs, setPrefs] = useState<any>({});
  const [drafts, setDrafts] = useState<any[]>([]);
  const [pubs, setPubs] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  async function loadAll() {
    setLoading(true);
    setMsg("");
    const scope = "all";
    try {
      setAccs(unwrapListPayload(await apiReq(`/works/brands/${brandId}/wechat/accounts?workspaceScope=${scope}`)));
      setPrefs(unwrapItemPayload(await apiReq(`/works/brands/${brandId}/wechat/preferences?workspaceScope=${scope}`)) || {});
      setDrafts(unwrapListPayload(await apiReq(`/works/brands/${brandId}/wechat/articles?workspaceScope=${scope}`)));
      setPubs(unwrapListPayload(await apiReq(`/works/brands/${brandId}/wechat/publish-history?workspaceScope=${scope}`)));
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadAll();
  }, [brandId]);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <header className="mb-3 flex flex-row items-center justify-between gap-2">
        <div>
          <strong className="text-[14px] text-slate-900">配置初始化</strong>
        </div>
        <button type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          disabled={loading} onClick={() => void loadAll()}>
          刷新
        </button>
      </header>
      {msg ? <div className="report-inline-tip report-inline-tip--error">{msg}</div> : null}
      <div style={{ marginTop: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <details open>
          <summary style={{ fontWeight: 600, cursor: "pointer", padding: 4 }}>① 官方账号管理</summary>
          <SimpleTable
            cols={["账号ID", "名称", "AppID", "默认", "操作"]}
            rows={accs.map((a) => [a.id, a.name, a.appId, a.isDefault ? "✅" : "", "编辑/删除"])}
            loading={loading}
          />
        </details>
      </div>
      <div style={{ marginTop: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <details open>
          <summary style={{ fontWeight: 600, cursor: "pointer", padding: 4 }}>② 发布偏好设置</summary>
          <div style={{ padding: 8, display: "grid", gap: 10 }}>
            <div>排版模板：{prefs.layoutTemplate || "通用"}</div>
            <div>配图模式：{prefs.imageMode || "-"}</div>
            <div>正文主题色：{prefs.themeColor || "墨绿"}</div>
            <div>字号行距：{prefs.typography || "常规"}</div>
          </div>
        </details>
      </div>
      <div style={{ marginTop: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <details>
          <summary style={{ fontWeight: 600, cursor: "pointer", padding: 4 }}>③ 草稿箱</summary>
          <SimpleTable cols={["ID", "标题", "创建时间", "操作"]} rows={drafts.map((d) => [d.id, d.title, d.createdAt, "继续编辑/预览"])} loading={loading} />
        </details>
      </div>
      <div style={{ marginTop: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <details>
          <summary style={{ fontWeight: 600, cursor: "pointer", padding: 4 }}>④ 发布历史</summary>
          <SimpleTable cols={["ID", "标题", "状态", "发布时间", "操作"]} rows={pubs.map((x) => [x.id, x.title, x.status || "-", x.publishTime || "-", x.status === "FAILED" ? "重试" : "查看详情"])} loading={loading} />
        </details>
      </div>
    </section>
  );
}

/* =======================================================
   ⑤ Tile5 = WorkflowWorkspace 公众号创作工作流（仅公众号）
   ======================================================= */

const WF_STEPS = ["输入选题", "正文生成", "配图生成", "HTML生成", "排版样式", "发布确认", "已完成"];

export function WorkflowWorkspace(p: AvatarInnerProps) {
  const { brandId } = p;
  const [list, setList] = useState<any[]>([]);
  const [selId, setSelId] = useState<string>("");
  const [sel, setSel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [stepIdx, setStepIdx] = useState(0);

  async function loadList() {
    setLoading(true);
    setMsg("");
    try {
      const l = unwrapListPayload(await apiReq(`/works/brands/${brandId}/wechat/workflows?workspaceScope=all`));
      setList(l);
      if (l.length && !selId) {
        pickOne(l[0].id);
      }
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function pickOne(id: string) {
    setSelId(id);
    try {
      const d = unwrapItemPayload(await apiReq(`/works/brands/${brandId}/wechat/workflows/${id}?workspaceScope=all`));
      if (!d) {
        throw new Error("未获取到工作流详情。");
      }
      setSel(d);
      setStepIdx(Math.max(0, WF_STEPS.indexOf(d.currentStep || d.status || "输入选题")));
    } catch (e: any) {
      setMsg(e.message || String(e));
    }
  }
  async function newFlow() {
    setLoading(true);
    setMsg("");
    try {
      const r = unwrapItemPayload(await apiReq(`/works/brands/${brandId}/wechat/workflows`, {
        method: "POST",
        body: JSON.stringify({ topic: "新选题-" + Date.now().toString(36) }),
      }));
      await loadList();
      if (r?.id) pickOne(r.id);
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, [brandId]);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <header className="mb-3 flex flex-row items-center justify-between gap-2">
        <div>
          <strong className="text-[14px] text-slate-900">创作工作流</strong>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-transparent bg-indigo-600 px-3 py-1.5 text-[12px] text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            disabled={loading} onClick={() => void newFlow()}>
            + 新建工作流
          </button>
          <button type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            disabled={loading} onClick={() => void loadList()}>
            刷新
          </button>
        </div>
      </header>
      {msg ? <div className="report-inline-tip report-inline-tip--error">{msg}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 12, marginTop: 12 }}>
        <aside style={{ borderRight: "1px solid #e5e7eb", paddingRight: 12 }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>历史会话</div>
          {list.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => void pickOne(w.id)}
              style={{
                textAlign: "left",
                padding: 10,
                marginBottom: 8,
                display: "block",
                width: "100%",
                borderRadius: 10,
                border: `1px solid ${w.id === selId ? "#6366f1" : "#e2e8f0"}`,
                background: w.id === selId ? "linear-gradient(135deg,#eef2ff,#e0f2fe)" : "#fff",
                boxShadow: w.id === selId ? "0 2px 6px rgba(99,102,241,.18)" : "0 1px 2px rgba(15,23,42,.05)",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", lineHeight: "18px" }}>{w.topic || w.title || "选题-" + w.id}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>{w.currentStep || w.status || "准备中"} · {w.createdAt?.slice(0, 10) || ""}</div>
            </button>
          ))}
          {!list.length && !loading ? <p style={{ color: "#9ca3af", fontSize: 13 }}>暂无工作流</p> : null}
        </aside>

        <div>
          {sel ? (
            <>
              <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                {WF_STEPS.map((s, i) => (
                  <div key={s} style={{ flex: 1, textAlign: "center", fontSize: 12 }}>
                    <div
                      style={{
                        height: 24,
                        width: 24,
                        borderRadius: "50%",
                        background: i <= stepIdx ? "#2563eb" : "#e5e7eb",
                        color: i <= stepIdx ? "#fff" : "#6b7280",
                        display: "grid",
                        placeItems: "center",
                        margin: "0 auto 4px",
                        fontWeight: 700,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div>{s}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, minHeight: 320 }}>
                <strong>{sel.topic || sel.title}</strong>
                <div style={{ color: "#6b7280", margin: "8px 0" }}>当前步骤：{WF_STEPS[stepIdx] || sel.currentStep || "-"}</div>
                {stepIdx === 0 ? (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>选题信息</div>
                    <textarea defaultValue={sel.topic || ""} rows={3} style={{ width: "100%", padding: 8 }} />
                    <button type="button" className="primary-button" onClick={() => setStepIdx(Math.min(6, stepIdx + 1))}>
                      下一步：生成正文
                    </button>
                  </div>
                ) : stepIdx <= 4 ? (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{WF_STEPS[stepIdx]}</div>
                    <textarea rows={8} style={{ width: "100%", padding: 8 }} value={sel.content || sel.html || sel.styles || ""} readOnly placeholder="内容生成中..." />
                    <button type="button" className="primary-button" onClick={() => setStepIdx(Math.min(6, stepIdx + 1))}>
                      下一步
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>发布确认</div>
                    <p>预览模拟公众号展示...</p>
                    <button type="button" className="primary-button" onClick={() => setStepIdx(6)}>
                      确认发布
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: 40, color: "#9ca3af", textAlign: "center" }}>选择左侧历史会话，或新建工作流。</div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- 通用简单表格（5tile列表复用）---------- */
function SimpleTable(p: { title?: string; cols: string[]; rows: any[][]; loading?: boolean }) {
  return (
    <div className="openclaw-table-shell">
      {p.title ? <div style={{ fontWeight: 600, margin: "8px 0" }}>{p.title}</div> : null}
      {!p.rows.length && !p.loading ? <div className="openclaw-empty-state">暂无记录</div> : null}
      {p.loading ? <div className="openclaw-empty-state">加载中...</div> : null}
      <table className="openclaw-list-table">
        <thead>
          <tr>
            {p.cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- 5tile 总入口导出：供 dashboard-renderer 直接调用 ---------- */
export type Tile5Key = "calendar" | "avatar" | "running" | "init" | "workflow";

export function Tile5Workspace(props: {
  subTabKey: Tile5Key;
  brandId: string;
  platformTab: "xiaohongshu" | "douyin" | "wechat" | "all";
}) {
  const { subTabKey, brandId, platformTab } = props;
  // 内容获客三端复用同一份品牌增长营销日历真源，不存在按平台拆开的独立后端路由。
  const reportKind = "xiaohongshu-marketing-calendar";
  switch (subTabKey) {
    case "calendar":
      return (
        <CalendarWorkspace brandId={brandId} platformTab={platformTab} subTabKey="calendar" apiReportKind={reportKind as any} />
      );
    case "avatar":
      return <AvatarWorkspace brandId={brandId} platformTab={platformTab} />;
    case "running":
      return <RunningWorkspace brandId={brandId} platformTab={platformTab} />;
    case "init":
      return <InitWorkspace brandId={brandId} platformTab={platformTab} />;
    case "workflow":
      return <WorkflowWorkspace brandId={brandId} platformTab={platformTab} />;
    default:
      return null;
  }
}
