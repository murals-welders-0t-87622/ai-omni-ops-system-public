# AI全域运营系统全站地图

统一素材索引提前排除原本不显示的非素材类型，不改变业务入口；见[变更](changes/2026-10-27-material-kind-prefilter.md)。

统一素材检索减少原始采集回执重复传输，入口及数据保留规则不变；见[变更](changes/2026-10-27-material-rawfields-reduction.md)。

统一素材检索的候选标签按返回页计算，不改变页面入口与筛选范围；已部署Lab，见[变更](changes/2026-10-27-material-candidate-lazy-evaluation.md)。

403：取消独立运营台；目标可改并调用本机Codex重排；七类策略/三档具体费用与经营全景、商品、推广、用户看板。见[变更与契约](changes/2026-10-27-commerce-planning-dashboard.md)。

401：GMV情景→渠道分工/支撑指标→具体资源/排期/动作→商品项目，主图/详情/视频分面通过品牌任务调用本机Codex并保存版本。无效/跨品牌深链阻止误选，复制委托仅备用。见[经营分工与Codex](changes/2026-10-26-commerce-gmv-executor.md)。
400：电商财务目标→驱动指标→行动资源排期→完整窗口数据跟踪及未达标建议，兼容旧报告安全排版/历史；第三方采集仍须授权连接器回写。见[财务目标与跟踪](changes/2026-10-26-commerce-financial-scorecard.md)。

399纠正：电商三层按整页切换，旧方案report/actions直接可见，六类数据仅总览，方案/报表选择分开；不以新增字段或选中态代替业务内容验收。见[电商兼容修复](changes/2026-10-26-commerce-view-compatibility.md)。


398：电商既有两入口补主图/商品文案与品牌生意→战略/策略/执行→同口径结果对照；旧数据/版本和23技能架构保持。见[电商增长链路](changes/2026-10-26-commerce-growth-loop.md)。


391当前一级：全局概览、品牌增长、公域获客、私域复购、电商板块；公域下内容/GEO/全网/投流/达人路由不变，仅更名。历史374用语保留。见[公域菜单改名](changes/2026-10-26-public-acquisition-label.md)。

私域当前导航（389）：战略层【战略规划、业务总览】→策略层【运营策略、客户运营、会员权益、客户旅程】→执行层【今日执行、执行与复盘】。全局概览有私域图表摘要，直达 /tabs/private-repurchase/operations?view=overview；配置仍独立 /brand-admin/private-operations。参考变更：[三层经营与图表改版](changes/2026-10-26-private-strategy-analytics.md)。

387：私域从品牌生意模式承接，新增businessModel/经营路线与策略关联（契约1.5.0）；先看经营依据与本周行动，再看策略/逐日安排。技能4.0源21文件、三副本63文件/下载包一致；具体经营、状态与来源分层，旧数据和其他板块兼容保留。见[生意模式与私域承接](changes/2026-10-26-business-model-private-operations.md)。

385：私域去掉投流目标，战略默认前置，按阶段顺序→具体商品活动单→按日动作→四指标/实际组织；新增stagePlan/activityPlan，旧数据与其他投流模块兼容保留。技能3.3强制具体参数、来源推导及结构校验，安装/代码/原生业务/实际增长分别验收。见[阶段与活动单](changes/2026-10-26-private-stage-and-activity.md)。

384：私域默认“今日经营”，按进店/转化/客单/复购/投流→行动→负责人/时间→执行→目标实际组织；老板可按指标进入原计划和任务。来源未知不造达标，日数据不拿历史累计替代，AI按钮为复制委托。见[老板经营台与契约](changes/2026-10-26-private-owner-cockpit.md)。

[此段涉及具体客户资料，公开版本已省略。]

[此段涉及具体客户资料，公开版本已省略。]

[此段涉及具体客户资料，公开版本已省略。]


378新增私域复购/私域运营，七区与有赞店铺独立配置；战略→策略→执行、会员权益、场景需求与有证据标签/分群/旅程/复盘，客户主档复用AI销售。HTTP/MCP十动作同源，双权限、品牌隔离、CAS/幂等/历史；当前有赞只读，执行状态以真实回执为准。见[私域运营契约](private-operations-workspace.md)与[变更](changes/2026-10-25-youzan-private-operations.md)。

376新增私域复购/AI销售七区及独立3Chat配置，客户/商机/服务/订单/复购/策略/复盘与同源HTTP/MCP、独立权限、分页/不可变版本。实际查询/发送在WorkBuddy；配置候选不等已部署。见[AI销售工作区](ai-sales-workspace.md)与[变更](changes/2026-10-25-ai-sales-workspace.md)。


375数据流补充：品牌增长→产品资料库/企业知识库→当前品牌文件上传与正文分片→增长报告；电商→真实店铺映射→同周期快照→完整运营建议。菜单/路由不新增。见[归档说明](brand-document-import.md)。


374：一级为全局概览、品牌增长、全域获客、私域复购、电商板块；内容/GEO/全网/投流/达人原路由不变，归入全域获客。电商详情页`/tabs/ecommerce/detail`、淘宝天猫`/tabs/ecommerce/operations`；私域`/tabs/private-repurchase`暂空。参考[电商变更](changes/2026-10-25-commerce-workspaces.md)与[契约](commerce-workspaces.md)。


370：新增自用seedance2.0 Mini多参（2089757422163419137），保留原24项，现25项；20实时字段、页面/MCP/下载包及旧目录通过，只Lab server更新。见[多参应用接入](changes/2026-10-25-runninghub-mini-multi-reference.md)。

369：新增Seedance Mini图生视频，RunningHub共24应用；参数请求超时/旧响应保护及字段类型、真实数值枚举修正。24项只读参数接口87—206ms全部成功；历史长等待与生成未知分开。见[接入与性能检查](changes/2026-10-25-runninghub-seedance-mini-performance.md)。

368：RunningHub目录独立加载，作品列表先返回保存快照；状态查询及历史归档按品牌单飞后台补偿，查询有超时，旧品牌延迟结果不落入当前页面。入口/权限/生成参数不变。见[加载阻塞修复](changes/2026-10-25-runninghub-workspace-loading.md)。

354按用户纠正撤掉353制作分项/短期限/撤销历史界面；完整品牌运营连接默认包含图片、语音、RunningHub，原令牌直接读204工具。旧JSON/历史保留兼容，品牌隔离和连接生命周期不变。69策略、9API、29模块/42写回、182页面、6行为/8布局、26运行hash通过；仍有五顶部委托未接、五导出404，真实供应商/独立专家待验。见[制作直接使用及复查](changes/2026-10-22-production-direct-use-and-functional-recheck.md)。

会话353：原OpenClaw安装区新增单连接图片/语音/RunningHub制作授权、期限/撤销/历史；旧14/24/203不自动扩权。MCP列表与调用精确控动作、轮换保留授权，蝉镜并发刷新和失败提示完善。55策略、15API/MCP、7页面/4宽及26运行hash通过；无真实生成/供应商调用。见[制作授权变更](changes/2026-10-22-brand-production-authorization.md)。

351导航纠正：旧/brand-growth、/douyin、/xiaohongshu、/wechat、/geo、/all-network-growth、/paid-acquisition、/creator-cooperation进入对应/tabs运营区；/personal-center/tasks保留真实任务页；旧third-party-platforms/openclaw进/brand-admin/apis及?tab=openclaw。参考[变更](changes/2026-10-22-all-brand-system-audit.md)。

会话350恢复品牌MCP业务范围：完整目录244中明确203项品牌运营工具，41项发布/付费生成/人工审阅及平台个人配置不自动开放；manage_*子动作同策略限制。旧read14/work24不静默扩展，品牌Owner/Admin可单连接确认升级，保留令牌/MCP名称/配置并追加授权修订；页面显示真实数量和连接选择。指定用户连接已14→203并用原环境引用令牌真实HTTP回验，未执行模型或发布。见[品牌运营授权](changes/2026-10-22-brand-operations-grant.md)。

会话348：品牌第三方接口凭据保存增加提交处持久反馈、可关闭浮动提醒与保存中状态；按当前平台显示，编辑清旧提示，成功后清空输入。PATCH成功与列表刷新失败分别提示，保存成功不等于供应商连通。仅页面反馈，不改凭据/授权/模型调用。见[保存反馈](changes/2026-10-22-brand-api-key-save-feedback.md)。

会话347更正346的安装区实现：直接提取原OpenClaw安装区为共享组件，平台与品牌后台渲染同一界面；保留正式令牌查看/隐藏、6类客户端片段、Git/ZIP和原指南。安装页移除高级设置；模型/Skill/知识版本数据与独立历史页保留，不是安装步骤。品牌适配只操作当前连接，新连接30天work范围在确认中明确，旧连接不扩权、不全品牌重置；原连接/其他品牌不受影响。Codex仍为环境变量引用，实际安全绑定和客户端执行尚未接通。见[原版安装区复用](changes/2026-10-22-original-openclaw-shared-installation.md)。

会话346按用户确认恢复品牌智控原版操作：卡片式首页；接口与连接器配置内“第三方接口配置 / OpenClaw 安装”双Tab，版本组合放高级设置；知识/成员/品牌技能移出主导航，旧数据与业务页保留。品牌素材位于/brand-admin/assets，原共享素材入口按当前权限返回，平台管理边界不放宽。见[使用回归修复](changes/2026-10-22-brand-control-familiar-workflow.md)。

品牌独立模型与执行配置：用户选择BYOK；`/brand-admin/models`设置本品牌服务凭据，`/brand-admin/execution`保存/发布/回退版本，`/brand-admin/knowledge`复用品牌知识入口。新增凭据密文列、列表不回显Key、空保存保留/显式清除留空墓碑防旧值复活。只读MCP返回冻结组合；实际客户端授权/加载与专家执行未完成。见[变更](changes/2026-10-21-brand-models-and-execution-profile.md)。

[此段涉及具体客户资料，公开版本已省略。]

品牌主账号后台规则：注册即本品牌OWNER/完整品牌权限，进入独立品牌智控后台；平台全局管理另行授权。品牌设置/团队与权限/品牌Skill/素材复用既有API，加入他牌协作不隐藏原OWNER品牌。见[会话341变更](changes/2026-10-21-brand-owner-admin-workspace.md)。

[此段涉及具体客户资料，公开版本已省略。]


多账号并行：真实登录/邀请码注册、标签页独立会话、账号与品牌入口、标准Lab严格权限及当前品牌读写；共享演示数据不再充当经营事实。已通过双账号/越权/过期测试，新品牌WorkBuddy授权仍需接入。详见[会话338变更](changes/2026-10-21-multi-account-brand-isolation.md)。


