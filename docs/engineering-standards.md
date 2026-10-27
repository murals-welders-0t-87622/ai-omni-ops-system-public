# AI全域运营系统开发规范

403：取消独立运营台；目标可改并调用本机Codex重排；七类策略/三档具体费用与经营全景、商品、推广、用户看板。见[变更与契约](changes/2026-10-27-commerce-planning-dashboard.md)。

401：金额及渠道分解用共享固定小数校验；目标情景与实际分账分开。UI任务只选受控jobKind，不提交任意命令；同品牌/项目/当前版本/租约与实际产物共同验收。图片MCP走受控存储读，不为解决401放开鉴权。见[401契约](changes/2026-10-26-commerce-gmv-executor.md)。
400：电商财务目标→驱动指标→行动资源排期→完整窗口数据跟踪及未达标建议，兼容旧报告安全排版/历史；第三方采集仍须授权连接器回写。见[财务目标与跟踪](changes/2026-10-26-commerce-financial-scorecard.md)。

399纠正：电商三层按整页切换，旧方案report/actions直接可见，六类数据仅总览，方案/报表选择分开；不以新增字段或选中态代替业务内容验收。见[电商兼容修复](changes/2026-10-26-commerce-view-compatibility.md)。


398：电商既有两入口补主图/商品文案与品牌生意→战略/策略/执行→同口径结果对照；旧数据/版本和23技能架构保持。见[电商增长链路](changes/2026-10-26-commerce-growth-loop.md)。


389经营图表约定：真实来源/期间/范围先于可视化，未知null，不从累计插值画趋势，重叠人群/跨渠道不拼占比漏斗，归档不称实时；复用共享分析校验和不可变版本。见[三层经营与图表改版](changes/2026-10-26-private-strategy-analytics.md)。

387：私域从品牌生意模式承接，新增businessModel/经营路线与策略关联（契约1.5.0）；先看经营依据与本周行动，再看策略/逐日安排。技能4.0源21文件、三副本63文件/下载包一致；具体经营、状态与来源分层，旧数据和其他板块兼容保留。见[生意模式与私域承接](changes/2026-10-26-business-model-private-operations.md)。

385：私域去掉投流目标，战略默认前置，按阶段顺序→具体商品活动单→按日动作→四指标/实际组织；新增stagePlan/activityPlan，旧数据与其他投流模块兼容保留。技能3.3强制具体参数、来源推导及结构校验，安装/代码/原生业务/实际增长分别验收。见[阶段与活动单](changes/2026-10-26-private-stage-and-activity.md)。

384：私域默认“今日经营”，按进店/转化/客单/复购/投流→行动→负责人/时间→执行→目标实际组织；老板可按指标进入原计划和任务。来源未知不造达标，日数据不拿历史累计替代，AI按钮为复制委托。见[老板经营台与契约](changes/2026-10-26-private-owner-cockpit.md)。

[此段涉及具体客户资料，公开版本已省略。]

378新增私域复购/私域运营，七区与有赞店铺独立配置；战略→策略→执行、会员权益、场景需求与有证据标签/分群/旅程/复盘，客户主档复用AI销售。HTTP/MCP十动作同源，双权限、品牌隔离、CAS/幂等/历史；当前有赞只读，执行状态以真实回执为准。见[私域运营契约](private-operations-workspace.md)与[变更](changes/2026-10-25-youzan-private-operations.md)。

376新增私域复购/AI销售七区及独立3Chat配置，客户/商机/服务/订单/复购/策略/复盘与同源HTTP/MCP、独立权限、分页/不可变版本。实际查询/发送在WorkBuddy；配置候选不等已部署。见[AI销售工作区](ai-sales-workspace.md)与[变更](changes/2026-10-25-ai-sales-workspace.md)。


375归档验收：文件上传成功、知识正文可读、embedding可用、来源真实性、业务执行分别验证；必须读回完整正文/来源覆盖，不能以HTTP成功或文件计数代替。真实HTML不得在读回时被模板覆盖。见[品牌归档契约](brand-document-import.md)。


374电商：执行在Codex/WorkBuddy，中台只承接；HTTP/MCP共用服务、品牌和关联对象验权、不可变修订及并发/幂等。媒体预览必须走/api受保护接口，不能把网页404当媒体。按钮需截图核对白底白字类冲突，DOM可定位不代替视觉验收。见[电商契约](commerce-workspaces.md)。


354按用户纠正撤掉353制作分项/短期限/撤销历史界面；完整品牌运营连接默认包含图片、语音、RunningHub，原令牌直接读204工具。旧JSON/历史保留兼容，品牌隔离和连接生命周期不变。69策略、9API、29模块/42写回、182页面、6行为/8布局、26运行hash通过；仍有五顶部委托未接、五导出404，真实供应商/独立专家待验。见[制作直接使用及复查](changes/2026-10-22-production-direct-use-and-functional-recheck.md)。 用户业务授权持续有效；不要为普通制作另造分项短租约。检查必须包含按钮结果，页面零错误不代替委托或导出成功。

会话353：原OpenClaw安装区新增单连接图片/语音/RunningHub制作授权、期限/撤销/历史；旧14/24/203不自动扩权。MCP列表与调用精确控动作、轮换保留授权，蝉镜并发刷新和失败提示完善。55策略、15API/MCP、7页面/4宽及26运行hash通过；无真实生成/供应商调用。见[制作授权变更](changes/2026-10-22-brand-production-authorization.md)。 授权能力须列表/调用/期限同源校验；token轮换在锁内复制完整快照；供应商令牌缓存按凭据隔离，失效刷新单飞且只重试一次。

351：所有业务JSON/FormData沿用统一request的会话刷新/品牌/切换保护；禁止清空Authorization、非401自动重试写入或503假成功。页面加载、按钮可用与真实专业执行分开验收；手机需核全部日期/末列可达。见[巡检修复](changes/2026-10-22-all-brand-system-audit.md)。

