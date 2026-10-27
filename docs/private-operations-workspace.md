# 有赞私域运营与共享客户画像

389最新：private-operations/1.6.0新增private_save_analytics/private_get_analytics，共15动作；图表归档格式private-analytics/1见共享private-analytics.ts与技能16。导航为战略层→策略层→执行层，战略默认，业务总览可按源分区查图，今日执行属于执行层。参考[三层经营与图表改版](changes/2026-10-26-private-strategy-analytics.md)。以下为历史契约演进，不覆盖新约定。

387：私域从品牌生意模式承接，新增businessModel/经营路线与策略关联（契约1.5.0）；先看经营依据与本周行动，再看策略/逐日安排。技能4.0源21文件、三副本63文件/下载包一致；具体经营、状态与来源分层，旧数据和其他板块兼容保留。见[生意模式与私域承接](changes/2026-10-26-business-model-private-operations.md)。

385新增private-operations/1.4.0阶段/活动单；目标仅四项，JSON契约、兼容及参数验证见[变更](changes/2026-10-26-private-stage-and-activity.md)。

384：当前13动作/契约1.3.0新增private_get_business_board；原快照承接private-owner-day/1，指标/目标/行动/执行结果同源。默认今日经营，经营计划与客户权益下钻；方法2.1共14文件。详见[老板视角与运行契约](changes/2026-10-26-private-owner-cockpit.md)。

383：契约1.2.0新增不可变增长数据与同源分析，区分明细复算与供应商汇总；经营看板展示两期/成熟队列/商品渠道，客户运营展示行为标签规则/人数/分页客户/下一动作，策略展示人群/配置/测量。技能方法修订2.0与经营计划重建，见[数据契约与验证](changes/2026-10-26-private-growth-data-and-skill.md)。安装/页面通过不等自主业务或增长效果验收。

381新增正文阅读与结构化经营对照，契约private-operations/1.1.0；旧记录可兼容。详见[字段、方法与验证](changes/2026-10-25-private-operations-strategy-first.md)。

[此段涉及具体客户资料，公开版本已省略。]

[此段涉及具体客户资料，公开版本已省略。]

## 业务地图与入口

- 私域复购新增 `/tabs/private-repurchase/operations`，与AI销售并列。七区：战略规划（默认）、运营策略、经营看板、客户运营、会员权益、客户旅程、执行与复盘。
- 经营看板看经营重点、策略价值和结构化数据对照；来源回执下折，不以记录数量作主要经营信息。
- 客户运营使用AI销售customer主档，管理需求、标签定义/断言、分群；AI销售客户详情可带customerId进入私域画像，不新建平行CRM。外部有赞身份须稳定ID+明确同人依据才关联，脱敏/占位标识拒绝。
- strategy回答为谁解决什么问题、基线/目标/资源/里程碑；tactic关联strategy，安排人群/价值/内容服务/经济性/验收/退出；task关联tactic或journey，负责人/期限/容量/具体动作/结果与真实回执。完成任务需结果和回执。
- 标签保留来源、场景、时间、有效期、置信与定义版本。互斥组同场景冲突、到期、撤销、定义变更待复核分别显示，分群只使用当前有效无冲突的confirmed断言。不同场景/客户不互相冲突。仅手动/Agent有依据保存与按需计算，无全店定时打标或自动重算执行器。
- 配置独立 `/brand-admin/private-operations`，核定本品牌kdt_id。只保存中台归属，不改变有赞授权或安全设置。
- 页面“复制策划委托”复制完整业务委托，需在WorkBuddy等客户端执行，回写后刷新；不伪称后台自动运行。

## 同源HTTP与MCP

共享源 `packages/shared/src/private-operations.ts` 定义十实体/十三动作、字段描述与schema。`private-operations.service.ts`被HTTP与MCP共用，无数据库迁移。新增private_save_growth_data/private_get_growth_analysis的两种数据格式见383契约；旧十动作保留。

HTTP GET `/api/ai-control-center/brands/:brandId/private-operations`、GET `/records`、POST `/actions`。MCP复用manage_growth_reports，payload.privateOps：private_get_workspace/list_records/get_record/get_history/preview_segment/get_customer_context/save_record/bind_shop/link_customer/save_snapshot。

使用BusinessAsset/GENERATED_REPORT，kind PRIVATE_RECORD/REVISION/BINDING/BINDING_REVISION/IDENTITY/SNAPSHOT/RECEIPT，客户仍为SALES_RECORD。列表数据库按品牌/类型/关键词/状态/客户过滤并count分页，默认30最多100；历史最近100，工作区快照最近30。客户画像关联记录最近100并明确complete，标签另读最多10000完整集合，超限拒绝；分群最大10000断言，超过报错，不将截断人群冒充全量。

每次保存expectedRevision+稳定idempotencyKey，品牌锁复用sales锁，记录/不可变版本/回执同事务。相同键/不同内容409，旧版本409。店铺全局稳定映射锁，跨品牌拒绝；所有客户、标签、上层记录引用验证品牌和类型。店铺绑定仅Owner/管理员。

权限需privateRepurchase.operations与privateRepurchase.aiSales相应view/edit，避免单独授运营权限泄漏客户私密资料；默认Owner/Admin有，子成员无。HTTP品牌路径和当前认证品牌一致，MCP相同校验，不用scope数量代替成员权限。

## 真实有赞边界

[此段涉及具体客户资料，公开版本已省略。]

快照明确executor_reported/fullSyncVerified=false，保留实际工具、session/request、时间窗、返回条数/总数、覆盖与限制。客户端COMPLETED不等业务目标/全量同步/平台独立证据。当前没有自动后台同步、店铺发券改价、自动触达或有赞写执行器。具体对客由既有AI销售/3Chat按已核渠道与授权执行，服务先于盲目促销。

## Skill与验证

youzan-private-operations方法修订2.1，入口+十一参考+两脚本共14文件，行业方法和155资料定位/指纹索引；不包含客户原始聊天/联系方式/私密原图。下载 `/commerce-skills/youzan-private-operations.zip`；安装不代表本会话已加载或真实自主完成。CLI与中台共享确定性计算引擎，输入覆盖与真实性仍由来源证明。

离线规则/路由、真实隔离HTTP/MCP、UI及运行文件验证分开记录。本轮回退镜像before-private-ops-378，源码备份在研究目录before；退应用保留新业务记录，不整库回滚。未授权Git提交推送。详细实际验收以会话378与运行证据为准。

[此段涉及具体客户资料，公开版本已省略。]