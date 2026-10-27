import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpenText } from "lucide-react";
import OntologyDictionaryWorkspace from "../../OntologyDictionaryWorkspace.client";

export const metadata: Metadata = {
  title: "Ontology 五元素字典 · AI 智控中心",
  description: "查看 Ontology Object / Link / Function / Action / Interface 候选全集。",
};

export const dynamic = "force-dynamic";

export default function OntologyDictionaryPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_520px_at_0%_-10%,#eef2ff_0%,#f8fafc_55%,#ffffff_100%)] px-6 py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Link href="/ai-control/ontology" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-700">
                <ArrowLeft className="h-3.5 w-3.5" />
                返回 Ontology 编排中心
              </Link>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                  <BookOpenText className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">Ontology 五元素字典</h1>
                  <p className="mt-1 text-sm text-slate-600">
                    这里直接看当前系统唯一候选全集，画布节点只引用这些元素，不在节点里重复绑定真实资源。
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-100">
              只读查看
              <br />
              不改草稿、不发布契约
            </div>
          </div>
        </header>

        <OntologyDictionaryWorkspace />
      </div>
    </main>
  );
}
