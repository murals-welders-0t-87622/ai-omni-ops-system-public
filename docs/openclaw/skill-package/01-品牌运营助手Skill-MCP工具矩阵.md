# 品牌运营助手 Skill MCP 工具矩阵

## AI销售与私域复购（376）

私域复购已有AI销售`/tabs/private-repurchase/ai-sales`，配置在`/brand-admin/ai-sales`。优先读专用`ai-sales-operations`技能（页面可下载），通过manage_growth_reports的sales_*与payload.aiSales读写客户/企业、商机、跟进/草稿、服务/订单/复购、策略与复盘。WorkBuddy 3Chat当前13工具负责真实查询/确认后发送；没有客户/Agent配置写接口。核渠道归属、分页覆盖与真实证据，未知发送不重发，READY不当在线。新独立权限privateRepurchase.aiSales，子成员按品牌授权。策略保存不当发布，草稿不当已发，受理不当送达，聊天不当回款。



## 1. 使用规则

这份矩阵不是给用户看的，而是给 Skill 自己做路由时查的。

优先原则：

1. 先用网站功能路由工具判断归属域
2. 再从本矩阵里选对应工具
3. 尽量优先统一管理工具，不要把一条完整业务链拆成一堆零散动作

补充原则：

- 先看有没有统一管理工具，再决定是否拆成专用工具
- 先看有没有摘要型工具，再决定是否直接写入
- 对密钥、邀请、发布、删除类动作，默认先读后写

## 2. 功能路由与总入口

- `get_website_function_catalog`
- `get_website_function_detail`
- `route_website_function_by_intent`
- `get_website_function_execution_plan`

用途：

- 看网站有哪些功能
- 看某个功能归哪个业务域
- 根据一句自然语言判断应走哪个模块
- 在执行前拿到输入缺口、风险级别、工具顺序

## 3. 品牌与档案

- `manage_brand_library`
- `get_current_brand_context`
- `get_brand_products`
- `get_platform_accounts`
- `get_brand_archive_summary`
- `get_brand_archive_survey`
- `get_brand_competitor_accounts`
- `get_brand_industry_feeds`
- `get_brand_business_assets`

适用场景：

- 统一读取或维护品牌资料库
- 读取或更新 `IP资料库`
- 上传 IP 图片到品牌资料库
- 上传 IP 语音到品牌资料库（仅 mp3，且时长需大于 30 秒）
- 看当前品牌是谁
- 看品牌产品、平台账号、竞品、行业资料
- 提取品牌档案摘要

`manage_brand_library` 常用 action：

- `get_archive_summary`
- `get_ip_library`
- `update_background`
- `update_ip_library`
- `upload_ip_image`
- `upload_ip_voice`
- `create_product`
- `replace_platform_accounts`
- `create_knowledge_base_files`

## 4. 品牌资料库与采集

### 4.1 小红书采集

- `get_xiaohongshu_collection_workspace`
- `sync_xiaohongshu_brand_accounts`
- `sync_xiaohongshu_competitor_accounts`
- `sync_xiaohongshu_brand_notes`
- `sync_xiaohongshu_benchmark_notes`
- `sync_xiaohongshu_search_notes`
- `sync_xiaohongshu_comment_data`
- `get_xiaohongshu_comment_replies`
- `sync_xiaohongshu_target_users`
- `sync_xiaohongshu_feishu_workspace`
- `add_xiaohongshu_note_to_material_library`

### 4.2 抖音采集

- `get_douyin_collection_workspace`
- `extract_douyin_work_transcript`
- `sync_douyin_brand_accounts`
- `sync_douyin_competitor_accounts`
- `sync_douyin_brand_works`
- `sync_douyin_competitor_works`
- `sync_douyin_benchmark_works`
- `sync_douyin_search_works`
- `sync_douyin_comment_data`
- `add_douyin_creators_to_result_pool`
- `sync_douyin_keyword_recommendations`
- `sync_douyin_low_fan_explosive_works`
- `sync_douyin_high_completion_rate_works`
- `sync_douyin_high_like_rate_works`
- `sync_douyin_city_hotspots`
- `delete_douyin_brand_account`
- `delete_douyin_competitor_account`
- `delete_douyin_keyword_recommendation`