会话350恢复品牌MCP业务范围：完整目录244中明确203项品牌运营工具，41项发布/付费生成/人工审阅及平台个人配置不自动开放；manage_*子动作同策略限制。旧read14/work24不静默扩展，品牌Owner/Admin可单连接确认升级，保留令牌/MCP名称/配置并追加授权修订；页面显示真实数量和连接选择。指定用户连接已14→203并用原环境引用令牌真实HTTP回验，未执行模型或发布。见[品牌运营授权](changes/2026-10-22-brand-operations-grant.md)。

会话348：品牌第三方接口凭据保存增加提交处持久反馈、可关闭浮动提醒与保存中状态；按当前平台显示，编辑清旧提示，成功后清空输入。PATCH成功与列表刷新失败分别提示，保存成功不等于供应商连通。仅页面反馈，不改凭据/授权/模型调用。见[保存反馈](changes/2026-10-22-brand-api-key-save-feedback.md)。

会话347更正346的安装区实现：直接提取原OpenClaw安装区为共享组件，平台与品牌后台渲染同一界面；保留正式令牌查看/隐藏、6类客户端片段、Git/ZIP和原指南。安装页移除高级设置；模型/Skill/知识版本数据与独立历史页保留，不是安装步骤。品牌适配只操作当前连接，新连接30天work范围在确认中明确，旧连接不扩权、不全品牌重置；原连接/其他品牌不受影响。Codex仍为环境变量引用，实际安全绑定和客户端执行尚未接通。见[原版安装区复用](changes/2026-10-22-original-openclaw-shared-installation.md)。

会话346按用户确认恢复品牌智控原版操作：卡片式首页；接口与连接器配置内“第三方接口配置 / OpenClaw 安装”双Tab，版本组合放高级设置；知识/成员/品牌技能移出主导航，旧数据与业务页保留。品牌素材位于/brand-admin/assets，原共享素材入口按当前权限返回，平台管理边界不放宽。见[使用回归修复](changes/2026-10-22-brand-control-familiar-workflow.md)。

会话345：用户明确授权提交并推送。目标为既有Lab origin及功能分支；整理633cd305之后积累的Ontology/采集修正、作品拆解、经营驾驶舱、多账号/品牌后台、独立连接与BYOK版本配置，保留其接口/schema/迁移/Skill及开发说明依赖。继承Aliyun workflow移出可执行目录；runtime、凭据、数据库与测试运行产物排除。此操作是源码归档，不部署云端、不合并main；真实客户端/模型/专家未验收范围沿用344。见[提交记录](changes/2026-10-21-lab-milestone-git-publish.md)。

品牌独立模型与执行配置：用户选择BYOK；`/brand-admin/models`设置本品牌服务凭据，`/brand-admin/execution`保存/发布/回退版本，`/brand-admin/knowledge`复用品牌知识入口。新增凭据密文列、列表不回显Key、空保存保留/显式清除留空墓碑防旧值复活。只读MCP返回冻结组合；实际客户端授权/加载与专家执行未完成。见[变更](changes/2026-10-21-brand-models-and-execution-profile.md)。

[此段涉及具体客户资料，公开版本已省略。]

品牌OWNER最高权限只限本品牌；智控导航不能仅检查systemRole，也不能把所有OWNER升为全局管理员。配置工作区先真实身份/品牌权限验证再挂载；保留实际ACTIVE的OWNER身份，加入他牌协作不使其消失。公共基线与品牌覆盖分别写入/验收。见[品牌后台规则](changes/2026-10-21-brand-owner-admin-workspace.md)。


后台严格鉴权上线必须同时验现有管理身份与旧页面请求链；只隐藏按钮或授角色不算修复。平台管理员与品牌OWNER分开，授予平台管理角色须明确用户授权；客户端统一认证请求，禁止以关闭守卫恢复访问。见[后台回归修复](changes/2026-10-21-admin-workspace-access-recovery.md)。


标准Lab多账号规则：页面/环境标志不得授予身份；鉴权异常失败拒绝；URL、请求体、查询和关联对象同时验权；缺品牌不回落演示品牌。标签页独立会话须防旧异步返回，外部素材URL不得携带应用token。共享模板只承载布局，不返回跨品牌缓存或演示经营记录；新品牌Agent必须独立授权。参考[多账号变更](changes/2026-10-21-multi-account-brand-isolation.md)。


## Ontology lab 适用补充

独立 lab 必须先验证目标数据库、秘密注入、独立存储和自动任务门禁。不得复用原 compose 或默认开发密钥；数据库连接失败不得在验收中解释为保存成功。详见 [lab 运行基线](ontology-lab-runtime.md) 和 [秘密规则](ai-agent-access-and-secrets-policy.md)。下文历史部署默认值不授权操作原系统。

lab明确品牌不可访问时必须拒绝，不能静默回退其他品牌。Docker Desktop入口由无凭证固定目标ingress承担，应用/DB仍仅internal；不能为端口可达而打开应用外网。对应回归和实测见[部署验收](changes/2026-09-26-ontology-lab-runtime-verification.md)。

## 1. 目标

- 让后续开发始终围绕当前真实产品结构推进
- 降低页面继续膨胀、业务链路错绑、文档与代码脱节的概率
- 把已经验证过的通用规则固定下来，避免重复返工

## 2. 适用范围

- `apps/web`
- `apps/server`
- `packages/config`
- `packages/prompt-runtime`
- `packages/shared`
- `packages/ui`
- `apps/web/public/extensions/*`
- `docs`

## 3. 当前系统事实

### 3.1 入口事实

- `/` 是官网首页，不再承担登录入口职责
- `/register` 是前台账号入口；当前网站版、源码运行态和 `local-single-user` 安装态统一都走邀请码注册，不能再把安装态写成免邀请码表单
- `/admin/login` 是后台管理员入口
- `/brand-growth`、`/xiaohongshu`、`/douyin`、`/wechat`、`/more-features/design`、`/personal-center/*` 是受保护页面，未登录统一跳转 `/login?next=...`
- `/admin` 只允许后台角色进入

### 3.2 当前业务工作台

