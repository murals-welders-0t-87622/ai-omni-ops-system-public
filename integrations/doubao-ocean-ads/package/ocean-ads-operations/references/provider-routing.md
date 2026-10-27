# 连接器与中台路由

## 先判断问题和数据来源

| 业务 | 本机已核实的技能资料 | 当前边界 |
|---|---|---|
| 巨量引擎 | doubao-oceanengine-adops-agent | 官方Remote MCP只读；账户/计划/广告维度以实时工具为准，keep/observe/suggest_pause仅建议 |
| 千川 | qianchuan-advertising | 授权账户关系、字段说明、标准/全域账户聚合、当日直播；不能把文档未开放的商品/人群/词数据视为已经获得 |
| 本地推 | advertiser-reporting-mcp | 本地推广告诊断与只读报表；未授权保持待接入；不是通用巨量广告主全平台工具 |
| 自有中台 | 品牌运营助手 / manage_growth_reports | 当前品牌账户映射、报表分页/提交、诊断及优化计划；无供应商广告写操作 |

## 千川取数顺序

用实时tools/list或tool_search发现实际绑定工具，再按其当期schema调用。以下是已读文档中的操作名，仅用于定位，名称或参数变化以当前接口为准：

- oauth2_advertiser_get：发现授权账户及类型。
- agent_advertiser_select_v2：代理下账户；customer_center_account_list_v3 / offline_list_v3：符合类型的工作台下账户；qianchuan_shop_advertiser_list_v1：店铺下账户。只展开用户任务需要的已返回关系，不把工作台ID当广告主ID。
- advertiser_public_info_v2、qianchuan_aweme_authorized_get_v1：账户基础与抖音授权范围。
- get_tool_response_field_desc：字段含义、单位、时间维度与可用指标。
- qianchuan_report_advertiser_get_v1：标准；qianchuan_report_uni_promotion_get_v1：全域；qianchuan_report_live_get_v1：当日直播。分别保存，不能重复相加。

直播间ID、抖音ID与广告主ID独立保存，不交换使用；直播按小时/房间字段须以实际返回为证。缺乏日明细时保留期间聚合并明确期间，不把期间值复制到每天。当前中台以日期行组织快照，尚未验收期间聚合行的显示与计算；仅有期间聚合时先保留待归档原表，不伪造成单日记录或借dimensions绕过。

## 商品、人群、搜索词、竞品和素材

先查实际接口能力；现有千川文档不能证明这些维度可直接查。若需要但不可用，使用用户提供的相同窗口导出数据，标注“用户导入”与来源/日期/口径，不伪装成官方实时取数。没有明细则仅输出排查清单，不能由账户ROI倒推每个商品/词/人群ROI。

当前中台千川快照仅接受account粒度。细分原表不能塞进account行，也不能把商品销量写成账户转化。可在真实账户快照所支持的诊断中明确引用附加导出证据；若没有可关联快照，保持本地待归档，不伪造空快照。未来扩展粒度需中台服务、schema、UI、权限和业务样本共同验证。

## 决策后的动作

将调价、否定词、人群排除、增减预算等写成有条件的方案。本技能与当前中台没有对应外部执行回执；不得调用社区自动投放脚本、授权高级版、登录供应商后台执行。用户另行明确要求执行时，先确认产品确有受支持、已授权能力与具体业务范围，交给相应执行流程；不能在本技能中默默变更账户。
