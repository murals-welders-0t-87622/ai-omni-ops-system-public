# 03 - Ontology 五元素候选全集

## AI销售与私域复购（376）

私域复购已有AI销售`/tabs/private-repurchase/ai-sales`，配置在`/brand-admin/ai-sales`。优先读专用`ai-sales-operations`技能（页面可下载），通过manage_growth_reports的sales_*与payload.aiSales读写客户/企业、商机、跟进/草稿、服务/订单/复购、策略与复盘。WorkBuddy 3Chat当前13工具负责真实查询/确认后发送；没有客户/Agent配置写接口。核渠道归属、分页覆盖与真实证据，未知发送不重发，READY不当在线。新独立权限privateRepurchase.aiSales，子成员按品牌授权。策略保存不当发布，草稿不当已发，受理不当送达，聊天不当回款。



## 1. 当前口径

- atlas：137
- system supplement：62
- MCP tools：219
- unified catalog total：418

说明：当前系统对外统一使用这一份 `418` 项候选全集。表格中的 `status=active_seed` 仅表示元素来源成熟度，不再代表另一套单独的画布/字典入口。

## 2. 类型统计

- Object：78
- Link：44
- Function：118
- Action：156
- Interface：22

## 3. 全量清单

| ID | 类型 | 状态 | 名称 | 说明 | 来源 | 主要使用板块 | 绑定 |
|---|---|---|---|---|---|---|---|
| A01 | Action | active_seed | 补全品牌与产品资料 | 对业务数据、状态或外部系统造成可记录的变化；品牌增长里的【公域经营信息 / 私域经营信息 / 资源与约束 / 目标信息】4 张卡片也归这条链，固定走 `manage_brand_library:upsert_survey`，不走 `create_ai_control_center_strategy_optimization`。 | manage_brand_library：update_background/update_ip_library/create_product/upsert_survey 等 |  | manage_brand_library：update_background/update_ip_library/create_product/upsert_survey 等 |
| A02 | Action | active_seed | 启动采集／刷新来源数据 | 对业务数据、状态或外部系统造成可记录的变化。 | sync_douyin_* / sync_xiaohongshu_* / sync_wechat_* |  | sync_douyin_* / sync_xiaohongshu_* / sync_wechat_* |
| A03 | Action | active_seed | 保存策略、增长报告和营销日历 | 对业务数据、状态或外部系统造成可记录的变化。 | manage_growth_reports / create_openclaw_marketing_plan |  | manage_growth_reports / create_openclaw_marketing_plan |
| A04 | Action | active_seed | 新增／修订选题 | 对业务数据、状态或外部系统造成可记录的变化。 | create_brand_growth_topic_library_item / update_brand_growth_topic_library_item |  | create_brand_growth_topic_library_item / update_brand_growth_topic_library_item |
| A05 | Action | active_seed | 提交每日计划／选题报告 | 对业务数据、状态或外部系统造成可记录的变化，保存当天执行计划的 HTML 正文与摘要。 | create_ai_control_center_daily_plan |  | create_ai_control_center_daily_plan |
| A06 | Action | active_seed | 登记创作包或素材 | 对业务数据、状态或外部系统造成可记录的变化。 | create_ai_control_center_creative_material |  | create_ai_control_center_creative_material |
| A07 | Action | active_seed | 提交设计／图像生成 | 对业务数据、状态或外部系统造成可记录的变化。 | create_design_work |  | create_design_work |
| A08 | Action | active_seed | 提交语音、口型或视频作业 | 对业务数据、状态或外部系统造成可记录的变化。 | manage_douyin_video_production：generate/create_speech_task等 |  | manage_douyin_video_production：generate/create_speech_task等 |
| A09 | Action | active_seed | 归档视频成品 | 对业务数据、状态或外部系统造成可记录的变化。 | create_ai_control_center_video_work |  | create_ai_control_center_video_work |
| A10 | Action | candidate | 登记原创／二创笔记 | 对业务数据、状态或外部系统造成可记录的变化。 | create_xiaohongshu_original_note / create_xiaohongshu_rewrite_note |  | create_xiaohongshu_original_note / create_xiaohongshu_rewrite_note |
| A100 | Action | candidate | delete_ai_control_center_lobster_diary | 删除指定板块下的一篇每周复盘。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_lobster_diary | AI 智控中心 专区 | delete_ai_control_center_lobster_diary |
| A101 | Action | candidate | create_ai_control_center_marketing_plan | 为当前品牌指定板块上传一条 HTML 营销策划方案。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_marketing_plan | AI 智控中心 专区 | create_ai_control_center_marketing_plan |
| A102 | Action | candidate | delete_ai_control_center_marketing_plan | 删除指定板块下的一条营销策划方案。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_marketing_plan | AI 智控中心 专区 | delete_ai_control_center_marketing_plan |
| A103 | Action | candidate | create_ai_control_center_explosive_analysis | 为当前品牌指定板块创建一条爆款拆解记录。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_explosive_analysis | AI 智控中心 专区 / 品牌增长 | create_ai_control_center_explosive_analysis |
| A104 | Action | candidate | delete_ai_control_center_explosive_analysis | 删除指定板块下的一条爆款拆解。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_explosive_analysis | AI 智控中心 专区 / 品牌增长 | delete_ai_control_center_explosive_analysis |
| A105 | Action | candidate | create_ai_control_center_strategy_optimization | 为当前品牌在 brand_growth、xiaohongshu、douyin、wechat 板块创建一条策略优化记录；GEO 关键词挖掘等内容请改用 create_ai_control_center_geo_content。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_strategy_optimization | AI 智控中心 专区 | create_ai_control_center_strategy_optimization |
| A106 | Action | candidate | update_ai_control_center_strategy_optimization | 更新当前品牌在 brand_growth、xiaohongshu、douyin、wechat 板块下的一条策略优化记录。 | OPENCLAW_MCP_TOOLS:update_ai_control_center_strategy_optimization | AI 智控中心 专区 | update_ai_control_center_strategy_optimization |
| A107 | Action | candidate | delete_ai_control_center_strategy_optimization | 删除当前品牌在 brand_growth、xiaohongshu、douyin、wechat 板块下的一条策略优化记录。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_strategy_optimization | AI 智控中心 专区 | delete_ai_control_center_strategy_optimization |
| A108 | Action | candidate | create_ai_control_center_daily_plan | 为当前品牌指定板块创建一篇每日 HTML 计划，可同时保留文本摘要。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_daily_plan | AI 智控中心 专区 | create_ai_control_center_daily_plan |
| A109 | Action | candidate | delete_ai_control_center_daily_plan | 删除指定板块下的一篇每日计划。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_daily_plan | AI 智控中心 专区 | delete_ai_control_center_daily_plan |
| A11 | Action | active_seed | 创建或更新公众号工作流内容 | 对业务数据、状态或外部系统造成可记录的变化。 | manage_wechat_workflow：create_workflow/set_article/set_html/set_images/set_publish_config等 |  | manage_wechat_workflow：create_workflow/set_article/set_html/set_images/set_publish_config等 |
| A110 | Action | candidate | create_volcengine_music_task | 调用火山音乐后付费接口创建音乐任务，可生成带人声歌曲或纯音乐 BGM。创建后请再调用 get_volcengine_music_task 轮询结果；如果要沉淀到 AI 智控中心 创作素材，建议在查询成功后再保存。 | OPENCLAW_MCP_TOOLS:create_volcengine_music_task | AI 智控中心 专区 / 任务治理 | create_volcengine_music_task |
| A111 | Action | candidate | request_ai_control_center_ontology_expert_source_writeback | 提交 Ontology published_contract 同步到专家源 Markdown 的写回确认闸请求。工具会重新从正式契约生成候选稿并校验 Diff SHA、候选 SHA、写前快照、可写挂载和用户授权；当前总闸只返回阻断证据，不直接写 WorkBuddy 真源。 | OPENCLAW_MCP_TOOLS:request_ai_control_center_ontology_expert_source_writeback | AI 智控中心 专区 / Ontology | request_ai_control_center_ontology_expert_source_writeback |
| A112 | Action | candidate | record_ai_control_center_ontology_execution_plan_evidence | 把已读取的 Ontology 执行前路由计划记录到任务治理账本，作为 WorkBuddy 开工前的确认/留证。该工具只写执行前证据，不创建任务、不调用 AI、不触发业务执行、不写专家真源。 | OPENCLAW_MCP_TOOLS:record_ai_control_center_ontology_execution_plan_evidence | AI 智控中心 专区 / Ontology | record_ai_control_center_ontology_execution_plan_evidence |
| A113 | Action | candidate | record_ai_control_center_ontology_node_execution_evidence | 记录 WorkBuddy 已按 Ontology 正式路线图推进到某个节点的受控执行证据。该工具默认会按 published_contract 与节点类型自动判断 confirmation gate；若节点需要确认闸且未确认，只能记录 blocked。该工具只写任务治理证据，不自动调用 AI、不自动调用工具、不写专家真源。 | OPENCLAW_MCP_TOOLS:record_ai_control_center_ontology_node_execution_evidence | AI 智控中心 专区 / Ontology | record_ai_control_center_ontology_node_execution_evidence |
| A114 | Action | candidate | record_ai_control_center_material_reuse_evidence | 记录 WorkBuddy Agent 已在某个任务/阶段/动作中复用了哪些统一素材档案。通常在 search_ai_control_center_asset_archive 选中素材后调用；该工具只写任务治理证据，不创建素材、不生成内容、不发布。 | OPENCLAW_MCP_TOOLS:record_ai_control_center_material_reuse_evidence | AI 智控中心 专区 / 统一素材管理 | record_ai_control_center_material_reuse_evidence |
| A115 | Action | candidate | create_ai_control_center_creative_material | 为当前品牌指定板块保存一条创作素材，可保存文本、图片、视频、语音或 BGM 等结果。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_creative_material | AI 智控中心 专区 / 统一素材管理 | create_ai_control_center_creative_material |
| A116 | Action | candidate | delete_ai_control_center_creative_material | 删除指定板块下的一条创作素材。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_creative_material | AI 智控中心 专区 / 统一素材管理 | delete_ai_control_center_creative_material |
| A117 | Action | candidate | create_ai_control_center_video_work | 为当前品牌指定板块保存一条最终视频作品，可附带标题、描述、脚本、封面和视频地址。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_video_work | AI 智控中心 专区 | create_ai_control_center_video_work |
| A118 | Action | candidate | delete_ai_control_center_video_work | 删除指定板块下的一条视频作品。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_video_work | AI 智控中心 专区 | delete_ai_control_center_video_work |
| A119 | Action | candidate | create_ai_control_center_video_work_douyin_desktop_publish_session | 为指定 AI 智控中心 视频作品创建抖音电脑端发布会话，便于通过浏览器扩展自动填充发布信息。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_video_work_douyin_desktop_publish_session | AI 智控中心 专区 / 内容获客 | create_ai_control_center_video_work_douyin_desktop_publish_session |
| A12 | Action | active_seed | 提交公众号草稿／发布请求 | 对业务数据、状态或外部系统造成可记录的变化。 | publish_wechat_workflow / manage_wechat_workflow发布类action |  | publish_wechat_workflow / manage_wechat_workflow发布类action |
| A120 | Action | candidate | create_ai_control_center_geo_visibility_report | 为当前品牌指定板块保存一份 GEO 可见度诊断 HTML 报告。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_geo_visibility_report | GEO获客 | create_ai_control_center_geo_visibility_report |
| A121 | Action | candidate | delete_ai_control_center_geo_visibility_report | 删除指定板块下的一份 GEO 可见度诊断报告。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_geo_visibility_report | GEO获客 | delete_ai_control_center_geo_visibility_report |
| A122 | Action | candidate | create_ai_control_center_geo_content | 为当前品牌 GEO 工作台保存关键词挖掘、网站诊断、知识库搭建、GEO优化方案、自媒体内容、第三方媒体或品牌网站等结果，支持 HTML 与非 HTML 附件存储地址。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_geo_content | GEO获客 | create_ai_control_center_geo_content |
| A123 | Action | candidate | delete_ai_control_center_geo_content | 删除指定板块下的一条 GEO 工作流内容。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_geo_content | GEO获客 | delete_ai_control_center_geo_content |
| A124 | Action | candidate | sync_ai_control_center_third_party_media_delivery_resources | 继续同步软文街下一页媒体到 GEO 第三方媒体投放缓存库，不覆盖历史缓存；同步后仍按站内 20 条分页和搜索结果返回。若同步报软文街鉴权失败，先检查个人中心里当前品牌保存的软文街登录账号和登录密码是否还是最新可用值。 | OPENCLAW_MCP_TOOLS:sync_ai_control_center_third_party_media_delivery_resources | AI 智控中心 | sync_ai_control_center_third_party_media_delivery_resources |
| A125 | Action | candidate | create_ai_control_center_comment_leads | 把品牌增长策略里小红书和抖音评论用户提取结果收口为评论获客列表，可选择平台、作品链接、关键词，并支持先补拉评论。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_comment_leads | 全网获客 | create_ai_control_center_comment_leads |
| A126 | Action | candidate | delete_ai_control_center_comment_lead | 删除全网获客工作台中的一条评论获客记录。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_comment_lead | 全网获客 | delete_ai_control_center_comment_lead |
| A127 | Action | candidate | create_ai_control_center_platform_leads | 把平台名单直接写入全网获客工作台的平台获客列表。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_platform_leads | 全网获客 / 个人中心 | create_ai_control_center_platform_leads |
| A128 | Action | candidate | delete_ai_control_center_platform_lead | 删除全网获客工作台中的一条平台获客记录。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_platform_lead | 全网获客 / 个人中心 | delete_ai_control_center_platform_lead |
| A129 | Action | candidate | create_ai_control_center_tencent_ad_lead | 把腾讯投流获客内容写入投流获客工作台。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_tencent_ad_lead | 投流获客 | create_ai_control_center_tencent_ad_lead |
| A13 | Action | active_seed | 保存复盘与优化记录 | 对业务数据、状态或外部系统造成可记录的变化。 | create_ai_control_center_lobster_diary / create_ai_control_center_strategy_optimization |  | create_ai_control_center_lobster_diary / create_ai_control_center_strategy_optimization |
| A130 | Action | candidate | delete_ai_control_center_tencent_ad_lead | 删除投流获客工作台中的一条腾讯投流获客记录。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_tencent_ad_lead | 投流获客 | delete_ai_control_center_tencent_ad_lead |
| A131 | Action | candidate | create_ai_control_center_creator_matches | 把达人结果池中的达人写入达人匹配列表，并补充推荐理由。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_creator_matches | 达人合作 | create_ai_control_center_creator_matches |
| A132 | Action | candidate | delete_ai_control_center_creator_matches | 批量删除达人匹配列表中的记录。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_creator_matches | 达人合作 | delete_ai_control_center_creator_matches |
| A133 | Action | candidate | move_ai_control_center_creator_matches_to_tracking | 把达人匹配列表中的达人加入达人跟踪。 | OPENCLAW_MCP_TOOLS:move_ai_control_center_creator_matches_to_tracking | 达人合作 | move_ai_control_center_creator_matches_to_tracking |
| A134 | Action | candidate | create_ai_control_center_creator_tracking_records | 直接把达人结果池中的达人建档到达人跟踪列表。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_creator_tracking_records | 达人合作 | create_ai_control_center_creator_tracking_records |
| A135 | Action | candidate | delete_ai_control_center_creator_tracking_record | 删除达人跟踪中的一位达人及其合作作品记录。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_creator_tracking_record | 达人合作 | delete_ai_control_center_creator_tracking_record |
| A136 | Action | candidate | create_ai_control_center_creator_tracking_work | 给某位达人新增合作作品，并抓取首轮抖音作品数据与自动更新周期。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_creator_tracking_work | 达人合作 | create_ai_control_center_creator_tracking_work |
| A137 | Action | candidate | update_ai_control_center_creator_tracking_work | 更新合作作品的结果评估、再次选择、自动更新周期，或立即刷新作品数据。 | OPENCLAW_MCP_TOOLS:update_ai_control_center_creator_tracking_work | 达人合作 | update_ai_control_center_creator_tracking_work |
| A138 | Action | candidate | delete_ai_control_center_creator_tracking_work | 删除某位达人下的一条合作作品记录。 | OPENCLAW_MCP_TOOLS:delete_ai_control_center_creator_tracking_work | 达人合作 | delete_ai_control_center_creator_tracking_work |
| A139 | Action | candidate | create_xiaohongshu_rewrite_note | 基于素材库中的对标作品触发小红书二创图文生成。 | OPENCLAW_MCP_TOOLS:create_xiaohongshu_rewrite_note | 小红书 / 内容获客 | create_xiaohongshu_rewrite_note |
| A14 | Action | active_seed | 保存GEO诊断与内容交付 | 对业务数据、状态或外部系统造成可记录的变化。 | create_ai_control_center_geo_visibility_report / create_ai_control_center_geo_content |  | create_ai_control_center_geo_visibility_report / create_ai_control_center_geo_content |
| A140 | Action | candidate | create_xiaohongshu_original_note | 触发小红书原创图文生成。 | OPENCLAW_MCP_TOOLS:create_xiaohongshu_original_note | 小红书 / 内容获客 | create_xiaohongshu_original_note |
| A141 | Action | candidate | create_wechat_article | 触发公众号文章草稿生成。 | OPENCLAW_MCP_TOOLS:create_wechat_article | 内容获客 | create_wechat_article |
| A142 | Action | candidate | manage_wechat_workflow | 统一管理公众号工作流，支持偏好、工作流创建、Step 2-4 直写与生成、发布确认、正式发布和删除；当前可在 create_workflow / update_input 的 payload.accountId 中显式绑定目标公众号账号，后续发布确认与正式发布都会按该账号读取 AppID、AppSecret 和 IP 白名单。其中 set_article 未显式传 inputType 时会按正文内容自动识别 plain-text/markdown/html，set_images 除了直接传图片 URL 外，也支持在 coverImage / bodyImages 里传 fileUrl、materialId，或通过 upload.fileName / contentType / dataBase64 直传图片文件，set_html 代表外部已给出完整 HTML 草稿，generate_html 代表系统基于正文 canonical、图片资产与风格规则重新渲染，并产出可直接发布到公众号正文的 HTML 片段。 | OPENCLAW_MCP_TOOLS:manage_wechat_workflow | 内容获客 | manage_wechat_workflow |
| A143 | Action | candidate | manage_brand_library | 统一管理品牌资料库，支持品牌背景、IP资料库、产品、问卷、账号、行业资料、业务资产、知识库和飞书绑定。品牌增长里的【公域经营信息 / 私域经营信息 / 资源与约束 / 目标信息】4 张卡片固定写到 `action=upsert_survey`。 | OPENCLAW_MCP_TOOLS:manage_brand_library | 品牌增长 | manage_brand_library |
| A144 | Action | candidate | manage_growth_reports | 统一管理品牌增长报告链路，支持增长报告、可视化增长报告、半年营销规划、小红书/抖音营销策划、热点选题和营销日历。内容获客某书/某音/某号/公众号的营销日历也复用这组能力。 | OPENCLAW_MCP_TOOLS:manage_growth_reports | 品牌增长 | manage_growth_reports |
| A145 | Action | candidate | manage_xiaohongshu_video | 统一管理小红书视频笔记，支持列表、模型选项、生成、故事板重生、继续生成、找回结果、编辑和删除。 | OPENCLAW_MCP_TOOLS:manage_xiaohongshu_video | 小红书 / 内容获客 | manage_xiaohongshu_video |
| A146 | Action | candidate | manage_douyin_video_production | 统一管理抖音视频生产，覆盖普通视频、直接生视频、混剪短视频、数字人、口型驱动、RunningHub 和广告预审。调用数字人试听前，应先列出公共语音库或自定义音色拿到 voiceId；调用 RunningHub generate 前，应先用 get_app_detail 读取应用 nodeInfoList 模板。 | OPENCLAW_MCP_TOOLS:manage_douyin_video_production | 抖音 / 内容获客 | manage_douyin_video_production |
| A147 | Action | candidate | add_douyin_work_to_material_library | 把抖音对标作品、搜索作品或榜单作品加入统一素材库。 | OPENCLAW_MCP_TOOLS:add_douyin_work_to_material_library | 品牌增长 / 统一素材管理 / 内容获客 | add_douyin_work_to_material_library |
| A148 | Action | candidate | add_wechat_article_to_material_library | 把公众号对标文章或微信搜一搜文章加入统一素材库。 | OPENCLAW_MCP_TOOLS:add_wechat_article_to_material_library | 品牌增长 / 统一素材管理 / 内容获客 | add_wechat_article_to_material_library |
| A149 | Action | candidate | remove_xiaohongshu_note_from_material_library | 把小红书对标作品或搜索笔记从统一素材库中移除。 | OPENCLAW_MCP_TOOLS:remove_xiaohongshu_note_from_material_library | 品牌增长 / 统一素材管理 / 内容获客 | remove_xiaohongshu_note_from_material_library |
| A15 | Action | active_seed | 建立／更新知识库内容与绑定 | 对业务数据、状态或外部系统造成可记录的变化。 | create_knowledge_base / upload_knowledge_base_files / manage_brand_library |  | create_knowledge_base / upload_knowledge_base_files / manage_brand_library |
| A150 | Action | candidate | remove_douyin_work_from_material_library | 把抖音作品从统一素材库中移除。 | OPENCLAW_MCP_TOOLS:remove_douyin_work_from_material_library | 品牌增长 / 统一素材管理 / 内容获客 | remove_douyin_work_from_material_library |
| A151 | Action | candidate | sync_wechat_brand_accounts | 绑定或同步品牌资料库里的公众号账号，需要提供 ghUsername。 | OPENCLAW_MCP_TOOLS:sync_wechat_brand_accounts | 品牌增长 / 内容获客 | sync_wechat_brand_accounts |
| A152 | Action | candidate | delete_wechat_brand_account | 删除品牌资料库里的公众号账号绑定。 | OPENCLAW_MCP_TOOLS:delete_wechat_brand_account | 品牌增长 / 内容获客 | delete_wechat_brand_account |
| A153 | Action | candidate | fetch_wechat_brand_articles | 抓取指定品牌公众号的历史文章列表，对应页面里的“提交”动作。 | OPENCLAW_MCP_TOOLS:fetch_wechat_brand_articles | 品牌增长 / 内容获客 | fetch_wechat_brand_articles |
| A154 | Action | candidate | sync_wechat_benchmark_articles | 同步品牌资料库里公众号对标文章数据，需要提供文章链接。 | OPENCLAW_MCP_TOOLS:sync_wechat_benchmark_articles | 品牌增长 / 内容获客 | sync_wechat_benchmark_articles |
| A155 | Action | candidate | update_wechat_benchmark_article_stats | 更新一篇公众号对标文章的阅读量、点赞数、分享数、收藏数、评论数、喜欢数。 | OPENCLAW_MCP_TOOLS:update_wechat_benchmark_article_stats | 品牌增长 / 内容获客 | update_wechat_benchmark_article_stats |
| A156 | Action | candidate | sync_wechat_search_articles | 同步品牌资料库里微信搜一搜数据，需要提供搜索关键词。 | OPENCLAW_MCP_TOOLS:sync_wechat_search_articles | 品牌增长 / 内容获客 | sync_wechat_search_articles |
| A157 | Action | candidate | update_wechat_search_item_stats | 更新一条微信搜一搜结果的阅读量、点赞数、分享数、收藏数、评论数、喜欢数。 | OPENCLAW_MCP_TOOLS:update_wechat_search_item_stats | 品牌增长 / 内容获客 | update_wechat_search_item_stats |
| A158 | Action | candidate | update_wechat_article_stats | 兼容旧用法：根据公众号文章链接更新对标文章数据。 | OPENCLAW_MCP_TOOLS:update_wechat_article_stats | 内容获客 | update_wechat_article_stats |
| A159 | Action | candidate | delete_xhs_collected_note | 删除小红书采集的对标作品或搜索笔记。 | OPENCLAW_MCP_TOOLS:delete_xhs_collected_note | 品牌增长 / 内容获客 | delete_xhs_collected_note |
| A16 | Action | candidate | 提交多平台内容分发 | 对业务数据、状态或外部系统造成可记录的变化。 | geo-publish-expert：yxer validate → dry-run → publish |  | geo-publish-expert：yxer validate → dry-run → publish |
| A160 | Action | candidate | delete_douyin_collected_work | 删除抖音采集的竞品作品、对标作品、搜索作品或榜单作品。 | OPENCLAW_MCP_TOOLS:delete_douyin_collected_work | 品牌增长 / 内容获客 | delete_douyin_collected_work |
| A161 | Action | candidate | extract_douyin_work_transcript | 为抖音采集作品提取视频文案；当前默认走本地 ASR 链路：Paraformer 主识别，Whisper 兜底。 | OPENCLAW_MCP_TOOLS:extract_douyin_work_transcript | 品牌增长 / 内容获客 | extract_douyin_work_transcript |
| A162 | Action | candidate | delete_wechat_collected_article | 删除公众号采集的品牌文章、对标文章或微信搜一搜文章。 | OPENCLAW_MCP_TOOLS:delete_wechat_collected_article | 品牌增长 / 内容获客 | delete_wechat_collected_article |
| A17 | Action | candidate | 提交媒体刊发或网站变更 | 对业务数据、状态或外部系统造成可记录的变化。 | 第三方媒体delivery接口；官网/CMS连接器需核验 |  | 第三方媒体delivery接口；官网/CMS连接器需核验 |
| A18 | Action | active_seed | 提取评论候选线索入库 | 对业务数据、状态或外部系统造成可记录的变化。 | create_ai_control_center_comment_leads |  | create_ai_control_center_comment_leads |
| A19 | Action | candidate | 保存企业／平台获客名单 | 对业务数据、状态或外部系统造成可记录的变化。 | create_ai_control_center_platform_leads |  | create_ai_control_center_platform_leads |
| A20 | Action | candidate | 处理重复线索 | 对业务数据、状态或外部系统造成可记录的变化。 | 文档现用get_ai_control_center_comment_leads + delete_ai_control_center_comment_lead |  | 文档现用get_ai_control_center_comment_leads + delete_ai_control_center_comment_lead |
| A21 | Action | active_seed | 提交达人深抓并保存匹配 | 对业务数据、状态或外部系统造成可记录的变化。 | create_douyin_creator_deep_fetch_tasks / create_ai_control_center_creator_matches |  | create_douyin_creator_deep_fetch_tasks / create_ai_control_center_creator_matches |
| A22 | Action | active_seed | 建立合作跟踪及作品 | 对业务数据、状态或外部系统造成可记录的变化。 | create_ai_control_center_creator_tracking_records / create_ai_control_center_creator_tracking_work |  | create_ai_control_center_creator_tracking_records / create_ai_control_center_creator_tracking_work |
| A23 | Action | active_seed | 刷新作品并登记评估 | 对业务数据、状态或外部系统造成可记录的变化。 | update_ai_control_center_creator_tracking_work |  | update_ai_control_center_creator_tracking_work |
| A24 | Action | active_seed | 保存广告策划或复盘 | 对业务数据、状态或外部系统造成可记录的变化。 | create_ai_control_center_tencent_ad_lead |  | create_ai_control_center_tencent_ad_lead |
| A25 | Action | candidate | 创建／调整广告及投放配置 | 对业务数据、状态或外部系统造成可记录的变化。 | tencentads-delivery-standard-create；管理脚本的add/update/delete |  | tencentads-delivery-standard-create；管理脚本的add/update/delete |
| A26 | Action | active_seed | 提交阶段产物与验收决定 | 对业务数据、状态或外部系统造成可记录的变化。 | 文档回传/确认；lab WfStageRun/WfArtifact/WfGateResult等 |  | 文档回传/确认；lab WfStageRun/WfArtifact/WfGateResult等 |
| A27 | Action | active_seed | 登记使用版本／发布新能力版本 | 对业务数据、状态或外部系统造成可记录的变化。 | manifest/中台技能包版本；lab WfVersionUsage/WfVersionRelease |  | manifest/中台技能包版本；lab WfVersionUsage/WfVersionRelease |
| A28 | Action | active_seed | 记录阻塞／失败／重试／恢复 | 对业务数据、状态或外部系统造成可记录的变化。 | 原Task错误字段；lab执行事件、尝试、幂等模型 |  | 原Task错误字段；lab执行事件、尝试、幂等模型 |
| A35 | Action | candidate | sync_xiaohongshu_brand_accounts | 同步品牌资料库里小红书品牌账号数据，可补充账号链接。 | OPENCLAW_MCP_TOOLS:sync_xiaohongshu_brand_accounts | 品牌增长 / 内容获客 | sync_xiaohongshu_brand_accounts |
| A36 | Action | candidate | sync_xiaohongshu_competitor_accounts | 同步品牌资料库里小红书竞品账号数据，可补充账号链接。 | OPENCLAW_MCP_TOOLS:sync_xiaohongshu_competitor_accounts | 品牌增长 / 内容获客 | sync_xiaohongshu_competitor_accounts |
| A37 | Action | candidate | sync_xiaohongshu_brand_notes | 同步品牌资料库里小红书品牌作品数据。 | OPENCLAW_MCP_TOOLS:sync_xiaohongshu_brand_notes | 品牌增长 / 内容获客 | sync_xiaohongshu_brand_notes |
| A38 | Action | candidate | sync_xiaohongshu_benchmark_notes | 同步品牌资料库里小红书对标作品数据，需要提供作品链接。 | OPENCLAW_MCP_TOOLS:sync_xiaohongshu_benchmark_notes | 品牌增长 / 内容获客 | sync_xiaohongshu_benchmark_notes |
| A39 | Action | candidate | sync_xiaohongshu_search_notes | 同步品牌资料库里小红书搜索笔记数据，需要提供关键词。 | OPENCLAW_MCP_TOOLS:sync_xiaohongshu_search_notes | 品牌增长 / 内容获客 | sync_xiaohongshu_search_notes |
| A40 | Action | candidate | sync_xiaohongshu_comment_data | 同步品牌资料库里小红书评论数据，可传作品链接列表或分页请求。 | OPENCLAW_MCP_TOOLS:sync_xiaohongshu_comment_data | 品牌增长 / 内容获客 | sync_xiaohongshu_comment_data |
| A41 | Action | candidate | sync_xiaohongshu_target_users | 从品牌资料库里小红书作品评论中提取目标用户账号链接，可按关键词筛选，并可先补拉评论。 | OPENCLAW_MCP_TOOLS:sync_xiaohongshu_target_users | 品牌增长 / 全网获客 / 内容获客 | sync_xiaohongshu_target_users |
| A42 | Action | candidate | sync_xiaohongshu_feishu_workspace | 从品牌绑定的飞书副本同步小红书搜集数据工作区。 | OPENCLAW_MCP_TOOLS:sync_xiaohongshu_feishu_workspace | 品牌增长 / 内容获客 | sync_xiaohongshu_feishu_workspace |
| A43 | Action | candidate | add_xiaohongshu_note_to_material_library | 把小红书对标作品或搜索笔记加入素材库。 | OPENCLAW_MCP_TOOLS:add_xiaohongshu_note_to_material_library | 品牌增长 / 统一素材管理 / 内容获客 | add_xiaohongshu_note_to_material_library |
| A44 | Action | candidate | sync_douyin_brand_accounts | 同步品牌资料库里抖音品牌账号数据，可传账号链接或账号条目。 | OPENCLAW_MCP_TOOLS:sync_douyin_brand_accounts | 品牌增长 / 内容获客 | sync_douyin_brand_accounts |
| A45 | Action | candidate | sync_douyin_competitor_accounts | 同步品牌资料库里抖音竞品账号数据，可传账号链接或账号条目。 | OPENCLAW_MCP_TOOLS:sync_douyin_competitor_accounts | 品牌增长 / 内容获客 | sync_douyin_competitor_accounts |
| A46 | Action | candidate | sync_douyin_brand_works | 同步品牌资料库里抖音品牌作品数据，可传品牌账号链接或账号条目。 | OPENCLAW_MCP_TOOLS:sync_douyin_brand_works | 品牌增长 / 内容获客 | sync_douyin_brand_works |
| A47 | Action | candidate | sync_douyin_competitor_works | 同步品牌资料库里抖音竞品作品数据，可传竞品账号链接或账号条目。 | OPENCLAW_MCP_TOOLS:sync_douyin_competitor_works | 品牌增长 / 内容获客 | sync_douyin_competitor_works |
| A48 | Action | candidate | sync_douyin_benchmark_works | 同步品牌资料库里抖音对标作品数据，需要提供作品 aweme_id。 | OPENCLAW_MCP_TOOLS:sync_douyin_benchmark_works | 品牌增长 / 内容获客 | sync_douyin_benchmark_works |
| A49 | Action | candidate | sync_douyin_search_works | 同步品牌资料库里抖音搜索结果数据，需要提供搜索关键词。 | OPENCLAW_MCP_TOOLS:sync_douyin_search_works | 品牌增长 / 内容获客 | sync_douyin_search_works |
| A50 | Action | candidate | sync_douyin_comment_data | 同步品牌资料库里抖音评论数据，需要提供作品链接列表或分页请求。 | OPENCLAW_MCP_TOOLS:sync_douyin_comment_data | 品牌增长 / 内容获客 | sync_douyin_comment_data |
| A51 | Action | candidate | sync_douyin_target_users | 从品牌资料库里抖音作品评论中提取目标用户账号链接，可按关键词筛选，并可先补拉评论。 | OPENCLAW_MCP_TOOLS:sync_douyin_target_users | 品牌增长 / 全网获客 / 内容获客 | sync_douyin_target_users |
| A52 | Action | candidate | create_douyin_creator_deep_fetch_tasks | 按达人标识批量创建抖音达人深度抓取任务，后台异步补拉画像、热词和主页作品摘要。 | OPENCLAW_MCP_TOOLS:create_douyin_creator_deep_fetch_tasks | 品牌增长 / 任务治理 / 内容获客 / 达人合作 | create_douyin_creator_deep_fetch_tasks |
| A53 | Action | candidate | add_douyin_creators_to_result_pool | 把达人搜索结果批量加入抖音达人结果池。 | OPENCLAW_MCP_TOOLS:add_douyin_creators_to_result_pool | 品牌增长 / 内容获客 / 达人合作 | add_douyin_creators_to_result_pool |
| A54 | Action | candidate | delete_douyin_brand_account | 删除品牌资料库里的抖音品牌账号绑定。 | OPENCLAW_MCP_TOOLS:delete_douyin_brand_account | 品牌增长 / 内容获客 | delete_douyin_brand_account |
| A55 | Action | candidate | delete_douyin_competitor_account | 删除品牌资料库里的抖音竞品账号绑定。 | OPENCLAW_MCP_TOOLS:delete_douyin_competitor_account | 品牌增长 / 内容获客 | delete_douyin_competitor_account |
| A56 | Action | candidate | delete_douyin_keyword_recommendation | 删除一条抖音关键词推荐结果。 | OPENCLAW_MCP_TOOLS:delete_douyin_keyword_recommendation | 品牌增长 / 内容获客 | delete_douyin_keyword_recommendation |
| A57 | Action | candidate | sync_douyin_keyword_recommendations | 同步品牌资料库里抖音关键词推荐数据，需要提供搜索关键词。 | OPENCLAW_MCP_TOOLS:sync_douyin_keyword_recommendations | 品牌增长 / 内容获客 | sync_douyin_keyword_recommendations |
| A58 | Action | candidate | sync_douyin_low_fan_explosive_works | 同步品牌资料库里抖音低粉爆款榜数据，需要提供一级和二级内容标签 ID。 | OPENCLAW_MCP_TOOLS:sync_douyin_low_fan_explosive_works | 品牌增长 / 内容获客 | sync_douyin_low_fan_explosive_works |
| A59 | Action | candidate | sync_douyin_high_completion_rate_works | 同步品牌资料库里抖音高完播率榜数据，需要提供一级和二级内容标签 ID。 | OPENCLAW_MCP_TOOLS:sync_douyin_high_completion_rate_works | 品牌增长 / 内容获客 | sync_douyin_high_completion_rate_works |
| A60 | Action | candidate | sync_douyin_high_like_rate_works | 同步品牌资料库里抖音高点赞率榜数据，需要提供一级和二级内容标签 ID。 | OPENCLAW_MCP_TOOLS:sync_douyin_high_like_rate_works | 品牌增长 / 内容获客 | sync_douyin_high_like_rate_works |
| A61 | Action | candidate | sync_douyin_city_hotspots | 同步品牌资料库里抖音同城热点榜数据，需要提供城市代码 cityCode。 | OPENCLAW_MCP_TOOLS:sync_douyin_city_hotspots | 品牌增长 / 内容获客 | sync_douyin_city_hotspots |
| A62 | Action | candidate | sync_daily_hotspots | 同步每日热点，可按平台标题定向刷新。 | OPENCLAW_MCP_TOOLS:sync_daily_hotspots | 品牌增长 | sync_daily_hotspots |
| A63 | Action | candidate | generate_opportunity_insight_step_one | 发起机会洞察第 1 步，生成品牌账号分析与竞品账号分析。 | OPENCLAW_MCP_TOOLS:generate_opportunity_insight_step_one | 机会洞察 | generate_opportunity_insight_step_one |
| A64 | Action | candidate | generate_opportunity_insight_step_two | 发起机会洞察第 2 步，生成评论洞察分析。 | OPENCLAW_MCP_TOOLS:generate_opportunity_insight_step_two | 机会洞察 | generate_opportunity_insight_step_two |
| A65 | Action | candidate | generate_opportunity_insight_step_three | 发起机会洞察第 3 步，生成最终机会洞察总报告。 | OPENCLAW_MCP_TOOLS:generate_opportunity_insight_step_three | 机会洞察 | generate_opportunity_insight_step_three |
| A66 | Action | candidate | update_my_third_party_platform_secret | 更新当前品牌指定第三方平台的 API Key，可用于 StepFun、Tikhub、蝉镜、RunningHub、火山 VOD 等平台。 | OPENCLAW_MCP_TOOLS:update_my_third_party_platform_secret | 个人中心 | update_my_third_party_platform_secret |
| A67 | Action | candidate | update_local_material_storage_settings | 更新 local-single-user 安装态下个人中心素材库存储目录。传入的是【素材库】外层的根目录，保存后会自动创建【素材库】及四类子目录。 | OPENCLAW_MCP_TOOLS:update_local_material_storage_settings | 个人中心 / 统一素材管理 | update_local_material_storage_settings |
| A68 | Action | candidate | create_brand_invite_link | 为当前品牌创建新的邀请链接，可指定角色、备注和有效天数。 | OPENCLAW_MCP_TOOLS:create_brand_invite_link | 个人中心 / 品牌增长 | create_brand_invite_link |
| A69 | Action | candidate | revoke_brand_invite | 撤回当前品牌下指定的待处理邀请。 | OPENCLAW_MCP_TOOLS:revoke_brand_invite | 个人中心 / 品牌增长 | revoke_brand_invite |
| A70 | Action | candidate | accept_my_brand_invite | 接受当前账号收到的品牌邀请。 | OPENCLAW_MCP_TOOLS:accept_my_brand_invite | 个人中心 / 品牌增长 | accept_my_brand_invite |
| A71 | Action | candidate | cancel_task | 取消指定任务，仅支持排队中或运行中的任务。 | OPENCLAW_MCP_TOOLS:cancel_task | 任务中心 / 任务治理 | cancel_task |
| A72 | Action | candidate | retry_task | 重试指定任务，把任务重新放回排队状态。 | OPENCLAW_MCP_TOOLS:retry_task | 任务中心 / 任务治理 | retry_task |
| A73 | Action | candidate | update_skill_config | 更新指定网站技能的品牌级配置与提示词覆盖，让后续网页生成直接使用新的有效设置。 | OPENCLAW_MCP_TOOLS:update_skill_config | 技能中心 | update_skill_config |
| A74 | Action | candidate | reset_skill_to_platform_baseline | 把指定网站技能恢复到平台基线配置，移除品牌级技能和提示词覆盖。 | OPENCLAW_MCP_TOOLS:reset_skill_to_platform_baseline | 技能中心 / 个人中心 | reset_skill_to_platform_baseline |
| A75 | Action | candidate | submit_task_result_feedback | 为指定任务提交生成结果反馈，记录满意度、问题标签、备注和人工修改结果。 | OPENCLAW_MCP_TOOLS:submit_task_result_feedback | 任务中心 / 任务治理 | submit_task_result_feedback |
| A76 | Action | candidate | publish_wechat_article | 把指定公众号草稿正式发布到公众号账号。 | OPENCLAW_MCP_TOOLS:publish_wechat_article | 公众号 / 内容获客 | publish_wechat_article |
| A77 | Action | candidate | create_xiaohongshu_mobile_draft_session | 为指定小红书图文作品创建手机扫码接力草稿会话，便于在手机端保存到小红书草稿箱。 | OPENCLAW_MCP_TOOLS:create_xiaohongshu_mobile_draft_session | 小红书 / 内容获客 | create_xiaohongshu_mobile_draft_session |
| A78 | Action | candidate | create_xiaohongshu_desktop_draft_session | 为指定小红书图文作品创建电脑端草稿会话，便于通过浏览器扩展自动填充保存草稿。 | OPENCLAW_MCP_TOOLS:create_xiaohongshu_desktop_draft_session | 小红书 / 内容获客 | create_xiaohongshu_desktop_draft_session |
| A79 | Action | candidate | create_douyin_mobile_publish_session | 为指定抖音视频作品创建手机接力发布会话，便于在手机端继续完成发布。 | OPENCLAW_MCP_TOOLS:create_douyin_mobile_publish_session | 抖音 / 内容获客 | create_douyin_mobile_publish_session |
| A80 | Action | candidate | create_douyin_desktop_publish_session | 为指定抖音视频作品创建电脑端发布会话，便于通过浏览器扩展自动填充发布信息。 | OPENCLAW_MCP_TOOLS:create_douyin_desktop_publish_session | 抖音 / 内容获客 | create_douyin_desktop_publish_session |
| A81 | Action | candidate | publish_wechat_workflow | 把指定公众号工作流正式发布到公众号账号。 | OPENCLAW_MCP_TOOLS:publish_wechat_workflow | 公众号 / 内容获客 | publish_wechat_workflow |
| A82 | Action | candidate | retry_wechat_publish_history | 重试一次失败或待处理的公众号发布历史记录。 | OPENCLAW_MCP_TOOLS:retry_wechat_publish_history | 内容获客 | retry_wechat_publish_history |
| A83 | Action | candidate | create_design_work | 在网站设计工作台中直接创建一个设计任务。当前图片模块默认走 AI 智控中心 自由生图模式：不会自动套社媒配图模板、不会默认植入品牌资料、也不会强制生成中文排版文案。提供参考图时默认会将其作为图像输入提交给生图模型；只有用户明确要求完全忽略参考图、仅按文字生成时，才传 referenceImageMode=prompt_only。图片设计可通过 imageSize 指定尺寸（格式 宽x高，如 1200x628）；如需指定生图模型，应先调用 get_design_workspace_options，再把返回的 selectionKey 传入 modelSelection。 | OPENCLAW_MCP_TOOLS:create_design_work | 设计工作台 | create_design_work |
| A84 | Action | candidate | create_brand_growth_report | 提交 WorkBuddy 已生成的品牌增长报告到【品牌增长报告】板块；中台只负责接收、保存和展示，不生成报告正文。 | OPENCLAW_MCP_TOOLS:create_brand_growth_report | 品牌增长 | create_brand_growth_report |
| A85 | Action | candidate | create_half_year_marketing_plan | 触发当前品牌的半年营销规划生成任务。 | OPENCLAW_MCP_TOOLS:create_half_year_marketing_plan | 品牌增长 | create_half_year_marketing_plan |
| A86 | Action | candidate | generate_brand_growth_visual_report | 触发当前品牌的品牌增长可视化报告生成任务。 | OPENCLAW_MCP_TOOLS:generate_brand_growth_visual_report | 品牌增长 | generate_brand_growth_visual_report |
| A87 | Action | candidate | generate_brand_growth_marketing_calendar | 触发当前品牌营销日历生成任务。 | OPENCLAW_MCP_TOOLS:generate_brand_growth_marketing_calendar | 品牌增长 | generate_brand_growth_marketing_calendar |
| A88 | Action | candidate | update_brand_growth_marketing_calendar | 更新当前品牌指定 reportId 的营销日历内容。 | OPENCLAW_MCP_TOOLS:update_brand_growth_marketing_calendar | 品牌增长 | update_brand_growth_marketing_calendar |
| A89 | Action | candidate | generate_brand_growth_topic_candidates | 触发当前品牌选题库热点选题生成。 | OPENCLAW_MCP_TOOLS:generate_brand_growth_topic_candidates | 品牌增长 | generate_brand_growth_topic_candidates |
| A90 | Action | candidate | update_brand_growth_topic_library | 更新当前品牌选题库内容。 | OPENCLAW_MCP_TOOLS:update_brand_growth_topic_library | 品牌增长 | update_brand_growth_topic_library |
| A91 | Action | candidate | create_brand_growth_topic_library_item | 向当前品牌选题库新增一条结构化选题，默认按 AI 智控中心 来源入库。 | OPENCLAW_MCP_TOOLS:create_brand_growth_topic_library_item | 品牌增长 | create_brand_growth_topic_library_item |
| A92 | Action | candidate | update_brand_growth_topic_library_item | 更新当前品牌选题库中指定 ID 的一条选题。 | OPENCLAW_MCP_TOOLS:update_brand_growth_topic_library_item | 品牌增长 | update_brand_growth_topic_library_item |
| A93 | Action | candidate | delete_brand_growth_topic_library_item | 删除当前品牌选题库中指定 ID 的一条选题。 | OPENCLAW_MCP_TOOLS:delete_brand_growth_topic_library_item | 品牌增长 | delete_brand_growth_topic_library_item |
| A94 | Action | candidate | create_knowledge_base | 为当前品牌创建业务知识库。 | OPENCLAW_MCP_TOOLS:create_knowledge_base | 品牌资产 | create_knowledge_base |
| A95 | Action | candidate | upload_knowledge_base_files | 向指定知识库上传资料，支持按知识库 ID 或名称定位。 | OPENCLAW_MCP_TOOLS:upload_knowledge_base_files | 品牌资产 | upload_knowledge_base_files |
| A96 | Action | candidate | create_douyin_original_copy | 基于选题库或营销日历触发抖音原创文案生成。 | OPENCLAW_MCP_TOOLS:create_douyin_original_copy | 抖音 / 内容获客 | create_douyin_original_copy |
| A97 | Action | candidate | create_douyin_remix_copy | 基于素材库视频触发抖音二创文案生成。 | OPENCLAW_MCP_TOOLS:create_douyin_remix_copy | 抖音 / 内容获客 | create_douyin_remix_copy |
| A98 | Action | candidate | create_ai_control_center_lobster_diary | 为当前品牌指定板块创建一篇每周复盘。 | OPENCLAW_MCP_TOOLS:create_ai_control_center_lobster_diary | AI 智控中心 专区 | create_ai_control_center_lobster_diary |
| A99 | Action | candidate | update_ai_control_center_lobster_diary | 更新指定板块下的一篇每周复盘。 | OPENCLAW_MCP_TOOLS:update_ai_control_center_lobster_diary | AI 智控中心 专区 | update_ai_control_center_lobster_diary |
| F01 | Function | active_seed | 读取品牌上下文与资料 | 读、算、判断或生成候选，具体执行位置见下方。 | get_current_brand_context / get_brand_archive_summary / get_brand_products / manage_brand_library 的只读action |  | get_current_brand_context / get_brand_archive_summary / get_brand_products / manage_brand_library 的只读action |
| F02 | Function | active_seed | 检查数据充分性 | 读、算、判断或生成候选，具体执行位置见下方。 | 各策略专家；建议将字段检查规则结构化 |  | 各策略专家；建议将字段检查规则结构化 |
| F03 | Function | active_seed | 判断任务路线与前置条件 | 读、算、判断或生成候选，具体执行位置见下方。 | 专家团路由表；route_website_function_by_intent只解决网站功能路由的一部分 |  | 专家团路由表；route_website_function_by_intent只解决网站功能路由的一部分 |
| F04 | Function | active_seed | 查询与聚合平台数据 | 读、算、判断或生成候选，具体执行位置见下方。 | get_*_collection_workspace；只读查询与sync写入分开 |  | get_*_collection_workspace；只读查询与sync写入分开 |
| F05 | Function | active_seed | 规划品牌定位和内容组合 | 读、算、判断或生成候选，具体执行位置见下方。 | 策略专家及内容组合技能；调用模型可有技术作业副作用 |  | 策略专家及内容组合技能；调用模型可有技术作业副作用 |
| F06 | Function | active_seed | 选题相关性、去重与路线推荐 | 读、算、判断或生成候选，具体执行位置见下方。 | 抖音/小红书/公众号选题；不把generate类MCP天然当只读 |  | 抖音/小红书/公众号选题；不把generate类MCP天然当只读 |
| F07 | Function | active_seed | 生成创作候选 | 读、算、判断或生成候选，具体执行位置见下方。 | WorkBuddy专家与创作技能执行；结果保存另走Action |  | WorkBuddy专家与创作技能执行；结果保存另走Action |
| F08 | Function | active_seed | 编制制作配置并校验输入 | 读、算、判断或生成候选，具体执行位置见下方。 | 视频专家/技能；不是由中台替专家决定镜头 |  | 视频专家/技能；不是由中台替专家决定镜头 |
| F09 | Function | active_seed | 读取模型与应用参数 | 读、算、判断或生成候选，具体执行位置见下方。 | get_design_workspace_options；manage_douyin_video_production action=get_app_detail等 |  | get_design_workspace_options；manage_douyin_video_production action=get_app_detail等 |
| F10 | Function | active_seed | 核验内容交付质量 | 读、算、判断或生成候选，具体执行位置见下方。 | 各专家质量规则；统一评分模型建议补充 |  | 各专家质量规则；统一评分模型建议补充 |
| F100 | Function | candidate | get_ai_control_center_daily_plans | 查看当前品牌指定板块下的每日计划列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_daily_plans | AI 智控中心 专区 | get_ai_control_center_daily_plans |
| F101 | Function | candidate | get_volcengine_music_task | 查询火山音乐任务结果。成功后可选择直接把音频链接沉淀到 AI 智控中心 创作素材，适合保存为 audio 或 bgm 素材。 | OPENCLAW_MCP_TOOLS:get_volcengine_music_task | AI 智控中心 专区 / 任务治理 | get_volcengine_music_task |
| F102 | Function | candidate | search_ai_control_center_asset_archive | 按素材类型、素材来源和关键词搜索当前品牌统一素材档案，聚合创作素材、视频作品、媒体资产、品牌资料和任务产物。WorkBuddy Agent 遇到找素材、选参考素材、素材复用、给任务配素材时应先调用本工具；本工具只读，不写任务记录。 | OPENCLAW_MCP_TOOLS:search_ai_control_center_asset_archive | AI 智控中心 专区 / 统一素材管理 | search_ai_control_center_asset_archive |
| F103 | Function | candidate | get_ai_control_center_published_ontology_contract | 只读获取当前品牌已发布的 Ontology 正式路由契约。WorkBuddy Agent 执行业务任务前应调用本工具读取 published_contract；本工具不会返回 draft 或 publish-preview，不写专家真源，不调用 AI，不触发业务执行。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_published_ontology_contract | AI 智控中心 专区 / Ontology | get_ai_control_center_published_ontology_contract |
| F104 | Function | candidate | get_ai_control_center_ontology_execution_plan | 只读获取当前品牌已发布 Ontology 契约派生出的执行前路由计划。WorkBuddy Agent 应在真实执行前调用本工具确认节点顺序、确认闸、证据规则和禁止动作；本工具不创建任务、不调用 AI、不触发业务执行、不写专家真源。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_ontology_execution_plan | AI 智控中心 专区 / Ontology | get_ai_control_center_ontology_execution_plan |
| F105 | Function | candidate | get_ai_control_center_ontology_expert_source_diff_preview | 只读获取已发布 Ontology 契约同步到专家源 Markdown 前的候选 Diff 预览。用于真实写回前审阅会改哪些专家/Skill 文件、候选 SHA 和阻断闸；本工具不写盘、不创建快照、不提交、不触发 WorkBuddy 执行。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_ontology_expert_source_diff_preview | AI 智控中心 专区 / Ontology | get_ai_control_center_ontology_expert_source_diff_preview |
| F106 | Function | candidate | get_ai_control_center_creative_materials | 查看当前品牌指定板块下的创作素材列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_creative_materials | AI 智控中心 专区 / 统一素材管理 | get_ai_control_center_creative_materials |
| F107 | Function | candidate | get_ai_control_center_video_works | 查看当前品牌指定板块下的视频作品列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_video_works | AI 智控中心 专区 | get_ai_control_center_video_works |
| F108 | Function | candidate | get_ai_control_center_geo_visibility_reports | 查看当前品牌指定板块下的 GEO 可见度诊断报告列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_geo_visibility_reports | GEO获客 | get_ai_control_center_geo_visibility_reports |
| F109 | Function | candidate | get_ai_control_center_geo_contents | 查看当前品牌 GEO 工作台中除可见度诊断外的其它工作流内容列表，可按内容类型筛选。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_geo_contents | GEO获客 | get_ai_control_center_geo_contents |
| F11 | Function | active_seed | 效果复盘与优化建议 | 读、算、判断或生成候选，具体执行位置见下方。 | 抖音复盘5技能、小红书双维复盘、公众号复盘 |  | 抖音复盘5技能、小红书双维复盘、公众号复盘 |
| F110 | Function | candidate | get_ai_control_center_third_party_media_delivery_resources | 查看 GEO 第三方媒体投放已缓存的软文街媒体库，支持按 20 条分页读取，并可按媒体名称、平台、分类、地区搜索；若站内一直没有新媒体，先确认个人中心里当前品牌保存的软文街登录账号和登录密码仍然有效。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_third_party_media_delivery_resources | AI 智控中心 | get_ai_control_center_third_party_media_delivery_resources |
| F111 | Function | candidate | get_ai_control_center_comment_leads | 查看全网获客工作台中的评论获客列表，可按来源平台筛选。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_comment_leads | 全网获客 | get_ai_control_center_comment_leads |
| F112 | Function | candidate | get_ai_control_center_platform_leads | 查看全网获客工作台中的平台获客列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_platform_leads | 全网获客 / 个人中心 | get_ai_control_center_platform_leads |
| F113 | Function | candidate | get_ai_control_center_tencent_ad_leads | 查看投流获客工作台中的腾讯投流获客列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_tencent_ad_leads | 投流获客 | get_ai_control_center_tencent_ad_leads |
| F114 | Function | candidate | get_ai_control_center_creator_match_workspace | 查看达人合作工作台中的达人匹配列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_creator_match_workspace | 达人合作 | get_ai_control_center_creator_match_workspace |
| F115 | Function | candidate | get_ai_control_center_creator_tracking_workspace | 查看达人合作工作台中的达人跟踪列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_creator_tracking_workspace | 达人合作 | get_ai_control_center_creator_tracking_workspace |
| F116 | Function | candidate | get_ai_control_center_creator_tracking_works | 查看某位达人跟踪记录下的合作作品列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_creator_tracking_works | 达人合作 | get_ai_control_center_creator_tracking_works |
| F117 | Function | candidate | get_unified_material_library_items | 查看当前品牌统一素材库，聚合小红书、抖音和公众号素材，可用于跨平台二创。 | OPENCLAW_MCP_TOOLS:get_unified_material_library_items | 品牌增长 / 统一素材管理 | get_unified_material_library_items |
| F118 | Function | candidate | get_wechat_collection_workspace | 查看品牌资料库里公众号采集数据工作区，包括品牌公众号文章、对标文章和微信搜一搜。 | OPENCLAW_MCP_TOOLS:get_wechat_collection_workspace | 品牌增长 / 内容获客 | get_wechat_collection_workspace |
| F119 | Function | candidate | read_wechat_article_content | 读取一篇品牌公众号文章的正文内容。 | OPENCLAW_MCP_TOOLS:read_wechat_article_content | 品牌增长 / 内容获客 | read_wechat_article_content |
| F12 | Function | candidate | 提炼并压缩长期记忆 | 读、算、判断或生成候选，具体执行位置见下方。 | growth-memory-update / strategy-optimization-record-manager |  | growth-memory-update / strategy-optimization-record-manager |
| F120 | Function | candidate | read_wechat_search_item_content | 读取一条微信搜一搜结果的正文内容。 | OPENCLAW_MCP_TOOLS:read_wechat_search_item_content | 品牌增长 / 内容获客 | read_wechat_search_item_content |
| F121 | Function | candidate | get_douyin_material_library_items | 查看当前品牌素材库里可用于抖音二创的素材作品。 | OPENCLAW_MCP_TOOLS:get_douyin_material_library_items | 品牌增长 / 统一素材管理 / 内容获客 | get_douyin_material_library_items |
| F13 | Function | active_seed | 计算GEO可见度 | 读、算、判断或生成候选，具体执行位置见下方。 | GEO诊断专家；口径需明确分子/分母/未观测项 |  | GEO诊断专家；口径需明确分子/分母/未观测项 |
| F14 | Function | candidate | 关键词分类和优先级 | 读、算、判断或生成候选，具体执行位置见下方。 | geo-keyword-expert；缺来源的估算不得充当实测 |  | geo-keyword-expert；缺来源的估算不得充当实测 |
| F15 | Function | candidate | 网站就绪度检查 | 读、算、判断或生成候选，具体执行位置见下方。 | geo-website-expert；检查不自动修改站点 |  | geo-website-expert；检查不自动修改站点 |
| F16 | Function | active_seed | 知识结构整理与检索 | 读、算、判断或生成候选，具体执行位置见下方。 | 知识专家；中台Knowledge系列模型支撑检索与绑定 |  | 知识专家；中台Knowledge系列模型支撑检索与绑定 |
| F17 | Function | candidate | 制定GEO计划和平台适配 | 读、算、判断或生成候选，具体执行位置见下方。 | geo-proposal及三条内容专家 |  | geo-proposal及三条内容专家 |
| F18 | Function | active_seed | 发布准备检查 | 读、算、判断或生成候选，具体执行位置见下方。 | 公众号readiness；蚁小二validate/dry-run |  | 公众号readiness；蚁小二validate/dry-run |
| F19 | Function | active_seed | 筛选、归并并解释候选线索 | 读、算、判断或生成候选，具体执行位置见下方。 | 全网获客5专家；候选不等于意向，意向不等于客户 |  | 全网获客5专家；候选不等于意向，意向不等于客户 |
| F20 | Function | active_seed | 达人匹配评分与推荐 | 读、算、判断或生成候选，具体执行位置见下方。 | kol-matcher；模型评分要保存证据和置信说明 |  | kol-matcher；模型评分要保存证据和置信说明 |
| F21 | Function | active_seed | 达人合作效果评估 | 读、算、判断或生成候选，具体执行位置见下方。 | kol-tracker；缺销售归因则不计算成交ROI |  | kol-tracker；缺销售归因则不计算成交ROI |
| F22 | Function | candidate | 查询广告配置和效果 | 读、算、判断或生成候选，具体执行位置见下方。 | tencentads-management外部脚本 |  | tencentads-management外部脚本 |
| F23 | Function | candidate | 广告创意矩阵与测试设计 | 读、算、判断或生成候选，具体执行位置见下方。 | ad-creative-strategist |  | ad-creative-strategist |
| F24 | Function | candidate | 投放可行性与规则匹配 | 读、算、判断或生成候选，具体执行位置见下方。 | ad-campaign-manager的get-rules等步骤 |  | ad-campaign-manager的get-rules等步骤 |
| F25 | Function | active_seed | 设计分诊与视觉方案 | 读、算、判断或生成候选，具体执行位置见下方。 | design-creator / design-toolkit |  | design-creator / design-toolkit |
| F26 | Function | active_seed | 查询任务状态并判断恢复方式 | 读、算、判断或生成候选，具体执行位置见下方。 | get_task_detail与视频查询入口；不能凭超时认定失败后重复收费 |  | get_task_detail与视频查询入口；不能凭超时认定失败后重复收费 |
| F27 | Function | active_seed | 读取规则和版本适配情况 | 读、算、判断或生成候选，具体执行位置见下方。 | manifest、技能包、lab版本使用模型 |  | manifest、技能包、lab版本使用模型 |
| F31 | Function | candidate | get_website_function_catalog | 查看当前网站可由 Skill 控制的功能目录，包括业务域、页面入口、风险级别和推荐使用的 MCP tools。 | OPENCLAW_MCP_TOOLS:get_website_function_catalog | 个人中心 | get_website_function_catalog |
| F32 | Function | candidate | get_website_function_detail | 查看指定网站功能的详细控制说明，包括页面入口、必需信息、推荐追问和对应工具。 | OPENCLAW_MCP_TOOLS:get_website_function_detail | 个人中心 | get_website_function_detail |
| F33 | Function | candidate | route_website_function_by_intent | 根据用户意图把需求路由到最可能的网站功能，并返回推荐 MCP tools、缺失信息和确认策略。 | OPENCLAW_MCP_TOOLS:route_website_function_by_intent | AI 智控中心 专区 | route_website_function_by_intent |
| F34 | Function | candidate | get_website_function_execution_plan | 根据指定网站功能和当前已收集信息，判断是否可执行、缺少什么输入、是否需要确认，以及推荐工具顺序。 | OPENCLAW_MCP_TOOLS:get_website_function_execution_plan | AI 智控中心 专区 / 个人中心 | get_website_function_execution_plan |
| F35 | Function | candidate | get_current_brand_context | 获取当前登录账号的默认品牌、角色和权限摘要。 | OPENCLAW_MCP_TOOLS:get_current_brand_context | 品牌增长 | get_current_brand_context |
| F36 | Function | candidate | get_brand_products | 查看当前品牌可用于内容生成的产品清单。 | OPENCLAW_MCP_TOOLS:get_brand_products | 品牌增长 | get_brand_products |
| F37 | Function | candidate | get_platform_accounts | 查看当前品牌的平台账号清单，可按平台筛选。 | OPENCLAW_MCP_TOOLS:get_platform_accounts | 品牌档案 / 个人中心 | get_platform_accounts |
| F38 | Function | candidate | get_brand_archive_summary | 查看当前品牌档案摘要，包括品牌背景、产品、问卷、平台账号、竞品账号与行业资料进度。 | OPENCLAW_MCP_TOOLS:get_brand_archive_summary | 品牌档案 / 品牌增长 | get_brand_archive_summary |
| F39 | Function | candidate | get_brand_archive_survey | 查看当前品牌建档问卷答案，可按数量截断返回。 | OPENCLAW_MCP_TOOLS:get_brand_archive_survey | 品牌档案 / 品牌增长 | get_brand_archive_survey |
| F40 | Function | candidate | get_brand_competitor_accounts | 查看当前品牌的竞品账号清单，可按平台筛选。 | OPENCLAW_MCP_TOOLS:get_brand_competitor_accounts | 品牌档案 / 品牌增长 | get_brand_competitor_accounts |
| F41 | Function | candidate | get_brand_industry_feeds | 查看当前品牌已沉淀的行业资料或行业报告。 | OPENCLAW_MCP_TOOLS:get_brand_industry_feeds | 品牌档案 / 品牌增长 | get_brand_industry_feeds |
| F42 | Function | candidate | get_brand_business_assets | 查看当前品牌业务资料资产和知识绑定摘要。 | OPENCLAW_MCP_TOOLS:get_brand_business_assets | 品牌档案 / 统一素材管理 / 品牌增长 | get_brand_business_assets |
| F43 | Function | candidate | get_xiaohongshu_collection_workspace | 查看品牌资料库里小红书搜集数据工作区，包括品牌账号、竞品账号、品牌作品、对标作品、搜索笔记和目标用户。 | OPENCLAW_MCP_TOOLS:get_xiaohongshu_collection_workspace | 品牌增长 / 内容获客 | get_xiaohongshu_collection_workspace |
| F44 | Function | candidate | get_xiaohongshu_comment_replies | 读取指定小红书一级评论的二级评论，可继续按 cursor 和 index 翻页。 | OPENCLAW_MCP_TOOLS:get_xiaohongshu_comment_replies | 品牌增长 / 内容获客 | get_xiaohongshu_comment_replies |
| F45 | Function | candidate | get_douyin_collection_workspace | 查看当前品牌资料库中的抖音搜集数据工作区摘要，包含达人搜索结果、达人结果池、主页链接和已抓到的联系方式摘要。 | OPENCLAW_MCP_TOOLS:get_douyin_collection_workspace | 品牌增长 / 内容获客 | get_douyin_collection_workspace |
| F46 | Function | candidate | search_douyin_creators | 按关键词、行业和商业指标搜索抖音达人，并把结果沉淀到品牌资料库的达人搜索结果池。 | OPENCLAW_MCP_TOOLS:search_douyin_creators | 品牌增长 / 内容获客 / 达人合作 | search_douyin_creators |
| F47 | Function | candidate | get_daily_hotspot_workspace | 查看品牌增长里的每日热点工作区，可按日期读取已采集的平台热点榜。 | OPENCLAW_MCP_TOOLS:get_daily_hotspot_workspace | 品牌增长 | get_daily_hotspot_workspace |
| F48 | Function | candidate | get_opportunity_insight_workspace | 查看当前品牌机会洞察工作区状态，包括 step1/2/3 产物和最近任务。 | OPENCLAW_MCP_TOOLS:get_opportunity_insight_workspace | 机会洞察 | get_opportunity_insight_workspace |
| F49 | Function | candidate | list_my_third_party_platforms | 查看当前品牌下个人中心第三方接口配置摘要，包括 API Key 遮罩状态、动态状态，以及 AI 智控中心 是否可直接复用该品牌共享凭证；只返回遮罩，不回显明文。 | OPENCLAW_MCP_TOOLS:list_my_third_party_platforms | 个人中心 / AI 智控中心 专区 | list_my_third_party_platforms |
| F50 | Function | candidate | check_my_third_party_platform_runtime_access | 检查当前品牌某个第三方平台的共享凭证是否可被 AI 智控中心 直接复用。只返回平台、遮罩状态和可用性，不返回明文 API Key。 | OPENCLAW_MCP_TOOLS:check_my_third_party_platform_runtime_access | 个人中心 / AI 智控中心 专区 | check_my_third_party_platform_runtime_access |
| F51 | Function | candidate | list_my_orders | 查看当前账号最近订单摘要，可按状态筛选并限制返回数量。 | OPENCLAW_MCP_TOOLS:list_my_orders | AI 智控中心 | list_my_orders |
| F52 | Function | candidate | list_personal_material_assets | 查看个人中心素材管理页聚合的素材列表，可按文本、图片、语音、视频筛选，覆盖网站上传和 AI 智控中心 入库素材。 | OPENCLAW_MCP_TOOLS:list_personal_material_assets | 个人中心 / 统一素材管理 | list_personal_material_assets |
| F53 | Function | candidate | get_local_material_storage_settings | 查看 local-single-user 安装态下个人中心素材库的目录设置、四类子目录和命名规则。 | OPENCLAW_MCP_TOOLS:get_local_material_storage_settings | 个人中心 / 统一素材管理 | get_local_material_storage_settings |
| F54 | Function | candidate | get_personal_center_overview | 查看当前账号在个人中心的总览摘要，包括品牌数、待处理邀请、任务和订单概况。 | OPENCLAW_MCP_TOOLS:get_personal_center_overview | 个人中心 | get_personal_center_overview |
| F55 | Function | candidate | list_brand_members | 查看当前品牌的团队成员列表和当前账号的成员管理权限。 | OPENCLAW_MCP_TOOLS:list_brand_members | 个人中心 / 品牌增长 | list_brand_members |
| F56 | Function | candidate | list_brand_invites | 查看当前品牌已创建的邀请码和邀请链接列表。 | OPENCLAW_MCP_TOOLS:list_brand_invites | 个人中心 / 品牌增长 | list_brand_invites |
| F57 | Function | candidate | get_brand_permission_settings | 查看当前品牌团队权限模板和当前账号的权限范围。 | OPENCLAW_MCP_TOOLS:get_brand_permission_settings | 个人中心 / 品牌增长 | get_brand_permission_settings |
| F58 | Function | candidate | list_my_brand_invites | 查看当前账号待处理的品牌邀请列表。 | OPENCLAW_MCP_TOOLS:list_my_brand_invites | 个人中心 / 品牌增长 | list_my_brand_invites |
| F59 | Function | candidate | list_my_brand_invite_notifications | 查看当前账号的品牌高级·成员邀请（兼容）中心摘要。 | OPENCLAW_MCP_TOOLS:list_my_brand_invite_notifications | 个人中心 / 品牌增长 | list_my_brand_invite_notifications |
| F60 | Function | candidate | get_task_detail | 查看指定任务的详细状态、输入和输出摘要。 | OPENCLAW_MCP_TOOLS:get_task_detail | 任务中心 / AI 智控中心 专区 / 任务治理 | get_task_detail |
| F61 | Function | candidate | get_recent_tasks_summary | 汇总当前品牌最近任务状态，可按时间范围和任务类型筛选。 | OPENCLAW_MCP_TOOLS:get_recent_tasks_summary | 品牌增长 / 任务治理 | get_recent_tasks_summary |
| F62 | Function | candidate | get_failed_tasks_summary | 汇总当前品牌最近失败任务及主要失败原因。 | OPENCLAW_MCP_TOOLS:get_failed_tasks_summary | 品牌增长 / 任务治理 | get_failed_tasks_summary |
| F63 | Function | candidate | get_recent_knowledge_files | 查看当前品牌最近新增的知识资料和处理状态。 | OPENCLAW_MCP_TOOLS:get_recent_knowledge_files | 品牌资产 | get_recent_knowledge_files |
| F64 | Function | candidate | get_skill_config_summary | 查看当前品牌技能配置摘要，可按 skillKey 定位单个技能。 | OPENCLAW_MCP_TOOLS:get_skill_config_summary | 技能中心 | get_skill_config_summary |
| F65 | Function | candidate | get_skill_config_detail | 查看指定网站技能的有效配置、关联提示词以及品牌覆盖详情。 | OPENCLAW_MCP_TOOLS:get_skill_config_detail | 技能中心 | get_skill_config_detail |
| F66 | Function | candidate | get_feedback_summary | 查看当前品牌最近的生成结果反馈摘要，可按技能或提示词筛选。 | OPENCLAW_MCP_TOOLS:get_feedback_summary | 任务中心 / 任务治理 | get_feedback_summary |
| F67 | Function | candidate | get_feedback_analysis | 查看当前品牌生成结果反馈的问题画像，识别高频问题标签和负向任务类型。 | OPENCLAW_MCP_TOOLS:get_feedback_analysis | 任务中心 / 任务治理 | get_feedback_analysis |
| F68 | Function | candidate | get_prompt_optimization_suggestions | 基于当前品牌已收集的反馈，输出针对技能或提示词的最小优化建议摘要。 | OPENCLAW_MCP_TOOLS:get_prompt_optimization_suggestions | AI 智控中心 | get_prompt_optimization_suggestions |
| F69 | Function | candidate | get_wechat_article_drafts | 查看当前品牌最近生成的公众号文章草稿和任务状态。 | OPENCLAW_MCP_TOOLS:get_wechat_article_drafts | 公众号 / 内容获客 | get_wechat_article_drafts |
| F70 | Function | candidate | get_wechat_official_accounts | 查看当前品牌已配置的公众号账号列表，支持多公众号场景下为工作流和发布选择具体公众号。 | OPENCLAW_MCP_TOOLS:get_wechat_official_accounts | 公众号 / 内容获客 | get_wechat_official_accounts |
| F71 | Function | candidate | get_wechat_workflow_sessions | 查看当前品牌最近的公众号排版工作流会话，供确认发布对象。 | OPENCLAW_MCP_TOOLS:get_wechat_workflow_sessions | 公众号 / 内容获客 | get_wechat_workflow_sessions |
| F72 | Function | candidate | get_wechat_publish_history | 查看当前品牌最近的公众号发布历史和结果；每条记录都会回显所属公众号账号名。 | OPENCLAW_MCP_TOOLS:get_wechat_publish_history | 公众号 / 内容获客 | get_wechat_publish_history |
| F73 | Function | candidate | get_wechat_workflow_preferences | 查看当前品牌公众号工作流的默认作者、主题色和默认输入方式等偏好。 | OPENCLAW_MCP_TOOLS:get_wechat_workflow_preferences | 内容获客 | get_wechat_workflow_preferences |
| F74 | Function | candidate | get_wechat_workflow_session_detail | 查看指定公众号工作流会话的完整详情，包括发布配置和检查项。 | OPENCLAW_MCP_TOOLS:get_wechat_workflow_session_detail | 内容获客 | get_wechat_workflow_session_detail |
| F75 | Function | candidate | check_wechat_workflow_publish_readiness | 重新计算指定公众号工作流的发布确认状态，返回是否已具备正式发布条件。 | OPENCLAW_MCP_TOOLS:check_wechat_workflow_publish_readiness | 公众号 / 内容获客 | check_wechat_workflow_publish_readiness |
| F76 | Function | candidate | get_wechat_publish_history_detail | 查看指定公众号发布历史记录的详细结果和失败原因。 | OPENCLAW_MCP_TOOLS:get_wechat_publish_history_detail | 内容获客 | get_wechat_publish_history_detail |
| F77 | Function | candidate | get_xiaohongshu_mobile_draft_session | 查询指定小红书手机草稿接力会话的最新状态、入口和完成结果。 | OPENCLAW_MCP_TOOLS:get_xiaohongshu_mobile_draft_session | 小红书 / 内容获客 | get_xiaohongshu_mobile_draft_session |
| F78 | Function | candidate | get_xiaohongshu_desktop_draft_session | 查询指定小红书电脑端草稿接力会话的最新状态、入口和完成结果。 | OPENCLAW_MCP_TOOLS:get_xiaohongshu_desktop_draft_session | 小红书 / 内容获客 | get_xiaohongshu_desktop_draft_session |
| F79 | Function | candidate | get_douyin_mobile_publish_session | 查询指定抖音手机发布接力会话的最新状态、入口和完成结果。 | OPENCLAW_MCP_TOOLS:get_douyin_mobile_publish_session | 抖音 / 内容获客 | get_douyin_mobile_publish_session |
| F80 | Function | candidate | get_douyin_desktop_publish_session | 查询指定抖音电脑端发布接力会话的最新状态、入口和完成结果。 | OPENCLAW_MCP_TOOLS:get_douyin_desktop_publish_session | AI 智控中心 专区 / 抖音 / 内容获客 | get_douyin_desktop_publish_session |
| F81 | Function | candidate | get_design_workspace_options | 查看设计工作台可用模型选项与图片生成配置，并读取可直接传给 create_design_work.modelSelection 的 selectionKey。 | OPENCLAW_MCP_TOOLS:get_design_workspace_options | 设计工作台 | get_design_workspace_options |
| F82 | Function | candidate | get_recent_design_works | 查看当前品牌最近的设计工作台生成记录和状态。 | OPENCLAW_MCP_TOOLS:get_recent_design_works | 设计工作台 | get_recent_design_works |
| F83 | Function | candidate | get_latest_brand_growth_report_summary | 获取当前品牌最新品牌增长报告摘要。 | OPENCLAW_MCP_TOOLS:get_latest_brand_growth_report_summary | 品牌增长 | get_latest_brand_growth_report_summary |
| F84 | Function | candidate | get_brand_growth_visual_report_workspace | 查看当前品牌的品牌增长可视化报告工作区状态。 | OPENCLAW_MCP_TOOLS:get_brand_growth_visual_report_workspace | 品牌增长 | get_brand_growth_visual_report_workspace |
| F85 | Function | candidate | get_brand_growth_marketing_calendar_workspace | 查看当前品牌营销日历工作区状态。 | OPENCLAW_MCP_TOOLS:get_brand_growth_marketing_calendar_workspace | 品牌增长 | get_brand_growth_marketing_calendar_workspace |
| F86 | Function | candidate | get_brand_growth_topic_library_workspace | 查看当前品牌选题库工作区状态，可按日期查看热点选题候选。 | OPENCLAW_MCP_TOOLS:get_brand_growth_topic_library_workspace | 品牌增长 | get_brand_growth_topic_library_workspace |
| F87 | Function | candidate | get_brand_growth_material_library_items | 查看当前品牌品牌增长报告下的素材库结果。 | OPENCLAW_MCP_TOOLS:get_brand_growth_material_library_items | 品牌增长 / 统一素材管理 | get_brand_growth_material_library_items |
| F88 | Function | candidate | get_douyin_original_copy_options | 查看抖音原创文案可用的选题库、营销日历和文案类型选项。 | OPENCLAW_MCP_TOOLS:get_douyin_original_copy_options | 抖音 / 内容获客 | get_douyin_original_copy_options |
| F89 | Function | candidate | get_recent_douyin_original_copies | 查看当前品牌最近生成的抖音原创文案结果和状态。 | OPENCLAW_MCP_TOOLS:get_recent_douyin_original_copies | 抖音 / 内容获客 | get_recent_douyin_original_copies |
| F90 | Function | candidate | get_douyin_remix_copy_options | 查看抖音二创文案可用的素材库、产品和营销策划选项。 | OPENCLAW_MCP_TOOLS:get_douyin_remix_copy_options | 抖音 / 内容获客 | get_douyin_remix_copy_options |
| F91 | Function | candidate | get_recent_douyin_remix_copies | 查看当前品牌最近生成的抖音二创文案结果和状态。 | OPENCLAW_MCP_TOOLS:get_recent_douyin_remix_copies | 抖音 / 内容获客 | get_recent_douyin_remix_copies |
| F92 | Function | candidate | get_xiaohongshu_material_library_items | 查看当前品牌素材库里可用于小红书二创的对标作品。 | OPENCLAW_MCP_TOOLS:get_xiaohongshu_material_library_items | 小红书 / 品牌增长 / 统一素材管理 / 内容获客 | get_xiaohongshu_material_library_items |
| F93 | Function | candidate | get_xiaohongshu_marketing_calendar_options | 查看当前品牌最近一期小红书营销日历选题，可直接拿到 calendarItemId 供后续创作使用。 | OPENCLAW_MCP_TOOLS:get_xiaohongshu_marketing_calendar_options | 小红书 / 内容获客 | get_xiaohongshu_marketing_calendar_options |
| F94 | Function | candidate | get_xiaohongshu_original_reference_templates | 查看小红书原创笔记参考模板分类和模板项，可按分类筛选。 | OPENCLAW_MCP_TOOLS:get_xiaohongshu_original_reference_templates | 小红书 / 内容获客 | get_xiaohongshu_original_reference_templates |
| F95 | Function | candidate | get_recent_xiaohongshu_original_works | 查看当前品牌最近生成的小红书原创笔记结果和状态。 | OPENCLAW_MCP_TOOLS:get_recent_xiaohongshu_original_works | 小红书 / 内容获客 | get_recent_xiaohongshu_original_works |
| F96 | Function | candidate | get_ai_control_center_lobster_diaries | 查看当前品牌指定板块下的每周复盘列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_lobster_diaries | AI 智控中心 专区 | get_ai_control_center_lobster_diaries |
| F97 | Function | candidate | get_ai_control_center_marketing_plans | 查看当前品牌指定板块下的营销策划方案列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_marketing_plans | AI 智控中心 专区 | get_ai_control_center_marketing_plans |
| F98 | Function | candidate | get_ai_control_center_explosive_analyses | 查看当前品牌指定板块下的爆款拆解列表。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_explosive_analyses | AI 智控中心 专区 / 品牌增长 | get_ai_control_center_explosive_analyses |
| F99 | Function | candidate | get_ai_control_center_strategy_optimizations | 查看当前品牌在 brand_growth、xiaohongshu、douyin、wechat 板块下的策略优化记录列表；不用于 GEO 关键词挖掘等工作流内容。 | OPENCLAW_MCP_TOOLS:get_ai_control_center_strategy_optimizations | AI 智控中心 专区 | get_ai_control_center_strategy_optimizations |
| I01 | Interface | active_seed | BrandScoped 品牌归属对象 | 统一品牌过滤和权限校验；原模型多有brandId，但没有证明已声明此Ontology Interface | 建议实现者：产品、选题、报告、素材、线索、任务 |  | 建议实现者：产品、选题、报告、素材、线索、任务 |
| I02 | Interface | active_seed | SourceBacked 有来源对象 | 可追溯来源；品牌事实和AI推断分别标记。不是强制每张图有网络URL，本地原文件亦可 | 建议实现者：事实资料、用户信号、线索、诊断、复盘结论 |  | 建议实现者：事实资料、用户信号、线索、诊断、复盘结论 |
| I03 | Interface | active_seed | VersionedDeliverable 可交接版本产物 | 能检索指定版本、检查完整性、登记提交；三件套和视频字段通过具体类型扩展 | 建议实现者：策略、选题报告、创作包、配置包、文章、成片、复盘 |  | 建议实现者：策略、选题报告、创作包、配置包、文章、成片、复盘 |
| I04 | Interface | active_seed | Reviewable 可验收对象 | 支持提交、通过、退回；80%仅在规则定义的软指标适用，不绕过硬门槛 | 建议实现者：待确认选题、配置包、文稿、投放配置 |  | 建议实现者：待确认选题、配置包、文稿、投放配置 |
| I05 | Interface | active_seed | Publishable 可发布内容 | 共同具备发布前检查和提交能力；各平台具体payload由适配器生成，Interface不是HTTP接口 | 建议实现者：公众号文章、小红书笔记、GEO自媒体稿、视频 |  | 建议实现者：公众号文章、小红书笔记、GEO自媒体稿、视频 |
| I06 | Interface | active_seed | Measurable 可观察成效对象 | 统一读取可用指标；不强制每个渠道都有成交率，不把不同口径直接相加 | 建议实现者：内容作品、达人合作作品、广告、GEO查询集合 |  | 建议实现者：内容作品、达人合作作品、广告、GEO查询集合 |
| I07 | Interface | active_seed | LeadCandidate 可评估线索 | 可去重、解释匹配依据、记录阶段；手机号不作为全部类型必填，不把候选等同客户 | 建议实现者：个人账号线索、企业线索、本地商家线索 |  | 建议实现者：个人账号线索、企业线索、本地商家线索 |
| I08 | Interface | active_seed | ExternalEntityRef 外部实体引用 | 统一回查与关联；不直接复制密钥，不把外部状态变更假装本地数据库事务 | 建议实现者：广告组、外部账号、发布回执、外部作业、媒体订单 |  | 建议实现者：广告组、外部账号、发布回执、外部作业、媒体订单 |
| I09 | Interface | active_seed | ExecutableStage 可执行阶段对象 | 支持领取/提交/退回/阻塞；仅约束业务交接，阶段内部允许专家自主选择技能 | 建议实现者：策略阶段、选题阶段、内容生产阶段、数据复盘阶段 |  | 建议实现者：策略阶段、选题阶段、内容生产阶段、数据复盘阶段 |
| I10 | Interface | active_seed | CapabilityVersion 可识别能力版本 | 任务能记录用版，升级可检查兼容；不要求把WorkBuddy专属调度工具搬入中台 | 建议实现者：专家包、专家定义、技能发布包、路线版本 |  | 建议实现者：专家包、专家定义、技能发布包、路线版本 |
| I13 | Interface | candidate | BrandScoped 品牌隔离对象 | 任何读写都必须受当前品牌上下文约束。 | ontology-system-supplement:I13 | 品牌增长 / AI 智控中心 | brandId |
| I14 | Interface | candidate | KnowledgeBindable 可绑定知识库 | 对象可与知识库或业务知识绑定。 | ontology-system-supplement:I14 | 品牌资产设置 / 内容获客 | knowledgeBaseId |
| I15 | Interface | candidate | AssetSearchable 可被统一素材检索 | 对象可以进入统一素材档案并被搜索。 | ontology-system-supplement:I15 | 统一素材管理 | asset_archive_search |
| I16 | Interface | candidate | TaskGoverned 可落任务治理 | 动作或对象可写入 workflow-core 治理账本。 | ontology-system-supplement:I16 | 任务治理 / Ontology | taskId |
| I17 | Interface | candidate | PublishSessionAttachable 可挂发布接力 | 对象可以关联手机端或电脑端发布接力会话。 | ontology-system-supplement:I17 | 内容获客 | publish_session |
| I18 | Interface | candidate | CredentialProtected 需凭证能力 | 动作执行前必须校验第三方平台凭证。 | ontology-system-supplement:I18 | 接口与连接器配置 | third_party_platform_secret |
| I19 | Interface | candidate | OntologyDraftable 可生成编排草稿 | 对象可作为 AI 生成 Ontology 草稿的目标。 | ontology-system-supplement:I19 | Ontology | targetKind / targetId |
| I20 | Interface | candidate | ContractPublishable 可发布正式契约 | 对象可以从草稿发布为正式契约。 | ontology-system-supplement:I20 | Ontology | published_contract |
| I21 | Interface | candidate | ExecutionPlannable 可派生执行前计划 | 对象可以派生 execution_plan。 | ontology-system-supplement:I21 | Ontology / 任务治理 | execution_plan |
| I22 | Interface | candidate | EvidenceAppendOnly 只追加留证 | 证据记录只能追加，不能伪造覆盖历史。 | ontology-system-supplement:I22 | 任务治理 / Ontology | wf_execution_events |
| I23 | Interface | candidate | WritebackGuarded 受写回确认闸保护 | 写回前必须经过 Diff/SHA/快照/授权确认闸。 | ontology-system-supplement:I23 | Ontology / 专家源治理 | writeback_gate |
| I24 | Interface | candidate | LocalStorageConfigurable 本机目录可配置 | 对象允许在安装态下配置本机目录但不能手填绝对路径。 | ontology-system-supplement:I24 | 个人中心 / 存储与连接器 | local_material_storage |
| L01 | Link | active_seed | 品牌拥有业务资产 | 品牌→产品/问卷/账号/资料 | Brand到Product等有Prisma关系；部分OpenClaw表只有brandId字段 |  | Brand到Product等有Prisma关系；部分OpenClaw表只有brandId字段 |
| L02 | Link | active_seed | 方案依据事实与证据 | 策略/报告→品牌资料/采集证据 | 目前常写于正文；结构化证据链建议补充 |  | 目前常写于正文；结构化证据链建议补充 |
| L03 | Link | active_seed | 日历安排选题 | 方案→排期项→选题 | 增长报告/日历/选题工具；完整版本关系待统一 |  | 增长报告/日历/选题工具；完整版本关系待统一 |
| L04 | Link | active_seed | 创作包承接选题 | 选题→创作包 | 文档交接规范；非现成外键 |  | 文档交接规范；非现成外键 |
| L05 | Link | active_seed | 配置落实创作包 | 创作包→三件套→成片 | 本地交付；建议WfArtifact/sourceRefs建链 |  | 本地交付；建议WfArtifact/sourceRefs建链 |
| L06 | Link | active_seed | 作品使用素材 | 作品/配置→图片/配音/镜头 | 素材ID已有；完整引用/来源链待补 |  | 素材ID已有；完整引用/来源链待补 |
| L07 | Link | active_seed | 作业产生资源 | Task→MediaAsset | Prisma MediaAsset.taskId及relation |  | Prisma MediaAsset.taskId及relation |
| L08 | Link | active_seed | 发布到账号 | 文章/笔记/视频→发布记录→账号 | 公众号session/draft/history字段；跨平台需适配 |  | 公众号session/draft/history字段；跨平台需适配 |
| L09 | Link | active_seed | 作品具有观察数据 | 作品→效果快照 | 采集结果/达人指标/广告报表；统一快照身份建议补 |  | 采集结果/达人指标/广告报表；统一快照身份建议补 |
| L10 | Link | active_seed | 复盘产出经验 | 观察→复盘→行动单→长期规律 | 现有复盘/优化表，关系常在正文 |  | 现有复盘/优化表，关系常在正文 |
| L11 | Link | candidate | GEO诊断来自查询样本 | 品牌+查询+AI平台→回答证据→指标 | 报告里描述；建议结构化保存样本与失败原因 |  | 报告里描述；建议结构化保存样本与失败原因 |
| L12 | Link | candidate | 关键词驱动内容 | 关键词→FAQ/知识条目→GEO内容 | 本地表格与文稿引用；建议统一keywordId |  | 本地表格与文稿引用；建议统一keywordId |
| L13 | Link | candidate | 网站属于品牌并接受诊断 | 品牌→网站→诊断/页面内容 | 品牌资料+本地报告；网站对象是建议 |  | 品牌资料+本地报告；网站对象是建议 |
| L14 | Link | active_seed | 知识库组织并绑定内容 | 知识库→文件→分块/嵌入；知识库→模块/技能绑定 | Knowledge系列模型 |  | Knowledge系列模型 |
| L15 | Link | candidate | 刊发连接内容与媒体 | 稿件→媒体资源→订单/发布回执 | 资源表/第三方delivery；完整业务关联建议 |  | 资源表/第三方delivery；完整业务关联建议 |
| L16 | Link | active_seed | 线索来源于公开信号 | 评论/用户/作品→候选线索 | OpenClawCommentLead.sourceUrl/sourceCommentId；多来源建议扩展 |  | OpenClawCommentLead.sourceUrl/sourceCommentId；多来源建议扩展 |
| L17 | Link | candidate | 企业线索对应经营主体 | 企业线索→企业信用身份/POI | 当前PlatformLead缺信用代码/来源字段 |  | 当前PlatformLead缺信用代码/来源字段 |
| L18 | Link | active_seed | 达人匹配品牌 | 品牌→匹配记录→达人档案 | creatorId/sourceProfileId/brandId |  | creatorId/sourceProfileId/brandId |
| L19 | Link | active_seed | 匹配进入跟踪 | 达人匹配→跟踪档案 | 原有两张表，需通过creatorId等识别对应 |  | 原有两张表，需通过creatorId等识别对应 |
| L20 | Link | active_seed | 跟踪档案拥有合作作品 | 跟踪档案→合作作品 | OpenClawCreatorCooperationWork.trackingId（标量非Prisma relation） |  | OpenClawCreatorCooperationWork.trackingId（标量非Prisma relation） |
| L21 | Link | candidate | 广告使用资产并指向转化 | 广告组→创意/素材/定向/落地页/转化目标 | 腾讯广告技能及平台；建议中台ExternalRef |  | 腾讯广告技能及平台；建议中台ExternalRef |
| L22 | Link | candidate | 投放报告解释广告表现 | 广告实体+时间窗→报表→复盘/新创意 | 外部报表与中台报告正文，结构关系建议 |  | 外部报表与中台报告正文，结构关系建议 |
| L23 | Link | active_seed | 任务包含阶段并依赖产物 | 任务→阶段→输入/输出版本；阶段→前置阶段 | lab WfTask/WfStageRun/WfArtifact；旧专家文档约定 |  | lab WfTask/WfStageRun/WfArtifact；旧专家文档约定 |
| L24 | Link | active_seed | 执行使用能力版本 | 阶段/任务→专家/技能发布版本 | lab WfVersionUsage；原SkillPackageVersion不能代替跨客户端关联 |  | lab WfVersionUsage；原SkillPackageVersion不能代替跨客户端关联 |
| L25 | Link | active_seed | 验收决定对应产物版本 | 验收/批准→交付物修订→阶段 | lab WfApproval/WfGateResult；文档已有确认闸 |  | lab WfApproval/WfGateResult；文档已有确认闸 |
| L26 | Link | candidate | 设计依据简报与产品 | 设计简报→产品/品牌约束→设计作品 | create_design_work支持productId/referenceMaterialId |  | create_design_work支持productId/referenceMaterialId |
| L27 | Link | active_seed | 运行作业引用当前能力描述 | 生图/视频作业→模型或应用schema版本 | 运行选项工具存在；schema哈希/端到端映射建议补 |  | 运行选项工具存在；schema哈希/端到端映射建议补 |
| L28 | Link | candidate | 品牌拥有品牌资料库 | 品牌与品牌资料库之间的一对一归属关系。 | ontology-system-supplement:L28 | 品牌增长 | Brand->BrandArchive |
| L29 | Link | candidate | 品牌绑定知识库 | 品牌与知识库之间的绑定关系。 | ontology-system-supplement:L29 | 品牌资产设置 | Brand->KnowledgeBase |
| L30 | Link | candidate | 品牌拥有统一素材档案 | 品牌与统一素材档案之间的归属关系。 | ontology-system-supplement:L30 | 统一素材管理 | Brand->AssetArchive |
| L31 | Link | candidate | 品牌绑定第三方平台凭证 | 品牌与第三方平台凭证配置之间的绑定关系。 | ontology-system-supplement:L31 | 接口与连接器配置 | Brand->ThirdPartyPlatform |
| L32 | Link | candidate | 品牌配置本地素材库目录 | 品牌与本地素材库存储设置之间的配置关系。 | ontology-system-supplement:L32 | 存储与连接器 / 个人中心 | Brand->LocalMaterialStorage |
| L33 | Link | candidate | 统一素材档案支撑创作素材 | 统一素材档案与创作素材档案之间的引用关系。 | ontology-system-supplement:L33 | 统一素材管理 | AssetArchive->CreativeMaterial |
| L34 | Link | candidate | 创作素材产出视频作品 | 创作素材与视频作品之间的生成/复用关系。 | ontology-system-supplement:L34 | 统一素材管理 / 内容获客 | CreativeMaterial->VideoWork |
| L35 | Link | candidate | 视频作品关联发布接力会话 | 视频作品与发布接力会话之间的关联关系。 | ontology-system-supplement:L35 | 内容获客 | VideoWork->PublishSession |
| L36 | Link | candidate | Ontology草稿发布为正式契约 | Ontology 草稿与正式契约之间的发布关系。 | ontology-system-supplement:L36 | Ontology | Draft->PublishedContract |
| L37 | Link | candidate | 正式契约派生执行前计划 | Ontology 正式契约与执行前计划之间的派生关系。 | ontology-system-supplement:L37 | Ontology | PublishedContract->ExecutionPlan |
| L38 | Link | candidate | 正式契约生成专家源候选Diff | 正式契约与专家源候选 Diff 之间的预览关系。 | ontology-system-supplement:L38 | Ontology / 专家源治理 | PublishedContract->ExpertSourceDiff |
| L39 | Link | candidate | 执行前计划写入任务治理证据 | 执行前计划与任务治理证据之间的留证关系。 | ontology-system-supplement:L39 | 任务治理 / Ontology | ExecutionPlan->Evidence |
| L40 | Link | candidate | 素材复用写入任务治理证据 | 素材档案与任务治理证据之间的复用留证关系。 | ontology-system-supplement:L40 | 统一素材管理 / 任务治理 | AssetArchive->Evidence |
| L41 | Link | candidate | 达人匹配转入达人跟踪 | 达人匹配记录进入达人跟踪记录。 | ontology-system-supplement:L41 | 达人合作 | CreatorMatch->CreatorTracking |
| L42 | Link | candidate | 达人跟踪包含合作作品 | 达人跟踪记录与达人合作作品之间的包含关系。 | ontology-system-supplement:L42 | 达人合作 | CreatorTracking->CreatorTrackingWork |
| L43 | Link | candidate | 音乐生成任务沉淀为创作素材 | 音乐生成任务成功后可沉淀为创作素材。 | ontology-system-supplement:L43 | AI 智控中心 / 统一素材管理 | MusicTask->CreativeMaterial |
| L44 | Link | candidate | 设计任务沉淀为创作素材 | 设计任务成功后可沉淀为创作素材。 | ontology-system-supplement:L44 | 设计工作台 / 统一素材管理 | DesignWork->CreativeMaterial |
| O01 | Object | active_seed | 品牌 | 所有运营工作的归属单位，也是读写隔离边界。 | Brand；get_current_brand_context / get_brand_archive_summary |  | Brand；get_current_brand_context / get_brand_archive_summary |
| O02 | Object | active_seed | 产品／服务 | 需要被理解、讲解和推广的具体商品或服务。 | Product；get_brand_products / manage_brand_library |  | Product；get_brand_products / manage_brand_library |
| O03 | Object | active_seed | IP资料 | 品牌人物、形象、声音及人设资料；不是每一个形容词都建一个对象。 | Brand.ipProfileJson；manage_brand_library action=get_ip_library/update_ip_library |  | Brand.ipProfileJson；manage_brand_library action=get_ip_library/update_ip_library |
| O04 | Object | active_seed | 品牌问卷与事实资料 | 企业背景、业务数据、资质、案例等有来源的事实。 | BrandSurvey / BusinessAsset；get_brand_archive_survey / get_brand_business_assets |  | BrandSurvey / BusinessAsset；get_brand_archive_survey / get_brand_business_assets |
| O05 | Object | active_seed | 运营账号／竞品账号 | 内容发布或采集对应的平台账号。 | PlatformAccount / CompetitorAccount / WechatOfficialAccount |  | PlatformAccount / CompetitorAccount / WechatOfficialAccount |
| O06 | Object | candidate | 行业情报与参考证据 | 行业报告、新闻、竞品参考、可追溯网页内容。 | IndustryReport / BusinessAsset；get_brand_industry_feeds |  | IndustryReport / BusinessAsset；get_brand_industry_feeds |
| O07 | Object | active_seed | 采集作品与用户信号 | 品牌作品、竞品作品、对标作品、搜索结果、评论、目标用户。 | get_douyin_collection_workspace / get_xiaohongshu_collection_workspace / get_wechat_collection_workspace |  | get_douyin_collection_workspace / get_xiaohongshu_collection_workspace / get_wechat_collection_workspace |
| O08 | Object | active_seed | 增长报告／营销策略 | 品牌定位、阶段目标、渠道策略及内容组合方案。 | OpenClawMarketingPlan / BusinessAsset；manage_growth_reports / get_openclaw_marketing_plans |  | OpenClawMarketingPlan / BusinessAsset；manage_growth_reports / get_openclaw_marketing_plans |
| O09 | Object | active_seed | 营销日历／排期项 | 哪天为哪个业务目的做什么内容。 | manage_growth_reports；get_brand_growth_marketing_calendar_workspace |  | manage_growth_reports；get_brand_growth_marketing_calendar_workspace |
| O10 | Object | active_seed | 选题项 | 可确认、可修改、可被下游创作引用的选题。 | get_brand_growth_topic_library_workspace / create_brand_growth_topic_library_item |  | get_brand_growth_topic_library_workspace / create_brand_growth_topic_library_item |
| O11 | Object | candidate | 每日计划／选题报告 | 按日期交付的执行简报或候选选题报告。 | OpenClawDailyPlan；create_ai_control_center_daily_plan |  | OpenClawDailyPlan；create_ai_control_center_daily_plan |
| O12 | Object | active_seed | 创作包 | 从选题转换为文案、广告简报、剧情脚本、讲解结构或创意概念的交接产物。 | 本地文件；可归档 OpenClawCreativeMaterial |  | 本地文件；可归档 OpenClawCreativeMaterial |
| O13 | Object | candidate | 视频配置包 | DESIGN.md、STORYBOARD.md、demo.html 三件套组成的一次制作方案版本。 | 本地工作目录；建议统一登记为一组交付物 |  | 本地工作目录；建议统一登记为一组交付物 |
| O14 | Object | active_seed | 素材／设计作品 | 产品图、封面、配图、音频、视频片段等可复用资源。 | MediaAsset / OpenClawCreativeMaterial；统一素材库、设计工作台 |  | MediaAsset / OpenClawCreativeMaterial；统一素材库、设计工作台 |
| O15 | Object | active_seed | 模型／供应商作业 | 一次生图、语音、口型或视频接口的异步执行。 | Task；create_design_work / manage_douyin_video_production / get_task_detail |  | Task；create_design_work / manage_douyin_video_production / get_task_detail |
| O16 | Object | active_seed | 视频成品 | 已制作完成且可以归档和复用的视频作品。 | OpenClawVideoWork；create_ai_control_center_video_work |  | OpenClawVideoWork；create_ai_control_center_video_work |
| O17 | Object | candidate | 小红书原创／二创笔记 | 标题、正文、图片及来源关系构成的内容作品。 | create_xiaohongshu_original_note / create_xiaohongshu_rewrite_note；Task/素材域 |  | create_xiaohongshu_original_note / create_xiaohongshu_rewrite_note；Task/素材域 |
| O18 | Object | active_seed | 公众号文章草稿 | 准备送入公众号工作流或草稿箱的内容。 | WechatArticleDraft；create_wechat_article / manage_wechat_workflow |  | WechatArticleDraft；create_wechat_article / manage_wechat_workflow |
| O19 | Object | active_seed | 公众号工作流会话 | 把文章、排版、配图、账号和提交进度绑定在一起。 | WechatWorkflowSession；manage_wechat_workflow |  | WechatWorkflowSession；manage_wechat_workflow |
| O20 | Object | active_seed | 发布记录／平台回执 | 记录往哪个账号提交了什么、结果是什么。 | WechatPublishHistory；蚁小二 yxer 发布记录 |  | WechatPublishHistory；蚁小二 yxer 发布记录 |
| O21 | Object | active_seed | 效果观察／数据快照 | 某作品在某时间窗口的阅读、播放、互动或转化观测。 | 采集工作区；达人合作作品指标；外部广告报表 |  | 采集工作区；达人合作作品指标；外部广告报表 |
| O22 | Object | active_seed | 复盘报告 | 解释一段时间内业务效果，并给出下周期动作。 | OpenClawLobsterDiary / OpenClawTencentAdLead / OpenClawGeoVisibilityReport |  | OpenClawLobsterDiary / OpenClawTencentAdLead / OpenClawGeoVisibilityReport |
| O23 | Object | active_seed | 策略优化记录／增长记忆 | 把反复验证有效的结论沉淀为以后能读取的经验。 | OpenClawStrategyOptimization；create_ai_control_center_strategy_optimization；增长记忆可为本地文件 |  | OpenClawStrategyOptimization；create_ai_control_center_strategy_optimization；增长记忆可为本地文件 |
| O24 | Object | active_seed | GEO可见度诊断 | 品牌在指定AI平台、查询和时间下的被提及／推荐情况。 | OpenClawGeoVisibilityReport；create_ai_control_center_geo_visibility_report |  | OpenClawGeoVisibilityReport；create_ai_control_center_geo_visibility_report |
| O25 | Object | candidate | GEO关键词／追问项 | 品牌词、行业词、意图词、长尾词及追问对策。 | 本地xlsx/html；OpenClawGeoContent可承接文档 |  | 本地xlsx/html；OpenClawGeoContent可承接文档 |
| O26 | Object | candidate | 网站及网站诊断 | 官网页面和结构化标记的可访问性、完整度与可读性检查。 | 外部官网；本地诊断docx/html，可归档业务资产/GEO内容 |  | 外部官网；本地诊断docx/html，可归档业务资产/GEO内容 |
| O27 | Object | active_seed | 知识库／知识文件／知识条目 | 品牌事实与FAQ被整理为可检索资料。 | KnowledgeBase / KnowledgeBaseFile / KnowledgeChunk / KnowledgeEmbedding / KnowledgeBinding / KnowledgeRetrievalConfig / KnowledgeBaseSyncRun / KnowledgeInvocationRun |  | KnowledgeBase / KnowledgeBaseFile / KnowledgeChunk / KnowledgeEmbedding / KnowledgeBinding / KnowledgeRetrievalConfig / KnowledgeBaseSyncRun / KnowledgeInvocationRun |
| O28 | Object | candidate | GEO优化方案 | 把诊断、关键词、网站和知识库变成排期与改善计划。 | 本地docx/html；可归档OpenClawGeoContent |  | 本地docx/html；可归档OpenClawGeoContent |
| O29 | Object | active_seed | GEO内容 | 自媒体文章、第三方媒体稿件、官网产品页／案例页／FAQ。 | OpenClawGeoContent；create_ai_control_center_geo_content |  | OpenClawGeoContent；create_ai_control_center_geo_content |
| O30 | Object | candidate | 第三方媒体资源／刊发订单 | 选择媒体与提交刊发、查询交付结果。 | OpenClawThirdPartyMediaResource / OpenClawThirdPartyMediaSyncState；第三方媒体delivery服务 |  | OpenClawThirdPartyMediaResource / OpenClawThirdPartyMediaSyncState；第三方媒体delivery服务 |
| O31 | Object | active_seed | 评论／个人候选线索 | 由公开评论或账号信号提取的潜在用户。 | OpenClawCommentLead；create_ai_control_center_comment_leads |  | OpenClawCommentLead；create_ai_control_center_comment_leads |
| O32 | Object | candidate | 企业／本地商家线索 | 能够供B端销售或异业合作进一步核验的企业名单。 | OpenClawPlatformLead；create_ai_control_center_platform_leads |  | OpenClawPlatformLead；create_ai_control_center_platform_leads |
| O33 | Object | active_seed | 达人候选档案 | 公开账号、受众、作品和深抓数据构成的候选达人资料。 | 抖音采集工作区 creatorSearchResults / creatorProfiles / creatorDeepFetchTasks |  | 抖音采集工作区 creatorSearchResults / creatorProfiles / creatorDeepFetchTasks |
| O34 | Object | active_seed | 达人匹配推荐 | 某品牌为什么适合某个达人，是一个有理由的推荐关系。 | OpenClawCreatorCooperationMatch；create_ai_control_center_creator_matches |  | OpenClawCreatorCooperationMatch；create_ai_control_center_creator_matches |
| O35 | Object | active_seed | 达人合作跟踪档案 | 确认进入持续跟踪的达人及其合作范围。 | OpenClawCreatorCooperationTracking；create_ai_control_center_creator_tracking_records |  | OpenClawCreatorCooperationTracking；create_ai_control_center_creator_tracking_records |
| O36 | Object | active_seed | 达人合作作品 | 归属某跟踪档案的一条合作视频及其效果。 | OpenClawCreatorCooperationWork；create/update_ai_control_center_creator_tracking_work |  | OpenClawCreatorCooperationWork；create/update_ai_control_center_creator_tracking_work |
| O37 | Object | active_seed | 广告创意方案／投放复盘 | 图文、短视频、长文创意矩阵与测试/复盘文档。 | OpenClawTencentAdLead；create_ai_control_center_tencent_ad_lead |  | OpenClawTencentAdLead；create_ai_control_center_tencent_ad_lead |
| O38 | Object | candidate | 广告账户／广告组／定向／转化资产 | 腾讯广告平台上真正承载投放的实体。 | tencentads-management / tencentads-delivery-standard-create 外部技能 |  | tencentads-management / tencentads-delivery-standard-create 外部技能 |
| O39 | Object | candidate | 广告效果报表／操作记录 | 广告平台提供的花费、曝光、点击、转化和配置变更。 | 腾讯广告 query-report/query-operation-logs 等脚本 |  | 腾讯广告 query-report/query-operation-logs 等脚本 |
| O40 | Object | active_seed | 设计简报／视觉规范 | 海报、品牌VI、摄影、社交内容或UI设计所需的需求和设计约定。 | design-creator / design-toolkit；本地交付，关联设计工作台 |  | design-creator / design-toolkit；本地交付，关联设计工作台 |
| O41 | Object | active_seed | 业务任务／阶段执行 | 一次有明确目标、终点和交付要求的委托，以及其阶段进度。 | 原Task主要是生成任务；隔离lab已见WfTask / WfStageRun |  | 原Task主要是生成任务；隔离lab已见WfTask / WfStageRun |
| O42 | Object | active_seed | 交付物版本／验收记录 | 某一版本输出的身份、来源、校验与允许进入下游的决定。 | 原文档文件确认；隔离lab WfArtifact / WfApproval / WfGateResult |  | 原文档文件确认；隔离lab WfArtifact / WfApproval / WfGateResult |
| O43 | Object | active_seed | 专家／技能／发布版本 | 可追踪哪套能力定义、哪一版方法执行了任务。 | SkillPackage / SkillPackageVersion / SkillConfig / PromptTemplate / BrandSkillProfile / BrandPromptOverride；lab WfVersionRelease / WfVersionUsage |  | SkillPackage / SkillPackageVersion / SkillConfig / PromptTemplate / BrandSkillProfile / BrandPromptOverride；lab WfVersionRelease / WfVersionUsage |
| O44 | Object | active_seed | 运行能力描述 | 可用模型、应用模板、参数选项和连接器可用性。 | get_design_workspace_options / RunningHub get_app_detail；第三方平台配置域 |  | get_design_workspace_options / RunningHub get_app_detail；第三方平台配置域 |
| O45 | Object | active_seed | 反馈／优化行动 | 用户对输出的反馈、下周要试验的具体改变及验证结果。 | AiResultFeedback；本地周优化单与复盘/策略记录 |  | AiResultFeedback；本地周优化单与复盘/策略记录 |
| O46 | Object | candidate | 品牌资料库 | 统一承接品牌背景、企业介绍、行业与品牌基础事实。 | ontology-system-supplement:O46 | 品牌增长 / 品牌资产设置 | Brand |
| O47 | Object | candidate | IP资料库 | 统一承接 IP 人设、视觉、语音与账号资料。 | ontology-system-supplement:O47 | 品牌增长 / 内容获客 | Brand.ipProfileJson |
| O48 | Object | candidate | 产品资料库 | 统一承接产品、SKU、卖点、价格与素材引用。 | ontology-system-supplement:O48 | 品牌增长 / 内容获客 | Product |
| O49 | Object | candidate | 品牌账号资料库 | 沉淀品牌在小红书、抖音、公众号等平台的官方账号绑定。 | ontology-system-supplement:O49 | 品牌增长 / 内容获客 | PlatformAccount |
| O50 | Object | candidate | 竞品账号资料库 | 沉淀各平台竞品账号与后续采集入口。 | ontology-system-supplement:O50 | 品牌增长 / 内容获客 | CompetitorAccount |
| O51 | Object | candidate | 行业资料库 | 沉淀行业资料、行业报告与外部行业 feed。 | ontology-system-supplement:O51 | 品牌增长 | IndustryFeed |
| O52 | Object | candidate | 业务资产库 | 沉淀品牌业务知识、业务资料和知识绑定摘要。 | ontology-system-supplement:O52 | 品牌增长 / 品牌资产设置 | BusinessAsset |
| O53 | Object | candidate | 知识库 | 承接可上传文件、可绑定品牌的知识库实体。 | ontology-system-supplement:O53 | 品牌资产设置 / 内容获客 | KnowledgeBase |
| O54 | Object | candidate | 统一素材档案 | 聚合创作素材、视频作品、媒体资产、品牌资料与任务产物的统一素材档案。 | ontology-system-supplement:O54 | 统一素材管理 / 内容获客 | asset_archive |
| O55 | Object | candidate | 创作素材档案 | 保存文本、图片、音频、视频、BGM 等可复用创作素材。 | ontology-system-supplement:O55 | 统一素材管理 / AI 智控中心 | AIControlCenterCreativeMaterial |
| O56 | Object | candidate | 视频作品档案 | 保存最终视频作品及其标题、描述、封面和成片地址。 | ontology-system-supplement:O56 | 统一素材管理 / 内容获客 | AIControlCenterVideoWork |
| O57 | Object | candidate | GEO工作流内容 | 保存 GEO 可见度诊断之外的关键词挖掘、网站诊断、知识库搭建、优化方案等结果。 | ontology-system-supplement:O57 | GEO获客 | AIControlCenterGeoContent |
| O58 | Object | candidate | 每周复盘 | 保存各板块每周复盘与历史追踪。 | ontology-system-supplement:O58 | AI 智控中心 / 品牌增长 | lobster_diary |
| O59 | Object | candidate | 营销策划方案 | 保存 HTML 营销策划方案与其留言协作。 | ontology-system-supplement:O59 | AI 智控中心 / 内容获客 | marketing_plan |
| O60 | Object | candidate | 爆款拆解 | 保存爆款分析记录与对应模板引用。 | ontology-system-supplement:O60 | 品牌增长 / 内容获客 | explosive_analysis |
| O61 | Object | candidate | 策略优化记录 | 保存策略优化建议、行动项和历史版本。 | ontology-system-supplement:O61 | AI 智控中心 / 品牌增长 | strategy_optimization |
| O62 | Object | candidate | 每日计划 | 保存各板块每日计划与执行安排。 | ontology-system-supplement:O62 | AI 智控中心 | daily_plan |
| O63 | Object | candidate | 评论获客记录 | 沉淀从评论用户提取后形成的获客对象。 | ontology-system-supplement:O63 | 全网获客 | comment_lead |
| O64 | Object | candidate | 平台获客记录 | 沉淀手工或外部导入的平台获客对象。 | ontology-system-supplement:O64 | 全网获客 | platform_lead |
| O65 | Object | candidate | 腾讯投流获客记录 | 沉淀投流获客线索与留言内容。 | ontology-system-supplement:O65 | 投流获客 | tencent_ad_lead |
| O66 | Object | candidate | 达人匹配记录 | 沉淀达人匹配列表及推荐理由。 | ontology-system-supplement:O66 | 达人合作 | creator_match |
| O67 | Object | candidate | 达人跟踪记录 | 沉淀进入跟踪后的达人建档与跟进状态。 | ontology-system-supplement:O67 | 达人合作 | creator_tracking |
| O68 | Object | candidate | 达人合作作品 | 沉淀某位达人下的合作作品与刷新状态。 | ontology-system-supplement:O68 | 达人合作 | creator_tracking_work |
| O69 | Object | candidate | Ontology草稿 | 编排中心里可继续编辑的流程草稿。 | ontology-system-supplement:O69 | Ontology | ontology_orchestration_flows |
| O70 | Object | candidate | Ontology正式契约 | 发布后不可变的 published_contract。 | ontology-system-supplement:O70 | Ontology / WorkBuddy 路由 | published_contract |
| O71 | Object | candidate | Ontology执行前计划 | 从正式契约派生的 execution_plan。 | ontology-system-supplement:O71 | Ontology / 任务治理 | execution_plan |
| O72 | Object | candidate | 专家源候选Diff | 正式契约写回专家源前的候选 Diff 预览。 | ontology-system-supplement:O72 | Ontology / 专家源治理 | expert_source_diff_preview |
| O73 | Object | candidate | 任务治理证据 | 记录执行前计划、节点推进和素材复用等任务治理证据。 | ontology-system-supplement:O73 | 任务治理 / Ontology | wf_execution_events |
| O74 | Object | candidate | 第三方平台凭证配置 | 保存品牌共享或本机第三方平台凭证配置状态。 | ontology-system-supplement:O74 | 接口与连接器配置 / 个人中心 | third_party_platform |
| O75 | Object | candidate | 本地素材库存储设置 | 保存安装态本地素材库根目录与子目录规则。 | ontology-system-supplement:O75 | 个人中心 / 存储与连接器 | local_material_storage |
| O76 | Object | candidate | 发布接力会话 | 保存抖音/小红书/公众号的手机端或电脑端接力发布会话。 | ontology-system-supplement:O76 | 内容获客 / AI 智控中心 | publish_session |
| O77 | Object | candidate | 设计任务 | 保存设计工作台任务与模型选择。 | ontology-system-supplement:O77 | 设计工作台 | design_work |
| O78 | Object | candidate | 音乐生成任务 | 保存火山音乐等音频生成任务及结果状态。 | ontology-system-supplement:O78 | AI 智控中心 / 统一素材管理 | music_task |

