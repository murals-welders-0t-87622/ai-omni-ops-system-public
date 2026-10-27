# 同口径数据、行为标签与可复算分析

## 取数和质量

核对品牌、kdt_id、总部/门店范围、业务时区和不含截止点asOf。订单按付款时间而非创建时间统计付款，退款说明是订单累计退款或退款日流水；支付方式文字不替代支付事实。订单去重且冲突先核。分页不全、退款未知、早期历史不足影响对应指标，不补0。

数据基础包括会员、交易、退款、商品/库存成本、权益、互动与触达、渠道活动。当前计算器先承接最小交易/会员明细；未取得加购、券或触达日志就不计算对应漏斗，不声称完整CDP。只有汇总时明确来源上报，不能称独立复算。

## private-growth-data/1

JSON对象字段：

- version、shopId、capturedAt、historyStart、asOf（ISO带时区，asOf不含端点）。
- ordersComplete、membersComplete、historyFromFirstTrade：布尔值，须由分页/最早历史支持；180天不自动等于首笔完整。
- coverage：范围、页数/总数/限制；source={toolName:agent_call或youzan_query,workSessionId,workRequestId,evidence}。
- orders：最多2000笔，每笔id/customerKey/createdAt/paidAt/paymentState/paidFen/refundFen/channel/items。paymentState=paid/unpaid/unknown；已付须真实paidAt；金额为整数分字符串，refundFen未知null。
- items：itemId/skuId/quantity/paidFen，商品分摊未知null，不能将整单金额重复分到每个商品。无明细空数组并说明。
- members：最多5000条，customerKey/joinedAt（未知null）/isMember。无会员数据空数组且membersComplete=false。
- customerKey为同品牌加盐稳定SHA256（64位小写十六进制），不传姓名电话地址或原始个人标识；salt不进技能包。散列键用于统计，不自动当CRM客户ID或触达对象。

超过上限选可完整覆盖的业务窗口并说明限制，不静默截断。`node scripts/analyze.cjs input.json output.json`只本地计算，不联网、不写品牌库；输出来源、规则、分母和限制。

## 指标与标签

诊断前做一次证据对照：每项结论的数字来自哪一段/哪张表，输入是明细还是汇总，是否真的包含该指标所需字段，分母与窗口是否相同。小型券/退款JSON不含订单/客户历史，不能据此声称复算全部经营指标。原始回执与后续摘要冲突时保留冲突，以原始已终结回执为依据，不任选有利数字。

付款订单/客户/实付是窗口内正实付事件；全额退款订单不作净购买保留。累计退款后金额不是退款日现金流或利润。近14日/前14日均完整才比较。

30/60日二购：按净购买排序，以首次净购买为队列起点；起点加观察天数不晚于asOf才进入分母，窗口内有后续净购买进入分子。首笔历史不足称“观察期首次净购买队列”，不能称新客首购。分母0显示暂无成熟队列，不报0%成功率。

时点“累计只购1次的人数”和成熟首购队列不是同一分母：队列包含后来复购的人，不能说当前一次购买人群里有某个队列比例已经/必然复购。不能将全期、近14日、30日队列混成一条漏斗；触达/未触达、活动/自然购买不可从无日志的交易汇总推断。下滑是待解释现象，不自动证明唯一瓶颈或某个原因。

候选人群数量只有规则与明细或明确来源分群回执才能得出；缺少时写待计算及所需字段。日均首购估算、模型猜测不能标executor_reported或作为实际命中人数。目标可明确作情景测算并给假设/成本/期限，不能把任意目标、样本、客单、退款或退订阈值伪装成经营基线。

商品共现仅证明一起购买过，不证明另一个品类客户适用。触发可以设计为事件和条件分支，但购买间隔/用量/健康周期要有真实依据，不能从规格和一次购买推断生理周期或“已用X天”。功能“未使用”不等于未订购；消息渠道未经查实不能称可用；当前缺依据也不等于该商品或机制永远不能做。

金额单位至少核原字段、接口说明/商品或券面额一致性。字段名含Fen不证明上游正确换算；券名“5元”而数值50000分等冲突必须隔离核实，不用于优惠规则/预算。只核领取/使用数也不能证明券的增量效果。

行为标签：观察期1笔/多次净购买、近30日购买、31—60日/超60日未再购、会员观察期未购、观察期退款。展示规则/人数/客户/来源/时点；退款未知或交易不全时不输出可靠净购买标签。未购会员需两边完整；未购或间隔不是流失或营销同意。

RFM为观察期最近购买间隔、净购次、退款后金额；历史不足不称终身价值。价值分层/召回阈值依据品牌交易分布、商品周期与成本，不固定套全行业分数。来源、品类、规格、权益、互动、服务和客户表达等标签取得真实字段后增加。

中台private_save_growth_data(bindingId,data JSON字符串,idempotencyKey)保存不可变版本；private_get_growth_analysis(dataId可选、tag可选、offset/limit)由同引擎复算并分页。默认最新数据，续接分析携带dataId。输入完整性仍是上游证明，独立复算不等财务审计。

## 只有来源汇总时

供应商沙箱文件不是本机文件，未拿到受控附件/实际内容不能称明细已交付。只读尝试受控下载或产物引用，不把私密数据上传公开云盘，不重导出未脱敏raw。无法交付时保留结果与缺口，不能编造明细。

可用private-growth-report/1保存已取得的汇总，仍走private_save_growth_data；页面单独标executor_reported，不生成客户行或实际标签断言。字段为shopId/capturedAt/historyStart/asOf/coverage/source、reportedOrders/paidOrders/paidBuyers/paidFen/refundFen（分字符串，未知null）、paymentBasis、frequency{once,twice,threePlus,definition}、cohorts[{windowDays,numerator,denominator,basis}]、periods[{key:current14或previous14,start,end,paidOrders,buyers,paidFen,basis}]、channels[{channel,orders,basis}]、products[{itemId,name,units,paidFen,basis}]、capabilities、limitations。购次合计须等于相应买家分母，队列分子不能超过分母，渠道范围与付款口径分别解释。只核汇总算术不等独立复算队列；不同范围退款/实付不相减。

汇总可以做自身数字的算术与结构分析，不能因没有明细宣称“无法拆解任何经营问题”。缺少独立核验不等于数据为假；分别列上报事实、可核算术和待证解释即可。渠道未知不输出零个渠道，能力状态未知不输出不可用。缺口只限制对应名单/发送/金额配置，品牌资料、已有商品与经营资源仍用于产生具体内容和配置产物。
