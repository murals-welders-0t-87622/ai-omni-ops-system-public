# 生成内容存储规范

374详情页/视频产物先进入本品牌受控存储，再以MediaAsset/AIControlCenterCreativeMaterial记录引用；页面鉴权读取/api/works Blob并实际解码。供应商临时URL不作为最终归档，不为保存再触发生成。见[电商工作区](commerce-workspaces.md)。


## 1. 目标

- 统一原创笔记、二创笔记、视频笔记生成内容的存储方式
- 避免图片、视频仅依赖第三方临时链接，导致历史作品失效
- 让作品记录、预览、发布、删除、追踪都基于同一套稳定数据结构

## 2. 适用范围

- 小红书原创笔记
- 小红书二创笔记
- 小红书视频笔记
- 品牌增长报告、可视化报告、半年营销规划、小红书营销策划方案等 HTML 产物
- 品牌资料库中的产品图片、资料附件等上传素材
- 用户头像等用户上传图片素材
- 后续所有生成型图文/视频作品与需要长期访问的业务上传文件

## 3. 当前统一原则

- 生成结果必须同时具备“数据库记录”和“本站可控资源副本”
- 文案主记录统一落 `MediaAsset(HTML)`
- 图片结果统一落 `MediaAsset(IMAGE)`
- 视频结果统一落 `MediaAsset(VIDEO)`
- 任务过程统一落 `Task`

## 4. 当前存储模型

### 4.1 Task

- 用于记录生成过程
- 必须包含：
- `taskType`
- `taskStatus`
- `taskTitle`
- `modelName`
- `inputJson`
- `outputJson`
- `errorMessage`

### 4.2 MediaAsset

- 用于记录最终作品和资源
- 必须包含：
- `mediaType`
- `taskId`
- `title`
- `sourceUrl`
- `storageKey`
- `metadataJson`

### 4.3 受控资源副本

- 当前以下资源统一持久化到受控副本，具体真源按运行模式决定：
  - 网站版 / 源码标准运行态：默认 OSS
  - Docker 本地标准运行态：可通过 `STORAGE_PROVIDER_MODE=local` 强制切到宿主机挂载目录
  - `local-single-user` 安装态：默认本地受控存储