补充说明：

- `get_douyin_collection_workspace`
  - 读取抖音采集工作区聚合结果
  - 当前会同时返回：
    - 视频受控预览地址
    - 原始作品地址
    - 本地或 OSS 存储位置
    - 视频文案提取状态与最近错误
    - 达人搜索结果与达人结果池
    - 达人主页链接
    - 已抓到的联系电话 / 微信号 / 邮箱 / MCN
  - 当网页里看到“打开预览”时，真正的预览优先走站内受控副本，不再要求外部裸链长期可用
- `extract_douyin_work_transcript`
  - 为指定抖音采集作品重新提取视频文案
  - 适用于：
    - 上次因本地 ASR 运行时未就绪而失败
    - 上次长时间停在“提取中”，现在想重新提取
    - 已补齐 Paraformer / Whisper 运行时，想直接重试
  - 调用前优先先读 `get_douyin_collection_workspace` 确认：
    - `assetId`
    - 当前视频是否已有可用预览或原作品地址
    - `transcriptStatus` / `transcriptLastError`

### 4.3 公众号采集

- `get_wechat_collection_workspace`
- `sync_wechat_brand_accounts`
- `delete_wechat_brand_account`
- `fetch_wechat_brand_articles`
- `read_wechat_article_content`
- `sync_wechat_benchmark_articles`
- `update_wechat_benchmark_article_stats`
- `sync_wechat_search_articles`
- `read_wechat_search_item_content`
- `update_wechat_search_item_stats`
- `add_wechat_article_to_material_library`
- `update_wechat_article_stats`
- `delete_wechat_collected_article`

### 4.4 每日热点

- `get_daily_hotspot_workspace`
- `sync_daily_hotspots`

### 4.5 采集删除

- `delete_xhs_collected_note`
- `delete_douyin_collected_work`
- `delete_wechat_collected_article`

## 5. 机会洞察与品牌增长

- `get_opportunity_insight_workspace`
- `generate_opportunity_insight_step_one`
- `generate_opportunity_insight_step_two`
- `generate_opportunity_insight_step_three`
- `get_latest_brand_growth_report_summary`
- `create_brand_growth_report`
- `create_half_year_marketing_plan`
- `manage_growth_reports`
- `get_brand_growth_visual_report_workspace`
- `generate_brand_growth_visual_report`
- `get_brand_growth_marketing_calendar_workspace`
- `generate_brand_growth_marketing_calendar`
- `update_brand_growth_marketing_calendar`
- `get_ai_control_center_explosive_analyses`
- `create_ai_control_center_explosive_analysis`
- `delete_ai_control_center_explosive_analysis`
- `get_brand_growth_topic_library_workspace`
- `generate_brand_growth_topic_candidates`
- `update_brand_growth_topic_library`
- `create_brand_growth_topic_library_item`
- `update_brand_growth_topic_library_item`
- `delete_brand_growth_topic_library_item`
- `get_brand_growth_material_library_items`

适用场景：

- 看当前机会洞察做到哪一步
- 继续推进 step1 / step2 / step3
- 上传 WorkBuddy 已生成的品牌增长报告、生成半年营销规划、生成营销策划方案
- 读取营销日历、选题库、统一素材库相关能力
- 查看、创建、删除品牌增长报告下的 `爆款拆解` HTML 记录
- 直接补某一天的营销日历内容，例如把 2026-07-15 的当天主题、各平台选题和朋友圈内容补进去
- 处理内容获客下某书 / 某音/某号 / 公众号的 `营销日历` 入口；这三个入口当前不新增第二套工具，继续复用品牌增长营销日历语义工具
- 当前营销日历已经去掉技能中心依赖：AI 智控中心 直接走 `manage_growth_reports` 即可，后端不再先读取营销日历 skill / prompt 配置
- 当 AI 智控中心 已经自己生成好每日营销选题时：
  - 整版一次性提交：继续用 `generate_xiaohongshu_marketing_calendar` / `generate_douyin_marketing_calendar` / `generate_wechat_marketing_calendar` 携带 `payload.items`
  - 逐天补写：优先用 `upsert_xiaohongshu_marketing_calendar_item` / `upsert_douyin_marketing_calendar_item` / `upsert_wechat_marketing_calendar_item`
