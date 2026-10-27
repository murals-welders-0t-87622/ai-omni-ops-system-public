# AI 全域运营中台

2026-10-27：电商详情页空闲时减少自动刷新，有任务时保持快速更新；[详情](docs/changes/2026-10-27-commerce-idle-refresh.md)。

2026-10-27：素材检索减少重复正文和无关元数据读取；[详情](docs/changes/2026-10-27-material-business-metadata.md)。

2026-10-27：素材检索减少媒体原始元数据传输，保留数据库原件；[详情](docs/changes/2026-10-27-material-media-metadata.md)。

2026-10-27：素材筛选减少重复查询并避免旧结果覆盖新筛选；[详情](docs/changes/2026-10-27-material-filter-interaction.md)。

2026-10-27：素材库优化业务数据的字段读取，减少大型原始回执的重复解压；[详情与测试范围](docs/changes/2026-10-27-material-query-normalization.md)。

2026-10-27：素材库减少商品关联重复计算和重复查询；[详情与验收边界](docs/changes/2026-10-27-material-product-lookup.md)。

本仓提供品牌增长 AI 中台的公开源码，涵盖品牌、公域获客、电商、私域、销售及 AI 智控功能。它是独立清理后的发行快照，原私有仓的 Git 历史、品牌数据和服务密钥不在本仓。

## 安装和更新

在 Windows 电脑安装 Docker Desktop、Git、Python 和 Codex 后，克隆[公开技能库](https://github.com/murals-welders-0t-87622/ai-omni-ops-skills)，让 Codex 读取 `skills/00-omni-system-setup/SKILL.md`，并说“安装整套系统”。已有系统说“更新整套系统”，由技能核对当前实例、备份和兼容性。

公开源码与原私有开发仓不是同一条 Git 历史；已有私有版迁移到本发行版需先确认数据备份、恢复和数据库兼容性，不能直接覆盖或强制拉取。新机默认是独立空数据库，不会自动迁移其他机器的品牌、素材或授权。

模型供应商密钥、品牌 MCP 和有赞、3Chat、RunningHub 等连接需安装者自行配置和验证，安装文件并不等于真实业务链路可用。公开版默认保护专家源，写回能力需另行配置及授权。

## 开发说明

核心架构和运行配置见 `docs/`、`docker/docker-compose.ontology-lab.yml`、`docker/ontology-lab.Dockerfile` 和 `prisma/`。发行前清理了原历史变更记录，保留私有源以便内部追溯。数据和运行配置应放在仓库外，不提交密钥。

交流与中台合作：微信 `hbwangxiaodong`。
