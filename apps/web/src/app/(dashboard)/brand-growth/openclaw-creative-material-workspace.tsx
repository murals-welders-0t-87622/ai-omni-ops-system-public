"use client";

import MaterialPreview from "../../../components/material-preview.client";
import { mediaPresentation } from "@ai-omni/shared/media-presentation";
import { useEffect, useMemo, useState } from "react";
import { type AIControlCenterCreativeMaterialRecord } from "../../../services/openclaw";
import { AIControlCenterCommentThread } from "./openclaw-comment-thread";

type OptionalDateFormatter = (value?: string) => string;
const PAGE_SIZE = 20;

export interface AIControlCenterCreativeMaterialWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  canDelete: boolean;
  items: AIControlCenterCreativeMaterialRecord[];
  deletingMaterialId?: string;
  onRefresh: () => void | Promise<void>;
  onDelete: (materialId: string) => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

function getMaterialFileLabel(item: AIControlCenterCreativeMaterialRecord) {
  if (item.fileName) {
    return item.fileName;
  }
  if (item.fileUrl) {
    try {
      const url = new URL(item.fileUrl);
      return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || item.fileUrl);
    } catch {
      return item.fileUrl;
    }
  }
  if (item.textContent) {
    return `文本内容 ${item.textContent.length} 字`;
  }
  return "-";
}

function getMaterialTagLabel(item: AIControlCenterCreativeMaterialRecord) {
  return item.materialTags.length ? item.materialTags : [item.materialType || "未分类"];
}

export function AIControlCenterCreativeMaterialWorkspace(props: AIControlCenterCreativeMaterialWorkspaceProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<AIControlCenterCreativeMaterialRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const sortedItems = useMemo(
    () => [...props.items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [props.items],
  );
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const currentRangeStart = sortedItems.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const currentRangeEnd = sortedItems.length ? Math.min(currentPage * PAGE_SIZE, sortedItems.length) : 0;
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedItems.slice(start, start + PAGE_SIZE);
  }, [currentPage, sortedItems]);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);



  return (
    <>
      <article className="workspace-panel strategy-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>创作素材列表</strong>
            <p className="panel-subtext">AI 智控中心 调用站内第三方平台能力后，可把文本、图片、视频、语音和 BGM 等结果统一保存到这里。</p>
          </div>
          <div className="strategy-inline-actions">
            <span className="archive-pill status-ready">仅 AI 智控中心 可创建</span>
            <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isLoading}>
              刷新列表
            </button>
            <span className={`archive-pill ${sortedItems.length ? "status-ready" : "status-pending"}`}>
              共 {sortedItems.length} 条
            </span>
          </div>
        </div>

        {!sortedItems.length ? (
          <div className="note-empty-state">
            当前还没有创作素材。请由 AI 智控中心 生成并保存素材后再来此查看。
          </div>
        ) : (
          <>
            <div className="note-pagination-bar" style={{ marginBottom: 12 }}>
              <div className="note-pagination-summary">
                当前显示 {currentRangeStart}-{currentRangeEnd} 条，第 {currentPage}/{totalPages} 页，每页 {PAGE_SIZE} 条
              </div>
              <div className="note-pagination-actions">
                <button type="button" className="note-page-button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 5)
                  .map((pageNumber) => (
                    <button
                      key={`creative-material-page-${pageNumber}`}
                      type="button"
                      className={`note-page-button ${pageNumber === currentPage ? "is-active" : ""}`}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}
                <button type="button" className="note-page-button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                  下一页
                </button>
              </div>
            </div>

            <div className="table-scroll-shell openclaw-record-table-shell">
              <table className="soft-table openclaw-record-table">
                <thead>
                  <tr>
                    <th>标题</th>
                    <th>素材标签</th>
                    <th>素材来源</th>
                    <th>入库时间</th>
                    <th>存储位置</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item) => (
                    <tr key={item.id}>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.title}>{item.title || "-"}</span>
                      </td>
                      <td className="openclaw-record-table__text-cell">
                        <div className="material-tag-list">
                          {getMaterialTagLabel(item).map((tag) => (
                            <span key={`${item.id}-${tag}`} className="material-tag-chip" title={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.sourceLabel}>{item.sourceLabel}</span>
                      </td>
                      <td>{props.formatDateTime(item.createdAt)}</td>
                      <td className="openclaw-record-table__text-cell">
                        <span className="openclaw-record-table__text" title={item.localFilePath || "-"}>{item.localFilePath || "-"}</span>
                      </td>
                      <td className="openclaw-record-table__action-cell">
                        <div className="openclaw-record-table__actions">
                          <button type="button" className="secondary-button" onClick={() => setSelectedMaterial(item)}>
                            查看
                          </button>
                          <button
                            type="button"
                            className="note-inline-button"
                            onClick={() => void props.onDelete(item.id)}
                            disabled={!props.canDelete || props.deletingMaterialId === item.id}
                          >
                            {props.deletingMaterialId === item.id ? "删除中..." : "删除"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>

      {selectedMaterial ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setSelectedMaterial(null)}>
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedMaterial.title || "创作素材"}</strong>
                <p>{selectedMaterial.sourceLabel} · {mediaPresentation(selectedMaterial).label}</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedMaterial(null)}>
                关闭
              </button>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>入库时间：{props.formatDateTime(selectedMaterial.createdAt)}</span>
              <span>更新时间：{props.formatDateTime(selectedMaterial.updatedAt)}</span>
            </div>
            <div className="openclaw-diary-dialog__meta">
              <span>素材标签：{getMaterialTagLabel(selectedMaterial).join(" / ")}</span>
              <span>存储位置：{selectedMaterial.localFilePath || "当前记录未绑定本地副本"}</span>
            </div>
            {selectedMaterial.description ? (
              <div className="openclaw-diary-dialog__content">{selectedMaterial.description}</div>
            ) : null}
            <div className="openclaw-diary-dialog__content">
              <MaterialPreview item={selectedMaterial} />
            </div>
            <AIControlCenterCommentThread
              brandId={selectedMaterial.brandId}
              workspaceScope={selectedMaterial.workspaceScope}
              resourceType="creative_material"
              resourceId={selectedMaterial.id}
              formatDateTime={props.formatDateTime}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