本机WorkBuddy增长执行器：受控后台启动、当前品牌/计划MCP代理、真实成员与提交回执、90秒心跳；不自动生效/采纳/发布/支出。详见[会话336变更](changes/2026-10-21-workbuddy-growth-executor.md)。实际联调结论见该文档与总控收尾记录。


经营驾驶舱与持续增长计划：六时间/六业务真实统计，结构化计划/检查/建议/不可变版本、来源上报与独立Lab只读调度，12项同源MCP；专业执行采用WorkBuddy拉取队列，未实现反向唤起。详见[会话335变更](changes/2026-10-21-growth-cockpit-and-plans.md)。


作品拆解追加：WorkBuddy授权范围内自动挑选（候选去重）、采集作品页码跳转、取消后列表移除并终止提交。详见[会话332变更](changes/2026-10-21-work-analysis-selection-pagination-cancel.md)。


## 内容获客作品拆解

`/tabs/content-customer?platform=douyin|xiaohongshu|wechat&panel=work-analysis` → 三平台各自最后的作品拆解 → `WorkAnalysisWorkspace.client.tsx` → `WorkAnalysisController/Service` → `WorkAnalysisRequest/Result`。来源是授权采集作品，专业分析由WorkBuddy新专家团完成，页面登记pending不主动启动客户端。详见[变更记录](changes/2026-10-21-content-work-analysis.md)。

## 独立 lab 运行入口

`docker/docker-compose.ontology-lab.yml` -> 目标/秘密校验 -> 专用 db-init -> 现有 API/Web；仅新增运行边界，未新增业务页面或 Ontology 对象。API 的 Scheduler/Collectors/Works 启动自动任务被 lab 配置关闭；Prisma 可用性检查在 lab 失联时抛 503。

参考：[lab运行基线](ontology-lab-runtime.md)、[第一批保护变更](changes/2026-09-26-ontology-lab-isolation.md)。本机基础部署已验收，WorkBuddy尚未连接，Ontology业务运行时未建。

lab 专用镜像入口为 `docker/ontology-lab.Dockerfile`，准备/验证脚本在 `scripts/*ontology-lab*`；lab 鉴权拒绝不可访问的明确品牌，不再回退首个品牌。参考：[部署与运行验收](changes/2026-09-26-ontology-lab-runtime-verification.md)。

宿主回环23001/23011由独立ingress发布，仅转发固定Web/API。入口无业务凭证/数据卷并禁IP转发；应用/DB/db-init只在internal网络，数据库无宿主端口。真实登录/选题读写/断库/整体停启已通过，不代表所有业务或浏览器交互已验收。

## 1. 文档定位

本文件只记录当前系统的真实结构，不再混入历史规划稿、已放弃路线或展示镜像。

它需要回答四个问题：

1. 现在有哪些真实入口
2. 每条主链路由哪些前后端模块承接
3. 哪些能力已经正式落地
4. 哪些目录是当前真相，哪些目录只是历史参考

## 2. 顶层结构

### 2.1 代码目录

- `apps/web`
  - 官网首页、认证页、前台工作台、个人中心、后台管理台、帮助页、发布页
- `apps/server`
  - 认证、品牌、采集、报告、作品、任务、发布、系统升级、AI 智控中心、后台治理等 API 模块
- `packages/config`
  - 配置相关共享包
- `packages/prompt-runtime`
  - 提示词与运行时能力
- `packages/shared`
  - 前后端共享类型与常量
- `packages/ui`
  - 共享 UI 预留层
- `docs`
  - 当前真相文档、专题方案、变更记录、历史规划

### 2.2 文档目录

- `docs/README.md`
  - 文档总入口
- `docs/changes/`
  - 真实变更记录
- `docs/project_planning/`
  - 历史规划与阶段草案，仅作参考
- `docs/ai-control-center/`
  - AI 智控中心 相关专题文档

## 3. 前端路由地图

### 3.1 公共与认证入口

- `/`
  - 官网首页，当前是营销型首页
  - `local-single-user` 安装态下访问根路径时会直接跳到 `/brand-growth`，避免安装态去渲染仅面向官网的营销首页模板
- `/login`
  - 前台登录页
- `/register`
  - 前台注册页；当前网站版、源码运行态与 `local-single-user` 安装态统一都走邀请码注册，由 `GET /auth/register-config` 与 `POST /auth/register` 后端控制准入
- `/admin/login`
  - 后台管理员登录页
- `/help/xhs-draft-publisher`
  - 小红书扩展帮助页
- `/help/publisher`
  - 统一发布扩展帮助页
- `/help/douyin-publisher`
  - 抖音扩展帮助页
- `/help/wechat-channel-publisher`
  - 视频号扩展帮助页
- `/publish/mobile/[token]`
  - 移动发布接力页

### 3.2 受保护工作台入口

- `/tabs/brand-control`
  - A 层全局概览主入口；当前以上方 5 个业务板块真实工作区核心数据为主，并补充跨板块最近任务动作与治理提醒，已覆盖素材/计划/作品、GEO 诊断与内容、评论/平台线索、腾讯投流线索、达人匹配/跟踪，以及 `workflow-core / ontology-mapper outbox` 摘要
- `/brand-growth`
  - 品牌增长策略工作台
- `/xiaohongshu`
  - 内容获客工作台；当前用统一左侧导航收口某书 / 某音/某号 / 公众号三类内容运营板块
- `/tabs/content-customer`
  - A 层内容获客主入口；当前已直接进入 `/xiaohongshu` 同源的 `ContentAcquisitionWorkspace`，不再先停留在静态 dashboard 壳
- `/douyin`
  - 抖音工作台兼容直达入口；顶栏已移除，主入口已并入 `/xiaohongshu`
- `/wechat`
  - 公众号工作台兼容直达入口；顶栏已移除，主入口已并入 `/xiaohongshu`
- `/geo`
  - GEO获客工作台；承接 AI 智控中心 保存的 GEO 诊断、关键词挖掘、网站诊断、知识库搭建、优化方案与多次生成内容
- `/tabs/geo-customer`
  - A 层 GEO 获客主入口；当前已直接进入 `/geo` 同源的 `GeoWorkspaceShell`，不再先停留在静态 GEO dashboard 壳
- `/all-network-growth`
  - 全网获客工作台；承接 AI 智控中心 从品牌增长评论用户结果生成的评论获客名单
- `/tabs/omni-channel`
  - A 层全网获客主入口；当前已直接进入 `/all-network-growth` 同源的 `AllNetworkGrowthWorkspaceShell`，不再先停留在静态全网 dashboard 壳
- `/paid-acquisition`
  - 投流获客工作台；承接 AI 智控中心 直接写入的腾讯投流获客列表
- `/tabs/ad-traffic`
  - A 层投流获客主入口；当前已直接进入 `/paid-acquisition` 同源的 `PaidAcquisitionWorkspaceShell`，不再先停留在静态投流 dashboard 壳
- `/creator-cooperation`
  - 达人合作工作台；承接 AI 智控中心 从达人结果池筛选的达人匹配、达人跟踪与合作作品跟踪
- `/tabs/daren-collab`
  - A 层达人合作主入口；当前已直接进入 `/creator-cooperation` 同源的 `CreatorCooperationWorkspaceShell`，不再先停留在静态达人 dashboard 壳
- `/more-features`
  - 更多功能入口，当前重定向到 `/more-features/design`
- `/more-features/design`
  - 设计工作台
- `/personal-center`
  - 个人中心总入口
- `/admin`
  - 后台管理台
- `/membership-purchase`
  - 会员购买
- `/points-purchase`
  - 点数购买
- `/orders/[id]`
  - 订单详情

### 3.2A AI 智控后台入口

- `/ai-control`
  - AI 智控中心后台总览，承接专家、Skill、接口、任务、版本、Ontology 编排和治理配置入口
