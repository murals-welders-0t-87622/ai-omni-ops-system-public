# AI全域运营系统文档中心

2026-10-27：素材与商品关联减少重复计算及重复查询；见[变更与验收](changes/2026-10-27-material-product-lookup.md)。

2026-10-27：品牌隔离测试修订与专家资料挂载隔离冲突，见[系统检查](changes/2026-10-27-system-audit.md)。

2026-10-27：素材索引提前排除既有逻辑不认作素材的8类记录，见[记录](changes/2026-10-27-material-kind-prefilter.md)。

2026-10-27：素材检索减少采集原始回执重复传输，已部署独立Lab；数据对照与限制见[记录](changes/2026-10-27-material-rawfields-reduction.md)。

2026-10-27：素材候选标签按返回页计算，已在独立Lab部署，验证与限制见[变更记录](changes/2026-10-27-material-candidate-lazy-evaluation.md)。

403：取消独立运营台；目标可改并调用本机Codex重排；七类策略/三档具体费用与经营全景、商品、推广、用户看板。见[变更与契约](changes/2026-10-27-commerce-planning-dashboard.md)。

400：电商财务目标→驱动指标→行动资源排期→完整窗口数据跟踪及未达标建议，兼容旧报告安全排版/历史；第三方采集仍须授权连接器回写。见[财务目标与跟踪](changes/2026-10-26-commerce-financial-scorecard.md)。

399纠正：电商三层按整页切换，旧方案report/actions直接可见，六类数据仅总览，方案/报表选择分开；不以新增字段或选中态代替业务内容验收。见[电商兼容修复](changes/2026-10-26-commerce-view-compatibility.md)。


398：电商既有两入口补主图/商品文案与品牌生意→战略/策略/执行→同口径结果对照；旧数据/版本和23技能架构保持。见[电商增长链路](changes/2026-10-26-commerce-growth-loop.md)。


391：一级菜单统一显示公域获客，原五获客子栏目及路由不变；仅Lab web更新，自动化话题另存候选建议。见[公域菜单改名](changes/2026-10-26-public-acquisition-label.md)。

[此段涉及具体客户资料，公开版本已省略。]

387：私域从品牌生意模式承接，新增businessModel/经营路线与策略关联（契约1.5.0）；先看经营依据与本周行动，再看策略/逐日安排。技能4.0源21文件、三副本63文件/下载包一致；具体经营、状态与来源分层，旧数据和其他板块兼容保留。见[生意模式与私域承接](changes/2026-10-26-business-model-private-operations.md)。

385：私域去掉投流目标，战略默认前置，按阶段顺序→具体商品活动单→按日动作→四指标/实际组织；新增stagePlan/activityPlan，旧数据与其他投流模块兼容保留。技能3.3强制具体参数、来源推导及结构校验，安装/代码/原生业务/实际增长分别验收。见[阶段与活动单](changes/2026-10-26-private-stage-and-activity.md)。

384：私域默认“今日经营”，按进店/转化/客单/复购/投流→行动→负责人/时间→执行→目标实际组织；老板可按指标进入原计划和任务。来源未知不造达标，日数据不拿历史累计替代，AI按钮为复制委托。见[老板经营台与契约](changes/2026-10-26-private-owner-cockpit.md)。

[此段涉及具体客户资料，公开版本已省略。]

[此段涉及具体客户资料，公开版本已省略。]

[此段涉及具体客户资料，公开版本已省略。]


378新增私域复购/私域运营，七区与有赞店铺独立配置；战略→策略→执行、会员权益、场景需求与有证据标签/分群/旅程/复盘，客户主档复用AI销售。HTTP/MCP十动作同源，双权限、品牌隔离、CAS/幂等/历史；当前有赞只读，执行状态以真实回执为准。见[私域运营契约](private-operations-workspace.md)与[变更](changes/2026-10-25-youzan-private-operations.md)。

376新增私域复购/AI销售七区及独立3Chat配置，客户/商机/服务/订单/复购/策略/复盘与同源HTTP/MCP、独立权限、分页/不可变版本。实际查询/发送在WorkBuddy；配置候选不等已部署。见[AI销售工作区](ai-sales-workspace.md)与[变更](changes/2026-10-25-ai-sales-workspace.md)。


375归档验收：文件上传成功、知识正文可读、embedding可用、来源真实性、业务执行分别验证；必须读回完整正文/来源覆盖，不能以HTTP成功或文件计数代替。真实HTML不得在读回时被模板覆盖。见[品牌归档契约](brand-document-import.md)。


374新增[电商工作区与契约](commerce-workspaces.md)、[导航/电商变更](changes/2026-10-25-commerce-workspaces.md)。


370：新增自用seedance2.0 Mini多参（2089757422163419137），保留原24项，现25项；20实时字段、页面/MCP/下载包及旧目录通过，只Lab server更新。见[多参应用接入](changes/2026-10-25-runninghub-mini-multi-reference.md)。

369：新增Seedance Mini图生视频，RunningHub共24应用；参数请求超时/旧响应保护及字段类型、真实数值枚举修正。24项只读参数接口87—206ms全部成功；历史长等待与生成未知分开。见[接入与性能检查](changes/2026-10-25-runninghub-seedance-mini-performance.md)。

368：RunningHub目录独立加载，作品列表先返回保存快照；状态查询及历史归档按品牌单飞后台补偿，查询有超时，旧品牌延迟结果不落入当前页面。入口/权限/生成参数不变。见[加载阻塞修复](changes/2026-10-25-runninghub-workspace-loading.md)。

366纠正MCP摘要缺项误判：同一现有连接204工具/7个ocean动作，豆包原生工作区只读成功。方法包升级1.0.1并实际重读，13离线测试及7文件hash匹配；真实广告数据写入与原生伙伴注册仍待验。未改应用运行或授权。见[核查与方法修正](changes/2026-10-24-ocean-mcp-summary-false-block.md)。

- [巨量广告运营官对话模式](changes/2026-10-24-doubao-conversation-operator.md)：专用角色会话，不等于原生伙伴卡片注册。



354按用户纠正撤掉353制作分项/短期限/撤销历史界面；完整品牌运营连接默认包含图片、语音、RunningHub，原令牌直接读204工具。旧JSON/历史保留兼容，品牌隔离和连接生命周期不变。69策略、9API、29模块/42写回、182页面、6行为/8布局、26运行hash通过；仍有五顶部委托未接、五导出404，真实供应商/独立专家待验。见[制作直接使用及复查](changes/2026-10-22-production-direct-use-and-functional-recheck.md)。

会话353：原OpenClaw安装区新增单连接图片/语音/RunningHub制作授权、期限/撤销/历史；旧14/24/203不自动扩权。MCP列表与调用精确控动作、轮换保留授权，蝉镜并发刷新和失败提示完善。55策略、15API/MCP、7页面/4宽及26运行hash通过；无真实生成/供应商调用。见[制作授权变更](changes/2026-10-22-brand-production-authorization.md)。

本轮入口：[全品牌巡检及共用入口修复](changes/2026-10-22-all-brand-system-audit.md)。测试范围与未完成的导出/启动/外部服务分开记录。

会话350恢复品牌MCP业务范围：完整目录244中明确203项品牌运营工具，41项发布/付费生成/人工审阅及平台个人配置不自动开放；manage_*子动作同策略限制。旧read14/work24不静默扩展，品牌Owner/Admin可单连接确认升级，保留令牌/MCP名称/配置并追加授权修订；页面显示真实数量和连接选择。指定用户连接已14→203并用原环境引用令牌真实HTTP回验，未执行模型或发布。见[品牌运营授权](changes/2026-10-22-brand-operations-grant.md)。

会话348：品牌第三方接口凭据保存增加提交处持久反馈、可关闭浮动提醒与保存中状态；按当前平台显示，编辑清旧提示，成功后清空输入。PATCH成功与列表刷新失败分别提示，保存成功不等于供应商连通。仅页面反馈，不改凭据/授权/模型调用。见[保存反馈](changes/2026-10-22-brand-api-key-save-feedback.md)。

会话347更正346的安装区实现：直接提取原OpenClaw安装区为共享组件，平台与品牌后台渲染同一界面；保留正式令牌查看/隐藏、6类客户端片段、Git/ZIP和原指南。安装页移除高级设置；模型/Skill/知识版本数据与独立历史页保留，不是安装步骤。品牌适配只操作当前连接，新连接30天work范围在确认中明确，旧连接不扩权、不全品牌重置；原连接/其他品牌不受影响。Codex仍为环境变量引用，实际安全绑定和客户端执行尚未接通。见[原版安装区复用](changes/2026-10-22-original-openclaw-shared-installation.md)。

会话346按用户确认恢复品牌智控原版操作：卡片式首页；接口与连接器配置内“第三方接口配置 / OpenClaw 安装”双Tab，版本组合放高级设置；知识/成员/品牌技能移出主导航，旧数据与业务页保留。品牌素材位于/brand-admin/assets，原共享素材入口按当前权限返回，平台管理边界不放宽。见[使用回归修复](changes/2026-10-22-brand-control-familiar-workflow.md)。

会话345：用户明确授权提交并推送。目标为既有Lab origin及功能分支；整理633cd305之后积累的Ontology/采集修正、作品拆解、经营驾驶舱、多账号/品牌后台、独立连接与BYOK版本配置，保留其接口/schema/迁移/Skill及开发说明依赖。继承Aliyun workflow移出可执行目录；runtime、凭据、数据库与测试运行产物排除。此操作是源码归档，不部署云端、不合并main；真实客户端/模型/专家未验收范围沿用344。见[提交记录](changes/2026-10-21-lab-milestone-git-publish.md)。

品牌独立模型与执行配置：用户选择BYOK；`/brand-admin/models`设置本品牌服务凭据，`/brand-admin/execution`保存/发布/回退版本，`/brand-admin/knowledge`复用品牌知识入口。新增凭据密文列、列表不回显Key、空保存保留/显式清除留空墓碑防旧值复活。只读MCP返回冻结组合；实际客户端授权/加载与专家执行未完成。见[变更](changes/2026-10-21-brand-models-and-execution-profile.md)。

[此段涉及具体客户资料，公开版本已省略。]

品牌主账号后台规则：注册即本品牌OWNER/完整品牌权限，进入独立品牌智控后台；平台全局管理另行授权。品牌设置/团队与权限/品牌Skill/素材复用既有API，加入他牌协作不隐藏原OWNER品牌。见[会话341变更](changes/2026-10-21-brand-owner-admin-workspace.md)。

[此段涉及具体客户资料，公开版本已省略。]


多账号并行：真实登录/邀请码注册、标签页独立会话、账号与品牌入口、标准Lab严格权限及当前品牌读写；共享演示数据不再充当经营事实。已通过双账号/越权/过期测试，新品牌WorkBuddy授权仍需接入。详见[会话338变更](changes/2026-10-21-multi-account-brand-isolation.md)。


本机WorkBuddy增长执行器：受控后台启动、当前品牌/计划MCP代理、真实成员与提交回执、90秒心跳；不自动生效/采纳/发布/支出。详见[会话336变更](changes/2026-10-21-workbuddy-growth-executor.md)。实际联调结论见该文档与总控收尾记录。


经营驾驶舱与持续增长计划：六时间/六业务真实统计，结构化计划/检查/建议/不可变版本、来源上报与独立Lab只读调度，12项同源MCP；专业执行采用WorkBuddy拉取队列，未实现反向唤起。详见[会话335变更](changes/2026-10-21-growth-cockpit-and-plans.md)。


