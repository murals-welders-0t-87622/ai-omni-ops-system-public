# AI销售工作区与3Chat契约

2026-10-25，会话376。研究官方使用指南49篇及14篇直接关联教程、WorkBuddy指定三位专家完整定义/参考后实施。详细研究hash与业务地图在项目artifacts/20261025-AI销售与3Chat；不是所有第三方功能均已实调。

## 页面与业务

- 私域复购 `/tabs/private-repurchase` 转到 `/tabs/private-repurchase/ai-sales`，二级菜单AI销售。
- 七区：销售工作台、客户/企业、商机、跟进/触达草稿、服务/订单/复购、销售策略、经营复盘。
- 配置独立 `/brand-admin/ai-sales`，无运营导航；管理3Chat空间/渠道归属，无密钥重复输入。
- 客户360关联本品牌企业、商机/任务/工单/订单/复购、来源画像、有限窗口沟通摘要、事实/推断/未知。人工主档不会被外部同步覆盖。
- B2C轻量流程与B2B决策链/方案/交付角色分开；推进需需求、阶段依据、下一动作/时间，签约/支付/交付各有依据。
- 消息草稿与实际处理回执分开；页面复制完整委托给WorkBuddy，不声称点击即自动唤起或已发送。已记录发送版本不允许修改正文，批次只能沿同一job查状态，processed不当送达。
- 订单来源账号+订单号防重复；金额十进制字符串，累计退款≤实收≤订单额；测试数据排除于上报净实收。看板仅存量商机分布/累计上报净实收，非周期收入、真实财务核验或转化率。

## 真实集成边界

WorkBuddy 3Chat插件1.4.0定义13工具，可启动检查、查客户/会话/上下文/群、上传附件、在具体授权后发送及查批次。Web另有指导、知识/话术、AI任务、画像、群发、翻译、Webhook与HTTP工具；此连接器不能修改客户/Agent配置、建定时群发或查服务端聚合报表。

已安装/定义核读、CLI实际发现、查询成功、发送、外部发布及真实销售结果分别验收。READY是历史启动成就，不能充当当前在线健康。部分分页不能假报全量。127的测试描述与沙盒/测试集指南有冲突，按未真实执行处理，需在流程空间/受控渠道补证。

本版本没有启用公网Webhook、直接3Chat对客Agent写入中台或自动后台同步。后续需真实签名Schema、窄权限HTTPS入口、稳定客户身份映射、事件幂等与乱序处理；不能把本品牌完整MCP管理员令牌交给对客Agent。3Chat教程的HTTP自定义工具不等于直接接本系统流式MCP。

## API/MCP与数据

共享源：`packages/shared/src/ai-sales.ts`。服务`ai-sales.service.ts`，HTTP controller与MCP共用。GET `/api/ai-control-center/brands/:brandId/ai-sales`、GET `/records`、POST `/actions`。MCP复用`manage_growth_reports`，`payload.aiSales`，十个`sales_*`动作在共享源和专用Skill中列全。

记录实体：customer/account/opportunity/activity/service/order/journey/strategy/insight/message。复用BusinessAsset/GENERATED_REPORT，元数据kind为SALES_RECORD及不可变SALES_REVISION、SALES_CONTEXT、SALES_IDENTITY、SALES_BINDING/REVISION、SALES_SYNC_PAGE、SALES_DELIVERY、SALES_RECEIPT。无schema迁移。

所有列表在数据库按品牌、类型、状态、客户、关键词过滤并count/分页，默认30/最多100；不先取200再内存筛。历史/上下文最近100；产品最近500/内容最近60仅选择器候选，AI应继续完整检索。当前为关系表JSON领域记录，未按大规模CRM性能验收；数据量增大按实测加索引/专表，不以小样本响应代表容量。

每个主档更新用expectedRevision和稳定idempotencyKey；品牌事务锁、payload hash、回执与版本原子保存。同键不同内容409，旧revision409；数据库故障503，不回mock。同来源时间但内容不同的客户快照409；旧快照跳过，不按名称自动合并。

`privateRepurchase.aiSales` 独立view/edit权限，默认OWNER/ADMIN有，STAFF/TALENT默认无。HTTP路径品牌与当前会话一致；每次重验，关联客户/商机/产品/内容同品牌。跨牌渠道绑定拒绝；绑定/停用仅所有者/管理员。对外实际发送不在此服务执行，回执是executor_reported，不能冒充平台独立发出证据。

## 方法与回退

专用`ai-sales-operations` 1.0.0，十文件，下载`/commerce-skills/ai-sales-operations.zip`。完整需求/价值/MTL-LTC/B2C-B2B/异议/服务复购/3Chat配置候选/发送恢复/复盘/验收及来源；不复制第三方作者广告落款、经验概率、固定首付或虚构稀缺。

本轮只更新独立Lab应用。回退镜像before-ai-sales-376，旧文件保存于本轮before目录；回退应用保留客户/版本/回执，不整库回滚。隔离测试品牌验证HTTP/MCP/权限/乱序/重复/金额/未知发送/界面并清理。真实客户发送、渠道发布、全量同步和经营效果须另有具体授权与证据，不能由开发测试代替。

## 本轮最终验证（376）

后端/前端构建通过；销售25、电商15、品牌上传14项离线回归通过；独立测试品牌43项HTTP/MCP/UI通过（含206客户分页、不同角色、桌面/手机、新增任务即时回显），测试品牌/用户/资产清理为0。20运行文件/BUILD_ID、30安装文件和ZIP十文件hash、Lab健康、原三容器ID/镜像/启动时间核对通过；说明页面1440/390无横向溢出。

真实3Chat CLI核验结果为工具0/调用0/readiness unverified，授权层原因未定位；没有真实客户查询/同步/发送、3Chat配置发布或销售效果验收。工具源码已读与真实调用分别记录；本版本网页委托只复制，需在WorkBuddy执行并带真实回执回写。完整证据位于工作空间artifacts/20261025-AI销售与3Chat，不能把开发测试当完整自主业务闭环。

## 后续真实只读复验（377，2026-10-25）

WorkBuddy原生已成功加载并调用get_3chat_workspace_readiness/search_3chat_customers。原始readiness code200，空间“武汉微美科技的空间”，ACTION_REQUIRED且两里程碑NOT_COMPLETED；首个客户请求缺业务筛选校验失败，改create_time.start=1/list/offset0/limit3后code200/success=true/total0。原生调用未受旧CLI工具0阻止，但CLI差异根因仍未知。没有客户导入/渠道映射/发送/配置/部署；真实客户链路仍未验。不能把“在线/接错空间/其他空间无客户”当事实。证据在项目artifacts/20261025-3Chat真实联调复验；旧376记录保留为当时状态。
