# Ontology 编排中心 2.0 工作台简报

## 1. 本次重新对齐后的目标

本轮按最新业务定义重新收口：

1. `Ontology 编排中心` 才是“这件事该谁干、谁能干、怎么干、干到什么边界”的主脑。
2. 原 `专家团队管理` 不再作为独立主板块存在。
3. 专家团 / 专家 / Skill 的结构监控、版本记录、差异解释、回退发布，统一并入 `Ontology 编排中心`。

最终目的不是再做一个“专家配置后台”，而是把 WorkBuddy 专家团 / 专家 / Skill 的真实结构变化，直接挂到 Ontology 画布里，让用户看得见、退得回、发得出、写得回。

## 2. 页面结构结论

### 2.1 不是新增第二张画布

本方案明确只保留 **一张主画布**。

这里说的：

- `画布`
- `结构变化`
- `版本回退`
- `发布同步`

不是四张画布，也不是四个独立页面，而是 **同一个 Ontology 项目页里的 4 个工作区**。

### 2.2 推荐页面结构

单项目页面继续保持：

1. 中间：**主画布**
2. 右侧：**节点配置 / 节点版本 / 节点差异**
3. 底部或右侧下半区：**结构变化 / 版本回退 / 发布同步**

也可以做成同页二级标签，但仍然围绕同一张主画布：

- `画布编排`
- `结构变化`
- `版本回退`
- `发布同步`

切换的只是工作区，不是切换到另一张画布。

## 3. 主画布升级方向

## 3.1 画布仍然只有一张，但节点颗粒度升级

当前画布节点类型主要到：

- 业务阶段
- 专家 / Skill
- MCP 工具
- 数据对象
- 确认闸
- 证据写回

下一阶段建议升级成更清晰的执行颗粒度：

1. 专家团节点
2. 路由判断节点
3. 专家节点
4. **Skill 节点**
5. MCP 工具节点
6. 数据对象节点
7. 确认闸节点
8. 证据节点

其中 Skill 必须成为一等节点，而不是只藏在专家描述里。

## 3.2 节点之间要能表达“条件命中”

例如抖音全流程运营专家团：

- 什么情况走数字人视频专家
- 什么情况走剧情视频专家
- 什么情况走品牌讲解视频专家
- 不同专家下再命中不同 Skill

这部分不再只写在描述里，而要体现在：

1. 路由判断节点的条件
2. 专家节点到 Skill 节点的条件边
3. 节点元数据中的适用场景说明

## 4. 专家团队管理并入后的 4 个工作区

## 4.1 画布编排

职责：

1. 维护业务流程、专家流、Skill 流
2. 支持新增 Skill 节点、条件连线、版本标记
3. 节点上直接显示“当前绑定的真实对象”和“当前版本”

页面重点：

1. 每个专家节点显示：
   - 当前绑定 expert id
   - 当前 expert 结构版本
2. 每个 Skill 节点显示：
   - 当前绑定 skill 路径 / skill id
   - 当前 skill 结构版本
3. 节点角标显示：
   - `有变更`
   - `已落后`
   - `已回退草稿`

## 4.2 结构变化

职责：

1. 实时监控 `expert-source`
2. 把专家团 / 专家 / Skill 的变化映射回画布节点
3. 告诉用户“哪一版变了、变在哪个节点、影响什么路径”

页面重点：

1. 变化列表按节点聚合，不按文件路径堆日志
2. 每条变化展示：
   - 对应节点
   - 对应对象（专家团 / 专家 / Skill）
   - 版本区间（如 `v12 -> v13`）
   - 变化摘要
   - 影响的下游节点

## 4.3 版本回退

职责：

1. 从历史结构版本或历史发布版本生成“回退草稿”
2. 回退不是直接硬覆盖，而是回退成新的草稿版本
3. 用户确认后再发布

页面重点：

1. 支持按节点筛选历史版本
2. 支持先看 Diff，再生成回退草稿
3. 回退草稿进入主画布继续编辑

## 4.4 发布同步

职责：

1. 把当前主画布正式发布为新 `published_contract`
2. 同步写回 WorkBuddy 专家团 / 专家 / Skill 真源文档
3. 记录“本次发布影响了哪些节点、哪些真实文件”