作品拆解追加：WorkBuddy授权范围内自动挑选（候选去重）、采集作品页码跳转、取消后列表移除并终止提交。详见[会话332变更](changes/2026-10-21-work-analysis-selection-pagination-cancel.md)。


- [2026-10-21 三平台作品拆解与专属专家团](changes/2026-10-21-content-work-analysis.md)：页面、双表、10项MCP、三套字典、17项五元素、专业方法与验证边界。

## 独立 Ontology lab

- [运行隔离、初始化与 MCP/Skill 边界](ontology-lab-runtime.md)
- [权限与秘密规则](ai-agent-access-and-secrets-policy.md)
- [2026-09-26 第一批启动保护变更](changes/2026-09-26-ontology-lab-isolation.md)
- [2026-09-26 部署与运行验收](changes/2026-09-26-ontology-lab-runtime-verification.md)
- [2026-10-02 S2-01 workflow 任务治理读接口](changes/2026-10-02-s2-01-workflow-governance-read-apis.md)
- [2026-10-02 S2-02 任务治理真实前端](changes/2026-10-02-s2-02-task-governance-workspace.md)
- [2026-10-02 S2-03 接口能力网关证据面板](changes/2026-10-02-s2-03-gateway-evidence-panel.md)
- [2026-10-02 S2-04 专家与 Skill 真源工作台](changes/2026-10-02-s2-04-expert-skill-real-source-workbench.md)
- [2026-10-02 S2-04 字段草稿与本地 Diff 预览](changes/2026-10-02-s2-04-field-draft-diff-preview.md)
- [2026-10-02 S2-04 服务端 dry-run 预览](changes/2026-10-02-s2-04-server-dry-run-preview.md)
- [2026-10-02 S2-04 写入策略闸](changes/2026-10-02-s2-04-write-policy-gate.md)
- [2026-10-02 S2-04 CRLF 兼容写入策略](changes/2026-10-02-s2-04-crlf-aware-write-policy.md)
- [2026-10-02 S2-04 保存确认弹窗](changes/2026-10-02-s2-04-save-confirmation-modal.md)
- [2026-10-02 S2-04 可写挂载预检](changes/2026-10-02-s2-04-writable-mount-preflight.md)
- [2026-10-02 S2-04 Markdown 结构化合并保护](changes/2026-10-02-s2-04-markdown-structural-merge.md)
- [2026-10-02 S2-04 专家字段语义解析修复](changes/2026-10-02-s2-04-expert-field-semantic-parser.md)
- [2026-10-02 S2-04 专家源设置与读写保护页收口](changes/2026-10-02-s2-04-expert-source-settings-panel.md)
- [2026-10-02 S2-04 WorkBuddy 本机专家源只读接入](changes/2026-10-02-s2-04-workbuddy-local-source-readonly.md)
- [2026-10-02 S2-04 本机快照历史](changes/2026-10-02-s2-04-local-snapshot-history.md)
- [2026-10-02 S2-04 本机快照恢复预览](changes/2026-10-02-s2-04-local-snapshot-restore-preview.md)
- [2026-10-02 S2-04 本机快照恢复写回确认闸](changes/2026-10-02-s2-04-local-snapshot-restore-gate.md)
- [2026-10-02 S2-04 WorkBuddy 专家源挂载向导](changes/2026-10-02-s2-04-expert-source-mount-guide.md)
- [2026-10-02 S2-04 WorkBuddy 专家源挂载应用脚本](changes/2026-10-02-s2-04-expert-source-mount-apply-script.md)
- [2026-10-02 S2-04 专家/Skill 工作台性能收敛](changes/2026-10-02-s2-04-expert-workbench-performance.md)
- [2026-10-02 S2-04 树接口分支化与文件节点模式](changes/2026-10-02-s2-04-tree-section-files-only.md)
- [2026-10-02 S2-04 保存写回确认闸](changes/2026-10-02-s2-04-save-writeback-gate.md)
- [2026-10-02 S2-04 写后校验与回滚预案](changes/2026-10-02-s2-04-post-write-verification-plan.md)
- [2026-10-02 S2-04 真实写回授权前检查清单](changes/2026-10-02-s2-04-writeback-readiness-checklist.md)
- [2026-10-02 S2-04 本机快照写盘执行器草案](changes/2026-10-02-s2-04-local-writeback-executor-plan.md)
- [2026-10-02 S2-04 写盘执行器只读模拟报告](changes/2026-10-02-s2-04-writeback-executor-simulation.md)
- [2026-10-02 S2-04 写盘执行器只读合同测试](changes/2026-10-02-s2-04-writeback-executor-contract-tests.md)
- [2026-10-02 S2-05 统一素材与作品归档只读索引](changes/2026-10-02-s2-05-asset-archive-readonly-index.md)
- [2026-10-02 S2-05 作品归档登记最小写入链路](changes/2026-10-02-s2-05-asset-archive-registration.md)
- [2026-10-02 S2-05 归档登记证据预检](changes/2026-10-02-s2-05-archive-registration-preflight.md)
- [2026-10-02 S2-05 用户素材接入入口](changes/2026-10-02-s2-05-user-material-ingestion.md)
- [2026-10-02 S2-05 登记500修复与本地OCR接入](changes/2026-10-02-s2-05-registration-500-and-local-ocr.md)
- [2026-10-03 S2-05 素材复用搜索](changes/2026-10-03-s2-05-material-archive-search.md)
- [2026-10-03 S2-05 Agent 素材检索 MCP 通路](changes/2026-10-03-s2-05-agent-material-search-mcp.md)
- [2026-10-03 S2-05 Agent 素材复用证据](changes/2026-10-03-s2-05-material-reuse-evidence.md)
- [2026-10-03 S2-05 Lab 可选视频 ASR 运行时](changes/2026-10-03-s2-05-lab-optional-video-asr-runtime.md)
- [2026-10-03 S2-05 大文件素材 multipart 入档](changes/2026-10-03-s2-05-large-file-multipart-ingestion.md)
- [2026-10-03 S2-05 素材档案固定回归脚本](changes/2026-10-03-s2-05-asset-archive-regression-script.md)
- [2026-10-07 S2-05 统一素材预览、打开链与抖音视频预览收口](changes/2026-10-07-s2-05-archive-preview-opening-fix.md)
- [2026-10-07 S2-05 统一素材分享页识别与采集视频预览补漏](changes/2026-10-07-s2-05-archive-share-link-and-preview-followup.md)
- [2026-10-08 S2-05 抖音本地副本预览收口与素材内容标签升级](changes/2026-10-08-s2-05-douyin-cache-retry-and-content-tags.md)
- [2026-10-03 S3 WorkBuddy Lab 连接器复验](changes/2026-10-03-s3-workbuddy-lab-connector-revalidation.md)
- [2026-10-03 S3 素材复用意图路由修复](changes/2026-10-03-s3-material-reuse-routing.md)
- [2026-10-03 S3-02 Ontology 编排中心静态原型](changes/2026-10-03-s3-02-ontology-orchestration-prototype.md)
- [2026-10-03 S3-02 Ontology 编排中心草稿保存](changes/2026-10-03-s3-02-ontology-orchestration-draft-storage.md)
- [2026-10-03 S3-02 Ontology 编排中心真实元素库](changes/2026-10-03-s3-02-ontology-real-element-library.md)
- [2026-10-03 S3-02 Ontology 编排中心节点引用绑定](changes/2026-10-03-s3-02-ontology-node-reference-binding.md)
- [2026-10-03 S3-02F Ontology 编排中心节点可视化编辑](changes/2026-10-03-s3-02-ontology-node-visual-editing.md)
- [2026-10-03 S3-02G Ontology 编排中心连线规则与确认闸](changes/2026-10-03-s3-02-ontology-edge-rule-editing.md)
- [2026-10-03 S3-02H Ontology 编排中心发布预览](changes/2026-10-03-s3-02-ontology-publish-preview.md)
- [2026-10-03 S3-02I Ontology 编排中心正式发布契约](changes/2026-10-03-s3-02-ontology-publish-contract.md)
- [2026-10-03 S3-02J Ontology published_contract MCP 读取](changes/2026-10-03-s3-02-ontology-published-contract-mcp.md)
- [2026-10-03 S3-02K Ontology 执行前路由计划 MCP](changes/2026-10-03-s3-02-ontology-execution-plan-mcp.md)
- [2026-10-03 S3-02L Ontology 执行前计划确认留证](changes/2026-10-03-s3-02-ontology-preflight-evidence.md)
- [2026-10-03 S3-02M 任务治理路线图证据展示](changes/2026-10-03-s3-02m-task-governance-ontology-preflight-view.md)
- [2026-10-03 S3-02N Ontology 节点受控推进](changes/2026-10-03-s3-02n-ontology-controlled-node-execution.md)
- [2026-10-03 S3-02N Ontology 页面受控执行入口](changes/2026-10-03-s3-02n-ontology-controlled-execution-visibility.md)
- [2026-10-03 S3-02O Ontology 项目化画布入口](changes/2026-10-03-s3-02o-ontology-project-canvas-entry.md)
- [2026-10-03 S3-02P Ontology 项目创建与草稿派生](changes/2026-10-03-s3-02p-ontology-project-create-and-fork.md)
- [2026-10-03 S3-02Q Ontology 项目节点库](changes/2026-10-03-s3-02q-ontology-project-node-library.md)
- [2026-10-03 S3-02R Ontology 视频画布式视图](changes/2026-10-03-s3-02r-ontology-video-canvas-view.md)
- [2026-10-03 S3-02S Ontology 环节后添加菜单](changes/2026-10-03-s3-02s-ontology-step-plus-menu.md)
- [2026-10-03 S3-02T Ontology 画布交互归位](changes/2026-10-03-s3-02t-ontology-canvas-interaction-realignment.md)
- [2026-10-04 S3-02U Ontology 新增环节类型选择](changes/2026-10-04-s3-02u-ontology-typed-node-add.md)
- [2026-10-04 S3-02V Ontology 自由连线](changes/2026-10-04-s3-02v-ontology-free-edge-connection.md)
- [2026-10-04 S3-02W Ontology 专家源 Diff 预览](changes/2026-10-04-s3-02w-ontology-expert-source-diff-preview.md)
- [2026-10-04 S3-02X WorkBuddy 真实专家源预览联通](changes/2026-10-04-s3-02x-workbuddy-real-source-preview-runtime.md)
- [2026-10-04 S3-02Y Ontology 专家源写回确认闸](changes/2026-10-04-s3-02y-ontology-writeback-confirmation-gate.md)
- [2026-10-04 S3-02Z Ontology 启动前读取规则](changes/2026-10-04-s3-02z-ontology-startup-read-rule.md)
- [2026-10-04 S3-02ZB Ontology 受控写回执行器](changes/2026-10-04-s3-02zb-ontology-controlled-writeback-executor.md)
- [2026-10-04 S3-02ZC 五元素字典 seed 与节点结构化引用](changes/2026-10-04-s3-02zc-dictionary-seed-and-node-refs.md)
- [2026-10-04 S3-02ZC-4 五元素字典页与发布快照](changes/2026-10-04-s3-02zc-dictionary-page-and-binding-snapshot.md)
- [2026-10-04 S3-02ZC-5 active_seed 运行态与正式契约闭环验收](changes/2026-10-04-s3-02zc-active-seed-runtime-and-contract-validation.md)
- [2026-10-04 S3-02ZD 字典 ID 迁移草稿验证](changes/2026-10-04-s3-02zd-dictionary-id-migration-draft.md)
- [2026-10-04 S3-02ZD 字典迁移草稿连线条件补齐](changes/2026-10-04-s3-02zd-migration-draft-edge-conditions.md)
- [2026-10-04 S3-02ZD 已发布 Ontology 画布本地拖拽](changes/2026-10-04-s3-02zd-published-canvas-local-drag.md)
- [2026-10-04 S3-02ZE Ontology AI 草案生成链路](changes/2026-10-04-s3-02ze-ai-draft-generation.md)
- [2026-10-04 S3-02ZF design creator 完整闭环验收](changes/2026-10-04-s3-02zf-design-creator-fullflow-validation.md)
- [2026-10-06 S3-02ZG MCP 全量清单并入 Ontology 候选全集](changes/2026-10-06-s3-02zg-mcp-full-catalog-and-ontology-atlas-expansion.md)
- [2026-10-06 S3-02ZH Skill 包文档真源补齐与 Ontology 全量清单升级](changes/2026-10-06-s3-02zh-skill-package-docs-upgrade.md)
- [2026-10-06 S3-02ZJ AI 草案切换到 418 项候选全集](changes/2026-10-06-s3-02zj-ai-draft-full-candidate-catalog.md)
- [2026-10-06 S3-02ZK Ontology 字典收口为单一候选全集](changes/2026-10-06-s3-02zk-single-ontology-catalog.md)
- [2026-10-06 S3-02ZL 编排项目目标全集显示与项目删除按钮](changes/2026-10-06-s3-02zl-project-target-full-list-and-delete.md)
- [2026-10-06 S3-02ZM Ontology AI 草案供应商自动兜底](changes/2026-10-06-s3-02zm-ai-draft-provider-fallback.md)
- [2026-10-06 S3-02ZN 发布后专家源 Diff 路径修正](changes/2026-10-06-s3-02zn-published-diff-path-fix.md)
- [2026-10-06 S3-02ZO Ontology 单项目连续编辑与连续发布](changes/2026-10-06-s3-02zo-single-project-continuous-publish.md)
- [2026-10-06 S3-02ZP 已发布项目工作台真正放开编辑](changes/2026-10-06-s3-02zp-published-workbench-editable.md)
- [2026-10-06 S3-02ZQ Ontology 写回改为一次点击直接尝试执行](changes/2026-10-06-s3-02zq-writeback-one-click-execute-and-runtime-guidance.md)
- [2026-10-06 S3-02ZR Lab 写回通道默认自动打通](changes/2026-10-06-s3-02zr-lab-writeback-default-automation.md)
- [2026-10-07 品牌增长业务实测修复：抖音权限刷新与产品多图上传](changes/2026-10-07-brand-growth-douyin-permission-refresh-and-product-image-upload.md)
- [2026-10-07 品牌增长业务实测修复：Lab 品牌权限快照兜底](changes/2026-10-07-brand-growth-lab-member-permissions-fallback.md)
- [2026-10-07 采集工作台共享品牌上下文收口：抖音 / 小红书 / 公众号](changes/2026-10-07-collection-shared-brand-context-normalization.md)
- [2026-10-07 品牌增长采集链默认品牌兜底修复](changes/2026-10-07-brand-growth-default-brand-fallback-fix.md)
- [2026-10-07 采集服务默认品牌兜底修复](changes/2026-10-07-collectors-service-default-brand-fallback-fix.md)
- [2026-10-07 采集链超时防挂死收口](changes/2026-10-07-collectors-timeout-guardrails.md)
- [2026-10-07 品牌增长工作台初始化种子回退修复](changes/2026-10-07-brand-growth-init-seed-fallback-fix.md)
- [2026-10-07 采集板块免显式登录自动续用修复](changes/2026-10-07-collect-pages-auth-auto-resume-fix.md)
- [2026-10-07 抖音品牌作品采集改为复用规范账号源](changes/2026-10-07-douyin-brand-works-canonical-account-reuse-fix.md)
- [2026-10-05 S2-04 存储与连接器独立治理页](changes/2026-10-05-s2-04-storage-connectors-workspace.md)
- [2026-10-04 S3-02ZD 发布字典迁移后的正式契约](changes/2026-10-04-s3-02zd-publish-migrated-contract.md)
- [2026-10-04 S3-02ZD 专家源目标 alias 收敛验证](changes/2026-10-04-s3-02zd-expert-target-alias-preview-convergence.md)
- [2026-10-04 S3-02Z WorkBuddy 启动前读取验证脚本](changes/2026-10-04-s3-02z-startup-read-validation-script.md)
- [2026-10-04 S3-02Z 专家候选稿隔离导出能力](changes/2026-10-04-s3-02z-expert-preview-export-bundle.md)
- [2026-10-04 S3-02Z 隔离联调专家包组装修复](changes/2026-10-04-s3-02z-isolated-expert-package-assembly.md)
- [2026-10-04 S3-02Z 隔离联调包启动入口桥接](changes/2026-10-04-s3-02z-isolated-startup-entry-bridge.md)
- [2026-10-04 S3-02Z 隔离联调包启动审计脚本](changes/2026-10-04-s3-02z-isolated-startup-audit-script.md)
- [2026-10-04 S3-02Z confirmation gate 自动匹配](changes/2026-10-04-s3-02z-auto-confirmation-gate-matching.md)
- [2026-10-04 S3-02Z confirmation gate 恢复推进闭环](changes/2026-10-04-s3-02z-confirmation-gate-resume-chain.md)

