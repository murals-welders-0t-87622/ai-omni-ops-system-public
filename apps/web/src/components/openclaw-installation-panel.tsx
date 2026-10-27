"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import type { AIControlCenterInstallWorkspace } from "../services/openclaw";
import { formatCollaboratorRoleLabel } from "../app/(dashboard)/personal-center/route-helpers";
export type SnippetTabKey = "ai-control-center" | "workbuddy" | "doubaoWork" | "qwenWork" | "codex" | "mcpEndpoint";
export const snippetTabs: Array<{key:SnippetTabKey;label:string}> = [{key:"ai-control-center",label:"AI 智控中心"},{key:"workbuddy",label:"WorkBuddy"},{key:"doubaoWork",label:"豆包工作"},{key:"qwenWork",label:"千问办公"},{key:"codex",label:"Codex"},{key:"mcpEndpoint",label:"MCP 地址"}];
export const TOKEN_PLACEHOLDER = "请先生成安装令牌";
export function buildVisibleSnippet(snippet:string,rawToken:string,visible:boolean){if(!rawToken)return snippet;const full=`Bearer ${rawToken}`,placeholder=`Bearer ${TOKEN_PLACEHOLDER}`;return visible?snippet.replaceAll(placeholder,full):snippet.replaceAll(full,placeholder);}
export function ConnectorInstallationGuide({tab,workspace,rawToken,visible,onCopy,copiedKey}:{tab:SnippetTabKey;workspace:AIControlCenterInstallWorkspace|null;rawToken:string;visible:boolean;onCopy?:(value:string,key:string)=>Promise<void>;copiedKey?:string}) {
  if (tab === "qwenWork") return <div className="mb-3 rounded-lg bg-indigo-50 p-3 text-xs leading-5 text-indigo-800"><p>扩展 → 连接器 → ＋ 添加 → 粘贴 JSON 配置，导入下方配置并启用。新建对话后使用。</p><a className="underline" href="https://qwenwork.cn/docs/features/connectors" target="_blank" rel="noreferrer">查看千问办公官方接入说明</a><p className="mt-2">Skill 可使用左侧 Git 链接安装，或解压 ZIP 后在“扩展 → 技能”上传文件。</p></div>;
  if (tab !== "doubaoWork") return null;
  const fields = [["服务器名称",workspace?.mcpServerName || ""],["传输类型","HTTP"],["服务器 URL",workspace?.mcpUrl || ""],["Header：Authorization",visible && rawToken ? `Bearer ${rawToken}` : "先点击左侧“查看”令牌"],["Header：x-brand-id",workspace?.brandId || ""]];
  return <div aria-label="豆包工作填写说明" className="mb-3 space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3"><p className="text-xs leading-5 text-indigo-800">在豆包工作的连接器中，新建自定义连接器，按以下字段填写；Headers 添加两项后保存。</p>{fields.map(([label,value],i)=><div key={label} className="flex min-w-0 items-start gap-2 rounded-md bg-white p-2 text-xs"><div className="min-w-0 flex-1"><span className="text-slate-500">{label}</span><p className="mt-1 break-all font-mono text-slate-800">{value || "尚未生成"}</p></div>{onCopy && i!==1 && <button type="button" aria-label={`复制豆包${label}`} disabled={!value || (i===3 && (!visible || !rawToken))} onClick={()=>void onCopy(value,`doubao-field-${i}`)} className="shrink-0 rounded border border-slate-200 px-2 py-1 text-slate-600 disabled:opacity-40">{copiedKey===`doubao-field-${i}`?"已复制":"复制"}</button>}</div>)}<p className="text-xs text-slate-500">下方为填写参考，不是 JSON 导入配置。Skill 安装以豆包工作提供的入口为准。</p></div>;
}
function EyeOpenIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg>); }
function EyeClosedIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.7a3 3 0 0 0 4.2 4.2"/><path d="M9.9 5.1A12.5 12.5 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-4 4.9"/><path d="M6.7 6.7C3.7 8.6 2 12 2 12a18.8 18.8 0 0 0 5 5.7"/></svg>); }
type Props={authorizationPanel?:ReactNode;workspace:AIControlCenterInstallWorkspace|null;rawToken:string;isTokenVisible:boolean;selectedSnippetTab:SnippetTabKey;setSelectedSnippetTab:(tab:SnippetTabKey)=>void;isLoadingOc:boolean;isRotating:boolean;isRevoking:boolean;isRevealing:boolean;isDownloading:boolean;copiedKey:string;activeSnippet:string;displayedToken:string;loadWorkspace:()=>Promise<void>;handleRotateToken:()=>Promise<void>;handleRevokeToken:()=>Promise<void>;handleToggleTokenVisibility:()=>Promise<void>;handleCopy:(text:string,key:string)=>Promise<void>;handleDownloadSkill:()=>Promise<void>};
export default function OpenClawInstallationPanel({authorizationPanel,workspace,rawToken,isTokenVisible,selectedSnippetTab,setSelectedSnippetTab,isLoadingOc,isRotating,isRevoking,isRevealing,isDownloading,copiedKey,activeSnippet,displayedToken,loadWorkspace,handleRotateToken,handleRevokeToken,handleToggleTokenVisibility,handleCopy,handleDownloadSkill}:Props){
return (<section data-openclaw-installation-panel="original-shared">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">OpenClaw 安装中心</h2>
                  <p className="text-xs text-slate-500 mt-0.5">按「生成令牌 - 复制 MCP 配置 - Git 或 ZIP 二选一安装 Skill」执行。</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${workspace?.canManage ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
                    {workspace ? formatCollaboratorRoleLabel(workspace.role) : "未识别角色"}
                  </span>
                  <button type="button" disabled={isLoadingOc || isRotating || isRevoking} onClick={() => void loadWorkspace()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <RefreshCw className={`h-4 w-4 ${isLoadingOc ? "animate-spin" : ""}`} /> 刷新
                  </button>
                  <button type="button" disabled={!workspace?.canManage || isLoadingOc || isRotating || isRevoking} onClick={() => void handleRotateToken()}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black disabled:opacity-50">
                    {isRotating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {workspace?.activeToken ? "重置正式安装令牌" : "生成正式安装令牌"}
                  </button>
                  <button type="button" disabled={!workspace?.canManage || !workspace?.activeToken || isLoadingOc || isRotating || isRevoking} onClick={() => void handleRevokeToken()}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                    {isRevoking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    停用当前令牌
                  </button>
                </div>
              </div>

              {authorizationPanel}
              {(workspace?.docs || []).length ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {(workspace?.docs || []).map((item) => (
                    <Link key={item.url} href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      <ExternalLink className="h-3.5 w-3.5" /> {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 mb-4">
                <strong className="text-sm text-slate-800">当前流程按「生成令牌 · 复制 MCP 配置 · Git 或 ZIP 二选一安装 Skill」执行</strong>
                <p className="text-xs text-slate-500 mt-1">
                  {workspace?.canManage ? "品牌管理员可在此重置正式安装令牌，并把统一配置分发给成员。普通成员只需复制片段，并任选 Git 安装或 ZIP 导入完成接入。" : "当前账号可查看配置；如需重置令牌，请联系品牌管理员。"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-white">
                  <h3 className="text-sm font-bold text-slate-800">OpenClaw 正式安装说明</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3 rounded-lg bg-slate-50 p-2">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400 shrink-0">MCP 服务名称</dt>
                      <dd className="text-right font-mono text-slate-700 truncate">{workspace?.mcpServerName || "未生成"}</dd>
                    </div>
                    <div className="flex justify-between gap-3 rounded-lg bg-slate-50 p-2">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400 shrink-0">当前品牌</dt>
                      <dd className="text-right font-medium text-slate-700 truncate">{workspace?.brandName || "未识别"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-indigo-50 p-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-indigo-500 shrink-0">MCP 接入地址</dt>
                        <dd className="font-mono text-[13px] text-indigo-800 break-all mt-0.5">{workspace?.mcpUrl || "http://127.0.0.1:23011/api/openclaw/mcp"}</dd>
                      </div>
                      <button type="button" disabled={!workspace?.mcpUrl} onClick={() => void handleCopy(workspace?.mcpUrl || "", "oc-endpoint")}
                        className="shrink-0 rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                        {copiedKey === "oc-endpoint" ? "✓ 已复制" : "复制地址"}
                      </button>
                    </div>
                    <div className="rounded-lg bg-amber-50/80 p-3 ring-1 ring-amber-100">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">安装令牌</dt>
                          <dd className="font-mono text-[13px] text-amber-900 mt-0.5 break-all">
                            {isLoadingOc ? "加载中..." : displayedToken}
                          </dd>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button type="button" disabled={isLoadingOc || isRevealing || !workspace?.activeToken} onClick={() => void handleToggleTokenVisibility()}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                            {isRevealing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : (isTokenVisible ? <EyeClosedIcon /> : <EyeOpenIcon />)}
                            {isTokenVisible ? "隐藏" : "查看"}
                          </button>
                          <button type="button" disabled={!rawToken || !isTokenVisible} onClick={() => void handleCopy(rawToken, "oc-token")}
                            className="rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                            {copiedKey === "oc-token" ? "✓ 已复制" : "复制令牌"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </dl>

                  <div className="pt-2 border-t border-slate-100 mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" disabled={isLoadingOc || !workspace?.mcpUrl} onClick={() => void handleCopy(workspace?.mcpUrl || "", "oc-svc")}
                      className="rounded-md bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                      {copiedKey === "oc-svc" ? "✓ 已复制 MCP 地址" : "复制 MCP 地址"}
                    </button>
                    <button type="button" disabled={isDownloading || isLoadingOc || !workspace?.skillInstall?.downloadPath} onClick={() => void handleDownloadSkill()}
                      className="rounded-md bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                      {isDownloading ? <RefreshCw className="h-3.5 w-3.5 inline animate-spin mr-1" /> : null} 下载 Skill ZIP
                    </button>
                    <button type="button" disabled={!workspace?.skillInstall?.githubTreeUrl} onClick={() => void handleCopy(workspace?.skillInstall?.githubTreeUrl || "", "oc-git")}
                      className="rounded-md bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                      {copiedKey === "oc-git" ? "✓ 已复制" : "复制 Git Skill 链接"}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-2">品牌运营助手 Skill 安装</h3>
                  <div className="flex flex-wrap items-center gap-1.5 mb-3 rounded-lg bg-slate-50 p-1 ring-1 ring-slate-200/70">
                    {snippetTabs.map(st => (
                      <button key={st.key} type="button" onClick={() => setSelectedSnippetTab(st.key)}
                        className={`flex-1 min-w-[90px] rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${selectedSnippetTab === st.key ? "bg-white text-violet-700 shadow ring-1 ring-violet-200/70" : "text-slate-600 hover:bg-white/70"}`}>
                        {st.label}
                      </button>
                    ))}
                  </div>
                  <ConnectorInstallationGuide tab={selectedSnippetTab} workspace={workspace} rawToken={rawToken} visible={isTokenVisible} onCopy={handleCopy} copiedKey={copiedKey} />
                  <div className="rounded-lg border border-slate-800/90 bg-slate-900 text-slate-100 p-3 min-h-[180px] relative">
                    <button type="button" disabled={!activeSnippet} onClick={() => void handleCopy(activeSnippet, "oc-snippet")}
                      className="absolute top-2 right-2 rounded-md bg-slate-700 hover:bg-slate-600 px-2 py-1 text-[11px] font-semibold text-slate-100 disabled:opacity-50">
                      {copiedKey === "oc-snippet" ? "✓ 已复制" : "复制"}
                    </button>
                    <pre className="font-mono text-[11.5px] whitespace-pre-wrap break-words pr-16 leading-relaxed text-slate-200">
{isLoadingOc ? "正在加载安装配置..." : activeSnippet || "暂无可用的 Snippet（先生成安装令牌）。"}
                    </pre>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">复制到对应客户端后完成认证并验证连接；Git/ZIP 二选一安装 Skill。Codex 片段使用环境变量引用，需另行绑定凭据。</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-bold text-slate-900">{workspace?.skillInstall?.title || "Skill 安装步骤"}</div>
                  <p className="mt-1 text-xs text-slate-500">{workspace?.skillInstall?.summary || "先挂 MCP，再导入 Skill。"} </p>
                  <div className="mt-3 space-y-2">
                    {(workspace?.skillInstall?.steps || []).map((item, index) => (
                      <div key={item} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">{index + 1}</span>
                        <span className="text-xs font-medium leading-5 text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-bold text-slate-900">{workspace?.relationshipGuide?.title || "MCP 与 Skill 关系"}</div>
                  <div className="mt-3 space-y-2">
                    {(workspace?.relationshipGuide?.items || []).map((item) => (
                      <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="text-xs font-semibold text-slate-800">{item.label}</div>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-bold text-slate-900">{workspace?.deliveryChecklist?.title || "正式交付检查"}</div>
                  <p className="mt-1 text-xs text-slate-500">{workspace?.deliveryChecklist?.summary || "确认页面、令牌、Skill 与真实挂载链路都已通。"} </p>
                  <div className="mt-3 space-y-2">
                    {(workspace?.deliveryChecklist?.items || []).map((item) => (
                      <div key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-700">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>);
}
