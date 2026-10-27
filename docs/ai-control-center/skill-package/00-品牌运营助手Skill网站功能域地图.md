# 品牌运营助手 Skill 网站功能域地图

## AI销售与私域复购（376）

私域复购已有AI销售`/tabs/private-repurchase/ai-sales`，配置在`/brand-admin/ai-sales`。优先读专用`ai-sales-operations`技能（页面可下载），通过manage_growth_reports的sales_*与payload.aiSales读写客户/企业、商机、跟进/草稿、服务/订单/复购、策略与复盘。WorkBuddy 3Chat当前13工具负责真实查询/确认后发送；没有客户/Agent配置写接口。核渠道归属、分页覆盖与真实证据，未知发送不重发，READY不当在线。新独立权限privateRepurchase.aiSales，子成员按品牌授权。策略保存不当发布，草稿不当已发，受理不当送达，聊天不当回款。



## 1. 这份文档怎么用

这份文档是给 \`品牌运营助手\` 主 Skill 配套使用的外部能力地图，用来回答 4 件事：

1. 网站现在有哪些真实业务域
2. 每个业务域对应哪个页面入口
3. 哪些能力可以直接通过 MCP 执行
4. 哪些能力当前仍以网站页面承接为主

涉及“网站里那个板块”“某个页面上的功能”“这个模块能不能直接做”时，优先配合：

- \`get_website_function_catalog\`
- \`get_website_function_detail\`
- \`route_website_function_by_intent\`
- \`get_website_function_execution_plan\`

## 2. 总体规则

- 当前品牌是默认上下文，除非用户明确切换品牌
- 能直接通过 MCP 执行的，优先在对话里完成
- 只有当前还没有直连 MCP 的页面功能，才引导用户回网页
- 即便当前要回网页，也要先告诉用户应去哪个页面、做什么动作、为什么不能直接在对话里完成

## 3. 网站功能域总览

### 3.1 品牌增长 \`/brand-growth\`

当前承载品牌资料库、知识库、采集、增长报告、统一素材库和 AI 智控中心 归档区。

当前优先 MCP：

- \`manage_brand_library\`
- \`manage_growth_reports\`
- \`get_unified_material_library_items\`
- \`get_xiaohongshu_collection_workspace\`
- \`get_douyin_collection_workspace\`
- \`get_wechat_collection_workspace\`
- \`get_ai_control_center_daily_plans\`
- \`get_ai_control_center_lobster_diaries\`
- \`update_ai_control_center_lobster_diary\`
- \`get_ai_control_center_strategy_optimizations\`
- \`update_ai_control_center_strategy_optimization\`
- \`get_ai_control_center_creative_materials\`
- \`get_ai_control_center_video_works\`

### 3.2 小红书 \`/xiaohongshu\`

当前承载原创图文、二创图文、视频笔记和草稿接力。

当前优先 MCP：

- \`create_xiaohongshu_original_note\`
- \`create_xiaohongshu_rewrite_note\`
- \`manage_xiaohongshu_video\`
- \`create_xiaohongshu_mobile_draft_session\`
- \`create_xiaohongshu_desktop_draft_session\`

### 3.3 抖音 \`/douyin\`

当前承载原创文案、二创文案、AI 生视频、数字人、口型驱动、RunningHub、广告预审和发布工作流。

当前优先 MCP：

- \`create_douyin_original_copy\`
- \`create_douyin_remix_copy\`
- \`manage_douyin_video_production\`
- \`create_douyin_mobile_publish_session\`
- \`create_douyin_desktop_publish_session\`

处理原则：

- 普通视频、直接视频、混剪短视频、数字人、口型驱动、RunningHub、广告预审都优先从 \`manage_douyin_video_production\` 进入

RunningHub 当前常见 appKey 示例：

- \`minimax-h3-fl2va-text-to-video\`
- \`minimax-h3-fl2va-first-frame-video\`
- \`minimax-h3-fl2va-first-last-frame-video\`
- \`minimax-h3-fl2va-multi-image-video\`
- \`minimax-h3-audio-clip-single-image-digital-human\`
- \`minimax-h3-multi-image-2k-upscale-v3\`
- \`minimax-h3-8step-image-to-video\`
- \`minimax-h3-4step-first-last-frame-video\`
- \`minimax-h3-accelerated-all-reference-video\`
- \`minimax-h3-digital-human-auto\`
- \`seedance25-multimodal-video\`
- \`seedance20-viral-video-remix\`
- \`seedance20-fast-all-reference-video\`
- \`seedance20-fast-rh\`
- \`qwen-image-chinese-font-design\`
- \`qwen-font-design-8step\`

### 3.4 公众号 \`/wechat\`

当前承载正文工作流、配图、HTML 排版、发布确认、正式发布和发布历史。

当前优先 MCP：

- \`manage_wechat_workflow\`
- \`get_wechat_workflow_sessions\`
- \`check_wechat_workflow_publish_readiness\`
- \`publish_wechat_workflow\`
- \`get_wechat_publish_history\`

### 3.5 设计工作台 \`/more-features/design\`

当前承载图片、HTML、PPT 和视频方案设计。

当前优先 MCP：

- \`get_design_workspace_options\`
- \`get_recent_design_works\`
- \`create_design_work\`

### 3.6 个人中心 \`/personal-center\`

当前承载概览、任务、素材管理、作品、技能、第三方接口配置、AI 智控中心 安装中心、团队协作和高级·成员邀请（兼容）。

当前优先 MCP：

- \`get_personal_center_overview\`
- \`get_recent_tasks_summary\`
- \`get_failed_tasks_summary\`
- \`list_personal_material_assets\`
- \`get_local_material_storage_settings\`
- \`update_local_material_storage_settings\`
- \`get_skill_config_summary\`
- \`list_my_third_party_platforms\`
- \`list_brand_members\`
- \`list_brand_invites\`
- \`create_brand_invite_link\`

页面承接为主：

- 高级·账号与安全
- AI 智控中心 安装中心里的可视化复制动作
- 作品中心的大范围人工浏览

素材管理补充：

- 当前统一聚合网站上传素材与 AI 智控中心 入库素材
- 固定按 \`文本 / 图片 / 语音 / 视频\` 四类组织
- \`local-single-user\` 安装态下可直接读取和更新素材库存储目录
- 用户选择的是【素材库】外层根目录，系统会自动创建：
  - \`素材库/文本\`
  - \`素材库/图片\`
  - \`素材库/语音\`
  - \`素材库/视频\`
- 网站上传素材会落到用户配置的本地素材库
- AI 智控中心 上传素材不强制进入素材库，但同样会进入四分类列表

### 3.7 GEO获客 \`/geo\`

当前承载 GEO 可见度诊断，以及关键词挖掘、网站诊断、知识库搭建、GEO优化方案、自媒体内容、第三方媒体、品牌网站等内容的查看、保存、删除与存储地址回显。

当前优先 MCP：

- \`get_ai_control_center_geo_visibility_reports\`
- \`create_ai_control_center_geo_visibility_report\`
- \`delete_ai_control_center_geo_visibility_report\`

### 3.8 全网获客 \`/all-network-growth\`

当前承载评论获客与平台获客两块列表；其中评论获客由 AI 智控中心 从品牌增长评论用户结果生成，平台获客由 AI 智控中心 直接写入平台名单。

当前优先 MCP：

- \`get_ai_control_center_comment_leads\`
- \`create_ai_control_center_comment_leads\`
- \`delete_ai_control_center_comment_lead\`
- \`get_ai_control_center_platform_leads\`
- \`create_ai_control_center_platform_leads\`
- \`delete_ai_control_center_platform_lead\`

### 3.9 投流获客 \`/paid-acquisition\`

当前承载：

- 腾讯投流获客列表

其中腾讯投流获客由 AI 智控中心 直接写入标题和正文内容。

当前优先 MCP：

- \`get_ai_control_center_tencent_ad_leads\`
- \`create_ai_control_center_tencent_ad_lead\`
- \`delete_ai_control_center_tencent_ad_lead\`

### 3.10 达人合作 \`/creator-cooperation\`

当前承载：

- 达人匹配
- 达人跟踪

该板块与 \`投流获客\` 同级独立；AI 智控中心 从达人结果池筛出匹配达人、加入达人跟踪，并持续维护合作作品与自动更新周期。

当前优先 MCP：

- \`get_ai_control_center_creator_match_workspace\`
- \`create_ai_control_center_creator_matches\`
- \`delete_ai_control_center_creator_matches\`
- \`move_ai_control_center_creator_matches_to_tracking\`
- \`get_ai_control_center_creator_tracking_workspace\`
- \`create_ai_control_center_creator_tracking_records\`
- \`delete_ai_control_center_creator_tracking_record\`
- \`get_ai_control_center_creator_tracking_works\`
- \`create_ai_control_center_creator_tracking_work\`
- \`update_ai_control_center_creator_tracking_work\`
- \`delete_ai_control_center_creator_tracking_work\`

### 3.11 后台管理 \`/admin\`

默认不是品牌员工的标准执行域；非管理员会话不要默认把后台当成可执行域。

## 4. 对话直连 vs 页面承接

### 4.1 默认优先对话直连

- 品牌资料库
- 知识库
- 增长报告
- 小红书
- 抖音
- 公众号
- 设计工作台
- 个人中心里的任务 / 订单 / 技能 / 第三方接口 / 团队协作
- AI 智控中心 数据归档
- GEO获客报告
- 全网获客

### 4.2 默认先读后写

- 技能配置
- 第三方接口配置
- 邀请与权限
- 公众号正式发布
- 发布会话创建

### 4.3 默认页面承接

- AI 智控中心 安装中心的人工安装步骤
- 高级·账号与安全
- 后台管理台
- 当前尚未开放 MCP 的纯浏览型能力

## 5. 一句话结论

品牌运营助手要把整站功能理解为“可直接对话执行、需要确认后执行、当前仍以页面承接为主”三类统一路由。

## RunningHub 应用目录增补（2026-10-25）

新增 `seedance-mini-image-to-video`（Seedance Mini-图生视频+全节点注释），官方webappId `2069739201603661825`。通过 runninghub:list_apps / get_app_detail 读取本品牌实时参数，再按现有上传/生成/作品归档契约执行；不要自造节点或把示例图当真实输入。生成速度未实测，不因Mini名称承诺更快；参数请求15秒超时可重试读取，不自动重试付费生成。


## RunningHub 多参应用增补（2026-10-25）

新增 `seedance20-mini-multi-reference`（自用seedance2.0 Mini多参），webappId `2089757422163419137`。保留 `seedance-mini-image-to-video`。先读取实时应用模板，按既有本品牌上传、生成及作品归档契约执行；不根据名称猜节点，不把示例素材当用户输入，不承诺Mini更快，不自动重试收费生成。


## 有赞私域运营（378）

“私域运营/有赞会员/客户标签/一人千面”路由youzan-private-operations；先核品牌与店铺，private_get_workspace（manage_growth_reports，payload.privateOps），客户主档复用AI销售。战略→策略→执行分别保存读回，标签有来源/场景/有效期/版本，冲突或未知不做确定推荐。UNKNOWN沿原工具/请求恢复；只读有赞不能当已发券改价。具体对客由AI销售接3Chat，保留实际授权和回执。