## 目标

`docs/` 只保留对当前开发和交付真正有用的文档。

判断标准只有三条：

1. 能解释当前系统真实结构和真实规则
2. 能帮助后续开发更快定位代码与边界
3. 能追踪重要变更，而不是堆积重复方案和展示镜像

## 文档分层

### 1. 核心基线

这些文件是当前系统的真相来源，必须长期保持最新。

- `docs/site-map.md`
  - 文字版系统地图，回答“有哪些入口、由哪些模块承接、主链路是什么”
- `docs/site-map-mermaid.md`
  - Mermaid 可视化地图，帮助快速建立全局结构认知
- `docs/engineering-standards.md`
  - 当前默认工程规则与实现边界
- `docs/git-workflow.md`
  - 当前 Git 暂存、提交、拆分、备份规则
- `docs/development-delivery-checklist.md`
  - 开发前后必须补齐的交付闭环
- `docs/database-archive.md`
  - 正式持久化边界、主要表与业务映射
- `docs/generated-content-storage-standards.md`
  - 作品、报告、媒体副本的存储与访问规则

### 2. 当前仍在使用的专题方案

这些文档不是全局基线，但仍然服务于当前系统。

- `docs/homepage-ui-optimization-proposal-2026-08-08.md`
  - 当前这份文档已收敛为系统内页简洁版方案，聚焦 `(dashboard)` 主工作台入口该保留什么、该删掉什么
- `docs/personal-center-multi-user-system-plan.md`
  - 个人中心、多用户、品牌协作与权限设计
- `docs/system-refactor-roadmap.md`
  - 当前结构收口与重构路线
- `docs/workbuddy-ontology-engineering-plan.md`
  - 结合 WorkBuddy、Skill、MCP 与中台数据库，提出适配当前系统的轻量 Ontology 工程化方案，目标是把“品牌运营业务对象 + 动作 + 约束 + 编排”固化成一层统一规则
- `docs/production-stability-and-performance-remediation-plan.md`
  - 生产稳定性、部署降压、首屏性能和慢任务异步化治理方案
- `docs/wechat-infrastructure-refactor-plan.md`
  - 公众号 Step 2-5 单一事实源、服务拆分与底层改造方案
- `docs/production-web-port-conflict-recovery.md`
  - 生产前端端口冲突与 PM2 接管排障
- `docs/ai-control-center/README.md`
  - AI 智控中心 文档入口索引
- `docs/ai-control-center/ontology-workbench-2.0-brief.md`
  - Ontology 编排中心 2.0 工作台结构简报；明确只保留一张主画布，把结构变化、版本回退、发布同步并入同页工作区
- `docs/ai-control-center/ontology-workbench-2.0-implementation-plan.md`
  - Ontology 编排中心 2.0 正式系统实现方案；定义数据模型、接口、阶段推进顺序和第一阶段验收口径
- `docs/ai-control-center/*.md`
  - AI 智控中心 接入、权限、Skill、MCP 和安装说明

### 3. 变更记录

