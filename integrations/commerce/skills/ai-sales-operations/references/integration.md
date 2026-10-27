# 连接、数据与回写

## 真正能力边界

WorkBuddy的3Chat 1.4.0插件定义13工具：启动检查；客户/会话/客户上下文；群/群上下文；附件上传；私聊单发/批发/WhatsApp模板；群单发/批发；批次状态。每次以宿主实际加载的工具Schema为准，不能猜字段或把网页功能视为当前MCP工具。客户/标签写入、Agent/渠道配置、定时群发、服务器聚合报表当前不在此连接器中。

`get_3chat_workspace_readiness`仅指曾发布Agent及曾连渠道。READY不代表当前在线、授权仍有效、数据存在或可发送。按已安装插件复用检查：成功READY本会话复用，缺配置后下次依赖请求可再检查；不是每个查询前重复检查，也不阻塞仍能执行的查询。配置地址只用实际工具返回的完整action.url，不猜控制台地址。

## 中台动作

同一`manage_growth_reports`工具，`action`带sales_前缀，参数在`payload.aiSales`。HTTP对应`/api/ai-control-center/brands/:brandId/ai-sales`及`/actions`；当前品牌身份由会话/安装令牌解析，不接受body里actor/role提升权限。需要`privateRepurchase.aiSales`权限；默认Owner/Admin可用，其他成员按品牌授权。

| 动作 | 用途/主要输入 |
|---|---|
| sales_get_workspace | 当前品牌计数/存量分布、渠道归属、产品/最近内容、能力边界；不取全会话 |
| sales_list_records | entity、keyword、status、customerId、offset/limit(1—100)，activity可dueBefore；返回total/hasMore |
| sales_get_record | recordId；完整业务主档及最近上下文，message附contentHash/executionKey |
| sales_get_history | recordId；最近100不可变修订；不据此声称超100历史完整 |
| sales_save_record | entity、body、recordId?、expectedRevision（新建0）、稳定idempotencyKey；字段按实时Schema |
| sales_save_binding | spaceId、channelAccountId、channelType、label、evidence、enabled、expectedRevision、键；仅品牌管理者 |
| sales_link_customer | recordId、expectedRevision、bindingId、externalCustomerId、evidence、键；明确映射，不覆盖已有身份 |
| sales_import_customers | bindingId、toolName=search_3chat_customers、sourceEvidence、customers[]、键；每项customerId/name/updatedAt/profile/evidence |
| sales_record_context | customerId、toolName、sourceEvidence、context{summary,coverage,conversationIds,facts,windowStart?,windowEnd?}、键 |
| sales_record_delivery | recordId、delivery{draftRevision,contentHash,executionKey,confirmationText,confirmationSource,toolName,jobId?,status,providerEvidence}、键 |

entity：customer客户、account企业、opportunity商机、activity跟进、service服务、order交易、journey复购计划、strategy策略候选、insight复盘、message触达草稿。

输入只使用对应实体字段，未支持的字段不能混入。例如客户不接受external/role自动扩权；外部身份只走专门映射。关联客户、商机、产品和内容都要同品牌；商机需属于同一客户。存入BusinessAsset的SALES_*对象归品牌，版本/来源/回执单独追加。

## 查询与导入

先读取已绑定空间/账号，再用实时查询Schema限定该账号；如果工具无法按渠道限定，逐项核实返回的账号归属，不能整空间导入到某品牌。所有页保留query条件、offset/cursor、limit、total/has_more、窗口及实际工具回执来源，放sourceEvidence；分页到真实结束，不用首50/100代表全部。中台每页≤100。未完成所有页显示部分覆盖，当前导入回执fullSpaceSynced固定false，不能改口为全空间同步。

profile只保存返回的实际文字字段；复杂字段先据真实Schema转换为保留来源的明确文本，不把整段外部HTML执行。来源更新时间必须是真实updatedAt/捕获时间并说明口径。旧快照跳过；人工主档不被外部快照覆盖。外部customer_id稳定映射，不以姓名/手机号相似度自动合并，跨渠道复用需明确映射证据。

