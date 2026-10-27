# 拼多多店铺接入评估（2026-10-24）

结论：技术上可以接入中台，建议先做品牌独立授权的只读同步。平台存在接口，不等于当前开发者资质、应用类型和店铺令牌已经具有调用权限。本轮只查公开文档，未创建应用、获取授权、读取店铺或改动业务系统。

## 依据与证据范围

已读取用户指定的[新手指南](https://open.pinduoduo.com/application/document/browse?idStr=04DD98845AD2977D)、[授权说明](https://open.pinduoduo.com/application/document/browse?idStr=BD3A776A4D41D5F5)、[API调用指南](https://open.pinduoduo.com/application/document/browse?idStr=8EC06C399636041E)、[消息指南](https://open.pinduoduo.com/application/document/browse?idStr=D3B6DBF3A5CB57E5)，并核对官方8类API目录。网页抓取及浏览器正文读取失败后，使用官网公开脚本明确引用的open-api.pinduoduo.com文档接口读取；不是通过业务网关调用店铺接口。

目录响应含接口名、用途、维护说明，可确认下列能力存在。公开详情接口本轮返回System Error，尚未核实逐字段schema、每个权限包的应用类型、各接口限频及全部保留期限；下表字段属于接入目标，必须取得详情和应用权限后逐项确认，不能当成已获返回字段。原始文档证据保存在项目根artifacts/20261024-提交推送与拼多多评估/，不含实际店铺凭据或数据。

## 可同步业务地图

| 数据域 | 已核对的官方接口 | 中台接入目标与用途 |
|---|---|---|
| 店铺资料 | pdd.mall.info.get | 建立店铺身份、名称及品牌归属，显示授权/同步状态；具体字段待详情确认 |
| 商品及SKU | pdd.goods.list.get、pdd.goods.detail.get、pdd.goods.skus.get、pdd.goods.material.query | 商品目录、SKU映射、价格/库存及商品素材；各字段按真实返回启用，关联现有产品库，避免另建重复商品体系 |
| 订单 | pdd.order.basic.list.get、pdd.order.list.get、pdd.order.information.get、pdd.order.number.list.increment.get、pdd.order.status.get | 成交订单、订单商品/金额/状态/时间等目标字段，派生订单数、成交金额、客单价和商品销售表现 |
| 售后退款 | pdd.refund.list.increment.get、pdd.refund.information.get、pdd.refund.images.get | 售后记录、退款状态/金额/原因等目标字段，支持退款趋势与商品问题分析；凭证链接有时效 |
| 物流履约 | pdd.logistics.ordertrace.get、pdd.logistics.companies.get | 单运单轨迹及快递公司，关联订单识别履约异常；不据此承诺所有历史轨迹完整 |
| 营销活动 | pdd.promotion.goods.coupon.list.get、pdd.promotion.merchant.coupon.list.get、pdd.promotion.limited.discount.list.get | 商品券/店铺券批次和限时限量购活动，支持日历关联；不等于可获取所有活动效果指标 |
| 多多进宝推广 | pdd.goods.cps.unit.query、pdd.goods.cps.mall.unit.query | 商品及全店推广计划查询；不等于全站付费广告报表，更不等于完整店铺订单 |
| 财务 | pdd.finance.balance.daily.bill.url.get | 商家货款日账单下载链接，待核账单结构后做对账；不等于实时余额、提现、完整利润 |
| 消息 | pdd.pmc.user.get、pdd.pmc.accrue.query及官方消息服务 | 为已订阅/开通的消息做增量触发与积压监测，配合补拉和对账 |

[商品接口目录入口](https://open.pinduoduo.com/application/document/api?id=pdd.goods.list.get)、[订单](https://open.pinduoduo.com/application/document/api?id=pdd.order.number.list.increment.get)、[售后](https://open.pinduoduo.com/application/document/api?id=pdd.refund.list.increment.get)、[财务](https://open.pinduoduo.com/application/document/api?id=pdd.finance.balance.daily.bill.url.get)。

不承诺：全量访客/浏览/搜索词/加购收藏、自然流量来源、全部广告消耗与ROI、聊天全文、全店评论、竞店私有经营数据、完整客户画像。这些未由本轮目录与详情核实，应单独查相应开放能力及申请条件。订单API出现pdd.order.review.info也不能仅凭名称认定可获取全量商品评价。

## 接入门槛和关键限制

1. 新手指南区分开发者角色和应用类型。商家自研路线目前仅开放给具备招商小二认证的品牌商或大商家；面向多品牌SaaS，应优先核实企业电商软件服务商及合适应用类型。纯代运营服务商角色不能自动获得ERP全部API。测试应用受商家数量、调用量和时限约束；上线、服务市场流程按应用类型办理，资质审核不能由代码替代。
2. 店铺OAuth与多多进宝推手授权入口不同。店铺需主账号授权，店铺已完成开店且未申请退店。平台应用凭据可服务多个获准店铺，但每店access_token独立，不能一个品牌借另一个品牌令牌。实际scope与有效期以授权返回和应用后台为准。
3. 重复授权会令历史code、access_token、refresh_token立即失效。刷新令牌不延长授权有效期；过期/取消授权要明确停同步和提示重新授权，不能持续显示绿色已连接。不要为检查权限随意重授权。
4. 目录明确：普通订单列表/详情/增量仅能取下单时间三个月内交易；增量每次时间跨度不超过30分钟，目录给出倒序翻页及结束时间相对平台时间的防漏要求。应照详情实现边界、重叠窗口、分页、幂等及日对账，不能声称全历史/零延迟。
5. pdd.order.basic.list.get明确不包含消费者信息；经营分析优先最小字段，不把订单买家自动转成可营销线索。姓名、电话、地址等实际可见性、脱敏和使用范围必须另验。
6. pdd.refund.images.get说明凭证链接有效一小时；链接不能当永久素材。店铺图片/售后凭证亦不能自动作为可商用内容素材。
7. 消息指南当前仅提供Java SDK接收，要求应用订阅、用户授权及为用户开通服务，采用WebSocket长连接；不是通用Webhook。未消费消息保留7天，消息到达和详情更新有延迟，仍需补拉。中台现有NestJS可先轮询，后续评估隔离Java消费者，不在首期强塞完整ERP。

## 与现有中台的接法（设计建议，未实施）

品牌智控中心配置应用/店铺授权 → 服务端能力网关签名调用 → 品牌店铺商品SKU映射 → 原始快照/增量游标 → 订单与售后事实 → 拼多多经营页/全局概览/日历复盘。

- 当前品牌与店铺建立服务端明确归属；OAuth state绑定发起用户、品牌、一次性随机值及有效期，回调复核店铺身份与成员管理权限。平台应用secret不发给品牌前端/Agent；店铺Token加密保存，日志脱敏。
- 商品主键按平台+店铺+goods_id/sku_id，订单按店铺+order_sn；更新按平台时间及幂等键，退款单独记录，不直接改写历史成交快照。ID保留字符串、金额按接口单位归一，不能混用分和元。
- 区分下单、支付、成团、退款、结算口径；订单成交金额不能冒充到账收入，订单退款不能直接推导利润或广告ROI。缺数据标未知，显示数据截至时间与同步时间。
- 统一业务数据契约供本地和SaaS复用；本地断网/休眠能恢复游标补拉，SaaS按店铺限频和队列隔离。OAuth回调地址需匹配平台审核配置，127.0.0.1能否使用未核实，必要时设计受控公网回调，不直接暴露整个本地服务。
- 页面建议为“店铺概览/商品SKU/订单/售后/营销/同步记录”；品牌增长产品库复用商品关联，营销日历引用活动，驾驶舱读取同口径经营事实。不上架改价、不发货退款、不调广告预算；未来写操作另行设计。

## 建议落地顺序与验收

P0：确认主体资质、应用类型、接口权限包和一店主账号授权可行；取得实际返回schema及限频/保留期限。

P1：单品牌单店只读店铺/商品SKU/近期开单+增量/退款。验收真实店铺样本与平台后台对账、商品映射、分页完整、重复不重计、失效能提示、跨品牌拒绝，至少一次断点恢复。

P2：物流/优惠活动/财务账单，补经营概览、产品趋势和日历复盘。P3按权限证据再评估推广报表及消息消费者。

首期目标是让用户说“同步这个店铺近一周成交和退款，找出表现最差的商品”，中台能够在获授权范围内完成，并显示来源与口径。尚未实现或验收此能力；巨量豆包旧schema问题是独立待办，不随本次Git推送自动解决。