- 目录：`docs/changes/`
- 作用：记录重要改动的背景、范围、验证和后续事项
- 要求：真实代码改动默认同步补一条变更记录
- 最新补充：
  - `docs/changes/2026-10-07-s3-02zzc-ontology-publish-sync-final-closure.md`
    - 收掉 `dynamic-video-craft` 外部 Skill 缺失与“写前快照误当最新基线”两处残口，让当前联调副本的发布同步达到 `56/56`，结构变化回到 `changed 0 / missing 0 / synced 56`
  - `docs/changes/2026-10-07-s3-02zzb-ontology-publish-and-sync-closure.md`
    - 把 Ontology `发布同步` 主按钮收口为一次确认同时完成 `published_contract` 正式发布与专家源同步尝试，并把同步结果写成 `expert_source_sync_snapshot` 审计快照
  - `docs/changes/2026-09-25-ai-control-center-reference-forwarding-and-prompt-diagnostics.md`
    - 恢复 AI 智控中心 图片任务默认发送参考图；确认 MCP 指令字段未接入，并增加 `prompt` 兼容映射与脱敏诊断
  - `docs/changes/2026-09-25-ai-control-center-reference-image-prompt-only-policy.md`
    - 记录曾实施但已被纠正的策略；对照测试证明禁用参考图并未修复 prompt 遵从度
  - `docs/changes/2026-09-24-ai-control-center-free-image-prompt-priority-fix.md`
    - 修复自由生图在用户要求更换主体时仍被系统附加指令要求继承参考图主体的问题；默认关闭品牌资料注入时也不再自动把当前品牌名写进 prompt
  - `docs/changes/2026-09-21-douyin-transcript-queue-and-startup-resume-fix.md`
    - 修复抖音视频文案提取“手动入口直跑、自动队列空转、服务重启后默认不续跑”的组合问题；当前手动提取已统一改为串行入队，启动恢复默认开启，并对同一资产增加 in-flight 去重
  - `docs/changes/2026-09-20-standard-docker-default-local-asr-runtime.md`
    - 把本地标准 Docker 基线重新收口为默认预装本地 ASR Python 运行时，并通过新的 `INSTALL_LOCAL_ASR_BUILD` 构建参数避免旧 `.env` 中 `INSTALL_LOCAL_ASR=0` 把新镜像继续卡在“未安装 ASR”状态
  - `docs/changes/2026-09-20-personal-material-auto-sync-and-douyin-transcript-expansion.md`
    - 个人中心素材管理开始自动并入系统内采集素材，抖音视频文案自动提取也从部分作品类型扩到全部抖音作品类型，并把当前受控存储与缓存边界写清楚
  - `docs/changes/2026-09-18-duoyuanx-image-model-additions-and-ai-control-center-sync.md`
    - 给多元探索图像目录补入 `gpt-image-2.5-sunburst` 与 `gpt-image-2.5-flare`，并同步更新 AI 智控中心 设计工作台相关 MCP / Skill 说明
  - `docs/changes/2026-09-17-hypit-local-studio-status-and-integration-notes.md`
    - 记录 `测试/hypit` 当前本地 Docker Studio 的真实状态：Studio 页面已可访问，但 runtime/build/render 与主系统 API / MCP 仍未接通，并给出后续适配层接入建议
  - `docs/changes/2026-09-17-standard-docker-optional-local-asr-install.md`
    - 把标准 Docker 首装改成默认不预装本地 ASR Python 重依赖，避免新机器因 `pip / torch / TLS` 下载问题把 `db-init + server + web` 整体卡死；需要视频文案提取时再通过 `INSTALL_LOCAL_ASR=1` 单独启用
  - `docs/changes/2026-09-17-standard-runtime-install-guide-and-ai-control-center-install-sync.md`
    - 收口标准运行态安装/更新命令、修复 fresh clone 后 `ai-control-center.service.ts` 语法断裂导致的 Docker 构建失败，并同步把 AI 智控中心 安装中心 / MCP / Skill 与独立 `达人合作` 工作台口径对齐
  - `docs/changes/2026-09-15-ai-control-center-brand-growth-collection-tooling-completion.md`
    - 把 `品牌增长策略 -> 收集数据` 里站内已落地的主要采集动作同步开放给 AI 智控中心，补齐小红书评论链路、抖音品牌/竞品作品与达人结果池、公众号正文/统计、每日热点，并同步更新 MCP / Skill 口径
  - `docs/changes/2026-09-09-douyin-creator-collection-workbench-phase-1.md`
    - 给 `品牌增长策略 -> 收集数据 -> 抖音` 补齐达人抓取第一期：`达人搜索抓取`、`达人深度抓取`、`达人结果池`，并将深抓执行态收口到轻任务与抖音 workspace 聚合
  - `docs/changes/2026-08-31-runninghub-ai-control-center-jsonnull-guard.md`
    - 说明 RunningHub `errorCode=803 / JsonNull` 的真实根因是必填媒体节点空提交，并补齐服务端前置拦截与 AI 智控中心 Skill / MCP / 安装中心指引
  - `docs/changes/2026-08-31-douyin-runninghub-app-sync-2.md`
    - 给内容获客 `某音/某号 -> RunningHub应用` 新增 2 个 RunningHub 应用，并同步收口到 AI 智控中心 安装中心与 Skill / MCP 示例说明
  - `docs/changes/2026-08-28-docker-web-corepack-runtime-download-fix.md`
    - 修复标准 Docker 运行态 `web` 容器在运行期反复输出 `Corepack is about to download ...`、导致前端容器持续重启的问题；当前已收口为构建期准备 `pnpm`，运行时直接启动 Next.js
  - `docs/changes/2026-08-28-runninghub-media-node-object-field-guard.md`
    - 给 RunningHub 图片 / 音频 / 视频上传节点补对象型 `fieldValue / fieldData` 前置拦截，并同步 AI 智控中心 MCP / Skill 说明，避免媒体节点最终收到 `[object Object]`
  - `docs/changes/2026-08-28-version-workspace-install-guide-and-readme-refresh.md`
    - 给个人中心 `版本与升级` 补齐标准运行态的版本号回退显示、安装前软件/依赖说明、下载项目与安装命令，并同步把根 `README.md` 改成一套可直接照抄的安装/更新步骤
  - `docs/changes/2026-08-27-brand-growth-topic-library-generalization.md`
    - 把 `品牌增长报告 -> 选题库` 从旧抖音热点沉淀页升级为人工与 AI 智控中心 共用的结构化选题库；品牌增长页去掉“热门找选题”区，并同步补齐查看 / 编辑 / 删除与 MCP / Skill 单条 CRUD
  - `docs/changes/2026-09-21-ai-control-center-explosive-analysis-and-topic-template-linking.md`
    - 给 `品牌增长报告` 新增 `爆款拆解` 独立板块，并为 `选题库` 补齐 `匹配爆款模板` 多 HTML 字段；同时同步 AI 智控中心 MCP / Skill 路由
  - `docs/changes/2026-08-27-douyin-collection-preview-and-transcript-retry-ux.md`
    - 收口品牌增长策略里抖音采集作品的站内受控视频预览、本地/OSS 存储位置回显、文案提取卡住超时回收，以及余额恢复后的重新提取体验，并同步 AI 智控中心 / MCP / Skill 新增 `extract_douyin_work_transcript`
  - `docs/changes/2026-08-25-brand-growth-ip-library.md`
    - 品牌增长策略下的品牌资料库新增独立 `IP资料库` 子板块，补齐前后端落库、多图上传、MCP 与 Skill 路由说明
  - `docs/changes/2026-08-23-remove-mixedcut-from-repo.md`
    - 把 mixedcut 从主站、AI 智控中心、Docker、README 与仓库资产里整仓下线，避免 GitHub 与后续部署继续暴露已废弃能力
  - `docs/changes/2026-08-23-docker-standard-db-init-and-default-demo-brand.md`
    - 给 Docker 标准运行态补 one-shot `db-init` 首启链，自动完成建表、邀请码同步和最小演示账号/品牌补齐；同时把默认演示品牌从具体商家名改为通用默认品牌
  - `docs/changes/2026-08-22-design-workspace-first-load-guard.md`
    - 设计工作台首屏改为只拉取历史列表，创建弹窗所需的模型/日历/产品配置延后到点击创建时再按需加载，并把设计历史窗口缩到最近 24 条
  - `docs/changes/2026-08-22-design-workspace-image-card-memory-guard.md`
    - 设计工作台图片卡片列表默认不再自动加载真实成品图，改为点击时按需预览，优先避免浏览器首屏图像解码导致的高内存占用
  - `docs/changes/2026-08-22-web-chunk-recovery-inline-regex-fix.md`
    - 修复前端根布局中 chunk 自动恢复内联脚本的正则转义错误，避免浏览器在页面初始化前因 `Invalid regular expression flags` 直接白屏
  - `docs/changes/2026-08-22-ai-control-center-generated-image-data-url-fix.md`
    - 修复 AI 智控中心 设计生图在第三方返回 `data:image/...;base64,...` 时被误当成远程 URL 下载、从而导致任务失败的问题
  - `docs/changes/2026-08-22-design-workspace-history-memory-pressure-fix.md`
    - 修复 `更多功能 -> 设计` 首屏因历史列表携带完整 HTML 内容并批量渲染 iframe 卡片而触发的浏览器内存崩溃
  - `docs/changes/2026-08-22-ai-control-center-design-work-image-size-entry-clarification.md`
    - 给 AI 智控中心 `create_design_work` 显式补齐 `imageSize` 入参，并把旧 `spec: 宽x高` 的兼容关系与错误格式拦截规则写清楚，避免外部误以为只能生成默认竖版图
  - `docs/changes/2026-08-22-ai-control-center-design-work-default-skill-alignment.md`
    - 收口 AI 智控中心 图片设计默认模板选择：`品牌封面图 / 信息图海报 / 电商主视觉` 不再无脑掉回 `design-social-carousel`，同时 `create_design_work` 兼容旧写法 `styleHint`
  - `docs/changes/2026-08-22-douyin-video-cache-local-preview-recovery.md`
    - 修复品牌增长策略里抖音采集视频在本地受控存储模式下长期“缓存中”的问题，补齐启动恢复、自愈补挂和浏览器式下载头
  - `docs/changes/2026-08-22-wechat-publish-local-asset-loopback-fix.md`
    - 修复公众号 Step 5 API 发布在 Docker 容器内回读站内封面图 / 正文图时误用宿主机 `13011` 端口、最终统一报 `fetch failed` 的问题
  - `docs/changes/2026-08-22-root-readme-refresh.md`
    - 重写仓库根目录 `README.md`，把首页说明从旧阶段单机链路收口为当前系统总览，并明确 Docker 标准运行态、AI 智控中心 文档入口和当前真实能力边界
  - `docs/changes/2026-08-22-docker-standard-version-update-guide-page.md`
    - 把个人中心 `版本与升级` 从“仅 local-single-user 自动升级”扩展为双模式：安装态继续一键升级；Docker 标准运行态在配置远端更新清单后，可显示最新版本、容器重建命令、Skill 同步提醒和更新说明链接
  - `docs/changes/2026-08-22-personal-center-version-update-reminder.md`
    - 把个人中心里的版本提醒继续前置到概览卡片和二级导航，并让版本页固定展示更新方法，避免用户必须先点进版本页才知道有没有更新、该怎么更新
  - `docs/changes/2026-08-22-docker-web-api-proxy-target-fix.md`
    - 修复 Docker 本地部署下 `ai-omni-web` 默认把 `/api/*` 代理到容器自身 `127.0.0.1:3011`，导致登录页报 `API 代理失败`；当前显式改为转发到 `server:3011`
  - `docs/changes/2026-08-21-ai-control-center-design-work-reference-material-id.md`
    - AI 智控中心 设计工作台新增 `referenceMaterialId`，允许直接复用站内创作素材作为参考图，减少手动转公网 URL 或重复上传
  - `docs/changes/2026-08-22-ai-control-center-install-token-brand-mismatch-guard.md`
    - AI 智控中心 正式安装令牌新增品牌错配拦截；当 `Authorization` 绑定品牌与请求头 `x-brand-id` 不一致时直接报错，避免 `create_design_work` 静默跑到错误品牌上下文
  - `docs/changes/2026-08-21-local-single-user-root-route-redirect-fix.md`
    - 修复 local-single-user 安装态访问根路径 `/` 直接掉进 Next.js `/error` 的问题；当前安装态会把 `/` 直接收口到 `/brand-growth`，不再尝试渲染只服务官网场景的营销首页模板
  - `docs/changes/2026-08-19-local-single-user-install-elevation-exit-code-and-direct-ps1-fix.md`
    - 修复 local-single-user 安装包在“请求 Windows 提权”后窗口直接消失的问题：安装入口改为读取真实退出码，并去掉提权后再回调 `.cmd` 的脆弱跳板，直接拉起 PowerShell 安装主体
  - `docs/changes/2026-08-19-ai-control-center-image-hard-failure-and-duplicate-submit-guard.md`
    - 修正 AI 智控中心 生图链路把上游 `400/403` 硬失败笼统看成 `502/504` 的排查偏差，并补上单任务硬失败停机与短时间重复提交保护
  - `docs/changes/2026-08-19-ai-control-center-paid-image-success-should-not-fail-on-cache.md`
    - 修复第三方图片 provider 已成功返回结果后，本站因二次下载/归一化/落盘失败又把整次同步调用重新打成失败的问题
  - `docs/changes/2026-08-19-local-single-user-runtime-browser-url-port-fallback-fix.md`
    - 收口 local-single-user 安装、升级、自启与修复脚本中的固定 `3001` 端口假设，统一优先使用 runtime metadata 中的 `browserUrl / previewUrl`

### 4. 历史规划与阶段草案

- 目录：`docs/project_planning/`
- 定位：历史规划草案与阶段设计稿
- 使用方式：仅作背景参考，不作为“当前系统真相”
- 规则：如果其中内容已经被代码落实，应以 `site-map`、`engineering-standards`、`database-archive` 和 `changes/` 为准

### 5. 输出报告

- `docs/*.html`
- 只保留当前仍需要交付或汇报的 HTML 报告
- 不再保留与 Markdown 一一重复的展示镜像
- 面向站点用户公开访问的交付型 HTML，如 AI 智控中心 安装说明页，放在 `apps/web/public/docs/`，不计入 `docs/` 源文档体系
- 当前新增的系统内页样式预览稿位于：
  - `apps/web/public/docs/homepage-ui-refresh-preview.html`

### 6. 外部表达资产

- `../文章/`
- 存放面向外部传播的长文、配图和深度讲解材料
- 不作为系统开发真相来源，但可以作为对外介绍系统技术架构、业务链路和方法论的交付资产

## 当前推荐阅读顺序

### 开发前

1. `docs/engineering-standards.md`
2. `docs/site-map.md`
3. `docs/site-map-mermaid.md`
4. `docs/development-delivery-checklist.md`
5. 当前任务最近的一条 `docs/changes/*.md`

