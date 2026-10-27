"use client";

import { useEffect } from "react";
import type { PanelMeta, TreeIconKey } from "./PanelWorkspaceShell.client";
import { TREE_ICON_MAP } from "./PanelWorkspaceShell.client";
import { Layers3, ChevronDown } from "lucide-react";
import { treeStats } from "./resourceTree";

const AICC_PANEL_MODE_KEY = "aicc_panel_mode";
const AICC_PANEL_EXPAND_KEY = "aicc_panel_expand";

type Mode = "novice" | "expert";

export default function PanelHeader({
  panel,
  stats,
  expandLvl,
  setExpandLvl,
  expertMode,
  setExpertMode,
  workingTreeDirty,
  readOnlySource = false,
}: {
  panel: PanelMeta;
  stats: ReturnType<typeof treeStats>;
  expandLvl: number;
  setExpandLvl: (n: number) => void;
  expertMode: boolean;
  setExpertMode: (b: boolean) => void;
  workingTreeDirty: boolean;
  readOnlySource?: boolean;
}) {
  const scope = `slug:${panel.slug}`;
  const Icon = TREE_ICON_MAP[panel.treeIconKey as TreeIconKey] ?? Layers3;

  useEffect(() => {
    try {
      const mode = localStorage.getItem(AICC_PANEL_MODE_KEY);
      if (mode === "expert") setExpertMode(true);
      else if (mode === "novice") setExpertMode(false);
      const raw = localStorage.getItem(AICC_PANEL_EXPAND_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, number>;
      const v = obj[scope];
      if (typeof v === "number" && Number.isFinite(v)) setExpandLvl(v);
    } catch {
      /* localStorage 不可用（隐私模式 / SSR 水合后）→ 忽略，保持内存态 */
    }
  }, [setExpertMode, setExpandLvl, scope]);

  const persistMode = (m: Mode) => {
    setExpertMode(m === "expert");
    try {
      localStorage.setItem(AICC_PANEL_MODE_KEY, m);
    } catch {
      /* ignore */
    }
  };

  const persistExpand = (n: number) => {
    setExpandLvl(n);
    try {
      const raw = localStorage.getItem(AICC_PANEL_EXPAND_KEY) || "{}";
      const obj = JSON.parse(raw) as Record<string, number>;
      obj[scope] = n;
      localStorage.setItem(AICC_PANEL_EXPAND_KEY, JSON.stringify(obj));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 ring-1 ring-indigo-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">{panel.title}</h2>
          <p className="text-sm text-slate-500">{panel.subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
          <Layers3 className="h-3.5 w-3.5 text-indigo-600" />
          {stats.dirs} 目录 · {stats.files} 文件 · 深度 {stats.depth}
        </span>
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => persistMode("novice")}
            className={`rounded-full px-3 py-1 transition ${!expertMode ? "bg-white text-indigo-700 shadow" : "hover:bg-white/50"}`}
            title="新手模式：深层（L3/L4）字段 disabled；持久化到 localStorage.aicc_panel_mode"
          >
            🌱 新手模式（80% 折叠）
          </button>
          <button
            type="button"
            onClick={() => persistMode("expert")}
            className={`rounded-full px-3 py-1 transition ${expertMode ? "bg-white text-indigo-700 shadow" : "hover:bg-white/50"}`}
            title="专家模式：全字段可编辑；持久化到 localStorage.aicc_panel_mode"
          >
            🛠 专家模式（全展开）
          </button>
        </div>
        <div className="relative inline-block">
          <select
            value={expandLvl}
            onChange={(e) => persistExpand(Number(e.target.value))}
            className="appearance-none rounded-full border border-slate-200 bg-white pr-7 pl-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            title="展开层级选择：按 slug 分别持久化到 localStorage.aicc_panel_expand"
          >
            <option value={1}>展开 L1（极简）</option>
            <option value={2}>展开 L2（新手默认）</option>
            <option value={3}>展开 L3</option>
            <option value={4}>展开 L4（完整）</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2 text-slate-400" />
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ring-1 ${
            readOnlySource || workingTreeDirty
              ? "bg-amber-50 text-amber-800 ring-amber-200"
              : "bg-emerald-50 text-emerald-700 ring-emerald-200"
          }`}
        >
          {readOnlySource ? "⚠️ 真源只读保护中" : workingTreeDirty ? "⚠️ 工作区 dirty（建议先 Diff 再保存）" : "✅ 工作区 clean（可安全写盘）"}
        </span>
      </div>
    </div>
  );
}

export type { PanelMeta, TreeIconKey };
