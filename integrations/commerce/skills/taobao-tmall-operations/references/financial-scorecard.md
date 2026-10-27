# 财务目标到每日经营

## 战略：先明确要做出什么生意

承接品牌生意模式与电商角色，读同店完整周期的经营、商品、渠道、广告、会员和履约数据，确定当前阶段、优先瓶颈和进入下一阶段的条件。区分平台支付金额、下单GMV、会计收入、贡献和利润；ROAS不能替代利润，同期支付减同期退款也不等于同批净收入。

以可核算恒等式组织：支付金额＝支付订单数×每单支付金额。订单再拆到渠道×商品或新老客贡献；只有周期/渠道/去重范围一致时才用访客×买家转化。复购是队列诊断或老客贡献，不再乘到已经包含老客的总流量公式上。不能拿接口跨日汇总当周期去重人数。

每个目标包含周期、基线、数值或待定、定义单位、方向、推演依据和确认状态。场景目标要由订单容量、商品结构、预算、库存、成熟队列推导；列假设与资源瓶颈，未确认标proposed。不抄用户举例数字，不保证效果。未知目标为null，仍交付事实、方向、可做动作及取证安排，不让整份策划停在等数据。

每个驱动指标关联具体actionKeys及onMiss：订单不足先拆商品×渠道/搜索意图/承接；每单金额不足核组合价值、让利和退款；复购不足核首购队列、商品周期、触达与服务；费用失控拆成熟归因与SKU贡献，成本未核不扩预算。按当前瓶颈排序，不能把动作完成率当财务结果。

## 策略：资源、方法和排期要能照着做

复用当前planId/最新revision和action.key。每行动明确支撑的driverIds、商品/页面/渠道对象、方法步骤或改前改后参数、岗位/素材/工具资源、费用上限及依据或待定、开始结束日期、前置条件、交付物与验收。建议岗位不假称已经有人接单；排期在目标周期内，依赖不能互相矛盾。

内容接主图/详情/视频项目与变量；流量拆账户/计划/商品/关键词或人群；活动有真实SKU、价格、限量库存、叠加规则、页面和客服承接；会员用真实分群和周期。缺数据可先做草案和取证，授权店铺变更、触达、预算和付费生成分别核对，不因保存方案自动执行。

## 执行：实际数据、差距和下一步

把真实回执保存为不可变快照，读取plans[].tracking。系统按计划版本与最新同店/工具/币种/来源状态/完整窗口及定义单位核对。每日/周checkpoints各有start/end和目标，不机械平摊90天总目标、不把重叠日周报累加。新快照入库后自动重算，页面打开时每60秒读取；第三方仍需授权连接器回写，不能冒称实时同步或后台已唤起客户端。

未结束窗口、缺数、目标未定、口径变化与未达标分开。差距→关联动作→真实执行证据→商品/渠道/队列原因→具体调整、负责人、资源和下一检查日→新计划版本。看到一个数下降不能说某改图造成，也不能用closed证明外部完成。拟议目标对照、已确认达标和真实增量分开；测试数据不能称品牌增长。

## scorecard实时契约

commerce_save_operations_plan增加可选scorecard，省略保留已有值，与growth并存。所有actions须有稳定唯一key。scorecard含baselineSnapshotId、start/end、approval(proposed/confirmed)、goal、drivers、tactics、checkpoints、cadence(daily/weekly)、dueLagDays(0—30)。基线须本品牌同店且早于目标周期。

goal/driver：id（财务固定goal）、stage/metricKey/label/unit/definition、target(非负十进制字符串或null)、direction(increase/decrease)、rationale/actionKeys/onMiss。财务用原报表CNY金额。可选derived为同板块比值，含numeratorKey/denominatorKey/numeratorDefinition/denominatorDefinition/numeratorUnit/denominatorUnit；分母>0，缺数/定义单位变化不算。

tactics：actionKey/driverIds/method/resources/costLimit/startDate/endDate/dependencies/deliverable；每行动一份资源排期，driver须关联该行动。checkpoints：start/end和targets[{metricId,target}]，窗口不重叠且在总周期内。目标未知不能确认。

tracking由当前版本和不可变快照重算，含checkedAt/planRevision/checks；不是外部执行或审计日志。取最新纠错结果，不回退选择好看的旧数；rows给actual/target/delta/met/status/reason/suggestion/actionKeys。复盘须核实际回执与成熟窗口，不仅看绿色达标。

## 页面与学习来源

旧完整report/actions继续可读，补结构不改历史。战略能看到财务目标→指标→行动，策略能看到资源方法排期，执行能看到目标实际及下一决定。完整Markdown表格补正常表头分隔行；旧报告缺分隔只修显示。

来源：用户2026-10-26对战略/策略/执行的明确反馈，以及本项目同源契约和金额/范围实现。属领域方法补齐，不改23入口/职责/依赖及生意模式→战略→策略→执行→反馈主框架。工程通过不替代自主策划、授权执行或商业增长验收。
