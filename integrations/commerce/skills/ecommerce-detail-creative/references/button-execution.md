# 页面按钮到Codex制作

页面分成主图与商品文案、详情页、商品视频三个制作面。沿用同一商品事实、项目及版本，各面只修改自己的内容；主图服务点击和选购，详情页服务理解与成交，视频服务场景解释，均承接运营计划里的具体假设。

选择本品牌产品后可建立项目并发起制作任务。使用中台`commerce_request_detail_task`，任务类型为main_copy/detail_copy/video_concept/main_images/detail_images/video_generate。没有在线且支持该类型的本机执行器时如实显示不可用；复制委托是备用方式，不应冒充按钮已运行。请求包含projectId、最新expectedRevision、用户要求；图像收费范围及当前视频创意/参数分别核实。

本机执行器用当前已登录Codex的非交互执行生成结构化草稿，凭据不进入提示词；中台受控MCP写新版本和状态。任务顺序执行，显示等待、制作、成功、失败/中断；同一项目已有任务时不重复提交。租约失效停止写回，超时先查原版本/供应商任务，不自动重做收费生成。

主图草稿包含图位、copy/prompt/evidence及listing标题、关键词、介绍、FAQ、产品身份锁。详情页按当前页数保存每屏文案、提示词和证据。视频创意先保存概念与分镜提示词；应用、480P、竖屏9:16、10秒及创意需当前版本用户确认，未配置适配器不能声称一键视频可用。

产品原图通过只读commerce_get_detail_reference按同品牌projectId/expectedRevision取受控存储并实际解码，不把MCP令牌硬塞进浏览器图片下载接口，也不放开文件鉴权。图片使用实时可用的本品牌多元探索gpt-image-2，以受控产品原图为参考；逐张写实际产物，成功项保留。生成状态、文件可预览、产品一致性/文案审核、商家上架和经营效果分别核验。生成失败或缺少配置显示具体原因，不能显示“已生成”占位。跨账号/品牌、旧版本、错误媒体类型一律拒绝引用。

官方机制参见[Codex非交互执行](https://developers.openai.com/codex/noninteractive)。这是本机执行服务，网页不会自动获得操作任意桌面会话或任意命令的权限。新电脑部署需安装Codex并登录，启动配套Lab源码`integrations/commerce/executor/worker.cjs`；Docker里的中台与宿主执行器分开。技能安装不等于执行服务已启动。


## 用户直接编辑与按意见修订

用户可编辑卖点、标题/关键词/介绍/FAQ、主图/详情文案和提示词、视频创意及提示词，然后保存新版本。改了文案或创意而仍关联旧媒体时，服务端mediaStale标注画面待更新；不能把旧图说成当前稿已完成，不能因文本编辑静默收费生成。

`commerce_request_detail_task`修订模式：generationMode=revise，instructions为用户意见，revisionScope=pages/listing/selling_points/video。页面修订用targetIndexes（0起始、唯一且在当前项目内）；listing仅main_copy，selling_points用main_copy/detail_copy，video用video_concept。读最新expectedRevision，不对历史稿强行覆盖当前。

图片修改沿main_images/detail_images，所选位置必须已有本品牌图片。只改选中的图，原图经commerce_get_detail_reference加referenceSection=main/detail、referenceIndex读取并实际解码；Codex先按意见调整该页方案，再用旧图作编辑参考真实调用图片服务，逐张保存新引用，其他页面不重跑。明确本次图片数量及服务额度，不因一次失败重提已完成的图。

视频意见先交video_concept修改，保留旧视频供对比。审核新创意、参数并确认当前版本后再video_generate重新制作；这条路线不是逐帧无损剪辑。需要保留原镜头精剪时选已有剪辑/视频工艺并核当前适配器，不能冒称视频模型有编辑接口。

反馈本身不能成为产品事实。只接受对应范围的输出，保留未选页和原始事实依据。任务完成需新的项目版本、相应文案或新的受控媒体引用；图片模型SUCCESS、实际解码/画面审核、视频播放与上架/增长独立验收。
