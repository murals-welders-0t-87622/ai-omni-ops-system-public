# 电商能力覆盖与来源核查（2026-10-26）

保留23入口与职责主结构。下表表示各业务环节已纳入方法和交接，不表示所有第三方远端动作已连接或业务效果已验证。WorkBuddy来源只读核查本机已安装原文/相关章节，不公开复制专家全文；连接器能力必须以执行当次真实工具schema为准。

|业务环节|当前技能支撑|本轮外部方法依据|实际工具与当前边界|
|---|---|---|---|
|经营方向/阶段/策略|总统筹 + 本技能growth-loop|Toolkit架构/7模块；merchant上下文与决策轨迹；WorkBuddy市场研究|品牌资料/报告+店铺快照；阶段由事实判断|
|市场、人群、竞品、选品|本技能workflow/growth-loop|WorkBuddy market-researcher；Toolkit Market/Product|公开资料/授权报表；价格样本、静态库不当实时大盘|
|SKU、供给、定价|本技能+commerce_metrics.py|Toolkit单位经济；WorkBuddy youzan-item/supplychain|有赞原始读取；淘天库存/成本接口须按授权核实；不自动采购/调库存|
|标题/关键词/FAQ|ecommerce-detail-creative + 本技能|Toolkit Listing；merchant lister/service；WorkBuddy cs-knowledge-base|产品真实资料→中台listing；生成文案不等上架|
|主图/精修/详情|ecommerce-detail-creative|WorkBuddy product-main-image/detail-page/smart-refine；Toolkit Image|既有品牌gpt-image-2路线；外部Infimind/Picset是候选，不静默改供应商|
|商品创意/带货视频|ecommerce-detail-creative / ai-commerce-video / creative-production-router|WorkBuddy video-generation；Toolkit Video|既有SeedanceMini多参及用户确认；代码动效路由已有工艺|
|搜索/内容/直播/达人|本技能 + brand-content-growth/influencer-cooperation|Toolkit流量诊断；既有专业方法|实际归因/平台字段核实时；对外联系独立授权|
|付费与营销|本技能 + ocean-ads-operations按平台职责|Toolkit Ads；WorkBuddy youzan-marketing/traffic|广告/活动建议与执行分离；有赞当前入口只读，不凭技能发券/启停|
|客服、订单、退款、履约|本技能 + ai-sales-operations|merchant Service；WorkBuddy cs-knowledge-base/youzan-order/supplychain|CRM/客户服务复用既有模块；平台身份不可与3Chat直接拼接|
|会员/老客/复购|youzan-private-operations + ai-sales-operations|现有私域完整方法；WorkBuddy营销数据|依据身份和成熟队列；不得用30日订单频次冒充首购队列复购|
|归因、评价、复测迭代|本技能growth-loop/metrics/commerce_metrics.py|Toolkit Reviews/闭环；merchant analyst计算审查|中台growthReview只做同口径前后观察，不替代随机实验与利润审计|

## 采用与舍弃

两公开来源：[跨境Toolkit](https://github.com/heqiangdiao-wq/AI-Cross-Border-Ecommerce-Agent-Toolkit)、[merchant-agent](https://github.com/yyf2002-oos/merchant-agent)。读取README、选定模块/契约/脚本与实际工作流；Toolkit原38页PDF和所有示例并未全量研读。Toolkit核到MIT；merchant本次树未见LICENSE，故不复制其代码或文档，只作独立方法比较并链接。

采用：事实产品Brief贯穿内容、数值计算与AI判断分工、SKU贡献与推广承受力、评价/服务回流、具体对象修订与复测、共享上下文和决策轨迹。自行实现当前品牌/权限/版本契约，没有运行或部署原项目Agent栈。

舍弃：示例静态供应商/价格当真实、默认成本费率、成本乘倍数定价、样本不足时自造销量、全平台统一CTR阈值、广告永不停、固定15/30秒视频、固定9图、每环强制再确认、评论问题全靠文案修好、模板截图当实际成果。现有用户授权与制作选择优先；新来源的模型/宿主/上传规则只适用于其自身工具，不覆盖中台工具。

## 后续运行中怎样补强

按当前问题在WorkBuddy查现有技能原文→GitHub官方原项目核查→小范围适配→测试/来源登记→版本发布。先复用当前入口与公共方法；缺连接器标能力缺口并交可执行替代步骤。新增平台、改变主结构或职责须先展示具体变更并与用户确认。不要用目录数量证明完整自动化。
