# 电商工作区与五个一级菜单（374）

400：电商财务目标→驱动指标→行动资源排期→完整窗口数据跟踪及未达标建议，兼容旧报告安全排版/历史；第三方采集仍须授权连接器回写。见[财务目标与跟踪](changes/2026-10-26-commerce-financial-scorecard.md)。

用户最新信息架构：全局概览、品牌增长、全域获客、私域复购、电商板块。全域获客下保留内容/GEO/全网/投流/达人五个原业务地址，二级菜单随页面选中；电商下为详情页及淘宝/天猫运营。私域复购按要求暂空，不引入新的CRM流程。参见[变更记录](changes/2026-10-25-commerce-workspaces.md)。

## 业务分工

Codex/WorkBuddy执行专业创作，千问办公通过其当前淘宝天猫商家端连接器取数；中台承接本品牌资料、项目、快照、计划及不可变版本。不新建Agent引擎，不自动发布、改商品、调预算或客户触达。

`integrations/commerce/skills/`为两套技能源码：`ecommerce-detail-creative`及`taobao-tmall-operations`。Web构建执行`scripts/package-commerce-skills.cjs`，生成`public/commerce-skills/*.zip`及SHA256；页面提供下载。本次新增到Codex/WorkBuddy用户技能目录，未覆盖旧技能/正式专家。安装文件一致不代表完成真实付费生成或商业验收。

## 详情页 /tabs/ecommerce/detail

从产品资料库选择产品和制作要求，建立项目、冻结产品快照。展示完整卖点报告/要点及依据，逐页文案、画面提示词、受控图片、可选视频创意与产物。文案可编辑并保存新版本，历史可查看或恢复为新版本。

图片按用户指定的多元探索，目录实际ID为gpt-image-2；不构造“gtp-image-2.0”别名。视频使用seedance20-mini-multi-reference（2089757422163419137），初始480p/9:16/10秒。须先询问是否继续，再确认全部参数与当前创意；页面确认只记录选择，不启动生成。修订后确认清空；产物/旧确认历史保留。

“交给AI”复制包含当前品牌/项目的完整委托，需粘贴到执行客户端；不能声称点击就后台唤起。生成、归档、参数确认、页面保存分别验收。没有用户选择产品与实际调用时不预造作品。

产物只引用本品牌MediaAsset或AIControlCenterCreativeMaterial，要求有受控storageKey，MIME类型与位置一致。页面用会话认证读取`/api/works/...`Blob，检查返回类型并由浏览器解码，错误显式提示。不得使用缺/api的网页路径或把第三方临时URL当永久归档。

## 淘宝/天猫 /tabs/ecommerce/operations

品牌Owner/Admin确认店铺归属，已有店铺继续使用。同一平台稳定店铺标识不可同时写到两个品牌。按经营体检、货品转化、流量推广、活动会员、履约服务、计划复盘六区承接指标、表格、证据及缺口。

快照不可变；携带店铺、统计窗口、上海时区、CNY、来源状态、工具及证据、技能版本。每项指标为带unit/definition的十进制字符串或null。原始商品/渠道/广告明细可用tables表示，列名必须唯一、行字段限定于声明列。分表/分粒度不默认聚合，未知不补0。

sourceStatus为unverified/provider_reported/test_data。provider_reported只是连接器上报，不能宣称平台独立审计。完整报告和动作包含负责人、日期、成功指标及状态，保留计划修订；externalExecuted始终false，保存计划不会在商家平台执行。

[此段涉及具体客户资料，公开版本已省略。]

## HTTP与MCP同源

HTTP `GET /api/ai-control-center/brands/:brandId/commerce?area=detail|operations`；`POST .../commerce/actions`传`{action,payload}`。MCP复用`manage_growth_reports`，传`{action,payload:{commerce:{...}}}`；实时schema为`packages/shared/src/commerce.ts`的COMMERCE_SCHEMA。

| 动作 | 作用 |
|---|---|
| commerce_get_workspace | 必传area，详情返回完整产品/项目/媒体，运营返回店铺/快照/计划 |
| commerce_get_detail_history | 按本品牌项目回查不可变版本 |
| commerce_create_detail_project | productId、instructions、pageCount、可选title；冻结产品资料 |
| commerce_save_detail_revision | projectId、expectedRevision、完整body；不覆盖历史 |
| commerce_confirm_video | 当前已保存版本、用户确认原话；不生成 |
| commerce_bind_shop | 真实平台/店铺ID/名称/归属证据，仅Owner/Admin |
| commerce_save_shop_snapshot | 不可变经营快照，带周期/单位/来源/明细 |
| commerce_save_operations_plan | 完整方案与动作；expectedRevision保护并发，另留不可变修订 |