- `works` 生成资源：`works/<brandId>/<fileName>`
- 个人中心网站上传素材：`works/<brandId>/material-library/<category>/<YYYY>/<YYYY-MM>/<timestamp>-<title>.<ext>`
- AI 智控中心 用户上传素材：同样写入 `works/<brandId>/material-library/<category>/<YYYY>/<YYYY-MM>/<timestamp>-<title>.<ext>`，并登记到 `AIControlCenterCreativeMaterial`
- AI 智控中心 用户文件夹：必须通过点击按钮触发浏览器目录选择弹窗，不允许要求用户手填路径；文件夹只作为导入入口，归档最小单位必须是目录内每个可复用图片/视频文件，登记后逐条写入 `AIControlCenterCreativeMaterial`
- 用户文件夹导入时，图片/视频文件仍写入 `works/<brandId>/material-library/<category>/<YYYY>/<YYYY-MM>/<timestamp>-<title>.<ext>` 受控副本；历史文件夹批次记录不得作为可打开素材卡片展示
- 素材标签写入 `materialTags`：基础标签来自来源、类型和文件名；视频/音频可尝试本地 ASR（Paraformer 优先、Whisper fallback）提取文本关键词；图片素材可尝试本地 OCR（RapidOCR ONNX Runtime）提取图片文字关键词。OCR 或 ASR 未就绪时不得阻塞登记，只能写入 `待识图`、`待转写`、`本地OCR未就绪` 或 `本地ASR未就绪` 等降级标签
- 素材复用检索至少支持素材类型、素材来源、关键词。素材类型固定为 `视频`、`图片`、`文字`；素材来源固定为 `抖音/视频号`、`小红书`、`公众号`、`用户上传`。登记方式和存储层字段不得展示为用户筛选来源；例如 `user_folder`、`material_library_upload`、`用户文件夹` 都应归并到 `用户上传`
- 素材复用由 WorkBuddy Agent 通过 MCP 工具 `search_ai_control_center_asset_archive` 自主检索和提取，不在前端提供人工“复用候选篮”。正式复用证据必须通过 `record_ai_control_center_material_reuse_evidence` 或 `POST /api/ai-control/assets/reuse-evidence` 绑定 `taskId + stageRunId + actionName + materialRefs` 后再落库
- 素材复用证据只写任务治理执行事件，不创建素材、不发起第三方生成、不发布内容、不写 WorkBuddy 真源；素材引用必须能回查到统一素材档案的证据表和记录 ID
- `reports` HTML 产物：`reports/<brandId>/<fileName>`
- 原创参考模板素材：`reference-templates/xiaohongshu/original/<categoryId>/<fileName>`
- 品牌产品图片：`brands/<brandId>/product-images/<fileName>`
- 品牌资料附件：`brands/<brandId>/asset-files/<fileName>`
- 用户头像：`users/<userId>/avatars/<fileName>`
- 对外访问统一仍优先走站内接口：
- `/api/works/brands/:brandId/assets/:fileName`
- `/api/reports/brands/:brandId/assets/:fileName`
- `/api/works/xiaohongshu/original/reference-templates/:templateId/asset`
- `/api/brands/:id/product-images/:fileName`
- `/api/brands/:id/asset-files/:fileName`
- `/api/auth/users/:userId/avatar/:fileName`
- 站内接口统一按 `storageKey` 从当前运行模式对应的受控真源读取，不再把 `.runtime/generated-works/` 或其他散落目录当作正式真源
- 仅在本地开发且未配置 OSS 时，允许暂时回退到 `.runtime/local-oss/<storageKey>` 作为联调副本；但站内接口、`storageKey` 前缀与业务记录结构必须保持和正式链路一致
- `local-single-user` 安装态下，作品、报告、媒体等受控副本现在正式写入 `LOCAL_APP_DATA_ROOT/storage/oss/<storageKey>`，不再因为机器上存在 OSS 凭据而继续写 OSS
- `local-single-user` 安装态下，个人中心设置的本地存储目录同时承接两类本地受控副本：
  - 命中 `works/<brandId>/material-library/<category>/...` 的存储键时，映射到用户设置目录下的 `素材库/<分类>/<brandId>/...`
  - 其它 `works/*`、`reports/*`、`brands/*`、`users/*` 等受控副本，统一映射到用户设置目录下的 `站内存储/<storageKey>`
- Docker 本地标准运行态下，如果要继续让用户在宿主机直接管理素材，必须同时配置：
  - `MATERIAL_LIBRARY_BASE_ROOT` / `MANAGED_STORAGE_ROOT`：容器内真实挂载路径
  - `MATERIAL_LIBRARY_DISPLAY_ROOT` / `MANAGED_STORAGE_DISPLAY_ROOT`：页面和 AI 智控中心 返回给用户看的宿主机路径
- 若已配置 OSS 但当前运行环境不在阿里云内网，`OSS_INTERNAL` 应保持关闭或不配置；只有明确需要走阿里云内网 endpoint 时才开启 `OSS_INTERNAL=true`
- 品牌增长策略中的抖音采集视频预览也必须遵守同一规则：缓存副本优先写受控 `storageKey`，标准运行态可回 OSS 读取，`local-single-user` 与缺 OSS 的本地运行态要通过站内受控媒体接口读取本地副本，不能继续直接依赖第三方短链

## 5. 三类作品存储要求

### 5.1 原创笔记

- 主文案存 `HTML` 作品记录
- 封面图存 `IMAGE` 资源记录
- 配图存 `IMAGE` 资源记录
- `metadataJson` 记录标题、正文、提示词、模型、图片关系、时间戳

### 5.2 二创笔记

