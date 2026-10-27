"use client";
import { authenticatedFetch } from "../../../services/http";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { AlertTriangle, GitBranch, GitCompare, Layers3, Loader2, Network, Plus, RefreshCw, Save, Settings, ShieldCheck, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import OntologyElementLibrary, { type ElementItem } from "./OntologyElementLibrary.client";

type FlowNode = {
  id: string;
  nodeKey: string;
  nodeType: string;
  title: string;
  subtitle?: string;
  description?: string;
  positionX?: number;
  positionY?: number;
  sortOrder?: number;
  objectJson?: unknown;
  linkJson?: unknown;
  functionJson?: unknown;
  actionJson?: unknown;
  interfaceJson?: unknown;
  referencesJson?: unknown;
};

type FlowEdge = {
  id: string;
  edgeKey: string;
  fromNodeKey: string;
  toNodeKey: string;
  label?: string;
  conditionJson?: unknown;
  sortOrder?: number;
};

type FlowDetail = {
  id: string;
  flowKey: string;
  name: string;
  description?: string;
  status: string;
  targetKind?: string;
  targetId?: string;
  targetName?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  routingRulesJson?: unknown;
  confirmationGatesJson?: unknown;
  evidenceRulesJson?: unknown;
};

type PublishRiskCheck = {
  level: "PASS" | "WARN" | "BLOCKER";
  code: string;
  message: string;
};

type PublishPreview = {
  candidateId: string;
  candidateHash: string;
  candidateStatus: string;
  canPublishAfterConfirmation: boolean;
  summary: {
    nodeCount: number;
    edgeCount: number;
    boundReferenceCount: number;
    routingRuleCount: number;
    confirmationGateCount: number;
    evidenceRuleCount: number;
    blockerCount: number;
    warningCount: number;
  };
  riskChecks: PublishRiskCheck[];
  rollbackAnchor?: {
    versionNo: number;
    status: string;
    createdAt: string;
    publishedAt?: string | null;
  } | null;
  latestSnapshot?: {
    versionNo: number;
    status: string;
    createdAt: string;
  } | null;
  diffBasis: string;
};

type ExpertSourceDiffPreview = {
  previewId: string;
  candidateHash: string;
  targetSummary: {
    targetCount: number;
    previewedCount: number;
    changedCount: number;
    blockerCount: number;
  };
  targets: Array<{
    target: {
      label: string;
      relPath: string;
      kind: string;
    };
    changed: boolean;
    relPosix: string;
    diffSha256: string;
    diffLength: number;
    candidate?: {
      sha256: string;
      bytes: number;
    };
  }>;
  blockers: Array<{
    code: string;
    message: string;
  }>;
  policy?: {
    sourceMode?: string;
    writeEnabled?: boolean;
    writableMount?: boolean;
    blockedReason?: string | null;
  };
};

type ExpertSourceWritebackRequest = {
  action: string;
  saveEnabled: boolean;
  blockedGates: string[];
  saveBlockedReason?: string | null;
  writeExecuted?: boolean;
  result?: string | null;
  preview?: {
    rel_posix?: string;
    changed?: boolean;
    diff_sha256?: string;
    diff_length?: number;
    candidate?: {
      sha256?: string;
      bytes?: number;
    };
  } | null;
  gates?: Array<{
    key: string;
    label: string;
    ok: boolean;
    detail: string;
  }>;
  rollbackPlan?: {
    available?: boolean;
    snapshot_id?: string | null;
  } | null;
};

type PublishAndSyncResult = {
  publish?: {
    versionNo?: number;
    candidateHash?: string;
    publishedAt?: string | null;
  } | null;
  sync: {
    requested: boolean;
    status: string;
    latestSyncSnapshotVersionNo?: number | null;
    targetCount: number;
    syncedCount: number;
    writtenCount: number;
    alreadyInSyncCount: number;
    blockedCount: number;
    verificationFailedCount: number;
    targets: Array<{
      kind: string;
      label: string;
      relPath: string;
      status: string;
      writeExecuted: boolean;
      blockedGates?: string[];
      saveBlockedReason?: string | null;
      nodeTitles?: string[];
    }>;
  };
};

type CanvasSyncResult = {
  ok: boolean;
  syncSummary?: {
    addedNodeKeys?: string[];
    removedNodeKeys?: string[];
    addedEdgeKeys?: string[];
    removedEdgeKeys?: string[];
  } | null;
};

type DictionaryItem = {
  id: string;
  label: string;
  name: string;
  elementType: "Object" | "Link" | "Function" | "Action" | "Interface";
  description?: string;
  status?: string;
  primaryConsumers?: string[];
};

type DictionaryGroup = {
  key: string;
  title: string;
  total: number;
  items: DictionaryItem[];
};

type StructureSourceStatus = "synced" | "changed" | "untracked" | "missing";
type StructureNodeStatus = StructureSourceStatus | "unbound";

type StructureHistoryVersion = {
  id: string;
  createdAt: string;
  note: string;
  sourceSha256?: string | null;
  summary: string;
  details: string[];
};

type LocalHistoryRestorePreview = {
  ok: boolean;
  changed: boolean;
  diff: string;
  diff_sha256?: string;
  diff_length?: number;
  restore_blocked_reason?: string | null;
  snapshot?: {
    id?: string | null;
    rel_posix?: string | null;
  } | null;
  current?: {
    rel_posix?: string | null;
    sha256?: string | null;
    bytes?: number | null;
  } | null;
  restore_candidate?: {
    sha256?: string | null;
    bytes?: number | null;
  } | null;
};

type LocalHistoryRestoreExecuteResult = {
  ok: boolean;
  action: string;
  result: string;
  restore_enabled?: boolean;
  restore_executed?: boolean;
  restore_blocked_reason?: string | null;
  gates?: Array<{
    key: string;
    label: string;
    ok: boolean;
    detail: string;
  }>;
  preview?: {
    diff_sha256?: string | null;
    diff_length?: number | null;
  } | null;
  pre_restore_snapshot?: {
    id?: string | null;
  } | null;
  post_restore_snapshot?: {
    id?: string | null;
  } | null;
  policy?: {
    write_enabled?: boolean;
    writable_mount?: boolean;
  } | null;
};

type StructureChangeSource = {
  bindingId: string;
  label: string;
  kind: string;
  relPath: string;
  refType: string;
  status: StructureSourceStatus;
  note: string;
  currentSha256?: string | null;
  bytes?: number | null;
  historyCount: number;
  changedSinceLatestSnapshot: boolean;
  currentChangeSummary?: string;
  currentChangeDetails?: string[];
  historyVersions?: StructureHistoryVersion[];
  latestSnapshot?: {
    id?: string | null;
    createdAt?: string | null;
    sourceSha256?: string | null;
  } | null;
};

type StructureChangeNode = {
  nodeKey: string;
  title: string;
  nodeType: string;
  bindingCount: number;
  sourceCount: number;
  historyCount: number;
  status: StructureNodeStatus;
  summary: string;
  sources: StructureChangeSource[];
};

type StructureChangesReport = {
  flowId: string;
  flowKey: string;
  targetKind?: string;
  targetId?: string;
  targetName?: string;
  scannedAt: string;
  summary: {
    nodeCount: number;
    boundNodeCount: number;
    sourceCount: number;
    changedNodeCount: number;
    missingNodeCount: number;
    untrackedNodeCount: number;
    unboundNodeCount: number;
    syncedNodeCount: number;
  };
  nodes: StructureChangeNode[];
};

type RollbackVersionItem = {
  id: string;
  versionNo: number;
  status: string;
  label: string;
  createdAt: string;
  publishedAt?: string | null;
  createdBy: string;
  nodeCount: number;
  edgeCount: number;
  note?: string;
  ruleSource: string;
  candidateHash?: string;
  rollbackReady: boolean;
};

type RollbackVersionsReport = {
  flowId: string;
  flowKey: string;
  targetKind?: string;
  targetId?: string;
  targetName?: string;
  versions: RollbackVersionItem[];
};

type NodeVersionItem = {
  id: string;
  versionNo: number;
  status: string;
  label: string;
  createdAt: string;
  publishedAt?: string | null;
  createdBy: string;
  nodeKey: string;
  nodeType: string;
  title: string;
  subtitle?: string;
  description?: string;
  objectCount: number;
  linkCount: number;
  functionCount: number;
  actionCount: number;
  interfaceCount: number;
  boundReferenceCount: number;
  connectedEdgeCount: number;
  note?: string;
  candidateHash?: string;
};

type NodeVersionsReport = {
  flowId: string;
  flowKey: string;
  targetKind?: string;
  targetId?: string;
  targetName?: string;
  nodeKey: string;
  nodeTitle: string;
  nodeType: string;
  versions: NodeVersionItem[];
};

type WorkbenchState = {
  loading: boolean;
  dictionaryLoading: boolean;
  saving: boolean;
  publishing: boolean;
  previewLoading: boolean;
  structureChangesLoading: boolean;
  nodeVersionsLoading: boolean;
  rollbackVersionsLoading: boolean;
  rollbackApplying: boolean;
  expertSourcePreviewLoading: boolean;
  expertSourceWritebackLoading: boolean;
  message: string;
  flow: FlowDetail | null;
  publishPreview: PublishPreview | null;
  structureChanges: StructureChangesReport | null;
  nodeVersions: NodeVersionsReport | null;
  rollbackVersions: RollbackVersionsReport | null;
  expertSourcePreview: ExpertSourceDiffPreview | null;
  expertSourceWriteback: ExpertSourceWritebackRequest | null;
  publishSyncResult: PublishAndSyncResult | null;
  dictionaryGroups: DictionaryGroup[];
  selectedNodeKey: string;
  selectedEdgeKey: string;
  draftReferences: ElementItem[];
  draftNode: NodeDraft | null;
  draftEdge: EdgeDraft | null;
  ruleDraft: RuleDraft;
};

type NodeDraft = {
  nodeKey: string;
  nodeType: string;
  title: string;
  subtitle: string;
  description: string;
  sortOrder: string;
  objectText: string;
  linkText: string;
  functionText: string;
  actionText: string;
  interfaceText: string;
};

type EdgeDraft = {
  edgeKey: string;
  fromNodeKey: string;
  toNodeKey: string;
  label: string;
  branch: string;
  conditionText: string;
  failureActionText: string;
  sortOrder: string;
};

type CanvasNode = FlowNode & {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  fiveElementSummary: string;
};

type RuleDraft = {
  routingText: string;
  confirmationText: string;
  evidenceText: string;
};

type DragState = {
  nodeKey: string;
  startPointerX: number;
  startPointerY: number;
  startX: number;
  startY: number;
  moved: boolean;
} | null;

type CanvasPanState = {
  startClientX: number;
  startClientY: number;
  startScrollLeft: number;
  startScrollTop: number;
} | null;

type NodeTemplate = {
  type: string;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  objectText: string;
  linkText: string;
  functionText: string;
  actionText: string;
  interfaceText: string;
};

type WorkbenchTab = "structure_changes" | "rollback" | "publish_sync" | "history";

const NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: "stage",
    label: "业务阶段",
    title: "新业务阶段",
    subtitle: "流程环节",
    description: "定义当前业务流程中的一个关键环节。",
    objectText: "业务对象\n当前任务",
    linkText: "承接上一环节并输出下一环节所需上下文",
    functionText: "阶段判断\n上下文整理",
    actionText: "route_next_business_stage",
    interfaceText: "brandId\ntaskId\nstageRunId",
  },
  {
    type: "expert",
    label: "专家",
    title: "调用专家能力",
    subtitle: "专家节点",
    description: "在当前环节调用具体专家，负责执行某一段专业任务。",
    objectText: "专家能力\n业务任务",
    linkText: "专家能力服务当前业务阶段",
    functionText: "专家调度\n场景命中",
    actionText: "dispatch_expert",
    interfaceText: "expertId\ntaskId\nstageRunId",
  },
  {
    type: "skill",
    label: "Skill",
    title: "调用 Skill",
    subtitle: "技能节点",
    description: "把 Skill 作为一等节点单独表达，用于体现不同专家下的具体技能路由。",
    objectText: "Skill 能力\n业务任务",
    linkText: "Skill 承接当前专家或路由判断结果",
    functionText: "Skill 匹配\n参数拼装",
    actionText: "dispatch_skill",
    interfaceText: "skillId\nexpertId\ntaskId",
  },
  {
    type: "mcp_tool",
    label: "MCP 工具",
    title: "调用 MCP 工具",
    subtitle: "工具调用",
    description: "通过 MCP 工具读取、检索或写入受控业务证据。",
    objectText: "工具请求\n业务上下文",
    linkText: "工具调用服务当前环节",
    functionText: "MCP 参数组装\n工具结果校验",
    actionText: "call_mcp_tool",
    interfaceText: "toolName\narguments\ninstallToken",
  },
  {
    type: "data_object",
    label: "数据对象",
    title: "读取数据对象",
    subtitle: "资料读取",
    description: "读取品牌事实、任务、素材或执行证据等中台对象。",
    objectText: "中台数据对象\n查询条件",
    linkText: "数据对象为当前环节提供事实依据",
    functionText: "数据检索\n证据聚合",
    actionText: "read_ai_control_data_object",
    interfaceText: "objectKey\nfilters\nworkspaceScope",
  },
  {
    type: "confirmation_gate",
    label: "确认闸",
    title: "人工确认",
    subtitle: "确认节点",
    description: "在发布、生成、写回或高风险动作前要求人工确认。",
    objectText: "确认事项\n风险动作",
    linkText: "确认通过后才允许进入下一环节",
    functionText: "风险校验\n人工确认",
    actionText: "require_manual_confirmation",
    interfaceText: "gateKey\nrequiredBy\nreason",
  },
  {
    type: "evidence",
    label: "证据写回",
    title: "写入任务证据",
    subtitle: "留痕归档",
    description: "把当前环节的结果写入任务治理账本或素材复用证据。",
    objectText: "执行结果\n证据引用",
    linkText: "执行结果归档到任务治理账本",
    functionText: "证据整理\n账本写入",
    actionText: "record_execution_evidence",
    interfaceText: "taskId\nstageRunId\nevidenceRefs",
  },
];