## 品牌连接增量字典（2026-10-21，会话343）

当前Lab active_seed增量；工具契约沿现有MCP和新增品牌管理HTTP接口，不能把下列HTTP动作冒称MCP工具。没有发布新WorkBuddy客户端插件。

| ID | 五元素 | 含义 | 接口/绑定 |
|---|---|---|---|
| O86 | Object | 品牌客户端连接及令牌修订 | AIControlCenterInstallToken.connectionId |
| L51 | Link | 品牌、连接、执行身份、工具授权关系 | 服务端每请求校验 |
| F128 | Function | 解析连接权限和固定品牌 | get_current_brand_context 的connection字段 |
| A172 | Action | 新增独立连接 | POST installation-hub/connections |
| A173 | Action | 单连接轮换凭据 | POST connections/:id/rotate |
| A174 | Action | 撤销单连接 | DELETE connections/:id |
| I32 | Interface | 品牌连接管理与MCP授权契约 | HTTP管理，MCP工具发现/执行范围 |

公共方法不默认赋予每个连接全工具范围；品牌权限与连接工具授权同时有效。独立运行profile与实际专家调用另行验收。

## 品牌模型与执行配置增量（会话344）

| ID | 五元素 | 含义 |
|---|---|---|
| O87 | Object | 品牌执行配置 |
| O88 | Object | 执行配置不可变版本 |
| L52 | Link | 品牌配置与方法组合 |
| F129 | Function | 读取品牌执行配置 |
| F130 | Function | 编译版本化执行配置 |
| F131 | Function | 品牌凭据加密解析 |
| A175 | Action | 保存品牌执行草稿 |
| A176 | Action | 发布品牌执行版本 |
| A177 | Action | 回退品牌配置 |
| I33 | Interface | 品牌模型与执行配置契约 |