- 逐天补写推荐入参：
  - `selectedDate=YYYY-MM-DD`
  - `payload.item`
  - 可选 `payload.title`
  - `reportId` 可选；不传时后端会自动续写最新营销日历
- 最小提交示例：

```json
{
  "action": "upsert_xiaohongshu_marketing_calendar_item",
  "selectedDate": "2026-09-15",
  "payload": {
    "title": "品牌全平台营销日历",
    "item": {
      "date": "2026-09-15",
      "brandMarketing": { "theme": "中秋送礼预热", "description": "围绕节前送礼场景预热" },
      "xiaohongshu": {
        "brandAccount": { "topic": "中秋礼盒怎么选", "description": "主推送礼决策内容", "contentType": "图文", "noteKeywords": ["中秋礼盒"], "coverKeywords": ["礼盒"], "titleSuggestions": ["中秋礼盒怎么选"], "expectedPerformance": "提升收藏与咨询" },
        "employeeAccount": { "topic": "", "description": "", "contentType": "", "noteKeywords": [], "coverKeywords": [], "titleSuggestions": [], "expectedPerformance": "" }
      },
      "douyin": {
        "brandAccount": { "topic": "", "description": "", "contentType": "", "presentationFormat": "", "copyKeywords": [], "coverKeywords": [], "titleSuggestions": [], "expectedPerformance": "" },
        "ipAccount": { "topic": "", "description": "", "contentType": "", "presentationFormat": "", "copyKeywords": [], "coverKeywords": [], "titleSuggestions": [], "expectedPerformance": "" },
        "employeeAccount": { "topic": "", "description": "", "contentType": "", "presentationFormat": "", "copyKeywords": [], "coverKeywords": [], "titleSuggestions": [], "expectedPerformance": "" }
      },
      "moments": { "topic": "", "description": "", "presentationFormat": "" }
    }
  }
}
```
- 内容获客页面已去掉“生成营销日历”按钮；营销日历当前默认走 AI 智控中心 直提，不再建议从页面触发后端生成

品牌增长报告分栏的推荐直连口径：

- 品牌增长报告：`create_brand_growth_report` 只用于提交 WorkBuddy 已生成的 `reportMarkdown`；中台不通过该工具生成报告正文
- 可视化报告：`get_brand_growth_visual_report_workspace`、`generate_brand_growth_visual_report`
- 营销日历：`get_brand_growth_marketing_calendar_workspace`、`generate_brand_growth_marketing_calendar`、`update_brand_growth_marketing_calendar`
- 爆款拆解：`get_ai_control_center_explosive_analyses`、`create_ai_control_center_explosive_analysis`、`delete_ai_control_center_explosive_analysis`
- 选题库：`get_brand_growth_topic_library_workspace`、`generate_brand_growth_topic_candidates`、`update_brand_growth_topic_library`、`create_brand_growth_topic_library_item`、`update_brand_growth_topic_library_item`、`delete_brand_growth_topic_library_item`
- 素材库：`get_brand_growth_material_library_items`

兼容说明：

- 以上新口径当前都只是对既有 `manage_growth_reports` / `get_unified_material_library_items` 的品牌增长语义别名
- 旧工具仍保留，避免已有 Skill 与 MCP 调用中断
- `manage_growth_reports` 当前兼容内容获客营销日历别名 action，例如 `get_douyin_marketing_calendar_workspace`、`generate_douyin_marketing_calendar`、`update_douyin_marketing_calendar`、`upsert_douyin_marketing_calendar_item`，以及公众号同类 action
- 当目标入口是内容获客三端营销日历时，Skill 需要自己控制字段边界：
  - 某书：只写 `xiaohongshu.*`
  - 某音/某号：只写 `douyin.*`
  - 公众号：只写 `moments.*`