写入要求idempotencyKey，同键同内容回原回执，不同内容冲突。按品牌事务锁与店铺映射锁处理并发。详情使用既有`brandGrowth.library.products` view/edit；运营使用`brandGrowth.report.growthReport` view/edit，映射另验Owner/Admin。URL/当前会话品牌/关联产品、项目、店铺、快照、媒体均核验，不回落默认品牌。

数据复用BusinessAsset/GENERATED_REPORT，metadata.kind为COMMERCE_DETAIL、DETAIL_REVISION、VIDEO_CONFIRMATION、SHOP、SHOP_SNAPSHOT、OPERATIONS_PLAN、OPERATIONS_PLAN_REVISION、RECEIPT（均COMMERCE_前缀）；无schema迁移。数据库不可用报503，不以本地文件伪装成功。工作区各类当前列表最多200，媒体列表每类最多200；详情历史按具体项目查库。大规模分页/跨系统供应商回执自动采集不属于本次实现。

## 验证与回退

`npm run build:server`、`npm run build:web`；`node scripts/test-commerce.cjs`及RunningHub字段/后台读取回归。真实Lab用明确隔离品牌验证HTTP/MCP、幂等/并发/越权、历史、MIME引用、图片解码、页面编辑刷新、技能下载、运营快照和手机布局，结束注销并清理。

回退：恢复本轮备份文件或将`before-commerce-374`的Lab server/web标签恢复为dev，再只对Lab服务`up -d --no-deps`。无DB迁移，回退应用不恢复整库、不删除真实品牌新数据。原系统容器/DB/凭据不在影响面。证据与镜像ID见项目artifacts/20261025-电商工作区与技能；未提交推送。

[此段涉及具体客户资料，公开版本已省略。]

## 1.1 增长链路兼容扩展（398）

沿既有两个电商入口与23技能主框架，补生意模式/阶段方向→顺序/目标→具体商品及行动→执行证据→同口径复测。没有迁移、自动执行商家动作或新建Agent基础设施。

共享commerce-growth定义与校验由HTTP/MCP同源使用；operations plan可选growth，actions可选稳定key；基线/结果均严格品牌及店铺，内容projectId严格品牌。旧计划兼容，已有growth更新不能孤立删除关联行动。workspace返回派生growthReview：等长不重叠、同来源/币种/定义单位、执行时间位于两期之间才算定点差额和目标，不据计划状态声称执行、不作因果归因。仅处理当前最多200条快照，历史超出范围需另取原记录补证，不伪造趋势。

商品项目body可选mainImages/listing（标题/关键词/介绍/产品身份锁/平台规则依据/FAQ），媒体沿既有品牌/类型/受控副本检查；旧客户端省略新增内容时保留已有值。原卖点/pages/video、用户确认与不可变版本不变。运营页默认战略，其次策略/执行/业务总览；每指标历史只取等长、不重叠、同定义来源单位周期。图形为归档对照，非实时。

WorkBuddy11项按范围核读，GitHub两项目方法比较；公开只发布独立消化方法，第三方全文/品牌数据/凭据不进公共技能仓。两技能1.1.0，专用库1.3.0；Lab ZIP带本地共同约定，下载不依赖不存在的兄弟目录。主架构不变，未安装宿主全局技能。

验证范围及部署/截图/原容器基线以本轮artifacts为准；工程夹具明确测试，不冒充品牌增长。真实店铺读取、平台执行、样本成熟和商业效果必须单独验收。当前淘宝/天猫+CNY/上海时区保持，跨境仅方法研究，不能宣称跨境店已接。

## 旧方案展示纠正（399）

四视图独立切换，旧report/actions无需业务迁移即可承接；数据分类仅总览、完整旧稿保留。计划关闭不等实际执行，选报表不改方案基线。见[修复与验收](changes/2026-10-26-commerce-view-compatibility.md)。

## 402 电商执行与修订

当前入口覆盖商品主图/详情/视频、淘宝天猫运营及店铺运营工作台。新增三动作、监测窗口及修订契约见[402](changes/2026-10-27-commerce-operator-revision.md)。千问仅核到查询与间接广告诉求，直写未接；跟踪读取已入库数据。上文374时期的“尚未建品牌”“仅复制委托”仅为历史阶段说明，当前已支持本机Codex六任务。

## 403 目标重排与经营看板

403：取消独立运营台；目标可改并调用本机Codex重排；七类策略/三档具体费用与经营全景、商品、推广、用户看板。见[变更与契约](changes/2026-10-27-commerce-planning-dashboard.md)。 当前不提供商家直写，旧operate路由转策略。operations workspace新增tasks/executor；action commerce_request_plan_task包含planId、expectedRevision、targetScenario。保存计划可携planTaskId/executorId/leaseToken关联真实任务新版本。