- `/ai-control/ontology`
  - Ontology 编排中心；定位为 AI 智控中心的大脑板块，用于呈现专家团/专家与 AI 中台能力之间的业务流程导航
  - 当前先展示“我的 Ontology 编排项目”，每个项目绑定一个专家团或专家；新建弹窗同时提供 `手动DIY` 与 `AI 生成草案` 两条入口
  - 单项目画布展示中间业务流程画布、右侧五元素契约和防臃肿规则
  - S3-02Q 起，左侧节点库提供业务阶段、专家/Skill、MCP 工具、数据对象、确认闸、证据写回 6 类节点模板；点击模板会创建真实草稿节点，并预填五元素契约
  - 真实元素库保留为“绑定真实元素”辅助区，用于把当前节点绑定到专家、Skill、MCP 工具、中台功能、数据对象和资料引用
  - S3-02R 起，项目内中间区域不再使用横向卡片列表，改为画布节点和 SVG 连线呈现
  - S3-02S 起，画布不模仿参考图的黑色背景，主操作改为“点每个业务环节右侧 `+` -> 展开添加下一环节菜单 -> 选择节点类型 -> 自动新增节点并连线”
  - S3-02T 起，S3-02S 的“卡片右侧添加菜单”被替换为“卡片点击绑定真实元素、卡片之间 `+` 新增连线、卡片之间齿轮设置连线规则”；左侧 `当前项目节点库` 与 `绑定真实元素` 移除，底部 `连线规则` 区块移除
  - S3-02T 起，画布支持卡片拖动并保存 `positionX/positionY`，支持放大/缩小；绑定真实元素和连线规则均改为画布内弹窗
  - S3-02U 起，顶部 `新增环节` 打开节点类型选择弹窗，支持业务阶段、专家 / Skill、MCP 工具、数据对象、确认闸、证据写回 6 类模板；若当前选中卡片，新节点会接在该卡片后并自动创建连线
  - S3-02V 起，每张画布卡片提供独立 `连线` 按钮；点击后进入自由连线模式，再点击另一张卡片即可创建草稿连线并打开 `连线规则` 弹窗
  - S3-02W 起，已发布项目右侧发布预览区提供 `专家源 Diff` 只读入口，调用 `GET /api/ai-control/ontology/flows/:flowId/expert-source-diff-preview` 将 latest `published_contract` 翻译为专家源候选 Markdown Diff；MCP 同步提供 `get_ai_control_center_ontology_expert_source_diff_preview`；该入口不写盘、不创建快照、不触发 WorkBuddy 执行
  - S3-02X 起，Lab 运行态已通过 REST 与 WorkBuddy MCP 连接器验证：旧 `douyin-content-team / 抖音专家团` 发布契约可只读映射到本机 WorkBuddy 专家文件 `douyin-fullflow-ops-prep-2026-09-26/agents/douyin-fullflow-ops-team-lead.md`，生成专家源候选 Diff；写回仍由总闸关闭
  - S3-02Y 起，已发布项目右侧发布预览区提供 `写回申请` 入口，调用 `POST /api/ai-control/ontology/flows/:flowId/expert-source-writeback-request`；WorkBuddy MCP 同步提供 `request_ai_control_center_ontology_expert_source_writeback`，从 latest `published_contract` 重新生成专家源候选稿并复用 md-writer 确认闸校验 Diff SHA、候选 SHA、写前快照、可写挂载和用户授权；当前仍只返回闸门证据，不执行真实写盘
  - S3-02Z 起，专家源候选 Markdown 会追加 `Ontology 启动前读取规则`：要求 WorkBuddy 专家团/专家/Skill 开工前先调用 `get_ai_control_center_published_ontology_contract` 与 `get_ai_control_center_ontology_execution_plan`，有真实 `taskId/stageRunId` 时再记录执行前计划证据和节点推进证据；该规则仍只进入 Diff 预览与写回确认闸，不直接写 WorkBuddy 真源
  - S3-02ZB 起，后端提供 `POST /api/ai-control/ontology/flows/:flowId/expert-source-writeback-execute` 作为 Ontology 专用受控写回执行入口；接口只接受 latest `published_contract` 派生候选稿，必须通过 Diff SHA、候选 SHA、写前快照、`EXPERT_CONFIG_LOCAL_WRITEBACK_EXECUTOR_ENABLED`、`EXPERT_CONFIG_WRITE_ENABLED`、可写挂载和用户授权全部 gates；默认运行态返回 `blocked_before_write / writeExecuted=false`
  - 元素库通过 `GET /api/ai-control/ontology/elements` 只读聚合专家源、Skill、MCP 工具、中台数据对象和后台功能入口
  - 已支持保存固定样例草稿到 `ontology_orchestration_flows/nodes/edges/versions`
  - 已支持从真实元素库选择元素并保存到节点 `referencesJson.boundElements`
  - 已支持草稿节点新增/删除、五元素编辑、连线规则编辑、失败分支、确认闸和证据规则配置
  - 已支持只读发布预览，`GET /api/ai-control/ontology/flows/:flowId/publish-preview` 会生成 `ontology-flow-v1` 候选契约、候选 Hash、风险检查和回滚锚点
  - 规则变更和发布预览只生成草稿证据或只读候选，不调用 AI 模型，不发布 WorkBuddy 执行契约
  - 节点引用通过 `POST /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey/references` 写入草稿，并生成 `reference_binding_snapshot`
  - 当前新增节点可视化编辑：支持通过 `POST /api/ai-control/ontology/flows/:flowId/nodes` 新增/更新草稿节点标题、类型、顺序、描述和 Object/Link/Function/Action/Interface 五元素字段
  - 当前新增 `DELETE /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey` 删除草稿节点；删除时清理相关连线并按节点顺序重建草稿顺序连线
  - 当前发布预览面板展示节点数、连线数、风险数、候选 Hash、回滚锚点和发布前风险列表；确认前仍不创建 `published_contract`
  - 当前新增 `POST /api/ai-control/ontology/flows/:flowId/publish`，要求 `confirmPublish=true` 和发布预览返回的 `candidateHash`；后端重新生成候选契约并校验 Hash 后，创建不可变 `published_contract` 版本并把流程状态更新为 `published`
  - S3-02ZZB 起，页面主按钮已改为 `确认发布并同步`，前端默认调用 `POST /api/ai-control/ontology/flows/:flowId/publish-and-sync`；后端会先发布新的 `published_contract`，再按最新正式契约逐个生成专家源候选稿并立即尝试受控写回
  - `publish-and-sync` 的同步结果会回到同一页面的 `本次发布同步结果` 面板，显示目标数、已写成、已对齐、阻断数、受影响节点和阻断原因；同步证据同时会额外生成 `expert_source_sync_snapshot` 版本快照，供审计与追溯使用
  - 已发布流程禁止直接编辑节点、引用、连线和规则；后续修改需要从 published 契约派生新草稿
  - 当前发布的是 Ontology 正式契约，供后续 WorkBuddy 路由读取；仍不调用外部模型、不直接写 WorkBuddy 专家/Skill 真源、不修改其他 AI 中台配置板块真源、不触发业务执行
  - 当前新增 `GET /api/ai-control/ontology/published-contract`，供 WorkBuddy / MCP 只读读取 latest `published_contract`；支持 `flowKey/flowId`、`brandId`、`targetKind`、`targetId` 查询，当前品牌优先品牌专属契约，也可回退读取 `brandId=null` 的全局正式契约
  - WorkBuddy Agent 可通过 MCP 工具 `get_ai_control_center_published_ontology_contract` 在执行任务前读取正式路由契约；该工具只返回 `published_contract`，不读取 draft、generated、reviewed 或 publish-preview，不创建版本、不调用 AI、不触发任务执行、不写专家真源
  - 当前新增 `GET /api/ai-control/ontology/execution-plan`，供 WorkBuddy / MCP 从 latest `published_contract` 派生执行前路由计划；返回节点步骤、后续连线、确认闸、证据规则、执行前检查项和禁止动作
  - WorkBuddy Agent 可通过 MCP 工具 `get_ai_control_center_ontology_execution_plan` 在真实执行前确认流程路径；该工具只读派生计划，不创建任务、不调用 AI、不触发执行、不写任务账本、不写专家真源
  - 当前新增 `POST /api/ai-control/ontology/execution-plan/evidence`，供 WorkBuddy / MCP 把已确认的执行前计划写入 `wf_execution_events.evidenceRefsJson`，证据类型为 `ontology_execution_preflight`
  - WorkBuddy Agent 可通过 MCP 工具 `record_ai_control_center_ontology_execution_plan_evidence` 记录开工前路线图确认；该工具只写任务前证据，不创建任务、不调用 AI、不触发执行、不写专家真源、不修改 `published_contract`
  - 当前新增 `POST /api/ai-control/ontology/execution-node/evidence`，供 WorkBuddy / MCP 按 `published_contract` 派生计划记录单个节点的 `started/succeeded/failed/blocked` 受控推进证据
  - WorkBuddy Agent 可通过 MCP 工具 `record_ai_control_center_ontology_node_execution_evidence` 写入节点推进账本；该工具校验任务阶段归属和 nodeKey，并在确认闸未满足时只允许记录 `blocked`
  - S3-02N 阶段在执行路线下新增“读取正式路线 -> 按节点留证 -> 任务治理回看”的受控执行验证入口
  - 页面中的“查看任务治理”按钮跳转 `/ai-control/task-governance`；节点推进证据仍由 WorkBuddy/MCP 写入，Ontology 页面只负责配置和发布导航契约
  - S3-02O 起，已发布项目默认只读，后续需要从 `published_contract` 派生新草稿后再编辑
  - S3-02ZE 起，新建项目弹窗里的 `AI 生成草案` 已接入真实后端链路：`POST /api/ai-control/ontology/flows/ai-draft` 会读取目标专家/专家团 Markdown 真源、回读字典真源、调用当前可用模型生成或编译 Ontology draft，并落成可继续编辑的草稿项目
  - 当前运行态已确认 `AI 生成草案` 不再是占位按钮；Lab 重建后调用接口会进入模型凭证闸，当前品牌缺少可用 GLM 平台配置时返回 `503 当前品牌未匹配到可用的 GLM 平台配置`
  - 用户口径中的“多元探索平台 gpt-5.5”尚未精确接入 Ontology 草案生成；本轮先接通了可复用的 GLM Open 链路，不声称 AI 中台已经可以直接驱动 WorkBuddy 桌面端生成并执行画布
  - S3-02ZY 起，当目标是 `expert_team` 时，`AI 生成草案` 优先改走“团队注册表编译模式”：后端会读取 `expert-source/README.md`、`references/expert-registry.md`、`references/skill-registry.md` 与 `references/video-skill-routing.md`，直接全量展开所有专家节点、Skill 节点和主流程/归属连线，不再把团队结构交给模型自由压缩
  - S3-02ZY 起，新建项目弹窗里的 `重新生成 AI 草案` 已具备真实语义：同一目标若已有草稿项目，会显式确认后以 `forceRegenerate` 覆盖当前草稿骨架；若当前对象只有已发布项目，则保留旧正式版并生成新的 flowKey
  - S3-02ZZ 起，目标元素会随 `selectedTarget` 一起保存 `sourceRoot`；`expert_team` 注册表编译优先用 `sourceRoot` 反推团队根目录，并把 `video-skill-routing.md` 中的中文视频专家标签归一化为真实专家 ID，避免团队相对路径导致再次退回旧的 LLM 压缩草案
  - S3-02P 起，项目入口支持选择专家团 / 专家创建绑定对象的 draft 项目；已发布项目卡片提供“创建新草稿”，可从发布版本复制节点、连线和规则继续编辑
  - S3-02T 起，`新建项目` 改为弹窗，主页面不再展示选择框和项目名称输入；弹窗不再提供 Skill 作为项目创建目标
  - S3-02ZS 起，Ontology 项目页继续只保留一张主画布，右侧工作区现收口为 `结构变化 / 节点回退 / 发布同步 / 历史版本` 4 个同页切换入口；这些入口都围绕当前主画布工作，不新增第二张画布
  - S3-02ZS 起，节点模板中的 `专家 / Skill` 已拆成独立 `专家` 与 `Skill` 两类入口，Skill 开始作为正式节点类型进入画布
  - S3-02ZT 起，`结构变化` 工作区已接入真实只读扫描：后端会按节点绑定的 `expert-source` 文件读取当前 Markdown 真源，并结合 `local-history` 本机快照历史返回 `synced / changed / untracked / missing / unbound` 节点级摘要；前端可在同页工作区刷新查看，不写 WorkBuddy 真源
  - S3-02ZU 起，项目级历史版本仍通过 `GET /api/ai-control/ontology/flows/:flowId/versions` 读取、通过 `POST /api/ai-control/ontology/flows/:flowId/rollback-draft` 生成新的整项目回退草稿；但前端口径现已改为把这批“整张画布的正式发布历史”收进独立 `历史版本` 工作区，不再和 `节点回退` 或 `发布同步` 混成一个面板
  - S3-02ZW 起，节点级历史只在 `节点回退` 工作区内读取：当前选中节点会触发 `GET /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey/versions`，展示该节点最近 20 条历史摘要；同时前端新增 `POST /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey/rollback-draft`，允许把当前节点单独恢复到指定历史版本，不替换整张画布
  - S3-02ZZ 起，默认 `画布编排` 工作区收口为“只保留当前可编辑内容”；工作区说明、发布后的执行路线、受控执行验证、防臃肿规则等静态说明块已从主画布默认视图移除，避免继续挤占编辑区域
  - S3-02ZZB 起，`发布同步` 工作区的主闭环已从“确认发布后另走专家源写回”收口为“一次确认同时完成正式发布与专家源同步尝试”；其中 `expert_source_sync_snapshot` 只承担同步审计，不进入整项目回退候选列表，避免把同步留证误显示成可回退版本；当前页面也已继续拆清三种语义：`节点回退` 里只放当前节点历史，`历史版本` 里只放整项目正式发布历史，`发布同步` 里只放本次发布与本次 `专家源 Diff` 写回预演
  - 当前页面顶部阶段标识已更新为 `S3-02Y 写回确认闸 / Diff SHA / 候选 SHA / 安全拦截`；项目列表和画布顶部会随画布回读同步节点和连线数量
  - 参考变更：`docs/changes/2026-10-03-s3-02-ontology-orchestration-prototype.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02-ontology-orchestration-draft-storage.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02-ontology-real-element-library.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02-ontology-node-reference-binding.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02-ontology-node-visual-editing.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02-ontology-publish-preview.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02-ontology-publish-contract.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02-ontology-published-contract-mcp.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02-ontology-execution-plan-mcp.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02-ontology-preflight-evidence.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02n-ontology-controlled-node-execution.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02n-ontology-controlled-execution-visibility.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02o-ontology-project-canvas-entry.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02p-ontology-project-create-and-fork.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02q-ontology-project-node-library.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02r-ontology-video-canvas-view.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02s-ontology-step-plus-menu.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02t-ontology-canvas-interaction-realignment.md`
  - 参考变更：`docs/changes/2026-10-04-s3-02v-ontology-free-edge-connection.md`
  - 参考变更：`docs/changes/2026-10-04-s3-02w-ontology-expert-source-diff-preview.md`
  - 参考变更：`docs/changes/2026-10-04-s3-02x-workbuddy-real-source-preview-runtime.md`
  - 参考变更：`docs/changes/2026-10-04-s3-02y-ontology-writeback-confirmation-gate.md`
  - 参考变更：`docs/changes/2026-10-04-s3-02z-ontology-startup-read-rule.md`
  - 参考变更：`docs/changes/2026-10-04-s3-02zb-ontology-controlled-writeback-executor.md`
  - 参考变更：`docs/changes/2026-10-04-s3-02ze-ai-draft-generation.md`
  - 参考变更：`docs/changes/2026-10-06-s3-02zs-ontology-single-canvas-workspaces-phase-1.md`
  - 参考变更：`docs/changes/2026-10-06-s3-02zt-ontology-structure-changes-workspace.md`
  - 参考变更：`docs/changes/2026-10-06-s3-02zu-ontology-rollback-workspace-minimum-loop.md`
  - 参考变更：`docs/changes/2026-10-06-s3-02zw-ontology-node-versions-readonly.md`
  - 参考变更：`docs/changes/2026-10-06-s3-02zy-expert-team-registry-compiled-ai-draft.md`
  - 参考变更：`docs/changes/2026-10-06-s3-02zz-ontology-expert-team-root-and-canvas-cleanup.md`
  - 参考变更：`docs/changes/2026-10-07-s3-02zzb-ontology-publish-and-sync-closure.md`
