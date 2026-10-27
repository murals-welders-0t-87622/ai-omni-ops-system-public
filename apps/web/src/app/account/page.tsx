"use client";
import { useState } from "react";
import { AccountWorkspace } from "../../components/account-workspace";
import { getStoredAuthSession } from "../../services/auth-session";
import { updateProfile } from "../../services/auth";

function AccountDetails() {
  const session = getStoredAuthSession();
  const [nickname, setNickname] = useState(session?.user?.nickname || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const brand = session?.brands.find(b=>b.id===session.currentBrandId);
  return <main className="mx-auto max-w-2xl space-y-6 p-6 text-slate-800"><a href="/tabs/brand-control" className="text-sm text-violet-700">← 返回经营驾驶舱</a><h1 className="text-2xl font-semibold">账号与品牌资料</h1><section className="space-y-3 rounded-xl border p-5"><h2 className="font-semibold">当前品牌</h2><p>{brand?.brandName || "尚未绑定品牌"}</p><p className="text-sm text-slate-500">{brand?.industry}</p><a className="text-sm text-violet-700" href="/tabs/brand-growth">完善品牌资料 →</a></section><form className="space-y-4 rounded-xl border p-5" onSubmit={e=>{e.preventDefault();setBusy(true);void updateProfile({nickname,mobile:session?.user?.mobile||""}).then(()=>setMessage("账号资料已保存")).catch(e=>setMessage(e.message)).finally(()=>setBusy(false));}}><h2 className="font-semibold">账号资料</h2><p className="text-sm">登录邮箱：{session?.user?.email || "未填写"}</p><label className="block text-sm">昵称<input aria-label="昵称" className="mt-2 block w-full rounded border p-2" value={nickname} required maxLength={60} onChange={e=>setNickname(e.target.value)} /></label><button className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white" disabled={busy}>{busy?"保存中…":"保存账号资料"}</button>{message&&<p role="status" className="text-sm">{message}</p>}</form><a className="inline-block text-sm text-violet-700" href="/login?account=new&next=%2Ftabs%2Fbrand-control" target="_blank" rel="noopener noreferrer">在新标签页登录其他账号 ↗</a></main>;
}
export default function AccountPage() { return <AccountWorkspace><AccountDetails /></AccountWorkspace>; }
