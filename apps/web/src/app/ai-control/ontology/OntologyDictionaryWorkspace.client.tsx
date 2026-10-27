"use client";
import { authenticatedFetch } from "../../../services/http";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Loader2, RefreshCw, Search } from "lucide-react";

type DictionaryItem = {
  id: string;
  kind: string;
  label: string;
  name: string;
  refType: string;
  description: string;
  elementType: "Object" | "Link" | "Function" | "Action" | "Interface";
  status: string;
  source: string;
  primaryConsumers: string[];
  bindings: string[];
};

type DictionaryGroup = {
  key: string;
  title: DictionaryItem["elementType"];
  total: number;
  items: DictionaryItem[];
};

type DictionaryState = {
  loading: boolean;
  message: string;
  source: string;
  groups: DictionaryGroup[];
};

const TYPE_OPTIONS: Array<DictionaryItem["elementType"] | "All"> = ["All", "Object", "Link", "Function", "Action", "Interface"];

export default function OntologyDictionaryWorkspace() {
  const [state, setState] = useState<DictionaryState>({
    loading: true,
    message: "正在读取五元素候选全集...",
    source: "",
    groups: [],
  });
  const [keyword, setKeyword] = useState("");
  const [activeType, setActiveType] = useState<DictionaryItem["elementType"] | "All">("All");
  const [selectedId, setSelectedId] = useState("");

  async function loadDictionary() {
    setState((current) => ({ ...current, loading: true, message: "正在读取五元素候选全集..." }));
    try {
      const response = await authenticatedFetch("/api/ai-control/ontology/elements/dictionary", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `读取失败 ${response.status}`);
      }
      const groups = Array.isArray(data.groups) ? data.groups : [];
      setState({
        loading: false,
        message: `已读取候选全集 ${groups.reduce((sum: number, group: DictionaryGroup) => sum + (group.total || 0), 0)} 个元素`,
        source: data.source || "",
        groups,
      });
      const firstItem = groups.flatMap((group: DictionaryGroup) => group.items || [])[0];
      setSelectedId(firstItem?.id || "");
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  useEffect(() => {
    void loadDictionary();
  }, []);

  const filteredGroups = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return state.groups
      .filter((group) => activeType === "All" || group.title === activeType)
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!normalizedKeyword) return true;
          const haystack = [
            item.id,
            item.label,
            item.name,
            item.description,
            item.source,
            item.status,
            ...(item.primaryConsumers || []),
            ...(item.bindings || []),
          ].join(" ").toLowerCase();
          return haystack.includes(normalizedKeyword);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [activeType, keyword, state.groups]);

  const filteredItems = useMemo(
    () => filteredGroups.flatMap((group) => group.items),
    [filteredGroups],
  );

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null,
    [filteredItems, selectedId],
  );

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
              <Boxes className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-950">五元素字典</h2>
              <p className="mt-1 text-sm text-slate-600">
                先定义标准语义，再由画布节点选择，不在节点里临时绑定真实资源。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadDictionary()}
            disabled={state.loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
          >
            {state.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            回读
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          {state.groups.map((group) => (
            <div key={group.key} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
              <div className="text-xs font-semibold text-slate-500">{group.title}</div>
              <div className="mt-1 text-xl font-bold text-slate-950">{group.total}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-100">
          {state.message}
          {state.source ? <span className="ml-2 text-slate-500">source: {state.source}</span> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.8fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveType(type)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition",
                    activeType === type
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {type === "All" ? "全部" : type}
                </button>
              ))}
            </div>
            <label className="relative block min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索 ID、名称、绑定、板块"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-indigo-400"
              />
            </label>
          </div>

          <div className="mt-4 space-y-4">
            {filteredGroups.map((group) => (
              <div key={group.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                    {group.items.length}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {group.items.map((item) => {
                    const active = selectedItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={[
                          "rounded-2xl border px-4 py-3 text-left transition",
                          active
                            ? "border-indigo-200 bg-indigo-50"
                            : "border-white bg-white hover:border-slate-200",
                        ].join(" ")}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{item.id}</p>
                            <p className="mt-1 text-sm text-slate-700">{item.name}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.description || "暂无说明"}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {!filteredGroups.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                当前筛选下暂无元素
              </div>
            ) : null}
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">元素详情</p>
          {selectedItem ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                    {selectedItem.elementType}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {selectedItem.status}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-950">{selectedItem.id}</h3>
                <p className="mt-1 text-sm font-medium text-slate-700">{selectedItem.name}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{selectedItem.description || "暂无业务解释"}</p>
              </div>

              <DetailBlock title="来源" items={[selectedItem.source]} />
              <DetailBlock title="主要使用专家/板块" items={selectedItem.primaryConsumers} emptyText="待补充" />
              <DetailBlock title="初始绑定" items={selectedItem.bindings} emptyText="当前 seed 尚未展开真实绑定" />

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500 ring-1 ring-slate-100">
                当前画布、AI 草案和字典页现在共用同一份候选全集；卡片上的状态只表示来源成熟度，不再代表第二套独立入口。
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              先选择一个元素
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function DetailBlock({
  title,
  items,
  emptyText = "暂无",
}: {
  title: string;
  items?: string[];
  emptyText?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items?.length ? items.map((item) => (
          <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
            {item}
          </span>
        )) : (
          <span className="text-sm text-slate-400">{emptyText}</span>
        )}
      </div>
    </div>
  );
}