页面重点：

1. 发布预览不能只看全局 hash，要能看到节点级变化摘要
2. 写回结果要按节点和文件返回
3. 发布成功后，结构版本与画布版本一并更新

## 5. 版本模型建议

不要把所有变化混成一个“版本号”，建议拆成 4 层：

1. **结构快照版本**
   - 对 WorkBuddy 专家团 / 专家 / Skill 真源的扫描结果

2. **画布草稿版本**
   - 用户在 Ontology 中编辑后的草稿

3. **画布发布版本**
   - 形成正式 `published_contract` 的版本

4. **写回同步版本**
   - 发布后实际同步回 WorkBuddy 文档的执行记录

这样才能区分：

1. 是 WorkBuddy 真源自己变了
2. 还是用户改了画布
3. 还是发布了新正式版
4. 还是已经写回成功

## 6. 数据模型建议

在现有 Ontology 流程表之外，新增 3 组核心模型即可，不需要另起一套系统。

### 6.1 结构快照表

建议增加：

- `ontology_structure_snapshots`

核心字段：

- `snapshotId`
- `targetKind`
- `targetId`
- `sourceType` (`expert_team` / `expert` / `skill`)
- `sourcePath`
- `sourceHash`
- `versionNo`
- `contentJson`
- `createdAt`

用途：

- 保存每次从 expert-source 扫描到的结构快照

### 6.2 节点绑定版本表

建议增加：

- `ontology_node_source_bindings`

核心字段：

- `flowId`
- `nodeKey`
- `sourceType`
- `sourceId`
- `sourcePath`
- `boundSnapshotId`
- `bindingRole` (`team` / `expert` / `skill`)

用途：

- 让每个节点都能追到它当前绑定的是哪一个真实结构版本

### 6.3 节点差异事件表

建议增加：

- `ontology_node_change_events`

核心字段：

- `flowId`
- `nodeKey`
- `fromSnapshotId`
- `toSnapshotId`
- `changeType`
- `changeSummary`
- `impactJson`
- `createdAt`

用途：

- 把“文件差异”翻译成“节点变化事件”

## 7. API 改造建议

## 7.1 结构变化

- `GET /api/ai-control/ontology/flows/:flowId/structure-changes`
  - 返回当前画布所有节点对应的最新结构变化

- `POST /api/ai-control/ontology/flows/:flowId/structure-scan`
  - 触发一次 expert-source 结构扫描

## 7.2 节点版本

- `GET /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey/versions`
  - 返回该节点绑定对象的历史版本

- `GET /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey/diff?from=...&to=...`
  - 返回该节点对应的版本差异

## 7.3 回退

- `POST /api/ai-control/ontology/flows/:flowId/rollback-draft`
  - 按指定历史版本生成回退草稿

## 7.4 发布同步

- `GET /api/ai-control/ontology/flows/:flowId/publish-preview-v2`
  - 返回节点级发布变化预览

- `POST /api/ai-control/ontology/flows/:flowId/publish-and-sync`
  - 发布并同步回 WorkBuddy

## 8. 前端实施顺序建议

按最小闭环拆 4 步：

### 第一步：只做“一画布 + Skill 节点”

目标：

1. 保持当前单画布
2. Skill 作为一等节点
3. 节点支持更清晰的条件路由

### 第二步：做“结构变化”工作区

目标：

1. 先看见变化
2. 先把变化挂到节点
3. 不急着做回退

### 第三步：做“版本回退”工作区

目标：

1. 从历史版本生成回退草稿
2. 回退后回到当前主画布继续编辑

### 第四步：做“发布同步”闭环

目标：

1. 节点级发布预览
2. 一次发布同步回 WorkBuddy
3. 留下节点级写回证据

## 9. 本轮明确结论

1. **只保留一张主画布。**
2. “结构变化 / 版本回退 / 发布同步”是同一项目页里的工作区，不是新增多个画布。
3. 原“专家团队管理”板块应逐步并入 Ontology。
4. Ontology 下一阶段最先要补的是：
   - Skill 节点一等化
   - 节点级结构变化映射
   - 回退草稿机制
   - 发布同步闭环
