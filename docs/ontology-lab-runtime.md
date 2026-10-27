# Ontology lab 独立运行基线

会话345：用户明确授权提交并推送。目标为既有Lab origin及功能分支；整理633cd305之后积累的Ontology/采集修正、作品拆解、经营驾驶舱、多账号/品牌后台、独立连接与BYOK版本配置，保留其接口/schema/迁移/Skill及开发说明依赖。继承Aliyun workflow移出可执行目录；runtime、凭据、数据库与测试运行产物排除。此操作是源码归档，不部署云端、不合并main；真实客户端/模型/专家未验收范围沿用344。见[提交记录](changes/2026-10-21-lab-milestone-git-publish.md)。

多账号并行：真实登录/邀请码注册、标签页独立会话、账号与品牌入口、标准Lab严格权限及当前品牌读写；共享演示数据不再充当经营事实。已通过双账号/越权/过期测试，新品牌WorkBuddy授权仍需接入。详见[会话338变更](changes/2026-10-21-multi-account-brand-isolation.md)。


日期：2026-09-26。当前阶段：M2基础部署与真实运行验收通过，尚未接入WorkBuddy；不是Ontology业务功能验收。

## 来源与范围

[此段涉及具体客户资料，公开版本已省略。]

## 隔离配置

唯一入口：`docker/docker-compose.ontology-lab.yml`，不叠加旧 compose。

lab 镜像构建入口为 `docker/ontology-lab.Dockerfile` 的 server/web targets。使用自带 OpenSSL/CA 的 `node:22-bookworm`，缓存 npm 锁文件依赖，限制下载超时/重试；不修改原 server/web Dockerfile。跳过安装脚本后显式执行 Prisma generate。当前 Lab server 默认通过 `INSTALL_LOCAL_OCR=1` 安装本地 OCR（RapidOCR ONNX Runtime），用于图片素材文字识别；视频 ASR/Whisper 运行时已对齐原系统最新 Whisper-only 方案，补齐可选构建开关 `INSTALL_LOCAL_ASR`，默认仍为 `0`，避免 `faster-whisper` 和模型预热阻塞主安装。未启用 ASR 时，视频转写标签只能降级标记为待转写。

| 资源 | 值 |
|---|---|
| project | `ai-omni-ontology-lab` |
| API | `127.0.0.1:23011` -> ingress -> server:3011 |
| Web | `127.0.0.1:23001` -> ingress -> web:3001 |
| DB | `ontology-postgres:5432/ontology_lab`，用户 `ontology_lab`，无宿主端口 |
| 数据卷 | `ai-omni-ontology-lab_lab-postgres`，只有 DB 挂载 |
| 存储卷 | `ai-omni-ontology-lab_lab-storage` -> API `/data` |
| 网络 | DB/db-init仅`lab-internal`；server接`lab-internal`+`lab-egress`用于第三方API；ingress另接`lab-ingress` bridge |
| 镜像 | `ai-omni-ontology-lab-server:dev` / `ai-omni-ontology-lab-web:dev` / `ai-omni-ontology-lab-ingress:dev` |
| 上传通道 | Web 与 Server 当前统一 `200mb`，用于 S2-05 用户素材登记；超过该范围应改流式上传或后台导入队列 |
| 本地 OCR | `rapidocr-onnxruntime`，容器脚本 `/app/scripts/local-ocr-recognize.py`，用于图片素材 OCR 标签 |
| 本地 ASR | 默认不安装；需要视频文案标签时设置 `INSTALL_LOCAL_ASR=1` 重建 `db-init/server`。Lab 对齐原系统最新默认：`faster-whisper`、`WHISPER_MODEL_NAME=small`、`WHISPER_DEVICE=cpu`、`WHISPER_COMPUTE_TYPE=int8`，构建时可通过 `LOCAL_ASR_PRELOAD_WHISPER_MODEL=small` 预热模型。首次模型准备需保证模型缓存可用，或临时设置 `HF_HUB_OFFLINE=0` / `TRANSFORMERS_OFFLINE=0` 允许从镜像源拉取 |

使用 project 命名卷而非可误指原目录的通用 bind 路径；运行配置/日志仍可存于 `D:\workbuddy-test-runtime\ai-omni-ontology-lab`。当前不导出数据库端口、不设置固定 container_name、不自动重启。

Docker Desktop实测仅internal网络的ports未形成宿主监听，因此仅由ingress发布回环端口。`scripts/ontology-lab-ingress.cjs`只转发固定web/server目标，非动态HTTP代理；无业务秘密/数据卷、node用户、只读、cap_drop ALL、no-new-privileges、IP转发关闭。为支持 RunningHub/蝉镜真实开放 API 同步，server 容器允许通过 `lab-egress` 访问外部第三方域名；数据库和初始化任务仍不出 internal 网络。API当前仍UID0，全栈非root加固待做。

## 保护代码