- 主文案存 `HTML` 作品记录
- 封面图存 `IMAGE` 资源记录
- 配图存 `IMAGE` 资源记录
- `metadataJson` 记录来源素材、标题、正文、提示词、模型、图片关系、时间戳

### 5.3 视频笔记

- 主文案存 `HTML` 作品记录
- 成片视频存 `VIDEO` 资源记录
- 视频封面优先存本站副本 URL
- `metadataJson` 记录标题、正文、视频提示词、分镜提示词、模型、provider、时间戳

## 6. 强制规则

### 6.1 文案

- HTML 主记录必须写入受控持久化副本
- 不允许只在内存或任务返回值中保留正文

### 6.2 图片

- 生成图片必须先下载或直接写入受控持久化副本，再写入 `MediaAsset`
- 不允许把第三方临时图片 URL 作为唯一正式存储地址

### 6.3 视频

- 生成视频必须先下载并写入受控持久化副本，再写入 `MediaAsset`
- 第三方返回的 `videoUrl` 只能作为中间输入，不能作为最终唯一存储地址

### 6.4 元数据

- `metadataJson` 只保存结构化业务字段
- 不在 `metadataJson` 中保存大体积二进制
- 不把第三方临时链接当作唯一主键关系

## 7. 删除与更新规则

- 删除作品或附件时，同时删除对应运行模式下的受控副本
- 更新作品文案或报告 HTML 时，同时更新受控副本与 `metadataJson`
- 更新头像、产品图、资料附件等上传资源时，新对象必须直接写入当前运行模式的受控真源，不回退第三方外链
- 更新资源引用时，优先覆盖受控副本关系，不直接改回第三方外链
- 原创参考模板素材不进入前端静态目录；新增或替换模板时，统一通过导入脚本批量写入 `reference-templates/xiaohongshu/original/...`，再更新模板清单

## 8. 发布前校验规则

- 发布前只使用本站可访问的图片和视频地址
- 发现资源失效时，必须在站内直接报错
- 不把失效资源继续交给扩展或手机接力页

## 9. 后续扩展要求

- 后续新增“营销海报”“短视频封面”“长视频剪辑稿”等内容时，沿用同一模型
- 统一遵循：
- `Task` 记录过程
- `MediaAsset` 或 `BusinessAsset` 记录结果索引
- 业务对象统一使用明确前缀的 `storageKey`
- `metadataJson` 保存结构化业务信息

## 10. 当前执行结论

- 文案已基本进入规范化存储
- `works`、`reports`、品牌上传资源、AI 智控中心 素材副本都已统一收口到受控 `storageKey`
- 网站版 / 源码标准运行态继续以 OSS 为正式真源
- `local-single-user` 安装态已改为本地真源，正式写入 `LOCAL_APP_DATA_ROOT/storage/oss`
- 本地开发若缺失 OSS 配置，`OssStorageService` 仍可回退到 `.runtime/local-oss`，避免报告生成在“保存 HTML 附件”阶段直接 500
- 品牌产品图与品牌资料附件已进入同一受控存储边界，站内读取接口统一代理当前真源
- 用户头像已支持真实上传到受控副本，并通过站内头像接口读取
- 原创参考模板库也已纳入相同存储边界：标准运行态优先写 OSS，开发态缺失 OSS 时回退 `.runtime/local-oss`，本地安装态写 `LOCAL_APP_DATA_ROOT/storage/oss`，前端始终只认站内模板资产接口
- 原创/二创图片已进入受控副本链路
- 视频成片与视频封面已开始补齐受控副本链路
- 下一阶段继续收口历史外链资源、演示种子占位链接和更多作品类型


## 2026-10-22 素材发现与复用索引（357）

联查采集原作与素材档案，类型含音频、MIME优先且解码另验；产品/片段/版本/权益按品牌追加不可变索引修订。先筛选后分页，不自动全量入库；深度作品拆解留在内容获客。原MCP查询扩展与manage_brand_library维护共用服务，未知授权不推断。详见[素材索引契约](material-archive-index.md)。
