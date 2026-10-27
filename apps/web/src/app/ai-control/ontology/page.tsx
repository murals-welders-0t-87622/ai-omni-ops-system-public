import type { Metadata } from "next";
import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import OntologyProjectShell from "./OntologyProjectShell.client";

export const metadata: Metadata = {
  title: "Ontology 编排中心 · AI 智控中心",
  description: "专家团、专家与 AI 中台能力之间的业务流程导航和五元素编排。",
};

export const dynamic = "force-dynamic";

export default function OntologyOrchestrationPage() {
  const apiBaseUrl = String(process.env.API_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();

  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_520px_at_0%_-10%,#eef2ff_0%,#f8fafc_55%,#ffffff_100%)] px-6 py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <Link href="/ai-control" className="text-xs font-medium text-slate-500 hover:text-indigo-700">
                AI 智控中心 / Ontology 编排中心
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                  <BrainCircuit className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                    Ontology 编排中心
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    专家团/专家与 AI 中台能力之间的业务流程导航系统。
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link
                href="/ai-control/ontology/elements/dictionary"
                className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200 hover:text-indigo-700"
              >
                五元素字典
              </Link>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                S3-02Z 启动前读取
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-800 ring-1 ring-emerald-200">
                published_contract / execution plan / 留证
              </span>
            </div>
          </div>
        </header>

        <OntologyProjectShell apiBaseUrl={apiBaseUrl} />
      </div>
    </main>
  );
}