- `爆款拆解` 走 AI 智控中心 独立真源；如果用户还要求把某条爆款拆解 HTML 关联回选题库，需要额外调用 `create_brand_growth_topic_library_item` 或 `update_brand_growth_topic_library_item` 写入 `matchedExplosiveTemplateHtmls`

## 6. 任务与反馈

- `get_task_detail`
- `cancel_task`
- `retry_task`
- `get_recent_tasks_summary`
- `get_failed_tasks_summary`
- `submit_task_result_feedback`
- `get_feedback_summary`
- `get_feedback_analysis`
- `get_prompt_optimization_suggestions`

适用场景：

- 看任务详情
- 取消或重试任务
- 记录生成结果反馈
- 做反馈汇总与提示词优化分析

## 7. 个人中心与团队

### 7.1 个人中心

- `get_personal_center_overview`
- `get_recent_tasks_summary`
- `get_failed_tasks_summary`
- `get_task_detail`
- `cancel_task`
- `retry_task`
- `list_personal_material_assets`
- `get_local_material_storage_settings`
- `update_local_material_storage_settings`
- `list_my_third_party_platforms`
- `check_my_third_party_platform_runtime_access`
- `update_my_third_party_platform_secret`

素材管理补充：

- `list_personal_material_assets`
  - 读取个人中心素材管理聚合列表
  - 可按：
    - `text`
    - `image`
    - `audio`
    - `video`
    四类筛选
  - 数据来源统一覆盖网站上传素材与 AI 智控中心 入库素材
- `get_local_material_storage_settings`
  - 读取 `local-single-user` 安装态当前素材库存储目录
  - 回显 `素材库` 根目录、四类子目录和命名规则
- `update_local_material_storage_settings`
  - 更新 `local-single-user` 安装态素材库存储根目录
  - 保存后自动创建 `素材库/文本`、`素材库/图片`、`素材库/语音`、`素材库/视频`
  - 该工具传入的是【素材库】外层根目录，不是最终子目录

第三方平台重点说明：

- `多元探索 / duoyuanx` 当前不是单独的一组专用 MCP tools，而是复用第三方接口配置域的通用工具：
  - `list_my_third_party_platforms`
  - `check_my_third_party_platform_runtime_access`
  - `update_my_third_party_platform_secret`
- Skill 在遇到“多元探索有没有接进来”“这份 Key 能不能给文本、图像、视频、音频、音乐一起用”“现在网站哪些功能能直用多元探索”这类问题时，优先先查平台列表和运行时可用性，不要直接猜测
- 当前多元探索统一网关已预装五类运行时：
  - 文本
  - 图像
  - 视频
  - 音频
  - 音乐
- 这些运行时是否被当前品牌可用，应以 `check_my_third_party_platform_runtime_access` 返回结果为准，而不是靠模型名硬猜
- 当用户明确指定“使用多元探索”时，后续如果继续走设计工作台、视频或其他生成链路，必须继续保留这个平台约束：
  - 先确认 `check_my_third_party_platform_runtime_access` 返回的匹配平台确实是 `多元探索平台`
  - 再从工作台模型列表里选择 `providerName` 明确属于多元探索的 `selectionKey`
  - 不要因为 APIZ / XSkill 也提供 Veo、Seedance、Kling 等同家族模型，就把 APIZ 当成多元探索的替代来源
- 如果用户提到 `Right Codes / right.codes / rightapi.ai`，也不要手写旧域名：
  - 当前默认 Base URL 应为 `https://www.rightapi.ai`
  - 旧域名 `right.codes` 仅作为兼容历史配置与海外网络访问口径保留
  - 查询接入状态时，仍然优先用 `list_my_third_party_platforms` 与 `check_my_third_party_platform_runtime_access`

### 7.2 团队协作

- `list_brand_members`
- `list_brand_invites`
- `create_brand_invite_link`
- `revoke_brand_invite`
- `get_brand_permission_settings`
- `list_my_brand_invites`
- `list_my_brand_invite_notifications`
- `accept_my_brand_invite`

### 7.3 AI 智控中心 安装中心

