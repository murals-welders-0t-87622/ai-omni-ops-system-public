"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getMe } from "../services/auth";
import { AUTH_SESSION_CHANGED_EVENT, getAuthSessionGeneration, getStoredAuthSession } from "../services/auth-session";

// Configuration stays physically separate from the operating navigation.
export function PlatformAdminBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/ai-control";
  const [version, setVersion] = useState(0);
  const [validated, setValidated] = useState("");
  const [message, setMessage] = useState("");
  const key = `${pathname}:${version}:${getAuthSessionGeneration()}`;
  useEffect(() => {
    let active = true;
    const generation = getAuthSessionGeneration();
    const back = () => window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    const changed = () => { if (generation !== getAuthSessionGeneration()) { setValidated(""); setVersion(v => v + 1); } };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, changed);
    setMessage("");
    if (!getStoredAuthSession()?.accessToken) back();
    else getMe({ force: true }).then(() => {
      if (!active || generation !== getAuthSessionGeneration()) return;
      const role = getStoredAuthSession()?.user?.systemRole;
      const personalAssets = pathname === "/ai-control/assets" || pathname.startsWith("/ai-control/assets/");
      if (!personalAssets && role !== "SUPER_ADMIN" && role !== "ADMIN_OPERATOR") {
        setMessage("当前账号没有平台管理权限"); return;
      }
      setValidated(key);
    }).catch(e => {
      if (!active) return;
      if (!getStoredAuthSession()?.accessToken) back();
      else setMessage(e.message || "身份验证失败，请重试");
    });
    return () => { active = false; window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, changed); };
  }, [pathname, version, key]);
  if (validated !== key) return <main className="mx-auto max-w-xl p-8 text-sm text-slate-600" role="status">
    {message || "正在验证后台访问权限…"}
    {message && <div className="mt-4 flex gap-4"><button onClick={() => setVersion(v => v + 1)}>重试</button><a href="/tabs/brand-control">返回运营工作台</a></div>}
  </main>;
  return <div key={key}>{children}</div>;
}
