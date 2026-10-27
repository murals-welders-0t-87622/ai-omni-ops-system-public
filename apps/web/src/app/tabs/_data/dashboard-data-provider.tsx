"use client";

import type React from "react";
import { useEffect, useState, type ReactNode } from "react";
import type { DashboardData, DashboardApiResponse } from "./types";
import type { TabSlugKey } from "./index";
import { dashboardLayoutOnly } from "./layout-only";
import { STATIC_DASHBOARD_DATA } from "./index";

export function useDashboardData(tabSlug: TabSlugKey) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [source, setSource] = useState<"loading" | "sqlite" | "static">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const layout = dashboardLayoutOnly(STATIC_DASHBOARD_DATA[tabSlug]);
    setData(layout); setSource("static"); setError(null);
  }, [tabSlug]);

  return { data, source, error };
}

export function DataSourceBanner({
  source,
  error,
}: {
  source: "loading" | "sqlite" | "static";
  error?: string | null;
}) {
  if (source === "loading") {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
        正在加载驾驶舱数据…
      </div>
    );
  }
  if (source === "sqlite") {
    return null;
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 ring-1 ring-amber-100">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      请在当前品牌的业务板块查看数据
    </div>
  );
}

export function Toast({
  tone = "info",
  message,
  visible,
}: {
  tone?: "info" | "success" | "warn" | "error";
  message: string;
  visible: boolean;
}) {
  if (!visible) return null;
  const toneMap = {
    info: "bg-slate-900/90 text-white",
    success: "bg-emerald-600/95 text-white",
    warn: "bg-amber-600/95 text-white",
    error: "bg-rose-600/95 text-white",
  };
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2">
      <div
        className={`pointer-events-auto rounded-full px-4 py-2 text-[13px] font-medium shadow-lg ring-1 ring-white/20 ${toneMap[tone]}`}
      >
        {message}
      </div>
    </div>
  );
}

export function withToast(
  fn: () => Promise<void>,
  setToast: React.Dispatch<React.SetStateAction<{ visible: boolean; message: string; tone: "success" | "error" | "info" | "warn" }>>,
  successMsg: string,
  errorPrefix: string,
) {
  return async () => {
    setToast({ visible: true, message: "执行中…", tone: "info" });
    try {
      await fn();
      setToast({ visible: true, message: successMsg, tone: "success" });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setToast({ visible: true, message: `${errorPrefix}：${msg.slice(0, 40)}`, tone: "error" });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3200);
    }
  };
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[15px] font-semibold text-slate-900">{title}</h4>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