当前 `AI 智控中心 安装中心` 仍然主要是页面承接域，不新增一套专用写入型 MCP tools。

Skill 在这个域里的职责是：

- 识别用户是在问：
  - AI 智控中心 MCP 怎么安装
  - Skill ZIP / Git 怎么安装
- 然后把用户明确引导到 `个人中心 -> AI 智控中心 安装中心`

当前页面里已经集中提供：

- 品牌安装令牌
- MCP 安装片段
- Skill ZIP / Git 安装说明

注意：

- 第三方接口配置页负责的是“多元探索共享 Key 有没有配好、运行时是否可用”

### 7.3 技能中心

- `get_skill_config_summary`
- `get_skill_config_detail`
- `update_skill_config`
- `reset_skill_to_platform_baseline`

## 8. 知识库

- `get_recent_knowledge_files`
- `create_knowledge_base`
- `upload_knowledge_base_files`
- `manage_brand_library`

适用场景：

- 创建品牌知识库
- 上传品牌资料
- 读取最近新增资料
- 统一管理品牌资料库中的知识相关对象
- 在同一入口下继续维护 `IP资料库` 等品牌归档对象

## 9. 小红书内容与发布

### 9.1 图文内容

- `create_xiaohongshu_original_note`
- `create_xiaohongshu_rewrite_note`
- `get_xiaohongshu_material_library_items`
- `get_xiaohongshu_marketing_calendar_options`
- `get_xiaohongshu_original_reference_templates`
- `get_recent_xiaohongshu_original_works`

### 9.2 视频笔记与发布

- `manage_xiaohongshu_video`
- `create_xiaohongshu_mobile_draft_session`
- `get_xiaohongshu_mobile_draft_session`
- `create_xiaohongshu_desktop_draft_session`
- `get_xiaohongshu_desktop_draft_session`

## 10. 抖音内容、视频与发布

### 10.1 文案

- `get_douyin_original_copy_options`
- `get_recent_douyin_original_copies`
- `create_douyin_original_copy`
- `get_douyin_remix_copy_options`
- `get_recent_douyin_remix_copies`
- `create_douyin_remix_copy`

### 10.2 视频生产统一入口

- `manage_douyin_video_production`

该统一入口覆盖：

- `video`
- `direct_video`
- `remix_short_video`
- `digital_human`
- `lip_sync`
- `runninghub`
- `ad_preaudit`

RunningHub 当前常见 appKey 示例：

- `minimax-h3-fl2va-text-to-video`
- `minimax-h3-fl2va-first-frame-video`
- `minimax-h3-fl2va-first-last-frame-video`
- `minimax-h3-fl2va-multi-image-video`
- `minimax-h3-audio-clip-single-image-digital-human`
- `minimax-h3-multi-image-2k-upscale-v3`
- `minimax-h3-8step-image-to-video`
- `minimax-h3-4step-first-last-frame-video`
- `minimax-h3-accelerated-all-reference-video`
- `minimax-h3-digital-human-auto`
- `seedance25-multimodal-video`
- `seedance20-viral-video-remix`
- `seedance20-fast-all-reference-video`
- `seedance20-fast-rh`
- `qwen-image-chinese-font-design`
- `qwen-font-design-8step`

RunningHub 上传节点补充规则：

- 如果模板 `fieldData` 里带选项列表，而当前 `fieldValue` 是数字索引（例如比例、模式、档位），要按选项标签理解，但提交时仍保留模板要求的原始索引或原始值
- 图片、音频、视频上传节点要么在节点对象顶层传 `localFilePath`，要么传 `upload.fileName / upload.contentType / upload.dataBase64`
- 普通文本 / 数值节点才只改 `fieldValue`；媒体节点不能只剩 `nodeId + fieldName` 空壳
- 如果 RunningHub 返回 `errorCode=803 / JsonNull`，优先排查必填图片 / 音频 / 视频节点是否仍为空
- 不要把 `{ localFilePath: ... }`、`{ fileName, contentType, dataBase64 }` 这类对象直接塞进 `fieldValue` 或 `fieldData`
- 如果把对象误塞进 `fieldValue / fieldData`，服务端现在会直接拦截，并提示这会被错误串成 `[object Object]`