- `/ai-control/experts`
  - 专家团/专家配置真源工作台；当前已从后端 `/api/ai-control/tree` 读取 `/expert-source/agents` 真实树
  - 预览区通过 `/api/ai-control/read` 回读真实 Markdown；编辑 Tab 已提供字段解析草稿，并通过 `/api/ai-control/preview` 获取服务端候选 Markdown 与完整 diff
  - 当前通过 `/api/ai-control/write-policy` 展示写入策略；`/api/ai-control/save` 默认被 `EXPERT_CONFIG_WRITE_ENABLED` 硬闸拦截
  - 当前已支持本机快照、恢复预览、恢复写回确认闸、目录挂载向导；`scripts/apply-expert-source-mount-request.ps1` 可把挂载申请应用到 lab env，仍保持只读挂载
  - 保存写入需等待显式确认、Git clean、可写挂载、提交记录与回滚证据
- `/ai-control/skills`
  - Skill 配置真源工作台；当前已从后端 `/api/ai-control/tree` 读取 `/expert-source/skills` 真实树
  - 预览区通过 `/api/ai-control/read` 回读真实 `SKILL.md`；编辑 Tab 已提供字段解析草稿，并通过 `/api/ai-control/preview` 获取服务端候选 Markdown 与完整 diff
  - 当前通过 `/api/ai-control/write-policy` 展示写入策略；`/api/ai-control/save` 默认被 `EXPERT_CONFIG_WRITE_ENABLED` 硬闸拦截
  - 当前已支持本机快照、恢复预览、恢复写回确认闸、目录挂载向导；`scripts/apply-expert-source-mount-request.ps1` 可把挂载申请应用到 lab env，仍保持只读挂载
  - 保存写入需等待显式确认、Git clean、可写挂载、提交记录与回滚证据
- `/ai-control/task-governance`
  - 任务版本治理真实看板，读取 `workflow-core` 与 `ontology-mapper` 的任务、阶段、产物、版本、执行事件和 Outbox 证据
  - 当前新增 Ontology 路线图证据展示：`GET /api/workflow-core/tasks/:taskId/governance-detail` 会从 `wf_execution_events.evidenceRefsJson` 提取 `ontology_execution_preflight`，前端展示流程、版本、步骤数、确认人和只读留证状态
  - 当前新增 Ontology 节点推进证据展示：同一详情接口会提取 `ontology_node_execution`，前端展示节点、状态、确认闸、引用数、后续节点和执行边界
  - 参考变更：`docs/changes/2026-10-03-s3-02m-task-governance-ontology-preflight-view.md`
  - 参考变更：`docs/changes/2026-10-03-s3-02n-ontology-controlled-node-execution.md`
- `/ai-control/apis`
  - 接口与连接器配置；当前已在原第三方平台 Key 配置基础上新增能力网关证据面板
  - RunningHub 展示应用清单、选中应用详情、`nodeInfoList` 参数模板和最近作品
  - 蝉镜展示模板标签、模板封面覆盖、公共声音和数字人视频作品
  - 第一版为只读证据，不自动提交生成任务、不消耗第三方额度
  - 参考变更：`docs/changes/2026-10-02-s2-03-gateway-evidence-panel.md`
- `/ai-control/assets`
  - 统一素材管理真实看板，读取 `GET /api/ai-control/assets/archive`
  - 第一版聚合 `AIControlCenterCreativeMaterial`、`AIControlCenterVideoWork`、`MediaAsset`、`BusinessAsset`、`wf_artifacts` 五类真源
  - 显示档案总数、关联任务、来源筛选、证据表和记录 ID；有 `taskId` 的条目可跳回任务版本治理
  - 当前新增 `POST /api/ai-control/assets/archive-registration`，只登记已有创作素材或视频作品；带 `taskId` 时通过 `workflow-core.registerArtifact()` 关联 `wf_artifacts`
  - 当前新增 `POST /api/ai-control/assets/archive-registration/upload`，用于用户上传与文件夹逐文件登记的 `multipart/form-data` 大文件入档；文件字段为 `file`，登记字段沿用普通归档接口
  - 归档登记必须传入 `confirmNoGeneration=true`，不触发 RunningHub、蝉镜或其它第三方生成
  - 当前新增 `POST /api/ai-control/assets/archive-registration/preflight`，登记前只读检查标题、内容、资源证据、任务关联和生成边界；可识别受控 storageKey、站内路径、文本素材、外部链接与疑似短链风险
  - 当前“归档登记”面板支持按来源登记：用户上传、用户文件夹、WorkBuddy 生成、第三方模型生成、手动登记；用户上传会写入受控 `material-library` 路径，用户文件夹通过点击按钮弹出浏览器目录选择窗口，并按目录内每个图片/视频素材文件逐条建档，不再把文件夹批次作为素材卡片
  - 用户素材卡片展示 `materialTags`；标签基础来源为素材来源、文件类型和文件名，视频/音频可尝试本地 ASR（当前 Lab 对齐原系统 Whisper-only）补充内容关键词，图片可尝试本地 OCR（RapidOCR ONNX Runtime）提取图片文字关键词
  - 用户上传与用户文件夹逐文件登记不再通过 JSON + base64 传文件，改由 multipart 临时文件入档，后端从文件路径写入受控存储并执行 OCR/ASR
  - 素材复用搜索栏支持素材类型、素材来源、关键词三参数；素材类型固定为 `视频/图片/文字`，素材来源固定为 `抖音/视频号/小红书/公众号/用户上传`。右侧“档案表”只表示聚合表统计，不等同于素材来源
  - WorkBuddy Agent 复用素材时应通过 MCP 工具 `search_ai_control_center_asset_archive` 或同源 REST `GET /api/ai-control/assets/archive` 按类型、来源和关键词检索；页面不提供人工“复用候选篮”
  - Agent 真实选用素材后，通过 MCP 工具 `record_ai_control_center_material_reuse_evidence` 或同源 REST `POST /api/ai-control/assets/reuse-evidence` 把素材引用绑定到 `taskId + stageRunId + actionName`，证据写入任务治理执行事件；该入口只记录证据，不创建素材、不生成内容、不发布
  - 参考变更：`docs/changes/2026-10-02-s2-05-asset-archive-readonly-index.md`
  - 参考变更：`docs/changes/2026-10-02-s2-05-asset-archive-registration.md`
  - 参考变更：`docs/changes/2026-10-02-s2-05-archive-registration-preflight.md`
  - 参考变更：`docs/changes/2026-10-02-s2-05-user-material-ingestion.md`
  - 参考变更：`docs/changes/2026-10-02-s2-05-registration-500-and-local-ocr.md`
  - 参考变更：`docs/changes/2026-10-03-s2-05-material-archive-search.md`
  - 参考变更：`docs/changes/2026-10-03-s2-05-agent-material-search-mcp.md`
  - 参考变更：`docs/changes/2026-10-03-s2-05-large-file-multipart-ingestion.md`
  - 参考变更：`docs/changes/2026-10-03-s2-05-material-reuse-evidence.md`
- 参考变更：`docs/changes/2026-10-02-s2-04-expert-skill-real-source-workbench.md`
- 参考变更：`docs/changes/2026-10-02-s2-04-field-draft-diff-preview.md`
- 参考变更：`docs/changes/2026-10-02-s2-04-server-dry-run-preview.md`
- 参考变更：`docs/changes/2026-10-02-s2-04-write-policy-gate.md`
- 参考变更：`docs/changes/2026-10-02-s2-04-expert-source-mount-apply-script.md`

### 3.3 登录门卫规则