### 按任务补读

- Git 边界、提交拆分、快照备份：`docs/git-workflow.md`
- 数据库、迁移、正式入库：`docs/database-archive.md`
- 资源副本、作品、报告、媒体：`docs/generated-content-storage-standards.md`
- 个人中心、多用户、品牌协作：`docs/personal-center-multi-user-system-plan.md`
- AI 智控中心：`docs/ai-control-center/README.md`
  - 当前应优先按正式安装说明与 Skill 文档使用，不再保留外部剪辑系统相关集成说明

## 文档维护规则

- 代码改动和文档改动属于同一项工作
- 入口、模块、主流程变更时，先改 `site-map.md` 与 `site-map-mermaid.md`
- 通用规则变更时，改 `engineering-standards.md`
- Git 约束变化时，改 `git-workflow.md`
- 数据边界变化时，改 `database-archive.md`
- 真实代码改动后，补 `docs/changes/*.md`
- 历史草案如果已经失去储存价值，应删除；如果仍有背景价值，但不代表当前实现，应明确放在专题或规划层，不进入核心基线
- 不再保留与 Markdown 内容重复的 HTML 镜像文档

## 本次整理后的原则

- `docs/` 主目录优先放“当前真相”
- `docs/changes/` 保留演进历史
- `docs/project_planning/` 保留历史规划稿，但不再混充当前实现
- 已放弃的多-agent 方案文档已经移除，不再作为当前开发模式的一部分

## 最近应优先关注的文档
- `docs/changes/2026-09-25-ai-control-center-reference-forwarding-and-prompt-diagnostics.md`
  - 恢复默认参考图转发；MCP 的 `prompt` 现映射到图像指令，运行日志确认原调用指令字段为空
- `docs/changes/2026-09-25-ai-control-center-reference-image-prompt-only-policy.md`
  - 已纠正的历史策略记录，不再作为当前默认行为或修复结论
- `docs/changes/2026-09-24-ai-control-center-free-image-prompt-priority-fix.md`
  - 修复 AI 智控中心 自由生图把参考图主体错误置于用户明确 prompt 主体之上的问题，并记录品牌名注入边界与图像尺寸后续核对项
- `docs/changes/2026-09-21-douyin-transcript-queue-and-startup-resume-fix.md`
  - 修复抖音视频文案提取“只能手动点、连续点多个会卡、服务重启后不自动续跑”的队列与启动恢复问题；当前手动入口、自动入队和启动恢复已统一到同一条串行队列
- `docs/changes/2026-09-20-standard-docker-default-local-asr-runtime.md`
  - 当前本地标准 Docker 基线已经重新切回“默认预装本地 ASR”，旧环境若之前关过 ASR，需要重建 `db-init/server` 才会真正把 Python 运行时装进镜像
- `docs/changes/2026-09-20-personal-material-auto-sync-and-douyin-transcript-expansion.md`
  - 收口个人中心素材管理与内容采集真源的展示断层：系统内已落库的采集素材现在会自动同步进素材管理，同时抖音视频文案自动提取扩大到全部作品类型
- `docs/changes/2026-09-08-douyin-transcript-local-asr-pipeline.md`
  - 把抖音采集视频文案提取从 GLM 直接读视频切到本地 ASR 链路：Paraformer 主识别、Whisper 兜底，并同步补齐 Docker Python 运行时与 AI 智控中心 / Skill 说明
- `docs/changes/2026-09-08-douyin-video-preview-and-transcript-hover-fix.md`
  - 修复品牌增长抖音采集列表中的视频文案提取地址选择、视频预览列长路径撑高，以及视频文案悬浮预览体验
- `docs/changes/2026-09-08-ai-control-center-geo-keyword-routing-and-generatedat-fix.md`
  - 修复 AI 智控中心 在 GEO 关键词挖掘场景下误走策略优化工具时的 `generatedAt` 写库类型错误，并收紧 MCP schema，明确 GEO 内容应改用 `create_ai_control_center_geo_content`
- `docs/changes/2026-09-07-ai-control-center-codex-mcp-installation.md`
  - 给个人中心 AI 智控中心 安装中心补入 Codex 的 `config.toml` MCP 配置片段，并同步更新安装文档、Skill 包说明和站点地图
- `docs/changes/2026-09-07-openchatcut-removal.md`
  - 按最新决策把 OpenChatCut 从主系统里全量剥离：删除后端接入、安装中心教程、Docker 样板和相关文档索引
- `docs/changes/2026-09-06-material-storage-display-root-fix.md`
  - 修正素材管理页面把 Windows 展示路径误显示成 `/app/D:\...` 的问题，并把 Docker 本地标准运行态默认展示根目录改成实际对应的 `docker/local-data/*`
- `docs/changes/2026-09-06-duoyuanx-model-catalog-refresh.md`
  - 刷新多元探索第三方平台的模型目录与官方文档入口，补齐 GPT 5.5/5.6、Claude 5、Gemini 3.6、Qwen 3.7、Qwen Image、MiniMax-H3 等新模型口径
- `docs/changes/2026-09-04-ai-control-center-free-image-design-workspace.md`
  - 把 AI 智控中心 `create_design_work` 的图片模块收口为默认自由生图：不再强制走社媒配图模板、不默认植入品牌资料；同时 `更多功能 -> 设计` 收口为站内结果回看页，并撤下提示词中心入口
- `docs/changes/2026-09-04-wechat-multi-official-account-workflow-routing.md`
  - 公众号 `配置初始化` 支持多公众号账号管理，`创作工作流` 可绑定具体公众号并按所选账号发布，`发布历史` 会标注对应公众号，同时同步补齐 AI 智控中心 MCP / Skill 说明
- `docs/changes/2026-09-04-paid-acquisition-tencent-ad-lead-workspace.md`
  - 新增顶栏 `投流获客` 一级入口与左侧 `腾讯投流获客` 板块，列表固定展示标题 / 内容 / 创建时间 / 留言，并支持查看详情留言、删除，以及同步补齐 AI 智控中心 MCP / Skill / Prisma 真源
- `docs/changes/2026-09-10-paid-acquisition-creator-cooperation-workspace.md`
  - 新增与 `投流获客` 同级的独立一级板块 `达人合作`，并拆成 `达人匹配 / 达人跟踪`；AI 智控中心 可从达人结果池写入匹配达人、加入跟踪、维护合作作品与 X 天自动更新，同时同步补齐 MCP / Skill / Prisma 真源
- `docs/changes/2026-09-04-content-acquisition-marketing-calendar-platform-views.md`
  - 给内容获客某书 / 某音/某号 / 公众号补独立 `营销日历` 入口，三端复用品牌增长报告下的同一份营销日历真源，并按平台过滤展示与编辑字段
- `docs/changes/2026-09-04-standard-db-init-ai-control-center-runtime-table-schema-alignment.md`
  - 修复标准 Docker 运行态更新时 `db-init` 因 Prisma 将 AI 智控中心 运行时表误判为待删除表而中断的问题；当前把软文街缓存、营销策划方案、策略优化记录和留言真源正式纳入 `prisma/schema.prisma`
- `docs/changes/2026-09-04-version-workspace-upstream-branch-update-guide-fix.md`
  - 修正个人中心 `版本与升级` 页面在标准运行态下把远端默认分支误当成部署分支的问题，更新引导改为内置 PowerShell 通用升级指令：自动识别当前工作区 upstream，再执行 `checkout + pull --ff-only + docker compose`
- `docs/changes/2026-09-04-ai-control-center-marketing-plan-html-workspace.md`
  - 把内容获客某书 / 某音/某号 / 公众号下的 `营销策划方案` 统一收口为 AI 智控中心 HTML 方案列表，支持查看 HTML、打开 HTML、留言协作，并同步新增公众号独立左侧入口与 MCP / Skill 工具
- `docs/changes/2026-09-03-ruanwenjie-credential-refresh-and-timestamp-fix.md`
  - 记录 GEO `第三方媒体投放` 当前真正卡住的是软文街品牌共享凭证已过期，以及 PostgreSQL 缓存时间字段写库类型错误；当前已恢复媒体同步与站内分页读取
- `docs/changes/2026-09-02-runninghub-option-select-render-fix.md`
  - 修正内容获客 / 抖音兼容直达页 RunningHub 应用详情里“设置比例”等枚举字段被误渲染成纯数字输入框的问题；当前会按模板选项渲染下拉选择，并同步补齐 AI 智控中心 MCP / Skill 对“标签显示、原值提交”的说明
- `docs/changes/2026-09-01-ruanwenjie-media-delivery-cache-and-search.md`
  - 记录 GEO `第三方媒体投放` 已从“临时拉取单页”升级为“站内持续缓存软文街媒体库”，支持继续同步下一页、按 20 条分页查看，以及按媒体名称 / 平台 / 分类 / 地区搜索，并同步补齐 AI 智控中心 MCP / Skill 说明
- `docs/changes/2026-09-01-ruanwenjie-media-delivery-debug-and-response-alignment.md`
  - 记录软文街第三方媒体投放“连接不上”的真实排查结果：平台与凭证当前都可用，当前代码需对齐顶层 `pagination` 与下单 `response_data` 响应结构，同时说明当前品牌下暂无可投放的第三方媒体文章
- `docs/changes/2026-09-01-account-isolation-rollback-from-multi-brand.md`
  - 按用户要求回退未提交的多品牌扩展，恢复到“账号隔离、一账号一品牌”的当前使用口径，并同步撤回 AI 智控中心 安装中心与 Skill 的多品牌说明
- `docs/changes/2026-08-30-version-workspace-git-branch-guide-fix.md`
  - 修正个人中心 `版本与升级` 页面在标准运行态下错误沿用本地旧分支生成 `git pull` 命令的问题，更新引导改为优先跟随远端有效分支
- `docs/changes/2026-08-30-ai-control-center-strategy-optimization-records.md`
  - 给内容获客三板块和品牌增长里的 AI 智控中心 新增独立“策略优化记录”板块，补齐查看 / 编辑 / 留言 / 删除、20 条分页，以及 MCP / Skill 同步
- `docs/changes/2026-08-31-douyin-runninghub-app-sync-2.md`
  - 给内容获客 `某音/某号 -> RunningHub应用` 新增 2 个 RunningHub 应用，并同步收口到 AI 智控中心 安装中心与 Skill / MCP 示例说明
- `docs/changes/2026-08-31-runninghub-ai-control-center-jsonnull-guard.md`
  - 说明 RunningHub `errorCode=803 / JsonNull` 的真实根因是必填媒体节点空提交，并补齐服务端前置拦截与 AI 智控中心 Skill / MCP / 安装中心指引
- `docs/changes/2026-08-30-ai-control-center-weekly-review-and-version-history-fix.md`
  - 把内容获客三板块和品牌增长里的 AI 智控中心 复盘统一改成“每周复盘”，补齐查看后直接编辑与留言协作，并修复标准运行态版本页当前版本号与历史更新记录的展示
- `docs/changes/2026-08-28-docker-web-corepack-runtime-download-fix.md`
  - 标准 Docker 运行态修复 `web` 容器运行期依赖 `corepack` 下载 `pnpm` 的问题；镜像构建完成后，容器启动不再反复联网取 `pnpm`
- `docs/changes/2026-08-28-runninghub-media-node-object-field-guard.md`
  - 给 RunningHub 媒体上传节点补对象型 `fieldValue / fieldData` 拦截，并同步 AI 智控中心 MCP / Skill 约束，避免 `LoadAudio` 最终收到 `[object Object]`