- 品牌增长策略：品牌资料、采集、品牌增长报告、半年营销规划、营销日历
- 小红书工作台：素材库、原创、二创、视频、发布
- 抖音工作台：热点、选题、原创、二创、AI 生视频、数字人、发布
- 公众号工作台：配置、原创创作、HTML 草稿、一键发布
- 设计工作台：图片、HTML、PPT、视频等设计任务
- 个人中心：概览、任务、素材管理、作品、技能、第三方接口、AI 智控中心、安全、团队、邀请
- `local-single-user` 安装态个人中心已开始承接“版本与升级”，默认通过 OSS `latest.json` 检查新包，并由后端受控触发独立 updater 执行本地替换；标准运行态当前默认也展示该入口：未配置远端更新清单时，页面至少要展示仓库内最近版本记录、Docker 更新命令和 Skill/MCP 同步提醒；若显式配置远端更新清单，则继续叠加“是否有新版本”的自动提醒能力。标准运行态仍只提供通知与命令引导，不直接替用户升级容器
- 后台：用户管理、接口供应商、知识库、技能中心、能力包、模块注册中心、模型用量、计费规则

### 3.3 当前技术选择

- 前端：Next.js App Router
- 后端：NestJS 风格模块化服务
- 数据：Prisma + 正式表结构
- 资源：OSS 为正式真源，本地仅允许受控回退
- 长任务：任务中心异步执行，不再依赖同步长请求等待完整产物
- 当前协作模式：单 Agent 收口

## 4. 前端规范

### 4.1 页面入口做薄

- `page.tsx` 和 `layout.tsx` 只做入口装配、权限门卫和页面布局
- 工作区聚合逻辑下沉到 `workspace-shell.tsx`、hooks 或 service
- 单页面同时承载“工作区 + 弹窗 + 发布 + 轮询 + 列表详情”时，优先拆分
- 凡是只属于 `local-single-user` 安装态的能力，默认不得直接暴露到网站版或源码运行态；至少同时检查并门禁：
  - 二级导航 / tab
  - 概览卡片、workspaceLinks、快捷入口
  - 直接输入 URL 的页面路由
  - 页面里任何“检查更新 / 一键升级 / 本地安装目录”类说明文案
- 如果后端已经通过 `supported`、`canApplyUpdate` 之类运行时状态区分安装态与网页态，前端所有入口必须复用同一份判断，不能各页面各写一套，也不能只拦一个入口而放过其他入口

### 4.2 品牌上下文必须真实

- 品牌域页面首次加载前，优先通过 `/auth/me` 或等价真实接口校正当前品牌
- 不允许继续依赖浏览器残留的 demo brand 或旧 brand 直接发请求
- 二级媒体代理、附件下载、灯箱预览也必须透传当前真实 `brandId`

### 4.3 Service 只做请求层

- `apps/web/src/services/*.ts` 只负责 HTTP 请求、参数整理、响应类型
- 不在 service 中写 DOM、弹窗、页面状态和轮询编排
- 可选模型、可选 Provider 必须由后端动态下发，不再在前端写死枚举

### 4.4 工作台与列表交互

- 主工作台优先使用统一壳层和统一操作区
- 同一列表中的主按钮保持统一视觉语言
- 危险操作必须二次确认
- 配置中心类页面默认支持搜索、筛选、敏感字段遮挡和长 JSON 折叠

### 4.5 扩展与发布

- 浏览器扩展只通过统一协议与站内页面通信
- 发布页面必须提供下载入口、安装说明和失败排查提示
- 当前已存在的扩展包括 `xhs-draft-publisher`、`omni-publisher`、`douyin-publisher`、`wechat-channel-publisher`

### 4.6 local-single-user 启动链

