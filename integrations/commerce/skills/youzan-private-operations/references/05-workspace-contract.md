# 方法5.0及契约1.6.0（优先）

新增private_get_analytics/private_save_analytics，版本化图表数据、来源及经营对象见[16](16-analytics-and-officer.md)。页面分战略层、策略层、执行层，默认战略规划；业务总览展示各报表，今日执行位于执行层。旧动作与历史记录保留。

# 方法4.0补充（优先于下文历史版本说明）

private-operations/1.5.0：strategy.businessModel保存brand-business-model/1完整生意模式与私域承接，见15；tactic.businessTrackId关联parentId战略中的经营路线，服务端核对路线存在及指标相符。旧记录没有新结构仍可阅读。生意模式先于stagePlan；前台阅读客户/收入线/货盘/渠道/私域职责/并行路线，再看具体策略和每日任务。完整上游增长报告仍在品牌增长，不另造客户库或新的专家工作流。

当前私域目标仅traffic/conversion/aov/repeat；ads/sales旧记录可回显历史，不新增。默认战略规划→运营策略→今日经营；战略stagePlan和策略activityPlan严格结构参见[阶段与活动单](12-stage-and-activity.md)。日目标与活动目标分开；结构化参数由AI整理，用户看到中文经营单。全部外部活动/客户动作仍须真实工具与具体授权。

# 中台私域运营读写

2.0新增数据底座见[数据与分析](09-data-and-analysis.md)：private_save_growth_data保存同绑定店铺最小数据版本，private_get_growth_analysis复算指标/行为标签并分页返回客户。tactic增加audienceRule（规则/人数/依据）、executionSpec（有赞功能、可用入口、触发分支退出与产物）、measurementPlan（主指标/护栏/对照/调整）。它们是业务配置正文，不是外部执行器；中台不替代有赞原生营销画布。

先get_current_brand_context。所有动作复用manage_growth_reports，参数在payload.privateOps，品牌由当前认证上下文决定。工具可见不代表当前成员有权限；需privateRepurchase.operations与AI销售客户数据相应权限。

| 动作 | 参数与用途 |
|---|---|
| private_get_workspace | {}，店铺映射、各类记录数量、最近30份快照与实际能力边界 |
| private_list_records | entity、可选customerId/keyword/status、offset/limit；默认30最多100，按hasMore继续 |
| private_get_record | recordId；读完整body与revision |
| private_get_history | recordId；最近100份不可变版本 |
| private_get_customer_context | customerId；AI销售稳定主档、有赞身份、场景需求与有效标签；关联记录最近100，complete=false继续分页 |
| private_preview_segment | recordId；保存分群后计算有依据的有效无冲突标签人群，最多10000标签断言，超限报错，不截断冒充全量；只预览不触达 |
| private_save_record | entity、body、expectedRevision（新建0）、更新时recordId、稳定idempotencyKey |
| private_bind_shop | shopId原始数字kdt_id、shopName、evidence、enabled、expectedRevision、idempotencyKey；只中台归属映射，管理员操作 |
| private_link_customer | bindingId、customerId、externalCustomerId真实稳定身份、evidence、idempotencyKey；不按姓名猜合并 |
| private_save_snapshot | bindingId、snapshot、idempotencyKey；不可变来源记录 |

实体strategy/tactic/task/tag/assertion/need/segment/journey/benefit/review。实时schema给出body字段，先读表单/当前记录确定实体必填，不把所有实体字段混成一份body。tactic.parentId关联strategy；journey关联tactic；task关联tactic或journey。产品与内容资料沿现有品牌库读取，用正文和出处说明匹配。

标签组规则和定义修改应提示影响，旧断言的tagRevision不同会显示definition_changed。断言有tagId/customerId/value/context/state/sourceType/observedAt/validUntil/confidence/evidence，confidence未知留空。分群conditions为全部同时满足的[{"tagId":"当前品牌标签定义ID","value":"目标值"}]，只匹配confirmed且未过期、未冲突、当前定义的标签；当前不支持任意脚本、全店用户自动打标或动态定时重算。

snapshot：domain=shop/products/members/tags/segments/orders/refunds/coupons/benefits/traffic/fulfillment/distribution/capability；shopId须等于已核店铺；capturedAt/可选windowStart/windowEnd带时区；coverage、toolName=youzan_query或agent_call、workSessionId、workRequestId、receipt、limitations、returnedCount、可选reportedTotal。只保存必要真实业务内容，无Token/API Key。跨店回执隔离，不为让保存通过修改原始标识。执行端上报、fullSyncVerified=false不能改成独立平台核验。

更新先回读，expectedRevision旧则409重读，禁止盲目覆盖。相同逻辑操作网络未知保持idempotencyKey和内容，重试可回放；同键不同内容409。外部UNKNOWN沿有赞请求恢复，不用中台幂等键代替供应商请求。金额/订单沿AI销售订单契约或有赞原始快照，不能将计划指标冒充实际收入。

页面 /tabs/private-repurchase/operations；配置 /brand-admin/private-operations。HTTP GET /api/ai-control-center/brands/:brandId/private-operations、GET /records、POST /actions。关联客户仍通过sales_*动作，不新增第二个客户库。页面复制委托不等于后台自主执行。

## 经营方案与数据对照（private-operations/1.1.0）

页面顺序为战略规划、运营策略、经营看板、客户运营、会员权益、客户旅程、执行与复盘，默认直接阅读战略正文。战略正文content写经营主张与增长路径，audience写目标客户及场景，offerPlan写商品/内容/会员价值，channelPlan写渠道承接与运营节奏；customerValue/goal/diagnosis/resources/evidence沿原字段。策略content写打法及参与理由，executionPlan写具体内容、渠道与行动，沿用audience/customerValue/economics/successMetric/exitRule。

strategy及tactic可写dataComparison（JSON数组字符串，1—12条）。每项必填字符串：metric指标、baseline已有数据、period时间、insight经营判断、action对应打法、target预期与验证、actual执行后实际、source资料依据；scope统计范围与limitations数据说明可选。每字段最多4000字。不支持额外字段。尚未执行的actual明确写“尚未执行，无对应效果数据”；不把目标填成实际。前端提供正常中文表单，不要求用户编辑JSON。

用真实商品事实、客户购买疑问、既有品牌方案和经营回执支撑经营判断，历史与当前/不同店铺分别注明口径。未证实的经营假设可以制定试点，不冒充客户需求或已实现业绩。没有数据的指标写清待如何观察，不因为缺少报表而停在资料清单。
