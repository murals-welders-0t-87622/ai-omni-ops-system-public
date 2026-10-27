# 运营结果回写

读取当前 `tools/list` 中 `manage_growth_reports` 的 `payload.commerce` schema。本技能不直接调用未公开的千问后台，也不转存千问或淘宝Token；执行端取数后向品牌MCP回写。

所有请求形状：`{action:"commerce_...",payload:{commerce:{...}}}`。先 `commerce_get_workspace`，`area=operations`。

## 店铺

`commerce_bind_shop`：platform=taobao/tmall、externalShopId（真实稳定平台店铺ID，不能用掩码/臆造ID）、shopName、mappingEvidence、idempotencyKey。品牌Owner/Admin确认归属，后端核对角色和其他品牌关联。已有店铺继续其shopId，不重复绑定。若当前中台品牌与店铺不符，先找到正确品牌，不修改已有品牌名称来绕过。

## 快照

`commerce_save_shop_snapshot`：shopId、period={start,end,timezone:"Asia/Shanghai"}、currency=CNY、sourceStatus、toolName、sourceEvidence、sections、skillVersion、可选title、idempotencyKey。

sourceStatus：`unverified`=身份/原始回执未核验；`provider_reported`=已观察对应客户端取数回执，但仍是连接器上报而非平台独立审计；`test_data`=测试/演示。不要把模拟数据存成真实经营。

sections按6个业务面板组织：diagnosis经营体检、merchandising货品与转化、traffic流量推广、retention活动会员、service履约服务、review计划复盘。每项包含summary、metrics、evidence、limitations；缺接口只写缺口，不补0。metric含key、label、value（十进制字符串或null）、unit、definition。指标不跨周期/粒度混合，必要时用独立快照与明确列名。

sourceEvidence存安全的工具名/参数摘要/回执证据索引和核验说明，不放Token或无关客户信息。分页多页先核齐再写最终快照，不以第一屏代表全量。保存后读取快照核对品牌、店铺、周期、来源、字段。

## 运营方案与动作

`commerce_save_operations_plan`：shopId、snapshotId（如已有可信快照）、title、report完整方案、actions、skillVersion、expectedRevision、idempotencyKey；新方案expectedRevision=0，更新另传planId及最新revision。没有真实快照也能保存明确标注待核验的方案，但不能伪造快照引用。

每个action：stage（上述业务板块）、title、body、owner、dueDate（YYYY-MM-DD或空）、successMetric、status=proposed/in_progress/review/closed。状态是中台计划记录，不会在淘宝执行任何动作。未执行不写in_progress/closed；用户已执行的事实保留证据后再跟进。

更新保留不可变版本，冲突先回读。重试同一请求沿用原幂等键；内容变更用新键。不要把一轮取数另造为业务执行历史。页面入口 `/tabs/ecommerce/operations` 与这些动作同源。

## 1.1 增长链路扩展（兼容旧计划）

当前schema含可选growth；actions增加可选稳定key，使用复测时必须提供且唯一。growth包含businessModel、phase、direction，sequence数组每步title/outcome/exitCondition，objectives数组每项stage/metricKey/label/unit/target（十进制字符串）/direction（increase或decrease）/rationale。拟议目标必须有来源推导，未知不填0。

experiments每项actionKey/hypothesis/change/baselineSnapshotId/resultSnapshotId/stage/metricKey/executionEvidence/executedOn/comparability/review/decision（observe/continue/adjust/stop），可选同品牌内容projectId。未执行时结果快照、执行日期和证据填空串；有结果时必须先有真实执行日期YYYY-MM-DD与证据。基线/结果快照严格本品牌同店铺，项目严格同品牌。后端只保存调用者上报证据，不伪称独立审计。

workspace的plans[].growthReview给前后值、delta、targetMet、comparable/reason与来源状态。周期等长、非重叠、执行位于其间、同定义/单位只是最基本比较条件；还要核范围、成熟窗与干扰。普通前后观察不能称因果归因。旧计划没有growth仍可读取；新客户端保存须保留已有growth及行动key，不能孤立删除关联动作。全量report和旧版本继续保留。


## 旧方案与四视图的对应（1.1.1）

旧report/actions直接保留经营价值：report展示战略判断与完整方案，actions按业务环节展示具体策略，执行显示所有actions并匹配实际回执，尚无回执时明确不能判断效果；sections和表格统一作为业务数据依据。没有growth不等没有方案，没有实验也不能隐藏全部行动。计划已关闭只代表记录状态，不是外部执行成功。

界面选择运营方案后，复制委托保留其planId/revision和动作；选择另一数据快照不改变方案原基线。数据更新委托只保存快照，不顺便改方案。业务回读除了确认版本，还要核对旧数据/无数据状态及四个视图有明确差异。

## 1.2 财务目标和数据跟踪

读取[财务到每日经营](financial-scorecard.md)中的scorecard、tactics和checkpoints字段及plans[].tracking。保存同一planId/最新revision，旧scorecard/growth和行动key保留；完整窗口、最新纠错与未知值按实时schema核对。

## 1.4 带参运营与指标周期

initiative.operation及commerce_save_operation_draft/commerce_record_operation_receipt契约见[运营工作台](operation-workbenches.md)；指标monitoring与旧checkpoints并存，独立窗口以同口径快照核。缺写适配器的commerce_execute_operation必须失败并明示原因，不能制造成功记录。


## 1.5 目标重排

commerce_request_plan_task：planId、expectedRevision、targetScenario（gmv/orders/averageOrderValue）、可选instructions。在线执行器支持operations_replan后创建持久任务；沿commerce_claim_detail_task/report租约串行执行，冻结源方案和新目标。新方案CAS写入并关联planTaskId，完整校验后才SUCCESS；失败保留旧版。用户只改业务目标，无需提供字段。operatingMap扩展investment、sequence、initiative.group/variants；36驱动指标上限兼容旧计划。独立运营页面取消，细节直接写策略；旧数据保留。

策略group是七业务分类；scorecard.stage仍是六现有报表环节，不可混用。tactics.driverIds与指标actionKeys需双向对应；Codex生成后先校验，再保存新版本。失败不改原方案或补造完成记录。

稳定指标ID延续时，stage/key/unit/definition与派生公式必须保持原回执身份，不能让AI改写口径说明后使已有数据变成未知。用户三个目标在目标卡及订单/每单驱动指标同时校验。失败草稿仅在同品牌、同源版本、同目标与同反馈时复用，保存前重验；不重放商家或收费动作。
