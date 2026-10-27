# Ontology 编排中心 2.0 系统实现方案

## 1. 背景与目标

本方案按最新业务定义重新收口：

1. `Ontology 编排中心` 是业务主脑，负责表达“这件事该谁干、谁能干、怎么干、边界是什么”。
2. 原“专家团队管理”不再长期作为独立主板块存在，而是并入 Ontology。
3. Ontology 不只管理流程草稿，还要持续承接 WorkBuddy 专家团 / 专家 / Skill 的真实结构变化、版本差异、回退发布与写回同步。

最终目标：

- 让用户在 **一张主画布** 上同时看见业务流程、专家路由、Skill 路由、结构变化、版本回退和发布同步。
- 把 WorkBuddy 持续演化的专家文档体系从“黑盒子”收口成“可见、可比、可退、可发”的透明系统。

## 2. 产品边界

## 2.1 不新增第二张画布

本方案明确：

1. Ontology 单项目页只保留 **一张主画布**。
2. `结构变化 / 版本回退 / 发布同步` 不是新画布，而是围绕主画布的同页工作区。

## 2.2 未来页面结构

单项目页结构固定为：

1. 中间主区域：`主画布`
2. 右侧上半：`节点配置 / 节点版本 / 节点差异`
3. 右侧下半或底部切换区：
   - `结构变化`
   - `版本回退`
   - `发布同步`

## 3. 业务对象与版本对象

## 3.1 核心业务对象

1. `Flow`
   - Ontology 项目本身

2. `Node`
   - 画布节点

3. `Edge`
   - 节点间连线

4. `Source`
   - WorkBuddy 真源对象
   - 包括 `expert_team / expert / skill`

## 3.2 版本对象拆分

后续版本治理不允许继续混成一个“版本号”，必须拆成 4 层：

1. `结构快照版本`
   - 记录 WorkBuddy 真源某一时刻的结构快照

2. `画布草稿版本`
   - 用户编辑后的 Ontology 草稿

3. `画布发布版本`
   - 发布后的 `published_contract`

4. `写回同步版本`
   - 本次发布实际同步回 WorkBuddy 的结果记录

## 4. 页面模块设计

## 4.1 主画布

职责：

1. 承载业务流程、专家流、Skill 流
2. 展示节点之间的条件路由
3. 成为所有变化、回退、发布动作的主舞台

节点类型建议收口为：

1. `expert_team`
2. `route_decision`
3. `expert`
4. `skill`
5. `mcp_tool`
6. `data_object`
7. `confirmation_gate`
8. `evidence`

## 4.2 节点配置区

职责：

1. 编辑当前节点五元素契约
2. 查看当前节点绑定的真实对象
3. 查看当前节点绑定的结构版本
4. 查看节点变化摘要

## 4.3 结构变化工作区

职责：

1. 扫描 `expert-source`
2. 把文件变化翻译成节点变化
3. 展示变化影响的路由范围

展示原则：

1. 按节点看变化，不按原始文件路径堆日志
2. 每条变化要有：
   - 节点
   - 来源对象
   - 版本区间
   - 变化摘要
   - 影响范围

## 4.4 版本回退工作区

职责：

1. 从历史结构版本或历史发布版本生成回退草稿
2. 不允许直接硬回滚正式版
3. 回退后必须回到主画布继续编辑或发布

## 4.5 发布同步工作区

职责：

1. 节点级发布预览
2. 正式发布新的 `published_contract`
3. 同步写回 WorkBuddy 专家团 / 专家 / Skill 文档
4. 返回写回影响的节点和文件

## 5. 数据模型设计

## 5.1 新增表一：结构快照

建议新增：

- `ontology_structure_snapshots`

字段建议：

- `id`
- `target_kind`
- `target_id`
- `source_type`
- `source_id`
- `source_path`
- `source_hash`
- `version_no`
- `content_json`
- `summary_json`
- `created_at`

用途：

- 保存每次扫描到的 WorkBuddy 真源结构

## 5.2 新增表二：节点绑定版本

建议新增：

- `ontology_node_source_bindings`

字段建议：

- `id`
- `flow_id`
- `node_key`
- `binding_role`
- `source_type`
- `source_id`
- `source_path`
- `bound_snapshot_id`
- `created_at`
- `updated_at`

用途：

- 让节点和真实结构版本建立稳定映射

## 5.3 新增表三：节点差异事件

建议新增：

- `ontology_node_change_events`

字段建议：

- `id`
- `flow_id`
- `node_key`
- `source_type`
- `source_id`
- `from_snapshot_id`
- `to_snapshot_id`
- `change_type`
- `change_summary`
- `impact_json`
- `created_at`

用途：

- 把文件层 Diff 变成可在工作台展示的节点级变化事件

## 6. API 设计

## 6.1 结构变化

- `POST /api/ai-control/ontology/flows/:flowId/structure-scan`
  - 扫描当前项目相关 expert-source 真源

- `GET /api/ai-control/ontology/flows/:flowId/structure-changes`
  - 返回当前项目所有节点的变化摘要

- `GET /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey/structure-changes`
  - 返回单节点变化详情

## 6.2 节点版本

- `GET /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey/versions`
  - 返回当前节点绑定对象的历史版本

- `GET /api/ai-control/ontology/flows/:flowId/nodes/:nodeKey/diff?from=...&to=...`
  - 返回该节点对应版本间差异

## 6.3 回退

- `POST /api/ai-control/ontology/flows/:flowId/rollback-draft`
  - 从指定历史版本生成回退草稿

## 6.4 发布同步

- `GET /api/ai-control/ontology/flows/:flowId/publish-preview-v2`
  - 返回节点级发布预览

- `POST /api/ai-control/ontology/flows/:flowId/publish-and-sync`
  - 发布并写回 WorkBuddy

## 7. 前端实施阶段

## 阶段 1：单画布合并版块

目标：

1. 保持只有一张主画布
2. 在同页加入 `结构变化 / 版本回退 / 发布同步` 工作区
3. 把现有发布预览归并到 `发布同步`

交付口径：

1. 页面结构先到位
2. 结构变化 / 版本回退 可以先做已接线骨架
3. 不要求第一步就把所有后台能力一次做完

## 阶段 2：Skill 节点一等化

目标：

1. 把 `Skill` 从 `专家 / Skill` 混合模板中拆出来
2. Skill 成为正式节点类型
3. 支持专家 -> Skill 的条件路由

## 阶段 3：结构变化真化

目标：

1. 扫描 `expert-source`
2. 生成结构快照
3. 把变化挂到画布节点

## 阶段 4：版本回退闭环

目标：

1. 历史版本预览
2. 生成回退草稿
3. 回退草稿回到主画布

## 阶段 5：发布同步闭环

目标：

1. 节点级发布预览
2. 发布新的正式版
3. 自动同步回 WorkBuddy 真源
4. 留下写回证据

## 8. 当前推进顺序

按最小可落地闭环，当前顺序固定为：

1. 先补系统文档
2. 先改单画布页面结构
3. 先拆 Skill 节点
4. 再接结构变化接口
5. 再接版本回退
6. 最后接发布同步闭环

## 9. 当前阶段验收标准

### 第一阶段验收

1. 页面仍然只有一张主画布
2. 同页已出现：
   - `画布编排`
   - `结构变化`
   - `版本回退`
   - `发布同步`
3. 原发布预览已纳入 `发布同步`
4. 节点模板里已能区分 `专家节点` 与 `Skill 节点`

### 后续阶段验收

后续每阶段都必须满足：

1. 有真实代码
2. 有真实文档
3. 有真实运行态同步
4. 不把未来设想当成已完成