新增只读MCP：`get_brand_execution_profile`。模型凭据与配置发布只通过品牌HTTP管理；配置就绪不表示实际模型/专家执行。


## 品牌运营连接授权增量（会话350）

| ID | 五元素 | 含义 |
|---|---|---|
| O89 | Object | 连接授权修订 |
| L53 | Link | 品牌连接与授权修订 |
| F132 | Function | 品牌运营工具投影与子动作校验 |
| A178 | Action | 升级单连接品牌运营授权 |
| I34 | Interface | 品牌运营连接授权契约 |

授权管理为HTTP，不新增MCP工具。203工具及子动作冻结版本化，旧scope不静默扩展。

## 会话353：品牌制作授权增量

- O90 Object：品牌制作能力授权。本品牌独立连接的图片/语音/RunningHub能力与用途、到期时间；版本化JSON复用既有授权修订，不是发布许可
- L54 Link：品牌连接与制作授权期限。单连接绑定当前品牌；制作有效期不超过连接期限，撤销不删除已有任务
- F133 Function：制作能力投影与调用校验。旧14/24/203默认不变；图片仅image模块、语音和RunningHub精确子动作，到期/撤销下一请求拒绝
- A179 Action：设置或撤销连接制作授权。品牌Owner/Admin网页确认，预期令牌ID及静态授权hash，事务追加历史，不重置令牌或密钥
- I35 Interface：制作授权与供应商鉴权契约。HTTP production-authorization管理；MCP上下文/目录/调用同源；蝉镜刷新失败明确供应商令牌而非登录/MCP令牌