### 10.3 发布会话

- `create_douyin_mobile_publish_session`
- `get_douyin_mobile_publish_session`
- `create_douyin_desktop_publish_session`
- `get_douyin_desktop_publish_session`

## 11. 公众号

### 11.1 读取与发布历史

- `get_wechat_article_drafts`
- `get_wechat_official_accounts`
- `get_wechat_workflow_sessions`
- `get_wechat_publish_history`
- `get_wechat_workflow_preferences`
- `get_wechat_workflow_session_detail`
- `check_wechat_workflow_publish_readiness`
- `get_wechat_publish_history_detail`
- `publish_wechat_article`
- `publish_wechat_workflow`
- `retry_wechat_publish_history`

补充说明：

- `get_wechat_official_accounts`
  - 返回当前品牌已登记的全部公众号账号
  - 可用于让 Skill 在创建工作流或发布前明确选择目标公众号
- `get_wechat_publish_history`
  - 当前每条记录都会带 `accountName`
  - 适合在多公众号并行运营时区分具体发稿账号

### 11.2 工作流统一入口

- `manage_wechat_workflow`

该统一入口覆盖：

- 偏好读取与保存
- 工作流创建与删除
- `set_article`
- `set_images`
- `set_html`
- `generate_article`
- `generate_images`
- `generate_html`
- `rebuild_publish_config`
- `publish_workflow`

补充说明：

- `create_workflow` / `update_input`
  - `payload.accountId` 可显式指定工作流绑定的公众号账号
  - 不传时按默认公众号处理
- `rebuild_publish_config` / `publish_workflow`
  - 会按工作流绑定账号读取 AppID、AppSecret 和 IP 白名单
  - 不再只按单套全局公众号配置执行

## 12. 设计工作台

- `get_design_workspace_options`
- `get_recent_design_works`
- `create_design_work`

适用场景：

- AI 智控中心 自由生图
- 查看最近生图结果

补充说明：

- 图片模块默认走自由生图，不自动套社媒配图模板、不默认植入品牌资料，也不强制追加中文排版文案
- `create_design_work.referenceImageMode` 默认是 `edit_reference`：提供的参考图会作为图像输入发送给生图模型
- 用户明确要求完全忽略参考图、只按文字生成时，传 `referenceImageMode: "prompt_only"`
- 图片主体与场景要求必须传入 `additionalInstruction`；兼容常见图像工具字段 `prompt`，旧字段 `styleHint` 也继续支持。不要只把生成要求写入任务标题或规格字段
- 图片设计支持显式 `imageSize`，格式固定为 `宽x高`，例如 `1200x628`、`1080x1920`
- 兼容旧链路的 `spec: "宽x高"` 仍可继续使用
- 如果用户要用多元探索 `gpt-image-2.5-sunburst` 或 `gpt-image-2.5-flare`，不要手写 providerId，直接使用模型列表里返回的 `selectionKey`
- `get_recent_design_works` 对应的站内页面当前只是结果回看面板，不再给用户手动创建任务

## 13. 统一素材库

- `get_unified_material_library_items`
- `get_douyin_material_library_items`
- `add_xiaohongshu_note_to_material_library`
- `add_douyin_work_to_material_library`
- `add_wechat_article_to_material_library`
- `remove_xiaohongshu_note_from_material_library`
- `remove_douyin_work_from_material_library`

## 14. AI 智控中心 专区

### 14.1 每周复盘

- `get_ai_control_center_lobster_diaries`
- `create_ai_control_center_lobster_diary`
- `update_ai_control_center_lobster_diary`
- `delete_ai_control_center_lobster_diary`

### 14.2 每日计划

- `get_ai_control_center_daily_plans`
- `create_ai_control_center_daily_plan`
- `delete_ai_control_center_daily_plan`

### 14.3 营销策划方案

- `get_ai_control_center_marketing_plans`
- `create_ai_control_center_marketing_plan`
- `delete_ai_control_center_marketing_plan`