- `/brand-growth`、`/xiaohongshu`、`/douyin`、`/wechat`、`/geo`、`/all-network-growth`、`/paid-acquisition`、`/creator-cooperation`、`/more-features/design`、`/personal-center/*` 默认要求登录
- 未登录时统一跳转 `/login?next=...`
- `/admin` 额外要求管理员身份

## 4. 主要业务板块

### 4.1 品牌增长策略 `/brand-growth`

包含四类主工作区：

- 品牌资料库
  - 品牌背景、IP资料库、产品资料、品牌运营情况、第三方数据、企业知识库
- 收集数据
  - 小红书采集、抖音采集、公众号采集（品牌公众号数据 / 对标作品信息及数据 / 微信搜一搜）、每日热点、飞书绑定
  - 抖音采集当前已补齐达人抓取第一期：`达人搜索抓取`、`达人深度抓取`、`达人结果池`
- 品牌增长报告
  - 品牌增长报告、可视化报告、半年营销规划、营销日历、爆款拆解、选题库、素材库（统一素材库）
- AI 智控中心专区
  - 龙虾日记 / 每周复盘（仅 AI 智控中心 Agent 创建，页面侧支持查看后直接编辑与留言）
  - 策略优化记录（由 AI 智控中心 基于每周复盘生成，页面侧支持查看、编辑、留言与删除）

当前特点：

- 首次进入会通过 `/auth/me` 校正真实品牌上下文
- `品牌增长报告 -> 选题库` 当前已收口为人工与 AI 智控中心 共用的结构化选题库；品牌增长页不再展示“热门找选题”板块，只保留选题沉淀、查看、编辑、删除
- `品牌增长报告 -> 爆款拆解` 当前为 AI 智控中心 独立 HTML 真源板块，支持列表查看、HTML 详情预览、删除与留言协作
- `品牌增长报告 -> 选题库` 当前新增 `匹配爆款模板` 字段，可由 AI 智控中心 写入多个爆款拆解 HTML
- 参考变更：`docs/changes/2026-08-27-brand-growth-topic-library-generalization.md`
- 参考变更：`docs/changes/2026-09-21-ai-control-center-explosive-analysis-and-topic-template-linking.md`
- 报告类任务走后台任务中心
- 知识绑定已进入部分报告运行时
- 营销日历真源已收口在品牌增长策略；内容获客三端当前新增的是同一份营销日历的按平台过滤视图，而不是第二套日历存储
- AI 智控中心 专区与品牌增长共用左侧手风琴导航，龙虾日记和策略优化记录都由 `ai-control-center` 模块提供
- 品牌资料库已在“品牌背景资料”下方新增独立 `IP资料库` 子板块，沉淀 IP 名称、IP 照片、语音、定位、故事、价值观、风格和平台账号链接，并继续沿用品牌主档归档链统一读写
- `IP资料库` 当前新增品牌语音上传：
  - 仅支持 `mp3`
  - 服务端真实校验时长必须 `> 30 秒`
  - 语音文件走受控品牌存储接口读取，不直接暴露裸文件路径
- 抖音采集作品的视频预览缓存现在统一走受控副本链路：网页态继续可读 OSS，缺 OSS 的本地运行态则通过 `collectors/douyin` 受控媒体接口读取本地副本，不再因为没有 OSS 而丢失预览
- 抖音采集表格当前会直接回显视频存储位置；若视频缓存失败或过期，页面会同时保留原作品回看入口，方便判断问题到底出在站内副本还是源作品
- 抖音采集视频文案提取当前默认走本地 ASR 链路：Paraformer 主识别、Whisper 兜底；系统会记录状态更新时间，当本地 ASR 环境未就绪或任务长时间卡住时，会自动收口为可重试失败态
- 抖音视频文案提取当前已统一到同一条串行队列：
  - 手动点击“提取文案”不再直接并发拉起 ASR，而是先标记 `PENDING` 后入队
  - 采集完成后的自动提取与服务重启后的恢复也复用同一条队列
  - 同一条作品在队列内会做 in-flight 去重，降低连续点击和重启恢复叠加时的卡顿
- 固定提交的 Dockerfile 默认 `INSTALL_LOCAL_ASR=0`，并非默认预装；需显式构建参数启用依赖，但这也不代表模型已离线预热。lab 第一批不启用 ASR，离线模型验收待后续完成。
- 小红书 / 抖音收集数据中的“评论数据”卡片现已补齐“从评论提取账号链接”动作，可直接把作品链接补拉为评论数据，再按关键词筛出评论用户并沉淀为目标用户账号链接结果，供 AI 智控中心 与人工验证共用
- `品牌增长策略 -> 收集数据` 当前已把站内已落地的主要采集动作同步开放给 AI 智控中心 / MCP：
  - 小红书：评论数据同步、二级评论读取
  - 抖音：品牌作品、竞品作品、达人结果池沉淀、品牌/竞品账号删除、关键词推荐删除
  - 公众号：品牌账号删除、正文读取、对标统计刷新、搜一搜正文与统计刷新
  - 每日热点：指定日期工作区读取、按平台刷新
- 抖音收集数据当前新增达人抓取第一期：
  - `达人搜索抓取`：按关键词、行业和商业指标抓达人基础资料
  - `达人深度抓取`：按达人标识创建后台异步深抓任务
  - `达人结果池`：回显达人画像、热词、推荐视频和主页视频摘要
- 达人深抓结果当前继续复用 `collectors/douyin` workspace 聚合，不单开第二套数据页
- AI 智控中心 / MCP / Skill 当前已同步暴露：
  - `get_douyin_collection_workspace`
  - `search_douyin_creators`
  - `create_douyin_creator_deep_fetch_tasks`
- 参考变更：`docs/changes/2026-08-15-brand-growth-comment-target-user-ai-control-center-chain.md`
- 参考变更：`docs/changes/2026-08-25-brand-growth-ip-library.md`
- 参考变更：`docs/changes/2026-08-27-ip-voice-material-preview-ai-control-center-git-skill.md`
- 参考变更：`docs/changes/2026-08-27-douyin-collection-preview-and-transcript-retry-ux.md`
- 参考变更：`docs/changes/2026-09-21-douyin-transcript-queue-and-startup-resume-fix.md`
- 参考变更：`docs/changes/2026-09-09-douyin-creator-collection-workbench-phase-1.md`
- 参考变更：`docs/changes/2026-09-15-ai-control-center-brand-growth-collection-tooling-completion.md`

### 4.2 内容获客工作台 `/xiaohongshu`

包含：

- 某书
  - 营销策划方案
    - 当前已切到 AI 智控中心 HTML 营销策划方案列表，支持点击查看 HTML、打开 HTML 和详情留言
  - 营销日历
    - 复用品牌增长报告下的同一份营销日历真源，只展示小红书相关选题，并支持 AI 智控中心 与用户共同创建、编辑
  - 创作素材
  - 每日计划
  - 每周复盘
  - 策略优化记录
  - 作品列表
- 某音/某号
  - 营销策划方案
    - 当前已切到 AI 智控中心 HTML 营销策划方案列表，支持点击查看 HTML、打开 HTML 和详情留言
  - 营销日历
    - 复用品牌增长报告下的同一份营销日历真源，只展示抖音相关选题，并支持 AI 智控中心 与用户共同创建、编辑
  - 数字人
  - RunningHub应用
  - 创作素材
  - 每日计划
  - 每周复盘
  - 策略优化记录
  - 作品列表
- 公众号
  - 营销策划方案
    - 当前为独立左侧菜单，位于 `配置初始化` 上方，承接 AI 智控中心 上传的 HTML 营销策划方案并支持留言协作
  - 营销日历
    - 当前为独立左侧菜单，位于 `营销策划方案` 下方，复用品牌增长报告下的同一份营销日历真源，只展示公众号相关选题，并支持 AI 智控中心 与用户共同创建、编辑
  - 配置初始化
    - 当前支持同一品牌维护多个公众号账号；每个账号可独立配置账号名、AppID、AppSecret、IP 白名单，并可切换默认公众号
  - 创作工作流
    - 当前创建与编辑工作流时都可显式选择公众号账号；选中的账号会写入工作流主记录，并决定后续发布确认和正式发布所走的公众号凭证
  - 发布历史
    - 当前每条发布历史卡片都会标注所属公众号账号，方便区分同品牌下不同公众号的发稿记录
  - 创作素材
  - 每日计划
  - 每周复盘
  - 策略优化记录
  - 作品列表

当前特点：

- `/xiaohongshu` 已改为统一聚合壳层 `ContentAcquisitionWorkspace`
- `/tabs/content-customer` 已直接承接同一个 `ContentAcquisitionWorkspace`，A 层入口不再先落到静态 seed dashboard
- 外层导航只负责一级 / 二级切换，内层继续复用 `XiaohongshuWorkspaceShell`、`DouyinWorkspaceShell`、`WechatWorkspaceShell`
- 某书和公众号已补齐 AI 智控中心 的创作素材、作品列表板块
- AI 智控中心 的创作素材、每日计划、每周复盘、策略优化记录、作品列表现在都支持在内容详情下留言；其中每周复盘和策略优化记录都支持在查看弹窗里直接编辑并保存
- 三个子板块下的 `营销策划方案` 当前已统一收口为 `AIControlCenterMarketingPlan` 真源：
  - 字段固定为 `标题 / HTML 内容 / 创建时间`
  - 页面支持 `查看 HTML / 打开 HTML / 留言 / 删除`
- 三个子板块下当前新增独立 `营销日历` 入口：
  - 某书只展示小红书字段
  - 某音/某号只展示抖音字段
  - 公众号只展示公众号字段
  - 三端都继续写回品牌增长报告下的同一份营销日历真源，不新增第二套日历存储
- 公众号 `配置初始化 / 创作工作流 / 发布历史` 当前已经打通多公众号闭环：
  - 配置初始化可新增、编辑、删除和切换默认公众号
  - 工作流会记录 `accountId / accountName`，发布确认和正式发布按所选公众号取凭证
  - 发布历史列表与详情都会回显公众号名称
- 所有 AI 智控中心 列表与留言列表统一按每页 20 条自动分页
- 参考变更：`docs/changes/2026-08-30-ai-control-center-weekly-review-and-version-history-fix.md`
- 参考变更：`docs/changes/2026-08-30-ai-control-center-strategy-optimization-records.md`
- 参考变更：`docs/changes/2026-09-04-ai-control-center-marketing-plan-html-workspace.md`
- 参考变更：`docs/changes/2026-09-04-content-acquisition-marketing-calendar-platform-views.md`
- 参考变更：`docs/changes/2026-09-04-wechat-multi-official-account-workflow-routing.md`
- 三个子板块下的 `创作素材` 现已统一补齐：
  - 标题
  - 素材标签
  - 素材来源
  - 入库时间
  - 存储位置（本地文件夹地址）