## 会话354制作能力默认范围纠正

O90 品牌制作能力范围；L54 品牌运营连接与制作能力；F133 制作能力投影与调用校验；A179 直接使用本品牌制作能力；I35 品牌制作与供应商鉴权契约。353逐项勾选、用途、短期租约、撤销/历史操作退出安装页，旧历史保留兼容；完整品牌运营连接默认可用三类制作，缺配置时正常报错，实际付费生成和发布不作为开发测试。


## 素材索引增量（357）

- O91 素材索引修订：MaterialArchiveRevision，按品牌/证据引用追加不可变修订。
- L55 产品与片段复用关系：产品、SKU、片段、来源/脚本/成片、替代版本和已用证据；仅明确关联，未知不推断。
- F134 联查采集原作与可复用素材：采集原片ID、产品/片段/音频/状态检索；先过滤再分页，候选标签与确认标签分开。
- A180 单条入库与素材索引维护：manage_brand_library：import_collected_material/update_material_index/probe_material_file；不批量入库、不调用生成或发布。
- I36 素材发现与人工核验契约：material-index/1.0.0；文件解码证据与水印/字幕/声音/同SKU/商用范围独立，未知保持未知。

## 会话360增量

- O92 Object：独立日历内容与修订。营销日历版本内稳定contentId；日期保留旧ID与正文；MarketingCalendarRevision追加快照，不把排期当制作任务。
- L56 Link：日历内容制作关系。内容关联商品/SKU/原片片段/声音/真实任务/成片/指标快照与来源版本；仅明确引用，不推断同SKU或发布。
- F135 Function：日历资料就绪与可比复盘。按SKU、可用素材、片段、商用证据和声音要求计算缺口；自然流/投放、窗口与来源分别比较，同作品同窗口快照不重复累计。
- A181 Action：日历单条保存与定向恢复。manage_growth_reports的calendar_create_version/save_content/save_day/revisions/restore_revision/review/get_day；CAS、品牌锁与幂等键；保存不调用制作或发布。
- I37 Interface：结构化营销日历契约。marketing-calendar/1.0.0；共享严格schema、默认值及限额；品牌共用日历按平台视图，稳定ID/内容hash/修订；旧正文不自动拆分。

## 巨量广告362增量

- O93 Object：巨量账户及报表快照。BusinessAsset品牌域OCEAN_AD_*保存映射、分页、不可变提交、诊断与计划修订。
- L57 Link：品牌投流证据关联。品牌账户映射、报表快照→诊断→优化计划→本品牌商品和素材明确关联。
- F136 Function：巨量口径及批次校验。缺页/重复页/业务族/目标事件/归因/日期/Decimal校验；仅无附加维度账户日报可累计。
- A182 Action：巨量归档与计划维护。manage_growth_reports的ocean_*动作；幂等键、品牌锁、CAS；不调用广告写接口。
- I38 Interface：巨量归档契约。ocean-ads/1.0.0；查询与分片提交、回读hash、诊断与计划修订；网页与MCP同源。


## 有赞私域运营（378）

“私域运营/有赞会员/客户标签/一人千面”路由youzan-private-operations；先核品牌与店铺，private_get_workspace（manage_growth_reports，payload.privateOps），客户主档复用AI销售。战略→策略→执行分别保存读回，标签有来源/场景/有效期/版本，冲突或未知不做确定推荐。UNKNOWN沿原工具/请求恢复；只读有赞不能当已发券改价。具体对客由AI销售接3Chat，保留实际授权和回执。
