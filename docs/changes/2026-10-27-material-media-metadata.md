# 媒体素材元数据读取减负

素材档案对媒体资产的元数据只使用 `productId` 和 `productIds` 关联产品。查询改为仅读取这两个字段，不再向应用进程传输整份媒体元数据；数据库中的原始数据保持不变，媒体链接、预览、搜索及产品关联仍按原规则处理。

只读合成 PostgreSQL 回归覆盖不同品牌、单个及多个产品、去重、空值、标量、数组和大字段。独立环境中四个品牌的 24 组完整响应对照一致，包含列表、分页、视频、原片 ID 及产品筛选。一个 35 条媒体素材样本的元数据 JSON 序列化体积从约 20.7 MB 降至约 1.3 KB；它不是整机内存或网络吞吐的实测结果。

执行 `npm run build:server`、`node scripts/test-material-archive.cjs`；设置独立测试 PostgreSQL 的 `DATABASE_URL` 后执行 `node scripts/test-material-media-query.cjs`，测试只用 SQL 内的合成数据，不写表。素材仍在跨来源筛选前全量读取，后续分页和低配置长期运行仍需验证。
