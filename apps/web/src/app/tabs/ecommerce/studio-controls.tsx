"use client";
const titles: Record<string, string> = { selling: "1. 卖点分析", main: "2. 主图与商品文案", detail: "3. 详情页", video: "4. 商品视频" };
const states: Record<string, string> = { QUEUED: "旧制作任务排队中", RUNNING: "旧制作任务执行中", SUCCESS: "已保存新版本", FAILED: "执行失败", CANCELLED: "已取消" };
export default function StudioControls({ studio, setStudio, data, project, busy, disabled, onPrepare }: any) {
  const jobs = (data.tasks || []).filter((t: any) => t.projectId === project?.id).slice(0, 6);
  const active = jobs.some((t: any) => ["QUEUED", "RUNNING"].includes(t.state));
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div role="tablist" aria-label="商品内容制作类型" className="flex flex-wrap gap-2">{Object.entries(titles).map(([key, title]) => <button key={key} role="tab" aria-selected={studio === key} onClick={() => setStudio(key)} className={"rounded-xl px-4 py-2.5 text-sm " + (studio === key ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-600")}>{title}</button>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-600">在 Codex 对话中说明需求，或复制本环节委托后粘贴到对话。完成后刷新查看结果。</p><div className="flex flex-wrap gap-2"><button disabled={busy || disabled || active || !project} onClick={() => onPrepare("plan")} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm text-white disabled:opacity-40">{studio === "selling" ? "复制卖点分析委托" : studio === "main" ? "复制主图和文案委托" : studio === "detail" ? "复制详情页文案委托" : "复制视频策划委托"}</button>{studio !== "selling" && <button disabled={busy || disabled || active || !project} onClick={() => onPrepare("media")} className="rounded-xl border border-indigo-200 px-4 py-2.5 text-sm text-indigo-700 disabled:opacity-40">{studio === "video" ? "复制商品视频制作委托" : "复制画面制作委托"}</button>}</div></div>
    {active && <p className="text-xs text-amber-700">已有旧制作任务尚未结束，先核对任务结果，再交给 Codex 继续，避免重复生成。</p>}
    {jobs.length > 0 && <div aria-label="商品制作任务" className="space-y-2">{jobs.map((t: any) => <article key={t.id} className="rounded-xl bg-slate-50 p-3 text-xs leading-6"><p className="font-medium">{t.title} · {t.interrupted ? "执行器已中断，需核对结果" : states[t.state] || t.state}</p><p className={t.state === "FAILED" ? "text-rose-700" : "text-slate-500"}>{t.message}{t.resultRevision ? ` · V${t.resultRevision}` : ""}</p></article>)}</div>}
  </section>;
}
