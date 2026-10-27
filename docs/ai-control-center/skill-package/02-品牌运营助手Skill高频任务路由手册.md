# 品牌运营助手 Skill 高频任务路由手册

## AI销售与私域复购（376）

私域复购已有AI销售`/tabs/private-repurchase/ai-sales`，配置在`/brand-admin/ai-sales`。优先读专用`ai-sales-operations`技能（页面可下载），通过manage_growth_reports的sales_*与payload.aiSales读写客户/企业、商机、跟进/草稿、服务/订单/复购、策略与复盘。WorkBuddy 3Chat当前13工具负责真实查询/确认后发送；没有客户/Agent配置写接口。核渠道归属、分页覆盖与真实证据，未知发送不重发，READY不当在线。新独立权限privateRepurchase.aiSales，子成员按品牌授权。策略保存不当发布，草稿不当已发，受理不当送达，聊天不当回款。



## 1. 统一执行顺序

除非用户已经明确给出非常具体的工具级意图，否则统一按下面顺序执行：

1. \`route_website_function_by_intent\`
2. \`get_website_function_execution_plan\`
3. 补齐缺失信息
4. 按计划里的工具顺序执行
5. 返回结论、关键结果、下一步建议

默认心法：

- 先路由，再执行
- 先摘要，再决定是否继续深挖
- 先读状态，再决定是否写入或发布

## 2. 高频任务路由

看当前品牌和最近任务：

- \`get_current_brand_context\`
- \`get_recent_tasks_summary\`
- \`get_failed_tasks_summary\`

看品牌档案、产品、竞品和行业资料：

- \`get_brand_archive_summary\`
- \`get_brand_products\`
- \`get_platform_accounts\`
- \`get_brand_competitor_accounts\`
- \`get_brand_industry_feeds\`

看第三方接口和共享密钥可用性：

- \`list_my_third_party_platforms\`
- \`check_my_third_party_platform_runtime_access\`
- \`update_my_third_party_platform_secret\`

安全规则：

- 只能返回遮罩状态和可用性
- 严禁返回明文 API Key
- 如果某平台已被确认可直供网站运行时或 AI 智控中心 使用，不要重复要求用户再发一次同样的明文密钥

看和改技能配置：

- \`get_skill_config_summary\`
- \`get_skill_config_detail\`
- \`update_skill_config\`
- \`reset_skill_to_platform_baseline\`

团队协作和邀请：

- \`list_brand_members\`
- \`list_brand_invites\`
- \`create_brand_invite_link\`
- \`accept_my_brand_invite\`

品牌增长报告、半年营销规划、营销策划：

- \`manage_growth_reports\`
- \`create_brand_growth_report\`
- \`create_half_year_marketing_plan\`

处理原则：

- 用户只说“做品牌增长报告”时，必须先由 WorkBuddy 全域增长策略专家团生成完整 Markdown 报告，再调用 \`create_brand_growth_report\` 上传归档；中台不生成报告正文
- \`create_brand_growth_report\` 必须携带 \`reportMarkdown\`，缺正文时不得空调用
- 用户只说“做营销方案 / 营销规划”时，优先让 \`manage_growth_reports\` 先做统一编排
- 用户明确只要某一份非品牌增长报告单体产物时，再走专用创建工具

小红书视频与草稿箱：

- \`manage_xiaohongshu_video\`
- \`create_xiaohongshu_mobile_draft_session\`
- \`create_xiaohongshu_desktop_draft_session\`

抖音视频、数字人、RunningHub、广告预审：

- \`manage_douyin_video_production\`

RunningHub 关键规则：

1. 先 \`list_apps\`
2. 再 \`get_app_detail\`
3. 从返回的 \`nodeInfoList\` 模板里回填参数
4. 最后 \`generate\`
5. 图片 / 音频 / 视频节点如果最终只剩 \`nodeId + fieldName\`，没有 \`fieldValue\`，也没有 \`upload\`，不要提交
6. 同一品牌下 RunningHub 默认按串行执行：上一个任务明确完成或失败后，再发下一个

当前可直接识别的 RunningHub 示例：

- \`minimax-h3-fl2va-text-to-video\`：文生视频
- \`minimax-h3-fl2va-first-frame-video\`：首帧参考生视频
- \`minimax-h3-fl2va-first-last-frame-video\`：首尾帧参考生视频
- \`minimax-h3-fl2va-multi-image-video\`：多图参考生视频
- \`minimax-h3-audio-clip-single-image-digital-human\`：音频裁剪驱动 MiniMax H3 数字人单图版
- \`minimax-h3-multi-image-2k-upscale-v3\`：4 步 Lora 超级加速多图生视频 + 2K 放大 V3
- \`minimax-h3-8step-image-to-video\`：8 步加速图生视频
- \`minimax-h3-4step-first-last-frame-video\`：4 步加速首尾帧生视频
- \`minimax-h3-accelerated-all-reference-video\`：全能参考视频
- \`minimax-h3-digital-human-auto\`：数字人口播 / 唱歌 / 电商讲解自动版
- \`seedance25-multimodal-video\`：Seedance 2.5 多模态视频
- \`seedance20-viral-video-remix\`：Seedance 2.0 复刻爆款视频
- \`seedance20-fast-all-reference-video\`：Seedance 2.0 Fast 全能生视频
- \`seedance20-fast-rh\`：Seedance 2.0 Fast RH 版
- \`qwen-image-chinese-font-design\`：中文字体设计图生图
- \`qwen-font-design-8step\`：Qwen 8 步加速字体设计

公众号工作流：

- \`manage_wechat_workflow\`
- 外部结果直写：\`set_article\`、\`set_images\`、\`set_html\`
- 继续网站生成：\`generate_article\`、\`generate_images\`、\`generate_html\`
- 发布前检查：\`rebuild_publish_config\`
- 正式发布：\`publish_workflow\`

关键规则：

- 外部已有结果时，不要再重复生成
- 正式发布属于高风险动作，默认先确认
- 如果用户只说“帮我把这篇文章发公众号”，先判断他是要新建工作流、直写外部结果，还是直接正式发布

设计工作台：

- \`get_design_workspace_options\`
- \`get_recent_design_works\`
- \`create_design_work\`

AI 智控中心 专区：

- 每周复盘：\`get_ai_control_center_lobster_diaries\`、\`create_ai_control_center_lobster_diary\`、\`update_ai_control_center_lobster_diary\`
- 策略优化记录：\`get_ai_control_center_strategy_optimizations\`、\`create_ai_control_center_strategy_optimization\`、\`update_ai_control_center_strategy_optimization\`
  - 仅用于 \`brand_growth / xiaohongshu / douyin / wechat\`
  - 不用于 GEO 关键词挖掘、网站诊断、知识库搭建、GEO优化方案
- 品牌增长里的【公域经营信息 / 私域经营信息 / 资源与约束 / 目标信息】4 张卡片，不走 `strategy_optimization`，而是走 `manage_brand_library action=upsert_survey`
  - 页面真源：`BrandSurvey surveyType=BRAND_ARCHIVE`
  - 必须传 `payload.answers=[{ key, label, value }]`
  - 固定 keys：
    - 公域：`publicXiaohongshuStatus / publicDouyinStatus / publicVideoChannelStatus / publicOtherPlatformsStatus`
    - 私域：`privateDomainInfrastructure / privateCommerceSystem / privateTagAutomation / privateLifecycleMetrics`
    - 资源与约束：`annualOrPhaseBudget / teamRoles / offlineStoreGuideTeam / erpCrmDataSystems / keyConstraints`
    - 目标：`next12MonthGoal / growthPriority / roiRequirement`
- 每日计划：\`get_ai_control_center_daily_plans\`、\`create_ai_control_center_daily_plan\`
- 音乐：\`create_volcengine_music_task\`、\`get_volcengine_music_task\`
- 创作素材：\`get_ai_control_center_creative_materials\`、\`create_ai_control_center_creative_material\`
- 视频作品：\`get_ai_control_center_video_works\`、\`create_ai_control_center_video_work\`
- 个人中心素材管理：\`list_personal_material_assets\`、\`get_local_material_storage_settings\`、\`update_local_material_storage_settings\`

处理原则：

- AI 智控中心 的创作素材、视频作品、GEO获客内容、全网获客评论名单与平台名单都是归档板块，不是生成引擎本身
- 音乐任务创建成功不代表最终完成，必须继续轮询结果
- 当用户要求“生成后直接沉淀到素材库”时，优先把归档动作一并完成
- 如果用户是在本地版安装态下上传网站素材，优先用 \`material_library_upload\` 把素材写入用户配置的本地素材库
- 如果素材来自 AI 智控中心 上传到网站或外部归档，继续用 \`ai_control_center_upload\`；这类素材不要求必须落在本地素材库里，但仍要进入四分类列表

GEO获客：

- \`get_ai_control_center_geo_visibility_reports\`
- \`create_ai_control_center_geo_visibility_report\`
- \`delete_ai_control_center_geo_visibility_report\`
- \`get_ai_control_center_geo_contents\`
- \`create_ai_control_center_geo_content\`
- \`delete_ai_control_center_geo_content\`
  - GEO 关键词挖掘、网站诊断、知识库搭建、GEO优化方案统一走这里保存与读取

全网获客：

- \`get_ai_control_center_comment_leads\`
- \`create_ai_control_center_comment_leads\`
- \`delete_ai_control_center_comment_lead\`
- \`get_ai_control_center_platform_leads\`
- \`create_ai_control_center_platform_leads\`
- \`delete_ai_control_center_platform_lead\`

## 3. 哪些场景应当回网页

默认回网页承接的场景：

- 高级·账号与安全
- AI 智控中心 安装中心里的可视化复制和安装操作
- 后台管理台
- 当前尚未开放 MCP 的纯页面浏览型能力
- 需要用户在网页中做最终人工确认的高风险纯页面流程

处理方式：

1. 先明确告诉用户这个功能属于哪个页面
2. 告诉用户为什么当前更适合在网页里处理
3. 如果 MCP 能先做摘要或预检查，先做摘要或预检查

## 4. 一句话结论

品牌运营助手要像一个网站总调度，而不是只会调几个孤立工具：先路由，再拿执行计划，再按域执行，不会做的明确说清楚并回网页。

## 营销日历独立内容（会话360）

“今天第七条”“这周十条排期”先用manage_growth_reports的calendar_get_day（payload.reportId/date/platform/contentId可筛选）；新建用calendar_create_version，已有条目用calendar_save_content，日期说明用calendar_save_day。必须读取当前revision，写入传expectedRevision及8—160字符idempotencyKey；断线重试复用同键同参，409重新读取，不自动覆盖。完整content schema随工具payload返回，文字默认空、列表默认[]，每日期最多50条、版本最多366天。

旧description保留，未结构化就说明待整理；不得把备选标题当独立内容，也不能无确认自动拆分210条。三平台共用品牌日历，返回链接按platform进入。逐条读取readiness/执行上下文：同SKU、素材可用、片段、使用范围及产品证据缺口保持未知；保存计划不启动图片/TTS/视频、不扣费或发布。接续制作需读取真实任务回执后关联actualTaskRef/finishedAssetRefs；审核与发布回执独立，人工链接不等于平台已核实发布。

版本/历史用calendar_revisions，恢复仅targetContentIds指定未来未执行内容，追加修订；已执行或过去内容不可覆盖。指标metrics绑定本内容成片及内容修订、来源/证据、自然流或投放与统计窗口；calendar_review同窗口比较，低样本不判赢家。完整契约见仓库docs/changes/2026-10-23-marketing-calendar-content.md；五元素O92/L56/F135/A181/I37。本轮仅数据/页面/接口验收，真实专家制作与原生客户端另验。

## 巨量广告（会话362，ocean-ads/1.0.0）

用户要求巨量/千川/本地推报表、诊断或优化计划时，先route_website_function_by_intent命中ocean_ads_workspace。用已有manage_growth_reports调用以下action，所有字段放payload.oceanAds，严格schema由tools/list返回。当前品牌自动取鉴权，不向用户索要技术路径。

1. ocean_get_workspace：可筛businessType(engine/qianchuan/local)、advertiserId、batchId、start/end；读本品牌映射/快照/诊断/计划/同步进度。
2. ocean_bind_account：品牌Owner/Admin确认真实账户归属，advertiserId为字符串、accountName、mappingEvidence、expectedRevision(初次0)、idempotencyKey；不把代理可读账户全部绑品牌。此动作不申请供应商授权。
3. 用当前广告连接器实时schema只读取已授权目标账户，保存业务族/事件/归因/窗口/币种/工具与技能版本证据；未知不填0。广告主报告是本地推；只读技能不能被要求启停或调价。
4. ocean_submit_batch：batchId、page/pageCount、reportType(engine_report/standard/universal/live_today/local_diagnosis)、grain、window{start,end,timezone:Asia/Shanghai}、currency(CNY/USD，金额元)、targetEvent、attribution、sourceEvidence、toolName、skillId/skillVersion、records，及idempotencyKey。每页500行、最多100页。record={externalId:string,name?,date,dimensions?:字符串字典,metrics:{spend?,impressions?,clicks?,conversions?,revenue?},rawMetrics?:原字段字典}，所有数值为非负十进制字符串。必须依据真实字段及单位映射；没返回的指标省略。千川目前只接受account粒度，live_today仅当日。每批同口径，不能混合标准/全域/直播或不同归因。
5. ocean_get_sync_status查询同批分页状态，缺页补原页；ocean_commit_batch传businessType/advertiserId/batchId/key，全部页齐且无重复才提交。写后ocean_get_workspace按batchId核hash/recordCount；断线沿用原键，异参换键。同页异数据需新批次；已提交批次不可追加。只补写，不重新查询已取得报表。
6. ocean_save_analysis：businessType/advertiserId/batchId、title/body、facts/inferences/unknowns数组、recommendation(keep/observe/suggest_pause)、skillId/skillVersion/sourceEvidence、key。冻结已提交快照hash；suggest_pause仅建议。
7. ocean_save_plan：businessType/advertiserId/analysisId、title/body/owner、dueDate/reviewDate、successMetric、status(proposed/adopted/in_progress/review/closed)、expectedRevision初次0、key；更新须planId与当前revision。可附productIds、本品牌materialRefs[{table:BusinessAsset或MediaAsset,recordId}]，计划修订追加留档。采纳/关闭均不代表平台已改或效果已达标。

示例首次读取：{action:"ocean_get_workspace",payload:{oceanAds:{businessType:"qianchuan"}}}。同键同参不重复写，409先读状态；数据库故障不回落虚构数据。当前中台不反向启动豆包或创建定时，无真实调用回执不能写“已投放/已暂停/自动同步成功”。广告连接器查询与中台归档分开，归档属于已有业务委托，不增加逐次审批租约。


## RunningHub 应用目录增补（2026-10-25）

新增 `seedance-mini-image-to-video`（Seedance Mini-图生视频+全节点注释），官方webappId `2069739201603661825`。通过 runninghub:list_apps / get_app_detail 读取本品牌实时参数，再按现有上传/生成/作品归档契约执行；不要自造节点或把示例图当真实输入。生成速度未实测，不因Mini名称承诺更快；参数请求15秒超时可重试读取，不自动重试付费生成。


## RunningHub 多参应用增补（2026-10-25）

新增 `seedance20-mini-multi-reference`（自用seedance2.0 Mini多参），webappId `2089757422163419137`。保留 `seedance-mini-image-to-video`。先读取实时应用模板，按既有本品牌上传、生成及作品归档契约执行；不根据名称猜节点，不把示例素材当用户输入，不承诺Mini更快，不自动重试收费生成。


## 有赞私域运营（378）

“私域运营/有赞会员/客户标签/一人千面”路由youzan-private-operations；先核品牌与店铺，private_get_workspace（manage_growth_reports，payload.privateOps），客户主档复用AI销售。战略→策略→执行分别保存读回，标签有来源/场景/有效期/版本，冲突或未知不做确定推荐。UNKNOWN沿原工具/请求恢复；只读有赞不能当已发券改价。具体对客由AI销售接3Chat，保留实际授权和回执。
