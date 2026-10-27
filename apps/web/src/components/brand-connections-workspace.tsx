"use client";
import { useEffect, useState } from "react";
import { downloadAIControlCenterSkillPackage, getAIControlCenterInstallationWorkspace, revealAIControlCenterInstallToken, type AIControlCenterInstallWorkspace } from "../services/openclaw";
import { request } from "../services/http";
import OpenClawInstallationPanel, { buildVisibleSnippet, type SnippetTabKey } from "./openclaw-installation-panel";

type Connection = { id: string; connectionId: string; tokenName: string; clientKind?:string; authorizationHash:string; allowedTools:string[]|null; legacy: boolean; state: "active" | "expired" | "revoked" };
type Connections = { brandId: string; canManage: boolean; items: Connection[]; presets:{brand:string[]} };
const base = "/ai-control-center/installation-hub/connections";
export default function BrandConnectionsWorkspace() {
  const [workspace, setWorkspace] = useState<AIControlCenterInstallWorkspace|null>(null);
  const [current, setCurrent] = useState<Connection>();
  const [connections,setConnections]=useState<Connection[]>([]),[selectedConnectionId,setSelectedConnectionId]=useState(""),[brandToolCount,setBrandToolCount]=useState(0),[grantConfirmation,setGrantConfirmation]=useState(false),[isUpgrading,setIsUpgrading]=useState(false);
  const [rawToken, setRawToken] = useState(""), [isTokenVisible, setIsTokenVisible] = useState(false);
  const [selectedSnippetTab, setSelectedSnippetTab] = useState<SnippetTabKey>("ai-control-center");
  const [isLoadingOc, setIsLoadingOc] = useState(true), [isRotating, setIsRotating] = useState(false), [isRevoking, setIsRevoking] = useState(false), [isRevealing, setIsRevealing] = useState(false), [isDownloading, setIsDownloading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<{action:"generate"|"rotate"|"revoke";connection?:Connection}>();
  async function readWorkspace(preferredId?:string) {
    const connections = await request<Connections>(base);
    const activeItems=connections.items.filter(item=>item.state==="active");
    const active = activeItems.find(item=>item.connectionId===(preferredId||selectedConnectionId))||activeItems[0];
    setConnections(activeItems);setBrandToolCount(connections.presets.brand.length);setSelectedConnectionId(active?.connectionId||"");
    const guide = active ? await request<AIControlCenterInstallWorkspace>(`${base}/${encodeURIComponent(active.connectionId)}/workspace`) : await getAIControlCenterInstallationWorkspace();
    if (guide.brandId !== connections.brandId) throw new Error("品牌信息已变化，请刷新页面");
    if (active && active.id !== guide.activeToken?.id) throw new Error("连接状态已变化，请刷新页面");
    setWorkspace(active ? guide : {...guide, activeToken:undefined}); setCurrent(active);
  }
  async function loadWorkspace() {
    setIsLoadingOc(true); setError(""); setNotice(""); setRawToken(""); setIsTokenVisible(false);
    try { await readWorkspace(); } catch(e) { setError(e instanceof Error ? e.message : "安装配置读取失败"); } finally { setIsLoadingOc(false); }
  }
  useEffect(() => { void loadWorkspace(); }, []);
  async function handleRotateToken() { setConfirmation({action:current && !current.legacy ? "rotate" : "generate", connection:current}); }
  async function handleRevokeToken() { if(current) setConfirmation({action:"revoke",connection:current}); }
  async function confirmChange() {
    if (!confirmation || !workspace?.canManage) return;
    const chosen=confirmation;
    if(chosen.action==="revoke") setIsRevoking(true); else setIsRotating(true);
    setError(""); setNotice("");
    try {
      if(chosen.action==="revoke") {
        await request(`${base}/${encodeURIComponent(chosen.connection!.connectionId)}`, {method:"DELETE"});
        setRawToken(""); setNotice("当前正式安装令牌已停用，其他连接不受影响。");
      } else {
        const clientKind=selectedSnippetTab==="workbuddy" ? "workbuddy" : selectedSnippetTab==="codex" ? "codex" : selectedSnippetTab==="ai-control-center" ? "openclaw" : selectedSnippetTab==="doubaoWork" ? "doubao-work" : selectedSnippetTab==="qwenWork" ? "qwen-work" : "other";
        const result=await request<{token:string;connection:Connection}>(chosen.action==="rotate" ? `${base}/${encodeURIComponent(chosen.connection!.connectionId)}/rotate` : base, {method:"POST", ...(chosen.action==="generate" ? {body:JSON.stringify({name:"AI 智控中心 正式安装令牌",clientKind,access:"brand",expiresInDays:30})} : {})});
        setRawToken(result.token); setNotice(chosen.action==="rotate" ? "当前连接已重置，请更新对应客户端；其他连接不受影响。" : "正式安装令牌已生成，请复制 MCP 配置，再任选 Git 或 ZIP 安装 Skill。");
      }
      setIsTokenVisible(false); setConfirmation(undefined); await readWorkspace(chosen.action==="generate"?"latest":selectedConnectionId);
    } catch(e) { setError(e instanceof Error ? e.message : "令牌操作失败"); } finally { setIsRotating(false); setIsRevoking(false); }
  }
  async function handleToggleTokenVisibility() {
    if(isTokenVisible) {setIsTokenVisible(false); return;}
    if(!current || !workspace?.canManage) return;
    setIsRevealing(true); setError("");
    try { if(!rawToken) setRawToken((await revealAIControlCenterInstallToken(current.id)).token); setIsTokenVisible(true); }
    catch(e) {setError(e instanceof Error ? e.message : "查看令牌失败");} finally {setIsRevealing(false);}
  }
  async function handleCopy(content:string,key:string) {
    setError("");
    try {
      // Secret-bearing snippets are fetched only after an explicit Copy action.
      // Codex's server-provided snippet remains an environment reference, never an inline credential.
      if(key==="oc-snippet" && current) {
        const config=await request<AIControlCenterInstallWorkspace>(`${base}/${encodeURIComponent(current.connectionId)}/configuration`);
        content=config.snippetTemplates[selectedSnippetTab];
      }
      await navigator.clipboard.writeText(content); setCopiedKey(key); setNotice("已复制到剪贴板。");
      window.setTimeout(()=>setCopiedKey(value=>value===key?"":value),1600);
    } catch(e) {setError(e instanceof Error ? e.message : "复制失败，请重试");}
  }
  async function handleDownloadSkill() {
    if(!workspace?.skillInstall.downloadPath) return;
    setIsDownloading(true); setError("");
    try {const {blob,fileName}=await downloadAIControlCenterSkillPackage(workspace.skillInstall.downloadPath), url=URL.createObjectURL(blob), a=document.createElement("a"); a.href=url; a.download=fileName||workspace.skillInstall.fileName; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),1000); setNotice("Skill 压缩包已开始下载。");}
    catch(e) {setError(e instanceof Error ? e.message : "下载失败");} finally {setIsDownloading(false);}
  }
  async function upgradeAuthorization() {
    if(!current)return;setIsUpgrading(true);setError("");setNotice("");
    try {const result=await request<{toolCount:number}>(`${base}/${encodeURIComponent(current.connectionId)}/authorization`,{method:"PATCH",body:JSON.stringify({access:"brand",expectedTokenId:current.id,expectedAuthorizationHash:current.authorizationHash,confirmed:true})});setGrantConfirmation(false);setRawToken("");setIsTokenVisible(false);await readWorkspace(current.connectionId);setNotice(`本连接已启用品牌运营权限（${result.toolCount}项），令牌和客户端配置保持不变；请在客户端刷新 MCP 工具。`)}
    catch(e){setError(e instanceof Error?e.message:"权限更新失败，请刷新后重试")}finally{setIsUpgrading(false)}
  }
  async function selectConnection(id:string){setRawToken("");setIsTokenVisible(false);setNotice("");setError("");setIsLoadingOc(true);try{await readWorkspace(id)}catch(e){setError(e instanceof Error?e.message:"连接读取失败")}finally{setIsLoadingOc(false)}}
  const authorizationPanel=<><div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><div className="min-w-0"><p className="text-sm font-semibold">{current?`本连接权限：${current.allowedTools?.includes("manage_brand_library")?"品牌运营":"原有授权"} · ${current.allowedTools?.length??"既有"} 项工具`:`品牌运营连接 · ${brandToolCount||"—"} 项工具`}</p><p className="mt-1 text-xs text-slate-500">资料、采集、素材、计划与图片、语音、RunningHub制作均使用本品牌配置。</p>{connections.length>1&&<select aria-label="选择客户端连接" disabled={isLoadingOc||isUpgrading||isRotating||isRevoking} value={selectedConnectionId} onChange={e=>void selectConnection(e.target.value)} className="mt-2 max-w-full rounded border bg-white p-2 text-sm">{connections.map((item,index)=><option key={item.connectionId} value={item.connectionId}>{item.tokenName} · {item.clientKind||"原连接"} · {index+1}</option>)}</select>}</div>{current&&!current.legacy&&!current.allowedTools?.includes("manage_brand_library")&&workspace?.canManage&&<button disabled={isUpgrading||isLoadingOc||isRotating||isRevoking} onClick={()=>setGrantConfirmation(true)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{isUpgrading?"更新权限中…":"启用品牌运营权限"}</button>}</div>
    </>;
  const activeSnippet=workspace ? buildVisibleSnippet(workspace.snippetTemplates[selectedSnippetTab],rawToken,isTokenVisible) : "";
  const displayedToken=isTokenVisible && rawToken ? rawToken : workspace?.activeToken?.tokenPreview || "未生成";
  return <>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <OpenClawInstallationPanel authorizationPanel={authorizationPanel} {...{workspace,rawToken,isTokenVisible,selectedSnippetTab,setSelectedSnippetTab,isLoadingOc:isLoadingOc||isUpgrading,isRotating,isRevoking,isRevealing,isDownloading,copiedKey,activeSnippet,displayedToken,loadWorkspace,handleRotateToken,handleRevokeToken,handleToggleTokenVisibility,handleCopy,handleDownloadSkill}}/>
    {grantConfirmation&&<section role="dialog" aria-modal="true" aria-label="确认品牌运营授权" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-5"><h3 className="font-semibold">启用本连接的品牌运营权限</h3><p className="mt-3 text-sm text-slate-600">允许此客户端使用本品牌的 {brandToolCount} 项资料、产品/IP、采集、素材、计划、拆解及制作工具。保留原令牌和配置，记录授权历史；其他连接和品牌不变。制作使用本品牌服务；对外发布、平台管理和人工审阅决定不在此范围。</p><div className="mt-5 flex gap-3"><button disabled={isUpgrading} onClick={()=>void upgradeAuthorization()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">确认启用</button><button disabled={isUpgrading} onClick={()=>setGrantConfirmation(false)} className="rounded-lg border px-4 py-2 text-sm">返回</button></div></div></section>}
    {confirmation && <section role="dialog" aria-modal="true" aria-label="确认安装令牌操作" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-md rounded-xl bg-white p-5"><h3 className="font-semibold">{confirmation.action==="revoke" ? "停用当前令牌" : confirmation.action==="rotate" ? "重置正式安装令牌" : "生成正式安装令牌"}</h3><p className="mt-3 text-sm text-slate-600">{confirmation.action==="generate" ? `${confirmation.connection?.legacy ? "现有旧连接保持不变，将新建独立连接。" : ""}有效期30天，授权本品牌资料与产品/IP读写、采集与素材、计划及作品拆解等品牌运营工具，并可使用本品牌图片、语音及RunningHub制作服务，不含对外发布和平台管理。` : confirmation.action==="rotate" ? "仅重置当前连接，保留原授权范围；旧凭据将失效，请更新对应客户端。" : "仅停用当前连接的凭据，对应客户端将无法继续使用该连接。"}其他连接和其他品牌不受影响。</p><div className="mt-5 flex gap-3"><button disabled={isRotating||isRevoking} onClick={()=>void confirmChange()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">确认{confirmation.action==="revoke" ? "停用" : confirmation.action==="rotate" ? "重置" : "生成"}</button><button disabled={isRotating||isRevoking} onClick={()=>setConfirmation(undefined)} className="rounded-lg border px-4 py-2 text-sm">返回</button></div></div></section>}
  </>;
}
