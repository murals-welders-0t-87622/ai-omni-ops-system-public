# 素材发现与复用索引契约 material-index/1.0.0

## 读取

GET /api/ai-control/assets/archive，或MCP search_ai_control_center_asset_archive。当前身份品牌为唯一范围；即使属于多个品牌，query/body不能和当前工作区不同。类型视频/图片/音频/文字；参数materialSource/keyword/productId/sku/libraryState/availability/recommendation/role/scene/action/framing/surface/usage/limit/offset。先联查五类档案及三平台采集原作，过滤后分页；total是完整匹配数，returned是本页数。现阶段按品牌全量内存过滤，适合当前Lab资料规模；SaaS大规模需数据库索引/分页推下，不声称已经压测。

collected_work保持BusinessAsset原记录及collection.originalWorkId/workUrl/images/body/videoUrl/metrics。不会为查找自动入库、缓存、转录或触发深度拆解。重复采集来源记录分别留证，不用成片说明替代原作记录。libraryState collected/in_library与availability unverified/usable/unavailable独立；入库只复制引用，不保证文件可剪。

mediaVerification声明MIME优先，其次kind、后缀；标题/描述不判类型，后缀不证明解码。probe结果优先于人工声明；冲突显式显示。tagCandidates来源/置信/候选状态独立；stored legacyTags保留原值且来源未知，噪声不作为业务选材标签；人工confirmedTags可保留数字SKU。

返回indexRevision/index：productIds、sku、confirmedTags、role、availability/recommendation/note、clips、relations、rights、versionGroup/versionNumber/supersedes、declaredType/typeEvidence。无记录显式返回默认未知，revision=0；来源metadata明确productId关联也可读回，不按关键词推定同SKU。relations返回出入关系及标题；versionState列替代/被替代版本；单条入库后副本origin回指采集证据，继承明确产品关联。

## 写入

POST /api/ai-control/assets/material-index，或原MCP manage_brand_library动作update_material_index/import_collected_material/probe_material_file。继续使用原品牌运营连接，无新授权表单/期限/令牌轮换；窄14/24连接无此写能力，完整连接仍204工具。所有动作服务端校验当前品牌和板块edit权限。

payload.ref={table,recordId}直接取evidence；更新需expectedRevision和index完整可编辑快照，不接收客户端probe/importedId伪证据。服务端按品牌事务锁+版本CAS追加MaterialArchiveRevision不可变修订。并发冲突409，关联产品/素材跨品牌400/404，当前工作区与显式品牌冲突403。版本替代不能成环；明确被替代旧版默认not_recommended，不删档案。不自动从标题V号判所有作品属于同一条版本链。

clips最多100：id/startMs/endMs/scene/action/framing/surface/note/rights。只用于视频/音频，起止为毫秒且end>start；有解码时长则不能越界，无解码时长只算人工位置索引。relations最多100：table/recordId/type=derived_from|used_in|script|finished/clipId/evidence；clipId须属于当前素材；真实使用要有证据，未登记使用不等于未用过。productCoverage只列已登记场景/片段与使用记录，不把空白当成全部场景已覆盖。内容效果未获得真实回传时不推定。

rights在素材/片段分别保存watermark/subtitles/sound/sameSku/commercial，每项{status:unknown|confirmed|blocked,evidence}；确认/不通过必须填证据与适用范围。无水印不能推出可商用。availability是剪辑选择，commercial是独立授权范围，不互相替代。

import_collected_material仅一条，按品牌+来源生成稳定副本ID，复制引用和索引登记在同一事务内；重试复用，来源保留，不批量写库、不下载不生成。probe_material_file只处理归属校验后的本品牌站内缓存，128MB上限；图片实际解码像素，音视频ffprobe加前2秒ffmpeg解码，包含摘要/时间/范围。未知格式、失效外链、损坏、过大文件保持未核验；限制file/pipe协议，禁止拿探测接口外抓。不是整片质量/字幕/商用验收。

## 迁移与回退

20261022120000_material_archive_index，仅新增MaterialArchiveRevision；不修改旧表/批量迁移标签，Prisma两份schema均登记以免后续同步误删。只在独立Lab应用、标记applied。回退应用可用before-material-index-357镜像，保留新修订表和原文件，不能用整库回滚覆盖并行真实业务。SaaS V2仍为方案，未改OSS或云版本。