- `AppConfigService.assertOntologyLabSafety()`：在 Nest 初始化前检查明确 lab 标识、精确数据库目标、三个独立秘密、标准 API 模式、本地存储及回环公开 URL；拒绝 worker/OSS/继承更新清单。
- `main.ts`：明确 lab 模式不加载工作目录或父目录 env；配置失败退出。
- `SchedulerService`：lab 不注册日常任务，也不执行启动补跑，涵盖达人作品刷新。
- `CollectorsService`：lab 不执行启动缓存/转录恢复；`WorksService` 不启动重任务轮询。
- `SkillsPromptsService` 的本地注册表自举保留；不是外部业务执行。按请求触发的 heartbeat 未删除。
- `PrismaService.canUseDatabase()`：lab 缺配置或连接失败抛 503，不返回 false 进入其调用点的 mock 分支；非 lab 原有返回语义保留。
- `AuthService.resolveRequestAuthContext()`：lab 的明确品牌不在可访问列表时返回403，不能静默回退首个品牌；未指定品牌仍按现有上下文选择，非lab行为不变。
- 此变更**没有**证明整个历史应用所有独立 catch/mock 路径已经删除；需后续端到端断库测试。
- internal 网络用于阻止意外外发；它不替代业务权限和未来的 Action 授权机制，真实网络隔离需部署后验证。

## 初始化

`scripts/init-ontology-lab.cjs` 先验证目标及秘密，再使用已构建 Prisma CLI 执行 `db push --skip-generate`，不允许 `--accept-data-loss` 或 `--force-reset`。

- 不使用 standard/demo seed，也不导入通用邀请码。
- 创建 `ontology_lab_operator`，登录邮箱 `operator@ontology-lab.invalid`，普通用户、品牌所有者、零积分。
- 创建明确人工指定的合成测试品牌 ID `brand-demo-cleaning`，不冒充服务端随机生成 ID 或原品牌映射。
- 不创建无事实依据的产品或服务承诺、不配置 provider key。
- 密码使用与 AuthService 一致的 scrypt 格式；来自源码外随机值。
- 三表写入使用事务；重复执行不重置密码、停用状态、积分、品牌资料或成员权限；身份/所有者冲突拒绝。
- 这是首装路径，不是经验证的长期数据库迁移方案；已有 lab 数据升级前仍需备份。

## 验证与启动顺序

构建前先在独立副本执行锁文件安装、`npm run prisma:generate`、`npm run build:server`、`npm run test:ontology-lab`。测试使用假秘密和内存 stub；compose 测试只解析，不创建容器或写 DB。

实际部署必须另行完成：

1. 保存原容器 ID/StartedAt、健康状态、端口与 lab 资源不存在的证据。
2. 在源码外生成全新秘密，限制文件权限，检查无继承环境变量/连接。
3. 构建两镜像，再仅启动该 project；检查 DB/存储卷与网络归属。
4. 真实校验首次及重复 seed、登录、品牌回读、一次受控选题保存/回读、断库拒绝、外网不可达。
5. 对比原服务 ID/StartedAt/健康不变。通过后才提出 WorkBuddy 专用 connector 接入。

本机辅助脚本：

- `scripts/prepare-ontology-lab.ps1` 只在初次准备运行，拒绝已有目录/凭证。本轮已执行，不可重跑；源码外秘密不打印。
- `node scripts/verify-ontology-lab.mjs baseline` 保存原服务基线，已有文件拒绝覆盖。
- `seed` 模式在真实首次初始化后、登录前验证重复 seed 不变。
- `smoke` 模式验证资源归属、登录、MCP、唯一一次选题写入与 SQL 回读、外网阻断及 Web 代理。
- `outage` 模式须先只停止 lab DB；`recovery` 须恢复 lab DB后执行。失败结果不可当成功；选题 intent 已存在且读回未知时拒绝重放。
- `paused` 模式在整体停止lab时验证宿主入口不可达、原API与原容器不变；随后必须恢复lab并运行recovery。
- 证据与验收用令牌保存在受限 runtime 目录，不进源码或普通日志。实际进度见 [部署验收记录](changes/2026-09-26-ontology-lab-runtime-verification.md)。

回退仅停止 lab 的接单/容器，保留数据卷与日志；不执行 `down -v`、全局 prune 或恢复原库。源码回退参考保留的固定提交 ZIP，人工逐文件核对，不覆盖其他人后续改动。

## MCP 与 Skill 影响

- 本轮不新增/改名 MCP 工具，不改变 `item` 对象写入 schema，不修改专家/Skill 包。
- 实际端点为 `http://127.0.0.1:23011/api/ai-control-center/mcp`，已由开发验收脚本真实调用；WorkBuddy尚未连接。
- `tools/list` 可匿名可见，不能替代真实身份/品牌鉴权验收。
- MCP现有POST可返回201；断库时可能将异常映射为`isError`，消费者必须检查工具结果，不把HTTP成功当业务成功。
- 旧连接器继续连原系统，但本轮不向其发测试写入。新任务需等 lab 真实验收后再接入。

## 明确未完成

- 完整 Git 历史恢复和继承 CI 部署切断；不得推送。
- WorkBuddy专用安装令牌/连接器和原生调用验收；Docker、真实数据库/登录/MCP/断库/整体停启已通过，详见变更记录。
- ASR 模型离线预热与真实视频转写样本仍待验收；当前默认镜像不安装 ASR，禁止把视频文案提取称已可用。图片 OCR 已有 RapidOCR 本地基线，但只代表文字识别可用，不等于完整视觉理解。
- Ontology 对象、Action、权限、幂等、版本治理及无技术提示业务验收。