营销策划方案当前统一字段：

- `title`
- `htmlContent`
- `createdAt`

营销策划方案补充：

- `create_ai_control_center_marketing_plan`
  - 用于把 AI 智控中心 生成完成的 HTML 营销策划方案写入某书 / 某音 / 公众号板块
  - 详情页默认支持 HTML 预览、打开 HTML 和留言协作

### 14.4 腾讯投流获客

- `get_ai_control_center_tencent_ad_leads`
- `create_ai_control_center_tencent_ad_lead`
- `delete_ai_control_center_tencent_ad_lead`

腾讯投流获客当前统一字段：

- `title`
- `content`
- `createdAt`

腾讯投流获客补充：

- `create_ai_control_center_tencent_ad_lead`
  - 用于把 AI 智控中心 生成完成的腾讯投流获客内容写入 `投流获客 -> 腾讯投流获客`
  - 详情页默认支持正文查看、留言协作和删除

### 14.4A 爆款拆解

- `get_ai_control_center_explosive_analyses`
- `create_ai_control_center_explosive_analysis`
- `delete_ai_control_center_explosive_analysis`

爆款拆解当前统一字段：

- `title`
- `tags`
- `htmlContent`
- `authorName`
- `workUrl`
- `videoCopy`
- `createdAt`

爆款拆解补充：

- `create_ai_control_center_explosive_analysis`
  - 用于把 AI 智控中心 生成完成的爆款拆解 HTML 写入 `品牌增长报告 -> 爆款拆解`
  - 详情页默认支持 HTML 预览、留言协作和删除

### 14.5 达人合作

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

达人合作当前统一字段：

- 达人匹配
  - 延续达人结果池的达人基础字段
  - `recommendedReason`
  - `isInTrackingList`
- 达人跟踪
  - 延续达人结果池的达人基础字段
  - `cooperationWorkCount`
- 合作作品
  - `title`
  - `douyinWorkUrl`
  - `playCount`
  - `likeCount`
  - `collectCount`
  - `commentCount`
  - `shareCount`
  - `resultEvaluation`
  - `nextAction`
  - `refreshIntervalDays`
  - `lastSyncedAt`
  - `nextRefreshAt`

达人合作补充：

- `create_ai_control_center_creator_matches`
  - 用于把达人结果池中的达人写入 `达人合作 -> 达人匹配`
- `move_ai_control_center_creator_matches_to_tracking`
  - 用于把达人匹配中的达人加入 `达人跟踪`
- `create_ai_control_center_creator_tracking_work`
  - 用于给某位达人新增合作作品，并同步写入首轮作品数据与自动更新频率
- `update_ai_control_center_creator_tracking_work`
  - 用于更新结果评估 / 再次选择 / 自动更新周期，或手动刷新一次作品数据

### 14.6 策略优化记录

- `get_ai_control_center_strategy_optimizations`
- `create_ai_control_center_strategy_optimization`
- `update_ai_control_center_strategy_optimization`
- `delete_ai_control_center_strategy_optimization`

补充说明：

- 仅用于 `brand_growth / xiaohongshu / douyin / wechat`
- 不用于 GEO 关键词挖掘、网站诊断、知识库搭建、GEO优化方案

### 14.7 音乐生成

- `create_volcengine_music_task`
- `get_volcengine_music_task`

### 14.7 创作素材

- `get_ai_control_center_creative_materials`
- `create_ai_control_center_creative_material`
- `delete_ai_control_center_creative_material`

创作素材当前统一字段：

- `title`
- `sourceKind`
- `materialTags`
- `sourceLabel`
- `createdAt`
- `storageKey`
- `localFilePath`

创作素材补充：

- `create_ai_control_center_creative_material`
  - 支持 `sourceKind`
    - `material_library_upload`：网站上传并写入本地素材库
    - `ai_control_center_upload`：AI 智控中心 上传到网站或外部归档素材
  - 当 `sourceKind=material_library_upload` 且当前环境为 `local-single-user` 时，文件会按四分类写入用户配置的 `素材库`

### 14.8 视频作品