- `创作素材` 当前统一按 `AIControlCenterCreativeMaterial` 真源回显，并由后端直接返回 `materialTags / materialCategory / sourceLabel / storageKey / localFilePath`
- 兼容直达入口 `/douyin`、`/wechat` 仍保留，但不再出现在顶栏主导航
- 参考变更：`docs/changes/2026-08-11-content-acquisition-workbench-and-local-storage.md`
- 参考变更：`docs/changes/2026-08-12-material-management-and-content-acquisition-materials.md`

### 4.3 抖音工作台 `/douyin`

包含：

- 营销策划方案
- 热点找选题
- 选题库
  - 新增 `匹配爆款模板` 字段，支持沉淀多个爆款拆解 HTML
  - 参考变更：`docs/changes/2026-09-21-ai-control-center-explosive-analysis-and-topic-template-linking.md`
- 爆款拆解
  - 位于 `营销日历` 下、`选题库` 上
  - 由 AI 智控中心 创建独立 HTML 拆解记录，支持查看、删除、留言
  - 列表字段：标题、标签、作者、作品链接、视频文案、创建时间
  - 参考变更：`docs/changes/2026-09-21-ai-control-center-explosive-analysis-and-topic-template-linking.md`
- 原创文案
- 二创文案
- 复刻短视频
- AI 生视频（故事板）
- AI 生视频（直接视频）
- 数字人
- 广告预审
- 发布工作流

当前特点：

- 多板块已独立分区
- 采集结果统一沉淀到品牌增长策略 → 品牌增长报告 → 素材库
- 创作侧素材选择已统一切到品牌增长策略 → 品牌增长报告 → 素材库
- 视频与数字人能力已经接入
- RunningHub 工作区继续复用通用应用清单；当前已扩充 MiniMax H3、Seedance、Qwen 字体设计、数字人、电商设计，以及音频裁剪驱动数字人、2K 多图生视频等多类应用示例，并同步暴露给 AI 智控中心 / MCP 的 `runninghub:list_apps`
- RunningHub 应用详情表单当前会按模板自动识别枚举型字段：如果 `fieldData` 带选项列表，而 `fieldValue` 是数字索引（例如“设置比例”），页面会按真实选项标签渲染下拉选择，但提交时仍保留模板原始值，避免把索引误当成纯数字输入框
- RunningHub 上传节点当前新增对象型入参拦截：图片 / 音频 / 视频节点必须走顶层 `localFilePath` 或 `upload.*`，不能再把 `{ localFilePath: ... }`、`{ fileName, contentType, dataBase64 }` 这类对象直接塞进 `fieldValue / fieldData`，避免最终被串成 `[object Object]`
- 复刻短视频已拆成独立板块，创建后先按每 15 秒一段输出拉片分析、角色卡、分镜脚本、角色图、分镜图和一致性质检结果
- 复刻短视频支持第二阶段一键生成分段视频，并通过 `ffmpeg` 自动拼接完整视频
- 广告预审已接入火山引擎 VOD 广告预审链路，支持品牌级默认配置
- 广告预审可直接读取作品中心内的站内视频或带 `videoUrl` 的 HTML 作品，并通过 VOD `UploadMediaByUrl` 回填 `Vid / FileId`
- 发布与视频号桥接能力位于同一工作台体系
- 参考变更：`docs/changes/2026-08-07-douyin-runninghub-minimax-h3-fl2va-app-sync.md`
- 参考变更：`docs/changes/2026-08-17-content-acquisition-runninghub-app-expansion.md`
- 参考变更：`docs/changes/2026-08-31-douyin-runninghub-app-sync-2.md`
- 参考变更：`docs/changes/2026-08-28-runninghub-media-node-object-field-guard.md`
- 当前主入口已并入 `/xiaohongshu` 的内容获客壳层

### 4.4 公众号工作台 `/wechat`

包含：

- 账号配置
- 原创创作工作流（Step 2 文章 / Step 3 生图 / Step 4 HTML / Step 5 发布确认与正式发布）
- HTML 排版生成（4 种排版风格：通用排版 / 极简排版 / 空间艺术排版 / 通知类排版）
- 一键发布
- AI 智控中心 / WorkBuddy 可通过 `manage_wechat_workflow` 直接写入或推进同一条工作流
- `manage_wechat_workflow` 当前支持在创建或更新公众号工作流时传入目标公众号账号，发布历史也会回显对应账号名
- 当前底层已经按 3 层 service 收口：
  - `WechatWorkflowCanonicalService`
  - `WechatWorkflowHtmlRendererService`
  - `WechatWorkflowPublishService`
- 当前主入口已并入 `/xiaohongshu` 的内容获客壳层

### 4.5 设计工作台 `/more-features/design`

包含：

- AI 智控中心 自由生图结果回看

当前特点：

- 用户侧当前不再提供手动创建设计任务入口，也不再暴露 `运营提示词中心`、`生图提示词中心`
- `/more-features/operations-prompt-center` 与 `/more-features/image-prompt-center` 当前都会重定向回 `/more-features/design`
- AI 智控中心 `create_design_work` 在图片模块下默认走自由生图：
  - 不自动套社媒配图模板
  - 不默认植入品牌资料
  - 不强制生成中文排版文案
- AI 智控中心 `create_design_work` 当前除 `referenceImageUrl` / 直接上传外，也支持 `referenceMaterialId`，可直接复用站内创作素材作为参考图
- 图片模块提供参考图时默认 `referenceImageMode=edit_reference`，参考图会发送给生图模型；明确要求忽略参考图、只按文字生成时可传 `prompt_only`
- 参考变更：`docs/changes/2026-08-21-ai-control-center-design-work-reference-material-id.md`
- 参考变更：`docs/changes/2026-09-04-ai-control-center-free-image-design-workspace.md`
- 参考变更：`docs/changes/2026-09-25-ai-control-center-reference-forwarding-and-prompt-diagnostics.md`

### 4.5A GEO获客工作台 `/geo`

包含：

- GEO可见度诊断
- 关键词挖掘
- 网站诊断
- 知识库搭建
- GEO优化方案
- 自媒体内容
- 第三方媒体
- 品牌网站

当前特点：

- `/tabs/geo-customer` 已直接承接同一个 `GeoWorkspaceShell`，A 层入口不再先落到静态 seed dashboard
- `GEO可见度诊断` 继续复用既有 `AIControlCenterGeoVisibilityReport` 真源，只承接 HTML 报告查看与删除
- 其它 7 个 GEO 板块统一收口到 `AIControlCenterGeoContent` 真源
- 一次性内容板块：
  - 关键词挖掘
  - 网站诊断
  - 知识库搭建
  - GEO优化方案
- 多次生成内容板块：
  - 自媒体内容
  - 第三方媒体
  - 品牌网站
- 新板块统一支持：
  - HTML 站内预览
  - 非 HTML 附件受控副本
  - `存储地址` 展示
- `第三方媒体` 当前在原文章列表下方继续补了 `第三方媒体投放`：
  - 后端会把每次从软文街读取到的媒体列表按品牌持续缓存到站内资源库，不再每次重新从零刷新
  - 页面默认读取站内已缓存媒体，并固定按每页 20 条分页
  - `刷新媒体` 会继续同步软文街下一页到缓存库，而不是覆盖旧结果
  - 支持按媒体名称、平台、分类、地区搜索当前品牌已缓存媒体
  - 每行支持 `立即投放`
  - 投放时直接从当前品牌已保存的 `third_party_media` HTML 文章里选择并提交订单
- 非 HTML 附件当前通过受控副本落到 `reports/<brandId>/ai-control-center/geo/...`，在 `local-single-user` 安装态下会映射为本地文件夹地址
- AI 智控中心 / MCP / Skill 当前已同步暴露：
  - `get_ai_control_center_geo_contents`
  - `create_ai_control_center_geo_content`
  - `delete_ai_control_center_geo_content`
  - `get_ai_control_center_third_party_media_delivery_resources`
  - `sync_ai_control_center_third_party_media_delivery_resources`
- 参考变更：`docs/changes/2026-08-12-geo-ai-control-center-content-workspace-expansion.md`
- 参考变更：`docs/changes/2026-08-16-geo-third-party-media-delivery-and-ruanwenjie-integration.md`
- 参考变更：`docs/changes/2026-09-01-ruanwenjie-media-delivery-cache-and-search.md`

### 4.5B 全网获客工作台 `/all-network-growth`

包含：

- 评论获客
- 平台获客

当前特点：

- `/tabs/omni-channel` 已直接承接同一个 `AllNetworkGrowthWorkspaceShell`，A 层入口不再先落到静态 seed dashboard
- 左侧目录当前包含 `评论获客` 与 `平台获客` 两个子板块，继续共用同一工作台
- 评论获客列表统一由 `AIControlCenterCommentLead` 真源承接，字段固定为：
  - 用户名
  - 用户评论
  - 入选理由
  - 用户主页
  - 入选时间
  - 来源平台（小红书 / 抖音）
- 平台获客列表统一由 `AIControlCenterPlatformLead` 真源承接，字段固定为：
  - 名称
  - 业务范围
  - 入选理由
  - 联系方式
  - 地址
  - 入选时间
- 评论获客页面已去掉站内生成表单，只保留列表与分页查看；列表每页固定 20 条
- 页面支持由 AI 智控中心 直接从品牌增长策略中“小红书 / 抖音评论用户结果”生成评论获客名单
- 页面支持由 AI 智控中心 直接写入平台获客名单
- 支持：
  - 评论获客按平台筛选列表
  - 评论获客按每页 20 条分页查看
  - 删除单条评论获客记录
  - 平台获客按每页 20 条分页查看
  - 删除单条平台获客记录
- AI 智控中心 / MCP / Skill 当前已同步暴露：
  - `get_ai_control_center_comment_leads`
  - `create_ai_control_center_comment_leads`
  - `delete_ai_control_center_comment_lead`
  - `get_ai_control_center_platform_leads`
  - `create_ai_control_center_platform_leads`
  - `delete_ai_control_center_platform_lead`
- 评论获客与平台获客真源默认都写入 `all_network_growth` workspace scope，避免继续散落在其它工作台或采集结果里仅做临时验证
- 参考变更：`docs/changes/2026-08-15-all-network-growth-comment-leads.md`
- 参考变更：`docs/changes/2026-08-18-all-network-growth-platform-leads-and-comment-pagination.md`

### 4.5C 投流获客工作台 `/paid-acquisition`

包含：

- 腾讯投流获客

当前特点：

