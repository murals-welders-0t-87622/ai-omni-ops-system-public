# 品牌运营助手 Skill MCP 工具矩阵

## AI销售与私域复购（376）

私域复购已有AI销售`/tabs/private-repurchase/ai-sales`，配置在`/brand-admin/ai-sales`。优先读专用`ai-sales-operations`技能（页面可下载），通过manage_growth_reports的sales_*与payload.aiSales读写客户/企业、商机、跟进/草稿、服务/订单/复购、策略与复盘。WorkBuddy 3Chat当前13工具负责真实查询/确认后发送；没有客户/Agent配置写接口。核渠道归属、分页覆盖与真实证据，未知发送不重发，READY不当在线。新独立权限privateRepurchase.aiSales，子成员按品牌授权。策略保存不当发布，草稿不当已发，受理不当送达，聊天不当回款。



## 1. 使用规则

这份文档是“高优先级 MCP 工具矩阵”，不是 219 个工具的完整逐条总表。

如果需要查看当前系统的全量业务语义口径，请继续参考：

- `docs/03-Ontology五元素候选全集.md`

如果需要核对 MCP 真源总数，请以 `OPENCLAW_MCP_TOOLS` 为准，当前口径为 219 个工具。

优先原则：

1. 先用网站功能路由工具判断归属域
2. 再从本矩阵里选对应工具
3. 尽量优先统一管理工具，不要把一条完整业务链拆成一堆零散动作

补充原则：

- 先看有没有统一管理工具，再决定是否拆成专用工具
- 先看有没有摘要型工具，再决定是否直接写入
- 对密钥、邀请、发布、删除类动作，默认先读后写

## 2. 功能路由与总入口