- `docs/changes/2026-08-29-ai-control-center-design-default-duoyuanx-route.md`
  - AI 智控中心 `create_design_work` 在图片模块未显式传 `modelSelection` 时，默认优先尝试工作台模型列表里的多元探索 `gpt-image-2`，避免继续被技能旧默认值锁到 `Right Codes`
  - `docs/changes/2026-08-30-ai-control-center-weekly-review-and-version-history-fix.md`
    - 把内容获客与品牌增长里的 AI 智控中心 复盘统一改成“每周复盘”，补齐查看后直接编辑与留言协作，同时修复标准运行态版本页的 `0.1.0` 固定显示和历史记录版本号映射
- `docs/changes/2026-08-28-version-workspace-install-guide-and-readme-refresh.md`
  - 版本页标准运行态补齐“版本号 + 安装前软件/依赖 + 下载项目/安装/更新命令”，并同步刷新根 `README.md`
- `docs/changes/2026-08-27-brand-growth-topic-library-generalization.md`
  - 把 `品牌增长报告 -> 选题库` 收口为结构化选题库：品牌增长页去掉热点板块，人工与 AI 智控中心 共用同一份选题记录，并新增单条增删改的 MCP / Skill 路由
- `docs/changes/2026-09-21-ai-control-center-explosive-analysis-and-topic-template-linking.md`
  - 给 `品牌增长报告` 新增 `爆款拆解` 独立板块，补齐查看 / 删除 / HTML 详情留言；并为 `选题库` 增加 `匹配爆款模板` 多 HTML 字段与 AI 智控中心 MCP / Skill 路由
- `docs/changes/2026-08-27-standard-version-workspace-fallback-guide.md`
  - 把个人中心 `版本与升级` 在标准运行态下从“纯 manifest 依赖”补成“仓库版本记录 + Docker 更新命令 + Skill/MCP 同步提醒”的回退模式；即使没有远端清单，也不再显示空壳版本页
- `docs/changes/2026-08-27-ip-voice-material-preview-ai-control-center-git-skill.md`
  - 给品牌资料库 `IP资料库` 增加 `mp3` 且时长 `> 30 秒` 的语音上传；个人中心素材管理四类素材补齐 `查看` 预览；AI 智控中心 安装中心新增 GitHub Skill 链接 + 一句安装指令，并继续保留 Skill ZIP 下载
- `docs/changes/2026-08-25-brand-growth-ip-library.md`
  - 品牌资料库新增独立 `IP资料库` 子板块，并把品牌 IP 资料统一收口到 `Brand.ipProfileJson` 与 `manage_brand_library` 链路
- `docs/changes/2026-08-23-remove-mixedcut-from-repo.md`
  - 把 mixedcut 从主站、AI 智控中心、Docker、README 与仓库资产里整仓下线；当前仓库与部署链不再包含 mixedcut
- `docs/changes/2026-08-22-docker-web-api-proxy-target-fix.md`
  - 修复 Docker 本地部署下主站 `13001` 登录页能打开但提交时报 `API 代理失败` 的问题；当前 `web` 容器会把站内 `/api/*` 代理到 `server:3011`
- `docs/local-single-user-stability-delivery-refactor-plan.md`
  - `local-single-user` 稳定性交付重构的正式方案与分阶段开发计划；明确按“单一入口、单一状态、单一环境解析”推进，并将周期控制在可持续的小步闭环内
- `docs/changes/2026-08-21-ai-control-center-design-work-reference-material-id.md`
  - AI 智控中心 设计工作台新增 `referenceMaterialId`，允许直接复用站内创作素材作为参考图，减少手动转公网 URL 或重复上传
- `docs/changes/2026-08-17-local-single-user-stability-refactor-phase-1.md`
  - 稳定性交付重构第一阶段已启动：新增统一平台 helper，开始收口 PowerShell / cmd / taskkill 解析，并让 launcher 开始写统一 lifecycle 状态文件
- `docs/changes/2026-08-17-local-single-user-stability-refactor-phase-2-install-lifecycle.md`
  - 稳定性交付重构第二阶段已开始推进安装主链收口：安装脚本开始直接消费 lifecycle 状态，并在安装失败时输出 `lifecyclePhase / lifecycleError / lifecyclePath` 等关键上下文
- `docs/changes/2026-08-17-local-single-user-stability-refactor-phase-2-autostart-lifecycle.md`
  - 稳定性交付重构第二阶段继续推进自启恢复链收口：autostart helper 开始先解析真实 `localAppRoot`，并直接写入、消费统一 lifecycle 状态，避免默认 `%APPDATA%` 路径与用户自定义根目录场景下的状态分裂
- `docs/changes/2026-08-17-local-single-user-release-missing-platform-helper-fix.md`
  - 修复 `hotfix-70` 发布物遗漏 `local-single-user-platform.cjs` 导致安装包覆盖安装与升级后新版本首启直接 `MODULE_NOT_FOUND` 的问题；当前已把该共享 helper 收回发布物必带清单
- `docs/changes/2026-08-17-local-single-user-updater-bootstrap-process-alive-fix.md`
  - 修复“立即升级”在慢机器上过早报 `升级器未成功启动` 的 bootstrap 误判：当前只要独立 updater 进程仍存活且没有明确 stderr 失败信号，就继续让后台升级链推进，而不是要求极短时间内必须先看到 trace/stdout 落盘
- `docs/changes/2026-08-17-local-single-user-oss-upload-signed-multipart-fallback.md`
  - 修复 `local-single-user` 252MB 级别发布包上传 OSS 时 `ali-oss multipartUpload()` 容易 `ECONNRESET / callback twice` 的问题；当前大包改为 signed multipart 分片上传，并对单 part 做受控重试
- `docs/changes/2026-08-17-local-single-user-install-entry-powershell-path-fix.md`
  - 修复 `local-single-user` 安装入口仍依赖 PATH 中 `powershell` 命令别名的问题；安装入口现在优先走系统 PowerShell 绝对路径，并为“安装后工作台未 ready”补充更细的超时上下文，便于继续收口启动期故障
- `docs/changes/2026-08-17-local-single-user-autostart-duplicate-startup-entry-fix.md`
  - 修复 `local-single-user` 在 Windows Startup 目录中同时残留标准 `.cmd` 与历史 `.lnk` 自启入口的问题；后续自启重装、repair、升级与安装器 fallback 都会先清旧入口，只保留一个有效启动项，避免开机双重拉起把 launcher 锁等待放大成“重启后页面打不开”
- `docs/changes/2026-08-17-local-single-user-apply-entry-lightweight-updater-extraction-fix.md`
  - 修复 `local-single-user` 点击“立即升级”成功率越来越低的问题：不再在 `POST /system/update/apply` 同步请求里整包解压数百 MB 升级包，只快速提取目标发布包里的单个 updater 脚本，从而把升级入口从重 IO 卡顿中解放出来
- `docs/changes/2026-08-16-local-default-brand-background-snapshot-restore.md`
  - 为 `local-single-user` 的 `local_default_brand` 增加本地背景快照与启动期自动恢复；即使未来再有链路把品牌背景写回默认值，也会优先从本地快照恢复，降低“品牌背景资料又变默认”的数据损伤
- `docs/changes/2026-08-16-local-single-user-autostart-ready-retry-fix.md`
  - 把 `local-single-user` 的开机自启 helper 从“只点火”补成“先验活、首轮失败后自动补一次启动”，并新增 `autostart-helper.log`，用于收口“重启后页面又打不开”的重启现场
- `docs/changes/2026-08-16-geo-third-party-media-delivery-and-ruanwenjie-integration.md`
  - 把软文街平台接入个人中心第三方接口配置，并在 `/geo` 的 `第三方媒体` 板块下新增 `第三方媒体投放` 列表；支持读取可投放媒体、选择已生成文章并直接提交投放订单
- `docs/changes/2026-08-15-local-material-library-and-ai-control-center-material-sync.md`
  - 在 `local-single-user` 的个人中心素材管理页新增素材库存储设置，支持用户自定义根目录并自动创建 `素材库/文本|图片|语音|视频`；同时把网站上传素材与 AI 智控中心 上传素材统一收口到四分类列表，并同步到 MCP / Skill / 安装中心说明
- `docs/changes/2026-08-15-all-network-growth-comment-leads.md`
  - 把顶栏 `GEO` 正式改成 `GEO获客`，新增 `/all-network-growth` 全网获客工作台与 `评论获客` 子板块，并把小红书 / 抖音评论用户结果沉淀为可由 AI 智控中心 / MCP / Skill 共用的评论获客列表
- `docs/changes/2026-08-18-all-network-growth-platform-leads-and-comment-pagination.md`
  - 收口 `/all-network-growth`：评论获客页面去掉站内生成区、列表改为每页 20 条分页，并新增由 AI 智控中心 直接写入的 `平台获客` 子板块，同步补齐 MCP / Skill / 持久化真源
- `docs/changes/2026-08-18-local-single-user-install-backup-and-version-entry-resilience-fix.md`
  - 修复 local-single-user 安装器在备份旧安装目录时未清掉 `start-local-single-user.cmd` 的 `cmd.exe` wrapper、导致备份失败后可能留下半安装根的问题，并让个人中心在升级状态接口失败时仍保留 `版本与升级` 入口
- `docs/changes/2026-08-15-brand-growth-comment-target-user-ai-control-center-chain.md`
  - 补齐品牌增长策略里“小红书 / 抖音作品 -> 评论 -> 匹配评论用户 -> 账号链接”的完整链路，同时把评论用户主页链接、目标用户提取和 AI 智控中心 对应工具一起接通
- `docs/changes/2026-08-14-local-single-user-worker-exit-keep-web-alive-fix.md`
  - 修复 local-single-user 在后台 worker 异常退出时，launcher 直接把 API / Web 一起杀掉、最终让页面整体打不开的问题；现在会优先受控自动重启 worker，并保持页面继续可用
- `docs/changes/2026-08-14-local-single-user-oss-region-normalize-fix.md`
  - 修复 local-single-user 发布上传脚本直接把 `cn-beijing` 拼成错误 OSS 域名的问题；现在会统一归一化为 `oss-cn-beijing`，避免上传 client 和 `latest.json` 下载地址同时写错
- `docs/changes/2026-08-14-local-single-user-prisma-generate-skip-guard-fix.md`
  - 修复 local-single-user 升级后 launcher 只信任 runtime 里的 Prisma state / schema hash，导致安装目录里的 `.prisma/client` 即使已被升级包覆回 PostgreSQL 版本也继续跳过 `prisma generate` 的问题；现在会先核对真实生成 client 的 datasource provider，若不是 `sqlite` 就强制重生
- `docs/changes/2026-08-14-local-single-user-sqlite-availability-retry-fix.md`
  - 修复 local-single-user 下 Prisma `canUseDatabase()` 对 SQLite 启动期瞬时抖动过于敏感的问题；改为先连接再探测，并仅对 SQLite 的 timeout / busy / locked 等瞬时错误做短重试，避免真实数据库明明可用却被整条链路判成不可用
- `docs/changes/2026-08-14-local-single-user-real-session-auto-resume-fix.md`
  - 修复 local-single-user 下浏览器仍残留 `local_default_user / local_default_brand` 会话时，页面持续显示演示账号的问题；新增真实本地会话自动续回接口，并让前端请求层自动把默认本地 session 切回最近真实账号
- `docs/changes/2026-08-14-local-single-user-install-autostart-node-fallback-fix.md`
  - 修复 local-single-user 安装阶段在执行 `install-autostart.cmd` 时，一旦 Node 包装层往 `stderr` 输出或直接失败就把整包安装判死的问题；安装器现改为按退出码判断，并在 autostart 注册失败时自动兜底到当前用户 Startup 快捷方式
