"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "../../../services/http";
import { AUTH_SESSION_CHANGED_EVENT, getStoredCurrentBrandId } from "../../../services/auth-session";

type Form = "text" | "image" | "video";
type Source = { sourceId: string; title: string; authorName: string; workUrl: string; publishedAt: string; collectedAt: string; metricsAt: string; body: string; images: { id: string; url: string }[]; videoUrl: string; metrics: Record<string, number | null> };
type Annotation = { dimensionId: string; status: string; values: string[]; observation: string; reason: string; evidence: Record<string, any>[] };
type Result = { id: string; title: string; generation: number; reportMarkdown: string; reportHtml: string; createdAt: string; profiles: { form: Form; annotations: Annotation[]; transferConditions: string[]; limitations: string[]; structure: { unitRef: string; function: string; explanation: string }[] }[] };
type Item = { id: string; platform: string; goal: string; status: string; revision: number; generation: number; source: Source; forms: Form[]; createdAt: string; events: { action: string; decision?: string; revisionId?: string }[]; results?: Result[] };
const formNames = { text: "文字", image: "图片", video: "视频" };
const stateNames: Record<string, string> = { pending: "待专家接单", running: "分析中", needs_input: "需补资料", failed: "执行失败", completed: "已完成", cancelled: "已取消" };
const metricNames: Record<string, string> = { playCount: "播放", readNum: "阅读", likeCount: "点赞", collectCount: "收藏", commentCount: "评论", shareCount: "分享" };
const button = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 disabled:opacity-40";
const primary = "rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40";
const safeUrl = (value: string) => /^(https?:\/\/|\/(?!\/))/i.test(value) ? value : undefined;
const displayTime = (value: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : value || "未取得";

export function WorkAnalysisWorkspace({ platform }: { platform: string }) {
  const [brandId, setBrandId] = useState("");
  const [brandError, setBrandError] = useState("");
  const [items, setItems] = useState<Item[]>([]), [total, setTotal] = useState(0);
  const [sources, setSources] = useState<Source[]>([]), [sourceTotal, setSourceTotal] = useState(0);
  const [picker, setPicker] = useState(false), [selected, setSelected] = useState<Source | null>(null);
  const [forms, setForms] = useState<Form[]>([]), [goal, setGoal] = useState("研究这件作品的表达结构、内容标签和可迁移方法");
  const [keyword, setKeyword] = useState(""), [query, setQuery] = useState("");
  const [sourceQuery, setSourceQuery] = useState(""), [sourceKeyword, setSourceKeyword] = useState("");
  const [offset, setOffset] = useState(0), [sourceOffset, setSourceOffset] = useState(0), [status, setStatus] = useState("");
  const [detail, setDetail] = useState<Item | null>(null), [version, setVersion] = useState(0);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const scope = useRef(0), submitKey = useRef("");
  const sourceGrid = useRef<HTMLDivElement>(null);
  const [sourcePageInput, setSourcePageInput] = useState("1"), [sourceLoading, setSourceLoading] = useState(false);
  const sourcePages = Math.ceil(sourceTotal / 20), sourcePage = Math.floor(sourceOffset / 20) + 1;
  useEffect(() => { setSourcePageInput(String(sourcePage)); sourceGrid.current?.scrollTo({ top: 0 }); }, [sourcePage]);
  function jumpSourcePage() {
    const page = Number(sourcePageInput);
    if (!Number.isInteger(page) || page < 1 || page > sourcePages) { setError(`请输入1至${sourcePages}之间的整数页码`); return; }
    setError(""); setSourceOffset((page - 1) * 20);
  }

  useEffect(() => {
    let active = true;
    const resolve = async () => {
      setBrandError("");
      const stored = getStoredCurrentBrandId();
      if (stored) { if (active) setBrandId(stored); return; }
      try {
        const result = await request<{ data: { brand: { id: string } } }>("/ai-control-center/mcp/context/current-brand", { headers: { "x-dashboard-client": "nextjs-tabs" } });
        if (active && result.data?.brand?.id) setBrandId(result.data.brand.id);
      } catch (e) { if (active) setBrandError(e instanceof Error ? e.message : "无法读取当前品牌"); }
    };
    void resolve(); window.addEventListener(AUTH_SESSION_CHANGED_EVENT, resolve);
    return () => { active = false; window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, resolve); };
  }, []);
  const api = useCallback(async <T,>(operation: string, input: Record<string, unknown> = {}, write = false) => {
    if (!brandId) throw new Error("请先选择可访问的品牌");
    const base = `/ai-control-center/brands/${encodeURIComponent(brandId)}/work-analysis/${encodeURIComponent(platform)}`;
    const headers = { "x-brand-id": brandId, "x-dashboard-client": "nextjs-tabs" };
    return write ? request<T>(base, { method: "POST", headers, body: JSON.stringify({ operation, input }) }) : request<T>(base + "?" + new URLSearchParams(Object.entries({ operation, ...input }).map(([k, v]) => [k, String(v)])), { headers });
  }, [brandId, platform]);
  useEffect(() => { scope.current++; setItems([]); setSources([]); setDetail(null); setSelected(null); setPicker(false); setOffset(0); setSourceOffset(0); setError(""); setNotice(""); submitKey.current = ""; }, [brandId, platform]);
  const load = useCallback(async () => {
    if (!brandId) return;
    const token = scope.current;
    try {
      const result = await api<{ items: Item[]; total: number }>("list_work_analysis_requests", { keyword: query, status, offset, limit: 20 });
      if (token === scope.current) { setItems(result.items); setTotal(result.total); setError(""); if (offset >= result.total && offset > 0) setOffset(Math.max(0, Math.ceil(result.total / 20) - 1) * 20); }
    } catch (e) { if (token === scope.current) setError(e instanceof Error ? e.message : "读取失败"); }
  }, [api, brandId, query, status, offset]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!picker || !brandId) return;
    const token = scope.current;
    let active = true; setSourceLoading(true);
    void api<{ items: Source[]; total: number }>("list_collected_works_for_analysis", { keyword: sourceQuery, offset: sourceOffset, limit: 20 }).then(r => { if (active && token === scope.current) { setSources(r.items); setSourceTotal(r.total); if (sourceOffset >= r.total && sourceOffset > 0) setSourceOffset(Math.max(0, Math.ceil(r.total / 20) - 1) * 20); } }).catch(e => { if (active && token === scope.current) setError(e.message); }).finally(() => { if (active && token === scope.current) setSourceLoading(false); });
    return () => { active = false; };
  }, [picker, api, brandId, sourceQuery, sourceOffset]);
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); setNotice(""); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "操作失败"); } finally { setBusy(false); } }
  async function open(item: Item) { const token = scope.current; const r = await api<Item>("get_work_analysis_result", { requestId: item.id }); if (token !== scope.current) return; setDetail(r); setVersion(0); }
  async function create() {
    if (!selected) return;
    const token = scope.current;
    const r = await api<Item>("create_work_analysis_request", { sourceId: selected.sourceId, forms, goal, idempotencyKey: submitKey.current }, true);
    if (token !== scope.current) return;
    setSelected(null); setPicker(false); submitKey.current = ""; setNotice("已登记拆解委托，等待WorkBuddy专家团接单。"); await load(); await open(r);
  }
  async function change(action: string) {
    if (!detail) return;
    await api("update_work_analysis_request", { requestId: detail.id, expectedRevision: detail.revision, action, message: action === "cancel" ? "用户取消此次拆解" : "用户继续拆解委托" }, true);
    if (action === "cancel") { setItems(v => v.filter(i => i.id !== detail.id)); setDetail(null); setNotice("已取消并移除此拆解。"); }
    else await open(detail);
    await load();
  }
  async function review(decision: string) {
    if (!detail?.results?.[0]) return;
    await api("review_work_analysis_result", { requestId: detail.id, revisionId: detail.results[0].id, expectedRevision: detail.revision, decision }, true); await open(detail); await load(); setNotice("审阅意见已保存。");
  }
  const result = detail?.results?.[version];
  function facts(source: Source) {
    return <div className="space-y-1 text-xs text-slate-500"><p>{source.authorName || "作者未取得"} · {displayTime(source.publishedAt)}</p><p>{Object.entries(source.metrics).filter(([, n]) => n !== null).map(([k, n]) => `${metricNames[k] || k} ${n}`).join(" · ") || "表现数据未取得"}</p><p>指标时间：{displayTime(source.metricsAt)}</p>{safeUrl(source.workUrl) && <a href={safeUrl(source.workUrl)} target="_blank" rel="noopener noreferrer" className="text-violet-600">查看原作</a>}</div>;
  }
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5" aria-label="作品拆解工作区">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">作品拆解</h2><div className="flex gap-2"><button className={button} onClick={() => void load()}>刷新</button><button className={primary} disabled={!brandId} onClick={() => setPicker(v => !v)}>选择采集作品</button></div></div>
    {(error || brandError) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error || brandError}</p>}{notice && <p role="status" className="rounded-lg bg-violet-50 p-3 text-sm text-violet-700">{notice}</p>}
    {!brandId && !brandError && <p className="text-sm text-slate-500">正在读取当前品牌…</p>}
    <div className="flex flex-wrap gap-2"><input aria-label="搜索拆解标签或目标" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="搜索内容标签或拆解目标" value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setQuery(keyword); setOffset(0); } }} /><button className={button} onClick={() => { setQuery(keyword); setOffset(0); }}>搜索</button><select aria-label="拆解状态" className={button} value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }}><option value="">全部状态</option>{Object.entries(stateNames).filter(([k]) => k !== "cancelled").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
    {picker && <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/30 p-4"><div className="flex justify-between"><h3 className="font-medium">从本平台采集数据选择</h3><button className={button} onClick={() => { setPicker(false); setSelected(null); }}>关闭</button></div><div className="flex gap-2"><input aria-label="搜索采集作品" value={sourceKeyword} onChange={e => setSourceKeyword(e.target.value)} placeholder="标题、作者或正文" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" /><button className={button} onClick={() => { setSourceQuery(sourceKeyword); setSourceOffset(0); }}>查找</button></div>
      <div ref={sourceGrid} aria-busy={sourceLoading} className="grid max-h-[32rem] gap-3 overflow-y-auto lg:grid-cols-2">{sources.map(s => <article key={s.sourceId} className={`space-y-2 rounded-lg border bg-white p-3 ${selected?.sourceId === s.sourceId ? "border-violet-500" : "border-slate-200"}`}><h4 className="line-clamp-2 text-sm font-medium">{s.title || "未命名作品"}</h4>{facts(s)}<p className="text-xs text-slate-500">{s.body ? "有文字" : "文字待补"} · {s.images.length}张图片 · {s.videoUrl ? "有视频引用" : "无视频引用"}</p><button className={button} onClick={() => { setSelected(s); setForms(s.videoUrl ? ["video"] : s.images.length ? (s.body ? ["text", "image"] : ["image"]) : ["text"]); submitKey.current = crypto.randomUUID(); }}>选择这件作品</button></article>)}</div>
      {!sources.length && <p className="text-sm text-slate-500">没有匹配的采集作品。请先在本平台采集数据中取得作品。</p>}<div className="flex flex-wrap items-center gap-3 text-xs text-slate-500"><button className={button} disabled={sourceLoading || !sourceOffset} onClick={() => setSourceOffset(v => Math.max(0, v - 20))}>上一页</button><span>匹配{sourceTotal}件 · 第{sourceTotal ? sourcePage : 0}/{sourcePages}页</span><button className={button} disabled={sourceLoading || sourceOffset + 20 >= sourceTotal} onClick={() => setSourceOffset(v => v + 20)}>下一页</button><label className="flex items-center gap-2">跳至<input aria-label="采集作品页码" type="number" min={1} max={sourcePages || 1} value={sourcePageInput} disabled={sourceLoading || !sourceTotal} onChange={e => setSourcePageInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !sourceLoading && sourceTotal) jumpSourcePage(); }} className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-700" />页</label><button className={button} disabled={sourceLoading || !sourceTotal} onClick={jumpSourcePage}>跳转</button></div>
      {selected && <div className="space-y-3 border-t border-violet-100 pt-4"><h4 className="font-medium">拆解《{selected.title}》</h4><div className="flex gap-4">{Object.entries(formNames).map(([k, label]) => <label key={k} className="text-sm"><input type="checkbox" checked={forms.includes(k as Form)} onChange={e => { setForms(v => e.target.checked ? [...v, k as Form] : v.filter(f => f !== k)); submitKey.current = crypto.randomUUID(); }} /> {label}</label>)}</div><textarea aria-label="拆解目标" value={goal} onChange={e => { setGoal(e.target.value); submitKey.current = crypto.randomUUID(); }} className="min-h-20 w-full rounded-lg border p-3 text-sm" /><button className={primary} disabled={busy || !forms.length || !goal.trim()} onClick={() => void run(create)}>确认拆解这件作品</button><p className="text-xs text-slate-500">确认后登记委托，由WorkBuddy专家团接单执行。</p></div>}
    </div>}
    <div className="grid gap-3 lg:grid-cols-2">{items.map(item => <button key={item.id} onClick={() => void run(() => open(item))} className="space-y-2 rounded-xl border border-slate-200 p-4 text-left hover:border-violet-300"><div className="flex justify-between gap-3"><strong className="text-sm">{item.source.title}</strong><span className="whitespace-nowrap text-xs text-violet-600">{stateNames[item.status] || item.status}</span></div><p className="text-xs text-slate-500">{item.forms.map(f => formNames[f]).join(" / ")} · {item.goal}</p><p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()} · 第{item.generation}次拆解</p></button>)}</div>
    {brandId && !items.length && <p className="py-8 text-center text-sm text-slate-500">暂无匹配的拆解。可从采集作品中选择值得研究的内容。</p>}
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500"><button className={button} disabled={!offset} onClick={() => setOffset(v => Math.max(0, v - 20))}>上一页</button><span>匹配{total}件</span><button className={button} disabled={offset + 20 >= total} onClick={() => setOffset(v => v + 20)}>下一页</button></div>
    {detail && <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between gap-3"><h3 className="font-semibold">{detail.source.title}</h3><button className={button} onClick={() => setDetail(null)}>收起</button></div>{facts(detail.source)}
      <div className="flex flex-wrap gap-2"><span className="rounded-lg bg-white px-3 py-2 text-xs">{stateNames[detail.status]}</span>{detail.status === "pending" && <button className={primary} disabled={busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(`请由作品深度拆解专家团，先核对连接器品牌与页面品牌引用 ${brandId} 一致，再读取并执行${platform === "douyin" ? "抖音/视频号" : platform === "wechat" ? "公众号" : "小红书"}作品拆解委托 ${detail.id}（平台${platform}）。目标：${detail.goal}。请读取固定来源和对应形式字典，正式调用专业成员；缺原文、原图或视听输入时如实标记需补资料；完成后提交并读回对应平台结果，禁止直接代写成员分析。`); setNotice("已复制完整交接指令，可交给WorkBuddy作品深度拆解专家团。"); })}>复制WorkBuddy交接指令</button>}{["needs_input", "failed"].includes(detail.status) && <button className={button} disabled={busy} onClick={() => void run(() => change("resume"))}>继续委托</button>}{["pending", "running", "needs_input", "failed"].includes(detail.status) && <button className={button} disabled={busy} onClick={() => void run(() => change("cancel"))}>取消拆解</button>}{detail.status === "completed" && <button className={button} disabled={busy} onClick={() => void run(() => change("reanalyse"))}>保留旧版，重新拆解</button>}</div>
      <details><summary className="cursor-pointer text-sm">原作文字与资源</summary><div className="mt-3 space-y-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detail.source.body || "正文尚未取得"}</p><div className="flex flex-wrap gap-2">{detail.source.images.map((i, index) => safeUrl(i.url) && <a key={i.id} href={safeUrl(i.url)} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600">查看第{index + 1}张原图</a>)}{safeUrl(detail.source.videoUrl) && <a href={safeUrl(detail.source.videoUrl)} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600">查看视频资源</a>}</div></div></details>
      {!!detail.results?.length && <><select className={button} aria-label="拆解结果版本" value={version} onChange={e => setVersion(Number(e.target.value))}>{detail.results.map((r, i) => <option key={r.id} value={i}>第{r.generation}次拆解 · {new Date(r.createdAt).toLocaleString()}</option>)}</select>{result && <><h4 className="font-medium">{result.title}</h4>{result.profiles.map(p => <div key={p.form} className="space-y-3 rounded-lg bg-white p-4"><h5 className="font-medium">{formNames[p.form]}分析</h5>{p.structure.map((s, i) => <p key={i} className="text-sm text-slate-600">{s.unitRef} · {s.function}：{s.explanation}</p>)}<div className="space-y-2">{p.annotations.filter(a => a.status === "observed").map(a => <details key={a.dimensionId} className="rounded-lg border border-slate-100 p-3"><summary className="cursor-pointer text-sm">{a.values.join(" / ") || a.dimensionId} · {a.observation}</summary><p className="mt-2 text-xs text-slate-500">{a.reason}</p>{a.evidence.map((e, i) => <p key={i} className="mt-1 text-xs text-slate-500">{p.form === "text" ? `${e.paragraphId}：${e.quote}` : p.form === "image" ? `第${e.pageIndex + 1}张 · 区域 ${e.bbox.join(", ")}` : `${(e.startMs / 1000).toFixed(1)}—${(e.endMs / 1000).toFixed(1)}秒`}</p>)}</details>)}</div><p className="text-sm text-slate-600">迁移条件：{p.transferConditions.join("；")}</p>{!!p.limitations.length && <p className="text-xs text-slate-500">限制：{p.limitations.join("；")}</p>}</div>)}<details><summary className="cursor-pointer text-sm">完整拆解报告</summary><pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{result.reportMarkdown}</pre></details><div className="flex flex-wrap gap-2"><button className={button} onClick={() => { const url = URL.createObjectURL(new Blob([result.reportHtml], { type: "text/html;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = `作品拆解-第${result.generation}版.html`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>下载报告</button>{detail.status === "completed" && version === 0 && <><button className={primary} disabled={busy} onClick={() => void run(() => review("accepted"))}>采纳这版</button><button className={button} disabled={busy} onClick={() => void run(() => review("changes_requested"))}>记录需修改</button></>}</div><p className="text-xs text-slate-500">{detail.events.filter(e => e.action === "review" && e.revisionId === result.id).at(-1)?.decision === "accepted" ? "已记录采纳" : detail.events.filter(e => e.action === "review" && e.revisionId === result.id).at(-1)?.decision === "changes_requested" ? "已记录需修改" : "待审阅"}</p></>}</>}
    </div>}
  </section>;
}
