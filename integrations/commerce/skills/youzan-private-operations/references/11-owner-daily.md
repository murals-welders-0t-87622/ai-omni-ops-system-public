# 老板每天看什么、做什么、检查什么

先用老板能理解的短句回答：今天生意怎么样→哪里出了问题→今天准备做什么→谁负责/什么时候→实际做了没有→目标达成没有→接下来继续/调整/停止什么。战略解释这一阶段增长靠什么；策略是围绕指标的具体打法；任务落实当天动作；复盘用结果改变下一计划。每个板块承担同一目标中的一个环节，不各写一篇独立作文。

## 指标和协同

| 老板问题 | 口径 | 具体协同 |
| --- | --- | --- |
| 有多少客户进店 | 日访客UV，说明店铺/渠道范围 | 内容、门店与包裹服务触点带来合适进店，私域渠道承接回店；看来源质量和费用 |
| 进店后有没有购买 | 同一统计范围付款买家/访客 | 商品详情解释选择，AI销售解决疑问，运营检查权益/库存/下单过程 |
| 每位买家买了多少 | 实付/付款买家；笔单价=实付/付款订单，分别标名 | 商品规格、适配组合、会员权益和销售服务协同；贡献与适用性一起检查 |
| 老客有没有再来买 | 日复购买家/同口径付款买家，明确历史定义 | 客户运营识别人群，会员提供价值，AI销售服务跟进；30/60日首购队列另看，不冒充日占比 |

日数据只比同店、同范围、同完整性窗口，今天截至查询时不能直接与昨日全天判涨跌。原始数据未取得标未知，不拿14日总量当今日、不用0补缺。事件摘要要有事实依据，“没有摘要”不等店铺没发生事情。

## 经营台数据回写

先private_get_business_board(payload.privateOps.businessDate=YYYY-MM-DD，东八区；可选bindingId)，查看已关联店铺、当天事实、既有策略任务与目标。只读取需要的有赞流量/交易/会员事实，不为老板日报重跑全历史客户导出。连接器实时schema、UNKNOWN预算沿03。

通过原有private_save_snapshot保存日报：domain=traffic，shopId/绑定一致，windowStart为该日00:00+08，windowEnd为实际cutoff，capturedAt不早于cutoff；工具/请求/会话/覆盖/限制与真实取数一致。receipt为以下JSON字符串：

```
{
 "version":"private-owner-day/1", "date":"YYYY-MM-DD",
 "cutoff":"ISO带时区", "complete":false, "queryStatus":"UNKNOWN",
 "scope":"具体店铺/总部/渠道统计范围", "conversionComparable":false,
 "metrics":{
   "visitors":{"value":null,"definition":"日去重访客UV范围","evidence":"来源或未取得原因"},
   "paidBuyers":{"value":null,"definition":"实际付款买家口径","evidence":"来源"},
   "paidOrders":{"value":null,"definition":"付款订单口径","evidence":"来源"},
   "paidFen":{"value":null,"definition":"实付金额，整数分","evidence":"来源"},
   "repeatBuyers":{"value":null,"definition":"当日买家中此前已有购买的人数及历史范围","evidence":"来源"},
   "repeatBase":{"value":null,"definition":"与该复购买家一致的当日买家分母","evidence":"来源"},
   "adSpendFen":{"value":null,"definition":"历史兼容字段，当前私域不用","evidence":"固定null，不查询"},
   "adRevenueFen":{"value":null,"definition":"历史兼容字段，当前私域不用","evidence":"固定null，不查询"}
 },
 "events":[{"what":"当天可证实的经营变化或事件","evidence":"对应回执"}]
}
```

value已知时为非负整数字符串，未知null；金额先核单位。complete只有次日00:00为截止点且全天覆盖时才true；conversionComparable仅在访客/买家统计确实可相除时true。快照只上报事实，不能自带“完成增长”的结论。

## 行动和目标

每条tactic的metricKey取traffic/conversion/aov/repeat之一；对应老板的进店人数/转化率/客单价/复购买家占比。不要靠标题关键词猜关系。task可以显式metricKey，也可沿关联策略/旅程继承；关联不清先核，不分派给错误模块。

目标用targetValue/targetDate/targetShopId记录数值、日期与店铺；conversion/repeat单位百分数（不是0—1），aov为元。品牌未确定的目标留空或把策略保留draft，并明确“建议目标待确认”，不得把AI任意设值当老板已承诺。日目标只和同店同日的完整实际对照；周/月目标另按该完整周期核验，不挪成单日达成。

围绕每项指标保存具体行动、预计改善机制、负责板块和人员、时间、成本/素材/人群、实际执行回执、测量窗口。开发联调不能制造日常已执行记录；草稿/排期/进行中/遇阻/已完成分别显示。父策略归档的旧任务先核，不自动继续执行。

## 老板日报的交付形态

一段今天经营结论＋一张四指标表＋最多三项本日重点行动＋计划/实际对照＋下一决定。行动写“把哪款商品哪段说明改成什么、哪批客户解决什么问题及对应有赞设置”，不只写“提升转化”“精细化运营”。

执行完成不等指标达标；指标达标不证明动作造成增量。有可比依据后说明继续/调整/停止/扩大哪些动作、由谁在何时完成，并续接原战略/策略与任务。未知只限制对应结论，仍交付已能完成的分析、内容及配置。

queryStatus保留工具外层真实COMPLETED或UNKNOWN；正文自称COMPLETED/isFinal不能覆盖外层UNKNOWN。可保存有依据的部分数值并明确部分上报，但不判达标或涨跌。日内同一买家多笔不是历史老客复购，若只返回日内多笔次数，repeatBuyers保持null。