- `docs/changes/2026-08-14-local-single-user-auth-fallback-and-ai-control-center-installation-fix.md`
  - 修复 local-single-user 下 `/auth/me`、`/auth/brands` 在 SQLite 超时或旧 token 会话失配时被后端 fallback 拉回演示账号，以及 AI 智控中心 安装中心因此提示“当前用户不存在”“未配置品牌”的问题；同时收口 AI 每日计划 / 每日复盘的 SQLite 兼容 SQL
- `docs/changes/2026-08-14-local-single-user-registration-invite-seed-packaging-fix.md`
  - 修复 local-single-user 安装包未携带 `prisma/seed-data/registration-invite-codes.txt`，导致种子文件中真实存在的邀请码在安装态仍被判成“邀请码不存在、已失效或已被使用”的问题
- `docs/changes/2026-08-13-local-single-user-version-entry-fallback-fix.md`
  - 修复 local-single-user 下只要升级状态接口暂时拿不到，`版本与升级` tab 就整个消失，以及 `/auth/me` 虽已 fallback 但返回层又继续查数据库导致仍显示“本地登录态”的问题
- `docs/changes/2026-08-13-local-single-user-auth-timeout-fallback-fix.md`
  - 修复 local-single-user 在浏览器已有 token、但 SQLite 短时超时或锁等待时，`/auth/me` 与 `/auth/brands` 仍强依赖 `userSession` 查询而导致个人中心退回“本地登录态”、版本与升级入口一起折叠的问题
- `docs/changes/2026-08-13-user-skills-sqlite-compatibility-fix.md`
  - 修复另一台已安装 `hotfix-47` 的 local-single-user 机器在 SQLite 安装态下，`user-skills` 原生 SQL 因兼容问题报 `near "EXISTS"` / `no such table: COALESCE`，进而导致个人中心部分接口异常和页面退回“本地登录态”的问题
- `docs/changes/2026-08-13-local-single-user-startup-self-heal-default.md`
  - 把 local-single-user 在“重启后页面打不开”场景下的默认策略改成受控自动自愈：首轮启动失败后，launcher 会自动清理 runtime 残留、旧进程和 runtime web bundle，再重试启动，而不是让用户自己清锁排障
- `docs/changes/2026-08-12-local-single-user-upgrade-runtime-release-tag-fallback-fix.md`
  - 修复 local-single-user 升级到 `0.1.20` 时，虽然新版本 API / Web 已启动成功，但 updater 因读不到安装目录 releaseTag 而误判失败并自动回滚到 `0.1.19` 的问题；launcher 现会把 `releaseTag/appVersion` 写入 runtime metadata，updater 也会回退读取该版本标记
- `docs/changes/2026-08-12-geo-ai-control-center-content-workspace-expansion.md`
  - 扩展 `/geo` 工作台，新增关键词挖掘、网站诊断、知识库搭建、GEO优化方案、自媒体内容、第三方媒体、品牌网站，并统一补齐 HTML 预览与非 HTML `存储地址`
- `docs/changes/2026-08-12-material-management-and-content-acquisition-materials.md`
  - 把个人中心原“订单中心”收口为“素材管理”，并让内容获客三组 `创作素材` 与个人中心聚合列表统一补齐标题、标签、来源、入库时间和本地文件夹地址
- `docs/changes/2026-08-11-content-acquisition-workbench-and-local-storage.md`
  - 把顶部 `某书 / 某音/某号 / 公众号` 入口收口为统一的 `内容获客` 工作台，补齐 AI 智控中心 留言区，并将 `local-single-user` 安装态的受控资源副本正式切到本地存储
- `docs/changes/2026-08-10-local-register-invite-and-user-access-control.md`
  - 收口本地单机版也必须邀请码注册，并在后台用户管理补齐账号到期时间、主模块权限配置以及后端统一拦截
- `docs/changes/2026-08-09-skill-center-sqlite-gpt54-sync-fix.md`
  - 修复本地单机版 `个人中心 -> 技能中心` 因 SQLite 分支再次执行 PostgreSQL 风格 `POSITION(...)` 而直接 500 的问题
- `docs/changes/2026-08-08-ai-control-center-mcp-timeout-stability.md`
  - 收口 AI 智控中心 安装中心导出的 MCP timeout 配置，并修正 `create_design_work` 已同步完成却仍返回处理中语义的问题
- `docs/changes/2026-08-08-local-single-user-autostart-prebuilt-mode-fix.md`
  - 修复 local-single-user 在机器重启后页面打不开的问题；根因是开机自启 helper 没有继承 `LOCAL_SINGLE_USER_PREBUILT_ONLY=true`，导致安装态误命中 `next/dist/bin/next`
- `docs/changes/2026-08-08-homepage-ui-optimization-proposal-and-preview.md`
  - 记录本轮系统内页简洁版方案与预览稿：按 `finesse-brief` 收口结构，再按 `finesse-ui` 重做更干净、低信息密度的 HTML 预览页
- `docs/homepage-ui-optimization-proposal-2026-08-08.md`
  - 当前已改为系统内页简洁版方案，建议把进入系统后的主工作台压缩成“顶部 -> 首屏 -> 三个核心入口 -> 两个侧边信息盒子”
- `docs/changes/2026-08-08-local-single-user-install-ready-check-fallback-fix.md`
  - 修复 local-single-user 手动安装阶段“本地工作台其实已经起来，但安装脚本仍因只等 runtime metadata 而误判失败”的问题；安装 ready 判定改为优先看 API / Web 真实健康，并通过 `cmd.exe /d /c` 更稳地拉起启动入口
- `docs/changes/2026-08-08-local-single-user-apply-run-updater-source-fix.md`
  - 修复 local-single-user 升级链在 apply-run 阶段仍复用当前安装版本旧 updater 的问题；改为优先从刚下载的发布包里提取最新 updater 再执行，避免修复版 updater 永远无法通过版本更新真正生效
- `docs/changes/2026-08-08-local-single-user-updater-preflight-cleanup-fix.md`
  - 收紧 local-single-user 升级链的垃圾清理职责：历史 `downloads/*`、`extract-*`、旧 `apply-runs/*` 改为在 updater 安装前预清理并在成功后复清，不再由 launcher 启动时直接触碰当前升级目录，避免升级失败后页面打不开
- `docs/changes/2026-08-07-local-single-user-launcher-startup-cleanup-fallback.md`
  - 为 local-single-user launcher 补启动期兜底清理：新版本启动时也会主动回收历史 `updates` 垃圾目录与旧 `%LOCALAPPDATA%\\AiOmniOps` 安装痕迹，避免只依赖升级器单点清理
- `docs/changes/2026-08-07-local-single-user-historical-update-artifacts-cleanup-fix.md`
  - 修复 local-single-user 升级成功后只删除“本轮”目录、未回收历史 `downloads/*`、`extract-*`、旧 `apply-runs/*` 的问题；升级成功后改为统一清理历史升级残留
- `docs/changes/2026-08-07-local-single-user-dual-appdata-cleanup-fix.md`
  - 收口 local-single-user 升级链在 `%APPDATA%\\AiOmniOps` 与 `%LOCALAPPDATA%\\AiOmniOps` 两处同时残留安装/升级文件的问题；安装器日志统一回到主资料目录，升级成功后额外清理历史 `%LOCALAPPDATA%\\AiOmniOps` 痕迹
- `docs/changes/2026-08-07-local-single-user-upgrade-restart-fallback-fix.md`
  - 修复 local-single-user 升级后因 `start-local-single-user.cmd` 缺失而跳过重启、页面长时间停在“升级进行中”的问题；updater 现在会回退到 bundled `node.exe + launcher.cjs` 直接拉起新版本
- `docs/changes/2026-08-07-local-single-user-upgrade-disk-pressure-rollback-tightening.md`
  - 收紧 local-single-user 升级在磁盘空间紧张场景下的行为：升级前先预清理历史 `AiOmniOps-backup-*`，安装脚本只要非 0 退出就立即回滚，避免留下半安装状态
- `docs/changes/2026-08-07-local-single-user-install-backup-auto-cleanup.md`
  - 让 local-single-user 升级成功后自动清理安装目录旁边堆积的 `AiOmniOps-backup-*` 备份目录，避免 `%LOCALAPPDATA%\\Programs` 长期被旧版本副本占满
- `docs/changes/2026-08-07-local-single-user-update-artifact-auto-cleanup.md`
  - 让 local-single-user 升级成功后自动清理 `updates/downloads`、解压目录和 `apply-runs` 临时目录，避免长期占满 C 盘
- `docs/changes/2026-08-07-douyin-runninghub-minimax-h3-fl2va-app-sync.md`
  - 把 3 个 MiniMax H3 FL2VA RunningHub 应用接入抖音工作台通用清单，并同步到 AI 智控中心 / MCP / Skill ZIP 说明
- `docs/changes/2026-08-07-local-single-user-semantic-version-auto-increment.md`
  - 把 local-single-user 主版本号从“固定读取 package.json 的 0.1.0”改为“每次发包自动递增 patch 版本”，并统一到 release manifest / latest.json / 当前安装态读取链路
- `docs/changes/2026-08-06-local-single-user-launcher-runtime-exit-debug-instrumentation.md`
  - 为 `local-single-user` 启动链补 runtime exit 调试埋点：记录 `killProcessTree` 的触发原因、child `exit`、健康检查超时和 runtime metadata 落盘后的进程快照，专门用于定位“服务明明启动成功过，但随后整套进程又消失”的问题
- `docs/changes/2026-08-06-version-update-status-priority-fix.md`
  - 修复版本与升级页面在已检测到新版本时，仍被上一次失败记录压成“升级失败”的状态优先级问题
- `docs/changes/2026-08-06-local-single-user-install-backup-lock-recovery.md`
  - 修复安装器在“备份旧安装目录”时只依赖 runtime metadata PID 停进程，导致旧安装目录仍被占用就直接失败的问题；新版安装器会额外扫描命中旧安装路径的进程并增加移动重试
- `docs/changes/2026-08-06-local-single-user-launcher-stale-lock-recovery.md`
  - 修复 `local-single-user-launcher.lock` 在异常退出后残留时，会把后续重启一直卡在“本地工作台正在启动中”的问题；新版 launcher 会自动清理 stale lock 并重新抢锁
- `docs/changes/2026-08-06-local-single-user-upgrade-runtime-verification-tightening.md`
  - 本地单机版升级验活从“只看 runtime metadata”收紧为“目标 releaseTag + API + Web”三重确认，并补充 updater trace；同时修正回滚后要按恢复版本验活，避免自动回滚被再次误判失败
- `docs/changes/2026-08-06-skill-center-sqlite-compatibility-fix.md`
  - 修复本地单机版 SQLite 环境下“个人中心 -> 技能中心”因 `user-skills` 模块执行 PostgreSQL 专用 SQL 而直接 `Internal server error` 的问题
- `docs/changes/2026-08-06-version-page-change-log-version-and-collapse.md`
  - 版本页系统更新日志补上版本号，并改为默认展开最新一条、历史记录可折叠的展示方式；同时明确当前顶部 `0.1.0` 来自根 `package.json` 版本号，热修包变化仍体现在 `releaseTag`
- `docs/changes/2026-08-04-local-single-user-install-autostart-fallback-fix.md`
  - 修复安装阶段计划任务自启动被系统拒绝时，fallback 到启动文件夹快捷方式却因 `stderr` 输出被 PowerShell 误判为安装失败的问题