- `scripts/local-single-user-launcher.cjs` 是本地单机模式的标准入口
- launcher 构建 Web 时，如果存在 standalone 产物，必须优先以 standalone `server.js` 拉起，而不是继续固定使用 `next start`
- standalone 运行前必须同步 `.next/static` 与 `public/`，否则会出现 HTML 可访问但客户端 chunk / CSS 缺失
- launcher 拉起 Web 时，不能让运行中的站点继续直接吃源码目录 `apps/web/.next/standalone`；必须先把 standalone 产物整体分发到 `LOCAL_APP_DATA_ROOT/runtime` 下的独立运行包，再在该运行包内同步 `.next/static` 与 `public/`
- 当主 `local-single-user` runtime 仍在服务用户时，不允许再对同一份 live `.next` 目录直接做 fresh `next build` 作为日常验证手段；要么先停站重建，要么使用隔离的构建/预览路径
- 面向用户交付 `local-single-user` 时，默认不能要求用户机器预装 Node；发布物至少要提供随包 `node.exe`、可双击启动的 `.cmd` 入口，以及与 launcher 相匹配的 `app/` 运行目录
- 面向用户分发 `local-single-user` 时，不能只停留在裸 `.release/local-single-user-win-x64` 目录；至少还要提供安装入口和可校验的压缩包产物，例如 `install-local-single-user.cmd`、`.zip` 与配套 `.sha256`
- 面向新用户交付的 `local-single-user` 安装脚本，默认要在安装完成时为当前用户配置开机自启动；不能把“安装后还得自己再手动执行 `install-autostart.cmd`”当成交付基线，用户若要关闭自启再通过 `remove-autostart.cmd` 显式移除
- `local-single-user` 安装脚本在调用 `install-autostart.cmd` 这类原生命令辅助脚本时，不能直接用 PowerShell `&` 把对方的 `stderr` 当成致命错误；必须按退出码判断结果，并在自启动注册失败时自动降级到当前用户 Startup 快捷方式，不能因为自启动注册异常把整包安装判死
- `local-single-user` 的安装入口 `install-local-single-user.cmd` 不能再依赖用户机器 PATH 里是否存在 `powershell` 命令别名；必须优先走 `%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe` 这类系统绝对路径，必要时再回退到 `pwsh.exe`，避免在被精简 PATH、企业终端策略或环境变量异常的机器上第一跳就直接报“`powershell` 不是内部或外部命令”
- `local-single-user` 的安装入口如果需要先请求 UAC 提权，提权成功后必须直接拉起 PowerShell 安装主体，并按真实退出码回传结果；不能继续依赖“提权后再回调同一个 `.cmd`”这类脆弱跳板，也不能在批处理括号块里用会被提前展开的旧 `%ERRORLEVEL%` 把失败误判成成功
- `local-single-user` 的宿主环境解析（如 `powershell`、`cmd.exe`、`taskkill.exe` 等）不能散落在多个 Node 主链脚本里各自拼路径；这类平台依赖必须优先收口到共享 helper，并让安装、启动、自启、打包等主链共用，避免同一类环境问题在多个脚本中重复修复
- 如果 `local-single-user` 的 launcher / runtime / autostart 开始依赖新的 `app/scripts/*.cjs` 共享 helper，发布物打包清单必须同步把该脚本列入必带项；不能出现源码已依赖新 helper、但 release bundle 仍漏拷该文件，导致安装包和升级后的新版本在启动第一跳就因 `MODULE_NOT_FOUND` 直接失败
- `local-single-user` 的安装、启动、自启、升级后续必须逐步收敛到统一 lifecycle 状态文件；不能再长期依赖“日志 + runtime metadata + 前端推断 + 局部 status 文件”并存的方式各自判断最终状态
- `local-single-user` 的安装阶段不能继续只靠 `runtime metadata + API/Web 超时` 推断首启是否成功；安装脚本必须逐步直接消费统一 lifecycle 状态，并在失败时把 `lifecyclePhase / lifecycleError` 这类上下文直接带进错误输出，避免只留下“未 ready”这种不可操作的模糊结论
- `local-single-user` 的自启动恢复链也必须逐步直接消费统一 lifecycle 状态，且日志、runtime metadata、lifecycle 文件路径都必须先解析真实 `localAppRoot`；不能让自启 helper 一边按默认 `%APPDATA%\\AiOmniOps` 写状态，另一边 launcher 又按用户配置根目录写状态，造成同一台机器上出现两套彼此不一致的运行时现场
- 面向新用户交付的 `local-single-user` 安装脚本，不能只做“复制目录 + 后台尝试启动”然后立刻结束；默认要在安装阶段等待本地工作台真正通过 API / Web 验活，并由安装脚本自己明确打开页面，否则应直接把首启失败暴露给用户；安装阶段的 ready 判定不能只依赖 `runtime/local-single-user-runtime.json` 单一路径，必须允许通过本地 API / Web 直接健康检查兜底，避免实例其实已启动但安装被误判失败
- `local-single-user` 的“检查更新 / 立即升级”入口默认放在个人中心，由后端统一检查 OSS `latest.json` 与安装包 SHA256；前端只负责展示版本状态和触发动作，不在浏览器里直接替换安装目录
- 注册邀请码校验当前统一由后端 `auth/register-config + auth/register` 控制；即使是 `local-single-user` 安装态，也不能再默认放开直接注册
- `local-single-user` 下如果浏览器残留的是默认本地账号 `local_default_user / local_default_brand`，而 SQLite 中已经存在真实注册账号或真实最近会话，请求层默认要先自动续回最近真实本地会话并重写浏览器 session，再继续访问受保护页面；不能长期把用户困在演示账号展示态
- `local-single-user` 的 SQLite 可用性探测不能只做一次脆弱的 `SELECT 1` 然后直接判死；至少要先建立 Prisma 连接，并仅对 timeout / busy / locked 这类瞬时错误做受控短重试，避免数据库文件实际可读却在启动期被整条链路判成不可用
- `local-single-user` 的高频认证读链路（如 `/auth/me`、`/auth/brands`、品牌访问校验、品牌列表读取）不能在每次请求里顺手执行 owner 成员补齐、默认关系修复这类批量写库动作；这类自愈只允许在“关系缺失或失真”时受控触发，并避免在读路径里对 SQLite 做无差别并发 `upsert`
- 任何高成本第三方模型调用，若上游已经明确返回 `400/403` 这类硬拒绝（如内容策略不通过、参数非法、额度不足、预扣费失败），不得继续在同一任务内盲目重试同类 prompt / model / provider 组合；同时对短时间内相同指纹的重复提交要做拦截或复用，避免把外部分钟级重试放大成真实多次扣费或大量噪音任务
- `local-single-user` 的 launcher 在决定是否跳过 `prisma generate` 时，不能只信任 runtime 下缓存的 schema hash/state 文件；还必须回看安装目录 `node_modules/.prisma/client/schema.prisma` 当前真实生成出来的 datasource provider 是否仍是 `sqlite`。如果升级包把 client 覆回了旧的 PostgreSQL 版本，下一次启动必须强制重新 generate，不能继续跳过
- 用户使用期限和功能权限属于后端账号治理范畴：至少要由后台用户管理可配置，并在后端鉴权层统一拦截“账号已到期 / 当前模块无权限”两类情况，不能只做前端隐藏
- “版本与升级”入口不允许无条件串回网站版个人中心；后续新增相关入口时，必须同步覆盖概览页、导航和直达路由的三层门禁，并确保：
  - `local-single-user` 只显示自动升级链
  - `standard` 只有在已配置远端更新清单时才显示引导页
  - 未配置清单的网站版 / 源码运行态仍然隐藏