客户上下文`context.session`可能是生命周期摘要，conversation/message只覆盖指定窗口与数量。NO_SESSION/NO_CONVERSATION/NO_MESSAGE不是从未联系。保存facts时state=confirmed/inferred/unknown，source必填；confirmed表示来源确认，仍非平台独立验证。lastVisitTime为客户最后来信而非建会话日期。时区与Unix毫秒按实际schema转换。

## 完整示例

```json
{"action":"sales_save_record","payload":{"aiSales":{"entity":"activity","expectedRevision":0,"idempotencyKey":"followup-CURRENT-STABLE-KEY","body":{"name":"确认使用场景与演示时间","customerId":"FROM_CURRENT_BRAND_RECORD","opportunityId":"","type":"demo","owner":"已核对的负责人","dueAt":"2026-10-26T02:00:00.000Z","status":"planned","content":"先确认地面材质和作业面积，再按已核产品规格准备演示","outcome":"","nextAction":"客户同意后约演示"}}}}
```

例子不是客户事实，不直接写入真实品牌。用读到的真实客户、负责人、时间替换。返回managed operation的data中是结果，外层COMPLETED只表示本次中台保存/读取完成，非客户动作完成。

## 恢复

写失败先查原键和记录；相同键内容不能变更。409先回读最新revision并合并人工修改；不能无限重试。已成功发送但归档失败，沿原内容版本与executionKey补回执，绝不再发。跨品牌/权限/关联错误停止该动作，别从默认品牌取资料。数据库不可用报错，不回落本地JSON假成功。

3Chat自定义MCP文档实际是HTTPS OpenAPI工具配置，不是自动兼容本中台Streamable HTTP MCP。后续Webhook或Agent直连须独立窄权限网关、签名/请求去重、客户身份校验、HTTPS公网目标和测试环境；不能把完整品牌管理员令牌交给对客Agent。当前没有配置或启用这条公网写入通道。

## 各实体body完整字段

对应实体仅允许下列字段；未提供的可选文字归为空串，关联列表为空数组，不传null。日期字段为YYYY-MM-DD；时间为含秒及明确Z/时区的ISO8601。当前产品/内容/客户ID由真实工作区查询获得，不让用户填写。

### customer

- `name`：客户名称，必填。
- `accountId`：所属企业，可选。
- `owner`：负责人，必填。
- `lifecycle`：客户阶段，必填；prospect / active / retained / at_risk / churned。
- `phone`：联系电话，可选。
- `email`：邮箱，可选。
- `tags`：业务标签（逗号分隔），可选。
- `need`：需求与使用场景，可选。
- `budget`：预算与预算路径，可选。
- `timeline`：购买时间窗，可选。
- `contactPreference`：营销联系偏好，必填；unknown / allowed / do_not_contact。
- `contactEvidence`：偏好依据，可选。
- `sourceEvidence`：资料来源，必填。

### account

- `name`：企业名称，必填。
- `industry`：行业，可选。
- `region`：区域，可选。
- `owner`：客户经理，必填。
- `strategy`：客户经营与决策链，可选。
- `sourceEvidence`：资料依据，必填。

### opportunity

- `name`：商机名称，必填。
- `customerId`：客户，必填。
- `mode`：销售方式，必填；B2C / B2B。
- `stage`：商机阶段，必填；new / qualified / solution / negotiation / won / delivery / retained / lost / nurture。
- `owner`：销售负责人，必填。
- `productIds`：关联产品，可选；当前品牌稳定ID数组。
- `need`：客户需求，可选。
- `impact`：不解决的影响与价值目标，可选。
- `qualification`：预算、时机与资格判断，可选。
- `decisionChain`：使用者、影响者、采购与决策人，可选。
- `solutionOwner`：方案负责人，可选。
- `deliveryOwner`：交付负责人，可选。
- `valueProposal`：匹配方案与价值依据，可选。
- `objections`：异议、竞品与应对，可选。
- `amountCny`：预计金额（元），可选。
- `nextAction`：下一步行动，可选。
- `nextDue`：下次跟进，可选；ISO时间。
- `stageEvidence`：本阶段依据，可选。
- `contractEvidence`：合同/订单依据，可选。
- `paymentEvidence`：到账依据，可选。
- `deliveryEvidence`：交付/验收依据，可选。
- `lossReason`：丢单或培育原因，可选。

