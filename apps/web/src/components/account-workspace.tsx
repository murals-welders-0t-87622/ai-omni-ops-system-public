"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getMe, logout, switchBrand } from "../services/auth";
import { AUTH_SESSION_CHANGED_EVENT, getStoredAuthSession, getAuthSessionGeneration, clearStoredAuthSession, type AuthSession } from "../services/auth-session";

export function AccountWorkspace({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const redirecting = useRef(false);
  useEffect(() => {
    let active = true;
    const current = getStoredAuthSession();
    const generation = getAuthSessionGeneration();
    const back = () => { if (redirecting.current) return; redirecting.current = true; window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); };
    const onChange = () => { if (getAuthSessionGeneration() !== generation) { setReady(false); setVersion(v => v + 1); } };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, onChange);
    if (!current?.accessToken) back();
    else getMe({force:true}).then(() => {
      if (!active || generation !== getAuthSessionGeneration()) return;
      setSession(getStoredAuthSession()); setError(""); setReady(true);
    }).catch(e => { if (active) { setError(e.message || "账号验证失败"); if (!getStoredAuthSession()?.accessToken) back(); } });
    return () => { active = false; window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, onChange); };
  }, [version]);
  if (!ready) return <div className="mx-auto max-w-xl p-8 text-sm text-slate-600" role="status">{error || "正在验证登录身份…"}{error && <div className="mt-4 flex gap-4"><button onClick={() => setVersion(v=>v+1)}>重试</button><button onClick={() => { clearStoredAuthSession(); window.location.assign("/login"); }}>重新登录</button></div>}</div>;
  const brand = session?.brands.find(b => b.id === session.currentBrandId);
  return <><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-5 py-2 text-xs text-slate-600" aria-label="当前账号与品牌">
    <strong>{brand?.brandName || "尚未绑定品牌"}</strong>
    <div className="relative"><button aria-label="账号菜单" aria-expanded={open} onClick={() => setOpen(v=>!v)} className="rounded-lg border border-slate-200 px-3 py-2">{session?.user?.nickname || "当前账号"} ▾</button>
      {open && <div className="absolute right-0 z-50 mt-2 w-64 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <p>{session?.user?.nickname} · {brand?.brandName || "待完善品牌"}</p>
        {session && session.brands.length > 1 && <label className="block">当前品牌<select aria-label="切换当前品牌" value={session.currentBrandId} className="mt-1 w-full rounded border p-2" onChange={e=>void switchBrand(e.target.value).catch(e=>setError(e.message))}>{session.brands.map(b=><option key={b.id} value={b.id}>{b.brandName}</option>)}</select></label>}
        <a className="block text-violet-700" href="/login?account=new&next=%2Ftabs%2Fbrand-control" target="_blank" rel="noopener noreferrer">添加账号，在新标签页登录 ↗</a>
        <a className="block" href="/account">账号与品牌资料</a>
        <button className="block text-red-600" onClick={()=>void logout().catch(()=>{})}>退出当前账号</button>
        {error && <p role="alert" className="text-red-600">{error}</p>}
      </div>}
    </div></div><div key={`${getAuthSessionGeneration()}:${session?.user?.id}:${session?.currentBrandId}`}>{children}</div></>;
}