- `/tabs/ad-traffic` 已直接承接同一个 `PaidAcquisitionWorkspaceShell`，A 层入口不再先落到静态 seed dashboard
- 顶栏当前在 `全网获客` 后面新增独立一级入口 `投流获客`
- 左侧目录当前只收口 `腾讯投流获客`
- 腾讯投流获客列表统一由 `AIControlCenterTencentAdLead` 真源承接，字段固定为：
  - 标题
  - 内容
  - 创建时间
  - 留言
- 页面支持：
  - 按每页 20 条分页查看
  - 查看单条内容详情
  - 在详情下留言协作
  - 删除单条腾讯投流获客记录
- AI 智控中心 / MCP / Skill 当前已同步暴露：
  - `get_ai_control_center_tencent_ad_leads`
  - `create_ai_control_center_tencent_ad_lead`
  - `delete_ai_control_center_tencent_ad_lead`
- 腾讯投流获客真源默认写入 `paid_acquisition` workspace scope，避免混入品牌增长或全网获客的既有内容型记录
- 参考变更：`docs/changes/2026-09-04-paid-acquisition-tencent-ad-lead-workspace.md`

### 4.5D 达人合作工作台 `/creator-cooperation`

包含：

- 达人匹配
- 达人跟踪

当前特点：

- `/tabs/daren-collab` 已直接承接同一个 `CreatorCooperationWorkspaceShell`，A 层入口不再先落到静态 seed dashboard
- 顶栏当前在 `投流获客` 右侧新增独立一级入口 `达人合作`
- 左侧目录当前收口两个子板块：
  - `达人匹配`
  - `达人跟踪`
- 达人匹配列表统一由 `AIControlCenterCreatorCooperationMatch` 真源承接，数据来源是抖音达人结果池快照，除达人基础字段外补充：
  - 推荐理由
  - 是否加入合作清单
- 达人跟踪列表统一由 `AIControlCenterCreatorCooperationTracking` 真源承接，按达人维度建档，除达人基础字段外补充：
  - 合作作品数量
- 达人跟踪详情里的合作作品列表统一由 `AIControlCenterCreatorCooperationWork` 真源承接，字段固定为：
  - 标题
  - 链接
  - 播放数
  - 点赞数
  - 收藏数
  - 评论数
  - 转发数
  - 结果评估
  - 再次选择
  - X 天自动更新频率
- 页面支持：
  - 在达人匹配里批量勾选达人
  - 批量删除达人匹配记录
  - 批量把达人加入达人跟踪
  - 在达人跟踪里按达人查看合作作品详情
  - 在达人详情弹窗里新增合作作品、编辑结果评估 / 再次选择 / 更新周期、手动刷新或删除作品
- 合作作品数据按 `X` 天频率自动刷新；当前通过每日调度扫描到期作品并重新抓取抖音作品快照
- AI 智控中心 / MCP / Skill 当前已同步暴露：
  - `get_ai_control_center_creator_match_workspace`
  - `create_ai_control_center_creator_matches`
  - `delete_ai_control_center_creator_matches`
  - `move_ai_control_center_creator_matches_to_tracking`
  - `get_ai_control_center_creator_tracking_workspace`
  - `create_ai_control_center_creator_tracking_records`
  - `delete_ai_control_center_creator_tracking_record`
  - `get_ai_control_center_creator_tracking_works`
  - `create_ai_control_center_creator_tracking_work`
  - `update_ai_control_center_creator_tracking_work`
  - `delete_ai_control_center_creator_tracking_work`
- 达人合作三张真源表统一写入 `creator_cooperation` workspace scope，避免与投流获客或品牌增长抖音采集快照混用
- 参考变更：`docs/changes/2026-09-10-paid-acquisition-creator-cooperation-workspace.md`

### 4.6 个人中心 `/personal-center`

子页面包括：

- `/personal-center`
  - 概览
- `/personal-center/tasks`
  - 任务中心
- `/personal-center/orders`
  - 素材管理
- `/personal-center/works`
  - 作品中心
- `/personal-center/skills`
  - 技能中心
- `/personal-center/third-party-platforms`
  - 第三方接口配置
- `/personal-center/ai-control-center`
  - AI 智控中心 安装中心
  - 当前提供品牌令牌、AI 智控中心 / WorkBuddy / Cursor / Claude Desktop / Codex 的 MCP 安装片段，以及 Skill ZIP / Git 安装说明与正式交付检查清单
  - 参考变更：`docs/changes/2026-09-07-ai-control-center-codex-mcp-installation.md`
  - 参考变更：`docs/changes/2026-09-07-openchatcut-removal.md`
- `/personal-center/version`
  - 版本与升级
- `/personal-center/security`
  - 高级·账号与安全；`local-single-user` 安装态还会在这里展示注册准入规则和本地资料目录设置
- `/personal-center/team`
  - 团队协作
- `/personal-center/invites`
  - 高级·成员邀请（兼容）

当前补充说明：

- 个人中心已新增独立“版本与升级”页，不再要求用户每次手工下载后再判断如何覆盖安装
- `local-single-user` 安装态下，`版本与升级` 继续承接 OSS `latest.json` 检查、安装包下载校验和一键升级
- Docker + PostgreSQL 标准运行态下，个人中心当前也会显示 `版本与升级`：
  - 未配置 `STANDARD_RUNTIME_UPDATE_MANIFEST_URL` 时，页面至少展示仓库内最近 `docs/changes/*.md` 版本记录、可自动识别当前部署分支的通用 Docker 更新命令，以及 Skill/MCP 同步提醒
  - 已配置 `STANDARD_RUNTIME_UPDATE_MANIFEST_URL` 时，再额外展示远端更新清单、是否有新版本、建议命令以及是否需重新导入 `skill-package.zip`
- 个人中心概览卡片与二级导航现在会根据 `system/update/status` 前置显示版本提醒，提示当前是“有新版本 / 升级中 / 需处理 / 已同步”，避免用户必须先点进版本页才知道是否需要更新
- 标准运行态没有远端清单时，页面会退回“仓库更新指引”模式，不再出现空白版本页
- 后端通过 `system/update/*` 统一检查 OSS `latest.json`、识别 `AiOmniOps-local-single-user-win-x64.zip` 与 `.sha256`
- 当前源码运行态允许查看最新发布信息，但会明确提示“不是安装态发布包，暂不支持一键升级”
- 当前安装态会把升级包先落到 `LOCAL_APP_DATA_ROOT/updates`，完成 SHA256 校验后再由独立 updater 停机、替换安装目录、重启本地工作台，并在 API / Web 都通过验活后才标记升级成功；apply-run 阶段执行的 updater 现在会优先从刚下载的目标发布包里提取，而不是继续复用当前安装版本自带脚本；若新版本起不来，updater 会自动回滚到安装前 backup 并恢复上一版本；为避免磁盘空间被历史垃圾目录耗尽，updater 会在安装前先预清理历史遗留的 `downloads/*`、`extract-*`、旧 `apply-runs/*` 临时目录，并在成功后再复清一次，同时回收安装目录旁遗留的 `AiOmniOps-backup-*` 备份目录；安装器日志已统一回到 `LOCAL_APP_DATA_ROOT/logs`，历史遗留的 `%LOCALAPPDATA%\AiOmniOps` 安装/升级痕迹也会一起回收，避免长期占满 C 盘
- Docker 标准运行态当前约定的更新闭环是：
  - 未配远端清单时：用户端仍可先在 `版本与升级` 页面查看最近版本记录，以及“自动识别部署分支 -> `git checkout` -> `git pull --ff-only` -> `docker compose up -d --build --force-recreate server web`，必要时再补 `db-init`”的通用 PowerShell 指令
  - 发布端如果同步更新远端 JSON 清单，用户端还会在 `版本与升级` 页面进一步看到“有新版本”提醒
  - 更新后按页面给出的 Skill / MCP 同步说明完成收口
- 标准运行态的 `版本与升级` 页面当前还会固定展示：
  - 安装前需要的软件与依赖（Git、WSL 2、Docker Desktop）
  - 下载项目代码、复制 `.env`、执行 `docker compose ... up -d --build --force-recreate db-init server web` 的完整安装命令
  - 标准运行态更新命令与 Skill / MCP 同步提醒
- 参考变更：`docs/changes/2026-08-30-ai-control-center-weekly-review-and-version-history-fix.md`
- 参考变更：`docs/changes/2026-08-22-docker-standard-version-update-guide-page.md`
- 参考变更：`docs/changes/2026-08-22-personal-center-version-update-reminder.md`
- 参考变更：`docs/changes/2026-08-28-version-workspace-install-guide-and-readme-refresh.md`
- 参考变更：`docs/changes/2026-09-04-version-workspace-upstream-branch-update-guide-fix.md`
- 参考变更：`docs/changes/2026-09-17-standard-runtime-install-guide-and-ai-control-center-install-sync.md`
- 安装、升级、自启与修复脚本当前统一以 `runtime/local-single-user-runtime.json` 里的 `browserUrl / previewUrl / apiHealthUrl` 作为页面入口与验活真值，不再把 `127.0.0.1:3001` 当成固定页面地址
- `local-single-user` 安装态访问 `/` 时，前端会直接重定向到 `/brand-growth`；安装态不再把官网营销首页作为默认落地页，避免独立发布包里根路由因为首页模板读取失败而直接掉进 `/error`
- `start-local-single-user.cmd` 现在按“健康实例复用 + 启动加锁”工作：如果当前本地工作台已经可用，重复双击只会复用现有实例；如果首次启动仍在拉起中，后续重复启动会等待当前启动完成，而不是并发重建运行时目录
- 当前网站版、源码运行态和 `local-single-user` 安装态统一都要求邀请码注册；注册规则由后端配置接口返回，前端只按接口展示
- 后台用户管理现在可直接维护账号使用期限与模块权限，后端鉴权层会统一拦截“账号到期”和“当前模块无权限”两类访问
- 原 `/personal-center/orders` 已改为 `素材管理`：左侧按 `文本 / 图片 / 语音 / 视频` 四类聚合展示网站上传素材与 AI 智控中心 入库素材
- 素材管理页列表当前只保留紧凑字段：
  - 标题
  - 素材标签
  - 素材来源
  - 入库时间
  - 存储位置（本地文件夹地址）
- 素材管理页当前为 `文本 / 图片 / 语音 / 视频` 四类素材统一提供 `查看` 按钮：
  - 文本：站内文本预览
  - 图片：站内图片预览
  - 语音：站内音频播放器预览
  - 视频：站内视频播放器预览
- `/personal-center/skills` 当前收口为双栏工作台：
  - 左侧按技能 `category` 做可展开 / 收缩分组导航
  - 右侧技能详情与提示词编辑区限制在固定内容框内滚动，不再把整页持续向下撑长