- 自动升级必须通过独立 updater 在安装目录外执行；升级前必须先校验 `.zip` 对应的 `.sha256`，升级时只替换程序目录，不动 `LOCAL_APP_DATA_ROOT` 下的 `data/`、`storage/`、`logs/`、`cache/`、`backup/` 等长期目录；`updates/` 仅允许承载升级链的临时下载与运行目录，历史遗留的 `downloads/*`、`extract-*`、旧 `apply-runs/*` 等升级残留必须由 updater 在安装前预清理并在新版本验活成功后复清，不允许依赖 launcher 启动时直接触碰当前升级目录；apply-run 阶段执行的 updater 必须优先取自刚下载的目标发布包，而不是继续复用当前安装版本内置脚本，否则修复版 updater 无法通过版本更新真正生效；安装目录旁边为回滚临时创建的 `AiOmniOps-backup-*` 备份目录也必须在升级成功后自动回收，不能长期堆积在 `%LOCALAPPDATA%\Programs`；安装器日志默认统一写回 `LOCAL_APP_DATA_ROOT\logs`，历史遗留的 `%LOCALAPPDATA%\AiOmniOps` 升级/安装痕迹也必须在升级前后自动清理，不能长期形成第二份 C 盘占用
- `local-single-user` 升级链里，“升级成功”不能再等同于“安装脚本执行完成”；独立 updater 必须在新版本重启后继续等待 `runtime/local-single-user-runtime.json` 刷新，并确认本地 API 健康检查和 Web 入口都恢复可用后，才能把状态写成 `SUCCEEDED`
- `local-single-user` 的安装、升级、自启、修复脚本在需要打开页面、回显地址或做 Web 验活时，必须优先读取 `runtime/local-single-user-runtime.json` 里的 `browserUrl / previewUrl` 作为真值；不能再把 `127.0.0.1:3001` 当成固定入口写死在脚本 fallback 中
- `local-single-user` 升级链里，像“解压升级包”“执行安装脚本”“等待新版本 API / Web 验活”这类长步骤，不能只在开始时写一次 `APPLYING`；必须持续刷新状态心跳，避免慢机器或杀软扫描场景被误判成“长时间没有新进展”
- `local-single-user` 升级链在 `spawn` 独立 updater 后，bootstrap 判定不能再要求“必须在极短时间内看到 stdout/trace/状态文案变化”才算启动成功；如果 updater 进程仍存活且没有明确 `stderr` 失败信号，就应继续视为已启动并让后台升级链自己推进，避免慢机器被前端过早误判成“升级器未成功启动”
- `local-single-user` 的 OSS 发布脚本在上传 200MB+ 这类大包时，不能只依赖 `ali-oss` 自带 `multipartUpload()` 一条实现；至少要把 multipart 初始化、单分片上传、complete 拆开，并让单分片具备可重试能力，避免长连接抖动直接打断整次发版
- `local-single-user` 的 `POST /system/update/apply` 这类同步入口，不能在请求内先整包解压数百 MB 升级包再去启动 updater；像“从目标发布包里取最新版 updater 脚本”这类前置动作，必须收敛成单文件快速提取或等价轻量方案，把重 IO 留给独立 updater 进程，避免升级入口自己先超时
- 如果 `local-single-user` 新版本替换后未能在受控时限内通过 API / Web 验活，独立 updater 必须自动回滚到安装前 backup 并重启上一版本；不能把用户留在“提示升级成功但页面打不开”的状态
- launcher 写入 `runtime/local-single-user-runtime.json` 时，必须同步写入当前安装包的 `releaseTag/appVersion`；updater 在安装目录 `meta/release-manifest.json` 暂时不可读时，也必须允许回退读取 runtime metadata 中的版本标记，避免新版本其实已经启动成功却因版本元数据短时缺失被误判回滚
- `local-single-user` 的 `start-local-single-user.cmd` / launcher 必须支持重复启动防抖：如果本地工作台已经健康运行，则重复双击只能复用当前实例并打开页面，不能先停现有服务再冒险重启
- `local-single-user` 的 `start-local-single-user.cmd` / launcher 必须支持重复启动防抖：如果本地工作台已经健康运行，则重复双击只能复用当前实例并打开页面，不能先停现有服务再冒险重启
- 如果 `local-single-user` 首次启动仍在拉起 API / worker / Web，后续重复启动必须通过启动锁等待现有实例完成，不能并发改写同一份 `runtime/web-standalone-current` 或共享日志文件
- `local-single-user` 启动完成后，如果后台 `worker` 进程意外退出，launcher 不能再直接把 API / Web 一起判死并整站下线；默认要先受控自动重启 worker，并把页面继续保持可用。只有 API 或 Web 自身退出，才允许把整套 runtime 判为致命失败
- 如果 `local-single-user` 的启动锁文件残留，但持锁 launcher 进程已经退出，新的启动会话必须能自动清理 stale lock 并继续启动，不能一直把用户卡在“本地工作台正在启动中”
- 如果 `local-single-user` 在开机自启或用户手动双击启动时首轮启动失败，launcher 默认必须先执行一次受控自动自愈，再重试启动；至少要覆盖 runtime metadata 残留、旧进程占用、runtime web bundle 残留等本地常见故障，不能把清锁、杀进程、删 runtime 目录之类动作留给用户手工处理
- `local-single-user` 安装器在备份旧安装目录前，不能只依赖 runtime metadata PID 停进程；还必须处理命中旧安装路径的残留占用进程，并给目录移动预留短重试，否则会在 `%LOCALAPPDATA%\\Programs\\AiOmniOps` 备份阶段直接失败
- `local-single-user` 的资料目录允许由用户在个人中心安全页配置，但配置文件必须独立保存在默认资料根下的 `launcher-settings.json`，不能写回程序安装目录；目录切换默认在下次重启时迁移并生效
- 本地资料目录不能指向程序安装目录，也不能把“更换资料目录”做成即时热切换；默认要求“保存配置 -> 重启 -> launcher 迁移 -> 新目录生效”的受控闭环
- `local-single-user` 启动期若需要补默认用户、默认品牌或默认成员关系，只允许“缺失时创建”，不允许在每次启动时覆盖已有品牌的业务字段（如品牌名称、行业、品牌介绍、企业介绍等），避免安装、升级或重启后把用户已经保存的品牌背景资料重置回默认值
- 打 `local-single-user` 安装包时，不能直接复用可能过期的 `apps/server/dist` 或 `apps/web/.next/standalone`；打包前必须先做一次真实预构建，再把最新产物装进 release bundle
- 凡是 `local-single-user` 交付链里会被 Windows PowerShell 5 直接执行的 `.ps1`，包括独立 updater 和安装脚本，都必须以 `UTF-8 BOM` 写入；Node 侧生成或复制脚本时不能只落无 BOM 的 `utf8` 文本
- 如果 `local-single-user` 的独立 updater 要在安装前整体移动或替换安装根，停机阶段不能只杀 runtime metadata 中记录的 launcher / server / worker / web PID；还必须额外清理命令行仍引用 `start-local-single-user.cmd` 的 `cmd.exe` wrapper 进程，否则 `Move-Item` 会因为文件占用留下“半替换”安装根
- 如果 `local-single-user` 升级链里存在由 PowerShell 写出的本地 JSON（例如 `system-update-status.json`），Node 侧读取时必须先剥掉 UTF-8 BOM 再做 `JSON.parse`，不能假设持久化状态文件一定是纯无 BOM 文本
- Windows 下构建 `local-single-user` 发布物时，大目录复制优先走 `robocopy` 这类系统级工具，不要继续直接依赖 Node `fs.cpSync()` 去整包复制 `node_modules`、standalone 等大目录；否则既可能把进程直接打崩，也没有足够的进度日志可用于排障
- 如果 launcher 在安装态仍会调用 `npm-cli.js`、并且仍可能依据源码指纹决定是否重跑 `server build` / `web build`，那么发布物就不能只带 `node.exe + dist/standalone`；还必须随包带上 launcher 真正依赖的 npm 运行时和对应源码输入，至少覆盖 `bin/node_modules/npm`、`apps/server/src` 这类安装态首启会命中的输入
- 面向用户分发的正式 `local-single-user` 发布物，默认应开启 `LOCAL_SINGLE_USER_PREBUILT_ONLY=true` 并按预构建运行时模式启动；除非明确要支持安装态现场重编诊断，否则不要再把 `apps/server/src`、`apps/web/src`、顶层 `next/@next/react` 等仅服务构建兜底的大体积输入继续打进升级包
- `local-single-user` 的开机自启 helper 必须与用户手动双击 `start-local-single-user.cmd` 保持同一条启动口径；至少要显式继承 `LOCAL_SINGLE_USER_PREBUILT_ONLY=true`，不能让自启路径绕过 prebuilt-only 模式后再误命中 `next/dist/bin/next` 这类安装态不应依赖的模块
- `local-single-user` 的开机自启 helper 不能只负责“点火后立即结束”；至少要在后台受控确认本地 API / Web 已恢复健康，并在首轮自启后仍未验活时自动补一次启动，避免把“重启后页面打不开、用户再手动双击一次才恢复”的问题留给用户
- `local-single-user` 的 Windows 自启动注册与安装器 fallback，不能长期并存多个历史入口（例如同时残留 Startup `.cmd` 与旧 `.lnk`）；每次重装、repair、升级或 fallback 前，都必须先清理历史自启工件，确保开机时只会有一个有效入口，避免双重拉起把 launcher 锁等待放大成“重启后页面打不开”
- 裁剪 `local-single-user` 发布物里的 `node_modules` 时，不能只按“看起来像开发依赖”做静态删包；凡是安装态首启会命中的链路，尤其 `prisma generate`、`@prisma/config`、`effect` 及其传递依赖，都必须先做真实启动验证后才能决定是否移除
- launcher 中 `Prisma db push`、`server build`、`web build` 这类长耗时步骤不能只打印开始和结束；至少要有周期性报活日志，避免把正常慢构建误判为卡死
- launcher 重启时，像 `Web build` 这种重步骤不能默认每次都全量重跑；如果源码与依赖输入未变化，必须优先复用已有产物并显式打印 `skip`，把本地启动时间从重复构建转成复用启动
- `apps/web` 的 SWC / wasm 口径默认走“兼容优先”：真实本地机器不要一刀切强制 `useWasmBinary`；但在已知原生 SWC DLL 异常的沙箱环境里，可以自动强制 wasm，避免先尝试 native 再失败回退带来的额外耗时
- Windows 下如果 launcher 依赖 `next build`，且现场已知存在 `@next/swc-win32-x64-msvc` 这类原生 SWC 包，启动前应优先做一次最小原生加载探测；若直接 `require()` 已失败，则应只对当前 launcher 运行受控注入 `NEXT_FORCE_WASM_BINARY=1`，避免每次都重复踩“先 native 失败再 fallback”的慢路径
- 这类原生预检本身不能成为新的阻塞点；像 SWC `.node` 探测这类启动前探测必须带超时，并在超时后按“探测失败 -> 走兼容兜底”处理，不能让 launcher 卡死在探测阶段
- 对原生 SWC 的环境判断要先排除低级干扰项再下结论：至少区分“中文路径/仓库路径问题”“VC runtime 缺失”“当前环境全面禁止 native addon”与“Next SWC 二进制专项兼容问题”；如果像 `sharp` 这类其它 `.node` 模块可正常加载，就不要再把问题笼统归因为“沙箱不支持所有原生模块”
- 本地单机验证默认至少覆盖：`/brand-growth`、`/xiaohongshu`、`/douyin`、`/wechat`、`/more-features/design`、`/personal-center`
- 前端排障埋点如果需要浏览器上报，统一走 `apps/web/src/lib/runtime-debug.ts` 这类受控 helper，默认关闭
- 不允许继续在页面、工作区或 service 中硬编码 `http://127.0.0.1:*` 的调试上报地址，避免把开发期调试端口带进本地正式链路
## 5. 后端规范


