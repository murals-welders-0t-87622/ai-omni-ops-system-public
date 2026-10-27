"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getMe } from "../services/auth";
import { AUTH_SESSION_CHANGED_EVENT, getAuthSessionGeneration, getStoredAuthSession } from "../services/auth-session";
import { request } from "../services/http";
import { isPlatformAdministrator } from "../services/workspace-access";

export function BrandAdminBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/brand-admin";
  const [version, setVersion] = useState(0), [validated, setValidated] = useState("");
  const [message, setMessage] = useState(""), [brandName, setBrandName] = useState("");
  const key = `${pathname}:${version}:${getAuthSessionGeneration()}`;
  useEffect(() => {
    let active = true;
    const generation = getAuthSessionGeneration();
    const back = () => window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    const changed = () => { if (generation !== getAuthSessionGeneration()) { setValidated(""); setVersion(v => v + 1); } };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, changed);
    setMessage("");
    if (!getStoredAuthSession()?.accessToken) back();
    else void (async () => {
      try {
        await getMe({ force: true });
        const session = getStoredAuthSession(), id = session?.currentBrandId;
        if (!id) throw Error("请先选择品牌");
        const permissions = await request<{brandId:string;brandName:string;canManageMembers:boolean;currentUserRole:string}>(`/brands/${encodeURIComponent(id)}/member-permissions`);
        if (!active || generation !== getAuthSessionGeneration()) return;
        if (permissions.brandId !== id || !permissions.canManageMembers || permissions.currentUserRole !== "ADMIN") throw Error("当前账号没有该品牌的后台管理权限");
        setBrandName(permissions.brandName);setValidated(key);
      } catch (e) {
        if (!active) return;
        if (!getStoredAuthSession()?.accessToken) back();
        else setMessage(e instanceof Error ? e.message : "品牌权限验证失败");
      }
    })();
    return () => { active = false;window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, changed); };
  }, [pathname, version, key]);
  if (validated !== key) return <main className="mx-auto max-w-xl p-8 text-sm text-slate-600" role="status">{message || "正在验证品牌管理权限…"}{message && <div className="mt-4 flex gap-4"><button onClick={() => setVersion(v=>v+1)}>重试</button><a href="/tabs/brand-control">返回运营工作台</a></div>}</main>;
  const links = [{href:"/brand-admin",label:"智控中心"},{href:"/brand-admin/apis",label:"接口与连接器配置"},{href:"/brand-admin/assets",label:"统一素材管理"},{href:"/brand-admin/brand",label:"品牌资产设置"},{href:"/brand-admin/ai-sales",label:"3Chat渠道归属"},{href:"/brand-admin/private-operations",label:"有赞店铺归属"}];
  return <div key={key} className="min-h-screen bg-slate-50 text-slate-800"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5"><div><p className="text-xs text-slate-500">{brandName}</p><h1 className="mt-1 text-xl font-semibold">AI 智控中心</h1></div><div className="flex gap-4 text-sm"><a href="/tabs/brand-control">返回运营工作台</a>{isPlatformAdministrator(getStoredAuthSession()) && <a className="text-violet-700" href="/ai-control">平台全局管理</a>}</div></div><nav aria-label="品牌后台导航" className="mx-auto flex max-w-7xl flex-wrap gap-2 px-5 pb-4">{links.map(l=><Link key={l.href} href={l.href} className={`rounded-lg px-4 py-2 text-sm ${(pathname===l.href || l.href!=="/brand-admin" && pathname.startsWith(l.href+"/"))?"bg-violet-600 text-white":"bg-slate-100"}`}>{l.label}</Link>)}</nav></header><div className="mx-auto max-w-7xl px-4 py-6">{children}</div></div>;
}
