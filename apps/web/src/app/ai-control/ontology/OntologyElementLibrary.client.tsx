"use client";
import { authenticatedFetch } from "../../../services/http";

import { useEffect, useState } from "react";
import { Boxes, Loader2, RefreshCw } from "lucide-react";

export type ElementItem = {
  id: string;
  kind: string;
  label: string;
  name: string;
  refType?: string;
  path?: string;
  description?: string;
  count?: number;
};

export type ElementGroup = {
  key: string;
  title: string;
  source: string;
  total: number;
  items: ElementItem[];
};

type ElementLibraryState = {
  loading: boolean;
  message: string;
  groups: ElementGroup[];
};

export default function OntologyElementLibrary({
  selectedIds = [],
  onSelect,
  title = "真实元素库",
  maxItemsPerGroup = 6,
}: {
  selectedIds?: string[];
  onSelect?: (item: ElementItem) => void;
  title?: string;
  maxItemsPerGroup?: number;
}) {
  const [state, setState] = useState<ElementLibraryState>({
    loading: true,
    message: "正在读取元素库...",
    groups: [],
  });

  async function loadElements() {
    setState((current) => ({ ...current, loading: true, message: "正在读取元素库..." }));
    try {
      const response = await authenticatedFetch("/api/ai-control/ontology/elements", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `读取失败 ${response.status}`);
      }
      setState({
        loading: false,
        message: `已读取 ${data.groups?.length || 0} 组元素`,
        groups: data.groups || [],
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  useEffect(() => {
    void loadElements();
  }, []);

  return (
    <aside className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
            <Boxes className="h-4 w-4" />
          </span>
          {title}
        </div>
        <button
          type="button"
          onClick={() => void loadElements()}
          disabled={state.loading}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 disabled:opacity-60"
        >
          {state.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          回读
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
        {state.message}
      </div>
      {state.groups.map((group) => (
        <div key={group.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{group.title}</p>
              <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">{group.source}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {group.total}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {group.items.slice(0, maxItemsPerGroup).map((item) => {
              const selected = selectedIds.includes(item.id);
              return (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelect?.(item)}
                className={[
                  "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                  selected
                    ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                    : "border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-white",
                ].join(" ")}
                title={item.description || item.name}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="line-clamp-1">{item.label}</span>
                  {typeof item.count === "number" ? (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-100">
                      {item.count}
                    </span>
                  ) : null}
                </div>
              </button>
            );
            })}
            {!group.items.length ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                暂无元素
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </aside>
  );
}