- `docs/changes/2026-08-04-local-single-user-install-launch-ready-and-open-browser.md`
  - 安装脚本不再只在后台尝试拉起本地工作台后立即结束，而是会等待 API / Web 真正就绪，并由安装阶段明确打开页面；首启失败会在安装窗口里直接暴露
- `docs/changes/2026-08-04-local-single-user-update-health-check-and-auto-rollback.md`
  - `local-single-user` 升级链补上“受控重启 -> API / Web 验活 -> 失败自动回滚”闭环；installer 新增 `-NoLaunch` 受控模式，避免 installer 与 updater 双重拉起本地工作台
- `docs/changes/2026-08-03-version-page-log-focused-layout-and-oss-history.md`
  - 版本与升级页收口为“当前版本 / 最新版本”两张版本卡 + “系统更新日志”；OSS `latest.json` 同步补入 `appVersion` 与 `history`，后续更新记录可持续累积
- `docs/changes/2026-08-02-local-single-user-open-register-and-local-data-root.md`
  - 历史记录：曾将 `local-single-user` 安装态注册改为免邀请码，并在个人中心安全页补入本地资料目录设置；其中“免邀请码”口径已被 2026-08-10 新规则覆盖
- `docs/changes/2026-07-28-personal-center-version-update.md`
  - 个人中心新增“版本与升级”页：后端通过 `system/update/*` 检查 OSS `latest.json`、预下载并校验 `AiOmniOps-local-single-user-win-x64.zip`，安装态再通过独立 updater 执行本地替换与重启
- `docs/changes/2026-07-27-readme-install-guide-and-repo-slimming.md`
  - 把根 `README.md` 重写为安装和使用教程，明确说明当前仓库为什么没有 `.exe`，并清理根目录调试笔记、`.dbg/` 旧排障文件与误生成命令输出文件
- `docs/changes/2026-07-27-system-quote-workbook-script.md`
  - 把残留的报价清单生成脚本收口为可复用的仓库内辅助脚本：默认输出改到 `.runtime/generated/quote-workbooks/`，支持 `--output` 自定义路径，并在缺少 `openpyxl` 时给出明确安装提示
- `docs/changes/2026-07-27-deploy-secret-preflight-skip.md`
  - 新仓库首次接入自动部署时，若仓库级 ECS SSH Secrets 还未迁移完成，workflow 现在会先给出缺失项提示并跳过 deploy，而不是把环境未配置直接报成代码失败
- `docs/changes/2026-07-27-local-single-user-git-hygiene.md`
  - `local-single-user` 交付链进入真实打包与安装验证后，补齐 `.release/`、`*.tsbuildinfo`、`.dbg/trae-debug-log-*.ndjson` 与临时调试笔记的 Git 边界，避免无关产物继续混入同步提交
- `docs/changes/2026-07-27-local-single-user-release-installer-and-zip-package.md`
  - `local-single-user` 方案 A 交付链继续前推：在 release bundle 基础上补 `install-local-single-user` 安装入口、`local:release:package` 压缩打包脚本，以及 `.zip + .sha256` 分发制品
- `docs/changes/2026-07-27-local-single-user-release-bundle.md`
  - `local-single-user` 方案 A 交付链继续前推：新增发布物打包脚本、随包 `node.exe`、双击启动入口与 autostart 辅助入口，形成 `.release/local-single-user-win-x64` 目录
- `docs/changes/2026-07-27-local-single-user-web-runtime-isolation.md`
  - `local-single-user` 交付级启动链收口：将 live Web 进程切到 runtime 隔离运行包，避免源码目录 fresh `next build` 继续扰动正在服务用户的主站
- `docs/changes/2026-07-26-wechat-workflow-initialization-validation.md`
  - `local-single-user` 公众号工作台验证补点：确认 fallback 偏好不等于真实初始化，并继续把同一条 workflow 推进到生图、HTML、发布确认和页面级回显，当前正式发布只剩公众号官方配置阻塞
- `docs/changes/2026-07-26-local-single-user-launcher-prisma-db-push-reuse.md`
  - `local-single-user` launcher 启动链继续收口：为 `Local Prisma db push` 补上 runtime 绑定的受控复用，并修正主流程里一度出现的重复执行问题
- `docs/changes/2026-07-26-local-single-user-launcher-server-build-reuse.md`
  - `local-single-user` launcher 启动链收口：确认长步骤周期性报活仍保留，并补上 `server build` 的输入指纹复用与 `skip` 日志
- `docs/changes/2026-07-26-report-provider-fallback-brand-key-fix.md`
  - 报告类 Provider fallback 在缺品牌共享 Key 时被提前打断的修复记录；本轮已补到 `机会洞察总报告` 与 `品牌增长报告` 的真实成功验证
- `docs/changes/2026-07-23-local-single-user-phase-1-foundation.md`
  - `local-single-user` 第一阶段兼容改造：本地目录、SQLite、默认用户/品牌、认证旁路、launcher standalone Web 闭环与重复启动防抖、沙箱内自动跳过浏览器拉起、主导航路由验证、控制台噪音归因，以及 AI 智控中心、知识库、品牌知识桥接、用户技能、第三方平台配置等 SQLite 冷路径兼容修复
- `docs/local-single-user-availability-status.md`
  - 当前 live runtime 的功能可用性快照：launcher、核心工作台、AI 智控中心、RunningHub、direct-video、brand-growth 等板块的可用/部分可用状态表
- `docs/changes/2026-06-30-wechat-infrastructure-refactor-phase-5.md`
  - 公众号 Step 5 发布前收口下沉与 `WechatWorkflowPublishService`
- `docs/changes/2026-07-14-production-stability-remediation-phase-1.md`
  - 生产稳定性治理第一阶段：系统方案文档与运行时调试收口
- `docs/changes/2026-07-15-deploy-runner-build-offload.md`
  - 部署链治理第二阶段：将 `npm ci + build` 前移到 GitHub Runner
- `docs/changes/2026-06-30-wechat-infrastructure-refactor-phase-4.md`
  - 清理 `WorksService` 中历史遗留的公众号 HTML helper
- `docs/changes/2026-06-30-wechat-infrastructure-refactor-phase-3.md`
  - Step 4 覆盖率校验、规则渲染 fallback 与 HTML renderer service
- `docs/changes/2026-06-30-wechat-infrastructure-refactor-phase-2.md`
  - Step 2 canonical 正文正式接入与 Step 3/4 开始消费 canonical
- `docs/changes/2026-06-30-wechat-infrastructure-refactor-phase-1.md`
  - 公众号 canonical service 初始拆分与底层改造第一阶段
- `docs/2026-06-14-docs-audit-report.html`
  - 本轮系统文档全面清理、代码对照和删改结果总报告
- `docs/changes/2026-06-22-system-deep-dive-article-and-doc-index.md`
  - 技术与业务深度长文、文章目录资产与文档索引补充说明
- `docs/changes/2026-06-13-docs-baseline-cleanup.md`
  - 本轮文档清理、修复和删除说明
- `docs/changes/2026-06-16-douyin-ad-preaudit-and-vod-upload.md`
  - 抖音广告预审、作品区视频上传到 VOD、品牌默认配置与首屏加载修复说明
- `docs/changes/2026-06-19-douyin-remix-short-video-workspace.md`
  - 抖音独立复刻短视频板块、15 秒分段复刻流程、拼接成片与技能注册说明
- `docs/changes/2026-06-10-knowledge-binding-runtime-and-docs-sync.md`
  - 知识绑定从治理层进入运行时后的同步口径
- `docs/changes/2026-06-03-wechat-workspace-and-publishing.md`
  - 公众号工作台与发布链路
- `docs/changes/2026-06-03-design-workspace-real-data-and-provider-integration.md`
  - 设计工作台真实数据接入
- `docs/changes/2026-06-12-personal-center-overview-and-ai-control-center-phase-3.md`
  - 个人中心与 AI 智控中心 阶段收口
- `docs/changes/2026-10-05-s2-03-apis-connectors-workspace-hardening.md`
  - AI 智控中心 `接口与连接器配置` 收口为可用于接入与排障的工作台
- `docs/changes/2026-10-05-p1-01-content-customer-workspace-entry.md`
  - `内容获客` 顶层入口 `/tabs/content-customer` 直接切到统一真实工作台 `ContentAcquisitionWorkspace`
- `docs/changes/2026-10-05-p1-02-geo-workspace-entry.md`
  - `GEO 获客` 顶层入口 `/tabs/geo-customer` 直接切到统一真实工作台 `GeoWorkspaceShell`
- `docs/changes/2026-10-05-p1-03-omni-workspace-entry.md`
  - `全网获客` 顶层入口 `/tabs/omni-channel` 直接切到统一真实工作台 `AllNetworkGrowthWorkspaceShell`
- `docs/changes/2026-10-05-p1-04-paid-acquisition-workspace-entry.md`
  - `投流获客` 顶层入口 `/tabs/ad-traffic` 直接切到统一真实工作台 `PaidAcquisitionWorkspaceShell`
- `docs/changes/2026-10-05-p1-05-creator-cooperation-workspace-entry.md`
  - `达人合作` 顶层入口 `/tabs/daren-collab` 直接切到统一真实工作台 `CreatorCooperationWorkspaceShell`
- `docs/changes/2026-10-05-p2-01-global-overview-real-aggregation.md`
  - `全局概览` 从硬编码骨架切到 5 个业务板块真实工作区核心数据聚合页，不再展示静态 KPI、假时间线和假专家链路
- `docs/changes/2026-10-05-p2-02-global-overview-governance-signals.md`
  - `全局概览` 在 5 板块核心数之上补入跨板块最近任务动作与治理提醒，直接读取 `workflow-core` 任务账本和 `ontology-mapper outbox` 摘要



## 2026-10-22 素材发现与复用索引（357）

联查采集原作与素材档案，类型含音频、MIME优先且解码另验；产品/片段/版本/权益按品牌追加不可变索引修订。先筛选后分页，不自动全量入库；深度作品拆解留在内容获客。原MCP查询扩展与manage_brand_library维护共用服务，未知授权不推断。详见[素材索引契约](material-archive-index.md)。


## 2026-10-23 / 359 安装客户端更新

共用安装区六选项改为AI智控中心、WorkBuddy、豆包工作、千问办公、Codex、MCP地址；豆包表单与千问JSON分别展示，旧连接不撤销。客户端模板依据用户截图/官方协议，不能凭模板生成称原生客户端已接通；复制、脱敏、当前品牌与安装包需同源核验。见[变更与验证](changes/2026-10-23-openclaw-client-guides.md)。

## 2026-10-23 营销日历结构化

独立内容、完整当天列表、资料就绪、CAS/幂等/修订与真实交付引用；旧正文保留，保存不生成或发布。见[变更与接口契约](changes/2026-10-23-marketing-calendar-content.md)。

## 2026-10-24 巨量广告工作区

腾讯右侧增加巨量六工作区，品牌账户/分页快照/诊断/计划与ocean_* MCP动作共用服务；保存不执行广告，复用BusinessAsset无迁移。见[变更及接口契约](changes/2026-10-24-ocean-ads-workspace.md)。

- [拼多多店铺接入评估（2026-10-24，未实施）](integrations/pinduoduo-assessment-2026-10-24.md)

## 402 电商执行与修订

402新增：[电商运营执行与内容修订](changes/2026-10-27-commerce-operator-revision.md)，含六模块、真实能力限制、逐指标周期、指定页修订及测试。


404增量：电商目标按历史复算，独立广告投流/仅计广告费与ROI，逐指标历史/窗口状态，商品四步利益型创作。见[404变更](changes/2026-10-27-commerce-history-and-benefit-copy.md)。
