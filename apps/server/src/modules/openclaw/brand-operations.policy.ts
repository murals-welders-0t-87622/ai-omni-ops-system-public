import { PRIVATE_OPS_ACTIONS } from "@ai-omni/shared/private-operations";
import { SALES_ACTIONS } from "@ai-omni/shared/ai-sales";
import { type ProductionCapability } from "./connection-production-grant";
/** Explicit reviewed catalog snapshot. New catalog tools never inherit brand access automatically. */
export const BRAND_OPERATIONS_POLICY_VERSION = "brand-operations/1.0.0";
export const CONNECTION_BRAND_TOOLS: readonly string[] = [
  "get_brand_execution_profile",
  "list_collected_works_for_analysis",
  "get_collected_work_analysis_context",
  "get_work_analysis_taxonomy",
  "create_work_analysis_request",
  "list_work_analysis_requests",
  "update_work_analysis_request",
  "submit_work_analysis_result",
  "list_work_analysis_results",
  "get_work_analysis_result",
  "get_growth_executor_state",
  "report_growth_executor_state",
  "get_growth_cockpit",
  "create_growth_plan_request",
  "list_growth_plans",
  "get_growth_plan",
  "update_growth_plan",
  "submit_growth_plan",
  "record_growth_metric_fact",
  "check_growth_plan",
  "list_growth_expert_queue",
  "claim_growth_plan_check",
  "submit_growth_plan_proposal",
  "get_website_function_catalog",
  "get_website_function_detail",
  "route_website_function_by_intent",
  "get_website_function_execution_plan",
  "get_current_brand_context",
  "get_brand_products",
  "get_platform_accounts",
  "get_brand_archive_summary",
  "get_brand_archive_survey",
  "get_brand_competitor_accounts",
  "get_brand_industry_feeds",
  "get_brand_business_assets",
  "get_xiaohongshu_collection_workspace",
  "sync_xiaohongshu_brand_accounts",
  "sync_xiaohongshu_competitor_accounts",
  "sync_xiaohongshu_brand_notes",
  "sync_xiaohongshu_benchmark_notes",
  "sync_xiaohongshu_search_notes",
  "sync_xiaohongshu_comment_data",
  "get_xiaohongshu_comment_replies",
  "sync_xiaohongshu_target_users",
  "sync_xiaohongshu_feishu_workspace",
  "add_xiaohongshu_note_to_material_library",
  "get_douyin_collection_workspace",
  "sync_douyin_brand_accounts",
  "sync_douyin_competitor_accounts",
  "sync_douyin_brand_works",
  "sync_douyin_competitor_works",
  "sync_douyin_benchmark_works",
  "sync_douyin_search_works",
  "sync_douyin_comment_data",
  "sync_douyin_target_users",
  "search_douyin_creators",
  "create_douyin_creator_deep_fetch_tasks",
  "add_douyin_creators_to_result_pool",
  "delete_douyin_brand_account",
  "delete_douyin_competitor_account",
  "delete_douyin_keyword_recommendation",
  "sync_douyin_keyword_recommendations",
  "sync_douyin_low_fan_explosive_works",
  "sync_douyin_high_completion_rate_works",
  "sync_douyin_high_like_rate_works",
  "sync_douyin_city_hotspots",
  "get_daily_hotspot_workspace",
  "sync_daily_hotspots",
  "get_opportunity_insight_workspace",
  "list_my_third_party_platforms",
  "check_my_third_party_platform_runtime_access",
  "list_personal_material_assets",
  "list_brand_members",
  "list_brand_invites",
  "get_brand_permission_settings",
  "get_task_detail",
  "cancel_task",
  "get_recent_tasks_summary",
  "get_failed_tasks_summary",
  "get_recent_knowledge_files",
  "get_skill_config_summary",
  "get_skill_config_detail",
  "update_skill_config",
  "reset_skill_to_platform_baseline",
  "submit_task_result_feedback",
  "get_feedback_summary",
  "get_feedback_analysis",
  "get_prompt_optimization_suggestions",
  "get_wechat_article_drafts",
  "get_wechat_official_accounts",
  "get_wechat_workflow_sessions",
  "get_wechat_publish_history",
  "get_wechat_workflow_preferences",
  "get_wechat_workflow_session_detail",
  "check_wechat_workflow_publish_readiness",
  "get_wechat_publish_history_detail",
  "get_xiaohongshu_mobile_draft_session",
  "get_xiaohongshu_desktop_draft_session",
  "get_douyin_mobile_publish_session",
  "get_douyin_desktop_publish_session",
  "get_design_workspace_options",
  "get_recent_design_works",
  "get_latest_brand_growth_report_summary",
  "create_brand_growth_report",
  "get_brand_growth_visual_report_workspace",
  "get_brand_growth_marketing_calendar_workspace",
  "update_brand_growth_marketing_calendar",
  "get_brand_growth_topic_library_workspace",
  "update_brand_growth_topic_library",
  "create_brand_growth_topic_library_item",
  "update_brand_growth_topic_library_item",
  "delete_brand_growth_topic_library_item",
  "get_brand_growth_material_library_items",
  "create_knowledge_base",
  "upload_knowledge_base_files",
  "get_douyin_original_copy_options",
  "get_recent_douyin_original_copies",
  "get_douyin_remix_copy_options",
  "get_recent_douyin_remix_copies",
  "get_xiaohongshu_material_library_items",
  "get_xiaohongshu_marketing_calendar_options",
  "get_xiaohongshu_original_reference_templates",
  "get_recent_xiaohongshu_original_works",
  "get_ai_control_center_lobster_diaries",
  "create_ai_control_center_lobster_diary",
  "update_ai_control_center_lobster_diary",
  "delete_ai_control_center_lobster_diary",
  "get_ai_control_center_marketing_plans",
  "create_ai_control_center_marketing_plan",
  "delete_ai_control_center_marketing_plan",
  "get_ai_control_center_explosive_analyses",
  "create_ai_control_center_explosive_analysis",
  "delete_ai_control_center_explosive_analysis",
  "get_ai_control_center_strategy_optimizations",
  "create_ai_control_center_strategy_optimization",
  "update_ai_control_center_strategy_optimization",
  "delete_ai_control_center_strategy_optimization",
  "get_ai_control_center_daily_plans",
  "create_ai_control_center_daily_plan",
  "delete_ai_control_center_daily_plan",
  "get_volcengine_music_task",
  "search_ai_control_center_asset_archive",
  "record_ai_control_center_material_reuse_evidence",
  "get_ai_control_center_creative_materials",
  "create_ai_control_center_creative_material",
  "delete_ai_control_center_creative_material",
  "get_ai_control_center_video_works",
  "create_ai_control_center_video_work",
  "delete_ai_control_center_video_work",
  "get_ai_control_center_geo_visibility_reports",
  "create_ai_control_center_geo_visibility_report",
  "delete_ai_control_center_geo_visibility_report",
  "get_ai_control_center_geo_contents",
  "create_ai_control_center_geo_content",
  "delete_ai_control_center_geo_content",
  "get_ai_control_center_third_party_media_delivery_resources",
  "sync_ai_control_center_third_party_media_delivery_resources",
  "get_ai_control_center_comment_leads",
  "create_ai_control_center_comment_leads",
  "delete_ai_control_center_comment_lead",
  "get_ai_control_center_platform_leads",
  "create_ai_control_center_platform_leads",
  "delete_ai_control_center_platform_lead",
  "get_ai_control_center_tencent_ad_leads",
  "create_ai_control_center_tencent_ad_lead",
  "delete_ai_control_center_tencent_ad_lead",
  "get_ai_control_center_creator_match_workspace",
  "create_ai_control_center_creator_matches",
  "delete_ai_control_center_creator_matches",
  "move_ai_control_center_creator_matches_to_tracking",
  "get_ai_control_center_creator_tracking_workspace",
  "create_ai_control_center_creator_tracking_records",
  "delete_ai_control_center_creator_tracking_record",
  "get_ai_control_center_creator_tracking_works",
  "create_ai_control_center_creator_tracking_work",
  "update_ai_control_center_creator_tracking_work",
  "delete_ai_control_center_creator_tracking_work",
  "manage_wechat_workflow",
  "manage_brand_library",
  "manage_growth_reports",
  "manage_xiaohongshu_video",
  "manage_douyin_video_production",
  "get_unified_material_library_items",
  "add_douyin_work_to_material_library",
  "add_wechat_article_to_material_library",
  "remove_xiaohongshu_note_from_material_library",
  "remove_douyin_work_from_material_library",
  "get_wechat_collection_workspace",
  "sync_wechat_brand_accounts",
  "delete_wechat_brand_account",
  "fetch_wechat_brand_articles",
  "read_wechat_article_content",
  "sync_wechat_benchmark_articles",
  "update_wechat_benchmark_article_stats",
  "sync_wechat_search_articles",
  "read_wechat_search_item_content",
  "update_wechat_search_item_stats",
  "update_wechat_article_stats",
  "delete_xhs_collected_note",
  "delete_douyin_collected_work",
  "extract_douyin_work_transcript",
  "delete_wechat_collected_article",
  "get_douyin_material_library_items"
];
export const BRAND_OPERATIONS_ACTIONS: Readonly<Record<string, readonly string[]>> = {
  "manage_brand_library": [
    "update_material_index", "import_collected_material", "probe_material_file",
    "get_archive_summary",
    "get_ip_library",
    "get_archive_survey",
    "get_competitor_accounts",
    "get_industry_feeds",
    "get_business_assets",
    "update_background",
    "update_ip_library",
    "upload_ip_image",
    "upload_ip_voice",
    "upload_asset_file",
    "upload_product_image",
    "create_product",
    "update_product",
    "delete_product",
    "upsert_survey",
    "replace_platform_accounts",
    "replace_competitor_accounts",
    "replace_industry_feeds",
    "replace_business_assets",
    "list_knowledge_bases",
    "create_knowledge_base",
    "update_knowledge_base",
    "delete_knowledge_base",
    "list_knowledge_base_files",
    "create_knowledge_base_files",
    "get_knowledge_base_file",
    "delete_knowledge_base_file"
  ],
  "manage_wechat_workflow": [
    "list_drafts",
    "get_preferences",
    "list_accounts",
    "list_workflows",
    "get_workflow",
    "create_workflow",
    "update_input",
    "set_article",
    "update_article",
    "set_images",
    "set_html",
    "update_html_style",
    "check_publish",
    "list_publish_history",
    "get_publish_history",
    "update_draft",
    "delete_workflow"
  ],
  "manage_growth_reports": [
    ...SALES_ACTIONS,
    ...PRIVATE_OPS_ACTIONS,
    "get_growth_workspace",
    "generate_growth_report",
    "upload_growth_report",
    "create_growth_report",
    "update_growth_report",
    "get_visual_growth_workspace",
    "update_visual_growth_report",
    "get_half_year_workspace",
    "get_xiaohongshu_marketing_plan_workspace",
    "update_xiaohongshu_marketing_plan",
    "delete_xiaohongshu_marketing_plan",
    "get_douyin_marketing_plan_workspace",
    "update_douyin_marketing_plan",
    "delete_douyin_marketing_plan",
    "get_douyin_hot_topic_candidates_workspace",
    "update_douyin_topic_library",
    "create_douyin_topic_library_item",
    "update_douyin_topic_library_item",
    "delete_douyin_topic_library_item",
    "get_openclaw_marketing_plans",
    "create_openclaw_marketing_plan",
    "delete_openclaw_marketing_plan",
    "get_xiaohongshu_marketing_calendar_workspace",
    "get_douyin_marketing_calendar_workspace",
    "get_wechat_marketing_calendar_workspace",
    "update_xiaohongshu_marketing_calendar",
    "update_douyin_marketing_calendar",
    "update_wechat_marketing_calendar",
    "upsert_xiaohongshu_marketing_calendar_item",
    "upsert_douyin_marketing_calendar_item",
    "upsert_wechat_marketing_calendar_item",
    "commerce_save_operation_draft", "commerce_record_operation_receipt", "commerce_execute_operation", "commerce_request_plan_task", "commerce_request_detail_task", "commerce_claim_detail_task", "commerce_report_detail_task", "commerce_report_detail_executor", "commerce_get_workspace", "commerce_get_detail_history", "commerce_get_detail_reference", "commerce_create_detail_project", "commerce_save_detail_revision", "commerce_confirm_video", "commerce_bind_shop", "commerce_save_shop_snapshot", "commerce_save_operations_plan",
    "ocean_get_workspace", "ocean_bind_account", "ocean_submit_batch", "ocean_commit_batch", "ocean_get_sync_status", "ocean_save_analysis", "ocean_save_plan",
    "calendar_create_version", "calendar_get_day", "calendar_save_content", "calendar_save_day", "calendar_revisions", "calendar_restore_revision", "calendar_review"
  ],
  "manage_xiaohongshu_video": [
    "list_works",
    "list_providers",
    "list_storyboard_image_providers",
    "update",
    "delete"
  ],
  "manage_douyin_video_production": [
    "video:list_works",
    "video:list_providers",
    "video:list_storyboard_image_providers",
    "video:update",
    "video:delete",
    "direct_video:list_works",
    "direct_video:list_providers",
    "direct_video:update",
    "direct_video:delete",
    "remix_short_video:list_works",
    "remix_short_video:delete",
    "digital_human:list_template_tags",
    "digital_human:list_templates",
    "digital_human:list_voice_library",
    "digital_human:list_custom_voices",
    "digital_human:delete_custom_voice",
    "digital_human:get_speech_task",
    "digital_human:list_video_works",
    "digital_human:list_custom_persons",
    "digital_human:delete_custom_person",
    "digital_human:list_favorites",
    "digital_human:save_favorite",
    "digital_human:delete_favorite",
    "digital_human:list_script_templates",
    "digital_human:create_script_template",
    "digital_human:update_script_template",
    "digital_human:delete_script_template",
    "digital_human:delete_video",
    "lip_sync:list_works",
    "lip_sync:delete",
    "runninghub:list_apps",
    "runninghub:get_app_detail",
    "runninghub:list_works",
    "runninghub:delete",
    "ad_preaudit:list_works",
    "ad_preaudit:get_config",
    "ad_preaudit:list_media_assets",
    "ad_preaudit:delete"
  ]
};
export const HELD_CONNECTION_TOOLS: Readonly<Record<string, {group:string;reason:string}>> = {
  "get_local_material_storage_settings": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "update_local_material_storage_settings": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "list_my_orders": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "get_personal_center_overview": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "list_my_brand_invites": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "list_my_brand_invite_notifications": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "accept_my_brand_invite": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "update_my_third_party_platform_secret": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "create_brand_invite_link": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "revoke_brand_invite": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "get_ai_control_center_published_ontology_contract": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "get_ai_control_center_ontology_execution_plan": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "get_ai_control_center_ontology_expert_source_diff_preview": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "request_ai_control_center_ontology_expert_source_writeback": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "record_ai_control_center_ontology_execution_plan_evidence": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "record_ai_control_center_ontology_node_execution_evidence": {
    "group": "platform_or_personal",
    "reason": "平台全局/宿主或跨品牌个人账户配置，不属于品牌运营连接"
  },
  "generate_opportunity_insight_step_one": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "generate_opportunity_insight_step_two": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "generate_opportunity_insight_step_three": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "create_design_work": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "create_douyin_original_copy": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "create_douyin_remix_copy": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "create_xiaohongshu_rewrite_note": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "create_xiaohongshu_original_note": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "create_wechat_article": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "create_volcengine_music_task": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "create_half_year_marketing_plan": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "generate_brand_growth_visual_report": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "generate_brand_growth_marketing_calendar": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "generate_brand_growth_topic_candidates": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "retry_task": {
    "group": "separate_execution_authorization",
    "reason": "付费模型/供应商生成或任务重试，需要独立业务授权，品牌资料读写授权不代替"
  },
  "publish_wechat_article": {
    "group": "publication",
    "reason": "发布或发布会话/草稿传输，需要独立对外动作授权"
  },
  "publish_wechat_workflow": {
    "group": "publication",
    "reason": "发布或发布会话/草稿传输，需要独立对外动作授权"
  },
  "retry_wechat_publish_history": {
    "group": "publication",
    "reason": "发布或发布会话/草稿传输，需要独立对外动作授权"
  },
  "create_douyin_mobile_publish_session": {
    "group": "publication",
    "reason": "发布或发布会话/草稿传输，需要独立对外动作授权"
  },
  "create_douyin_desktop_publish_session": {
    "group": "publication",
    "reason": "发布或发布会话/草稿传输，需要独立对外动作授权"
  },
  "create_ai_control_center_video_work_douyin_desktop_publish_session": {
    "group": "publication",
    "reason": "发布或发布会话/草稿传输，需要独立对外动作授权"
  },
  "create_xiaohongshu_mobile_draft_session": {
    "group": "publication",
    "reason": "发布或发布会话/草稿传输，需要独立对外动作授权"
  },
  "create_xiaohongshu_desktop_draft_session": {
    "group": "publication",
    "reason": "发布或发布会话/草稿传输，需要独立对外动作授权"
  },
  "review_work_analysis_result": {
    "group": "human_review",
    "reason": "人工审阅决定不作为普通客户端写入能力"
  },
  "review_growth_plan_proposal": {
    "group": "human_review",
    "reason": "人工审阅决定不作为普通客户端写入能力"
  }
};
const productionActions: Partial<Record<ProductionCapability, string>> = { speech_synthesis: "digital_human:create_speech_task", runninghub_generation: "runninghub:generate" };
function permittedActions(toolName: string, capabilities: readonly ProductionCapability[]) {
  const actions = [...(BRAND_OPERATIONS_ACTIONS[toolName] || [])];
  if (toolName === "manage_douyin_video_production") for (const cap of capabilities) if (productionActions[cap]) actions.push(productionActions[cap]!);
  return actions;
}
export function assertBrandOperationsAction(toolName:string,args:Record<string,unknown>,allowedTools:readonly string[],capabilities:readonly ProductionCapability[]=[]) {
  // The new policy is opt-in; existing narrow grants remain unchanged.
  if(!allowedTools.includes("manage_brand_library")) return;
  if (toolName === "create_design_work") {
    if (!capabilities.includes("image_generation") || args.module !== "image") throw new Error("本品牌连接支持图片制作；其他设计模块不在此工具范围。");
    return;
  }
  if(!BRAND_OPERATIONS_ACTIONS[toolName])return;
  const actions=permittedActions(toolName,capabilities);
  const action=String(args.action||"").trim().toLowerCase();
  const key=toolName==="manage_douyin_video_production"?`${String(args.section||"").trim().toLowerCase()}:${action}`:action;
  if(!actions.includes(key)) throw new Error("当前品牌连接不支持该子动作；请使用对应业务功能。");
}
export function projectBrandOperationsSchema(toolName:string,inputSchema:Record<string,unknown>,allowedTools:readonly string[],capabilities:readonly ProductionCapability[]=[]) {
  if(!allowedTools.includes("manage_brand_library"))return inputSchema;
  if(toolName === "create_design_work") return {...inputSchema,properties:{...(inputSchema.properties as Record<string,unknown>),module:{type:"string",enum:["image"]}}};
  if(!BRAND_OPERATIONS_ACTIONS[toolName])return inputSchema;
  const properties={...(inputSchema.properties as Record<string,unknown>||{})};const choices=permittedActions(toolName,capabilities);
  properties.action={...(properties.action as Record<string,unknown>||{}),enum:[...new Set(choices.map(a=>toolName==="manage_douyin_video_production"?a.split(":")[1]:a))]};
  return {...inputSchema,properties};
}
