# lab 权限与秘密规则

适用范围：独立 Ontology lab。本文补齐继承 AGENTS 中缺失的入口，不授权读取或复用原系统秘密。

- 新密码、认证签名密钥和 MCP 安装令牌加密密钥分别随机生成，禁止默认开发秘密。lab 配置要求三个不同的 32 字节十六进制值。
- `LAB_DATABASE_PASSWORD`、`LAB_AUTH_TOKEN_SECRET`、`LAB_INSTALL_TOKEN_SECRET`、`LAB_OPERATOR_PASSWORD` 从源码目录以外的受限运行配置注入；不进入 Git、镜像、截图或普通日志。
- `AUTH_TOKEN_SECRET` 才是现有认证代码实际使用的键；`JWT_SECRET` 不能替代它。
- 数据库密码供 PostgreSQL、初始化和 API 使用；用户登录密码仅供初始化，API/web 不注入该变量。
- `.dockerignore` 排除任意层级的 `.env`、`.env.*`、PEM/KEY 与 credentials JSON；这不是全面秘密扫描。
- 不运行会打印真实插值秘密的 `docker compose config`；配置测试只用测试值。运行核验只输出是否存在或布尔比较结果。
- 不获取生产 SSH、GitHub Secrets 值、对象存储密钥或发布账号。运行网络保持 internal；未来外网能力必须单独授权、列域名及回退清单。
- 不提交/推送或触发继承云部署；当前 workflow 尚待切断。原系统资源一律不在权限范围。
- 详细启动门禁、验证范围和待办见 [lab 运行说明](ontology-lab-runtime.md)。