### activity

- `name`：跟进事项，必填。
- `customerId`：客户，必填。
- `opportunityId`：关联商机，可选。
- `type`：跟进类型，必填；followup / meeting / demo / review。
- `owner`：负责人，必填。
- `dueAt`：计划时间，必填；ISO时间。
- `status`：任务状态，必填；planned / done / cancelled。
- `content`：沟通准备与客户价值，可选。
- `outcome`：实际结果与依据，可选。
- `nextAction`：后续动作，可选。

### service

- `name`：服务事项，必填。
- `customerId`：客户，必填。
- `owner`：服务负责人，必填。
- `severity`：优先级，必填；normal / high / low。
- `status`：处理进度，必填；open / in_progress / resolved。
- `dueAt`：承诺处理时间，可选；ISO时间。
- `issue`：问题与客户诉求，必填。
- `resolution`：处理结果，可选。
- `evidence`：结果依据，可选。

### order

- `name`：订单名称，必填。
- `customerId`：客户，必填。
- `sourceAccount`：店铺/业务系统标识，必填。
- `externalOrderId`：业务订单号，必填。
- `productIds`：关联产品，可选；当前品牌稳定ID数组。
- `status`：交易状态，必填；pending / paid / fulfilled / refunded / cancelled。
- `amountCny`：订单金额（元），必填。
- `paidCny`：累计实收（元），必填。
- `refundedCny`：累计退款（元），必填。
- `paidAt`：支付时间，可选；ISO时间。
- `sourceStatus`：依据类型，必填；provider_reported / manual_confirmed / test_data。
- `orderEvidence`：订单与客户身份依据，必填。
- `paymentEvidence`：支付/退款依据，可选。
- `deliveryEvidence`：履约依据，可选。

### journey

- `name`：复购/增购计划，必填。
- `customerId`：客户，必填。
- `owner`：负责人，必填。
- `status`：计划状态，必填；draft / ready / archived。
- `trigger`：客户价值与触发依据，必填。
- `productIds`：关联产品，可选；当前品牌稳定ID数组。
- `contentRefs`：可复用内容，可选；当前品牌稳定ID数组。
- `content`：服务、内容与推荐安排，必填。
- `dueAt`：复查时间，可选；ISO时间。
- `exitRule`：停止条件，必填。
- `successMetric`：验收标准，必填。

### strategy

- `name`：策略名称，必填。
- `type`：策略用途，必填；guidance / ai_task / faq / fixed_speech / knowledge / qualification / testset。
- `owner`：维护人，必填。
- `status`：内部状态，必填；draft / review / approved / archived。
- `trigger`：适用客户与触发条件，必填。
- `content`：完整内容，必填。
- `exitRule`：边界与转人工条件，必填。
- `sourceEvidence`：产品/政策/方法依据，必填。
- `reviewAt`：下次复审，可选。
- `successMetric`：测试与验收标准，必填。

### insight

- `name`：复盘名称，必填。
- `owner`：负责人，必填。
- `periodStart`：开始日期，必填。
- `periodEnd`：结束日期，必填。
- `report`：诊断与分析全文，必填。
- `basis`：样本、指标口径与证据，必填。
- `limitations`：数据缺口与判断边界，必填。
- `actions`：整改动作、负责人、期限与验收，必填。

### message

- `name`：触达主题，必填。
- `customerId`：客户，必填。
- `purpose`：本次沟通目的，必填。
- `owner`：负责人，必填。
- `content`：发送正文，必填。
- `contentRefs`：关联产品/内容，可选；当前品牌稳定ID数组。
- `sourceEvidence`：适配与事实依据，必填。
