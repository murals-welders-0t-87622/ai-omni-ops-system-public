# 公众号草稿箱推送修复

公众号工作流的微信 API 调用是 `draft/add`，成功表示微信草稿箱返回 `media_id`，不是公开发布。品牌 MCP 的 `manage_wechat_workflow` 增加 `push_to_wechat_draft`，在用户要求推送后传 `workflowId` 和 `payload.confirmDraft=true`；先用 `check_publish` 检查当前工作流与账号。原有账号权限与品牌隔离仍生效。

工作流封面与正文的中台素材由服务端按当前品牌直接读取存储，避免服务端回调未登录的受保护 HTTP 图片导致 401；外链仍由原来的 HTTP 下载处理。已有微信回执、进行中及结果不明的提交不直接重试，先核对公众号草稿箱，避免重复。上游网络、公众号凭据、IP 白名单、素材可用性等仍需实际环境核验。微信调用失败提示不输出 token 查询参数。

验证：服务器编译和 `node --test scripts/test-wechat-draft-push.cjs scripts/test-brand-operations.cjs`；测试为模拟供应商响应，不是实际公众号推送。`PUBLISHED` 为历史内部状态，界面文案明确仅表示推送草稿箱。
