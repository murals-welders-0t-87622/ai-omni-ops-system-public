# AI 智控中心 文档入口

375：manage_brand_library.upload_asset_file/upload_product_image及create_brand_growth_report.htmlContent见[品牌资料归档](../brand-document-import.md)，仍按当前品牌/原编辑权限执行。


366纠正MCP摘要缺项误判：同一现有连接204工具/7个ocean动作，豆包原生工作区只读成功。方法包升级1.0.1并实际重读，13离线测试及7文件hash匹配；真实广告数据写入与原生伙伴注册仍待验。未改应用运行或授权。见[核查与方法修正](../changes/2026-10-24-ocean-mcp-summary-false-block.md)。



会话358：创作素材返回可选previewKind/displayType，text存储不等于纯文案；站内文件需鉴权，HTML制作记录独立预览。工具与授权数量不变，见[契约与验证](../changes/2026-10-23-creative-material-preview.md)。

## 目标

本目录只保留 AI 智控中心 当前仍有参考价值的 Markdown 文档，不再保留与 Markdown 一一重复的 HTML 镜像。

## 当前推荐阅读顺序

1. `AI 智控中心正式安装与网站对接说明.md`
   - 当前安装中心、安装令牌、MCP 地址、Skill ZIP 的使用说明，以及长任务 MCP timeout 配置建议
2. `AI 智控中心渠道、Skill与MCP对接说明.md`
   - AI 智控中心、Skill、MCP 与站内系统之间的分工关系
3. `skill-package/00-品牌运营助手Skill网站功能域地图.md`
   - 当前整站功能域、页面入口、哪些能直连 MCP、哪些仍需页面承接
4. `skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
   - 当前真实 MCP 工具分组、统一管理入口与直连工具矩阵
5. `skill-package/02-品牌运营助手Skill高频任务路由手册.md`
   - 当前 Skill 应如何从自然语言路由到网站功能和工具链
6. `品牌运营助手Skill示例SKILL.md`
   - 当前正式 Skill 主文档结构、外部文档注入方式、高频规则和 ZIP fallback 策略
7. `AI 智控中心第一阶段MCP工具清单.md`
   - 历史第一阶段工具说明，现主要作为背景参考
8. `../changes/2026-09-04-ai-control-center-free-image-design-workspace.md`
   - 记录 AI 智控中心 图片模块默认改为自由生图，以及设计页收口为结果回看页的这次变更
9. `06-AI 智控中心接口与权限落地规格_v1.md`
   - 接口、权限、审计和能力暴露边界
10. `07-AI 智控中心无侵入接入与对话式体验方案_v1.md`
   - 无侵入接入、灰度、降级、回滚与体验约束
11. `05-AI 智控中心详细开发方案_基于现有系统文档.md`
   - 基于当前系统结构的整体开发方案

## 仍保留的补充文档

- `AI 智控中心用户体验优先主方案.md`
- `AI 智控中心首批高频任务清单.md`
- `AI 智控中心第一阶段开发任务拆分清单.md`
- `AI 智控中心第一阶段MCP工具清单.md`
- `AI 智控中心第一阶段MCP工具字段草案.md`
- `品牌运营助手Skill详细草案.md`
- `品牌运营助手Skill示例SKILL.md`
- `skill-package/`
- `01-AI 智控中心对接网站完整方案.md`
- `02-AI 智控中心品牌运营助手Skill草案.md`
- `03-AI 智控中心实施清单与验收标准.md`
- `04-AI 智控中心接入技术评估与安全权限方案.md`

## 使用原则

- 以当前代码与 `docs/site-map.md` 为准
- 如果 AI 智控中心 页面、安装中心、权限模型或运行时链路发生变化，应优先更新本目录入口说明和对应主文档
- 安装中心导出的正式 Skill ZIP 会额外打包 `docs/00-网站功能域地图.md`、`docs/01-MCP工具矩阵.md`、`docs/02-高频任务路由手册.md`，因此这些源文档应保持长期同步
- 即使部署环境临时缺失 `docs/ai-control-center/skill-package/*` 源 Markdown，安装中心导出的 ZIP 也必须通过服务端内置 fallback 继续提供完整版手册，不能回退为空壳占位文档
- 历史讨论稿可继续保留为背景参考，但不应覆盖当前安装说明与接口落地规格
- 面向站点公开访问的 AI 智控中心 HTML 交付页位于 `apps/web/public/docs/ai-control-center/`；本目录只维护源 Markdown


## 2026-10-23 / 359 安装客户端更新

共用安装区六选项改为AI智控中心、WorkBuddy、豆包工作、千问办公、Codex、MCP地址；豆包表单与千问JSON分别展示，旧连接不撤销。客户端模板依据用户截图/官方协议，不能凭模板生成称原生客户端已接通；复制、脱敏、当前品牌与安装包需同源核验。见[变更与验证](../changes/2026-10-23-openclaw-client-guides.md)。