- \`get_website_function_catalog\`
- \`get_website_function_detail\`
- \`route_website_function_by_intent\`
- \`get_website_function_execution_plan\`

## 3. 核心工具带

品牌与档案：

- \`get_current_brand_context\`
- \`get_brand_products\`
- \`get_platform_accounts\`
- \`get_brand_archive_summary\`
- \`get_brand_competitor_accounts\`
- \`get_brand_industry_feeds\`

品牌资料库与增长：

- \`manage_brand_library\`
- \`manage_growth_reports\`
- \`get_opportunity_insight_workspace\`
- \`create_brand_growth_report\`
- \`create_half_year_marketing_plan\`
- \`get_brand_growth_visual_report_workspace\`
- \`generate_brand_growth_visual_report\`
- \`get_brand_growth_marketing_calendar_workspace\`
- \`generate_brand_growth_marketing_calendar\`
- \`update_brand_growth_marketing_calendar\`
- \`get_brand_growth_topic_library_workspace\`
- \`generate_brand_growth_topic_candidates\`
- \`update_brand_growth_topic_library\`
- \`create_brand_growth_topic_library_item\`
- \`update_brand_growth_topic_library_item\`
- \`delete_brand_growth_topic_library_item\`
- \`get_brand_growth_material_library_items\`

说明：\`create_brand_growth_report\` 只用于提交 WorkBuddy 已生成的 \`reportMarkdown\` 到【品牌增长报告】板块；中台不通过该工具生成报告正文。

任务与反馈：

- \`get_recent_tasks_summary\`
- \`get_failed_tasks_summary\`
- \`get_task_detail\`
- \`cancel_task\`
- \`retry_task\`

个人中心与团队：

- \`get_personal_center_overview\`
- \`list_personal_material_assets\`
- \`get_local_material_storage_settings\`
- \`update_local_material_storage_settings\`
- \`list_my_orders\`
- \`list_my_third_party_platforms\`
- \`check_my_third_party_platform_runtime_access\`
- \`update_my_third_party_platform_secret\`
- \`get_skill_config_summary\`
- \`get_skill_config_detail\`
- \`update_skill_config\`
- \`reset_skill_to_platform_baseline\`
- \`list_brand_members\`
- \`list_brand_invites\`
- \`create_brand_invite_link\`

小红书：

- \`create_xiaohongshu_original_note\`
- \`create_xiaohongshu_rewrite_note\`
- \`manage_xiaohongshu_video\`
- \`create_xiaohongshu_mobile_draft_session\`
- \`create_xiaohongshu_desktop_draft_session\`

抖音：

- \`create_douyin_original_copy\`
- \`create_douyin_remix_copy\`
- \`manage_douyin_video_production\`
- \`create_douyin_mobile_publish_session\`
- \`create_douyin_desktop_publish_session\`

公众号：

- \`manage_wechat_workflow\`
- \`get_wechat_workflow_sessions\`
- \`check_wechat_workflow_publish_readiness\`
- \`publish_wechat_workflow\`
- \`retry_wechat_publish_history\`

设计工作台：

- \`get_design_workspace_options\`
- \`get_recent_design_works\`
- \`create_design_work\`

AI 智控中心：

- \`get_ai_control_center_daily_plans\`
- \`get_ai_control_center_strategy_optimizations\`
- \`create_ai_control_center_daily_plan\`
- \`get_ai_control_center_lobster_diaries\`
- \`create_ai_control_center_lobster_diary\`
- \`update_ai_control_center_lobster_diary\`
- \`create_ai_control_center_strategy_optimization\`
- \`update_ai_control_center_strategy_optimization\`
- \`create_volcengine_music_task\`
- \`get_volcengine_music_task\`
- \`get_ai_control_center_creative_materials\`
- \`create_ai_control_center_creative_material\`
- \`get_ai_control_center_video_works\`
- \`create_ai_control_center_video_work\`

素材管理补充：

- \`list_personal_material_assets\`：读取个人中心四分类素材列表
- \`get_local_material_storage_settings\`：查看本地素材库存储目录与命名规则
- \`update_local_material_storage_settings\`：更新本地素材库存储根目录，并自动创建 \`素材库/文本|图片|语音|视频\`
- \`create_ai_control_center_creative_material\` 支持 \`sourceKind\`：
  - \`material_library_upload\`：网站上传并写入本地素材库
  - \`ai_control_center_upload\`：AI 智控中心 上传或外部归档素材

GEO获客：

- \`get_ai_control_center_geo_visibility_reports\`
- \`create_ai_control_center_geo_visibility_report\`
- \`delete_ai_control_center_geo_visibility_report\`
- \`get_ai_control_center_geo_contents\`
- \`create_ai_control_center_geo_content\`
- \`delete_ai_control_center_geo_content\`

全网获客：

- \`get_ai_control_center_comment_leads\`
- \`create_ai_control_center_comment_leads\`
- \`delete_ai_control_center_comment_lead\`
- \`get_ai_control_center_platform_leads\`
- \`create_ai_control_center_platform_leads\`
- \`delete_ai_control_center_platform_lead\`

## 4. 统一优先级

优先使用的统一管理工具：

1. \`manage_brand_library\`
2. \`manage_growth_reports\`
3. \`manage_wechat_workflow\`
4. \`manage_xiaohongshu_video\`
5. \`manage_douyin_video_production\`

什么时候用直连工具：

- 用户目标非常明确
- 不需要先走复杂工作流
- 统一工具之外有更短的专用链路
- 用户已经给出了完整输入，不必再经过多步工作流

什么时候先做页面承接：

- 当前没有直连 MCP
- 风险很高且需要用户在网页里做最终人工确认
- 结果更适合网页可视化查看，而不是对话里展开
- 当前属于 AI 智控中心 安装、账号安全或后台管理等纯页面承接场景

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


## 有赞私域运营（378）

“私域运营/有赞会员/客户标签/一人千面”路由youzan-private-operations；先核品牌与店铺，private_get_workspace（manage_growth_reports，payload.privateOps），客户主档复用AI销售。战略→策略→执行分别保存读回，标签有来源/场景/有效期/版本，冲突或未知不做确定推荐。UNKNOWN沿原工具/请求恢复；只读有赞不能当已发券改价。具体对客由AI销售接3Chat，保留实际授权和回执。