### 5.1 Controller 与 Service 分层

- Controller 只做参数接收、权限门卫和返回包装
- 复杂业务逻辑下沉到 service、gateway、repository、mapper
- 外部集成调用不允许散落在 controller 和页面层

### 5.2 配置与依赖注入

- 环境变量统一收口到配置模块
- 不允许在业务 service 中继续散读 `process.env`
- 不允许继续手工 `new AppConfigService()` 绕开 DI
- 如果标准 Docker 运行态需要把素材库或站内存储根目录挂到宿主机，必须统一通过配置模块读取容器路径与展示路径；不能在业务链路里硬编码 `/data/...` 或 Windows 盘符
- 标准 Docker 运行态的首装链不能只把 `postgres / server / web` 拉起来就算完成；必须在 compose 主链中受控完成 schema 初始化、邀请码同步和最小演示账号/品牌补齐，优先收口为 one-shot `db-init` 服务，而不是再要求用户手动进容器执行 `pnpm db:init`
- 标准 Docker 运行态的容器不能继续依赖 `corepack` 在构建期或运行期临时解析 `pnpm`；像 `web`、`db-init`、`server` 这类容器需要的包管理器必须在镜像构建阶段通过确定性方式准备好，运行时尽量直接执行应用或 `npm run ...`，避免用户机器网络、代理或 npm registry 抖动导致容器“镜像已构建但启动即退出”
- 标准 Docker 首装链默认不能再被本地 ASR 这类重型 Python 依赖阻塞；若视频文案提取依赖的 `torch / torchaudio / funasr / faster-whisper` 在部分机器上因 PyPI / TLS / 代理问题安装缓慢或失败，主系统必须仍可先完成 `db-init + server + web` 安装，再通过显式开关单独补装 ASR 运行时
- 标准 Docker 运行态的默认演示数据只能“补缺即止”，不能在每次 `server` 重启时重复执行会清空或重置品牌资料的破坏性 seed
- 标准 Docker 运行态下，只要某张运行时自举表会长期承接真实业务或缓存数据，并且 `db-init` 仍会执行 `prisma db push`，这张表就不能长期停留在 `prisma/schema.prisma` 之外；否则 Prisma 会在更新时把它误判为待删除表并中断初始化链。若短期确实不能入 schema，就必须同步把 `db-init` 路径改成不会碰这张表的受控方案
- WorkBuddy 专家源目录切换不能由网页直接改 Docker 挂载；网页只能记录挂载申请，真实应用必须走本机脚本或安装器。当前 lab 标准脚本为 `scripts/apply-expert-source-mount-request.ps1`，默认只读写入 `WORKBUDDY_EXPERT_SOURCE_HOST_PATH` 并重建 `server/web/ingress`，且不得开启 `EXPERT_CONFIG_WRITE_ENABLED`。
- WorkBuddy 真实专家源可能包含数百个 Skill 文件；专家/Skill 工作台不得默认全量展开全部节点。树扫描应使用短缓存，专家页/Skill 页必须优先使用 `section + filesOnly` 的分支接口，前端树应按需展开或分页/截断渲染，AI 智控中心辅助导航 Link 默认关闭非必要 prefetch，避免后台 RSC 预取、无关分支传输和 DOM 一次性膨胀造成卡顿。
- 真实保存开放前必须先调用保存写回确认闸。确认闸至少核验：服务端 dry-run、完整 Diff SHA、候选 Markdown SHA、写前本机快照、`EXPERT_CONFIG_WRITE_ENABLED`、可写挂载和用户显式授权；同时必须返回写后回读校验计划和回滚预案。当前 `save-request` 只能返回审计证据，不得写 WorkBuddy 真源。
- 首次真实写回前必须先调用 `GET /api/ai-control/writeback-readiness` 生成授权前检查清单和最小样本推荐。样本选择优先 `skills/**/SKILL.md` 这类配置入口文件，避免主理人、专家团总控、MCP/连接器签名或 `references/*.md` 资料文件作为首测对象；readiness 返回 `ready_for_real_writeback=false` 时不得执行真实保存。
- 非 Git 本机 WorkBuddy 专家源的真实写盘不得绕过 `GET /api/ai-control/writeback-executor-plan` 所定义的本机快照原子写盘流程。正式执行器开放前必须具备同目录临时文件、fsync、rename 覆盖、写后 SHA 回读、本机执行审计和写前快照恢复锚点；当前 `writeback-executor-plan` 只返回草案，不创建快照、不写盘、不恢复。
- `GET /api/ai-control/writeback-executor-simulation` 只能作为零副作用模拟报告使用。它可以返回执行编号、闸门阻断、阶段状态和审计预览，但必须保持 `simulation_only=true`、`audit_preview.would_append=false`，不得创建快照、不得追加 `local-writeback-executions.jsonl`、不得写 WorkBuddy 真源。
- `GET /api/ai-control/writeback-executor-contract-tests` 只能作为真实写盘执行器开放前的只读合同测试使用。测试必须覆盖模拟停写、路径穿越、目标缺失、非法快照 ID、直打保存缺开关、审计零副作用等失败分支；接口返回 `readonly=true`，且不得创建快照、不得追加 `local-writeback-executions.jsonl`、不得写 WorkBuddy 真源。