- `get_ai_control_center_video_works`
- `create_ai_control_center_video_work`
- `delete_ai_control_center_video_work`
- `create_ai_control_center_video_work_douyin_desktop_publish_session`

## 15. GEO获客

- `get_ai_control_center_geo_visibility_reports`
- `create_ai_control_center_geo_visibility_report`
- `delete_ai_control_center_geo_visibility_report`
- `get_ai_control_center_geo_contents`
- `create_ai_control_center_geo_content`
- `delete_ai_control_center_geo_content`
- `get_ai_control_center_third_party_media_delivery_resources`
- `sync_ai_control_center_third_party_media_delivery_resources`

补充说明：

- GEO 关键词挖掘、网站诊断、知识库搭建、GEO优化方案统一通过 `create_ai_control_center_geo_content` 保存

第三方媒体投放缓存补充：

- `get_ai_control_center_third_party_media_delivery_resources`
  - 读取 GEO `第三方媒体投放` 当前已缓存的软文街媒体库
  - 支持：
    - `page`
    - `searchKeyword`
  - 页面语义固定为站内每页 20 条，而不是远端接口原始分页
- `sync_ai_control_center_third_party_media_delivery_resources`
  - 继续同步软文街下一页媒体到当前品牌缓存库
  - 不覆盖历史缓存
  - 返回同步后的站内分页结果
  - 若同步返回软文街鉴权失败，优先提醒用户到个人中心核对当前品牌保存的 `登录账号 / 登录密码` 是否还是最新可用值

## 16. 全网获客

- `get_ai_control_center_comment_leads`
- `create_ai_control_center_comment_leads`
- `delete_ai_control_center_comment_lead`
- `get_ai_control_center_platform_leads`
- `create_ai_control_center_platform_leads`
- `delete_ai_control_center_platform_lead`

## 17. 统一优先级

### 17.1 优先使用的统一管理工具

优先顺序：

1. `manage_brand_library`
2. `manage_growth_reports`
3. `manage_wechat_workflow`
4. `manage_xiaohongshu_video`
5. `manage_douyin_video_production`

### 17.2 什么时候用直连工具

- 用户目标非常明确
- 不需要先走复杂工作流
- 统一工具之外有更短的专用链路
- 用户已经给出了完整输入，不必再经过多步工作流
- 如果用户显式指定“用多元探索跑”，也不要先假设存在单独的 `duoyuanx_generate_*` 工具；应先在第三方接口配置域确认品牌共享 Key 和对应 runtime 是否可用，再路由到网站已有工作台或统一工具

### 17.3 什么时候先做页面承接

- 当前没有直连 MCP
- 风险很高，且需要用户在网页里做最终人工确认
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


## RunningHub 应用目录增补（2026-10-25）

新增 `seedance-mini-image-to-video`（Seedance Mini-图生视频+全节点注释），官方webappId `2069739201603661825`。通过 runninghub:list_apps / get_app_detail 读取本品牌实时参数，再按现有上传/生成/作品归档契约执行；不要自造节点或把示例图当真实输入。生成速度未实测，不因Mini名称承诺更快；参数请求15秒超时可重试读取，不自动重试付费生成。


## RunningHub 多参应用增补（2026-10-25）

新增 `seedance20-mini-multi-reference`（自用seedance2.0 Mini多参），webappId `2089757422163419137`。保留 `seedance-mini-image-to-video`。先读取实时应用模板，按既有本品牌上传、生成及作品归档契约执行；不根据名称猜节点，不把示例素材当用户输入，不承诺Mini更快，不自动重试收费生成。


## 有赞私域运营（378）

“私域运营/有赞会员/客户标签/一人千面”路由youzan-private-operations；先核品牌与店铺，private_get_workspace（manage_growth_reports，payload.privateOps），客户主档复用AI销售。战略→策略→执行分别保存读回，标签有来源/场景/有效期/版本，冲突或未知不做确定推荐。UNKNOWN沿原工具/请求恢复；只读有赞不能当已发券改价。具体对客由AI销售接3Chat，保留实际授权和回执。
