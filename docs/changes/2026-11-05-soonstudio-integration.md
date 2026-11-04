# SoonStudio 模型能力接入与鸭屎香退役

来源：[SoonStudio 官方文档](https://soonstudio.ai/docs)，2026-11-05读取官方当前可见国际模型目录、接口格式及Runware原生metadata。`common/soonstudio-models.json`仅保存模型、路由和字段事实，未包含教程全文、创意示例、密钥或品牌资料。

## 用户可见变化

第三方平台增加“SoonStudio 平台”，统一品牌密钥入口、官网与文档链接，目录包含1,596个唯一模型ID，覆盖文本、图片、视频、音频等能力。1,578个未标记弃用；55项有明确不可执行原因（12项Marble无API、23项Runware非live/不可运行、1项metadata未提供、19项缺少确证原生接口），不会套用通用Chat请求。模型出现在公开目录不等于当前账户有调用权限，也不代表逐模型实测通过。

鸭屎香/xjjuhe.site不再预置或出现在新任务、平台和密钥配置入口，禁止按旧ID/地址重新启用。旧数据库记录、品牌密钥和任务不删除；只有核对归属品牌的真实历史视频Task可恢复查询，强制GET原任务路径，不重新生成。

## 调用方式

HTTP（登录并拥有当前品牌作品权限）：

- GET `/api/third-party-platforms/soonstudio/models`：分页模型目录，支持query/type/offset/limit。
- GET `/api/third-party-platforms/soonstudio/models/:model`：具体模型的官方参数、路由、profiles与限制，模型ID需URL编码。
- POST `/api/third-party-platforms/soonstudio/jobs`：`{requestId,model,profile,endpoint?,body,files?}`；按所选模型契约填写，禁止任意URL、headers或凭据。
- GET `/api/third-party-platforms/soonstudio/jobs/:id`：只读已保存回执。
- POST `/api/third-party-platforms/soonstudio/jobs/:id/refresh`：查询原回执，不创建新任务。

品牌MCP增加 `list_soonstudio_models`、`get_soonstudio_model`、`submit_soonstudio_job`、`get_soonstudio_job`、`refresh_soonstudio_job`。完整品牌运营连接开放生成，窄范围平台读取连接仅增加对应只读工具，保持原授权边界。实际执行仍逐次核品牌权限与本品牌密钥。

先读取model契约再调用，profile采用该模型返回的官方操作ID。服务固定请求`https://api.soonstudio.ai`，不用客户端提供地址；原生FAL、Runware、MiniMax H3、Seedance、Kling、Vidu、Wan、Higgsfield等按自己的协议处理。模型不同不自动切换或降级。

## 任务与结果

稳定requestId按品牌预约真实Task，先持久化后最多提交一次；并发重复输入回原任务，改变输入却复用ID会冲突。Runware预先保存UUID。超时/进程更换/响应未知不会自动重新付费。只保存已核准的原平台查询描述符；Higgsfield的官方feed查询是固定POST例外，其他恢复为GET，不接受任意回调URL。

平台成功、文本完整、素材交付分别标记。截断输出不能假报完整；URL回执尚不等于素材入库。内嵌二进制/超限结果不会写入Task JSON，标记INCOMPLETE及resultNeedsArchive，需后续归档；这一通用接口未把所有原生模型无差别接入既有画布按钮。

## 验证与部署范围

干净公开源码构建、44项目录/服务/品牌权限/退役恢复测试及25项协议模拟测试通过。模拟使用合成密钥与fetch，未使用真实SoonStudio付费账户，因此不能称1,596模型真实生成验收。

23001更新另使用现有改造源码构建，保留画布已部署功能。仅替换server镜像，不运行schema迁移/db-init、不删除数据库素材、不部署13001、SaaS或安装包；保留旧镜像回退。此提交不含待完成画布改造。