- `/personal-center/third-party-platforms` 当前继续保留统一配置页，但支持平台专属字段：
  - 软文街平台会额外展示 `API Key / 登录账号 / 登录密码`
- 其它平台仍保持原来的品牌共享单字段配置
- 参考变更：`docs/changes/2026-08-16-personal-center-skill-center-grouped-nav-and-shell.md`
- 参考变更：`docs/changes/2026-08-16-geo-third-party-media-delivery-and-ruanwenjie-integration.md`
- 参考变更：`docs/changes/2026-09-03-ruanwenjie-credential-refresh-and-timestamp-fix.md`
  - 存储位置（本地文件夹地址）
- `local-single-user` 安装态下，素材管理页顶部新增“素材库存储设置”：
  - 用户选择的是【素材库】外层根目录
  - 页面顶部当前只保留目录输入框、`选择文件夹`、`恢复默认目录`、`保存本地存储设置`
  - 系统会自动创建 `素材库/文本`、`素材库/图片`、`素材库/语音`、`素材库/视频`
  - 同一目录下还会统一承接 `GEO`、报告、附件、作品副本等其它本地受控内容
  - 网站上传素材会按 `素材库/<分类>/<brandId>/<YYYY>/<YYYY-MM>/<timestamp>-<title>.<ext>` 规则落盘
  - 其它非素材库类受控副本会按 `站内存储/<storageKey>` 规则落盘
  - AI 智控中心 上传到网站的素材不强制进入 `素材库`，但仍会统一进入素材管理四分类列表
- `local-single-user` 下如果品牌资料库 / 产品资料库对应的 SQLite 暂时不可用，后端不再回退到临时 mock 数据，避免出现“页面看起来保存成功、重启后消失”的假持久化
- `/personal-center/security` 现在会显示当前资料目录、下次启动将使用的资料目录、`launcher-settings.json` 路径，以及数据库 / 存储 / 日志等本地子目录；保存后需重启本地工作台生效
- 参考变更：`docs/changes/2026-07-28-personal-center-version-update.md`
- 参考变更：`docs/changes/2026-08-10-local-register-invite-and-user-access-control.md`
- 参考变更：`docs/changes/2026-08-12-material-management-and-content-acquisition-materials.md`
- 参考变更：`docs/changes/2026-08-15-local-material-library-and-ai-control-center-material-sync.md`
- 参考变更：`docs/changes/2026-08-04-local-single-user-update-health-check-and-auto-rollback.md`
- 参考变更：`docs/changes/2026-08-07-local-single-user-install-backup-auto-cleanup.md`
- 参考变更：`docs/changes/2026-08-07-local-single-user-update-artifact-auto-cleanup.md`
- 参考变更：`docs/changes/2026-08-07-local-single-user-dual-appdata-cleanup-fix.md`
- 参考变更：`docs/changes/2026-08-07-local-single-user-historical-update-artifacts-cleanup-fix.md`
- 参考变更：`docs/changes/2026-08-08-local-single-user-updater-preflight-cleanup-fix.md`
- 参考变更：`docs/changes/2026-08-08-local-single-user-apply-run-updater-source-fix.md`
- 参考变更：`docs/changes/2026-08-19-local-single-user-runtime-browser-url-port-fallback-fix.md`
- 参考变更：`docs/changes/2026-08-21-local-single-user-root-route-redirect-fix.md`
- 参考变更：`docs/changes/2026-08-04-local-single-user-repeated-start-reuse-and-lock.md`
- 参考变更：`docs/changes/2026-08-06-local-single-user-upgrade-runtime-verification-tightening.md`

### 4.7 后台管理台 `/admin`

当前后台已包含的主栏目：

- 用户管理
- 接口供应商
- 计费规则
- 技能中心
- 模块注册中心
- 能力包总览
- 能力包与模块绑定
- 能力包与知识库绑定
- 能力包与技能绑定
- 知识库管理
- 模型用量

当前补充说明：

- 用户管理已扩展账号使用期限与模块权限配置，支持直接在后台按用户收口到期时间和主模块可用范围
- 上述限制不只是前端隐藏，后端鉴权层会结合登录态、请求路径与账号配置做统一拦截

## 5. 前端服务层

主要 service 文件：

- `services/auth.ts`
- `services/auth-session.ts`
- `services/brand-growth.ts`
- `services/collectors.ts`
- `services/daily-hotspots.ts`
- `services/reports.ts`
- `services/works.ts`
- `services/publishing.ts`
- `services/design.ts`
- `services/personal-center.ts`
- `services/ai-control-center.ts`
- `services/admin.ts`

规则：

- service 只做请求层
- 页面或工作区壳层负责业务编排
- 当前品牌、权限和 Provider 选择必须由后端结果校正

## 6. 后端模块地图

### 6.1 核心业务模块

- `auth`
- `brands`
- `collectors`
- `reports`
- `works`
- `tasks`
- `publishing`
- `media`
- `orders`
- `local-runtime`
  - `local-single-user` 安装态资料目录设置、注册准入信息与 launcher 配置读写入口
- `system-update`
  - OSS `latest.json` 检查、本地升级包下载校验、独立 updater 启动入口
- `third-party-platforms`
- `user-skills`
- `ai-control-center`
  - 安装中心、MCP 目录、龙虾日记
- `feedback`
- `scheduler`
- `workflow-core`
  - 任务治理写入与读取真源；当前提供任务列表、任务治理聚合详情、执行事件列表、版本使用列表等读接口，并已由 `/ai-control/task-governance` 真实前端读取。
  - 当前 `governance-detail` 已可提取 `ontology_preflight_evidence` 与 `ontology_node_evidence`，分别对应执行前路线图留证和节点级受控推进留证。
- `ontology-mapper`
  - Ontology 只读映射、Outbox、对账与 Pipeline 消费；当前同时提供 `/api/ontology-mapper/*` 与 `/api/ai-control/ontology-mapper/*` 两套路由口径，避免 AI 智控中心前端 Outbox 看板路径不一致。
- 参考变更：`docs/changes/2026-10-02-s2-01-workflow-governance-read-apis.md`
- 参考变更：`docs/changes/2026-10-02-s2-02-task-governance-workspace.md`
- `/ai-control/apis` 当前复用 `third-party-platforms` 配置与 `works` 模块下的 RunningHub/蝉镜只读接口，展示 Key、能力、参数、封面、声音和最近作品证据。
- 参考变更：`docs/changes/2026-10-02-s2-03-gateway-evidence-panel.md`

### 6.2 后台治理模块

- `admin/api-providers`
- `admin/billing-rules`
- `admin/knowledge-bases`
- `admin/model-usage`
- `admin/module-definitions`
- `admin/skill-packages`
- `admin/skill-package-modules`
- `admin/skill-package-knowledge-spaces`
- `admin/skill-package-skills`
- `admin/skills-prompts`
- `admin/users-admin`

## 7. 当前主链路

### 7.1 品牌增长主链路

1. 登录并进入品牌工作区
2. 维护品牌资料与企业知识库
3. 收集小红书 / 抖音 / 热点数据
4. 生成品牌增长报告 / 半年营销规划 / 营销日历
5. 将结果继续送往小红书、抖音、公众号、设计工作台
6. 在个人中心查看任务、素材管理、作品

### 7.2 AI 智控中心 链路

1. 在个人中心 AI 智控中心 页面生成正式安装令牌
2. 使用 MCP 地址完成客户端接入
3. Skill 安装支持两种方式二选一：
   - 复制 GitHub Skill 目录链接和一句安装指令，直接发给 AI 智控中心 自行安装
   - 下载 Skill ZIP 后手动导入客户端
4. 通过受控 API / MCP 读取当前品牌上下文与能力
5. 在用户权限范围内触发查询、生成和执行动作

## 8. 当前关键技术边界

- 官网首页与登录页已分离
- 前后台技能、Provider、知识绑定逐步收口到治理后台
- 长耗时生成任务统一走任务中心
- 正式资源以 OSS 为真源，本地仅允许受控回退
- `docs/project_planning/` 不代表当前实现

## 9. 相关文档

- `docs/site-map-mermaid.md`
- `docs/engineering-standards.md`
- `docs/database-archive.md`
- `docs/generated-content-storage-standards.md`
- `docs/ai-control-center/README.md`
- `docs/changes/2026-06-13-docs-baseline-cleanup.md`



## 2026-10-22 素材发现与复用索引（357）

联查采集原作与素材档案，类型含音频、MIME优先且解码另验；产品/片段/版本/权益按品牌追加不可变索引修订。先筛选后分页，不自动全量入库；深度作品拆解留在内容获客。原MCP查询扩展与manage_brand_library维护共用服务，未知授权不推断。详见[素材索引契约](material-archive-index.md)。


## 2026-10-23 / 358 素材预览修复

内容获客 → 抖音/视频号、小红书、公众号 → 创作素材：既有入口增加鉴权媒体预览、HTML文档/纯文字区分及缺失提示；没有新增导航或拆解流程。 见[变更与验证](changes/2026-10-23-creative-material-preview.md)。


## 2026-10-23 / 359 安装客户端更新

共用安装区六选项改为AI智控中心、WorkBuddy、豆包工作、千问办公、Codex、MCP地址；豆包表单与千问JSON分别展示，旧连接不撤销。客户端模板依据用户截图/官方协议，不能凭模板生成称原生客户端已接通；复制、脱敏、当前品牌与安装包需同源核验。见[变更与验证](changes/2026-10-23-openclaw-client-guides.md)。

## 2026-10-23 营销日历结构化

独立内容、完整当天列表、资料就绪、CAS/幂等/修订与真实交付引用；旧正文保留，保存不生成或发布。见[变更与接口契约](changes/2026-10-23-marketing-calendar-content.md)。

## 2026-10-24 巨量广告工作区

腾讯右侧增加巨量六工作区，品牌账户/分页快照/诊断/计划与ocean_* MCP动作共用服务；保存不执行广告，复用BusinessAsset无迁移。见[变更及接口契约](changes/2026-10-24-ocean-ads-workspace.md)。

## 402 电商执行与修订

电商新增第三子栏目 `/tabs/ecommerce/operate` 店铺运营工作台：广告、价格与促销、发布、商品搜索、服务、数据核查。策略按当前计划/动作版本带入；执行页每指标周期设置；创作页直接编辑和意见修改。参考[402](changes/2026-10-27-commerce-operator-revision.md)。


404增量：电商目标按历史复算，独立广告投流/仅计广告费与ROI，逐指标历史/窗口状态，商品四步利益型创作。见[404变更](changes/2026-10-27-commerce-history-and-benefit-copy.md)。