### 5.3 品牌与权限校验

- 所有按 `brandId` 读取或写入数据的接口，都必须校验当前用户对该品牌的访问权限
- 不能只信任前端传入的 `brandId`
- 后台权限、会员等级、品牌协作权限要分层建模，不混用一个字段表达

### 5.4 长耗时任务

- 报告生成、内容生成、视频生成等长链路统一走任务中心
- 页面只负责创建任务、轮询状态和读取结果
- 任务必须具备超时归一化、失败提示和必要的恢复入口

### 5.5 外部模型与 Provider

- 运行时 Provider 以后台配置为真源
- 文本、图像、视频链路都必须校验 `runtimeKey` 兼容性
- 技能配置如指定首选 Provider 或模型，运行时必须先严格尝试，再 fallback
- 报错必须说明失败阶段、尝试顺序、最终原因和是否可重试
- 接入统一网关类新平台时，必须同时补：
  - `api-provider-catalog.ts` 的系统 Provider 种子
  - `third-party-platform-catalog.ts` 的平台聚合映射
  - 前台品牌共享 Key 的说明文案
- 如果新平台复用已有 `runtimeKey`，但暂时不希望直接抢占现有默认路由，默认先以 `DRAFT` 预装，再由后台确认后启用

### 5.6 技能与 Prompt 落库

- 当需求涉及“新增技能”“拆分技能”“新增提示词”“调整技能中心配置”时，默认交付物不是只改前端展示或只改代码枚举，而是要一次性打通：
  - `SkillConfig`
  - `PromptTemplate`
  - `SkillPromptBinding`
  - 前端真实入口或真实调用链
