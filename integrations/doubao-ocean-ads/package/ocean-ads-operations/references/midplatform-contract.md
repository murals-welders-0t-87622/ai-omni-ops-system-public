# 中台回写契约（Lab现有实现，2026-10-24）

入口：manage_growth_reports。参数形状固定为 `{action:"ocean_...",payload:{oceanAds:{...}}}`。不得把示例对象ID用于真实品牌。先读 get_current_brand_context 和本会话实时schema；当前品牌由连接绑定，调用者不能注入其他brandId。

网页：`/tabs/ad-traffic?platform=ocean&panel=oceanAds`。HTTP与MCP共用OceanAdsService；本技能只通过已绑定MCP，不自行读取凭据代调HTTP。

## 动作与先后

1. **ocean_get_workspace**：可选businessType(engine/qianchuan/local)、advertiserId、batchId、start/end。读取accounts、snapshots、selectedSnapshot、records、totals、rates、analyses、plans、batches。不同窗口/报表不能随意累加。
2. **ocean_bind_account**：businessType、advertiserId字符串、accountName、mappingEvidence、expectedRevision（初次0）、idempotencyKey。仅Owner/Admin可确认归属。已有映射先复用，不因取数重复绑定。
3. **ocean_submit_batch**：完整scope、page/pageCount及records，暂存而非立即生效。每页≤500、最多100页。**所有页先保持同一个scope和pageCount，失败后只补缺页**。
4. **ocean_get_sync_status**：按businessType/advertiserId/batchId核对已收页、应收页与行数。
5. **ocean_commit_batch**：businessType、advertiserId、batchId、idempotencyKey。缺页/跨页重复不能提交。回执status=committed及contentHash后再称快照已入库。
6. **ocean_save_analysis**：businessType、advertiserId、batchId、title、body（≤30000字）、facts/inferences/unknowns（各≤30条）、recommendation(keep/observe/suggest_pause)、skillId=ocean-ads-operations、skillVersion=1.0.1、sourceEvidence、idempotencyKey。必须绑定本账户已提交快照，回读snapshotHash。附加导出/资料只能在真实来源证据下讨论，不把它伪装成该快照的返回字段。
7. **ocean_save_plan**：businessType、advertiserId、analysisId、title、body（≤10000字）、owner、dueDate、reviewDate（不早于dueDate）、successMetric、status(proposed/adopted/in_progress/review/closed)、expectedRevision、idempotencyKey；可选productIds、materialRefs。初次revision=0；编辑加planId并使用当前revision；冲突先读取新版本，再决定合并。productIds和materialRefs只能使用当前品牌已存在对象，未知引用不要猜。

所有写入用8—160字符幂等键。同键同参返回原回执，变参必须新键；超时先回读，不能重复另建业务对象。计划每次修改保留不可变修订，externalExecuted=false仅指中台建议与状态，不证明广告已变更。

## scope、记录与单位

```json
{
  "businessType":"qianchuan",
  "advertiserId":"从真实账户发现返回的字符串ID",
  "batchId":"由工具生成的稳定批次ID",
  "page":1,"pageCount":1,
  "reportType":"standard","grain":"account",
  "window":{"start":"实际开始日期","end":"实际结束日期","timezone":"Asia/Shanghai"},
  "currency":"CNY","targetEvent":"实际目标事件","attribution":"实际归因定义",
  "toolName":"实际成功的供应商工具名","skillId":"ocean-ads-operations","skillVersion":"1.0.1",
  "sourceEvidence":"查询参数、成功状态、来源或合法导出证据，不含凭据",
  "records":[{"externalId":"同advertiserId","date":"实际统计日期","dimensions":{},"metrics":{"spend":"100.25","clicks":"10"},"rawMetrics":{}}],
  "idempotencyKey":"稳定唯一键，不照抄示例"
}
```

金额输入单位是元；原接口返回分时先明确换算依据，不能仅按字段名猜。指标非负十进制字符串，最多18位整数/6位小数，曝光/点击/转化必须整数；数值ID会丢精度，拒绝用number传账户ID。

metrics只收spend/impressions/clicks/conversions/revenue，缺项省略而非0。rawMetrics最多100项、仍是非负数值字符串；率要明确0—1还是百分数，负值不能取绝对值后塞入。dimensions最多20项字符串，放真实业务维度，不能存凭据或用户隐私。

engine只用engine_report，qianchuan只用standard/universal/live_today，local只用local_diagnosis。千川当前只收account粒度，live_today仅上海当日；其他业务的粒度需实时schema及真实数据支持。未知供应商更新时间不填providerUpdatedAt；不要用入库时间冒充平台数据时间。

## 离线准备工具

可使用包内 `scripts/prepare_batch.py 输入.json 输出.json` 校验并生成待调用的分页参数；它不联网、不读凭据、不保存到中台。输入是Agent从真实返回整理的 `{brandId,scope,records}`，scope不含分页/批次/幂等键。输出包含brandId核对值及calls列表，逐个通过实际MCP执行，再读回；输出的draft状态不代表入库。

## 失败恢复与能力缺口

- 400：核对字段、单位、日期和范围，不能删未知字段后悄悄改变语义。
- 403：核对当前品牌及成员权限，停止跨品牌访问；不要自动申请更高权限。
- 409：同键异参、缺页、重复记录、口径变化或CAS冲突；按具体原因修复，已提交批次改用新批次，不覆盖历史。
- 503/网络未知：保留已收页和请求键，读sync_status/工作区后恢复，不造空数据。
- 检索摘要未展示ocean动作：不能直接判不可用。先核对当前服务端完整契约，再对已授权中台工具按明确契约只读调用ocean_get_workspace。2026-10-24曾出现摘要未列动作但原生实际调用成功；摘要、正式校验和实际回执分别记录。客户端正式校验/权限实际拒绝时保留原错误，不绕过或重置Token。服务端元数据、客户端真实调用、供应商数据、归档写入四项分别验收。

externalWriteEnabled=false是外部广告写入边界；不是自有中台禁止归档。不要把工作区空数组当连接失败或广告账户没有数据；它只说明本品牌尚无对应已归档记录。

只做临时研究/无数据分析时不创建虚构账户、快照或计划。用户要求保存但缺完整报表时，明确“未归档”，不制造空快照满足前置条件。