export default function OntologyWorkbench({
  flowKey,
  onFlowLoaded,
}: {
  flowKey?: string;
  onFlowLoaded?: (flow: FlowDetail) => void;
}) {
const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkbenchTab>("structure_changes");
  const [canvasSyncing, setCanvasSyncing] = useState(false);
  const [sourceSnapshotLoadingPath, setSourceSnapshotLoadingPath] = useState("");
  const [sourceRestorePreview, setSourceRestorePreview] = useState<LocalHistoryRestorePreview | null>(null);
  const [sourceRestorePreviewId, setSourceRestorePreviewId] = useState("");
  const [sourceRestorePreviewLoadingId, setSourceRestorePreviewLoadingId] = useState("");
  const [sourceRestoreExecuteLoadingId, setSourceRestoreExecuteLoadingId] = useState("");
  const [sourceRestoreResult, setSourceRestoreResult] = useState<LocalHistoryRestoreExecuteResult | null>(null);
  const [bindingOpen, setBindingOpen] = useState(false);
  const [edgeRuleOpen, setEdgeRuleOpen] = useState(false);
  const [nodeCreatorOpen, setNodeCreatorOpen] = useState(false);
  const [nodeCreatorSourceKey, setNodeCreatorSourceKey] = useState("");
  const [edgeConnectSourceKey, setEdgeConnectSourceKey] = useState("");
  const [zoom, setZoom] = useState(1);
  const [dragState, setDragState] = useState<DragState>(null);
  const [canvasPanState, setCanvasPanState] = useState<CanvasPanState>(null);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [suppressCardClick, setSuppressCardClick] = useState(false);
  const [nodePositionOverrides, setNodePositionOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<WorkbenchState>({
    loading: true,
    dictionaryLoading: true,
    saving: false,
    publishing: false,
    previewLoading: false,
    structureChangesLoading: false,
    nodeVersionsLoading: false,
    rollbackVersionsLoading: false,
    rollbackApplying: false,
    expertSourcePreviewLoading: false,
    expertSourceWritebackLoading: false,
    message: "读取流程...",
    flow: null,
    publishPreview: null,
    structureChanges: null,
    nodeVersions: null,
    rollbackVersions: null,
    expertSourcePreview: null,
    expertSourceWriteback: null,
    publishSyncResult: null,
    dictionaryGroups: [],
    selectedNodeKey: "",
    selectedEdgeKey: "",
    draftReferences: [],
    draftNode: null,
    draftEdge: null,
    ruleDraft: emptyRuleDraft(),
  });

  const selectedNode = useMemo(
    () => state.flow?.nodes.find((node) => node.nodeKey === state.selectedNodeKey) || state.flow?.nodes[0] || null,
    [state.flow, state.selectedNodeKey],
  );
  const selectedEdge = useMemo(
    () => state.flow?.edges.find((edge) => edge.edgeKey === state.selectedEdgeKey) || state.flow?.edges[0] || null,
    [state.flow, state.selectedEdgeKey],
  );
  const dictionaryGroupMap = useMemo(
    () => new Map(state.dictionaryGroups.map((group) => [group.title, group])),
    [state.dictionaryGroups],
  );
  const selectedIds = useMemo(() => state.draftReferences.map((item) => item.id), [state.draftReferences]);
  const isPublished = state.flow?.status === "published";
  const canvasNodes = useMemo(() => buildCanvasNodes(state.flow?.nodes || [], nodePositionOverrides), [state.flow?.nodes, nodePositionOverrides]);
  const canvasNodeMap = useMemo(() => new Map(canvasNodes.map((node) => [node.nodeKey, node])), [canvasNodes]);
  const edgeConnectSourceNode = useMemo(
    () => state.flow?.nodes.find((node) => node.nodeKey === edgeConnectSourceKey) || null,
    [state.flow?.nodes, edgeConnectSourceKey],
  );
  const selectedNodeBindings = useMemo(() => getBoundElements(selectedNode), [selectedNode]);
  const selectedNodeStructure = useMemo(
    () => state.structureChanges?.nodes.find((node) => node.nodeKey === selectedNode?.nodeKey) || null,
    [state.structureChanges, selectedNode?.nodeKey],
  );
  const publishedHistoryVersions = useMemo(
    () => state.rollbackVersions?.versions.filter((version) => version.status === "published_contract") || [],
    [state.rollbackVersions],
  );
  const canvasWidth = Math.max(1280, ...canvasNodes.map((node) => node.x + node.width + 220), 1280);
  const canvasHeight = Math.max(680, ...canvasNodes.map((node) => node.y + node.height + 180), 680);

  async function loadLatestFlow(preferredNodeKey?: string, preferredEdgeKey?: string) {
    setState((current) => ({ ...current, loading: true, message: "读取流程..." }));
    try {
      let targetFlowKey = flowKey;
      if (!targetFlowKey) {
        const flowsResponse = await authenticatedFetch("/api/ai-control/ontology/flows?limit=1", { cache: "no-store" });
        const flowsData = await flowsResponse.json();
        if (!flowsResponse.ok || !flowsData?.ok) {
          throw new Error(flowsData?.message || flowsData?.error || `读取失败 ${flowsResponse.status}`);
        }
        targetFlowKey = flowsData.items?.[0]?.flowKey;
      }
      if (!targetFlowKey) {
        setState((current) => ({
          ...current,
          loading: false,
          message: "请先选择或创建编排项目",
          flow: null,
          publishPreview: null,
          structureChanges: null,
          nodeVersions: null,
          rollbackVersions: null,
          expertSourcePreview: null,
          expertSourceWriteback: null,
          publishSyncResult: null,
          selectedNodeKey: "",
          selectedEdgeKey: "",
          draftReferences: [],
          draftNode: null,
          draftEdge: null,
          ruleDraft: emptyRuleDraft(),
        }));
        return;
      }

      const detailResponse = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(targetFlowKey)}`, { cache: "no-store" });
      const detailData = await detailResponse.json();
      if (!detailResponse.ok || !detailData?.ok) {
        throw new Error(detailData?.message || detailData?.error || `读取失败 ${detailResponse.status}`);
      }
      const flow = detailData.item as FlowDetail;
      onFlowLoaded?.(flow);
      setNodePositionOverrides(
        Object.fromEntries(
          flow.nodes.map((node, index) => [
            node.nodeKey,
            {
              x: typeof node.positionX === "number" && node.positionX > 0 ? node.positionX : 80 + index * 260,
              y: typeof node.positionY === "number" && node.positionY > 0 ? node.positionY : 170 + (index % 2) * 180,
            },
          ]),
        ),
      );
      const publishPreview = await fetchPublishPreview(flow.flowKey);
      const targetNodeKey = preferredNodeKey || state.selectedNodeKey;
      const nodeKey = targetNodeKey && flow.nodes.some((node) => node.nodeKey === targetNodeKey)
        ? targetNodeKey
        : flow.nodes[0]?.nodeKey || "";
      const node = flow.nodes.find((item) => item.nodeKey === nodeKey) || flow.nodes[0] || null;
      const targetEdgeKey = preferredEdgeKey || state.selectedEdgeKey;
      const edge = flow.edges.find((item) => item.edgeKey === targetEdgeKey) || flow.edges[0] || null;
      setState((current) => ({
        ...current,
        loading: false,
        message: "已读取流程",
        flow,
        publishPreview,
        structureChanges: null,
        nodeVersions: null,
        rollbackVersions: null,
        expertSourcePreview: null,
        expertSourceWriteback: null,
        publishSyncResult: null,
        selectedNodeKey: nodeKey,
        selectedEdgeKey: edge?.edgeKey || "",
        draftReferences: getBoundElements(node),
        draftNode: node ? nodeToDraft(node) : null,
        draftEdge: edge ? edgeToDraft(edge) : null,
        ruleDraft: flowToRuleDraft(flow),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function loadDictionary() {
    setState((current) => ({ ...current, dictionaryLoading: true }));
    try {
      const response = await authenticatedFetch("/api/ai-control/ontology/elements/dictionary", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `读取字典失败 ${response.status}`);
      }
      setState((current) => ({
        ...current,
        dictionaryLoading: false,
        dictionaryGroups: data.groups || [],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        dictionaryLoading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function fetchPublishPreview(flowKey: string) {
    const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(flowKey)}/publish-preview`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || data?.error || `发布预览读取失败 ${response.status}`);
    }
    return data.item as PublishPreview;
  }

  async function fetchStructureChanges(flowKey: string, useScanEndpoint = false) {
    const response = await authenticatedFetch(
      `/api/ai-control/ontology/flows/${encodeURIComponent(flowKey)}/${useScanEndpoint ? "structure-scan" : "structure-changes"}`,
      {
        method: useScanEndpoint ? "POST" : "GET",
        headers: useScanEndpoint ? { "Content-Type": "application/json" } : undefined,
        cache: "no-store",
      },
    );
    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || data?.error || `结构变化读取失败 ${response.status}`);
    }
    return data.item as StructureChangesReport;
  }

  async function fetchRollbackVersions(flowKey: string) {
    const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(flowKey)}/versions`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || data?.error || `历史版本读取失败 ${response.status}`);
    }
    return data.item as RollbackVersionsReport;
  }

  async function fetchNodeVersions(flowKey: string, nodeKey: string) {
    const response = await authenticatedFetch(
      `/api/ai-control/ontology/flows/${encodeURIComponent(flowKey)}/nodes/${encodeURIComponent(nodeKey)}/versions`,
      { cache: "no-store" },
    );
    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || data?.error || `节点版本读取失败 ${response.status}`);
    }
    return data.item as NodeVersionsReport;
  }

  async function fetchLocalHistoryRestorePreview(snapshotId: string) {
    const response = await authenticatedFetch(`/api/ai-control/local-history/restore-preview?snapshotId=${encodeURIComponent(snapshotId)}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || data?.error || `快照恢复预览失败 ${response.status}`);
    }
    return data as LocalHistoryRestorePreview;
  }

  async function createLocalHistorySnapshot(path: string, note: string) {
    const response = await authenticatedFetch("/api/ai-control/local-history/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ path, note }),
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || data?.error || `创建真源版本快照失败 ${response.status}`);
    }
    return data;
  }

  async function executeLocalHistoryRestore(snapshotId: string, preview: LocalHistoryRestorePreview) {
    const response = await authenticatedFetch("/api/ai-control/local-history/restore-execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        snapshotId,
        confirmDiffSha256: preview.diff_sha256,
        confirmChanged: preview.changed === true,
        createPreRestoreSnapshot: true,
        explicitUserAuthorized: true,
        requestedBy: "ai-control-ui",
        note: "从 Ontology 结构变化恢复专家/Skill 真源快照",
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `执行快照回退失败 ${response.status}`);
    }
    return data as LocalHistoryRestoreExecuteResult;
  }

  async function syncCanvasFromExpertTeam(flowKey: string) {
    const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(flowKey)}/canvas-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        updatedBy: "ai-control-ui",
        note: "从画布检测专家团新增/删除的专家与技能并更新节点",
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || data?.error || `画布同步失败 ${response.status}`);
    }
    return data as CanvasSyncResult;
  }

  async function refreshStructureChanges(useScanEndpoint = true) {
    if (!state.flow) return;
    setState((current) => ({ ...current, structureChangesLoading: true, message: useScanEndpoint ? "扫描结构变化..." : "读取结构变化..." }));
    try {
      const structureChanges = await fetchStructureChanges(state.flow.flowKey, useScanEndpoint);
      setState((current) => ({
        ...current,
        structureChangesLoading: false,
        structureChanges,
        message: useScanEndpoint ? "结构变化已刷新" : "结构变化已读取",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        structureChangesLoading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function previewSourceHistoryRestore(snapshotId: string) {
    setSourceRestorePreviewLoadingId(snapshotId);
    setSourceRestoreResult(null);
    try {
      const preview = await fetchLocalHistoryRestorePreview(snapshotId);
      setSourceRestorePreview(preview);
      setSourceRestorePreviewId(snapshotId);
      setState((current) => ({ ...current, message: "已读取专家/Skill 真源回退预览" }));
    } catch (error) {
      setSourceRestorePreview(null);
      setSourceRestorePreviewId("");
      setState((current) => ({ ...current, message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setSourceRestorePreviewLoadingId("");
    }
  }

  async function applySourceHistoryRestore(snapshotId: string) {
    if (!sourceRestorePreview || sourceRestorePreviewId !== snapshotId) {
      setState((current) => ({ ...current, message: "请先读取要回退的快照 Diff 预览" }));
      return;
    }
    const approved = window.confirm("这会把当前挂载的专家/Skill 真源文件恢复到所选快照版本，并先创建一个恢复前快照。确认继续吗？");
    if (!approved) return;
    setSourceRestoreExecuteLoadingId(snapshotId);
    try {
      const result = await executeLocalHistoryRestore(snapshotId, sourceRestorePreview);
      setSourceRestoreResult(result);
      if (result.restore_executed) {
        await refreshStructureChanges(true);
        setState((current) => ({ ...current, message: "专家/Skill 真源已恢复到所选快照版本" }));
      } else {
        setState((current) => ({ ...current, message: result.restore_blocked_reason || "专家/Skill 真源恢复未执行" }));
      }
    } catch (error) {
      setState((current) => ({ ...current, message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setSourceRestoreExecuteLoadingId("");
    }
  }

  async function createSourceVersionSnapshot(relPath: string, sourceLabel: string) {
    setSourceSnapshotLoadingPath(relPath);
    try {
      await createLocalHistorySnapshot(relPath, `从 Ontology 结构变化记录“${sourceLabel}”当前真源版本`);
      await refreshStructureChanges(true);
      setState((current) => ({ ...current, message: `已把“${sourceLabel}”当前真源记录为新版本` }));
    } catch (error) {
      setState((current) => ({ ...current, message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setSourceSnapshotLoadingPath("");
    }
  }

  async function syncCurrentCanvasFromExpertTeam() {
    if (!state.flow) return;
    const approved = window.confirm("这会按当前专家团注册表检测新增/删除的专家与 Skill，并更新当前画布。注册表托管节点会同步，手工补充的非托管节点会保留。确认继续吗？");
    if (!approved) return;
    setCanvasSyncing(true);
    try {
      const result = await syncCanvasFromExpertTeam(state.flow.flowKey);
      await loadLatestFlow(state.selectedNodeKey, state.selectedEdgeKey);
      await refreshStructureChanges(true);
      const addedCount = result.syncSummary?.addedNodeKeys?.length || 0;
      const removedCount = result.syncSummary?.removedNodeKeys?.length || 0;
      setState((current) => ({
        ...current,
        message: `已按专家团注册表更新画布：新增 ${addedCount} 个节点，移除 ${removedCount} 个节点。`,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        message: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setCanvasSyncing(false);
    }
  }

  async function refreshRollbackVersions() {
    if (!state.flow) return;
    setState((current) => ({ ...current, rollbackVersionsLoading: true, message: "读取历史版本..." }));
    try {
      const rollbackVersions = await fetchRollbackVersions(state.flow.flowKey);
      setState((current) => ({
        ...current,
        rollbackVersionsLoading: false,
        rollbackVersions,
        message: "历史版本已读取",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        rollbackVersionsLoading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function refreshNodeVersions(nodeKeyOverride?: string) {
    if (!state.flow) return;
    const targetNodeKey = nodeKeyOverride || selectedNode?.nodeKey;
    if (!targetNodeKey) return;
    setState((current) => ({ ...current, nodeVersionsLoading: true, message: "读取节点版本..." }));
    try {
      const nodeVersions = await fetchNodeVersions(state.flow.flowKey, targetNodeKey);
      setState((current) => ({
        ...current,
        nodeVersionsLoading: false,
        nodeVersions,
        message: "节点版本已读取",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        nodeVersionsLoading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function createRollbackDraft(version: RollbackVersionItem) {
    if (!state.flow) return;
    setState((current) => ({
      ...current,
      rollbackApplying: true,
      message: `正在基于 v${version.versionNo} 生成回退草稿...`,
    }));
    try {
      const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/rollback-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: version.id,
          rollbackBy: "ai-control-ui",
          note: `回退到 v${version.versionNo} · ${version.label}`,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `生成回退草稿失败 ${response.status}`);
      }
      await loadLatestFlow(state.flow.flowKey);
      setState((current) => ({
        ...current,
        rollbackApplying: false,
        message: `已基于 v${version.versionNo} 生成新的回退草稿`,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        rollbackApplying: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function createNodeRollbackDraft(version: NodeVersionItem) {
    if (!state.flow || !selectedNode) return;
    setState((current) => ({
      ...current,
      rollbackApplying: true,
      message: `正在把节点“${selectedNode.title}”回退到 v${version.versionNo}...`,
    }));
    try {
      const response = await authenticatedFetch(
        `/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/nodes/${encodeURIComponent(selectedNode.nodeKey)}/rollback-draft`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versionId: version.id,
            rollbackBy: "ai-control-ui",
            note: `节点回退到 v${version.versionNo} · ${version.label}`,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `节点回退失败 ${response.status}`);
      }
      await loadLatestFlow(selectedNode.nodeKey);
      setState((current) => ({
        ...current,
        rollbackApplying: false,
        message: `已把节点“${version.title || selectedNode.title}”回退到 v${version.versionNo}`,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        rollbackApplying: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function refreshPublishPreview() {
    if (!state.flow) return;
    setState((current) => ({ ...current, previewLoading: true, message: "刷新发布预览..." }));
    try {
      const publishPreview = await fetchPublishPreview(state.flow.flowKey);
      setState((current) => ({
        ...current,
        previewLoading: false,
        publishPreview,
        message: "发布预览已刷新",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        previewLoading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function publishCurrentFlow() {
    if (!state.flow || !state.publishPreview) return;
    const confirmed = window.confirm(`确认发布并同步当前 Ontology 契约？\nHash: ${state.publishPreview.candidateHash.slice(0, 16)}`);
    if (!confirmed) return;
    setState((current) => ({ ...current, publishing: true, publishSyncResult: null, message: "发布契约并同步专家源..." }));
    try {
      const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/publish-and-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateHash: state.publishPreview.candidateHash,
          confirmPublish: true,
          publishedBy: "ai-control-ui",
          requestedBy: "ai-control-ui",
          syncExpertSource: true,
          createPreWriteSnapshot: true,
          explicitUserAuthorized: true,
          note: "发布并同步 Ontology 正式契约",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `发布失败 ${response.status}`);
      }
      await loadLatestFlow(state.selectedNodeKey, state.selectedEdgeKey);
      setState((current) => ({
        ...current,
        publishing: false,
        publishSyncResult: data.item as PublishAndSyncResult,
        message: getPublishSyncHeadline(data.item as PublishAndSyncResult),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        publishing: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function fetchExpertSourcePreview() {
    if (!state.flow) return;
    setState((current) => ({ ...current, expertSourcePreviewLoading: true, message: "生成专家源 Diff 预览..." }));
    try {
      const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/expert-source-diff-preview`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `专家源 Diff 预览失败 ${response.status}`);
      }
      setState((current) => ({
        ...current,
        expertSourcePreviewLoading: false,
        expertSourcePreview: data.item as ExpertSourceDiffPreview,
        expertSourceWriteback: null,
        message: "专家源 Diff 预览已生成",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        expertSourcePreviewLoading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function requestExpertSourceWriteback() {
    if (!state.flow || !state.expertSourcePreview?.targets?.[0]) return;
    const firstTarget = state.expertSourcePreview.targets[0];
    setState((current) => ({ ...current, expertSourceWritebackLoading: true, message: "执行写回..." }));
    try {
      const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/expert-source-writeback-execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPath: firstTarget.relPosix,
          confirmDiffSha256: firstTarget.diffSha256,
          confirmCandidateSha256: firstTarget.candidate?.sha256,
          createPreWriteSnapshot: true,
          explicitUserAuthorized: true,
          requestedBy: "ai-control-ui",
          note: "User clicked writeback in AI control UI. Treat this click as explicit authorization and execute immediately when runtime gates pass.",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error || `写回失败 ${response.status}`);
      }
      setState((current) => ({
        ...current,
        expertSourceWritebackLoading: false,
        expertSourceWriteback: data as ExpertSourceWritebackRequest,
        message: getWritebackHeadline(data as ExpertSourceWritebackRequest),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        expertSourceWritebackLoading: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  function selectNode(nodeKey: string) {
    const node = state.flow?.nodes.find((item) => item.nodeKey === nodeKey) || null;
    setState((current) => ({
      ...current,
      selectedNodeKey: nodeKey,
      draftReferences: getBoundElements(node),
      draftNode: node ? nodeToDraft(node) : null,
      message: "已切换节点",
    }));
  }

  function selectEdge(edgeKey: string) {
    const edge = state.flow?.edges.find((item) => item.edgeKey === edgeKey) || null;
    setState((current) => ({
      ...current,
      selectedEdgeKey: edgeKey,
      draftEdge: edge ? edgeToDraft(edge) : null,
      message: "已切换连线",
    }));
  }

  function toggleReference(item: ElementItem) {
    setState((current) => {
      const exists = current.draftReferences.some((ref) => ref.id === item.id);
      return {
        ...current,
        draftReferences: exists
          ? current.draftReferences.filter((ref) => ref.id !== item.id)
          : [...current.draftReferences, item],
        message: exists ? "已移除元素" : "已选择元素",
      };
    });
  }

  async function saveReferences() {
    if (!state.flow || !selectedNode) return;
    setState((current) => ({ ...current, saving: true, message: "保存绑定..." }));
    try {
      const response = await authenticatedFetch(
        `/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/nodes/${encodeURIComponent(selectedNode.nodeKey)}/references`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            references: state.draftReferences,
            updatedBy: "ai-control-ui",
            note: "更新节点绑定真源",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `保存失败 ${response.status}`);
      }
      await loadLatestFlow(selectedNode.nodeKey);
      setState((current) => ({
        ...current,
        saving: false,
        message: `绑定已保存，快照 v${data.version?.versionNo || "?"}`,
      }));
      setBindingOpen(false);
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  function updateDraftField(field: keyof NodeDraft, value: string) {
    setState((current) => ({
      ...current,
      draftNode: current.draftNode ? { ...current.draftNode, [field]: value } : current.draftNode,
      message: "节点已修改",
    }));
  }

  function updateEdgeField(field: keyof EdgeDraft, value: string) {
    setState((current) => ({
      ...current,
      draftEdge: current.draftEdge ? { ...current.draftEdge, [field]: value } : current.draftEdge,
      message: "连线已修改",
    }));
  }

  function updateRuleField(field: keyof RuleDraft, value: string) {
    setState((current) => ({
      ...current,
      ruleDraft: { ...current.ruleDraft, [field]: value },
      message: "规则已修改",
    }));
  }

  async function saveNode() {
    if (!state.flow || !state.draftNode) return;
    setState((current) => ({ ...current, saving: true, message: "保存节点..." }));
    try {
      const payload = draftToNodePayload(state.draftNode, dictionaryGroupMap, selectedNode?.referencesJson);
      const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          updatedBy: "ai-control-ui",
          note: "编辑节点五元素与说明",
          rebuildSequentialEdges: false,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `保存失败 ${response.status}`);
      }
      await loadLatestFlow(payload.nodeKey);
      setState((current) => ({
        ...current,
        saving: false,
        selectedNodeKey: payload.nodeKey,
        message: `节点已保存，快照 v${data.version?.versionNo || "?"}`,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  function openNodeCreator(sourceNodeKey = "") {
    setNodeCreatorSourceKey(sourceNodeKey);
    setNodeCreatorOpen(true);
  }

  function startEdgeConnection(node: CanvasNode) {
    if (state.saving) return;
    setEdgeConnectSourceKey(node.nodeKey);
    selectNode(node.nodeKey);
    setState((current) => ({
      ...current,
      message: `已选择「${node.title}」为连线起点，请点击目标卡片完成连线`,
    }));
  }

  async function handleCardClick(node: CanvasNode) {
    if (suppressCardClick) return;
    if (edgeConnectSourceKey) {
      if (edgeConnectSourceKey === node.nodeKey) {
        setEdgeConnectSourceKey("");
        setState((current) => ({ ...current, message: "已取消连线" }));
        return;
      }
      const fromNodeKey = edgeConnectSourceKey;
      setEdgeConnectSourceKey("");
      await createEdgeBetween(fromNodeKey, node.nodeKey);
      return;
    }
    selectNode(node.nodeKey);
    setState((current) => ({
      ...current,
      message: `已选中「${node.title}」，请在右侧选择 Ontology 五元素`,
    }));
  }

  function makeNodeDraftFromTemplate(template: NodeTemplate, sourceNodeKey = "") {
    const nextIndex = (state.flow?.nodes?.length || 0) + 1;
    const sourceNode = sourceNodeKey ? state.flow?.nodes.find((node) => node.nodeKey === sourceNodeKey) : null;
    const siblingCount = sourceNode
      ? state.flow?.nodes.filter((node) => (node.sortOrder || 0) > (sourceNode.sortOrder || 0) && (node.sortOrder || 0) < (sourceNode.sortOrder || 0) + 100).length || 0
      : 0;
    const sortOrder = sourceNode ? (sourceNode.sortOrder || nextIndex * 100) + (siblingCount + 1) * 10 : nextIndex * 100;
    return {
      nodeKey: `${template.type}_${Date.now().toString(36)}`,
      nodeType: template.type,
      title: template.title,
      subtitle: template.subtitle,
      description: template.description,
      sortOrder: String(sortOrder),
      objectText: template.objectText,
      linkText: template.linkText,
      functionText: template.functionText,
      actionText: template.actionText,
      interfaceText: template.interfaceText,
    };
  }

  function getNewNodePosition(sourceNodeKey = "") {
    const sourceNode = sourceNodeKey ? canvasNodeMap.get(sourceNodeKey) : null;
    if (sourceNode) {
      return {
        x: sourceNode.x + sourceNode.width + 260,
        y: sourceNode.y,
      };
    }
    const lastNode = canvasNodes[canvasNodes.length - 1] || null;
    return {
      x: lastNode ? lastNode.x + 260 : 80,
      y: lastNode ? Math.max(100, lastNode.y + (canvasNodes.length % 2 === 0 ? 180 : -180)) : 170,
    };
  }

  async function createNodeFromTemplate(template: NodeTemplate) {
    if (!state.flow) return;
    const sourceNodeKey = nodeCreatorSourceKey || state.selectedNodeKey;
    const sourceNode = sourceNodeKey ? state.flow.nodes.find((node) => node.nodeKey === sourceNodeKey) : null;
    const draft = makeNodeDraftFromTemplate(template, sourceNode?.nodeKey || "");
    const position = getNewNodePosition(sourceNode?.nodeKey || "");
    setState((current) => ({
      ...current,
      saving: true,
      draftNode: draft,
      selectedNodeKey: draft.nodeKey,
      draftReferences: [],
      message: sourceNode ? "新增节点并自动连线..." : "新增节点...",
    }));
    try {
      const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draftToNodePayload(draft, dictionaryGroupMap),
          positionX: Math.round(position.x),
          positionY: Math.round(position.y),
          updatedBy: "ai-control-ui",
          note: "新增节点",
          rebuildSequentialEdges: false,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `新增失败 ${response.status}`);
      }
      let edgeKey = "";
      if (sourceNode) {
        const edgeDraft: EdgeDraft = {
          edgeKey: `edge_${Date.now().toString(36)}`,
          fromNodeKey: sourceNode.nodeKey,
          toNodeKey: draft.nodeKey,
          label: `进入${template.label}`,
          branch: "success",
          conditionText: "上一环节完成",
          failureActionText: "",
          sortOrder: String(((state.flow.edges?.length || 0) + 1) * 100),
        };
        const edgeResponse = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/edges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draftToEdgePayload(edgeDraft),
            updatedBy: "ai-control-ui",
            note: "新增节点后自动补连线",
          }),
        });
        const edgeData = await edgeResponse.json();
        if (!edgeResponse.ok || !edgeData?.ok) {
          throw new Error(edgeData?.message || edgeData?.error || `自动连线失败 ${edgeResponse.status}`);
        }
        edgeKey = edgeDraft.edgeKey;
      }
      setNodeCreatorOpen(false);
      setNodeCreatorSourceKey("");
      await loadLatestFlow(draft.nodeKey, edgeKey);
      setState((current) => ({
        ...current,
        saving: false,
        selectedNodeKey: draft.nodeKey,
        selectedEdgeKey: edgeKey || current.selectedEdgeKey,
        message: sourceNode ? `节点和连线已新增，快照 v${data.version?.versionNo || "?"}` : `节点已新增，快照 v${data.version?.versionNo || "?"}`,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function deleteSelectedNode() {
    if (!state.flow || !selectedNode) return;
    const confirmed = window.confirm(`删除节点「${selectedNode.title}」？`);
    if (!confirmed) return;
    setState((current) => ({ ...current, saving: true, message: "删除节点..." }));
    try {
      const response = await authenticatedFetch(
        `/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/nodes/${encodeURIComponent(selectedNode.nodeKey)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updatedBy: "ai-control-ui",
            note: "删除节点",
            rebuildSequentialEdges: false,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `删除失败 ${response.status}`);
      }
      await loadLatestFlow();
      setState((current) => ({ ...current, saving: false, message: `节点已删除，快照 v${data.version?.versionNo || "?"}` }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function saveEdge() {
    if (!state.flow || !state.draftEdge) return;
    setState((current) => ({ ...current, saving: true, message: "保存连线..." }));
    try {
      const payload = draftToEdgePayload(state.draftEdge);
      const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          updatedBy: "ai-control-ui",
          note: "编辑连线规则",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `保存失败 ${response.status}`);
      }
      await loadLatestFlow(state.selectedNodeKey, payload.edgeKey);
      setState((current) => ({
        ...current,
        saving: false,
        selectedEdgeKey: payload.edgeKey,
        draftEdge: edgeToDraft(data.item as FlowEdge),
        message: `连线已保存，快照 v${data.version?.versionNo || "?"}`,
      }));
      setEdgeRuleOpen(false);
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  function findEdgeBetween(fromNodeKey: string, toNodeKey: string) {
    return state.flow?.edges.find((edge) => edge.fromNodeKey === fromNodeKey && edge.toNodeKey === toNodeKey) || null;
  }

  function countEdgesBetween(fromNodeKey: string, toNodeKey: string) {
    return state.flow?.edges.filter((edge) => edge.fromNodeKey === fromNodeKey && edge.toNodeKey === toNodeKey).length || 0;
  }

  function makeEdgeDraft(fromNodeKey: string, toNodeKey: string): EdgeDraft {
    const existingCount = countEdgesBetween(fromNodeKey, toNodeKey);
    return {
      edgeKey: `edge_${Date.now().toString(36)}`,
      fromNodeKey,
      toNodeKey,
      label: existingCount > 0 ? `分支连线 ${existingCount + 1}` : "业务连线",
      branch: "success",
      conditionText: "上一环节完成",
      failureActionText: "",
      sortOrder: String(((state.flow?.edges?.length || 0) + 1) * 100),
    };
  }

  async function createEdgeBetween(fromNodeKey: string, toNodeKey: string) {
    if (!state.flow) return;
    const draft = makeEdgeDraft(fromNodeKey, toNodeKey);
    setState((current) => ({ ...current, draftEdge: draft, selectedEdgeKey: draft.edgeKey, saving: true, message: "新增连线..." }));
    try {
      const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draftToEdgePayload(draft),
          updatedBy: "ai-control-ui",
          note: "从画布快速新增连线",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `新增连线失败 ${response.status}`);
      }
      await loadLatestFlow(state.selectedNodeKey, draft.edgeKey);
      const createdEdge = data.item as FlowEdge;
      setState((current) => ({
        ...current,
        saving: false,
        selectedEdgeKey: createdEdge.edgeKey,
        draftEdge: edgeToDraft(createdEdge),
        message: `连线已新增，快照 v${data.version?.versionNo || "?"}`,
      }));
      setEdgeRuleOpen(true);
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  function openEdgeRuleForPair(fromNodeKey: string, toNodeKey: string) {
    const existing = findEdgeBetween(fromNodeKey, toNodeKey);
    const draft = existing ? edgeToDraft(existing) : makeEdgeDraft(fromNodeKey, toNodeKey);
    setState((current) => ({
      ...current,
      selectedEdgeKey: draft.edgeKey,
      draftEdge: draft,
      message: existing ? "正在编辑连线规则" : "可保存为新连线规则",
    }));
    setEdgeRuleOpen(true);
  }

  async function saveNodePosition(node: CanvasNode, x: number, y: number) {
    if (!state.flow) return;
    const draft = nodeToDraft(node);
    try {
      const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draftToNodePayload(draft, dictionaryGroupMap, node.referencesJson),
          positionX: Math.round(x),
          positionY: Math.round(y),
          updatedBy: "ai-control-ui",
          note: "仅调整节点画布位置",
          rebuildSequentialEdges: false,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `位置保存失败 ${response.status}`);
      }
      await loadLatestFlow(node.nodeKey, state.selectedEdgeKey);
      setState((current) => ({ ...current, message: "卡片位置已保存" }));
    } catch (error) {
      setState((current) => ({ ...current, message: error instanceof Error ? error.message : String(error) }));
    }
  }

  function handleNodePointerDown(event: ReactPointerEvent<HTMLDivElement>, node: CanvasNode) {
    if (event.button !== 0 || state.saving || edgeConnectSourceKey || (event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      nodeKey: node.nodeKey,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startX: node.x,
      startY: node.y,
      moved: false,
    });
  }

  function handleNodePointerMove(event: ReactPointerEvent<HTMLDivElement>, node: CanvasNode) {
    if (!dragState || dragState.nodeKey !== node.nodeKey) return;
    const deltaX = (event.clientX - dragState.startPointerX) / zoom;
    const deltaY = (event.clientY - dragState.startPointerY) / zoom;
    const nextX = Math.max(24, dragState.startX + deltaX);
    const nextY = Math.max(80, dragState.startY + deltaY);
    const moved = dragState.moved || Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4;
    setDragState({ ...dragState, moved });
    setNodePositionOverrides((current) => ({
      ...current,
      [node.nodeKey]: { x: nextX, y: nextY },
    }));
  }

  function handleNodePointerUp(event: ReactPointerEvent<HTMLDivElement>, node: CanvasNode) {
    if (!dragState || dragState.nodeKey !== node.nodeKey) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const finalPosition = nodePositionOverrides[node.nodeKey] || { x: node.x, y: node.y };
    const moved = dragState.moved;
    setDragState(null);
    if (moved) {
      setSuppressCardClick(true);
      window.setTimeout(() => setSuppressCardClick(false), 0);
      void saveNodePosition(node, finalPosition.x, finalPosition.y);
    }
  }

  async function deleteSelectedEdge() {
    if (!state.flow || !selectedEdge) return;
    const confirmed = window.confirm(`删除连线「${selectedEdge.label || selectedEdge.edgeKey}」？`);
    if (!confirmed) return;
    setState((current) => ({ ...current, saving: true, message: "删除连线..." }));
    try {
      const response = await authenticatedFetch(
        `/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/edges/${encodeURIComponent(selectedEdge.edgeKey)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updatedBy: "ai-control-ui",
            note: "删除连线",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `删除失败 ${response.status}`);
      }
      await loadLatestFlow(state.selectedNodeKey);
      setState((current) => ({ ...current, saving: false, message: `连线已删除，快照 v${data.version?.versionNo || "?"}` }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async function saveFlowRules() {
    if (!state.flow) return;
    setState((current) => ({ ...current, saving: true, message: "保存规则..." }));
    try {
      const response = await authenticatedFetch(`/api/ai-control/ontology/flows/${encodeURIComponent(state.flow.flowKey)}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routingRulesJson: textToJsonOrList(state.ruleDraft.routingText),
          confirmationGatesJson: textToJsonOrList(state.ruleDraft.confirmationText),
          evidenceRulesJson: textToJsonOrList(state.ruleDraft.evidenceText),
          updatedBy: "ai-control-ui",
          note: "更新确认闸与证据规则",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `保存失败 ${response.status}`);
      }
      await loadLatestFlow(state.selectedNodeKey);
      setState((current) => ({
        ...current,
        saving: false,
        message: `规则已保存，快照 v${data.version?.versionNo || "?"}`,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  useEffect(() => {
    void loadLatestFlow();
    void loadDictionary();
  }, [flowKey]);

  useEffect(() => {
    if (activeWorkspaceTab !== "rollback" || !state.flow || !selectedNode || state.nodeVersionsLoading) {
      return;
    }
    if (state.nodeVersions?.flowKey === state.flow.flowKey && state.nodeVersions?.nodeKey === selectedNode.nodeKey) {
      return;
    }
    void refreshNodeVersions(selectedNode.nodeKey);
  }, [activeWorkspaceTab, state.flow, selectedNode, state.nodeVersions, state.nodeVersionsLoading]);

  useEffect(() => {
    if (activeWorkspaceTab !== "structure_changes" || !state.flow || state.structureChangesLoading || state.structureChanges?.flowKey === state.flow.flowKey) {
      return;
    }
    void refreshStructureChanges(false);
  }, [activeWorkspaceTab, state.flow, state.structureChanges, state.structureChangesLoading]);

  useEffect(() => {
    if (activeWorkspaceTab !== "history"
      || !state.flow
      || state.rollbackVersionsLoading
      || state.rollbackVersions?.flowKey === state.flow.flowKey) {
      return;
    }
    void refreshRollbackVersions();
  }, [activeWorkspaceTab, state.flow, state.rollbackVersions, state.rollbackVersionsLoading]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setCanvasFullscreen(document.fullscreenElement === canvasViewportRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleCanvasFullscreen() {
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    if (document.fullscreenElement === viewport) {
      await document.exitFullscreen();
      return;
    }
    await viewport.requestFullscreen();
  }

  function handleCanvasMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.button !== 2) return;
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    event.preventDefault();
    setCanvasPanState({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: viewport.scrollLeft,
      startScrollTop: viewport.scrollTop,
    });
  }

  function handleCanvasMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (!canvasPanState) return;
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    event.preventDefault();
    const deltaX = event.clientX - canvasPanState.startClientX;
    const deltaY = event.clientY - canvasPanState.startClientY;
    viewport.scrollLeft = canvasPanState.startScrollLeft - deltaX;
    viewport.scrollTop = canvasPanState.startScrollTop - deltaY;
  }

  function stopCanvasPan() {
    setCanvasPanState(null);
  }

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(820px,1fr)_380px]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <PanelTitle icon={<Network className="h-4 w-4" />} title="Ontology 主画布" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((current) => Math.max(0.7, Number((current - 0.1).toFixed(1))))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200"
              aria-label="缩小画布"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((current) => Math.min(1.5, Number((current + 0.1).toFixed(1))))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200"
              aria-label="放大画布"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => openNodeCreator(selectedNode?.nodeKey || "")}
              disabled={!state.flow || state.saving}
              className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              新增环节
            </button>
            {state.flow?.targetKind === "expert_team" ? (
              <button
                type="button"
                onClick={() => void syncCurrentCanvasFromExpertTeam()}
                disabled={!state.flow || canvasSyncing}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                title="检测专家团注册表是否新增/删除专家和 Skill，并把变化同步到当前画布"
              >
                {canvasSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                检测并更新画布
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void toggleCanvasFullscreen()}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              {canvasFullscreen ? "退出全屏" : "画布全屏"}
            </button>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
              {state.flow?.name || state.message}
            </span>
          </div>
        </div>
        {state.flow ? (
          <div className="mx-5 mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-100">
            当前对象：{formatTargetKind(state.flow.targetKind)} / {state.flow.targetName || state.flow.targetId || "未选择"}。
            {isPublished ? " 当前项目已发布，但仍可继续编辑；再次确认发布后，将以最新正式版本为准。" : " 点击卡片选中节点；右侧用五元素字典下拉选择 O/L/F/A/I；拖动卡片调整位置；节点右侧的 + / 设置用于新增连线和编辑连线规则；右键可拖动画布。"}
            {state.flow.targetKind === "expert_team" ? " 如果专家团里新增了专家或 Skill，就点上方“检测并更新画布”，系统会按注册表把新增节点补进来，并保留你手工加的非托管节点。" : ""}
          </div>
        ) : null}
        <div className="p-5">
          <div
            ref={canvasViewportRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={stopCanvasPan}
            onMouseLeave={stopCanvasPan}
            onContextMenu={(event) => {
              if (!canvasPanState) return;
              event.preventDefault();
            }}
            className={[
              "relative overflow-auto border border-slate-200 bg-slate-50 shadow-inner",
              canvasFullscreen ? "h-screen rounded-none" : "h-[700px] rounded-3xl",
              canvasPanState ? "cursor-grabbing" : "cursor-default",
            ].join(" ")}
          >
            <div
              className="relative"
              style={{
                width: canvasWidth * zoom,
                height: canvasHeight * zoom,
              }}
            >
              <div
                className="relative origin-top-left"
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(100, 116, 139, 0.22) 1px, transparent 0)",
                  backgroundSize: "28px 28px",
              }}
            >
              <div className="absolute left-6 top-5 z-20 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                <span className={["inline-flex h-2 w-2 rounded-full", edgeConnectSourceKey ? "bg-indigo-500" : "bg-emerald-500"].join(" ")} />
                {edgeConnectSourceKey ? `从「${edgeConnectSourceNode?.title || "当前卡片"}」连线中，点击目标卡片` : "点卡片后在右侧配置五元素"}
                <span className="text-slate-300">·</span>
                <span>{canvasNodes.length} nodes</span>
                {edgeConnectSourceKey ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEdgeConnectSourceKey("");
                      setState((current) => ({ ...current, message: "已取消连线" }));
                    }}
                    className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200"
                  >
                    取消
                  </button>
                ) : null}
              </div>

              <svg
                className="pointer-events-none absolute inset-0 z-0"
                width={canvasWidth}
                height={canvasHeight}
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              >
                <defs>
                  <marker id="ontology-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 z" fill="#818cf8" />
                  </marker>
                </defs>
                {(state.flow?.edges || []).map((edge) => {
                  const from = canvasNodeMap.get(edge.fromNodeKey);
                  const to = canvasNodeMap.get(edge.toNodeKey);
                  if (!from || !to) return null;
                  const startX = from.x + from.width;
                  const startY = from.y + from.height / 2;
                  const endX = to.x;
                  const endY = to.y + to.height / 2;
                  const middle = Math.max(80, (endX - startX) / 2);
                  const active = edge.edgeKey === selectedEdge?.edgeKey;
                  const path = `M ${startX} ${startY} C ${startX + middle} ${startY}, ${endX - middle} ${endY}, ${endX} ${endY}`;
                  return (
                    <g key={edge.edgeKey}>
                      <path
                        d={path}
                        fill="none"
                        stroke={active ? "#4f46e5" : "#94a3b8"}
                        strokeWidth={active ? 3 : 2}
                        markerEnd="url(#ontology-arrow)"
                        opacity={active ? 1 : 0.75}
                      />
                      {edge.label ? (
                        <text
                          x={(startX + endX) / 2}
                          y={(startY + endY) / 2 - 12}
                          fill={active ? "#4f46e5" : "#64748b"}
                          fontSize="12"
                          textAnchor="middle"
                        >
                          {edge.label}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              {canvasNodes.slice(0, -1).map((node, index) => {
                const next = canvasNodes[index + 1];
                const existing = findEdgeBetween(node.nodeKey, next.nodeKey);
                return (
                  <div
                    key={`${node.nodeKey}-${next.nodeKey}`}
                    className="absolute z-30 flex items-center gap-1 rounded-full bg-white p-1 shadow-lg ring-1 ring-indigo-100"
                    style={{ left: node.x + node.width + 8, top: node.y + node.height / 2 - 17 }}
                  >
                    <button
                      type="button"
                      onClick={() => void createEdgeBetween(node.nodeKey, next.nodeKey)}
                      disabled={state.saving}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white disabled:opacity-50"
                      aria-label={`新增 ${node.title} 到 ${next.title} 的连线`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdgeRuleForPair(node.nodeKey, next.nodeKey)}
                      disabled={state.saving}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 disabled:opacity-50"
                      aria-label={`设置 ${node.title} 到 ${next.title} 的连线规则`}
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              {canvasNodes.map((node) => {
                const active = node.nodeKey === selectedNode?.nodeKey;
                const isConnectSource = node.nodeKey === edgeConnectSourceKey;
                const canConnectTarget = !!edgeConnectSourceKey && !isConnectSource;
                return (
                  <Fragment key={node.nodeKey}>
                    <div
                      onPointerDown={(event) => handleNodePointerDown(event, node)}
                      onPointerMove={(event) => handleNodePointerMove(event, node)}
                      onPointerUp={(event) => handleNodePointerUp(event, node)}
                      onClick={() => void handleCardClick(node)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void handleCardClick(node);
                        }
                      }}
                      className={[
                        "absolute touch-none rounded-3xl border p-4 text-left shadow-sm transition",
                        active ? "z-20" : "z-10",
                        edgeConnectSourceKey ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing",
                        isConnectSource
                          ? "border-indigo-500 bg-indigo-50 text-slate-950 shadow-indigo-200"
                          : canConnectTarget
                            ? "border-emerald-300 bg-white text-slate-950 shadow-emerald-100 hover:border-emerald-500"
                            : active
                              ? "border-indigo-300 bg-white text-slate-950 shadow-indigo-100"
                              : "border-slate-200 bg-white text-slate-950 hover:border-indigo-200 hover:shadow-md",
                      ].join(" ")}
                      style={{
                        left: node.x,
                        top: node.y,
                        width: node.width,
                        minHeight: node.height,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={[
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600",
                        ].join(" ")}>
                          {node.nodeType}
                        </span>
                        <span className="text-xs text-slate-400">
                          {String(node.index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <h2 className="mt-4 text-base font-bold">{node.title}</h2>
                      <p className="mt-1 text-xs font-semibold text-indigo-700">
                        {node.subtitle}
                      </p>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {node.description}
                      </p>
                      <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        {canConnectTarget ? "点击接入连线" : `已选 ${node.fiveElementSummary}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        startEdgeConnection(node);
                      }}
                      disabled={state.saving}
                      className={[
                        "absolute z-30 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 disabled:opacity-50",
                        isConnectSource
                          ? "bg-indigo-600 text-white ring-indigo-600"
                          : "bg-white text-indigo-700 ring-indigo-100 hover:bg-indigo-50",
                      ].join(" ")}
                      style={{ left: node.x + node.width - 86, top: node.y + 44 }}
                    >
                      {isConnectSource ? "连线中" : "连线"}
                    </button>
                  </Fragment>
                );
              })}
              </div>
            </div>
          </div>
        </div>
        {!state.flow && !state.loading ? (
          <div className="mx-5 mb-5 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            请先在上方保存草稿。
          </div>
        ) : null}

      </section>

      <aside className="space-y-4">
        <PanelTitle icon={<Layers3 className="h-4 w-4" />} title="节点五元素契约" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">当前选中：{selectedNode?.title || "未选择节点"}</p>
              <p className="mt-1 text-xs text-slate-500">{state.message}</p>
            </div>
            {state.loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniMetric label="类型" value={formatNodeType(selectedNode?.nodeType)} />
            <MiniMetric label="绑定" value={String(selectedNodeBindings.length)} />
            <MiniMetric label="版本" value={state.publishPreview?.latestSnapshot ? `v${state.publishPreview.latestSnapshot.versionNo}` : "待接入"} />
          </div>
          {state.draftNode ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="节点 Key" value={state.draftNode.nodeKey} disabled onChange={() => undefined} />
                <Field label="类型" value={state.draftNode.nodeType} onChange={(value) => updateDraftField("nodeType", value)} />
              </div>
              <Field label="标题" value={state.draftNode.title} onChange={(value) => updateDraftField("title", value)} />
              <Field label="副标题" value={state.draftNode.subtitle} onChange={(value) => updateDraftField("subtitle", value)} />
              <Field label="顺序" value={state.draftNode.sortOrder} onChange={(value) => updateDraftField("sortOrder", value)} />
              <TextField label="描述" value={state.draftNode.description} onChange={(value) => updateDraftField("description", value)} rows={2} />
              <DictionaryMultiSelectField
                label="Object"
                value={state.draftNode.objectText}
                options={dictionaryOptionsForType(dictionaryGroupMap, "Object", state.draftNode.objectText)}
                loading={state.dictionaryLoading}
                onChange={(value) => updateDraftField("objectText", value)}
              />
              <DictionaryMultiSelectField
                label="Link"
                value={state.draftNode.linkText}
                options={dictionaryOptionsForType(dictionaryGroupMap, "Link", state.draftNode.linkText)}
                loading={state.dictionaryLoading}
                onChange={(value) => updateDraftField("linkText", value)}
              />
              <DictionaryMultiSelectField
                label="Function"
                value={state.draftNode.functionText}
                options={dictionaryOptionsForType(dictionaryGroupMap, "Function", state.draftNode.functionText)}
                loading={state.dictionaryLoading}
                onChange={(value) => updateDraftField("functionText", value)}
              />
              <DictionaryMultiSelectField
                label="Action"
                value={state.draftNode.actionText}
                options={dictionaryOptionsForType(dictionaryGroupMap, "Action", state.draftNode.actionText)}
                loading={state.dictionaryLoading}
                onChange={(value) => updateDraftField("actionText", value)}
              />
              <DictionaryMultiSelectField
                label="Interface"
                value={state.draftNode.interfaceText}
                options={dictionaryOptionsForType(dictionaryGroupMap, "Interface", state.draftNode.interfaceText)}
                loading={state.dictionaryLoading}
                onChange={(value) => updateDraftField("interfaceText", value)}
              />
              <button
                type="button"
                onClick={() => setBindingOpen(true)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50"
              >
                查看旧版真实元素引用
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveNode()}
                  disabled={!state.flow || state.saving}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {state.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  保存节点
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSelectedNode()}
                  disabled={!state.flow || !selectedNode || state.saving}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <WorkspaceTabButton active={activeWorkspaceTab === "structure_changes"} onClick={() => setActiveWorkspaceTab("structure_changes")}>
              结构变化
            </WorkspaceTabButton>
            <WorkspaceTabButton active={activeWorkspaceTab === "rollback"} onClick={() => setActiveWorkspaceTab("rollback")}>
              节点回退
            </WorkspaceTabButton>
            <WorkspaceTabButton active={activeWorkspaceTab === "publish_sync"} onClick={() => setActiveWorkspaceTab("publish_sync")}>
              发布同步
            </WorkspaceTabButton>
            <WorkspaceTabButton active={activeWorkspaceTab === "history"} onClick={() => setActiveWorkspaceTab("history")}>
              历史版本
            </WorkspaceTabButton>
          </div>
        </div>

        {activeWorkspaceTab === "structure_changes" ? (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <PanelTitle icon={<GitBranch className="h-4 w-4" />} title="结构变化" />
              <button
                type="button"
                onClick={() => void refreshStructureChanges(true)}
                disabled={!state.flow || state.structureChangesLoading}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-800 ring-1 ring-violet-200 disabled:opacity-60"
              >
                {state.structureChangesLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                检测专家/Skill变化
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-violet-950/85">
              这里看的不是“画布节点改没改”，而是“这个节点有没有绑到真实专家/Skill 文件，以及这些真源文件相对本机快照有没有变化”。点击“检测专家/Skill变化”后，会重新扫描当前绑定真源；如果专家团里增删了专家、Skill，或真源正文变了，这里会立刻刷新变化摘要。不会写入 WorkBuddy 真源。
            </p>
            {state.structureChanges ? (
              <>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <Metric label="已绑真源" value={state.structureChanges.summary.boundNodeCount} />
                  <Metric label="真源有变化" value={state.structureChanges.summary.changedNodeCount} />
                  <Metric label="未建基线" value={state.structureChanges.summary.untrackedNodeCount} />
                  <Metric label="源文件缺失" value={state.structureChanges.summary.missingNodeCount} />
                </div>
                <div className="mt-3 rounded-xl bg-white px-3 py-3 text-xs leading-5 text-slate-600 ring-1 ring-violet-100">
                  <p><span className="font-semibold text-slate-900">真源有变化</span>：这个节点已经绑到真实专家/Skill 文件，但文件内容相对最近一次本机快照已经变了。</p>
                  <p className="mt-1"><span className="font-semibold text-slate-900">未建基线</span>：已经绑到真实文件，但本机还没有留下第一条快照，所以现在还不能比较前后变化。</p>
                  <p className="mt-1"><span className="font-semibold text-slate-900">源文件缺失</span>：这个节点指向的真实路径现在读不到，可能是文件不存在、路径变了，或当前挂载里没有这份文件。</p>
                </div>
                <div className="mt-4 rounded-2xl bg-white p-3 text-xs leading-5 text-slate-700 ring-1 ring-violet-100">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">当前节点</p>
                    {selectedNodeStructure ? <StructureStatusBadge status={selectedNodeStructure.status} /> : null}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <MiniMetric label="节点" value={selectedNode?.title || "未选择"} />
                    <MiniMetric label="源文件" value={selectedNodeStructure ? String(selectedNodeStructure.sourceCount) : "0"} />
                  </div>
                  <p className="mt-3 text-slate-600">
                    {selectedNodeStructure?.summary || "当前节点还没有结构变化数据。"}
                  </p>
                  {selectedNodeStructure?.sources.length ? (
                    <div className="mt-3 space-y-2">
                      {selectedNodeStructure.sources.map((source) => (
                        <div key={`${source.bindingId}-${source.relPath}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">{source.label}</p>
                            <StructureStatusBadge status={source.status} compact />
                          </div>
                          <p className="mt-1 truncate text-[11px] text-slate-500">{source.relPath}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {source.historyCount ? `本机快照 ${source.historyCount} 条` : "暂无本机快照"}
                            {source.currentSha256 ? ` · SHA ${source.currentSha256.slice(0, 10)}` : ""}
                          </p>
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => createSourceVersionSnapshot(source.relPath, source.label)}
                              disabled={sourceSnapshotLoadingPath === source.relPath}
                              className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                              title="把当前检测到的专家/Skill 真源状态记成一个新的本机版本快照"
                            >
                              {sourceSnapshotLoadingPath === source.relPath ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                              把当前真源记为新版本
                            </button>
                          </div>
                          {source.currentChangeSummary ? (
                            <div className="mt-2 rounded-lg border border-violet-100 bg-white px-2.5 py-2">
                              <p className="text-[11px] font-semibold text-slate-900">当前发生了什么变化</p>
                              <p className="mt-1 text-[11px] leading-5 text-slate-600">{source.currentChangeSummary}</p>
                              {source.currentChangeDetails?.length ? (
                                <ul className="mt-1 space-y-1 text-[11px] leading-5 text-slate-500">
                                  {source.currentChangeDetails.map((detail) => (
                                    <li key={detail}>- {detail}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ) : null}
                          {source.historyVersions?.length ? (
                            <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                              <p className="text-[11px] font-semibold text-slate-900">历史版本变化描述</p>
                              <div className="mt-2 space-y-2">
                                {source.historyVersions.map((history) => (
                                  <div key={history.id} className="rounded-lg bg-slate-50 px-2 py-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[11px] font-medium text-slate-900">{history.note}</p>
                                      <span className="text-[10px] text-slate-500">{formatDateTime(history.createdAt)}</span>
                                    </div>
                                    <p className="mt-1 text-[11px] leading-5 text-slate-600">{history.summary}</p>
                                    {history.details.length ? (
                                      <ul className="mt-1 space-y-1 text-[11px] leading-5 text-slate-500">
                                        {history.details.map((detail) => (
                                          <li key={`${history.id}-${detail}`}>- {detail}</li>
                                        ))}
                                      </ul>
                                    ) : null}
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => previewSourceHistoryRestore(history.id)}
                                        disabled={sourceRestorePreviewLoadingId === history.id}
                                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {sourceRestorePreviewLoadingId === history.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitCompare className="h-3 w-3" />}
                                        预览回退 Diff
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => applySourceHistoryRestore(history.id)}
                                        disabled={sourceRestoreExecuteLoadingId === history.id || sourceRestorePreviewId !== history.id}
                                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                        title={sourceRestorePreviewId === history.id ? "将当前真源恢复到该快照，并先创建恢复前快照" : "请先读取该快照的恢复预览"}
                                      >
                                        {sourceRestoreExecuteLoadingId === history.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                                        回退到此版本
                                      </button>
                                    </div>
                                    {sourceRestorePreviewId === history.id && sourceRestorePreview ? (
                                      <div className="mt-2 rounded-lg border border-indigo-100 bg-white p-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                                          <span>当前 SHA：{sourceRestorePreview.current?.sha256?.slice(0, 12) || "-"}</span>
                                          <span>目标 SHA：{sourceRestorePreview.restore_candidate?.sha256?.slice(0, 12) || "-"}</span>
                                          <span>{sourceRestorePreview.changed ? "有差异，可回退" : "已与该版本一致"}</span>
                                        </div>
                                        {sourceRestorePreview.changed ? (
                                          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre rounded-lg bg-slate-950 p-2 font-mono text-[10px] leading-5 text-slate-100">{sourceRestorePreview.diff}</pre>
                                        ) : (
                                          <div className="mt-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-[10px] text-emerald-700 ring-1 ring-emerald-100">当前真源已经和这个快照一致，不需要再恢复。</div>
                                        )}
                                        <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] leading-5 text-slate-600 ring-1 ring-slate-200">
                                          {sourceRestorePreview.restore_blocked_reason || "点击“回退到此版本”后，会先创建恢复前快照，再按可写挂载和用户显式授权执行真实恢复。"}
                                        </div>
                                        {sourceRestoreResult && sourceRestorePreviewId === history.id ? (
                                          <div className="mt-2 space-y-2">
                                            <div className={`rounded-lg px-2 py-1.5 text-[10px] leading-5 ring-1 ${sourceRestoreResult.restore_executed ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-900 ring-amber-100"}`}>
                                              {sourceRestoreResult.restore_executed
                                                ? `已执行回退${sourceRestoreResult.post_restore_snapshot?.id ? `，恢复后快照 ${sourceRestoreResult.post_restore_snapshot.id}` : ""}`
                                                : (sourceRestoreResult.restore_blocked_reason || "当前回退仍未执行")}
                                            </div>
                                            {(sourceRestoreResult.gates?.length ?? 0) > 0 ? (
                                              <div className="grid gap-2 md:grid-cols-2">
                                                {sourceRestoreResult.gates?.map((gate) => (
                                                  <div key={`${history.id}-${gate.key}`} className={`rounded-lg px-2 py-1.5 text-[10px] leading-5 ring-1 ${gate.ok ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-slate-50 text-slate-700 ring-slate-200"}`}>
                                                    <div className="flex items-center gap-1 font-medium">
                                                      {gate.ok ? <ShieldCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3 text-amber-600" />}
                                                      {gate.label}
                                                    </div>
                                                    <div className="mt-1 opacity-80">{gate.detail}</div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : null}
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {!selectedNodeStructure?.sources.length ? (
                    <p className="mt-3 text-slate-500">
                      “未绑真源” 的意思是：这个节点目前只是画布草稿节点，还没有和真实专家文档或 Skill 文档建立绑定关系，所以这里暂时无法对比它的真源变化。
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-violet-100">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">节点真源状态</p>
                    <p className="text-[11px] text-slate-500">{formatDateTime(state.structureChanges.scannedAt)}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {sortStructureNodes(state.structureChanges.nodes).map((node) => (
                      <button
                        key={node.nodeKey}
                        type="button"
                        onClick={() => setState((current) => ({ ...current, selectedNodeKey: node.nodeKey }))}
                        className={[
                          "w-full rounded-xl border px-3 py-2 text-left transition",
                          node.nodeKey === selectedNode?.nodeKey
                            ? "border-violet-300 bg-violet-50"
                            : "border-slate-100 bg-slate-50 hover:border-violet-200",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{node.title}</p>
                          <StructureStatusBadge status={node.status} compact />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatNodeType(node.nodeType)} · 已绑 {node.sourceCount} 个真源文件 · {node.historyCount} 条快照
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{node.summary}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-violet-100">
                {state.structureChangesLoading ? "正在读取结构变化..." : "切到这个工作区后会自动读取当前画布的结构变化摘要。"}
              </div>
            )}
          </div>
        ) : null}

        {activeWorkspaceTab === "rollback" ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <PanelTitle icon={<RefreshCw className="h-4 w-4" />} title="节点回退" />
              <button
                type="button"
                onClick={() => void refreshNodeVersions()}
                disabled={!state.flow || !selectedNode || state.nodeVersionsLoading}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200 disabled:opacity-60"
              >
                {state.nodeVersionsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                刷新
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-sky-950/85">
              这个工作区只做“当前节点回退”。先在左边画布选中节点，再在下面看这个节点自己的历史版本；回退后只更新这个节点本身，不会把整张画布一起退回，也不会去动 WorkBuddy 真源文件。
            </p>
            <p className="mt-2 text-xs leading-5 text-sky-900/80">
              如果你要看的其实是“整张画布过去发布过哪些正式版本”，请去【历史版本】；那里只放整项目 `published_contract` 的历史，不和节点历史混在一起。
            </p>
            <p className="mt-2 text-xs leading-5 text-sky-900/80">
              如果你要看的其实是“专家/Skill 真源最近改了什么、历史上怎么改过”，请回到【结构变化】点击对应节点；那里展示的是专家源本机快照历史，不是 Ontology 画布快照。
            </p>
            <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-sky-100">
              <p className="text-sm font-semibold text-slate-900">当前节点怎么退</p>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <li>1. 先在左边画布点中要处理的节点。</li>
                <li>2. 看下面“节点历史版本”，确认这次要退回哪一版。</li>
                <li>3. 点“回退到这个节点版本”，系统只会把这个节点恢复成新的草稿状态。</li>
              </ol>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniMetric label="当前节点" value={selectedNode?.title || "未选择"} />
                <MiniMetric label="节点类型" value={formatNodeType(selectedNode?.nodeType)} />
                <MiniMetric label="当前状态" value={isPublished ? "已发布" : "草稿"} />
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-sky-100">
              <div className="flex items-center justify-between gap-2">
                <PanelTitle icon={<GitBranch className="h-4 w-4" />} title="节点历史版本" />
                <button
                  type="button"
                  onClick={() => void refreshNodeVersions()}
                  disabled={!state.flow || !selectedNode || state.nodeVersionsLoading}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200 disabled:opacity-60"
                >
                  {state.nodeVersionsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  刷新
                </button>
              </div>
              {state.nodeVersions ? (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MiniMetric label="节点" value={state.nodeVersions.nodeTitle || selectedNode?.title || "未选择"} />
                    <MiniMetric label="类型" value={formatNodeType(state.nodeVersions.nodeType || selectedNode?.nodeType)} />
                    <MiniMetric label="历史数" value={String(state.nodeVersions.versions.length)} />
                  </div>
                  <div className="mt-3 space-y-2">
                    {state.nodeVersions.versions.length ? state.nodeVersions.versions.map((version) => (
                      <div key={version.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              v{version.versionNo} · {version.label}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {formatDateTime(version.publishedAt || version.createdAt)} · {version.createdBy}
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                            {formatNodeType(version.nodeType)}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <MiniMetric label="绑定" value={String(version.boundReferenceCount)} />
                          <MiniMetric label="连线" value={String(version.connectedEdgeCount)} />
                          <MiniMetric label="Action" value={String(version.actionCount)} />
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          {version.note || version.description || "该版本已记录当前节点的五元素和绑定摘要。"}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          O/L/F/A/I：{version.objectCount}/{version.linkCount}/{version.functionCount}/{version.actionCount}/{version.interfaceCount}
                          {version.candidateHash ? ` · Hash ${version.candidateHash.slice(0, 12)}` : ""}
                        </p>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => void createNodeRollbackDraft(version)}
                            disabled={!selectedNode || state.rollbackApplying || state.nodeVersionsLoading}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {state.rollbackApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            回退到这个节点版本
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                        当前节点还没有可读取的历史版本。
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  {state.nodeVersionsLoading ? "正在读取节点版本..." : "先在左侧画布选中节点，这里只显示该节点自己的历史版本。"}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeWorkspaceTab === "publish_sync" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <PanelTitle icon={<ShieldCheck className="h-4 w-4" />} title="发布同步" />
              <button
                type="button"
                onClick={() => void refreshPublishPreview()}
                disabled={!state.flow || state.previewLoading}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 disabled:opacity-60"
              >
                {state.previewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                刷新
              </button>
            </div>
            {state.publishPreview ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Metric label="节点" value={state.publishPreview.summary.nodeCount} />
                  <Metric label="连线" value={state.publishPreview.summary.edgeCount} />
                  <Metric label="风险" value={state.publishPreview.summary.blockerCount + state.publishPreview.summary.warningCount} />
                </div>
                <div className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-700 ring-1 ring-amber-100">
                  <p className="font-semibold text-slate-900">
                    {isPublished ? "已发布，可再次发布" : state.publishPreview.canPublishAfterConfirmation ? "可进入确认" : `当前还有 ${state.publishPreview.summary.blockerCount} 项阻断，暂不能发布`}
                  </p>
                  <p className="mt-1 break-all text-slate-500">Hash: {state.publishPreview.candidateHash.slice(0, 16)}（这是本次候选契约指纹，不是需要手填的内容）</p>
                  <p className="text-slate-500">
                    回滚锚点：{state.publishPreview.rollbackAnchor ? `v${state.publishPreview.rollbackAnchor.versionNo}` : "首次发布"}
                  </p>
                  <p className="mt-2 text-slate-600">
                    点击下面按钮后，系统会先发布 `published_contract`，再立即尝试把最新正式契约同步回 WorkBuddy 专家源。
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-700 ring-1 ring-amber-100">
                  <p className="font-semibold text-slate-900">这里现在只做两件事</p>
                  <p className="mt-1 text-slate-600">
                    <span className="font-semibold text-slate-900">第一件</span>：把当前画布发布成新的正式版，并尝试同步回 WorkBuddy 专家源。
                  </p>
                  <p className="mt-1 text-slate-600">
                    <span className="font-semibold text-slate-900">第二件</span>：看这一次的 <span className="font-semibold text-slate-900">专家源 Diff</span>，也就是如果现在同步，会改哪些真实文件。
                  </p>
                  <p className="mt-1 text-slate-600">整项目正式发布历史不再放这里，已经单独移到【历史版本】。</p>
                </div>
                <button
                  type="button"
                  onClick={() => void publishCurrentFlow()}
                  disabled={!state.publishPreview.canPublishAfterConfirmation || state.publishing}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-amber-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {state.publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  确认发布并同步
                </button>
                {state.publishSyncResult ? (
                  <div className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-700 ring-1 ring-amber-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">本次发布同步结果</p>
                      <span className={[
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                        state.publishSyncResult.sync.status === "synced"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : state.publishSyncResult.sync.status === "partial"
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : "bg-rose-50 text-rose-700 ring-rose-200",
                      ].join(" ")}>
                        {humanizePublishSyncStatus(state.publishSyncResult.sync.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">{getPublishSyncHeadline(state.publishSyncResult)}</p>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      <MiniMetric label="目标" value={String(state.publishSyncResult.sync.targetCount)} />
                      <MiniMetric label="写成" value={String(state.publishSyncResult.sync.writtenCount)} />
                      <MiniMetric label="已对齐" value={String(state.publishSyncResult.sync.alreadyInSyncCount)} />
                      <MiniMetric label="阻断" value={String(state.publishSyncResult.sync.blockedCount + state.publishSyncResult.sync.verificationFailedCount)} />
                    </div>
                    {state.publishSyncResult.sync.latestSyncSnapshotVersionNo ? (
                      <p className="mt-2 text-slate-500">
                        同步快照：v{state.publishSyncResult.sync.latestSyncSnapshotVersionNo}
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-2">
                      {state.publishSyncResult.sync.targets.slice(0, 6).map((target) => (
                        <div key={`${target.kind}:${target.relPath}`} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-slate-900">{target.label}</p>
                            <span className="text-[11px] text-slate-500">{humanizePublishSyncStatus(target.status)}</span>
                          </div>
                          <p className="mt-1 break-all text-slate-500">{target.relPath}</p>
                          {target.nodeTitles?.length ? (
                            <p className="mt-1 text-slate-500">影响节点：{target.nodeTitles.join("、")}</p>
                          ) : null}
                          {target.saveBlockedReason ? (
                            <p className="mt-1 text-rose-700">{target.saveBlockedReason}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void fetchExpertSourcePreview()}
                  disabled={!isPublished || state.expertSourcePreviewLoading}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-60"
                >
                  {state.expertSourcePreviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5" />}
                  专家源 Diff
                </button>
                {isPublished ? (
                  <p className="text-xs leading-5 text-amber-900">
                    点一次“写回专家源”，系统就把这次操作视为你已经同意，并立即尝试真实写回；如果还没写进去，通常只会卡在运行态条件，比如只读挂载、未开启真实写回，或本机写盘执行器未打开。
                  </p>
                ) : null}
                {state.expertSourcePreview ? (
                  <div className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-700 ring-1 ring-amber-100">
                    <p className="font-semibold text-slate-900">只读同步预览</p>
                    <p className="mt-1 text-slate-500">
                      文件 {state.expertSourcePreview.targetSummary.previewedCount} / 变更 {state.expertSourcePreview.targetSummary.changedCount} / 阻断 {state.expertSourcePreview.targetSummary.blockerCount}
                    </p>
                    <p className="break-all text-slate-500">Hash: {state.expertSourcePreview.candidateHash.slice(0, 16)}</p>
                    {state.expertSourcePreview.targets[0] ? (
                      <p className="mt-1 break-all text-slate-500">
                        {state.expertSourcePreview.targets[0].relPosix} · Diff {state.expertSourcePreview.targets[0].diffLength}
                      </p>
                    ) : null}
                    {state.expertSourcePreview.blockers[0] ? (
                      <p className="mt-1 text-rose-700">{state.expertSourcePreview.blockers[0].message}</p>
                    ) : null}
                    {state.expertSourcePreview.targets[0] ? (
                      <button
                        type="button"
                        onClick={() => void requestExpertSourceWriteback()}
                        disabled={state.expertSourceWritebackLoading}
                        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {state.expertSourceWritebackLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        写回专家源
                      </button>
                    ) : null}
                    {state.expertSourceWriteback ? (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                        <p className="font-semibold text-slate-900">写回检查结果</p>
                        <p className="mt-1 text-slate-700">{getWritebackHeadline(state.expertSourceWriteback)}</p>
                        {getWritebackNextAction(state.expertSourceWriteback) ? (
                          <p className="mt-1 text-slate-500">{getWritebackNextAction(state.expertSourceWriteback)}</p>
                        ) : null}
                        {getBlockedWritebackItems(state.expertSourceWriteback).length ? (
                          <div className="mt-2 space-y-1">
                            {getBlockedWritebackItems(state.expertSourceWriteback).map((item) => (
                              <p key={item} className="text-rose-700">
                                还差 · {item}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-emerald-700">当前检查已通过，可以进入真实写回。</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-2">
                  {state.publishPreview.riskChecks.slice(0, 5).map((risk) => (
                    <div key={`${risk.code}-${risk.message}`} className="rounded-xl bg-white px-3 py-2 text-xs leading-5 ring-1 ring-amber-100">
                      <span className={risk.level === "BLOCKER" ? "font-semibold text-rose-700" : risk.level === "WARN" ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>
                        {risk.level}
                      </span>
                      <span className="ml-2 text-slate-700">{risk.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-amber-900">暂无预览。</p>
            )}
          </div>
        ) : null}

        {activeWorkspaceTab === "history" ? (
          <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <PanelTitle icon={<GitBranch className="h-4 w-4" />} title="历史版本" />
              <button
                type="button"
                onClick={() => void refreshRollbackVersions()}
                disabled={!state.flow || state.rollbackVersionsLoading}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-60"
              >
                {state.rollbackVersionsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                刷新
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              这里单独只放整项目正式发布历史，也就是每次点【确认发布并同步】后形成的 `published_contract` 版本。不放节点历史，也不放专家源 Diff。
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              要退单个节点，请回【节点回退】；要看这次同步会改哪些真实文件，请回【发布同步】看专家源 Diff。
            </p>
            {publishedHistoryVersions.length ? (
              <div className="mt-4 space-y-2">
                {publishedHistoryVersions.map((version) => (
                  <div key={version.id} className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">v{version.versionNo} · {version.label}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatDateTime(version.publishedAt || version.createdAt)} · {version.createdBy}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                        已发布
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <MiniMetric label="节点" value={String(version.nodeCount)} />
                      <MiniMetric label="连线" value={String(version.edgeCount)} />
                      <MiniMetric label="规则" value={formatRollbackRuleSource(version.ruleSource)} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {version.note || "这是一次整项目正式发布记录。"}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-slate-500">
                        {version.candidateHash ? `Hash ${version.candidateHash.slice(0, 12)}` : "未记录候选 Hash"}
                      </p>
                      <button
                        type="button"
                        onClick={() => void createRollbackDraft(version)}
                        disabled={!version.rollbackReady || state.rollbackApplying || state.rollbackVersionsLoading}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {state.rollbackApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        生成整项目回退草稿
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-white px-3 py-4 text-sm text-slate-500 ring-1 ring-slate-200">
                {state.rollbackVersionsLoading ? "正在读取整项目历史版本..." : "当前还没有可显示的整项目正式发布历史。"}
              </div>
            )}
          </div>
        ) : null}
      </aside>

      {nodeCreatorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-950">新增业务环节</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {nodeCreatorSourceKey
                    ? `将接在「${state.flow?.nodes.find((node) => node.nodeKey === nodeCreatorSourceKey)?.title || "当前卡片"}」后面，并自动创建连线。`
                    : "选择一个环节类型，系统会生成对应五元素草稿。"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNodeCreatorOpen(false);
                  setNodeCreatorSourceKey("");
                }}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="关闭新增业务环节窗口"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {NODE_TEMPLATES.map((template) => (
                <button
                  key={template.type}
                  type="button"
                  onClick={() => void createNodeFromTemplate(template)}
                  disabled={!state.flow || state.saving}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                      {template.label}
                    </span>
                    <Plus className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-950">{template.title}</p>
                  <p className="mt-1 text-xs font-semibold text-indigo-700">{template.subtitle}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {bindingOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-950">绑定真实元素</h3>
                <p className="mt-1 text-sm text-slate-500">当前卡片：{selectedNode?.title || "未选择节点"}</p>
              </div>
              <button
                type="button"
                onClick={() => setBindingOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="关闭绑定真实元素窗口"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid max-h-[64vh] grid-cols-1 gap-4 overflow-auto p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
              <OntologyElementLibrary
                title="选择元素"
                selectedIds={selectedIds}
                onSelect={toggleReference}
                maxItemsPerGroup={6}
              />
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-semibold text-indigo-950">已绑定</p>
                <div className="mt-3 space-y-2">
                  {state.draftReferences.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-indigo-100">
                      <span className="line-clamp-1">{item.label}</span>
                      <button type="button" onClick={() => toggleReference(item)} className="text-slate-400 hover:text-slate-700">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {!state.draftReferences.length ? (
                    <p className="text-xs leading-5 text-indigo-700">点击左侧元素即可绑定到当前卡片。</p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setBindingOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void saveReferences()}
                disabled={!state.flow || !selectedNode || state.saving}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {state.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                保存绑定
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {edgeRuleOpen && state.draftEdge ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="max-h-[86vh] w-full max-w-xl overflow-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-950">连线规则</h3>
                <p className="mt-1 text-sm text-slate-500">设置两个业务环节之间的条件、分支和失败处理。</p>
              </div>
              <button
                type="button"
                onClick={() => setEdgeRuleOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="关闭连线规则窗口"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <Field label="连线 Key" value={state.draftEdge.edgeKey} disabled onChange={() => undefined} />
              <SelectField label="起点" value={state.draftEdge.fromNodeKey} options={state.flow?.nodes || []} onChange={(value) => updateEdgeField("fromNodeKey", value)} />
              <SelectField label="终点" value={state.draftEdge.toNodeKey} options={state.flow?.nodes || []} onChange={(value) => updateEdgeField("toNodeKey", value)} />
              <Field label="标签" value={state.draftEdge.label} onChange={(value) => updateEdgeField("label", value)} />
              <SelectTextField
                label="分支"
                value={state.draftEdge.branch}
                options={[
                  { value: "success", label: "成功" },
                  { value: "failure", label: "失败" },
                  { value: "manual_review", label: "人工确认" },
                ]}
                onChange={(value) => updateEdgeField("branch", value)}
              />
              <TextField label="条件" value={state.draftEdge.conditionText} onChange={(value) => updateEdgeField("conditionText", value)} rows={2} />
              <TextField label="失败处理" value={state.draftEdge.failureActionText} onChange={(value) => updateEdgeField("failureActionText", value)} rows={2} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void deleteSelectedEdge()}
                disabled={!state.flow || !selectedEdge || state.saving}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </button>
              <button
                type="button"
                onClick={() => void saveEdge()}
                disabled={!state.flow || state.saving}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {state.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                保存连线
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getBoundElements(node: FlowNode | null) {
  const value = node?.referencesJson as { boundElements?: ElementItem[] } | null | undefined;
  return Array.isArray(value?.boundElements) ? value.boundElements : [];
}

function registryCompilerDefaultRefs(nodeType?: string) {
  const normalizedType = String(nodeType || "").toLowerCase();
  if (normalizedType === "tool") {
    return {
      objectElementIds: ["O14", "O41"],
      linkElementIds: ["L01", "L06", "L23"],
      functionElementIds: ["F01", "F02", "F28"],
      actionElementIds: ["A34"],
      interfaceElementIds: ["I01", "I09", "I12"],
    };
  }
  if (normalizedType === "evidence" || normalizedType === "ledger") {
    return {
      objectElementIds: ["O41", "O42"],
      linkElementIds: ["L06", "L23"],
      functionElementIds: ["F10", "F26"],
      actionElementIds: ["A31", "A34"],
      interfaceElementIds: ["I09", "I12"],
    };
  }
  if (normalizedType === "skill") {
    return {
      objectElementIds: ["O43", "O41"],
      linkElementIds: ["L24", "L23"],
      functionElementIds: ["F03", "F28"],
      actionElementIds: ["A27"],
      interfaceElementIds: ["I09", "I10", "I11"],
    };
  }
  if (normalizedType === "expert" || normalizedType === "expert_team") {
    return {
      objectElementIds: ["O43"],
      linkElementIds: ["L24"],
      functionElementIds: ["F03", "F27"],
      actionElementIds: ["A27"],
      interfaceElementIds: ["I09", "I10", "I11"],
    };
  }
  return {
    objectElementIds: ["O01", "O41"],
    linkElementIds: ["L01", "L23"],
    functionElementIds: ["F01", "F03"],
    actionElementIds: ["A30"],
    interfaceElementIds: ["I01", "I09", "I11"],
  };
}

function arrayLikeToText(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item || "")).filter(Boolean).join("\n");
  if (typeof value === "string") return value;
  return "";
}

function extractNodeOntologyRefs(node: FlowNode | null) {
  const references = node?.referencesJson && typeof node.referencesJson === "object" && !Array.isArray(node.referencesJson)
    ? node.referencesJson as Record<string, unknown>
    : {};
  const ontologyRefs = references.ontologyRefs && typeof references.ontologyRefs === "object" && !Array.isArray(references.ontologyRefs)
    ? references.ontologyRefs as Record<string, unknown>
    : {};
  const resolved = {
    objectElementIds: linesToList(arrayLikeToText(ontologyRefs.objectElementIds ?? node?.objectJson)),
    linkElementIds: linesToList(arrayLikeToText(ontologyRefs.linkElementIds ?? node?.linkJson)),
    functionElementIds: linesToList(arrayLikeToText(ontologyRefs.functionElementIds ?? node?.functionJson)),
    actionElementIds: linesToList(arrayLikeToText(ontologyRefs.actionElementIds ?? node?.actionJson)),
    interfaceElementIds: linesToList(arrayLikeToText(ontologyRefs.interfaceElementIds ?? node?.interfaceJson)),
  };
  const total = resolved.objectElementIds.length + resolved.linkElementIds.length + resolved.functionElementIds.length + resolved.actionElementIds.length + resolved.interfaceElementIds.length;
  if (total > 0) return resolved;
  if (references.source === "expert_team_registry_compiler") {
    return registryCompilerDefaultRefs(node?.nodeType);
  }
  return resolved;
}

function buildCanvasNodes(nodes: FlowNode[], overrides: Record<string, { x: number; y: number }>): CanvasNode[] {
  const sorted = [...nodes].sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));
  return sorted.map((node, index) => {
    const row = index % 2;
    const override = overrides[node.nodeKey];
    return {
      ...node,
      index,
      width: 210,
      height: 185,
      x: override?.x ?? (typeof node.positionX === "number" && node.positionX > 0 ? node.positionX : 80 + index * 260),
      y: override?.y ?? (typeof node.positionY === "number" && node.positionY > 0 ? node.positionY : 170 + row * 180),
      fiveElementSummary: summarizeFiveElements(node),
    };
  });
}

function summarizeFiveElements(node: FlowNode) {
  const refs = extractNodeOntologyRefs(node);
  const objectCount = refs.objectElementIds.length;
  const linkCount = refs.linkElementIds.length;
  const functionCount = refs.functionElementIds.length;
  const actionCount = refs.actionElementIds.length;
  const interfaceCount = refs.interfaceElementIds.length;
  return `O${objectCount}/L${linkCount}/F${functionCount}/A${actionCount}/I${interfaceCount}`;
}

function countElementEntries(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "string") return linesToList(value).length;
  return 0;
}

function nodeToDraft(node: FlowNode): NodeDraft {
  const refs = extractNodeOntologyRefs(node);
  return {
    nodeKey: node.nodeKey,
    nodeType: node.nodeType || "stage",
    title: node.title || "",
    subtitle: node.subtitle || "",
    description: node.description || "",
    sortOrder: String(node.sortOrder || 100),
    objectText: refs.objectElementIds.join("\n"),
    linkText: refs.linkElementIds.join("\n"),
    functionText: refs.functionElementIds.join("\n"),
    actionText: refs.actionElementIds.join("\n"),
    interfaceText: refs.interfaceElementIds.join("\n"),
  };
}

function draftToNodePayload(
  draft: NodeDraft,
  dictionaryGroupMap?: Map<string, DictionaryGroup>,
  previousReferencesJson?: unknown,
) {
  return {
    nodeKey: draft.nodeKey,
    nodeType: draft.nodeType,
    title: draft.title,
    subtitle: draft.subtitle,
    description: draft.description,
    sortOrder: Number(draft.sortOrder) || 100,
    objectJson: linesToList(draft.objectText),
    linkJson: linesToList(draft.linkText),
    functionJson: linesToList(draft.functionText),
    actionJson: linesToList(draft.actionText),
    interfaceJson: linesToList(draft.interfaceText),
    referencesJson: buildNodeReferencesJson(draft, dictionaryGroupMap, previousReferencesJson),
  };
}

function buildNodeReferencesJson(
  draft: NodeDraft,
  dictionaryGroupMap?: Map<string, DictionaryGroup>,
  previousReferencesJson?: unknown,
) {
  const previous = previousReferencesJson && typeof previousReferencesJson === "object" && !Array.isArray(previousReferencesJson)
    ? previousReferencesJson as Record<string, unknown>
    : {};
  const elementTypes: Array<DictionaryItem["elementType"]> = ["Object", "Link", "Function", "Action", "Interface"];
  const ontologyRefs = {
    objectElementIds: linesToList(draft.objectText),
    linkElementIds: linesToList(draft.linkText),
    functionElementIds: linesToList(draft.functionText),
    actionElementIds: linesToList(draft.actionText),
    interfaceElementIds: linesToList(draft.interfaceText),
  };
  const ontologySelections = Object.fromEntries(
    elementTypes.map((elementType) => [
      elementType,
      buildDictionarySelectionsForType(dictionaryGroupMap, elementType, ontologyRefs[`${elementType.toLowerCase()}ElementIds` as keyof typeof ontologyRefs]),
    ]),
  );
  return {
    ...previous,
    ontologyRefs,
    ontologySelections,
  };
}

function buildDictionarySelectionsForType(
  dictionaryGroupMap: Map<string, DictionaryGroup> | undefined,
  elementType: DictionaryItem["elementType"],
  ids: string[],
) {
  const group = dictionaryGroupMap?.get(elementType);
  const itemMap = new Map((group?.items || []).map((item) => [item.id, item]));
  return ids.map((id) => {
    const item = itemMap.get(id);
    return {
      id,
      label: item?.label || id,
      name: item?.name || id,
      elementType,
      status: item?.status || "legacy",
      primaryConsumers: item?.primaryConsumers || [],
    };
  });
}

function edgeToDraft(edge: FlowEdge): EdgeDraft {
  const condition = edge.conditionJson as { branch?: string; when?: unknown; failureAction?: unknown } | null | undefined;
  return {
    edgeKey: edge.edgeKey,
    fromNodeKey: edge.fromNodeKey,
    toNodeKey: edge.toNodeKey,
    label: edge.label || "",
    branch: typeof condition?.branch === "string" ? condition.branch : "success",
    conditionText: jsonToLines(condition?.when ?? edge.conditionJson),
    failureActionText: jsonToLines(condition?.failureAction),
    sortOrder: String(edge.sortOrder || 100),
  };
}

function draftToEdgePayload(draft: EdgeDraft) {
  return {
    edgeKey: draft.edgeKey,
    fromNodeKey: draft.fromNodeKey,
    toNodeKey: draft.toNodeKey,
    label: draft.label,
    conditionJson: {
      mode: "manual_draft",
      branch: draft.branch,
      when: linesToList(draft.conditionText),
      failureAction: linesToList(draft.failureActionText),
    },
    sortOrder: Number(draft.sortOrder) || 100,
  };
}

function flowToRuleDraft(flow: FlowDetail): RuleDraft {
  return {
    routingText: jsonToLines(flow.routingRulesJson),
    confirmationText: jsonToLines(flow.confirmationGatesJson),
    evidenceText: jsonToLines(flow.evidenceRulesJson),
  };
}

function emptyRuleDraft(): RuleDraft {
  return {
    routingText: "",
    confirmationText: "",
    evidenceText: "",
  };
}

function jsonToLines(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join("\n");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value || "");
}

function linesToList(value: string) {
  return value
    .split(/\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dictionaryOptionsForType(
  dictionaryGroupMap: Map<string, DictionaryGroup>,
  elementType: DictionaryItem["elementType"],
  rawValue: string,
) {
  const group = dictionaryGroupMap.get(elementType);
  const baseOptions = (group?.items || []).map((item) => ({
    value: item.id,
    label: `${item.id} · ${item.name}`,
    hint: [
      item.primaryConsumers?.length ? `适用：${item.primaryConsumers.join(" / ")}` : "",
      item.status || "",
    ].filter(Boolean).join(" · "),
  }));
  const existing = new Set(baseOptions.map((item) => item.value));
  const legacyOptions = linesToList(rawValue)
    .filter((value) => !existing.has(value))
    .map((value) => ({
      value,
      label: `${value} · 旧值`,
      hint: "旧草稿值，尚未映射到字典元素",
    }));
  return [...legacyOptions, ...baseOptions];
}

function textToJsonOrList(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return linesToList(value);
    }
  }
  return linesToList(value);
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  rows = 3,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-300"
      />
    </label>
  );
}

function DictionaryMultiSelectField({
  label,
  value,
  options,
  loading,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  loading?: boolean;
  onChange: (value: string) => void;
}) {
  const selectedValues = linesToList(value);
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <span className="text-[11px] text-slate-400">
          {loading ? "读取字典..." : `已选 ${selectedValues.length}`}
        </span>
      </div>
      <select
        multiple
        value={selectedValues}
        onChange={(event) => {
          const next = Array.from(event.target.selectedOptions).map((option) => option.value);
          onChange(next.join("\n"));
        }}
        className="mt-1 min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="mt-1 text-[11px] leading-5 text-slate-500">
        {options.length
          ? options.slice(0, 2).map((option) => option.hint).filter(Boolean).join("；")
          : "暂无可选字典项"}
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FlowNode[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300"
      >
        {options.map((node) => (
          <option key={node.nodeKey} value={node.nodeKey}>
            {node.title || node.nodeKey}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectTextField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-2 text-center ring-1 ring-amber-100">
      <p className="text-base font-semibold text-slate-950">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StructureStatusBadge({ status, compact = false }: { status: StructureNodeStatus | StructureSourceStatus; compact?: boolean }) {
  const tone = getStructureStatusTone(status);
  return (
    <span
      className={[
        "inline-flex items-center rounded-full font-semibold ring-1",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        tone.className,
      ].join(" ")}
    >
      {tone.label}
    </span>
  );
}

function WorkspaceTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition",
        active
          ? "bg-slate-950 text-white ring-slate-950"
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function formatTargetKind(kind?: string) {
  const map: Record<string, string> = {
    expert_team: "专家团",
    expert: "专家",
    skill: "Skill",
  };
  return map[kind || ""] || kind || "对象";
}

function formatNodeType(nodeType?: string) {
  const map: Record<string, string> = {
    stage: "业务阶段",
    route_decision: "路由判断",
    expert_team: "专家团",
    expert: "专家",
    skill: "Skill",
    mcp_tool: "MCP 工具",
    data_object: "数据对象",
    confirmation_gate: "确认闸",
    evidence: "证据",
  };
  return map[nodeType || ""] || nodeType || "未设置";
}

function formatRollbackRuleSource(value?: string) {
  const map: Record<string, string> = {
    published_contract: "正式版",
    snapshot: "历史快照",
    current_fallback: "当前规则",
  };
  return map[value || ""] || value || "未记录";
}

function getStructureStatusTone(status: StructureNodeStatus | StructureSourceStatus) {
  const map: Record<string, { label: string; className: string }> = {
    synced: {
      label: "已对齐",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    changed: {
      label: "有变化",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    untracked: {
      label: "未建基线",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    missing: {
      label: "源缺失",
      className: "bg-rose-50 text-rose-700 ring-rose-200",
    },
    unbound: {
      label: "未绑真源",
      className: "bg-slate-100 text-slate-600 ring-slate-200",
    },
  };
  return map[status] || map.untracked;
}

function sortStructureNodes(nodes: StructureChangeNode[]) {
  const statusWeight: Record<StructureNodeStatus, number> = {
    missing: 0,
    changed: 1,
    untracked: 2,
    unbound: 3,
    synced: 4,
  };
  return [...nodes].sort((left, right) => {
    const leftWeight = statusWeight[left.status] ?? 99;
    const rightWeight = statusWeight[right.status] ?? 99;
    if (leftWeight !== rightWeight) return leftWeight - rightWeight;
    return left.title.localeCompare(right.title);
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getBlockedWritebackItems(request: ExpertSourceWritebackRequest) {
  return (request.gates || [])
    .filter((gate) => gate.ok !== true)
    .map((gate) => humanizeWritebackGate(gate.key, gate.label));
}

function humanizeWritebackGate(key: string, fallback: string) {
  const map: Record<string, string> = {
    server_dry_run_preview: "服务端候选稿预览还没生成",
    full_diff_confirmed: "当前 Diff 还没完成确认",
    candidate_sha_confirmed: "当前候选稿还没完成确认",
    pre_write_snapshot: "系统还没建立写前快照",
    local_writeback_executor_enabled: "Lab 运行态还没开启本机原子写盘执行器",
    write_enabled: "Lab 运行态还没开启真实写回开关",
    writable_mount: "当前 WorkBuddy 专家源还是只读挂载，系统不能直接写回",
    explicit_user_authorization: "这次操作还没有被记成用户授权",
  };
  return map[key] || fallback;
}

function getWritebackHeadline(request: ExpertSourceWritebackRequest) {
  if (request.writeExecuted) {
    return "这次已经真实写回到专家源，当前正式版已同步完成。";
  }
  const blockedCount = getBlockedWritebackItems(request).length;
  if (request.saveEnabled) {
    return "这次写回条件已经全部通过。";
  }
  if (!blockedCount) {
    return request.saveBlockedReason || "这次点击已经记录，但当前还没有写入专家源。";
  }
  if (blockedCount === 1) {
    return `这次点击已经视为你同意，但还不能真实写回：${getBlockedWritebackItems(request)[0]}。`;
  }
  return `这次点击已经视为你同意，但还不能真实写回，还差 ${blockedCount} 项运行态条件。`;
}

function getWritebackNextAction(request: ExpertSourceWritebackRequest) {
  if (request.writeExecuted) return "如果后面还改了画布，再次发布后重新点一次即可覆盖同步。";
  if (request.saveEnabled) return "运行态条件已经齐了，这次请求应当可以直接写回。";
  const blockedKeys = new Set((request.gates || []).filter((gate) => gate.ok !== true).map((gate) => gate.key));
  if (blockedKeys.has("local_writeback_executor_enabled")) {
    return "要真正写进去，需要先在 Lab 运行态开启本机原子写盘执行器，然后再点一次写回专家源。";
  }
  if (blockedKeys.has("write_enabled") || blockedKeys.has("writable_mount")) {
    return "要真正写进去，只需要把 expert-source 改成可写挂载，并开启真实写回开关，然后再点一次写回专家源。";
  }
  if (blockedKeys.has("pre_write_snapshot")) {
    return "要真正写进去，需要先建立写前快照，然后再继续。";
  }
  if (blockedKeys.has("full_diff_confirmed") || blockedKeys.has("candidate_sha_confirmed")) {
    return "要真正写进去，需要先确认这次候选稿和 Diff。";
  }
  return null;
}

function humanizePublishSyncStatus(status: string) {
  const map: Record<string, string> = {
    synced: "已同步",
    partial: "部分同步",
    blocked: "同步阻断",
    publish_only: "仅发布",
    written_and_verified: "已写成",
    already_in_sync: "已对齐",
    written_but_verification_failed: "校验失败",
    blocked_before_write: "写前阻断",
    sync_failed: "同步失败",
  };
  return map[status] || status || "未记录";
}

function getPublishSyncHeadline(result: PublishAndSyncResult | null) {
  if (!result) return "发布同步结果已生成。";
  const versionNo = result.publish?.versionNo ? `v${result.publish.versionNo}` : "新版本";
  if (result.sync.status === "synced") {
    return `正式契约 ${versionNo} 已发布，并已同步 ${result.sync.syncedCount}/${result.sync.targetCount} 个专家源目标。`;
  }
  if (result.sync.status === "partial") {
    return `正式契约 ${versionNo} 已发布，但专家源只完成部分同步：成功 ${result.sync.syncedCount}，阻断 ${result.sync.blockedCount + result.sync.verificationFailedCount}。`;
  }
  if (result.sync.status === "blocked") {
    return `正式契约 ${versionNo} 已发布，但专家源同步还没全部走通。`;
  }
  return `正式契约 ${versionNo} 已发布。`;
}

function PanelTitle({ icon, title, inverse = false }: { icon: ReactNode; title: string; inverse?: boolean }) {
  return (
    <div className={["flex items-center gap-2 text-sm font-semibold", inverse ? "text-white" : "text-slate-900"].join(" ")}>
      <span className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-xl ring-1",
        inverse ? "bg-white/10 text-white ring-white/10" : "bg-slate-100 text-slate-700 ring-slate-200",
      ].join(" ")}>
        {icon}
      </span>
      {title}
    </div>
  );
}