- 默认要求是：服务启动后在数据库可用时自动同步缺失的技能、Prompt 和绑定，不能只依赖内存种子或仓库外临时文件。
- 如果当前执行环境数据库不可达，必须明确告知“本地未能完成真实写库验证”，并补齐自动落库机制、同步脚本或上线后可立即生效的同步路径，不能把“之后手动补库”留给用户猜。
- 技能相关改动完成后，必须同时检查：
  - 后台技能中心是否可见并可编辑
  - 个人中心是否可见并可覆盖
  - 前端业务入口是否真的命中新技能
  - 数据库中是否已有对应记录，或是否具备数据库恢复后自动入库能力

## 6. 知识库与 AI 智控中心 规范

### 6.1 知识库

- 前台默认以“知识库”作为用户可理解的主概念，不暴露后台内部容器术语
- 知识绑定一旦进入运行时，必须在文档中明确生效入口、继承链和失败策略
- 当前知识绑定已经进入报告、营销策划、公众号、设计工作台和多条内容生成链路

### 6.2 AI 智控中心

- AI 智控中心 通过受控 API / MCP / 安装令牌接入当前系统
- 完整令牌不作为服务端明文长期存储
- 品牌上下文、用户身份、权限校验和审计是 AI 智控中心 链路的默认要求
- 如果 AI 智控中心 对接的外部开源系统需要为部署或联调补丁修改本体源码，默认要维护“受控 fork / 受控镜像”，不能把整份第三方源码塞进主仓库，也不能把“每台机器手工改一次”当成交付方案

## 7. 资源与存储规范

- OSS 是正式资源真源，`.runtime` 仅用于本地开发回退
- 对第三方平台返回的短时效媒体直链，不允许直接作为长期资源真源
- 报告 HTML、作品图、视频、品牌附件都应落受控副本
- 受保护媒体在前端以鉴权拉取 blob 或站内受控接口方式访问，不直接裸链暴露
- 对需要登录鉴权的图片、音频、视频预览，前端不能把受保护 API URL 直接塞给 `<img>`、`<audio>`、`<video>` 作为长期方案；必须先通过受控请求带上登录态拉取 blob，再生成对象 URL 预览，否则浏览器媒体标签不会自动补业务鉴权头
- 品牌增长策略里的抖音采集视频预览也属于受保护媒体：网页态可继续使用 OSS 受控地址，但 `local-single-user` / 本地缺 OSS 时，必须回退到本地副本并通过站内受控接口读取，不能因为没有 OSS 就把 `videoUrl` 直接清空

## 8. 文档与 Git 规范

- 开发前默认先读：`engineering-standards.md`、`site-map.md`、`site-map-mermaid.md`、`development-delivery-checklist.md` 和最近变更记录
- 代码改动后默认补 `docs/changes/*.md`
- 结构变化同步更新 `site-map.md`
- 结构关系变化同步更新 `site-map-mermaid.md`
- 数据边界变化同步更新 `database-archive.md`
- Git 边界、提交拆分和快照备份遵循 `docs/git-workflow.md`
- 如果本次任务暴露出新的交付口径，比如“技能必须落数据库并接前端”，必须把它升级为文档规则，而不是只在当次对话里说明。

## 9. 当前优先级

### P0

- 保持首页、认证、工作台、个人中心、后台和 AI 智控中心 口径一致
- 继续压缩超大页面和超大 service
- 保证文档只反映当前事实，不再让历史草案混入基线

### P1

- 持续把共享能力收口到 `packages/*` 或前后端共享层
- 继续把工作区状态、轮询、发布和媒体处理抽成稳定能力
- 减少文档中的重复方案、展示镜像和已放弃路线


## 2026-10-22 素材发现与复用索引（357）

联查采集原作与素材档案，类型含音频、MIME优先且解码另验；产品/片段/版本/权益按品牌追加不可变索引修订。先筛选后分页，不自动全量入库；深度作品拆解留在内容获客。原MCP查询扩展与manage_brand_library维护共用服务，未知授权不推断。详见[素材索引契约](material-archive-index.md)。


## 2026-10-23 / 358 素材预览修复

素材预览使用当前会话读取站内文件并释放临时URL；HTML文档静态禁脚本，原文保留。按MIME及内容区分HTML与纯文字，不用旧materialType或页面HTTP200代替真实解码/播放。NEXT_PUBLIC_API_BASE_URL在构建阶段与目标部署一致，严禁为预览在URL附带令牌。 见[变更与验证](changes/2026-10-23-creative-material-preview.md)。


## 2026-10-23 / 359 安装客户端更新

共用安装区六选项改为AI智控中心、WorkBuddy、豆包工作、千问办公、Codex、MCP地址；豆包表单与千问JSON分别展示，旧连接不撤销。客户端模板依据用户截图/官方协议，不能凭模板生成称原生客户端已接通；复制、脱敏、当前品牌与安装包需同源核验。见[变更与验证](changes/2026-10-23-openclaw-client-guides.md)。

## 2026-10-23 营销日历结构化

独立内容、完整当天列表、资料就绪、CAS/幂等/修订与真实交付引用；旧正文保留，保存不生成或发布。见[变更与接口契约](changes/2026-10-23-marketing-calendar-content.md)。

## 2026-10-24 巨量广告工作区

腾讯右侧增加巨量六工作区，品牌账户/分页快照/诊断/计划与ocean_* MCP动作共用服务；保存不执行广告，复用BusinessAsset无迁移。见[变更及接口契约](changes/2026-10-24-ocean-ads-workspace.md)。

## 402 电商执行与修订

电商策略深链只传稳定ID/版本，条件以服务端保存值为准，禁止URL携带任意执行JSON；外部工具目录/客户端授权不等可用写网关。用户改文案保留旧媒体但标待更新；目标周期不自动平摊。见[402](changes/2026-10-27-commerce-operator-revision.md)。


404增量：电商目标按历史复算，独立广告投流/仅计广告费与ROI，逐指标历史/窗口状态，商品四步利益型创作。见[404变更](changes/2026-10-27-commerce-history-and-benefit-copy.md)。
