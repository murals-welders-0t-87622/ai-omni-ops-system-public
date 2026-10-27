# 品牌运营助手 Skill 安装说明

## AI销售与私域复购（376）

私域复购已有AI销售`/tabs/private-repurchase/ai-sales`，配置在`/brand-admin/ai-sales`。优先读专用`ai-sales-operations`技能（页面可下载），通过manage_growth_reports的sales_*与payload.aiSales读写客户/企业、商机、跟进/草稿、服务/订单/复购、策略与复盘。WorkBuddy 3Chat当前13工具负责真实查询/确认后发送；没有客户/Agent配置写接口。核渠道归属、分页覆盖与真实证据，未知发送不重发，READY不当在线。新独立权限privateRepurchase.aiSales，子成员按品牌授权。策略保存不当发布，草稿不当已发，受理不当送达，聊天不当回款。



## 1. 两种安装方式

当前支持两种方式，任选其一：

1. 下载 ZIP 后，在客户端通过“上传技能 / 导入技能”方式安装
2. 直接使用 GitHub Skill 目录链接，让 AI 智控中心 按仓库目录自行安装

两种方式共用同一套仓库真源：

- `SKILL.md`
- `README.md`
- `00-品牌运营助手Skill网站功能域地图.md`
- `01-品牌运营助手Skill-MCP工具矩阵.md`
- `02-品牌运营助手Skill高频任务路由手册.md`

## 2. 推荐安装顺序

1. 先在网站安装中心完成 MCP 配置
2. 确认品牌安装令牌、MCP 地址和 `x-brand-id` 可用；如果目标客户端是 Codex / ChatGPT Desktop，还要先在本机环境里准备 `OPENCLAW_INSTALL_TOKEN`
3. 再选择 Git 安装或 ZIP 导入
4. 安装后把 Skill 绑定到 ai-omni-ops MCP
5. 首次使用时先做查询、生成和任务回读验收

## 3. Git 安装建议

如果要直接发给 AI 智控中心 一句指令，建议同时提供：

- GitHub Skill 目录链接
- MCP 服务名
- MCP 地址
- `Authorization: Bearer <安装令牌>`
- `x-brand-id`

典型目标是让 AI 智控中心 能直接：

1. 拉取仓库里的 Skill 目录
2. 安装到自己的 Skill 区
3. 绑定 ai-omni-ops MCP

如果目标客户端是 Codex / ChatGPT Desktop / IDE 扩展：

- 安装中心里的 `Codex` 标签会导出 `config.toml` 片段
- 这些客户端共用 `~/.codex/config.toml`
- 令牌默认通过 `bearer_token_env_var = "OPENCLAW_INSTALL_TOKEN"` 读取
- `x-brand-id` 会由安装中心片段直接写进 `http_headers`

## 4. ZIP 导入建议

ZIP 模式适合：

- 需要本地保留一个确定版本的 Skill 包
- 当前客户端更偏向手动导入
- 需要把同一份包发给多个成员统一安装

## 5. 推荐验收

至少验证以下几类问法：

- 帮我看一下个人中心总览和最近任务
- 帮我提取当前品牌档案摘要，并看一下 IP 资料库
- 帮我看最近失败任务主要卡在哪
- 帮我创建一份增长报告或营销规划
- 帮我看内容获客里某书 / 某音 / 公众号的营销策划方案，并打开 HTML 查看后留言
- 帮我看 AI 智控中心 创作素材和视频作品
- 帮我看达人合作里的达人匹配和达人跟踪，并把一条达人加入跟踪
- 帮我看 GEO 第三方媒体投放当前已经缓存了多少家软文街媒体，并继续同步下一批

## 6. 标准运行态更新后的同步提醒

如果网站标准运行态刚完成 Docker 更新，并且 `个人中心 -> 版本与升级` 明确提示本次涉及 Skill / MCP：

1. 先回到 `个人中心 -> AI 智控中心 安装中心`
2. 重新复制最新 MCP 配置片段
3. 重新下载最新 Skill ZIP，或重新复制 Git 安装指令
4. 在客户端确认 ai-omni-ops MCP 与品牌运营助手 Skill 仍绑定到同一套最新地址和品牌令牌

这样可以避免网站已经升级，但客户端还沿用旧 Skill 文案或旧 MCP 配置。

## 7. 常见问题

### 6.1 只会少数功能

先检查是否真的绑定到了 ai-omni-ops MCP，再确认 `SKILL.md` 和三份配套手册已一起导入。

### 6.2 路由不准

优先让 Skill 先做网站功能路由，而不是跳过路由直接猜工具。

### 6.3 Git 链接安装不到最新内容

检查 GitHub Skill 目录链接指向的分支是否正确；如果当前在交付分支验收，需要使用对应分支链接而不是旧链接。

### 6.4 软文街媒体同步失败

如果 GEO `第三方媒体投放` 的继续同步返回软文街鉴权失败，优先检查个人中心里当前品牌保存的软文街 `登录账号 / 登录密码` 是否已经更新为最新可用值，再继续判断是不是缓存或分页问题。

## 8. 一句话结论

这份 Skill 不是几个示例问答，而是整站能力入口。安装完成后，应该能覆盖查询、配置、生成、归档和页面承接提示这几类核心能力。


## 2026-10-23 客户端安装说明

安装中心当前展示AI智控中心、WorkBuddy、豆包工作、千问办公、Codex与MCP地址。Cursor/Claude Desktop不再作为安装选项，已安装的连接不会因此停用或轮换。

- 豆包工作：按自定义连接器界面选择HTTP，填写当前品牌服务器名称、URL与Authorization/x-brand-id两项Headers。依据用户提供的客户端截图；Skill安装入口与运行结果未独立验证，不把MCP挂载等同于Skill已安装。
- 千问办公：扩展→连接器→添加→粘贴JSON配置，采用mcpServers/type=streamable-http/url/headers，导入并启用后新建对话。Skill可使用Git链接安装，或解压下载包后通过扩展→技能上传SKILL.md及辅助文件。

参考：[千问连接器官方文档](https://qwenwork.cn/docs/features/connectors)、[千问技能官方文档](https://qwenwork.cn/docs/features/skills)。仅MCP模板/文档适配，不代表两款真实客户端已经联调成功。品牌凭据仍按原机制独立，禁止把令牌放入Git、文档或对话正文。


## 有赞私域运营（378）

业务委托“这周私域怎么运营”“有赞会员活动/人群旅程/客户标签”路由youzan-private-operations；当前品牌先private_get_workspace（manage_growth_reports，payload.privateOps），客户仍用AI销售主档，private_get_customer_context读当前需求/标签证据，战略→策略→执行分别保存读回。店铺快照保留kdt_id/窗口/分页/真实回执/限制；UNKNOWN沿原工具/请求恢复，不能将有赞只读当发券/改价能力。具体对客由AI销售按真实授权接3Chat。
