# 品牌资料经MCP归档（375）

现有`manage_brand_library`增加`upload_asset_file`与`upload_product_image`，复用品牌网站存储服务。`payload={fileName,contentType,dataBase64}`，返回当前品牌的文件URL，再由`create_knowledge_base_files`追加资料，产品可引用图片URL。不通过数据库脚本导入，不用`replace_business_assets`覆盖已存在资料。

上传仅当前认证品牌，分别要求`brandGrowth.library.businessAssets/edit`、`brandGrowth.library.products/edit`。文件名不能含路径；类型/扩展名、Base64、32MiB上限、图片/PDF/ZIP头校验，图片位置只收图片；秘密和客户身份信息不随业务档案导入。完整品牌运营工具允许这两动作，旧窄授权不改变；无新增工具名称、无平台权限放宽。

品牌知识库Markdown/文本直接读取受控存储并本地提取，sourceLabel=`file-parser-local`；不依赖第三方文档解析密钥。其他格式解析路径不变。缺失文件仍标元数据回退，不能把占位分片算真实正文。embedding是否可用另行核验，不因分片成功声称语义检索配置完成。

增长报告`create_brand_growth_report`透传已有schema中的`htmlContent`；读取优先保留真实HTML，仍兼容仅Markdown或HTML放入正文的旧方式，避免读取时又被默认模板替换。不增加报告生成模型调用。变更记录和历史不覆盖；格式修正可新增报告记录。

本轮真实业务验证：指定新注册品牌，14个产品规格/25问卷/8图；66资料四库共626段，逐文件/逐段比对整理正文的完整覆盖、无metadata-fallback；报告Markdown/HTML读回hash一致。真实天猫稳定sellerId映射、两周期三快照版本（P1派生小数校正保留V1）、11项proposed计划读回一致。用户原始材料的临床/授权/当前经营状态未全部独立核验，不把归档等同证书审定或经营执行。

验证命令：`npm run build:server`、`node scripts/test-brand-upload.cjs`（14项）、`node scripts/test-knowledge-local-text.cjs`（7断言）、`node scripts/test-growth-report-html-forward.cjs`（透传与三种读取兼容）、`node scripts/test-brand-operations.cjs`（8项）、`node scripts/test-commerce.cjs`（15项）。真实业务回执含私有成本，不加入源码仓库。

只更新独立Lab server，无迁移；回退镜像`ai-omni-ontology-lab-server:before-brand-import-375`。回退代码不删除/覆盖本轮真实品牌资料。源码备份和完整安全回执在工作空间本轮artifacts，未提交推送。
