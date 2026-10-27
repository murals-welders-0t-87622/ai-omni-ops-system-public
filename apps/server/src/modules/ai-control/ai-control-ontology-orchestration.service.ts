import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as MdWriter from "@ai-omni/shared/md-writer-core";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaService } from "../../prisma/prisma.service";
import { GlmOpenService } from "../third-party-platforms/glm-open.service";
import { ThirdPartyPlatformsService } from "../third-party-platforms/third-party-platforms.service";
import { WorkflowCoreService } from "../workflow-core/workflow-core.service";
import { AiControlMdWriterService } from "./ai-control-md-writer.service";

type FiveElementNodeInput = {
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

type FlowEdgeInput = {
  edgeKey: string;
  fromNodeKey: string;
  toNodeKey: string;
  label?: string;
  conditionJson?: unknown;
  sortOrder?: number;
};

type OntologyElementReferenceInput = {
  id?: string;
  kind?: string;
  label?: string;
  name?: string;
  refType?: string;
  path?: string;
  description?: string;
  count?: number;
};

export type OntologyFlowDraftInput = {
  flowKey?: string;
  name?: string;
  description?: string;
  status?: string;
  brandId?: string | null;
  workspaceScope?: string;
  targetKind?: string;
  targetId?: string;
  targetName?: string;
  sourceRefsJson?: unknown;
  routingRulesJson?: unknown;
  confirmationGatesJson?: unknown;
  evidenceRulesJson?: unknown;
  createdBy?: string;
  nodes?: FiveElementNodeInput[];
  edges?: FlowEdgeInput[];
};

export type OntologyAiDraftGenerateInput = {
  flowKey?: string;
  name?: string;
  description?: string;
  model?: string;
  forceRegenerate?: boolean;
  brandId?: string | null;
  workspaceScope?: string;
  targetKind?: string;
  targetId?: string;
  targetName?: string;
  sourceRefsJson?: unknown;
  createdBy?: string;
};

export type OntologyNodeReferencesInput = {
  references?: OntologyElementReferenceInput[];
  updatedBy?: string;
  note?: string;
};

export type OntologyNodeDraftInput = Partial<FiveElementNodeInput> & {
  updatedBy?: string;
  note?: string;
  rebuildSequentialEdges?: boolean;
};

export type OntologyEdgeDraftInput = Partial<FlowEdgeInput> & {
  updatedBy?: string;
  note?: string;
};

export type OntologyFlowRulesInput = {
  routingRulesJson?: unknown;
  confirmationGatesJson?: unknown;
  evidenceRulesJson?: unknown;
  updatedBy?: string;
  note?: string;
};

export type OntologyPublishInput = {
  candidateHash?: string;
  confirmPublish?: boolean;
  publishedBy?: string;
  note?: string;
};

export type OntologyPublishAndSyncInput = OntologyPublishInput & {
  syncExpertSource?: boolean;
  createPreWriteSnapshot?: boolean | null;
  explicitUserAuthorized?: boolean | null;
  requestedBy?: string;
};

export type OntologyExpertSourceWritebackRequestInput = {
  targetPath?: string | null;
  confirmDiffSha256?: string | null;
  confirmCandidateSha256?: string | null;
  createPreWriteSnapshot?: boolean | null;
  explicitUserAuthorized?: boolean | null;
  requestedBy?: string;
  note?: string;
};

export type OntologyPublishedContractQuery = {
  flowIdOrKey?: string;
  flowKey?: string;
  brandId?: string | null;
  targetKind?: string;
  targetId?: string;
};

export type OntologyExecutionPlanQuery = OntologyPublishedContractQuery & {
  userIntent?: string;
  taskId?: string;
};

export type OntologyExecutionPlanEvidenceInput = OntologyExecutionPlanQuery & {
  taskId?: string;
  stageRunId?: string;
  subjectKind?: "expert" | "skill";
  subjectId?: string;
  invocationId?: string;
  parentInvocationId?: string;
  attemptNo?: number;
  confirmedBy?: string;
  confirmationNote?: string;
  idempotencyKey?: string;
  confirmPreflightOnly?: boolean;
};

export type OntologyExecutionNodeEvidenceInput = OntologyExecutionPlanQuery & {
  taskId?: string;
  stageRunId?: string;
  nodeKey?: string;
  nodeStatus?: "started" | "succeeded" | "failed" | "blocked";
  subjectKind?: "expert" | "skill";
  subjectId?: string;
  invocationId?: string;
  parentInvocationId?: string;
  attemptNo?: number;
  outcome?: string;
  errorCode?: string;
  errorMessage?: string;
  blockedReason?: string;
  requiresConfirmation?: boolean;
  confirmGateSatisfied?: boolean;
  idempotencyKey?: string;
  confirmControlledExecutionOnly?: boolean;
};

type OntologyConfirmationGateRule = {
  gate: string;
  mode: string;
  reason: string;
};

type ExpertSourceSyncTarget = {
  kind: "expert" | "skill" | "prompt";
  relPath: string;
  label: string;
  source: string;
};

type ExpertSourceSyncImpact = {
  nodeKeys: string[];
  nodeTitles: string[];
};

type OntologyDictionaryItem = {
  id: string;
  kind: string;
  label: string;
  name: string;
  refType: string;
  description: string;
  elementType: "Object" | "Link" | "Function" | "Action" | "Interface";
  status: string;
  source: string;
  primaryConsumers: string[];
  bindings: string[];
};

type OntologyDictionaryScope = "all" | "active_seed";

const AI_DRAFT_DICTIONARY_SCOPE: OntologyDictionaryScope = "all";

type OntologyActiveSeedConfig = {
  metadata?: {
    updatedAt?: string;
    sourceDoc?: string;
    boundary?: string;
  };
  activeIds?: Partial<Record<OntologyDictionaryItem["elementType"], string[]>>;
  extraItems?: OntologyDictionaryItem[];
};

type OntologyDictionarySeedConfig = {
  metadata?: Record<string, unknown>;
  items?: OntologyDictionaryItem[];
};

type OntologyDictionaryLookup = {
  byId: Map<string, OntologyDictionaryItem>;
  byAlias: Map<string, OntologyDictionaryItem>;
};

const DEFAULT_FLOW_KEY = "s3_02_material_reuse_orchestration";

@Injectable()
export class AiControlOntologyOrchestrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowCore: WorkflowCoreService,
    private readonly mdWriter: AiControlMdWriterService,
    private readonly glmOpenService: GlmOpenService,
    private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService,
  ) {}

  async getElementLibrary(forceRefresh = false) {
    const tree = await this.mdWriter.listTree({ filesOnly: true, forceRefresh });
    const agents = this.buildExpertTargetElements(
      (tree as any)?.tree?.agents,
      (tree as any)?.source_root,
      Array.isArray((tree as any)?.plugins) ? (tree as any).plugins : [],
    );
    const skills = this.treeEntriesToElements((tree as any)?.tree?.skills, "skill", "Skill");
    const references = this.treeEntriesToElements((tree as any)?.tree?.references, "reference", "资料");
    const mcpTools = this.mcpToolElements();
    const dataObjects = await this.dataObjectElements();
    const aiControlPanels = this.aiControlPanelElements();

    return {
      ok: true,
      generated: false,
      groups: [
        {
          key: "experts",
          title: "专家团 / 专家",
          source: "expert-source/agents",
          total: agents.length,
          items: agents,
        },
        {
          key: "skills",
          title: "Skill",
          source: "expert-source/skills",
          total: skills.length,
          items: skills.slice(0, 24),
        },
        {
          key: "mcp_tools",
          title: "MCP 工具",
          source: "apps/server/src/modules/ai-control/data/ontology-mcp-tool.seed.json",
          total: mcpTools.length,
          items: mcpTools,
        },
        {
          key: "data_objects",
          title: "中台数据对象",
          source: "Lab database counts",
          total: dataObjects.length,
          items: dataObjects,
        },
        {
          key: "ai_control_panels",
          title: "AI 中台功能",
          source: "AI Control routes",
          total: aiControlPanels.length,
          items: aiControlPanels,
        },
        {
          key: "references",
          title: "资料 / 契约",
          source: "expert-source/references",
          total: references.length,
          items: references.slice(0, 12),
        },
      ],
      sourceSummary: {
        sourceRoot: (tree as any)?.source_root ?? null,
        sourceMode: (tree as any)?.source_mode ?? null,
        pluginCount: (tree as any)?.plugin_count ?? 0,
        expertCount: agents.length,
        skillCount: skills.length,
        referenceCount: references.length,
      },
      boundary: "只读聚合元素库，不修改专家真源，不调用模型，不发布执行契约。",
    };
  }

  async getElementDictionary(_scope?: string) {
    const atlas = this.readOntologyAtlas("all");
    const groups: Array<{ key: string; title: string; total: number; items: OntologyDictionaryItem[] }> = [
      { key: "object", title: "Object", total: 0, items: [] },
      { key: "link", title: "Link", total: 0, items: [] },
      { key: "function", title: "Function", total: 0, items: [] },
      { key: "action", title: "Action", total: 0, items: [] },
      { key: "interface", title: "Interface", total: 0, items: [] },
    ];
    const groupMap = new Map(groups.map((group) => [group.key, group]));

    for (const item of atlas.items) {
      const key = item.elementType.toLowerCase();
      const group = groupMap.get(key);
      if (!group) continue;
      group.items.push(item);
    }
    for (const group of groups) {
      group.items.sort((left, right) => left.id.localeCompare(right.id));
      group.total = group.items.length;
    }

    return {
      ok: true,
      generated: false,
      scope: "all",
      source: atlas.source,
      groups,
      summary: {
        objectCount: groupMap.get("object")?.items.length || 0,
        linkCount: groupMap.get("link")?.items.length || 0,
        functionCount: groupMap.get("function")?.items.length || 0,
        actionCount: groupMap.get("action")?.items.length || 0,
        interfaceCount: groupMap.get("interface")?.items.length || 0,
      },
      boundary: "只读返回 Ontology 五元素候选全集，不写草稿、不发布契约、不修改专家真源。",
    };
  }

  async listFlows(options: { brandId?: string; limit?: number }) {
    await this.ensureDatabase();
    const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
    const flows = await this.prisma.ontologyOrchestrationFlow.findMany({
      where: options.brandId ? { brandId: options.brandId } : undefined,
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        _count: {
          select: {
            nodes: true,
            edges: true,
            versions: true,
          },
        },
      },
    });

    return {
      ok: true,
      generated: false,
      items: flows.map((flow) => ({
        id: flow.id,
        flowKey: flow.flowKey,
        name: flow.name,
        description: flow.description,
        status: flow.status,
        brandId: flow.brandId,
        workspaceScope: flow.workspaceScope,
        targetKind: flow.targetKind,
        targetId: flow.targetId,
        targetName: flow.targetName,
        updatedAt: flow.updatedAt,
        nodeCount: flow._count.nodes,
        edgeCount: flow._count.edges,
        versionCount: flow._count.versions,
      })),
      boundary: "只读取 Ontology 编排流程列表，不调用模型，不触发 WorkBuddy 执行。",
    };
  }

  async getFlow(flowIdOrKey: string) {
    await this.ensureDatabase();
    const normalized = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const flow = await this.prisma.ontologyOrchestrationFlow.findFirst({
      where: {
        OR: [
          { id: normalized },
          { flowKey: normalized },
        ],
      },
      include: {
        nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        edges: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        versions: { orderBy: { versionNo: "desc" }, take: 5 },
      },
    });
    if (!flow) {
      throw new BadRequestException(`编排流程不存在：${normalized}`);
    }
    return {
      ok: true,
      generated: false,
      item: flow,
      boundary: "读取草稿详情，不触发发布或执行。",
    };
  }

  async scanStructure(flowIdOrKey: string) {
    return this.buildStructureChangesReport(flowIdOrKey, "structure_scan");
  }

  async getStructureChanges(flowIdOrKey: string) {
    return this.buildStructureChangesReport(flowIdOrKey, "structure_changes_read");
  }

  async syncCanvasFromExpertTeam(flowIdOrKey: string, input: { updatedBy?: string; note?: string } = {}) {
    await this.ensureDatabase();
    const normalized = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const flow = await this.prisma.ontologyOrchestrationFlow.findFirst({
      where: {
        OR: [
          { id: normalized },
          { flowKey: normalized },
        ],
      },
      include: {
        nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        edges: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!flow) {
      throw new BadRequestException(`编排流程不存在：${normalized}`);
    }
    if (this.optionalText(flow.targetKind, 64).toLowerCase() !== "expert_team") {
      throw new BadRequestException("只有绑定专家团的 Ontology 项目，才支持从专家团注册表同步更新画布。");
    }

    const sourceRefs = this.asRecord(flow.sourceRefsJson);
    const selectedTarget = this.asRecord(sourceRefs.selected_target);
    const targetId = this.optionalText(flow.targetId, 256) || this.optionalText(selectedTarget.id, 256);
    const sourcePath = this.resolveAiDraftTargetPath(targetId || "", selectedTarget)
      || this.optionalText(selectedTarget.path, 1000)
      || this.optionalText(selectedTarget.id, 1000);
    const declaredSourceRoot = this.optionalText(selectedTarget.sourceRoot, 1000);
    if (!sourcePath) {
      throw new BadRequestException("当前专家团项目缺少可读取的专家团真源路径，暂时无法同步更新画布。");
    }
    const sourceDoc = MdWriter.readMarkdownAtomic(sourcePath);
    const updatedBy = this.optionalText(input.updatedBy, 128) || "ai-control-ui";
    const note = this.optionalText(input.note, 500) || "从专家团注册表检测并更新画布";

    const registryDraft = this.buildExpertTeamRegistryDraft(
      "expert_team",
      sourcePath,
      this.optionalText(flow.targetName, 256) || flow.name,
      declaredSourceRoot,
    );
    if (!registryDraft) {
      const backfilledNodes = flow.nodes.map((node) => {
        const inferredBindings = this.inferAiDraftNodeBindings(
          {
            nodeKey: node.nodeKey,
            nodeType: node.nodeType,
            title: node.title,
            subtitle: node.subtitle || "",
            description: node.description || "",
          },
          {
            targetKind: "expert_team",
            targetId: targetId || this.optionalText(flow.targetId, 256),
            targetName: this.optionalText(flow.targetName, 256) || flow.name,
            sourcePath: sourceDoc.rel_posix,
            sourceMarkdown: sourceDoc.md_text,
          },
        );
        return {
          nodeKey: node.nodeKey,
          nodeType: node.nodeType,
          title: node.title,
          subtitle: node.subtitle || "",
          description: node.description || "",
          positionX: this.safeOptionalInt(node.positionX) ?? 0,
          positionY: this.safeOptionalInt(node.positionY) ?? 0,
          sortOrder: this.safeOptionalInt(node.sortOrder) ?? 0,
          objectJson: node.objectJson,
          linkJson: node.linkJson,
          functionJson: node.functionJson,
          actionJson: node.actionJson,
          interfaceJson: node.interfaceJson,
          referencesJson: inferredBindings.length
            ? this.mergeNodeReferencesJson(node.referencesJson, inferredBindings, {
              updatedBy,
              note,
            })
            : (node.referencesJson ?? {}),
        };
      });
      const changedNodeKeys = backfilledNodes
        .filter((node) => this.serializeBoundElementIds((node.referencesJson as Record<string, unknown>)?.boundElements)
          !== this.serializeBoundElementIds(this.boundElements(flow.nodes.find((item) => item.nodeKey === node.nodeKey)?.referencesJson)))
        .map((node) => node.nodeKey);
      if (!changedNodeKeys.length) {
        throw new BadRequestException("当前专家团真源还不能被注册表编译器完整展开，且现有 AI 草案节点也未识别到可回填的真源绑定，请先确认 README / expert-registry / skill-registry 是否齐全，或检查专家文档中的展示名与引用路径。");
      }
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.ontologyOrchestrationNode.deleteMany({ where: { flowId: flow.id } });
        await tx.ontologyOrchestrationEdge.deleteMany({ where: { flowId: flow.id } });
        await tx.ontologyOrchestrationNode.createMany({
          data: backfilledNodes.map((node, index) => this.toNodeCreateInput(flow.id, node, index)),
        });
        await tx.ontologyOrchestrationEdge.createMany({
          data: flow.edges.map((edge, index) => this.toEdgeCreateInput(flow.id, {
            edgeKey: edge.edgeKey,
            fromNodeKey: edge.fromNodeKey,
            toNodeKey: edge.toNodeKey,
            label: edge.label || "",
            conditionJson: edge.conditionJson ?? {},
            sortOrder: this.safeOptionalInt(edge.sortOrder) ?? 0,
          }, index)),
        });
        const version = await this.createFlowSnapshot(tx, flow.id, "ai_draft_binding_sync_snapshot", updatedBy, {
          changeKind: "ai_draft_binding_sync",
          note,
          syncSummary: {
            changedNodeKeys,
            nodeCount: backfilledNodes.length,
          },
        });
        const saved = await tx.ontologyOrchestrationFlow.findUnique({
          where: { id: flow.id },
          include: {
            nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
            edges: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
            versions: { orderBy: { versionNo: "desc" }, take: 5 },
          },
        });
        return { flow: saved, version };
      });
      return {
        ok: true,
        generated: false,
        item: result.flow,
        version: result.version,
        syncSummary: {
          changedNodeKeys,
        },
        boundary: "当前专家团未走注册表编译器时，按普通 AI 草案节点标题与专家文档展示名回填真源绑定；不发布，不写 WorkBuddy 真源。",
      };
    }

    const existingNodeMap = new Map(flow.nodes.map((node) => [node.nodeKey, node]));
    const existingEdgeMap = new Map(flow.edges.map((edge) => [edge.edgeKey, edge]));
    const retainedManualNodes = flow.nodes.filter((node) => !this.isExpertTeamRegistryManagedNode(node));
    const retainedManualEdges = flow.edges.filter((edge) => !this.isExpertTeamRegistryManagedEdge(edge));

    const compiledNodeKeys = new Set(registryDraft.nodes.map((node) => node.nodeKey));
    const compiledEdgeKeys = new Set(registryDraft.edges.map((edge) => edge.edgeKey));
    const mergedCompiledNodes = registryDraft.nodes.map((node) => {
      const existing = existingNodeMap.get(node.nodeKey);
      return {
        ...node,
        positionX: this.safeOptionalInt(existing?.positionX) ?? node.positionX,
        positionY: this.safeOptionalInt(existing?.positionY) ?? node.positionY,
        sortOrder: this.safeOptionalInt(existing?.sortOrder) ?? node.sortOrder,
        objectJson: existing?.objectJson ?? node.objectJson,
        linkJson: existing?.linkJson ?? node.linkJson,
        functionJson: existing?.functionJson ?? node.functionJson,
        actionJson: existing?.actionJson ?? node.actionJson,
        interfaceJson: existing?.interfaceJson ?? node.interfaceJson,
        referencesJson: node.referencesJson ?? existing?.referencesJson ?? {},
      };
    });
    const mergedCompiledEdges = registryDraft.edges.map((edge) => {
      const existing = existingEdgeMap.get(edge.edgeKey);
      return {
        ...edge,
        label: edge.label ?? existing?.label ?? "",
        sortOrder: this.safeOptionalInt(existing?.sortOrder) ?? edge.sortOrder,
        conditionJson: existing?.conditionJson ?? edge.conditionJson ?? {},
      };
    });
    const nodes = [...mergedCompiledNodes, ...retainedManualNodes.map((node) => ({
      nodeKey: node.nodeKey,
      nodeType: node.nodeType,
      title: node.title,
      subtitle: node.subtitle || "",
      description: node.description || "",
      positionX: this.safeOptionalInt(node.positionX) ?? 0,
      positionY: this.safeOptionalInt(node.positionY) ?? 0,
      sortOrder: this.safeOptionalInt(node.sortOrder) ?? 0,
      objectJson: node.objectJson,
      linkJson: node.linkJson,
      functionJson: node.functionJson,
      actionJson: node.actionJson,
      interfaceJson: node.interfaceJson,
      referencesJson: node.referencesJson ?? {},
    }))];
    const nodeKeyUniverse = new Set(nodes.map((node) => node.nodeKey));
    const validCompiledEdges = mergedCompiledEdges.filter((edge) => nodeKeyUniverse.has(edge.fromNodeKey) && nodeKeyUniverse.has(edge.toNodeKey));
    const prunedDanglingCompiledEdgeKeys = mergedCompiledEdges
      .filter((edge) => !nodeKeyUniverse.has(edge.fromNodeKey) || !nodeKeyUniverse.has(edge.toNodeKey))
      .map((edge) => edge.edgeKey);
    const validRetainedManualEdges = retainedManualEdges.filter((edge) => nodeKeyUniverse.has(edge.fromNodeKey) && nodeKeyUniverse.has(edge.toNodeKey));
    const prunedDanglingManualEdgeKeys = retainedManualEdges
      .filter((edge) => !nodeKeyUniverse.has(edge.fromNodeKey) || !nodeKeyUniverse.has(edge.toNodeKey))
      .map((edge) => edge.edgeKey);
    const edges = [...validCompiledEdges, ...validRetainedManualEdges.map((edge) => ({
      edgeKey: edge.edgeKey,
      fromNodeKey: edge.fromNodeKey,
      toNodeKey: edge.toNodeKey,
      label: edge.label || "",
      conditionJson: edge.conditionJson ?? {},
      sortOrder: this.safeOptionalInt(edge.sortOrder) ?? 0,
    }))];
    const addedNodeKeys = registryDraft.nodes.filter((node) => !existingNodeMap.has(node.nodeKey)).map((node) => node.nodeKey);
    const removedNodeKeys = flow.nodes
      .filter((node) => this.isExpertTeamRegistryManagedNode(node) && !compiledNodeKeys.has(node.nodeKey))
      .map((node) => node.nodeKey);
    const addedEdgeKeys = registryDraft.edges.filter((edge) => !existingEdgeMap.has(edge.edgeKey)).map((edge) => edge.edgeKey);
    const removedEdgeKeys = flow.edges
      .filter((edge) => this.isExpertTeamRegistryManagedEdge(edge) && !compiledEdgeKeys.has(edge.edgeKey))
      .map((edge) => edge.edgeKey);
    const mergedRemovedEdgeKeys = Array.from(new Set([...removedEdgeKeys, ...prunedDanglingCompiledEdgeKeys, ...prunedDanglingManualEdgeKeys]));
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.ontologyOrchestrationNode.deleteMany({ where: { flowId: flow.id } });
      await tx.ontologyOrchestrationEdge.deleteMany({ where: { flowId: flow.id } });
      await tx.ontologyOrchestrationNode.createMany({
        data: nodes.map((node, index) => this.toNodeCreateInput(flow.id, node, index)),
      });
      await tx.ontologyOrchestrationEdge.createMany({
        data: edges.map((edge, index) => this.toEdgeCreateInput(flow.id, edge, index)),
      });
      await tx.ontologyOrchestrationFlow.update({
        where: { id: flow.id },
        data: {
          description: registryDraft.description || flow.description,
        },
      });
      const version = await this.createFlowSnapshot(tx, flow.id, "expert_team_canvas_sync_snapshot", updatedBy, {
        changeKind: "expert_team_canvas_sync",
        note,
        syncSummary: {
          compiledNodeCount: registryDraft.nodes.length,
          compiledEdgeCount: registryDraft.edges.length,
          retainedManualNodeCount: retainedManualNodes.length,
          retainedManualEdgeCount: validRetainedManualEdges.length,
          addedNodeKeys,
          removedNodeKeys,
          addedEdgeKeys,
          removedEdgeKeys: mergedRemovedEdgeKeys,
          prunedDanglingCompiledEdgeKeys,
          prunedDanglingManualEdgeKeys,
        },
      });
      const saved = await tx.ontologyOrchestrationFlow.findUnique({
        where: { id: flow.id },
        include: {
          nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          edges: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          versions: { orderBy: { versionNo: "desc" }, take: 5 },
        },
      });
      return { flow: saved, version };
    });

    return {
      ok: true,
      generated: false,
      item: result.flow,
      version: result.version,
      syncSummary: {
        addedNodeKeys,
        removedNodeKeys,
        addedEdgeKeys,
        removedEdgeKeys: mergedRemovedEdgeKeys,
        prunedDanglingCompiledEdgeKeys,
        prunedDanglingManualEdgeKeys,
      },
      boundary: "按专家团注册表受控更新当前画布；注册表托管节点会同步增删改，凡是指向不存在节点的托管/手工残留断边都会被自动清理。",
    };
  }

  async listFlowVersions(flowIdOrKey: string) {
    await this.ensureDatabase();
    const normalized = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const flow = await this.prisma.ontologyOrchestrationFlow.findFirst({
      where: {
        OR: [
          { id: normalized },
          { flowKey: normalized },
        ],
      },
      include: {
        versions: { orderBy: { versionNo: "desc" }, take: 20 },
      },
    });
    if (!flow) {
      throw new BadRequestException(`编排流程不存在：${normalized}`);
    }

    return {
      ok: true,
      generated: false,
      item: {
        flowId: flow.id,
        flowKey: flow.flowKey,
        targetKind: flow.targetKind,
        targetId: flow.targetId,
        targetName: flow.targetName,
        versions: flow.versions
          .filter((version) => this.isVersionVisibleInRollback(version.status, version.snapshotJson))
          .map((version) => this.toRollbackVersionSummary(version)),
      },
      boundary: "只读返回当前 Ontology 项目的历史快照与发布版本列表；不修改画布，不发布，不写 WorkBuddy 真源。",
    };
  }

  async listNodeVersions(flowIdOrKey: string, nodeKey: string) {
    await this.ensureDatabase();
    const normalized = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const normalizedNodeKey = this.requiredText(nodeKey, "nodeKey 必填", 128);
    const flow = await this.prisma.ontologyOrchestrationFlow.findFirst({
      where: {
        OR: [
          { id: normalized },
          { flowKey: normalized },
        ],
      },
      include: {
        nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        versions: { orderBy: { versionNo: "desc" }, take: 20 },
      },
    });
    if (!flow) {
      throw new BadRequestException(`编排流程不存在：${normalized}`);
    }

    const currentNode = flow.nodes.find((node) => node.nodeKey === normalizedNodeKey) || null;
    const versions = flow.versions
      .filter((version) => this.isVersionVisibleInNodeRollback(version.status, version.snapshotJson))
      .map((version) => this.toNodeVersionSummary(version, normalizedNodeKey))
      .filter(Boolean);

    return {
      ok: true,
      generated: false,
      item: {
        flowId: flow.id,
        flowKey: flow.flowKey,
        targetKind: flow.targetKind,
        targetId: flow.targetId,
        targetName: flow.targetName,
        nodeKey: normalizedNodeKey,
        nodeTitle: this.optionalText(currentNode?.title, 256) || this.optionalText(versions[0]?.title, 256) || normalizedNodeKey,
        nodeType: this.optionalText(currentNode?.nodeType, 64) || this.optionalText(versions[0]?.nodeType, 64) || "stage",
        versions,
      },
      boundary: "只读返回当前节点自己的历史快照摘要；不混入整项目正式发布版本，不修改画布，不回退，不发布，不写 WorkBuddy 真源。",
    };
  }

  async createRollbackDraft(
    flowIdOrKey: string,
    input: {
      versionId?: string;
      versionNo?: number;
      rollbackBy?: string;
      note?: string;
    } = {},
  ) {
    await this.ensureDatabase();
    const normalized = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const rollbackBy = this.optionalText(input.rollbackBy, 128) || "ai-control-ui";
    const note = this.optionalText(input.note, 500);

    const result = await this.prisma.$transaction(async (tx) => {
      const flow = await this.getDraftFlowForMutation(tx, normalized);
      const sourceVersion = await this.resolveRollbackSourceVersion(tx, flow.id, input);
      const restored = this.buildRollbackDraftPayload(sourceVersion, flow);

      await tx.ontologyOrchestrationNode.deleteMany({ where: { flowId: flow.id } });
      await tx.ontologyOrchestrationEdge.deleteMany({ where: { flowId: flow.id } });

      if (restored.nodes.length) {
        await tx.ontologyOrchestrationNode.createMany({
          data: restored.nodes.map((node, index) => this.toNodeCreateInput(flow.id, node, index)),
        });
      }
      if (restored.edges.length) {
        await tx.ontologyOrchestrationEdge.createMany({
          data: restored.edges.map((edge, index) => this.toEdgeCreateInput(flow.id, edge, index)),
        });
      }

      await tx.ontologyOrchestrationFlow.update({
        where: { id: flow.id },
        data: {
          routingRulesJson: this.json(restored.routingRulesJson),
          confirmationGatesJson: this.json(restored.confirmationGatesJson),
          evidenceRulesJson: this.json(restored.evidenceRulesJson),
          updatedAt: new Date(),
        },
      });

      const version = await this.createFlowSnapshot(tx, flow.id, "rollback_draft_snapshot", rollbackBy, {
        changeKind: "rollback_draft_created",
        rollbackSourceVersionId: sourceVersion.id,
        rollbackSourceVersionNo: sourceVersion.versionNo,
        rollbackSourceStatus: sourceVersion.status,
        rollbackRuleSource: restored.ruleSource,
        note,
      });

      const saved = await tx.ontologyOrchestrationFlow.findUnique({
        where: { id: flow.id },
        include: {
          nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          edges: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          versions: { orderBy: { versionNo: "desc" }, take: 5 },
        },
      });

      return {
        flow: saved,
        version,
        sourceVersion,
        restored,
      };
    });

    return {
      ok: true,
      generated: false,
      published: false,
      item: result.flow,
      version: result.version,
      rollback: {
        sourceVersion: this.toRollbackVersionSummary(result.sourceVersion),
        restoredNodeCount: result.restored.nodes.length,
        restoredEdgeCount: result.restored.edges.length,
        ruleSource: result.restored.ruleSource,
      },
      boundary: "只把指定历史版本生成新的回退草稿并回到当前主画布；不删除历史 published_contract，不直接回滚正式版，不写 WorkBuddy 真源。",
    };
  }

  async createNodeRollbackDraft(
    flowIdOrKey: string,
    nodeKeyRaw: string,
    input: {
      versionId?: string;
      versionNo?: number;
      rollbackBy?: string;
      note?: string;
    } = {},
  ) {
    await this.ensureDatabase();
    const normalized = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const nodeKey = this.requiredText(nodeKeyRaw, "nodeKey 必填", 128);
    const rollbackBy = this.optionalText(input.rollbackBy, 128) || "ai-control-ui";
    const note = this.optionalText(input.note, 500);

    const result = await this.prisma.$transaction(async (tx) => {
      const flow = await this.getDraftFlowForMutation(tx, normalized);
      const currentNode = await tx.ontologyOrchestrationNode.findUnique({
        where: {
          flowId_nodeKey: {
            flowId: flow.id,
            nodeKey,
          },
        },
      });
      if (!currentNode) {
        throw new BadRequestException(`当前流程里不存在节点：${nodeKey}`);
      }

      const sourceVersion = await this.resolveRollbackSourceVersion(tx, flow.id, input);
      const restoredNode = this.buildRollbackNodePayload(sourceVersion, nodeKey);

      await tx.ontologyOrchestrationNode.update({
        where: { id: currentNode.id },
        data: this.toNodeUpdateInput(restoredNode),
      });

      const version = await this.createFlowSnapshot(tx, flow.id, "node_edit_snapshot", rollbackBy, {
        changeKind: "node_rollback_draft_created",
        rollbackSourceVersionId: sourceVersion.id,
        rollbackSourceVersionNo: sourceVersion.versionNo,
        rollbackSourceStatus: sourceVersion.status,
        rollbackNodeKey: nodeKey,
        note,
      });

      const saved = await tx.ontologyOrchestrationFlow.findUnique({
        where: { id: flow.id },
        include: {
          nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          edges: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          versions: { orderBy: { versionNo: "desc" }, take: 5 },
        },
      });

      return {
        flow: saved,
        version,
        sourceVersion,
        restoredNode,
      };
    });

    return {
      ok: true,
      generated: false,
      published: false,
      item: result.flow,
      version: result.version,
      rollback: {
        sourceVersion: this.toRollbackVersionSummary(result.sourceVersion),
        nodeKey,
        restoredNodeTitle: this.optionalText(result.restoredNode.title, 256) || nodeKey,
      },
      boundary: "只把指定历史版本里的当前节点恢复成新的节点草稿；不替换整张画布，不删除历史 published_contract，不直接回滚正式版，不写 WorkBuddy 真源。",
    };
  }

  async deleteFlow(flowIdOrKey: string, input: { deletedBy?: string; note?: string } = {}) {
    await this.ensureDatabase();
    const normalized = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const flow = await this.prisma.ontologyOrchestrationFlow.findFirst({
      where: {
        OR: [
          { id: normalized },
          { flowKey: normalized },
        ],
      },
      include: {
        _count: {
          select: {
            nodes: true,
            edges: true,
            versions: true,
          },
        },
      },
    });
    if (!flow) {
      throw new BadRequestException(`编排流程不存在：${normalized}`);
    }

    const deletedBy = this.optionalText(input.deletedBy, 128) || "ai-control-ui";
    const note = this.optionalText(input.note, 500);
    await this.prisma.ontologyOrchestrationFlow.delete({
      where: { id: flow.id },
    });

    return {
      ok: true,
      deleted: true,
      item: {
        id: flow.id,
        flowKey: flow.flowKey,
        name: flow.name,
        status: flow.status,
        targetKind: flow.targetKind,
        targetId: flow.targetId,
        targetName: flow.targetName,
        deletedBy,
        note: note || null,
        deletedAt: new Date().toISOString(),
        nodeCount: flow._count.nodes,
        edgeCount: flow._count.edges,
        versionCount: flow._count.versions,
      },
      boundary: "删除指定 Ontology 编排项目及其节点、连线、版本快照；不修改 WorkBuddy 专家真源，不触发执行。",
    };
  }

  async getPublishPreview(flowIdOrKey: string) {
    await this.ensureDatabase();
    const normalized = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const flow = await this.prisma.ontologyOrchestrationFlow.findFirst({
      where: {
        OR: [
          { id: normalized },
          { flowKey: normalized },
        ],
      },
      include: {
        nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        edges: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        versions: { orderBy: { versionNo: "desc" }, take: 20 },
      },
    });
    if (!flow) {
      throw new BadRequestException(`编排流程不存在：${normalized}`);
    }

    const nodeKeys = new Set(flow.nodes.map((node) => node.nodeKey));
    const riskChecks = [
      ...this.flowPublishRiskChecks(flow),
      ...flow.nodes.flatMap((node) => this.nodePublishRiskChecks(node)),
      ...flow.edges.flatMap((edge) => this.edgePublishRiskChecks(edge, nodeKeys)),
    ];
    const latestSnapshot = flow.versions[0] || null;
    const latestPublished = flow.versions.find((version) => version.status === "published_contract") || null;
    const dictionary = this.readOntologyAtlas("all");
    const dictionaryLookup = this.buildOntologyDictionaryLookup(dictionary.items);
    const candidateContract = {
      contractVersion: "ontology-flow-v1",
      previewOnly: true,
      flow: {
        id: flow.id,
        flowKey: flow.flowKey,
        name: flow.name,
        description: flow.description,
        status: flow.status,
        brandId: flow.brandId,
        workspaceScope: flow.workspaceScope,
        targetKind: flow.targetKind,
        targetId: flow.targetId,
        targetName: flow.targetName,
        sourceRefs: flow.sourceRefsJson,
        updatedAt: flow.updatedAt.toISOString(),
      },
      nodes: flow.nodes.map((node) => {
        const ontologyRefs = this.extractNodeOntologyRefs(node);
        const ontologySelections = this.buildNodeOntologySelections(node, dictionaryLookup, ontologyRefs);
        return {
        nodeKey: node.nodeKey,
        nodeType: node.nodeType,
        title: node.title,
        subtitle: node.subtitle,
        description: node.description,
        sortOrder: node.sortOrder,
        fiveElements: {
          object: ontologyRefs.objectElementIds,
          link: ontologyRefs.linkElementIds,
          function: ontologyRefs.functionElementIds,
          action: ontologyRefs.actionElementIds,
          interface: ontologyRefs.interfaceElementIds,
        },
        ontologyRefs,
        ontologySelections,
        elementBindingSnapshot: this.buildElementBindingSnapshot(ontologySelections, dictionary.source),
        references: this.boundElements(node.referencesJson),
        };
      }),
      edges: flow.edges.map((edge) => ({
        edgeKey: edge.edgeKey,
        fromNodeKey: edge.fromNodeKey,
        toNodeKey: edge.toNodeKey,
        label: edge.label,
        condition: edge.conditionJson,
        sortOrder: edge.sortOrder,
      })),
      routingRules: flow.routingRulesJson,
      confirmationGates: flow.confirmationGatesJson,
      evidenceRules: flow.evidenceRulesJson,
    };
    const candidateHash = this.sha256(candidateContract);
    const blockers = riskChecks.filter((risk) => risk.level === "BLOCKER").length;
    const warnings = riskChecks.filter((risk) => risk.level === "WARN").length;

    return {
      ok: true,
      generated: false,
      published: false,
      previewOnly: true,
      item: {
        candidateId: `candidate_${flow.flowKey}_${candidateHash.slice(0, 12)}`,
        candidateHash,
        candidateStatus: blockers ? "blocked" : warnings ? "review_required" : "ready_for_review",
        canPublishAfterConfirmation: blockers === 0,
        summary: {
          nodeCount: flow.nodes.length,
          edgeCount: flow.edges.length,
          boundReferenceCount: flow.nodes.reduce((sum, node) => sum + this.boundElements(node.referencesJson).length, 0),
          routingRuleCount: this.jsonItemCount(flow.routingRulesJson),
          confirmationGateCount: this.jsonItemCount(flow.confirmationGatesJson),
          evidenceRuleCount: this.jsonItemCount(flow.evidenceRulesJson),
          blockerCount: blockers,
          warningCount: warnings,
        },
        contract: candidateContract,
        riskChecks,
        rollbackAnchor: latestPublished
          ? {
            versionNo: latestPublished.versionNo,
            status: latestPublished.status,
            createdAt: latestPublished.createdAt.toISOString(),
            publishedAt: latestPublished.publishedAt?.toISOString() || null,
          }
          : null,
        latestSnapshot: latestSnapshot
          ? {
            versionNo: latestSnapshot.versionNo,
            status: latestSnapshot.status,
            createdAt: latestSnapshot.createdAt.toISOString(),
          }
          : null,
        diffBasis: latestPublished ? "latest_published_contract" : "first_publish_candidate",
      },
      boundary: "只生成发布候选契约预览，不写版本、不改变流程状态、不让 WorkBuddy 执行。",
    };
  }

  async publishFlow(flowIdOrKey: string, input: OntologyPublishInput) {
    await this.ensureDatabase();
    if (input.confirmPublish !== true) {
      throw new BadRequestException("confirmPublish 必须为 true，发布需要显式确认");
    }
    const normalized = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const expectedCandidateHash = this.requiredText(input.candidateHash, "candidateHash 必填", 128);
    const publishedBy = this.optionalText(input.publishedBy, 128) || "ai-control-ui";
    const note = this.optionalText(input.note, 500);
    const currentFlow = await this.prisma.ontologyOrchestrationFlow.findFirst({
      where: {
        OR: [
          { id: normalized },
          { flowKey: normalized },
        ],
      },
      include: {
        versions: {
          where: { status: "published_contract" },
          orderBy: { versionNo: "desc" },
          take: 1,
        },
      },
    });
    if (!currentFlow) {
      throw new BadRequestException(`编排流程不存在：${normalized}`);
    }
    const latestPublishedSnapshot = currentFlow.versions[0]?.snapshotJson as { candidateHash?: string } | null | undefined;
    if (currentFlow.status === "published" && latestPublishedSnapshot?.candidateHash === expectedCandidateHash) {
      const latestPublished = currentFlow.versions[0];
      return {
        ok: true,
        generated: false,
        published: true,
        previewOnly: false,
        idempotencyHit: true,
        item: {
          flowId: currentFlow.id,
          flowKey: currentFlow.flowKey,
          status: currentFlow.status,
          versionNo: latestPublished?.versionNo,
          versionStatus: latestPublished?.status,
          candidateHash: expectedCandidateHash,
          publishedAt: latestPublished?.publishedAt?.toISOString() || null,
        },
        boundary: "已存在相同 published_contract，未重复创建版本。",
      };
    }
    const preview = await this.getPublishPreview(flowIdOrKey);
    const previewItem = preview.item as any;
    if (previewItem.candidateHash !== expectedCandidateHash) {
      throw new BadRequestException("候选 Hash 已变化，请刷新发布预览后再确认");
    }
    if (previewItem.summary?.blockerCount > 0) {
      throw new BadRequestException("发布候选仍存在阻断项，不能发布");
    }

    const publishedAt = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const flow = await tx.ontologyOrchestrationFlow.findFirst({
        where: {
          OR: [
            { id: normalized },
            { flowKey: normalized },
          ],
        },
      });
      if (!flow) {
        throw new BadRequestException(`编排流程不存在：${flowIdOrKey}`);
      }

      const latestPublished = await tx.ontologyOrchestrationVersion.findFirst({
        where: { flowId: flow.id, status: "published_contract" },
        orderBy: { versionNo: "desc" },
      });
      const latestPublishedSnapshot = latestPublished?.snapshotJson as { candidateHash?: string } | null | undefined;
      if (latestPublishedSnapshot?.candidateHash === expectedCandidateHash) {
        return { flow, version: latestPublished, idempotencyHit: true };
      }

      const latest = await tx.ontologyOrchestrationVersion.findFirst({
        where: { flowId: flow.id },
        orderBy: { versionNo: "desc" },
      });
      const versionNo = (latest?.versionNo || 0) + 1;
      const publishedContract = {
        ...previewItem.contract,
        previewOnly: false,
        published: true,
        publishedAt: publishedAt.toISOString(),
        sourceCandidateHash: expectedCandidateHash,
      };
      const version = await tx.ontologyOrchestrationVersion.create({
        data: {
          flowId: flow.id,
          versionNo,
          status: "published_contract",
          snapshotJson: this.json({
            contract: publishedContract,
            candidateId: previewItem.candidateId,
            candidateHash: expectedCandidateHash,
            summary: previewItem.summary,
            riskChecks: previewItem.riskChecks,
            rollbackAnchor: previewItem.rollbackAnchor,
            latestSnapshot: previewItem.latestSnapshot,
            diffBasis: previewItem.diffBasis,
            note,
          }),
          createdBy: publishedBy,
          publishedAt,
        },
      });
      const updatedFlow = await tx.ontologyOrchestrationFlow.update({
        where: { id: flow.id },
        data: {
          status: "published",
          updatedAt: publishedAt,
        },
      });
      return { flow: updatedFlow, version, idempotencyHit: false };
    });

    return {
      ok: true,
      generated: false,
      published: true,
      previewOnly: false,
      idempotencyHit: result.idempotencyHit,
      item: {
        flowId: result.flow.id,
        flowKey: result.flow.flowKey,
        status: result.flow.status,
        versionNo: result.version?.versionNo,
        versionStatus: result.version?.status,
        candidateHash: expectedCandidateHash,
        publishedAt: result.version?.publishedAt?.toISOString() || publishedAt.toISOString(),
      },
      boundary: "只发布 Ontology 契约版本；历史版本保留，WorkBuddy 默认读取最新正式版本；不写 WorkBuddy 专家真源，不调用 AI 模型，不触发业务执行。",
    };
  }

  async publishAndSyncFlow(flowIdOrKey: string, input: OntologyPublishAndSyncInput = {}) {
    const normalized = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const publishResult = await this.publishFlow(normalized, {
      candidateHash: input.candidateHash,
      confirmPublish: input.confirmPublish,
      publishedBy: input.publishedBy,
      note: input.note,
    });
    const contractResult = await this.getPublishedContract({ flowIdOrKey: normalized });
    const item = contractResult.item as Record<string, any>;
    const contract = item.contract && typeof item.contract === "object" ? item.contract as Record<string, any> : {};
    const targets = this.resolveExpertSourceSyncTargets(item, contract);
    const syncRequested = input.syncExpertSource !== false;
    const requestedBy = this.optionalText(input.requestedBy, 128) || this.optionalText(input.publishedBy, 128) || "ai-control-ui";
    const note = this.optionalText(input.note, 500) || "S3-02ZZB publish and sync ontology contract";
    const createPreWriteSnapshot = input.createPreWriteSnapshot !== false;
    const explicitUserAuthorized = input.explicitUserAuthorized !== false;
    const impactMap = this.buildExpertSourceSyncImpactMap(item, contract);
    const syncTargetResults: Array<Record<string, unknown>> = [];

    if (syncRequested) {
      for (const target of targets) {
        const targetKey = `${target.kind}:${target.relPath}`;
        const impact = impactMap.get(targetKey) || { nodeKeys: [], nodeTitles: [] };
        try {
          const preview = await this.mdWriter.preview({
            kind: target.kind,
            rel_or_abs_path: target.relPath,
            fields: this.buildExpertSourceMarkdownFields(target.kind, item, contract),
          });
          if (!preview.changed) {
          const baselineSnapshot = await this.mdWriter.createLocalSnapshot({
            path: target.relPath,
            note: `publish_and_sync_already_in_sync_${new Date().toISOString()}`,
          });
            syncTargetResults.push({
              kind: target.kind,
              label: target.label,
              relPath: target.relPath,
              source: target.source,
              nodeKeys: impact.nodeKeys,
              nodeTitles: impact.nodeTitles,
              status: "already_in_sync",
              writeExecuted: false,
              blockedGates: [],
              saveBlockedReason: null,
              candidateSha256: preview.candidate_sha256,
              diffSha256: this.sha256Text(preview.diff || ""),
              changedFields: preview.changed_fields,
            snapshotId: this.optionalText((baselineSnapshot as any)?.snapshot?.id, 128) || null,
            });
            continue;
          }

          const execution = await this.mdWriter.executeSaveWriteback({
            kind: target.kind,
            rel_or_abs_path: target.relPath,
            fields: this.buildExpertSourceMarkdownFields(target.kind, item, contract),
            confirm_diff_sha256: this.sha256Text(preview.diff || ""),
            confirm_candidate_sha256: preview.candidate_sha256,
            create_pre_write_snapshot: createPreWriteSnapshot,
            explicit_user_authorized: explicitUserAuthorized,
            requested_by: requestedBy,
            note,
          });
          syncTargetResults.push({
            kind: target.kind,
            label: target.label,
            relPath: target.relPath,
            source: target.source,
            nodeKeys: impact.nodeKeys,
            nodeTitles: impact.nodeTitles,
            status: this.optionalText((execution as any)?.result, 128) || "unknown",
            writeExecuted: (execution as any)?.write_executed === true,
            blockedGates: Array.isArray((execution as any)?.gates)
              ? (execution as any).gates.filter((gate: any) => gate?.ok !== true).map((gate: any) => gate?.key).filter(Boolean)
              : [],
            saveBlockedReason: (execution as any)?.save_blocked_reason || null,
            candidateSha256: this.optionalText((execution as any)?.preview?.candidate?.sha256, 128) || preview.candidate_sha256,
            diffSha256: this.optionalText((execution as any)?.preview?.diff_sha256, 128) || this.sha256Text(preview.diff || ""),
            changedFields: Array.isArray((execution as any)?.preview?.changed_fields) ? (execution as any).preview.changed_fields : preview.changed_fields,
            executionId: this.optionalText((execution as any)?.execution_id, 128) || null,
          snapshotId: this.optionalText((execution as any)?.post_write_snapshot?.id, 128)
            || this.optionalText((execution as any)?.pre_write_snapshot?.id, 128)
            || null,
            verificationPassed: (execution as any)?.post_write_verification?.verified === true,
          });
        } catch (error: any) {
          syncTargetResults.push({
            kind: target.kind,
            label: target.label,
            relPath: target.relPath,
            source: target.source,
            nodeKeys: impact.nodeKeys,
            nodeTitles: impact.nodeTitles,
            status: "sync_failed",
            writeExecuted: false,
            blockedGates: [],
            saveBlockedReason: error instanceof Error ? error.message : String(error),
            candidateSha256: null,
            diffSha256: null,
            changedFields: [],
          });
        }
      }
    }

    const writtenCount = syncTargetResults.filter((target) => target.status === "written_and_verified").length;
    const alreadyInSyncCount = syncTargetResults.filter((target) => target.status === "already_in_sync").length;
    const blockedCount = syncTargetResults.filter((target) => String(target.status).includes("blocked") || target.status === "sync_failed").length;
    const verificationFailedCount = syncTargetResults.filter((target) => target.status === "written_but_verification_failed").length;
    const syncedCount = writtenCount + alreadyInSyncCount;
    const syncStatus = !syncRequested
      ? "publish_only"
      : !targets.length
        ? "blocked"
        : blockedCount === 0 && verificationFailedCount === 0
          ? "synced"
          : syncedCount > 0
            ? "partial"
            : "blocked";

    let syncSnapshotVersionNo: number | null = null;
    if (syncRequested) {
      const snapshot = await this.prisma.$transaction(async (tx) => this.createFlowSnapshot(
        tx,
        String(item.flowId || ""),
        "expert_source_sync_snapshot",
        requestedBy,
        {
          changeKind: "expert_source_sync",
          note,
          sourceContractVersionNo: item.versionNo,
          sourceContractHash: item.candidateHash,
          syncRequested: true,
          syncStatus,
          syncSummary: {
            targetCount: targets.length,
            syncedCount,
            writtenCount,
            alreadyInSyncCount,
            blockedCount,
            verificationFailedCount,
          },
          syncTargets: syncTargetResults,
        },
      ));
      syncSnapshotVersionNo = snapshot.versionNo;
    }

    return {
      ok: true,
      generated: false,
      published: true,
      previewOnly: false,
      synced: syncStatus === "synced",
      item: {
        flowId: item.flowId,
        flowKey: item.flowKey,
        flowName: item.flowName,
        publish: publishResult.item,
        sync: {
          requested: syncRequested,
          status: syncStatus,
          latestSyncSnapshotVersionNo: syncSnapshotVersionNo,
          targetCount: targets.length,
          syncedCount,
          writtenCount,
          alreadyInSyncCount,
          blockedCount,
          verificationFailedCount,
          targets: syncTargetResults,
        },
      },
      boundary: "先发布 Ontology 正式契约，再按 published_contract 受控同步专家源；未通过写回 gates 的目标不会写盘，也不会触发 WorkBuddy 业务执行。",
    };
  }

  async getPublishedContract(input: OntologyPublishedContractQuery = {}) {
    await this.ensureDatabase();
    const flowLookup = this.optionalText(input.flowIdOrKey ?? input.flowKey, 128);
    const brandId = this.optionalText(input.brandId, 128);
    const targetKind = this.optionalText(input.targetKind, 64);
    const targetId = this.optionalText(input.targetId, 256);
    const filters: Prisma.OntologyOrchestrationFlowWhereInput[] = [{ status: "published" }];
    if (brandId) filters.push({ OR: [{ brandId }, { brandId: null }] });
    if (targetKind) filters.push({ targetKind });
    if (targetId) filters.push({ targetId });
    if (flowLookup) filters.push({ OR: [{ id: flowLookup }, { flowKey: flowLookup }] });
    const where: Prisma.OntologyOrchestrationFlowWhereInput = { AND: filters };
    const flows = await this.prisma.ontologyOrchestrationFlow.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        versions: {
          where: { status: "published_contract" },
          orderBy: { versionNo: "desc" },
          take: 1,
        },
      },
    });
    const publishedFlows = flows.filter((item) => item.versions.length > 0);
    const flow = brandId
      ? publishedFlows.find((item) => item.brandId === brandId) || publishedFlows[0]
      : publishedFlows[0];
    if (!flow) {
      throw new BadRequestException("未找到已发布的 Ontology 契约；WorkBuddy 只能读取 published_contract，不能读取 draft 或 preview");
    }
    if (!flowLookup && !brandId && publishedFlows.length > 1) {
      throw new BadRequestException("匹配到多个已发布 Ontology 契约，请提供 flowKey、targetKind/targetId 或 brandId 缩小范围");
    }
    const version = flow.versions[0];
    const snapshot = version.snapshotJson as {
      contract?: Record<string, unknown>;
      candidateHash?: string;
      candidateId?: string;
      summary?: Record<string, unknown>;
      riskChecks?: unknown[];
      rollbackAnchor?: unknown;
      note?: string;
    };

    return {
      ok: true,
      generated: false,
      readonly: true,
      published: true,
      previewOnly: false,
      item: {
        flowId: flow.id,
        flowKey: flow.flowKey,
        flowName: flow.name,
        flowStatus: flow.status,
        brandId: flow.brandId,
        workspaceScope: flow.workspaceScope,
        targetKind: flow.targetKind,
        targetId: flow.targetId,
        targetName: flow.targetName,
        versionNo: version.versionNo,
        versionStatus: version.status,
        candidateId: snapshot?.candidateId || null,
        candidateHash: snapshot?.candidateHash || null,
        publishedAt: version.publishedAt?.toISOString() || null,
        createdAt: version.createdAt.toISOString(),
        contract: snapshot?.contract || null,
        summary: snapshot?.summary || null,
        riskChecks: Array.isArray(snapshot?.riskChecks) ? snapshot.riskChecks : [],
        rollbackAnchor: snapshot?.rollbackAnchor || null,
      },
      boundary: "只读取 latest published_contract；不读取草稿，不调用 AI 模型，不触发 WorkBuddy 执行，不写专家真源。",
    };
  }

  async getExecutionPlan(input: OntologyExecutionPlanQuery = {}) {
    const contractResult = await this.getPublishedContract(input);
    const item = contractResult.item as any;
    const contract = item.contract && typeof item.contract === "object" ? item.contract as Record<string, any> : {};
    const nodes = Array.isArray(contract.nodes) ? contract.nodes : [];
    const edges = Array.isArray(contract.edges) ? contract.edges : [];
    const orderedNodes = this.orderContractNodes(nodes, edges);
    const edgeMap = new Map<string, any[]>();
    for (const edge of edges) {
      const fromNodeKey = String(edge?.fromNodeKey || "");
      if (!fromNodeKey) continue;
      edgeMap.set(fromNodeKey, [...(edgeMap.get(fromNodeKey) || []), edge]);
    }
    const steps = orderedNodes.map((node, index) => {
      const nextEdges = edgeMap.get(String(node?.nodeKey || "")) || [];
      return {
        stepNo: index + 1,
        nodeKey: node?.nodeKey || null,
        nodeType: node?.nodeType || null,
        title: node?.title || node?.nodeKey || `步骤 ${index + 1}`,
        subtitle: node?.subtitle || null,
        description: node?.description || null,
        fiveElements: node?.fiveElements || {},
        ontologyRefs: node?.ontologyRefs || {},
        ontologySelections: node?.ontologySelections || {},
        elementBindingSnapshot: node?.elementBindingSnapshot || {},
        references: Array.isArray(node?.references) ? node.references : [],
        next: nextEdges.map((edge) => ({
          edgeKey: edge?.edgeKey || null,
          toNodeKey: edge?.toNodeKey || null,
          label: edge?.label || null,
          condition: edge?.condition || {},
        })),
      };
    });
    const startNodeKeys = this.startNodeKeys(nodes, edges);
    const userIntent = this.optionalText(input.userIntent, 1000);
    const taskId = this.optionalText(input.taskId, 128);

    return {
      ok: true,
      generated: false,
      readonly: true,
      published: true,
      previewOnly: false,
      executionPlanOnly: true,
      item: {
        planId: `plan_${item.flowKey}_v${item.versionNo}`,
        flowId: item.flowId,
        flowKey: item.flowKey,
        flowName: item.flowName,
        versionNo: item.versionNo,
        versionStatus: item.versionStatus,
        candidateHash: item.candidateHash,
        userIntent: userIntent || null,
        taskId: taskId || null,
        startNodeKeys,
        stepCount: steps.length,
        edgeCount: edges.length,
        steps,
        routingRules: contract.routingRules || {},
        confirmationGates: contract.confirmationGates || {},
        evidenceRules: contract.evidenceRules || {},
        riskChecks: item.riskChecks || [],
        preflightChecklist: [
          "读取 latest published_contract，禁止读取 draft 或 publish-preview 作为执行依据。",
          "按 steps 顺序逐步解释执行路径；遇到 confirmationGates 时先向用户确认。",
          "每个节点只调用 references 中已绑定的专家、Skill、MCP 工具或中台对象。",
          "执行后如产生素材、产物或外部调用，必须按 evidenceRules 写入任务治理证据。",
          "本计划不代表已执行；正式执行前仍需 WorkBuddy 根据当前任务上下文做最终校验。",
        ],
        prohibitedActions: [
          "不得写 WorkBuddy 专家团/专家/Skill 真源。",
          "不得修改 published_contract。",
          "不得自动发布、自动回滚或自动派生新草稿。",
          "不得在缺少用户确认时越过确认闸。",
        ],
      },
      sourceContract: {
        flowKey: item.flowKey,
        versionNo: item.versionNo,
        versionStatus: item.versionStatus,
        candidateHash: item.candidateHash,
        publishedAt: item.publishedAt,
      },
      boundary: "只从 latest published_contract 派生执行前路由计划；不创建任务、不调用 AI、不触发 WorkBuddy 执行、不写专家真源。",
    };
  }

  async getExpertSourceDiffPreview(flowIdOrKey: string, opts: { includeCandidateMd?: boolean } = {}) {
    const contractResult = await this.getPublishedContract({ flowIdOrKey });
    const item = contractResult.item as any;
    const contract = item.contract && typeof item.contract === "object" ? item.contract as Record<string, any> : {};
    const targets = this.resolveExpertSourceSyncTargets(item, contract);
    const policy = await this.mdWriter.writePolicy();
    const previews = [];
    const blockers = [];

    if (!targets.length) {
      blockers.push({
        code: "NO_EXPERT_SOURCE_TARGET",
        message: "已发布契约没有绑定可定位的专家/Skill Markdown 真源文件。",
      });
    }

    for (const target of targets.slice(0, 8)) {
      try {
        const preview = await this.mdWriter.preview({
          kind: target.kind,
          rel_or_abs_path: target.relPath,
          fields: this.buildExpertSourceMarkdownFields(target.kind, item, contract),
        });
        previews.push({
          target,
          previewOnly: true,
          changed: preview.changed,
          relPosix: preview.rel_posix,
          current: {
            sha256: preview.original_sha256,
            bytes: Buffer.byteLength(preview.original_md_text, "utf-8"),
          },
          candidate: {
            sha256: preview.candidate_sha256,
            bytes: preview.candidate_bytes,
          },
          diffSha256: this.sha256Text(preview.diff || ""),
          diffLength: (preview.diff || "").length,
          changedFields: preview.changed_fields,
          mergeReport: preview.merge_report,
          candidateMarkdown: opts.includeCandidateMd ? preview.candidate_md_text : undefined,
          diff: preview.diff,
        });
      } catch (error: any) {
        blockers.push({
          code: "TARGET_PREVIEW_FAILED",
          target,
          message: error?.message || String(error),
        });
      }
    }

    const candidateHash = this.sha256({
      flowKey: item.flowKey,
      versionNo: item.versionNo,
      sourceContractHash: item.candidateHash,
      targets: previews.map((preview) => ({
        relPosix: preview.relPosix,
        candidateSha256: preview.candidate.sha256,
        diffSha256: preview.diffSha256,
        changed: preview.changed,
      })),
      blockers,
    });

    return {
      ok: true,
      generated: false,
      readonly: true,
      previewOnly: true,
      writebackEnabled: false,
      item: {
        previewId: `ontology_expert_source_preview_${item.flowKey}_v${item.versionNo}_${candidateHash.slice(0, 12)}`,
        candidateHash,
        sourceContract: {
          flowId: item.flowId,
          flowKey: item.flowKey,
          flowName: item.flowName,
          versionNo: item.versionNo,
          versionStatus: item.versionStatus,
          candidateHash: item.candidateHash,
          publishedAt: item.publishedAt,
        },
        targetSummary: {
          targetCount: targets.length,
          previewedCount: previews.length,
          changedCount: previews.filter((preview) => preview.changed).length,
          blockerCount: blockers.length,
        },
        targets: previews,
        blockers,
        gates: [
          {
            key: "published_contract_read",
            label: "读取正式契约",
            ok: true,
            detail: "只读取 latest published_contract。",
          },
          {
            key: "expert_source_dry_run",
            label: "专家源 Dry-run",
            ok: previews.length > 0 && blockers.length === 0,
            detail: previews.length ? `已生成 ${previews.length} 个候选 Diff` : "尚未生成候选 Diff",
          },
          {
            key: "writeback_blocked",
            label: "真实写回总闸",
            ok: false,
            detail: "S3-02W 只提供预览，不执行写盘；后续需用户确认 Diff、候选 SHA、写前快照和可写挂载。",
          },
        ],
        policy: {
          sourceRoot: policy.source_root,
          sourceMode: policy.source_mode,
          writeEnabled: policy.write_enabled,
          writableMount: policy.writable_mount,
          blockedReason: policy.blocked_reason,
        },
      },
      boundary: "只把 published_contract 翻译为专家源候选 Markdown Diff；不写 WorkBuddy 真源、不创建快照、不提交、不触发执行。",
    };
  }

  async requestExpertSourceWriteback(flowIdOrKey: string, input: OntologyExpertSourceWritebackRequestInput = {}) {
    const contractResult = await this.getPublishedContract({ flowIdOrKey });
    const item = contractResult.item as any;
    const contract = item.contract && typeof item.contract === "object" ? item.contract as Record<string, any> : {};
    const targets = this.resolveExpertSourceSyncTargets(item, contract);
    if (!targets.length) {
      throw new BadRequestException("已发布契约没有绑定可定位的专家/Skill Markdown 真源文件，不能生成写回申请");
    }

    const requestedTargetPath = this.optionalText(input.targetPath, 1000);
    const matchedTargets = requestedTargetPath
      ? targets.filter((target) => target.relPath === requestedTargetPath)
      : targets;
    if (!matchedTargets.length) {
      throw new BadRequestException(`写回目标不在当前 published_contract 可同步范围内：${requestedTargetPath}`);
    }
    if (!requestedTargetPath && matchedTargets.length > 1) {
      throw new BadRequestException("当前契约会影响多个专家源文件，请通过 targetPath 明确选择本次写回目标");
    }

    const target = matchedTargets[0];
    const writeback = await this.mdWriter.requestSaveWriteback({
      kind: target.kind,
      rel_or_abs_path: target.relPath,
      fields: this.buildExpertSourceMarkdownFields(target.kind, item, contract),
      confirm_diff_sha256: input.confirmDiffSha256 ?? null,
      confirm_candidate_sha256: input.confirmCandidateSha256 ?? null,
      create_pre_write_snapshot: input.createPreWriteSnapshot ?? null,
      explicit_user_authorized: input.explicitUserAuthorized ?? null,
    });

    return {
      ok: false,
      generated: false,
      action: "ontology_expert_source_writeback_request",
      saveEnabled: (writeback as any)?.save_enabled === true,
      writebackRequested: true,
      sourceContract: {
        flowId: item.flowId,
        flowKey: item.flowKey,
        flowName: item.flowName,
        versionNo: item.versionNo,
        versionStatus: item.versionStatus,
        candidateHash: item.candidateHash,
        publishedAt: item.publishedAt,
      },
      target,
      request: {
        targetPath: target.relPath,
        requestedBy: this.optionalText(input.requestedBy, 128) || "ai-control-ui",
        note: this.optionalText(input.note, 500) || null,
        confirmDiffSha256Provided: !!this.optionalText(input.confirmDiffSha256, 128),
        confirmCandidateSha256Provided: !!this.optionalText(input.confirmCandidateSha256, 128),
        createPreWriteSnapshot: input.createPreWriteSnapshot === true,
        explicitUserAuthorized: input.explicitUserAuthorized === true,
      },
      writeback,
      gates: (writeback as any)?.gates || [],
      saveBlockedReason: (writeback as any)?.save_blocked_reason || null,
      blockedGates: Array.isArray((writeback as any)?.gates)
        ? (writeback as any).gates.filter((gate: any) => gate?.ok !== true).map((gate: any) => gate?.key).filter(Boolean)
        : [],
      preview: (writeback as any)?.preview || null,
      rollbackPlan: (writeback as any)?.rollback_plan || null,
      policy: (writeback as any)?.policy || null,
      boundary: "只为 Ontology published_contract 生成专家源写回确认闸结果；当前总闸仍不执行真实写盘、不提交、不触发 WorkBuddy 执行。",
    };
  }

  async executeExpertSourceWriteback(flowIdOrKey: string, input: OntologyExpertSourceWritebackRequestInput = {}) {
    const contractResult = await this.getPublishedContract({ flowIdOrKey });
    const item = contractResult.item as any;
    const contract = item.contract && typeof item.contract === "object" ? item.contract as Record<string, any> : {};
    const targets = this.resolveExpertSourceSyncTargets(item, contract);
    if (!targets.length) {
      throw new BadRequestException("已发布契约没有绑定可定位的专家/Skill Markdown 真源文件，不能执行写回");
    }

    const requestedTargetPath = this.optionalText(input.targetPath, 1000);
    const matchedTargets = requestedTargetPath
      ? targets.filter((target) => target.relPath === requestedTargetPath)
      : targets;
    if (!matchedTargets.length) {
      throw new BadRequestException(`写回目标不在当前 published_contract 可同步范围内：${requestedTargetPath}`);
    }
    if (!requestedTargetPath && matchedTargets.length > 1) {
      throw new BadRequestException("当前契约会影响多个专家源文件，请通过 targetPath 明确选择本次写回目标");
    }

    const target = matchedTargets[0];
    const execution = await this.mdWriter.executeSaveWriteback({
      kind: target.kind,
      rel_or_abs_path: target.relPath,
      fields: this.buildExpertSourceMarkdownFields(target.kind, item, contract),
      confirm_diff_sha256: input.confirmDiffSha256 ?? null,
      confirm_candidate_sha256: input.confirmCandidateSha256 ?? null,
      create_pre_write_snapshot: input.createPreWriteSnapshot ?? null,
      explicit_user_authorized: input.explicitUserAuthorized ?? null,
      requested_by: input.requestedBy || "ai-control-ui",
      note: input.note,
    });

    return {
      ok: (execution as any)?.ok === true,
      generated: false,
      action: "ontology_expert_source_writeback_execute",
      saveEnabled: (execution as any)?.save_enabled === true,
      saveBlockedReason: (execution as any)?.save_blocked_reason || null,
      writeExecuted: (execution as any)?.write_executed === true,
      result: (execution as any)?.result || null,
      sourceContract: {
        flowId: item.flowId,
        flowKey: item.flowKey,
        flowName: item.flowName,
        versionNo: item.versionNo,
        versionStatus: item.versionStatus,
        candidateHash: item.candidateHash,
        publishedAt: item.publishedAt,
      },
      target,
      request: {
        targetPath: target.relPath,
        requestedBy: this.optionalText(input.requestedBy, 128) || "ai-control-ui",
        note: this.optionalText(input.note, 500) || null,
        confirmDiffSha256Provided: !!this.optionalText(input.confirmDiffSha256, 128),
        confirmCandidateSha256Provided: !!this.optionalText(input.confirmCandidateSha256, 128),
        createPreWriteSnapshot: input.createPreWriteSnapshot === true,
        explicitUserAuthorized: input.explicitUserAuthorized === true,
      },
      execution,
      gates: (execution as any)?.gates || [],
      blockedGates: Array.isArray((execution as any)?.gates)
        ? (execution as any).gates.filter((gate: any) => gate?.ok !== true).map((gate: any) => gate?.key).filter(Boolean)
        : [],
      preview: (execution as any)?.preview || null,
      rollbackPlan: (execution as any)?.rollback_plan || null,
      policy: (execution as any)?.policy || null,
      boundary: "只执行 Ontology published_contract 派生候选稿的受控写回；未通过全部 gates 时不会写盘，不提交 Git，不触发 WorkBuddy 业务执行。",
    };
  }

  async recordExecutionPlanEvidence(input: OntologyExecutionPlanEvidenceInput = {}) {
    if (input?.confirmPreflightOnly !== true) {
      throw new BadRequestException("必须确认本次只记录执行前计划证据，不触发执行、不写 WorkBuddy 真源");
    }
    await this.ensureDatabase();
    const brandId = this.requiredText(input.brandId, "brandId 必填", 128);
    const taskId = this.requiredText(input.taskId, "任务 ID 不能为空", 64);
    const stageRunId = this.requiredText(input.stageRunId, "阶段 ID 不能为空", 128);
    const task = await this.requireTaskStageBinding({ brandId, taskId, stageRunId });
    const planResult = await this.getExecutionPlan({
      flowIdOrKey: input.flowIdOrKey ?? input.flowKey,
      brandId,
      targetKind: input.targetKind,
      targetId: input.targetId,
      userIntent: input.userIntent,
      taskId,
    });
    const plan = planResult.item as Record<string, any>;
    const subjectKind = input.subjectKind === "expert" ? "expert" : "skill";
    const subjectId = this.optionalText(input.subjectId, 128) || "workbuddy-agent-ontology-preflight";
    const attemptNo = this.clampInt(input.attemptNo, 1, 1000, 1);
    const confirmedBy = this.optionalText(input.confirmedBy, 128) || "workbuddy-agent";
    const confirmationNote = this.optionalText(input.confirmationNote, 2000);
    const invocationId = this.optionalText(input.invocationId, 128)
      || `ontology_preflight_${this.shortHash([taskId, stageRunId, plan.planId, plan.candidateHash].join(":"))}`;
    const commandId = `ontology_preflight_${this.shortHash(input.idempotencyKey || invocationId)}`;
    const stepSummaries = Array.isArray(plan.steps)
      ? plan.steps.slice(0, 50).map((step: any) => ({
          step_no: step?.stepNo ?? null,
          node_key: step?.nodeKey ?? null,
          title: step?.title ?? null,
          reference_count: Array.isArray(step?.references) ? step.references.length : 0,
          next_count: Array.isArray(step?.next) ? step.next.length : 0,
        }))
      : [];

    const event = await this.workflowCore.recordExecutionEvent({
      command_id: commandId,
      task_id: taskId,
      stage_run_id: stageRunId,
      invocation_id: invocationId,
      parent_invocation_id: this.optionalText(input.parentInvocationId, 128) || undefined,
      subject_kind: subjectKind,
      subject_id: subjectId,
      event_type: "succeeded",
      attempt_no: attemptNo,
      source_level: "workbuddy_tool_reported",
      evidence_refs: [
        {
          kind: "ontology_execution_preflight",
          id: `${taskId}/${stageRunId}/${plan.planId}`,
          meta: {
            brand_id: brandId,
            task_id: taskId,
            stage_run_id: stageRunId,
            stage_key: task.stageKey,
            plan_id: plan.planId,
            flow_id: plan.flowId,
            flow_key: plan.flowKey,
            flow_name: plan.flowName || null,
            version_no: plan.versionNo,
            version_status: plan.versionStatus,
            candidate_hash: plan.candidateHash || null,
            user_intent: plan.userIntent || null,
            confirmed_by: confirmedBy,
            confirmation_note: confirmationNote || null,
            step_count: plan.stepCount ?? 0,
            edge_count: plan.edgeCount ?? 0,
            start_node_keys: Array.isArray(plan.startNodeKeys) ? plan.startNodeKeys : [],
            step_summaries: stepSummaries,
            evidence_only: true,
            execution_started: false,
            event_subtype: "ontology_execution_plan_preflight",
          },
        },
        {
          kind: "ontology_published_contract",
          id: `${plan.flowKey}/v${plan.versionNo}`,
          meta: {
            flow_id: plan.flowId,
            flow_key: plan.flowKey,
            version_no: plan.versionNo,
            version_status: plan.versionStatus,
            candidate_hash: plan.candidateHash || null,
          },
        },
      ],
    });

    return {
      ok: true,
      generated: false,
      preflightEvidenceOnly: true,
      brandId,
      taskId,
      stageRunId,
      stageKey: task.stageKey,
      plan,
      event,
      boundary: "只记录 Ontology 执行前计划确认/留证；不创建任务、不调用 AI、不触发 WorkBuddy 执行、不写专家真源、不修改 published_contract。",
    };
  }

  async recordExecutionNodeEvidence(input: OntologyExecutionNodeEvidenceInput = {}) {
    if (input?.confirmControlledExecutionOnly !== true) {
      throw new BadRequestException("必须确认本次只记录 Ontology 节点受控执行证据，不自动执行、不写 WorkBuddy 真源");
    }
    await this.ensureDatabase();
    const brandId = this.requiredText(input.brandId, "brandId 必填", 128);
    const taskId = this.requiredText(input.taskId, "任务 ID 不能为空", 64);
    const stageRunId = this.requiredText(input.stageRunId, "阶段 ID 不能为空", 128);
    const nodeKey = this.requiredText(input.nodeKey, "nodeKey 必填", 128);
    const task = await this.requireTaskStageBinding({ brandId, taskId, stageRunId });
    const planResult = await this.getExecutionPlan({
      flowIdOrKey: input.flowIdOrKey ?? input.flowKey,
      brandId,
      targetKind: input.targetKind,
      targetId: input.targetId,
      userIntent: input.userIntent,
      taskId,
    });
    const plan = planResult.item as Record<string, any>;
    const steps = Array.isArray(plan.steps) ? plan.steps : [];
    const step = steps.find((item: any) => String(item?.nodeKey || "") === nodeKey);
    if (!step) {
      throw new BadRequestException(`节点 ${nodeKey} 不在当前 published_contract 派生的执行计划中`);
    }

    const nodeStatus = this.normalizeNodeStatus(input.nodeStatus);
    const confirmationPolicy = this.resolveNodeConfirmationPolicy(plan, step, input);
    const requiresConfirmation = confirmationPolicy.requiresConfirmation;
    const gateSatisfied = confirmationPolicy.confirmGateSatisfied;
    if (requiresConfirmation && !gateSatisfied && nodeStatus !== "blocked") {
      throw new BadRequestException("该节点声明需要确认闸，但尚未确认；只能记录 blocked，不能记录 started/succeeded/failed");
    }
    const subjectKind = input.subjectKind === "expert" ? "expert" : "skill";
    const subjectId = this.optionalText(input.subjectId, 128) || `ontology-node:${nodeKey}`;
    const attemptNo = this.clampInt(input.attemptNo, 1, 1000, 1);
    const outcome = this.optionalText(input.outcome, 2000);
    const blockedReason = confirmationPolicy.blockedReason;
    if (nodeStatus === "blocked" && !blockedReason) {
      throw new BadRequestException("记录 blocked 节点时必须提供 blockedReason");
    }
    const invocationId = this.optionalText(input.invocationId, 128)
      || `ontology_node_${this.shortHash([taskId, stageRunId, plan.planId, nodeKey, nodeStatus, attemptNo].join(":"))}`;
    const commandId = `ontology_node_${this.shortHash(input.idempotencyKey || invocationId)}`;
    const eventType = nodeStatus === "started" ? "started" : nodeStatus === "succeeded" ? "succeeded" : "failed";
    const errorCode = nodeStatus === "blocked"
      ? (this.optionalText(input.errorCode, 64) || "ONTOLOGY_CONFIRMATION_GATE_BLOCKED")
      : this.optionalText(input.errorCode, 64);
    const errorMessage = nodeStatus === "blocked"
      ? blockedReason
      : this.optionalText(input.errorMessage, 1000);

    const event = await this.workflowCore.recordExecutionEvent({
      command_id: commandId,
      task_id: taskId,
      stage_run_id: stageRunId,
      invocation_id: invocationId,
      parent_invocation_id: this.optionalText(input.parentInvocationId, 128) || undefined,
      subject_kind: subjectKind,
      subject_id: subjectId,
      event_type: eventType,
      attempt_no: attemptNo,
      error_code: errorCode || undefined,
      error_message: errorMessage || undefined,
      source_level: "workbuddy_tool_reported",
      evidence_refs: [
        {
          kind: "ontology_node_execution",
          id: `${taskId}/${stageRunId}/${plan.planId}/${nodeKey}/${nodeStatus}`,
          meta: {
            brand_id: brandId,
            task_id: taskId,
            stage_run_id: stageRunId,
            stage_key: task.stageKey,
            plan_id: plan.planId,
            flow_id: plan.flowId,
            flow_key: plan.flowKey,
            flow_name: plan.flowName || null,
            version_no: plan.versionNo,
            version_status: plan.versionStatus,
            candidate_hash: plan.candidateHash || null,
            node_key: step.nodeKey || nodeKey,
            node_title: step.title || nodeKey,
            node_type: step.nodeType || null,
            step_no: step.stepNo ?? null,
            node_status: nodeStatus,
            outcome: outcome || null,
            blocked_reason: blockedReason || null,
            confirmation_required: requiresConfirmation,
            confirmation_satisfied: gateSatisfied,
            confirmation_auto_matched: confirmationPolicy.autoMatched,
            confirmation_gate_matches: confirmationPolicy.matchedGates,
            reference_count: Array.isArray(step.references) ? step.references.length : 0,
            next_count: Array.isArray(step.next) ? step.next.length : 0,
            references: Array.isArray(step.references) ? step.references.slice(0, 20) : [],
            next: Array.isArray(step.next) ? step.next.slice(0, 20) : [],
            controlled_execution: true,
            triggered_by_platform: false,
            wrote_expert_source: false,
            event_subtype: "ontology_node_execution",
          },
        },
        {
          kind: "ontology_published_contract",
          id: `${plan.flowKey}/v${plan.versionNo}`,
          meta: {
            flow_id: plan.flowId,
            flow_key: plan.flowKey,
            version_no: plan.versionNo,
            version_status: plan.versionStatus,
            candidate_hash: plan.candidateHash || null,
          },
        },
      ],
    });

    return {
      ok: true,
      generated: false,
      controlledExecutionEvidenceOnly: true,
      brandId,
      taskId,
      stageRunId,
      stageKey: task.stageKey,
      node: {
        nodeKey,
        title: step.title || nodeKey,
        stepNo: step.stepNo ?? null,
        nodeStatus,
        requiresConfirmation,
        confirmGateSatisfied: gateSatisfied,
        confirmationAutoMatched: confirmationPolicy.autoMatched,
        matchedConfirmationGates: confirmationPolicy.matchedGates,
      },
      plan: {
        planId: plan.planId,
        flowId: plan.flowId,
        flowKey: plan.flowKey,
        flowName: plan.flowName || null,
        versionNo: plan.versionNo,
        versionStatus: plan.versionStatus,
        candidateHash: plan.candidateHash || null,
      },
      event,
      boundary: "只记录 Ontology 节点受控执行证据；不自动调用 AI、不自动调用工具、不写 WorkBuddy 专家真源、不修改 published_contract。",
    };
  }

  async saveDraft(input: OntologyFlowDraftInput) {
    await this.ensureDatabase();
    const flowKey = this.optionalText(input.flowKey, 128) || DEFAULT_FLOW_KEY;
    const name = this.optionalText(input.name, 256) || "素材复用业务流程导航";
    const nodes = Array.isArray(input.nodes) && input.nodes.length ? input.nodes : this.sampleNodes();
    const edges = Array.isArray(input.edges) && input.edges.length ? input.edges : this.sampleEdges();
    const description = this.optionalText(input.description, 4000) || "S3-02C 草稿：专家团/专家/Skill 与素材复用中台能力的业务流程地图。";
    const status = this.optionalStatus(input.status);
    const brandId = this.optionalText(input.brandId, 128) || null;
    const workspaceScope = this.optionalText(input.workspaceScope, 128) || "all_network_growth";
    const targetKind = this.optionalText(input.targetKind, 64) || "expert_team";
    const targetId = this.optionalText(input.targetId, 256) || "douyin-content-team";
    const targetName = this.optionalText(input.targetName, 256) || "抖音专家团";
    const sourceRefs = input.sourceRefsJson ?? this.defaultSourceRefs();
    const routingRules = input.routingRulesJson ?? this.defaultRoutingRules();
    const confirmationGates = input.confirmationGatesJson ?? this.defaultConfirmationGates();
    const evidenceRules = input.evidenceRulesJson ?? this.defaultEvidenceRules();
    const createdBy = this.optionalText(input.createdBy, 128) || "ai-control-user";
    const source = this.optionalText(this.asRecord(sourceRefs).source, 128);

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.ontologyOrchestrationFlow.findUnique({ where: { flowKey } });
      if (!existing) {
        const reused = await this.findReusableFlowForDraftCreate(tx, {
          flowKey,
          targetKind,
          targetId,
          source,
        });
        if (reused) {
          return { flow: reused, version: null, reusedExisting: true };
        }
      }
      const flow = existing
        ? await tx.ontologyOrchestrationFlow.update({
          where: { flowKey },
          data: {
            name,
            description,
            status,
            brandId,
            workspaceScope,
            targetKind,
            targetId,
            targetName,
            sourceRefsJson: this.json(sourceRefs),
            routingRulesJson: this.json(routingRules),
            confirmationGatesJson: this.json(confirmationGates),
            evidenceRulesJson: this.json(evidenceRules),
            createdBy,
          },
        })
        : await tx.ontologyOrchestrationFlow.create({
          data: {
            flowKey,
            name,
            description,
            status,
            brandId,
            workspaceScope,
            targetKind,
            targetId,
            targetName,
            sourceRefsJson: this.json(sourceRefs),
            routingRulesJson: this.json(routingRules),
            confirmationGatesJson: this.json(confirmationGates),
            evidenceRulesJson: this.json(evidenceRules),
            createdBy,
          },
        });

      await tx.ontologyOrchestrationNode.deleteMany({ where: { flowId: flow.id } });
      await tx.ontologyOrchestrationEdge.deleteMany({ where: { flowId: flow.id } });

      await tx.ontologyOrchestrationNode.createMany({
        data: nodes.map((node, index) => this.toNodeCreateInput(flow.id, node, index)),
      });
      await tx.ontologyOrchestrationEdge.createMany({
        data: edges.map((edge, index) => this.toEdgeCreateInput(flow.id, edge, index)),
      });

      const latest = await tx.ontologyOrchestrationVersion.findFirst({
        where: { flowId: flow.id },
        orderBy: { versionNo: "desc" },
      });
      const versionNo = (latest?.versionNo || 0) + 1;
      const snapshot = {
        flow: {
          id: flow.id,
          flowKey: flow.flowKey,
          name: flow.name,
          status: flow.status,
          targetKind: flow.targetKind,
          targetId: flow.targetId,
          targetName: flow.targetName,
        },
        routingRulesJson: flow.routingRulesJson,
        confirmationGatesJson: flow.confirmationGatesJson,
        evidenceRulesJson: flow.evidenceRulesJson,
        nodes,
        edges,
        savedAt: new Date().toISOString(),
      };
      const version = await tx.ontologyOrchestrationVersion.create({
        data: {
          flowId: flow.id,
          versionNo,
          status: "draft_snapshot",
          snapshotJson: this.json(snapshot),
          createdBy,
        },
      });

      const saved = await tx.ontologyOrchestrationFlow.findUnique({
        where: { id: flow.id },
        include: {
          nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          edges: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          versions: { orderBy: { versionNo: "desc" }, take: 5 },
        },
      });

      return { flow: saved, version, reusedExisting: false };
    });

    return {
      ok: true,
      generated: false,
      published: false,
      item: result.flow,
      version: result.version,
      reusedExisting: result.reusedExisting,
      boundary: result.reusedExisting
        ? "同一专家团/专家已存在项目，当前请求直接复用现有画布，不再重复创建草稿。"
        : "只保存草稿和草稿快照，不调用 AI 模型，不发布 WorkBuddy 执行契约。",
    };
  }

  async generateAiDraft(input: OntologyAiDraftGenerateInput = {}) {
    const sourceRefs = this.asRecord(input.sourceRefsJson);
    const selectedTarget = this.asRecord(sourceRefs.selected_target);
    const brandId = this.normalizeAiDraftBrandId(input.brandId);
    const forceRegenerate = input.forceRegenerate === true;
    const targetKind = this.optionalText(input.targetKind, 64) || this.optionalText(selectedTarget.kind, 64) || "expert";
    const targetId = this.optionalText(input.targetId, 256) || this.optionalText(selectedTarget.id, 256);
    const targetName = this.optionalText(input.targetName, 256)
      || this.optionalText(selectedTarget.label, 256)
      || this.optionalText(selectedTarget.name, 256)
      || targetId
      || "未命名专家";
    const reused = await this.findReusableFlowForTarget(targetKind, targetId);
    if (reused && !forceRegenerate) {
      return {
        ok: true,
        generated: false,
        published: reused.status === "published",
        reusedExisting: true,
        item: reused,
        boundary: "同一专家团/专家已存在项目，当前请求直接复用现有画布，不再重复生成 AI 草案。",
      };
    }
    const sourcePath = this.resolveAiDraftTargetPath(targetId, selectedTarget);
    if (!sourcePath) {
      throw new BadRequestException("当前目标缺少可读取的专家/技能配置文档路径，暂时无法生成 AI 草案");
    }

    const sourceDoc = MdWriter.readMarkdownAtomic(sourcePath);
    const dictionary = this.readOntologyAtlas(AI_DRAFT_DICTIONARY_SCOPE);
    const dictionaryLookup = this.buildOntologyDictionaryLookup(dictionary.items);
    const forcedFlowKey = reused && forceRegenerate && reused.status !== "published" ? reused.flowKey : "";
    const flowKey = this.optionalText(forcedFlowKey, 128)
      || this.optionalText(input.flowKey, 128)
      || `ontology_${this.slugifyText(targetKind)}_${this.slugifyText(targetName || targetId || "ai_draft")}_${Date.now().toString(36)}`;
      const sourceTag = forceRegenerate
      ? "ai-control-ontology-project-wizard-ai-draft-force-regenerate"
      : "ai-control-ontology-project-wizard-ai-draft";
  const registryDraft = this.buildExpertTeamRegistryDraft(
    targetKind,
    sourceDoc.rel_posix,
    targetName,
    this.optionalText(selectedTarget.sourceRoot, 1000),
  );
    if (registryDraft) {
      return this.saveDraft({
        flowKey,
        name: this.optionalText(input.name, 256) || registryDraft.flowName || `${targetName} AI 草案`,
        description: this.optionalText(input.description, 4000) || registryDraft.description,
        status: "draft",
        brandId,
        workspaceScope: this.optionalText(input.workspaceScope, 128) || "all_network_growth",
        targetKind,
        targetId,
        targetName,
        sourceRefsJson: {
          ...sourceRefs,
          selected_target: {
            ...selectedTarget,
            id: targetId,
            kind: targetKind,
            label: targetName,
            path: sourceDoc.rel_posix,
          },
          generationMode: "expert_team_registry_compiler",
          source: sourceTag,
        },
        createdBy: this.optionalText(input.createdBy, 128) || "ai-control-ai-draft",
        nodes: registryDraft.nodes,
        edges: registryDraft.edges,
      });
    }
    const requireSkillNode = this.shouldRequireAiSkillNode(targetKind, sourceDoc.md_text);
    const aiDraft = await this.requestAiDraftFromModel({
      brandId,
      model: this.optionalText(input.model, 128),
      targetKind,
      targetId,
      targetName,
      sourcePath: sourceDoc.rel_posix,
      sourceMarkdown: sourceDoc.md_text,
      dictionaryItems: dictionary.items,
      requireSkillNode,
    });
    const nodes = this.ensureAiDraftSkillNode(
      this.normalizeAiDraftNodes(aiDraft.nodes, dictionaryLookup, dictionary.source, {
        targetKind,
        targetId,
        targetName,
        sourcePath: sourceDoc.rel_posix,
        sourceMarkdown: sourceDoc.md_text,
      }),
      requireSkillNode,
    );
    const edges = this.normalizeAiDraftEdges(aiDraft.edges, nodes);
    if (!nodes.length || !edges.length) {
      throw new ServiceUnavailableException("AI 草案未返回可用的节点/连线，暂时无法创建 Ontology 草稿");
    }

    const saved = await this.saveDraft({
      flowKey,
      name: this.optionalText(input.name, 256) || aiDraft.flowName || `${targetName} AI 草案`,
      description: this.optionalText(input.description, 4000)
        || aiDraft.description
        || `由 AI 根据 ${targetName} 的专家配置文档生成的 Ontology 编排草案。`,
      status: "draft",
      brandId,
      workspaceScope: this.optionalText(input.workspaceScope, 128) || "all_network_growth",
      targetKind,
      targetId,
      targetName,
      sourceRefsJson: {
        ...sourceRefs,
        selected_target: {
          ...selectedTarget,
          id: targetId,
          kind: targetKind,
          label: targetName,
          path: sourceDoc.rel_posix,
        },
        ai_draft: {
          provider: aiDraft.provider,
          model: aiDraft.model,
          source_path: sourceDoc.rel_posix,
          source_sha256: sourceDoc.md_sha256,
          dictionary_scope: AI_DRAFT_DICTIONARY_SCOPE,
          dictionary_count: dictionary.items.length,
          generated_at: new Date().toISOString(),
        },
        generationMode: "llm_draft",
        source: sourceTag,
      },
      routingRulesJson: aiDraft.routingRules?.length ? aiDraft.routingRules : this.defaultRoutingRules(),
      confirmationGatesJson: aiDraft.confirmationGates?.length ? aiDraft.confirmationGates : this.defaultConfirmationGates(),
      evidenceRulesJson: aiDraft.evidenceRules?.length ? aiDraft.evidenceRules : this.defaultEvidenceRules(),
      createdBy: this.optionalText(input.createdBy, 128) || "ai-control-ai-draft",
      nodes,
      edges,
    });

    return {
      ...saved,
      generated: true,
      aiDraft: {
        provider: aiDraft.provider,
        model: aiDraft.model,
        sourcePath: sourceDoc.rel_posix,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
      boundary: "AI 只生成 Ontology 草案，用户仍需在画布内检查后发布；不写 WorkBuddy 真源，不直接触发执行。",
    };
  }

  private async findReusableFlowForTarget(targetKind: string, targetId: string) {
    const matches = await this.prisma.ontologyOrchestrationFlow.findMany({
      where: {
        targetKind,
        targetId,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        edges: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        versions: { orderBy: { versionNo: "desc" }, take: 5 },
      },
    });
    return this.selectReusableFlow(matches, false);
  }

  private async findReusableFlowForDraftCreate(
    tx: Prisma.TransactionClient,
    input: {
      flowKey: string;
      targetKind: string;
      targetId: string;
      source?: string | null;
    },
  ) {
    const source = this.optionalText(input.source, 128);
    const shouldReuseAnyExisting = !source
      || source === "ai-control-ontology-project-wizard"
      || source === "ai-control-ontology-project-wizard-ai-draft";
    const shouldReuseDraftOnly = source === "published_contract_draft_fork";
    if (!shouldReuseAnyExisting && !shouldReuseDraftOnly) {
      return null;
    }
    const matches = await tx.ontologyOrchestrationFlow.findMany({
      where: {
        targetKind: input.targetKind,
        targetId: input.targetId,
        flowKey: { not: input.flowKey },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        edges: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        versions: { orderBy: { versionNo: "desc" }, take: 5 },
      },
    });
    return this.selectReusableFlow(matches, shouldReuseDraftOnly);
  }

  private selectReusableFlow(
    flows: Array<Prisma.OntologyOrchestrationFlowGetPayload<{
      include: {
        nodes: true;
        edges: true;
        versions: true;
      };
    }>>,
    draftOnly: boolean,
  ) {
    const drafts = flows.filter((item) => item.status !== "published");
    if (drafts.length) {
      return drafts[0];
    }
    if (draftOnly) {
      return null;
    }
    return flows[0] || null;
  }

  async updateNodeReferences(flowIdOrKey: string, nodeKeyRaw: string, input: OntologyNodeReferencesInput) {
    await this.ensureDatabase();
    const flowLookup = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const nodeKey = this.requiredText(nodeKeyRaw, "nodeKey 必填", 128);
    const references = this.sanitizeReferences(input.references);
    const updatedBy = this.optionalText(input.updatedBy, 128) || "ai-control-ui";
    const note = this.optionalText(input.note, 500);

    const result = await this.prisma.$transaction(async (tx) => {
      const flow = await tx.ontologyOrchestrationFlow.findFirst({
        where: {
          OR: [
            { id: flowLookup },
            { flowKey: flowLookup },
          ],
        },
      });
      if (!flow) {
        throw new BadRequestException(`编排流程不存在：${flowLookup}`);
      }
      const existingNode = await tx.ontologyOrchestrationNode.findUnique({
        where: {
          flowId_nodeKey: {
            flowId: flow.id,
            nodeKey,
          },
        },
      });
      if (!existingNode) {
        throw new BadRequestException(`流程节点不存在：${nodeKey}`);
      }

      const referencesJson = this.mergeNodeReferencesJson(existingNode.referencesJson, references, {
        updatedBy,
        note,
      });
      const node = await tx.ontologyOrchestrationNode.update({
        where: {
          flowId_nodeKey: {
            flowId: flow.id,
            nodeKey,
          },
        },
        data: {
          referencesJson: this.json(referencesJson),
        },
      });
      await tx.ontologyOrchestrationFlow.update({
        where: { id: flow.id },
        data: { updatedAt: new Date() },
      });

      const nodes = await tx.ontologyOrchestrationNode.findMany({
        where: { flowId: flow.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      const edges = await tx.ontologyOrchestrationEdge.findMany({
        where: { flowId: flow.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      const latest = await tx.ontologyOrchestrationVersion.findFirst({
        where: { flowId: flow.id },
        orderBy: { versionNo: "desc" },
      });
      const version = await tx.ontologyOrchestrationVersion.create({
        data: {
          flowId: flow.id,
          versionNo: (latest?.versionNo || 0) + 1,
          status: "reference_binding_snapshot",
          snapshotJson: this.json({
            flow: {
              id: flow.id,
              flowKey: flow.flowKey,
              name: flow.name,
              status: flow.status,
              targetKind: flow.targetKind,
              targetId: flow.targetId,
              targetName: flow.targetName,
            },
            changedNodeKey: nodeKey,
            nodes,
            edges,
            savedAt: new Date().toISOString(),
          }),
          createdBy: updatedBy,
        },
      });

      return { flow, node, version };
    });

    return {
      ok: true,
      generated: false,
      published: false,
      item: result.node,
      version: result.version,
      boundary: "只更新当前项目节点 referencesJson；历史发布版本保留，需再次确认发布后才会成为最新正式契约。",
    };
  }

  async upsertNode(flowIdOrKey: string, input: OntologyNodeDraftInput) {
    await this.ensureDatabase();
    const flowLookup = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const nodeKey = this.requiredText(input.nodeKey, "nodeKey 必填", 128);
    const updatedBy = this.optionalText(input.updatedBy, 128) || "ai-control-ui";

    const result = await this.prisma.$transaction(async (tx) => {
      const flow = await this.getDraftFlowForMutation(tx, flowLookup);
      const existingNode = await tx.ontologyOrchestrationNode.findUnique({
        where: {
          flowId_nodeKey: {
            flowId: flow.id,
            nodeKey,
          },
        },
      });

      const node = existingNode
        ? await tx.ontologyOrchestrationNode.update({
          where: {
            flowId_nodeKey: {
              flowId: flow.id,
              nodeKey,
            },
          },
          data: this.toNodeUpdateInput(input),
        })
        : await tx.ontologyOrchestrationNode.create({
          data: this.toNodeCreateInput(flow.id, {
            nodeKey,
            nodeType: input.nodeType || "stage",
            title: input.title || "新流程节点",
            subtitle: input.subtitle || "",
            description: input.description || "",
            positionX: input.positionX,
            positionY: input.positionY,
            sortOrder: input.sortOrder,
            objectJson: input.objectJson,
            linkJson: input.linkJson,
            functionJson: input.functionJson,
            actionJson: input.actionJson,
            interfaceJson: input.interfaceJson,
            referencesJson: input.referencesJson,
          }, 999),
        });

      if (input.rebuildSequentialEdges) {
        await this.rebuildSequentialEdges(tx, flow.id);
      }
      await tx.ontologyOrchestrationFlow.update({
        where: { id: flow.id },
        data: { updatedAt: new Date() },
      });
      const skipSnapshot = !!existingNode && this.isCanvasLayoutOnlyNodeChange(existingNode, input);
      const version = skipSnapshot
        ? null
        : await this.createFlowSnapshot(tx, flow.id, "node_edit_snapshot", updatedBy, {
          changeKind: existingNode ? "node_updated" : "node_created",
          changedNodeKey: nodeKey,
          note: this.optionalText(input.note, 500),
        });

      return { node, version };
    });

    return {
      ok: true,
      generated: false,
      published: false,
      item: result.node,
      version: result.version,
      boundary: "只新增或更新草稿节点五元素，不调用 AI 模型，不发布 WorkBuddy 执行契约。",
    };
  }

  async deleteNode(flowIdOrKey: string, nodeKeyRaw: string, input: { updatedBy?: string; note?: string; rebuildSequentialEdges?: boolean } = {}) {
    await this.ensureDatabase();
    const flowLookup = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const nodeKey = this.requiredText(nodeKeyRaw, "nodeKey 必填", 128);
    const updatedBy = this.optionalText(input.updatedBy, 128) || "ai-control-ui";

    const result = await this.prisma.$transaction(async (tx) => {
      const flow = await this.getDraftFlowForMutation(tx, flowLookup);
      const existingNode = await tx.ontologyOrchestrationNode.findUnique({
        where: {
          flowId_nodeKey: {
            flowId: flow.id,
            nodeKey,
          },
        },
      });
      if (!existingNode) {
        throw new BadRequestException(`流程节点不存在：${nodeKey}`);
      }

      await tx.ontologyOrchestrationEdge.deleteMany({
        where: {
          flowId: flow.id,
          OR: [
            { fromNodeKey: nodeKey },
            { toNodeKey: nodeKey },
          ],
        },
      });
      await tx.ontologyOrchestrationNode.delete({
        where: {
          flowId_nodeKey: {
            flowId: flow.id,
            nodeKey,
          },
        },
      });
      if (input.rebuildSequentialEdges) {
        await this.rebuildSequentialEdges(tx, flow.id);
      }
      await tx.ontologyOrchestrationFlow.update({
        where: { id: flow.id },
        data: { updatedAt: new Date() },
      });
      const version = await this.createFlowSnapshot(tx, flow.id, "node_edit_snapshot", updatedBy, {
        changeKind: "node_deleted",
        changedNodeKey: nodeKey,
        note: this.optionalText(input.note, 500),
      });

      return { deletedNodeKey: nodeKey, version };
    });

    return {
      ok: true,
      generated: false,
      published: false,
      deletedNodeKey: result.deletedNodeKey,
      version: result.version,
      boundary: "只删除草稿节点并重建草稿顺序连线，不调用 AI 模型，不发布 WorkBuddy 执行契约。",
    };
  }

  async upsertEdge(flowIdOrKey: string, input: OntologyEdgeDraftInput) {
    await this.ensureDatabase();
    const flowLookup = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const edgeKey = this.requiredText(input.edgeKey, "edgeKey 必填", 128);
    const fromNodeKey = this.requiredText(input.fromNodeKey, "fromNodeKey 必填", 128);
    const toNodeKey = this.requiredText(input.toNodeKey, "toNodeKey 必填", 128);
    if (fromNodeKey === toNodeKey) {
      throw new BadRequestException("连线起点和终点不能相同");
    }
    const updatedBy = this.optionalText(input.updatedBy, 128) || "ai-control-ui";

    const result = await this.prisma.$transaction(async (tx) => {
      const flow = await this.getDraftFlowForMutation(tx, flowLookup);
      await this.assertNodeExists(tx, flow.id, fromNodeKey, "fromNodeKey");
      await this.assertNodeExists(tx, flow.id, toNodeKey, "toNodeKey");

      const existingEdge = await tx.ontologyOrchestrationEdge.findUnique({
        where: {
          flowId_edgeKey: {
            flowId: flow.id,
            edgeKey,
          },
        },
      });
      const edge = existingEdge
        ? await tx.ontologyOrchestrationEdge.update({
          where: {
            flowId_edgeKey: {
              flowId: flow.id,
              edgeKey,
            },
          },
          data: this.toEdgeUpdateInput(input),
        })
        : await tx.ontologyOrchestrationEdge.create({
          data: this.toEdgeCreateInput(flow.id, {
            edgeKey,
            fromNodeKey,
            toNodeKey,
            label: input.label || "业务连线",
            conditionJson: input.conditionJson ?? { mode: "manual_draft" },
            sortOrder: input.sortOrder,
          }, 999),
        });

      await tx.ontologyOrchestrationFlow.update({
        where: { id: flow.id },
        data: { updatedAt: new Date() },
      });
      const version = await this.createFlowSnapshot(tx, flow.id, "edge_rule_snapshot", updatedBy, {
        changeKind: existingEdge ? "edge_updated" : "edge_created",
        changedEdgeKey: edgeKey,
        note: this.optionalText(input.note, 500),
      });

      return { edge, version };
    });

    return {
      ok: true,
      generated: false,
      published: false,
      item: result.edge,
      version: result.version,
      boundary: "只新增或更新草稿连线规则，不调用 AI 模型，不发布 WorkBuddy 执行契约。",
    };
  }

  async deleteEdge(flowIdOrKey: string, edgeKeyRaw: string, input: { updatedBy?: string; note?: string } = {}) {
    await this.ensureDatabase();
    const flowLookup = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const edgeKey = this.requiredText(edgeKeyRaw, "edgeKey 必填", 128);
    const updatedBy = this.optionalText(input.updatedBy, 128) || "ai-control-ui";

    const result = await this.prisma.$transaction(async (tx) => {
      const flow = await this.getDraftFlowForMutation(tx, flowLookup);
      const existingEdge = await tx.ontologyOrchestrationEdge.findUnique({
        where: {
          flowId_edgeKey: {
            flowId: flow.id,
            edgeKey,
          },
        },
      });
      if (!existingEdge) {
        throw new BadRequestException(`流程连线不存在：${edgeKey}`);
      }
      await tx.ontologyOrchestrationEdge.delete({
        where: {
          flowId_edgeKey: {
            flowId: flow.id,
            edgeKey,
          },
        },
      });
      await tx.ontologyOrchestrationFlow.update({
        where: { id: flow.id },
        data: { updatedAt: new Date() },
      });
      const version = await this.createFlowSnapshot(tx, flow.id, "edge_rule_snapshot", updatedBy, {
        changeKind: "edge_deleted",
        changedEdgeKey: edgeKey,
        note: this.optionalText(input.note, 500),
      });

      return { deletedEdgeKey: edgeKey, version };
    });

    return {
      ok: true,
      generated: false,
      published: false,
      deletedEdgeKey: result.deletedEdgeKey,
      version: result.version,
      boundary: "只删除草稿连线规则，不调用 AI 模型，不发布 WorkBuddy 执行契约。",
    };
  }

  async updateFlowRules(flowIdOrKey: string, input: OntologyFlowRulesInput) {
    await this.ensureDatabase();
    const flowLookup = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const updatedBy = this.optionalText(input.updatedBy, 128) || "ai-control-ui";

    const result = await this.prisma.$transaction(async (tx) => {
      const flow = await this.getDraftFlowForMutation(tx, flowLookup);
      const data: Record<string, unknown> = {};
      if (input.routingRulesJson !== undefined) data.routingRulesJson = this.json(input.routingRulesJson);
      if (input.confirmationGatesJson !== undefined) data.confirmationGatesJson = this.json(input.confirmationGatesJson);
      if (input.evidenceRulesJson !== undefined) data.evidenceRulesJson = this.json(input.evidenceRulesJson);
      if (!Object.keys(data).length) {
        throw new BadRequestException("至少需要提交一项流程规则");
      }

      const updated = await tx.ontologyOrchestrationFlow.update({
        where: { id: flow.id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      const version = await this.createFlowSnapshot(tx, flow.id, "flow_rule_snapshot", updatedBy, {
        changeKind: "flow_rules_updated",
        note: this.optionalText(input.note, 500),
      });

      return { flow: updated, version };
    });

    return {
      ok: true,
      generated: false,
      published: false,
      item: result.flow,
      version: result.version,
      boundary: "只更新草稿确认闸与证据规则，不调用 AI 模型，不发布 WorkBuddy 执行契约。",
    };
  }

  private flowPublishRiskChecks(flow: {
    status: string;
    nodes: unknown[];
    edges: unknown[];
    routingRulesJson: unknown;
    confirmationGatesJson: unknown;
    evidenceRulesJson: unknown;
  }) {
    const checks = [];
    if (!flow.nodes.length) {
      checks.push({ level: "BLOCKER", code: "NO_NODES", message: "流程没有节点，不能形成发布候选契约。" });
    }
    if (flow.nodes.length > 1 && !flow.edges.length) {
      checks.push({ level: "BLOCKER", code: "NO_EDGES", message: "多节点流程没有连线，WorkBuddy 无法判断执行顺序。" });
    }
    if (flow.status === "published") {
      checks.push({ level: "WARN", code: "ALREADY_PUBLISHED", message: "当前流程已发布；再次确认发布会生成新的正式版本，历史版本保留，WorkBuddy 默认读取最新版本。" });
    }
    if (this.isEmptyJson(flow.routingRulesJson)) {
      checks.push({ level: "WARN", code: "MISSING_ROUTING_RULES", message: "缺少路由规则，后续自然语言命中流程的依据不足。" });
    }
    if (this.isEmptyJson(flow.confirmationGatesJson)) {
      checks.push({ level: "WARN", code: "MISSING_CONFIRMATION_GATES", message: "缺少确认闸，后续发布前需明确哪些动作需要用户确认。" });
    }
    if (this.isEmptyJson(flow.evidenceRulesJson)) {
      checks.push({ level: "WARN", code: "MISSING_EVIDENCE_RULES", message: "缺少证据规则，后续执行后可能无法稳定写回任务账本。" });
    }
    if (!checks.length) {
      checks.push({ level: "PASS", code: "FLOW_PREVIEW_READY", message: "流程主信息、节点、连线和规则具备发布预览条件。" });
    }
    return checks;
  }

  private nodePublishRiskChecks(node: {
    nodeKey: string;
    title: string;
    nodeType?: string;
    objectJson: unknown;
    linkJson: unknown;
    functionJson: unknown;
    actionJson: unknown;
    interfaceJson: unknown;
    referencesJson: unknown;
  }) {
    const checks = [];
    const ontologyRefs = this.extractNodeOntologyRefs(node);
    const missing = [
      ["Object", ontologyRefs.objectElementIds],
      ["Link", ontologyRefs.linkElementIds],
      ["Function", ontologyRefs.functionElementIds],
      ["Action", ontologyRefs.actionElementIds],
      ["Interface", ontologyRefs.interfaceElementIds],
    ].filter(([, value]) => this.isEmptyJson(value)).map(([name]) => name);
    if (missing.length) {
      checks.push({
        level: "BLOCKER",
        code: "NODE_FIVE_ELEMENTS_INCOMPLETE",
        message: `节点「${node.title || node.nodeKey}」五元素缺失：${missing.join(", ")}。`,
        nodeKey: node.nodeKey,
      });
    }
    return checks;
  }

  private edgePublishRiskChecks(edge: { edgeKey: string; fromNodeKey: string; toNodeKey: string; conditionJson: unknown }, nodeKeys: Set<string>) {
    const checks = [];
    if (!nodeKeys.has(edge.fromNodeKey) || !nodeKeys.has(edge.toNodeKey)) {
      checks.push({
        level: "BLOCKER",
        code: "EDGE_NODE_MISSING",
        message: `连线「${edge.edgeKey}」指向不存在的节点。`,
        edgeKey: edge.edgeKey,
      });
    }
    if (this.isEmptyJson(edge.conditionJson)) {
      checks.push({
        level: "WARN",
        code: "EDGE_CONDITION_EMPTY",
        message: `连线「${edge.edgeKey}」缺少条件说明。`,
        edgeKey: edge.edgeKey,
      });
    }
    return checks;
  }

  private orderContractNodes(nodes: any[], edges: any[]) {
    const nodeMap = new Map<string, any>();
    for (const node of nodes) {
      const nodeKey = String(node?.nodeKey || "");
      if (nodeKey) nodeMap.set(nodeKey, node);
    }
    const ordered: any[] = [];
    const visited = new Set<string>();
    const outgoing = new Map<string, string[]>();
    for (const edge of edges) {
      const from = String(edge?.fromNodeKey || "");
      const to = String(edge?.toNodeKey || "");
      if (!from || !to) continue;
      outgoing.set(from, [...(outgoing.get(from) || []), to]);
    }
    const walk = (nodeKey: string) => {
      if (!nodeKey || visited.has(nodeKey)) return;
      const node = nodeMap.get(nodeKey);
      if (!node) return;
      visited.add(nodeKey);
      ordered.push(node);
      for (const nextKey of outgoing.get(nodeKey) || []) walk(nextKey);
    };
    for (const nodeKey of this.startNodeKeys(nodes, edges)) walk(nodeKey);
    for (const node of nodes) walk(String(node?.nodeKey || ""));
    return ordered.length ? ordered : nodes;
  }

  private startNodeKeys(nodes: any[], edges: any[]) {
    const nodeKeys = nodes.map((node) => String(node?.nodeKey || "")).filter(Boolean);
    const incoming = new Set(edges.map((edge) => String(edge?.toNodeKey || "")).filter(Boolean));
    const starts = nodeKeys.filter((nodeKey) => !incoming.has(nodeKey));
    return starts.length ? starts : nodeKeys.slice(0, 1);
  }

  private boundElements(value: unknown) {
    const normalized = value as { boundElements?: unknown } | null | undefined;
    return Array.isArray(normalized?.boundElements) ? normalized.boundElements : [];
  }

  private async buildStructureChangesReport(flowIdOrKey: string, action: "structure_scan" | "structure_changes_read") {
    await this.ensureDatabase();
    const normalized = this.requiredText(flowIdOrKey, "flowId 必填", 128);
    const flow = await this.prisma.ontologyOrchestrationFlow.findFirst({
      where: {
        OR: [
          { id: normalized },
          { flowKey: normalized },
        ],
      },
      include: {
        nodes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!flow) {
      throw new BadRequestException(`编排流程不存在：${normalized}`);
    }

    const sourceCache = new Map<string, Promise<Record<string, any>>>();
    const nodes = await Promise.all(flow.nodes.map(async (node) => {
      const bindings = this.extractStructureSourceBindings(node);
      if (!bindings.length) {
        return {
          nodeKey: node.nodeKey,
          title: node.title,
          nodeType: node.nodeType,
          bindingCount: 0,
          sourceCount: 0,
          historyCount: 0,
          status: "unbound",
          summary: "当前节点还没有绑定真实专家源文件。",
          sources: [],
        };
      }

      const sources: Array<Awaited<ReturnType<typeof this.inspectStructureSourceBinding>> & { bindingId: string; label: string }> = await Promise.all(bindings.map(async (binding) => {
        const cacheKey = `${binding.kind}:${binding.relPath}`;
        let pending = sourceCache.get(cacheKey);
        if (!pending) {
          pending = this.inspectStructureSourceBinding(binding);
          sourceCache.set(cacheKey, pending);
        }
        const resolved = await pending;
        return {
          ...resolved,
          bindingId: binding.bindingId,
          label: binding.label || resolved.label,
        } as Awaited<ReturnType<typeof this.inspectStructureSourceBinding>> & { bindingId: string; label: string };
      }));

      const missingCount = sources.filter((item) => item.status === "missing").length;
      const changedCount = sources.filter((item) => item.status === "changed").length;
      const untrackedCount = sources.filter((item) => item.status === "untracked").length;
      const historyCount = sources.reduce((total, item) => total + Number(item.historyCount || 0), 0);
      let status = "synced";
      let summary = `已读取 ${sources.length} 个绑定源，当前与本机快照一致。`;
      if (missingCount > 0) {
        status = "missing";
        summary = `检测到 ${missingCount} 个绑定源不可读取，需要先修正路径或挂载。`;
      } else if (changedCount > 0) {
        status = "changed";
        summary = `检测到 ${changedCount} 个绑定源相对本机快照发生变化。`;
      } else if (untrackedCount > 0) {
        status = "untracked";
        summary = `已读取 ${sources.length} 个绑定源，但其中 ${untrackedCount} 个还没有本机快照基线。`;
      }

      return {
        nodeKey: node.nodeKey,
        title: node.title,
        nodeType: node.nodeType,
        bindingCount: bindings.length,
        sourceCount: sources.length,
        historyCount,
        status,
        summary,
        sources,
      };
    }));

    const sourceCount = nodes.reduce((total, node) => total + Number(node.sourceCount || 0), 0);
    const boundNodeCount = nodes.filter((node) => node.sourceCount > 0).length;
    const changedNodeCount = nodes.filter((node) => node.status === "changed").length;
    const missingNodeCount = nodes.filter((node) => node.status === "missing").length;
    const untrackedNodeCount = nodes.filter((node) => node.status === "untracked").length;
    const unboundNodeCount = nodes.filter((node) => node.status === "unbound").length;
    const syncedNodeCount = nodes.filter((node) => node.status === "synced").length;
    const scannedAt = new Date().toISOString();

    return {
      ok: true,
      generated: false,
      action,
      item: {
        flowId: flow.id,
        flowKey: flow.flowKey,
        targetKind: flow.targetKind,
        targetId: flow.targetId,
        targetName: flow.targetName,
        scannedAt,
        summary: {
          nodeCount: nodes.length,
          boundNodeCount,
          sourceCount,
          changedNodeCount,
          missingNodeCount,
          untrackedNodeCount,
          unboundNodeCount,
          syncedNodeCount,
        },
        nodes,
      },
      boundary: "只读扫描当前画布节点绑定的 expert-source 文件，并结合本机快照历史生成节点级变化摘要；不发布、不写盘、不修改 WorkBuddy 真源。",
    };
  }

  private extractStructureSourceBindings(node: { referencesJson?: unknown }) {
    const out: Array<{
      bindingId: string;
      kind: string;
      label: string;
      relPath: string;
      refType: string;
    }> = [];
    const seen = new Set<string>();
    for (const item of this.boundElements(node.referencesJson)) {
      const record = item as Record<string, unknown>;
      const kind = this.normalizeStructureBindingKind(record.kind, record.id);
      if (!["expert", "expert_team", "skill", "prompt"].includes(kind)) continue;
      const relPath = this.resolveStructureBindingPath(record.path, record.id, kind);
      if (!relPath) continue;
      const dedupeKey = `${kind}:${relPath}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push({
        bindingId: this.optionalText(record.id, 1000) || dedupeKey,
        kind,
        label: this.optionalText(record.label, 256) || this.optionalText(record.name, 256) || relPath,
        relPath,
        refType: this.optionalText(record.refType, 128) || "expert_source_file",
      });
    }
    return out;
  }

  private normalizeStructureBindingKind(rawKind: unknown, rawId: unknown) {
    const kind = this.optionalText(rawKind, 128).toLowerCase();
    if (kind) return kind;
    const id = this.optionalText(rawId, 1000);
    if (!id.includes(":")) return "";
    return this.optionalText(id.split(":")[0], 128).toLowerCase();
  }

  private resolveStructureBindingPath(rawPath: unknown, rawId: unknown, kind: string) {
    const directPath = this.optionalText(rawPath, 1000).replace(/\\/g, "/").replace(/^\/+/, "");
    if (directPath) return directPath;
    const id = this.optionalText(rawId, 1000);
    if (!id) return "";
    const expectedPrefix = kind ? `${kind}:` : "";
    const suffix = expectedPrefix && id.toLowerCase().startsWith(expectedPrefix.toLowerCase())
      ? id.slice(expectedPrefix.length)
      : id.includes(":")
        ? id.split(":").slice(1).join(":")
        : id;
    return String(suffix || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  }

  private async inspectStructureSourceBinding(binding: {
    kind: string;
    label: string;
    relPath: string;
    refType: string;
  }) {
    try {
      const current = MdWriter.readMarkdownAtomic(binding.relPath);
      const history = await this.mdWriter.listLocalHistory({ path: current.rel_posix, limit: 20 });
      const entries = Array.isArray((history as any)?.entries) ? (history as any).entries : [];
      const latestSnapshot = entries[0] || null;
      const latestSnapshotSha = this.optionalText(latestSnapshot?.source_sha256, 128) || "";
      const changedSinceLatestSnapshot = !!latestSnapshotSha && latestSnapshotSha !== current.md_sha256;
      const currentDiff = changedSinceLatestSnapshot && latestSnapshot?.id
        ? await this.buildCurrentStructureDiffInsight(current.rel_posix, current.md_text, latestSnapshot)
        : null;
      const historyVersions = this.buildStructureHistoryVersions(current.rel_posix, entries);
      return {
        kind: binding.kind,
        label: binding.label,
        relPath: current.rel_posix,
        refType: binding.refType,
        status: latestSnapshot
          ? (changedSinceLatestSnapshot ? "changed" : "synced")
          : "untracked",
        note: latestSnapshot
          ? (changedSinceLatestSnapshot ? "相对最近本机快照已发生变化。" : "当前内容与最近本机快照一致。")
          : "当前文件还没有本机快照基线。",
        currentSha256: current.md_sha256,
        bytes: Buffer.byteLength(current.md_text, "utf-8"),
        historyCount: entries.length,
        changedSinceLatestSnapshot,
        currentChangeSummary: currentDiff?.summary || "",
        currentChangeDetails: currentDiff?.details || [],
        historyVersions,
        latestSnapshot: latestSnapshot
          ? {
              id: this.optionalText(latestSnapshot.id, 128),
              createdAt: this.optionalText(latestSnapshot.created_at, 128),
              sourceSha256: latestSnapshotSha || null,
            }
          : null,
      };
    } catch (error) {
      return {
        kind: binding.kind,
        label: binding.label,
        relPath: binding.relPath,
        refType: binding.refType,
        status: "missing",
        note: error instanceof Error ? error.message : String(error),
        currentSha256: null,
        bytes: null,
        historyCount: 0,
        changedSinceLatestSnapshot: false,
        currentChangeSummary: "",
        currentChangeDetails: [],
        historyVersions: [],
        latestSnapshot: null,
      };
    }
  }

  private async buildCurrentStructureDiffInsight(
    relPath: string,
    currentText: string,
    latestSnapshot: Record<string, unknown>,
  ) {
    const snapshotId = this.optionalText(latestSnapshot.id, 128);
    if (!snapshotId) return null;
    try {
      const preview = await this.mdWriter.previewLocalSnapshotRestore({ snapshot_id: snapshotId });
      const diff = this.optionalText((preview as any)?.diff, 200000);
      return this.summarizeStructureDiff(
        diff,
        currentText === this.readSnapshotContent(latestSnapshot)
          ? "当前内容与最近本机快照一致。"
          : "检测到当前内容相对最近本机快照已发生变化。",
      );
    } catch {
      return null;
    }
  }

  private buildStructureHistoryVersions(relPath: string, entries: Array<Record<string, unknown>>) {
    const versions: Array<{
      id: string;
      createdAt: string;
      note: string;
      sourceSha256: string | null;
      summary: string;
      details: string[];
    }> = [];
    for (let index = 1; index < entries.length && versions.length < 5; index += 1) {
      const older = entries[index];
      const newer = entries[index - 1];
      const olderText = this.readSnapshotContent(older);
      const newerText = this.readSnapshotContent(newer);
      if (olderText === null || newerText === null) {
        continue;
      }
      const diff = olderText === newerText ? "" : MdWriter.buildUnifiedDiff(relPath, olderText, newerText);
      const insight = this.summarizeStructureDiff(diff, "这两个历史快照之间没有检测到正文变化。");
      versions.push({
        id: this.optionalText(older.id, 128) || `history_${index}`,
        createdAt: this.optionalText(older.created_at, 128) || "",
        note: this.humanizeStructureSnapshotNote(this.optionalText(older.note, 500)),
        sourceSha256: this.optionalText(older.source_sha256, 128) || null,
        summary: insight.summary,
        details: insight.details,
      });
    }
    return versions;
  }

  private readSnapshotContent(entry: Record<string, unknown>) {
    const contentPath = this.optionalText(entry.content_path, 2000);
    if (!contentPath) return null;
    try {
      return readFileSync(contentPath, "utf-8");
    } catch {
      return null;
    }
  }

  private humanizeStructureSnapshotNote(note: string) {
    if (!note) return "历史快照";
    if (note === "manual_snapshot_before_write") {
      return "手动建立的本机基线快照";
    }
    if (note.startsWith("pre_write_snapshot_for_save_request_")) {
      return "写回申请前快照";
    }
    if (note.startsWith("pre_write_snapshot_for_execute_")) {
      return "写回执行前快照";
    }
    if (note.startsWith("post_write_snapshot_for_execute_")) {
      return "写回执行后快照";
    }
    if (note.startsWith("publish_and_sync_already_in_sync_")) {
      return "发布同步巡检时记录的对齐快照";
    }
    return this.humanizeOntologySnapshotNote(note);
  }

  private humanizeOntologySnapshotNote(note: string) {
    if (!note) return "";
    const mapping: Record<string, string> = {
      "S3-02E node reference binding": "更新节点绑定真源",
      "S3-02F node field edit": "编辑节点五元素与说明",
      "S3-02U typed node add": "新增节点",
      "S3-02U typed node add auto edge": "新增节点后自动补连线",
      "S3-02F delete node": "删除节点",
      "S3-02G edge rule edit": "编辑连线规则",
      "S3-02T canvas inline edge add": "从画布快速新增连线",
      "S3-02T canvas node drag position": "仅调整节点画布位置",
      "S3-02G delete edge": "删除连线",
      "S3-02G confirmation and evidence rules": "更新确认闸与证据规则",
      "S3-02ZZB publish and sync ontology contract": "发布并同步 Ontology 正式契约",
    };
    return mapping[note] || note;
  }

  private summarizeStructureDiff(diff: string, fallbackSummary: string) {
    const added: string[] = [];
    const removed: string[] = [];
    let addedCount = 0;
    let removedCount = 0;
    for (const line of String(diff || "").split(/\r?\n/)) {
      if (!line || line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")) continue;
      if (line.startsWith("+")) {
        addedCount += 1;
        const value = line.slice(1).trim();
        if (value && added.length < 3) {
          added.push(this.trimDiffText(value));
        }
        continue;
      }
      if (line.startsWith("-")) {
        removedCount += 1;
        const value = line.slice(1).trim();
        if (value && removed.length < 3) {
          removed.push(this.trimDiffText(value));
        }
      }
    }
    if (!addedCount && !removedCount) {
      return { summary: fallbackSummary, details: [] as string[] };
    }
    const summary = `新增 ${addedCount} 行，删除 ${removedCount} 行。`;
    const details: string[] = [];
    if (added.length) {
      details.push(`新增重点：${added.join("；")}`);
    }
    if (removed.length) {
      details.push(`删除重点：${removed.join("；")}`);
    }
    return { summary, details };
  }

  private trimDiffText(value: string) {
    const compact = value.replace(/\s+/g, " ").trim();
    if (compact.length <= 72) return compact;
    return `${compact.slice(0, 69)}...`;
  }

  private toRollbackVersionSummary(version: {
    id: string;
    versionNo: number;
    status: string;
    createdAt: Date;
    publishedAt: Date | null;
    createdBy: string | null;
    snapshotJson: unknown;
  }) {
    const snapshot = this.asRecord(version.snapshotJson);
    const contract = this.asRecord(snapshot.contract);
    const contractNodes = Array.isArray(contract.nodes) ? contract.nodes : [];
    const contractEdges = Array.isArray(contract.edges) ? contract.edges : [];
    const snapshotNodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
    const snapshotEdges = Array.isArray(snapshot.edges) ? snapshot.edges : [];
    const sourceNodes = contractNodes.length ? contractNodes : snapshotNodes;
    const sourceEdges = contractEdges.length ? contractEdges : snapshotEdges;
    return {
      id: version.id,
      versionNo: version.versionNo,
      status: version.status,
      label: this.formatRollbackVersionLabel(version.status),
      createdAt: version.createdAt.toISOString(),
      publishedAt: version.publishedAt?.toISOString() || null,
      createdBy: this.optionalText(version.createdBy, 128) || "system",
      nodeCount: sourceNodes.length,
      edgeCount: sourceEdges.length,
      note: this.humanizeOntologySnapshotNote(this.optionalText(snapshot.note, 500))
        || this.optionalText(snapshot.changeKind, 128)
        || "",
      ruleSource: contractNodes.length
        ? "published_contract"
        : this.optionalText(snapshot.rollbackRuleSource, 64)
          || (snapshot.routingRulesJson !== undefined || snapshot.confirmationGatesJson !== undefined || snapshot.evidenceRulesJson !== undefined
            ? "snapshot"
            : "current_fallback"),
      candidateHash: this.optionalText(snapshot.candidateHash, 128) || this.optionalText(contract.sourceCandidateHash, 128) || "",
      rollbackReady: sourceNodes.length > 0,
    };
  }

  private toNodeVersionSummary(
    version: {
      id: string;
      versionNo: number;
      status: string;
      createdAt: Date;
      publishedAt: Date | null;
      createdBy: string | null;
      snapshotJson: unknown;
    },
    nodeKey: string,
  ) {
    const snapshot = this.asRecord(version.snapshotJson);
    const contract = this.asRecord(snapshot.contract);
    const contractNodes = Array.isArray(contract.nodes) ? contract.nodes : [];
    const contractEdges = Array.isArray(contract.edges) ? contract.edges : [];
    const snapshotNodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
    const snapshotEdges = Array.isArray(snapshot.edges) ? snapshot.edges : [];
    const sourceNodes = contractNodes.length ? contractNodes : snapshotNodes;
    const sourceEdges = contractEdges.length ? contractEdges : snapshotEdges;
    const rawNode = sourceNodes.find((item) => this.optionalText(this.asRecord(item).nodeKey, 128) === nodeKey);
    if (!rawNode) return null;

    const node = this.asRecord(rawNode);
    const fiveElements = this.asRecord(node.fiveElements);
    const references = this.asRecord(node.references ?? node.referencesJson);
    const candidateHash = this.optionalText(snapshot.candidateHash, 128) || this.optionalText(contract.sourceCandidateHash, 128) || "";
    const connectedEdgeCount = sourceEdges.filter((item) => {
      const edge = this.asRecord(item);
      return this.optionalText(edge.fromNodeKey, 128) === nodeKey || this.optionalText(edge.toNodeKey, 128) === nodeKey;
    }).length;

    return {
      id: version.id,
      versionNo: version.versionNo,
      status: version.status,
      label: this.formatRollbackVersionLabel(version.status),
      createdAt: version.createdAt.toISOString(),
      publishedAt: version.publishedAt?.toISOString() || null,
      createdBy: this.optionalText(version.createdBy, 128) || "system",
      nodeKey,
      nodeType: this.optionalText(node.nodeType, 64) || "stage",
      title: this.optionalText(node.title, 256) || nodeKey,
      subtitle: this.optionalText(node.subtitle, 256) || "",
      description: this.optionalText(node.description, 4000) || "",
      objectCount: this.countNodeValueEntries(fiveElements.object ?? node.objectJson),
      linkCount: this.countNodeValueEntries(fiveElements.link ?? node.linkJson),
      functionCount: this.countNodeValueEntries(fiveElements.function ?? node.functionJson),
      actionCount: this.countNodeValueEntries(fiveElements.action ?? node.actionJson),
      interfaceCount: this.countNodeValueEntries(fiveElements.interface ?? node.interfaceJson),
      boundReferenceCount: this.countNodeValueEntries(references.boundElements),
      connectedEdgeCount,
      note: this.humanizeOntologySnapshotNote(this.optionalText(snapshot.note, 500))
        || this.optionalText(snapshot.changeKind, 128)
        || "",
      candidateHash,
    };
  }

  private async resolveRollbackSourceVersion(
    tx: Prisma.TransactionClient,
    flowId: string,
    input: {
      versionId?: string;
      versionNo?: number;
    },
  ) {
    const versionId = this.optionalText(input.versionId, 128);
    const versionNo = Number.isFinite(Number(input.versionNo)) ? Number(input.versionNo) : null;
    if (!versionId && !versionNo) {
      throw new BadRequestException("versionId 或 versionNo 必须至少提供一项");
    }
    const version = await tx.ontologyOrchestrationVersion.findFirst({
      where: {
        flowId,
        ...(versionId ? { id: versionId } : { versionNo: versionNo || undefined }),
      },
      orderBy: { versionNo: "desc" },
    });
    if (!version) {
      throw new BadRequestException("未找到指定的历史版本");
    }
    return version;
  }

  private buildRollbackDraftPayload(
    sourceVersion: {
      id: string;
      versionNo: number;
      status: string;
      snapshotJson: unknown;
    },
    currentFlow: {
      routingRulesJson: unknown;
      confirmationGatesJson: unknown;
      evidenceRulesJson: unknown;
    },
  ) {
    const snapshot = this.asRecord(sourceVersion.snapshotJson);
    const contract = this.asRecord(snapshot.contract);
    const publishedNodes = Array.isArray(contract.nodes) ? contract.nodes : [];
    const publishedEdges = Array.isArray(contract.edges) ? contract.edges : [];
    const rawNodes = publishedNodes.length ? publishedNodes : (Array.isArray(snapshot.nodes) ? snapshot.nodes : []);
    const rawEdges = publishedEdges.length ? publishedEdges : (Array.isArray(snapshot.edges) ? snapshot.edges : []);
    const nodes = this.normalizeRollbackNodes(rawNodes);
    const edges = this.normalizeRollbackEdges(rawEdges);
    if (!nodes.length) {
      throw new BadRequestException(`历史版本 v${sourceVersion.versionNo} 不包含可恢复的节点数据`);
    }

    const hasSnapshotRules = snapshot.routingRulesJson !== undefined
      || snapshot.confirmationGatesJson !== undefined
      || snapshot.evidenceRulesJson !== undefined;
    const ruleSource = publishedNodes.length
      ? "published_contract"
      : hasSnapshotRules
        ? "snapshot"
        : "current_fallback";

    return {
      nodes,
      edges,
      routingRulesJson: publishedNodes.length
        ? (contract.routingRules ?? currentFlow.routingRulesJson)
        : (snapshot.routingRulesJson ?? currentFlow.routingRulesJson),
      confirmationGatesJson: publishedNodes.length
        ? (contract.confirmationGates ?? currentFlow.confirmationGatesJson)
        : (snapshot.confirmationGatesJson ?? currentFlow.confirmationGatesJson),
      evidenceRulesJson: publishedNodes.length
        ? (contract.evidenceRules ?? currentFlow.evidenceRulesJson)
        : (snapshot.evidenceRulesJson ?? currentFlow.evidenceRulesJson),
      ruleSource,
    };
  }

  private buildRollbackNodePayload(
    sourceVersion: {
      id: string;
      versionNo: number;
      status: string;
      snapshotJson: unknown;
    },
    nodeKey: string,
  ) {
    const snapshot = this.asRecord(sourceVersion.snapshotJson);
    const contract = this.asRecord(snapshot.contract);
    const publishedNodes = Array.isArray(contract.nodes) ? contract.nodes : [];
    const rawNodes = publishedNodes.length ? publishedNodes : (Array.isArray(snapshot.nodes) ? snapshot.nodes : []);
    const restoredNode = this.normalizeRollbackNodes(rawNodes).find((item) => item.nodeKey === nodeKey);
    if (!restoredNode) {
      throw new BadRequestException(`历史版本 v${sourceVersion.versionNo} 不包含节点：${nodeKey}`);
    }
    return restoredNode;
  }

  private normalizeRollbackNodes(rawNodes: unknown[]) {
    const out: FiveElementNodeInput[] = [];
    for (const rawNode of rawNodes) {
      const node = this.asRecord(rawNode);
      const fiveElements = this.asRecord(node.fiveElements);
      const nodeKey = this.optionalText(node.nodeKey, 128);
      if (!nodeKey) continue;
      out.push({
        nodeKey,
        nodeType: this.optionalText(node.nodeType, 64) || "stage",
        title: this.optionalText(node.title, 256) || "未命名节点",
        subtitle: this.optionalText(node.subtitle, 256),
        description: this.optionalText(node.description, 4000),
        positionX: this.optionalNumber(node.positionX),
        positionY: this.optionalNumber(node.positionY),
        sortOrder: this.optionalNumber(node.sortOrder),
        objectJson: fiveElements.object ?? node.objectJson,
        linkJson: fiveElements.link ?? node.linkJson,
        functionJson: fiveElements.function ?? node.functionJson,
        actionJson: fiveElements.action ?? node.actionJson,
        interfaceJson: fiveElements.interface ?? node.interfaceJson,
        referencesJson: node.references ?? node.referencesJson,
      });
    }
    return out;
  }

  private normalizeRollbackEdges(rawEdges: unknown[]) {
    const out: FlowEdgeInput[] = [];
    for (const rawEdge of rawEdges) {
      const edge = this.asRecord(rawEdge);
      const edgeKey = this.optionalText(edge.edgeKey, 128);
      const fromNodeKey = this.optionalText(edge.fromNodeKey, 128);
      const toNodeKey = this.optionalText(edge.toNodeKey, 128);
      if (!edgeKey || !fromNodeKey || !toNodeKey) continue;
      out.push({
        edgeKey,
        fromNodeKey,
        toNodeKey,
        label: this.optionalText(edge.label, 256),
        conditionJson: edge.condition ?? edge.conditionJson,
        sortOrder: this.optionalNumber(edge.sortOrder),
      });
    }
    return out;
  }

  private formatRollbackVersionLabel(status: string) {
    const map: Record<string, string> = {
      draft_snapshot: "草稿快照",
      node_edit_snapshot: "节点快照",
      edge_rule_snapshot: "连线快照",
      flow_rule_snapshot: "规则快照",
      published_contract: "正式发布版",
      reference_binding_snapshot: "绑定快照",
      rollback_draft_snapshot: "回退草稿",
      expert_source_sync_snapshot: "发布同步快照",
      expert_team_canvas_sync_snapshot: "专家团同步快照",
    };
    return map[status] || status || "历史版本";
  }

  private countNodeValueEntries(value: unknown) {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.optionalText(item, 256))
        .filter(Boolean)
        .length;
    }
    if (typeof value === "string") {
      return value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
        .length;
    }
    const record = this.asRecord(value);
    if (Array.isArray(record.ids)) {
      return record.ids
        .map((item) => this.optionalText(item, 256))
        .filter(Boolean)
        .length;
    }
    if (Array.isArray(record.items)) {
      return record.items.length;
    }
    return Object.keys(record).length;
  }

  private extractNodeOntologyRefs(node: {
    nodeType?: unknown;
    objectJson?: unknown;
    linkJson?: unknown;
    functionJson?: unknown;
    actionJson?: unknown;
    interfaceJson?: unknown;
    referencesJson?: unknown;
  }) {
    const references = node.referencesJson && typeof node.referencesJson === "object" && !Array.isArray(node.referencesJson)
      ? node.referencesJson as Record<string, unknown>
      : {};
    const ontologyRefs = references.ontologyRefs && typeof references.ontologyRefs === "object" && !Array.isArray(references.ontologyRefs)
      ? references.ontologyRefs as Record<string, unknown>
      : {};
    const resolved = {
      objectElementIds: this.normalizeOntologyRefIds(ontologyRefs.objectElementIds ?? node.objectJson),
      linkElementIds: this.normalizeOntologyRefIds(ontologyRefs.linkElementIds ?? node.linkJson),
      functionElementIds: this.normalizeOntologyRefIds(ontologyRefs.functionElementIds ?? node.functionJson),
      actionElementIds: this.normalizeOntologyRefIds(ontologyRefs.actionElementIds ?? node.actionJson),
      interfaceElementIds: this.normalizeOntologyRefIds(ontologyRefs.interfaceElementIds ?? node.interfaceJson),
    };
    const total = resolved.objectElementIds.length
      + resolved.linkElementIds.length
      + resolved.functionElementIds.length
      + resolved.actionElementIds.length
      + resolved.interfaceElementIds.length;
    if (total > 0) {
      return resolved;
    }
    const fallback = this.registryCompilerDefaultOntologyRefs(
      this.optionalText(references.source, 128),
      this.optionalText(node.nodeType, 64),
    );
    return fallback || resolved;
  }

  private registryCompilerDefaultOntologyRefs(source: string, nodeType: string) {
    if (source !== "expert_team_registry_compiler") {
      return null;
    }
    const normalizedType = nodeType.toLowerCase();
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

  private isCanvasLayoutOnlySnapshot(snapshotJson: unknown) {
    const snapshot = this.asRecord(snapshotJson);
    const note = this.optionalText(snapshot.note, 500);
    return note === "S3-02T canvas node drag position" || note === "仅调整节点画布位置";
  }

  private isExpertTeamRegistryManagedNode(node: { referencesJson?: unknown }) {
    const references = this.asRecord(node.referencesJson);
    return this.optionalText(references.source, 128) === "expert_team_registry_compiler";
  }

  private isExpertTeamRegistryManagedEdge(edge: { conditionJson?: unknown }) {
    const condition = this.asRecord(edge.conditionJson);
    return this.optionalText(condition.mode, 128) === "expert_team_registry_compiler";
  }

  private isVersionVisibleInRollback(status: string, snapshotJson: unknown) {
    if (this.isCanvasLayoutOnlySnapshot(snapshotJson)) {
      return false;
    }
    return status !== "expert_source_sync_snapshot";
  }

  private isVersionVisibleInNodeRollback(status: string, snapshotJson: unknown) {
    if (!this.isVersionVisibleInRollback(status, snapshotJson)) {
      return false;
    }
    return status !== "published_contract";
  }

  private isCanvasLayoutOnlyNodeChange(
    existingNode: {
      nodeType: string | null;
      title: string | null;
      subtitle: string | null;
      description: string | null;
      sortOrder: number | null;
      objectJson: unknown;
      linkJson: unknown;
      functionJson: unknown;
      actionJson: unknown;
      interfaceJson: unknown;
      referencesJson: unknown;
    },
    input: OntologyNodeDraftInput,
  ) {
    if (this.optionalText(input.note, 500) !== "S3-02T canvas node drag position") {
      return false;
    }
    const sameText = (left: unknown, right: unknown, max = 4000) => this.optionalText(left, max) === this.optionalText(right, max);
    const sameJson = (left: unknown, right: unknown) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
    return sameText(existingNode.nodeType, input.nodeType, 64)
      && sameText(existingNode.title, input.title, 256)
      && sameText(existingNode.subtitle, input.subtitle, 256)
      && sameText(existingNode.description, input.description, 4000)
      && Number(existingNode.sortOrder || 0) === Number(input.sortOrder || 0)
      && sameJson(this.normalizeFiveElementJson(existingNode.objectJson), this.normalizeFiveElementJson(input.objectJson))
      && sameJson(this.normalizeFiveElementJson(existingNode.linkJson), this.normalizeFiveElementJson(input.linkJson))
      && sameJson(this.normalizeFiveElementJson(existingNode.functionJson), this.normalizeFiveElementJson(input.functionJson))
      && sameJson(this.normalizeFiveElementJson(existingNode.actionJson), this.normalizeFiveElementJson(input.actionJson))
      && sameJson(this.normalizeFiveElementJson(existingNode.interfaceJson), this.normalizeFiveElementJson(input.interfaceJson))
      && sameJson(existingNode.referencesJson, input.referencesJson);
  }

  private buildNodeOntologySelections(
    node: { referencesJson?: unknown },
    dictionaryLookup: OntologyDictionaryLookup,
    ontologyRefs: {
      objectElementIds: string[];
      linkElementIds: string[];
      functionElementIds: string[];
      actionElementIds: string[];
      interfaceElementIds: string[];
    },
  ) {
    const references = node.referencesJson && typeof node.referencesJson === "object" && !Array.isArray(node.referencesJson)
      ? node.referencesJson as Record<string, unknown>
      : {};
    const ontologySelections = references.ontologySelections && typeof references.ontologySelections === "object" && !Array.isArray(references.ontologySelections)
      ? references.ontologySelections as Record<string, unknown>
      : {};
    return {
      Object: this.buildSelectionsForType(ontologySelections.Object, ontologyRefs.objectElementIds, "Object", dictionaryLookup),
      Link: this.buildSelectionsForType(ontologySelections.Link, ontologyRefs.linkElementIds, "Link", dictionaryLookup),
      Function: this.buildSelectionsForType(ontologySelections.Function, ontologyRefs.functionElementIds, "Function", dictionaryLookup),
      Action: this.buildSelectionsForType(ontologySelections.Action, ontologyRefs.actionElementIds, "Action", dictionaryLookup),
      Interface: this.buildSelectionsForType(ontologySelections.Interface, ontologyRefs.interfaceElementIds, "Interface", dictionaryLookup),
    };
  }

  private buildSelectionsForType(
    rawSelections: unknown,
    ids: string[],
    elementType: OntologyDictionaryItem["elementType"],
    dictionaryLookup: OntologyDictionaryLookup,
  ) {
    const existingMap = new Map<string, Record<string, unknown>>();
    if (Array.isArray(rawSelections)) {
      for (const item of rawSelections) {
        const id = this.optionalText((item as any)?.id, 128);
        if (!id) continue;
        existingMap.set(id, item as Record<string, unknown>);
      }
    }
    return ids.map((id) => {
      const existing = existingMap.get(id) || {};
      const dictionaryItem = this.resolveDictionaryItem(id, elementType, dictionaryLookup);
      const primaryConsumers = this.normalizeStringList(existing.primaryConsumers, dictionaryItem?.primaryConsumers || [], 8);
      const bindings = this.normalizeStringList(existing.bindings, dictionaryItem?.bindings || [], 12);
      return {
        id,
        label: this.optionalText(existing.label, 256) || dictionaryItem?.label || id,
        name: this.optionalText(existing.name, 256) || dictionaryItem?.name || id,
        elementType,
        status: this.optionalText(existing.status, 128) || dictionaryItem?.status || "legacy",
        description: this.optionalText(existing.description, 4000) || dictionaryItem?.description || "",
        source: this.optionalText(existing.source, 1000) || dictionaryItem?.source || "legacy",
        primaryConsumers,
        bindings,
        refType: this.optionalText(existing.refType, 128) || dictionaryItem?.refType || "ontology_dictionary_seed",
        kind: this.optionalText(existing.kind, 128) || dictionaryItem?.kind || `ontology_${elementType.toLowerCase()}`,
        resolution: dictionaryItem ? "dictionary" : "legacy",
      };
    });
  }

  private buildOntologyDictionaryLookup(items: OntologyDictionaryItem[]): OntologyDictionaryLookup {
    const prioritizedItems = [...items].sort((left, right) => {
      const leftWeight = left.status === "active_seed" ? 1 : 0;
      const rightWeight = right.status === "active_seed" ? 1 : 0;
      return rightWeight - leftWeight;
    });
    const byId = new Map<string, OntologyDictionaryItem>();
    const byAlias = new Map<string, OntologyDictionaryItem>();
    for (const item of prioritizedItems) {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
      for (const candidate of this.dictionaryLookupCandidates(item)) {
        const key = this.dictionaryLookupKey(item.elementType, candidate);
        if (!key || byAlias.has(key)) continue;
        byAlias.set(key, item);
      }
    }
    return { byId, byAlias };
  }

  private dictionaryLookupCandidates(item: OntologyDictionaryItem) {
    const candidates = [
      item.id,
      item.name,
      item.label,
      ...item.bindings,
    ];
    if (item.label.startsWith(`${item.id} `)) {
      candidates.push(item.label.slice(item.id.length + 1));
    }
    return candidates;
  }

  private resolveDictionaryItem(
    rawId: string,
    elementType: OntologyDictionaryItem["elementType"],
    lookup: OntologyDictionaryLookup,
  ) {
    return lookup.byId.get(rawId) || lookup.byAlias.get(this.dictionaryLookupKey(elementType, rawId)) || null;
  }

  private dictionaryLookupKey(elementType: OntologyDictionaryItem["elementType"], rawValue: unknown) {
    const normalized = this.normalizeDictionaryLookupValue(rawValue);
    return normalized ? `${elementType}:${normalized}` : "";
  }

  private normalizeDictionaryLookupValue(rawValue: unknown) {
    return String(rawValue || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  private buildElementBindingSnapshot(
    ontologySelections: {
      Object: Array<Record<string, unknown>>;
      Link: Array<Record<string, unknown>>;
      Function: Array<Record<string, unknown>>;
      Action: Array<Record<string, unknown>>;
      Interface: Array<Record<string, unknown>>;
    },
    dictionarySource: string,
  ) {
    const groups = {
      object: ontologySelections.Object,
      link: ontologySelections.Link,
      function: ontologySelections.Function,
      action: ontologySelections.Action,
      interface: ontologySelections.Interface,
    };
    const allItems = Object.values(groups).flat();
    return {
      source: dictionarySource,
      object: groups.object,
      link: groups.link,
      function: groups.function,
      action: groups.action,
      interface: groups.interface,
      summary: {
        totalCount: allItems.length,
        dictionaryResolvedCount: allItems.filter((item) => item.resolution === "dictionary").length,
        legacyCount: allItems.filter((item) => item.resolution !== "dictionary").length,
      },
    };
  }

  private normalizeOntologyRefIds(value: unknown) {
    const items = this.normalizeFiveElementJson(value) as unknown[];
    return items
      .map((item) => typeof item === "string" ? item.trim() : String(item ?? "").trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  private normalizeStringList(value: unknown, fallback: string[] = [], limit = 10) {
    const source: unknown[] = Array.isArray(value) ? value : fallback;
    return source
      .map((item) => this.optionalText(item, 256))
      .filter(Boolean)
      .slice(0, limit);
  }

  private resolveExpertSourceSyncTargets(item: Record<string, any>, contract: Record<string, any>): ExpertSourceSyncTarget[] {
    const candidates: ExpertSourceSyncTarget[] = [];
    const addCandidate = (raw: unknown, fallbackKind: "expert" | "skill" | "prompt" | "", label: string, source: string) => {
      const target = this.normalizeExpertSourceTarget(raw, fallbackKind, label, source);
      if (!target) return;
      if (!candidates.some((candidate) => candidate.kind === target.kind && candidate.relPath === target.relPath)) {
        candidates.push(target);
      }
    };

    addCandidate(item.targetId, this.markdownKindFromTargetKind(item.targetKind), item.targetName || item.flowName || "Ontology 目标专家", "flow.targetId");
    const selectedTarget = (contract.flow as any)?.selected_target || (contract.flow as any)?.sourceRefs?.selected_target || (contract.sourceRefsJson as any)?.selected_target;
    if (selectedTarget) {
      addCandidate((selectedTarget as any).path || (selectedTarget as any).id, this.markdownKindFromTargetKind((selectedTarget as any).kind), (selectedTarget as any).label || item.targetName, "sourceRefs.selected_target");
    }
    const legacyTarget = this.resolveLegacyExpertSourceTarget(item, contract);
    if (legacyTarget && !candidates.some((candidate) => candidate.kind === legacyTarget.kind && candidate.relPath === legacyTarget.relPath)) {
      candidates.push(legacyTarget);
    }

    const nodes = Array.isArray(contract.nodes) ? contract.nodes : [];
    for (const node of nodes) {
      const references = Array.isArray((node as any)?.references) ? (node as any).references : [];
      for (const reference of references) {
        const kind = this.markdownKindFromTargetKind((reference as any)?.kind);
        if (!kind) continue;
        addCandidate((reference as any)?.path || (reference as any)?.id, kind, (reference as any)?.label || (reference as any)?.name || "绑定元素", `node:${(node as any)?.nodeKey || ""}`);
      }
    }

    return candidates;
  }

  private buildExpertSourceSyncImpactMap(item: Record<string, any>, contract: Record<string, any>) {
    const impactMap = new Map<string, ExpertSourceSyncImpact>();
    const pushImpact = (target: ExpertSourceSyncTarget | null, nodeKey: string, title: string) => {
      if (!target) return;
      const key = `${target.kind}:${target.relPath}`;
      const current = impactMap.get(key) || { nodeKeys: [], nodeTitles: [] };
      if (nodeKey && !current.nodeKeys.includes(nodeKey)) {
        current.nodeKeys.push(nodeKey);
      }
      if (title && !current.nodeTitles.includes(title)) {
        current.nodeTitles.push(title);
      }
      impactMap.set(key, current);
    };

    const topLevelTarget = this.normalizeExpertSourceTarget(
      item.targetId,
      this.markdownKindFromTargetKind(item.targetKind),
      item.targetName || item.flowName || "Ontology 目标专家",
      "flow.targetId",
    );
    pushImpact(
      topLevelTarget,
      this.optionalText(item.flowKey, 128),
      this.optionalText(item.targetName || item.flowName, 256),
    );

    const nodes = Array.isArray(contract.nodes) ? contract.nodes : [];
    for (const rawNode of nodes) {
      const node = this.asRecord(rawNode);
      const nodeKey = this.optionalText(node.nodeKey, 128);
      const title = this.optionalText(node.title, 256) || nodeKey;
      const references = Array.isArray(node.references) ? node.references : [];
      for (const reference of references) {
        const ref = this.asRecord(reference);
        const target = this.normalizeExpertSourceTarget(
          ref.path ?? ref.id,
          this.markdownKindFromTargetKind(ref.kind),
          this.optionalText(ref.label, 256) || this.optionalText(ref.name, 256) || title,
          `node:${nodeKey}`,
        );
        pushImpact(target, nodeKey, title);
      }
    }

    return impactMap;
  }

  private resolveLegacyExpertSourceTarget(item: Record<string, any>, contract: Record<string, any>): ExpertSourceSyncTarget | null {
    const targetKind = this.optionalText(item.targetKind || (contract.flow as any)?.targetKind, 64).toLowerCase();
    const targetId = this.optionalText(item.targetId || (contract.flow as any)?.targetId, 256).toLowerCase();
    const targetName = this.optionalText(item.targetName || (contract.flow as any)?.targetName, 256).toLowerCase();
    const flowName = this.optionalText(item.flowName || (contract.flow as any)?.name, 256).toLowerCase();
    const targetText = `${targetId} ${targetName} ${flowName}`;
    const isLegacyTeamTarget =
      targetKind === "expert_team"
      || targetText.includes("douyin-content-team")
      || targetText.includes("team-lead")
      || targetText.includes("主理人")
      || targetText.includes("专家团");
    if (isLegacyTeamTarget && (targetText.includes("douyin") || targetText.includes("抖音"))) {
      return {
        kind: "expert",
        relPath: "douyin-fullflow-ops-prep-2026-09-26/agents/douyin-fullflow-ops-team-lead.md",
        label: item.targetName || "抖音全流程运营专家团",
        source: "legacy_target_alias:douyin-content-team",
      };
    }
    return null;
  }

  private normalizeExpertSourceTarget(raw: unknown, fallbackKind: "expert" | "skill" | "prompt" | "", label: string, source: string): ExpertSourceSyncTarget | null {
    const value = this.optionalText(raw, 1000);
    if (!value) return null;
    const match = value.match(/^([a-z_]+):(.+\.md)$/i);
    const relPath = match ? match[2] : value;
    const inferredKind = match ? (this.markdownKindFromTargetKind(match[1]) || fallbackKind) : fallbackKind;
    if (!inferredKind || !/\.md$/i.test(relPath)) return null;
    return {
      kind: inferredKind,
      relPath,
      label: this.optionalText(label, 256) || relPath,
      source,
    };
  }

  private markdownKindFromTargetKind(value: unknown): "expert" | "skill" | "prompt" | "" {
    const normalized = this.optionalText(value, 64).toLowerCase();
    if (normalized === "skill") return "skill";
    if (normalized === "prompt" || normalized === "reference") return "prompt";
    if (normalized === "expert" || normalized === "expert_team" || normalized === "agent" || normalized === "agents") return "expert";
    return "";
  }

  private buildOntologyContractMarkdown(item: Record<string, any>, contract: Record<string, any>) {
    const nodes = Array.isArray(contract.nodes) ? contract.nodes : [];
    const edges = Array.isArray(contract.edges) ? contract.edges : [];
    const orderedNodes = this.orderContractNodes(nodes, edges);
    const lines = [
      "### Ontology 编排契约",
      "",
      `- flowKey: ${item.flowKey || ""}`,
      `- flowName: ${item.flowName || ""}`,
      `- versionNo: ${item.versionNo || ""}`,
      `- contractHash: ${item.candidateHash || ""}`,
      `- target: ${item.targetKind || ""} / ${item.targetName || item.targetId || ""}`,
      `- publishedAt: ${item.publishedAt || ""}`,
      "",
      "### 执行路线",
      "",
      ...orderedNodes.map((node, index) => {
        const references = Array.isArray(node?.references) ? node.references : [];
        const referenceText = references.length
          ? references.map((ref: any) => `${ref.kind || "ref"}:${ref.label || ref.name || ref.id || ""}`).join("；")
          : "未绑定";
        return `${index + 1}. ${node?.title || node?.nodeKey || "未命名节点"}：${node?.description || node?.subtitle || "无描述"}（绑定：${referenceText}）`;
      }),
      "",
      "### 连线规则",
      "",
      ...(edges.length
        ? edges.map((edge) => `- ${edge?.fromNodeKey || ""} -> ${edge?.toNodeKey || ""}：${edge?.label || "未命名连线"}；条件：${this.compactJson(edge?.condition || {})}`)
        : ["- 未配置连线。"]),
      "",
      "### 确认闸与证据",
      "",
      `- confirmationGates: ${this.compactJson(contract.confirmationGates || {})}`,
      `- evidenceRules: ${this.compactJson(contract.evidenceRules || {})}`,
      "",
      "### 边界",
      "",
      "- 本段由 AI 智控中心 Ontology published_contract 派生。",
      "- S3-02Z 当前仅生成专家源同步候选 Diff；真实写回必须经过用户确认、Diff SHA 校验、候选 SHA 校验、写前快照与可写挂载总闸。",
      "",
      ...this.buildOntologyStartupReadRuleMarkdown(item),
    ];
    return lines.join("\n");
  }

  private buildOntologyStartupReadRuleMarkdown(item: Record<string, any>) {
    const flowKey = this.optionalText(item.flowKey, 256) || "<flowKey>";
    return [
      "### Ontology 启动前读取规则",
      "",
      "- 当 WorkBuddy 调用本专家团、专家或 Skill 执行业务任务时，必须先读取 AI 智控中心的正式 Ontology 导航图，再开始执行。",
      "- 第一步：通过 MCP 工具 `get_ai_control_center_published_ontology_contract` 读取 latest `published_contract`，参数必须包含当前 `flowKey`。",
      `  - 推荐参数：\`{\"flowKey\":\"${flowKey}\"}\``,
      "- 第二步：通过 MCP 工具 `get_ai_control_center_ontology_execution_plan` 读取执行前路线图；如已知用户原始意图、taskId，应一并传入。",
      "- 第三步：按 `executionPlan.steps` 的顺序推进；每个步骤只能调用该节点 `references` 已绑定的专家、Skill、MCP 工具、中台功能、数据对象或资料。",
      "- 第四步：遇到 `confirmationGates` 或节点要求人工确认时，必须暂停并向用户确认，禁止自行越过确认闸。",
      "- 第五步：当 WorkBuddy 已有真实 `taskId` 与 `stageRunId` 时，开工前调用 `record_ai_control_center_ontology_execution_plan_evidence`，并设置 `confirmPreflightOnly=true`；没有真实任务上下文时只读计划，不得伪造证据。",
      "- 第六步：每推进一个节点后，如具备真实任务上下文，调用 `record_ai_control_center_ontology_node_execution_evidence` 记录节点状态，并设置 `confirmControlledExecutionOnly=true`。",
      "",
      "### Ontology 禁止绕过规则",
      "",
      "- 不得读取 draft、publish-preview 或页面截图作为执行依据；只能使用 latest `published_contract` 与其派生的 execution plan。",
      "- 不得在执行过程中修改 published_contract、专家源 Markdown、Skill 文件或 MCP 配置。",
      "- 不得把本段规则视为真实写回已完成；只有写回确认闸全部通过且用户明确授权后，WorkBuddy 真源才允许更新。",
      "- 不得因为 MCP 工具返回成功就声称业务已执行；工具读取、路线留证、节点执行和业务交付必须分开说明。",
    ];
  }

  private buildExpertSourceMarkdownFields(kind: "expert" | "skill" | "prompt", item: Record<string, any>, contract: Record<string, any>) {
    const markdown = this.buildOntologyContractMarkdown(item, contract);
    if (kind === "skill") {
      return {
        constraint: markdown,
      };
    }
    if (kind === "prompt") {
      return {
        template: markdown,
      };
    }
    return {
      contract: markdown,
    };
  }

  private compactJson(value: unknown) {
    if (this.isEmptyJson(value)) return "{}";
    return JSON.stringify(value);
  }

  private jsonItemCount(value: unknown) {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
    return value ? 1 : 0;
  }

  private isEmptyJson(value: unknown) {
    if (Array.isArray(value)) return value.length === 0;
    if (value && typeof value === "object") return Object.keys(value).length === 0;
    return !value;
  }

  private sha256(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  private sha256Text(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private async ensureDatabase() {
    if (!(await this.prisma.canUseDatabase())) {
      throw new ServiceUnavailableException("数据库不可用，不能保存 Ontology 编排草稿");
    }
  }

  private async getDraftFlowForMutation(tx: Prisma.TransactionClient, flowLookup: string) {
    const flow = await tx.ontologyOrchestrationFlow.findFirst({
      where: {
        OR: [
          { id: flowLookup },
          { flowKey: flowLookup },
        ],
      },
    });
    if (!flow) {
      throw new BadRequestException(`编排流程不存在：${flowLookup}`);
    }
    return flow;
  }

  private async assertNodeExists(tx: Prisma.TransactionClient, flowId: string, nodeKey: string, fieldName: string) {
    const node = await tx.ontologyOrchestrationNode.findUnique({
      where: {
        flowId_nodeKey: {
          flowId,
          nodeKey,
        },
      },
    });
    if (!node) {
      throw new BadRequestException(`${fieldName} 指向的节点不存在：${nodeKey}`);
    }
  }

  private async createFlowSnapshot(
    tx: Prisma.TransactionClient,
    flowId: string,
    status: string,
    createdBy: string,
    change: Record<string, unknown>,
  ) {
    const flow = await tx.ontologyOrchestrationFlow.findUnique({
      where: { id: flowId },
    });
    const nodes = await tx.ontologyOrchestrationNode.findMany({
      where: { flowId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const edges = await tx.ontologyOrchestrationEdge.findMany({
      where: { flowId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const latest = await tx.ontologyOrchestrationVersion.findFirst({
      where: { flowId },
      orderBy: { versionNo: "desc" },
    });
    return tx.ontologyOrchestrationVersion.create({
      data: {
        flowId,
        versionNo: (latest?.versionNo || 0) + 1,
        status,
        snapshotJson: this.json({
          flow: flow ? {
            id: flow.id,
            flowKey: flow.flowKey,
            name: flow.name,
            status: flow.status,
            targetKind: flow.targetKind,
            targetId: flow.targetId,
            targetName: flow.targetName,
          } : null,
          routingRulesJson: flow?.routingRulesJson ?? null,
          confirmationGatesJson: flow?.confirmationGatesJson ?? null,
          evidenceRulesJson: flow?.evidenceRulesJson ?? null,
          ...change,
          nodes,
          edges,
          savedAt: new Date().toISOString(),
        }),
        createdBy,
      },
    });
  }

  private treeEntriesToElements(entries: unknown, kind: string, label: string) {
    if (!Array.isArray(entries)) return [];
    return entries
      .filter((entry: any) => entry?.type === "file")
      .map((entry: any) => {
        const rel = String(entry.rel || "");
        return {
          id: `${kind}:${rel}`,
          kind,
          label: this.formatFileLabel(entry.name || rel, label),
          name: String(entry.name || rel),
          path: rel,
          refType: "expert_source_file",
          description: rel,
        };
      });
  }

  private buildExpertTargetElements(entries: unknown, sourceRoot?: string | null, plugins: Array<Record<string, unknown>> = []) {
    const byCatalogKey = new Map<string, Record<string, unknown>>();
    for (const declared of this.buildPluginDeclaredTargets(sourceRoot, plugins)) {
      this.upsertCanonicalExpertTarget(byCatalogKey, declared.catalogKey, declared.item);
    }
    if (!Array.isArray(entries)) return Array.from(byCatalogKey.values());
    for (const entry of entries) {
      if ((entry as any)?.type !== "file") continue;
      const rel = String((entry as any)?.rel || "").trim();
      if (!rel || !/\.md$/i.test(rel)) continue;
      const fileName = String((entry as any)?.name || rel);
      const itemSourceRoot = this.inferExpertSourceRootFromRel(rel) || this.optionalText(sourceRoot, 1000);
      const teamItem = this.buildExpertTeamElement(rel, fileName, itemSourceRoot);
      if (teamItem) {
        this.upsertCanonicalExpertTarget(byCatalogKey, teamItem.catalogKey, teamItem.item);
        continue;
      }
      const item = {
        id: `expert:${rel}`,
        kind: "expert",
        label: this.formatFileLabel(fileName, "专家"),
        name: fileName,
        path: rel,
        sourceRoot: itemSourceRoot || undefined,
        refType: "expert_source_file",
        description: rel,
      };
      const catalogKey = `expert:${this.normalizeTargetCatalogKey(fileName)}`;
      this.upsertCanonicalExpertTarget(byCatalogKey, catalogKey, item);
    }
    return Array.from(byCatalogKey.values()).sort((left, right) => {
      const leftKind = String(left.kind || "");
      const rightKind = String(right.kind || "");
      if (leftKind !== rightKind) {
        return leftKind === "expert_team" ? -1 : 1;
      }
      return String(left.label || "").localeCompare(String(right.label || ""));
    });
  }

  private buildPluginDeclaredTargets(sourceRoot?: string | null, plugins: Array<Record<string, unknown>> = []) {
    if (!sourceRoot || !Array.isArray(plugins) || !plugins.length) return [];
    const out: Array<{ catalogKey: string; item: Record<string, unknown> }> = [];
    for (const plugin of plugins) {
      const pluginName = this.optionalText(plugin.name, 256);
      if (!pluginName) continue;
        const manifestPath = join(String(sourceRoot), pluginName, ".codebuddy-plugin", "plugin.json");
      try {
          const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as Record<string, any>;
        const expertType = this.optionalText(manifest.expertType, 64).toLowerCase();
        if (expertType !== "team" && expertType !== "agent") continue;
        const agentEntries = Array.isArray(manifest.agents)
          ? manifest.agents.map((item) => String(item || "").trim()).filter(Boolean)
          : [String(manifest.agents || "").trim()].filter(Boolean);
        const primaryAgent = agentEntries[0] || "";
        const relPath = primaryAgent
          ? `${pluginName}/${primaryAgent.replace(/^\.?\//, "")}`.replace(/\\/g, "/")
          : `${pluginName}/agents/${pluginName}.md`;
        const displayName = this.optionalText(manifest.displayName?.zh, 256)
          || this.optionalText(manifest.profession?.zh, 256)
          || pluginName;
        const kind = expertType === "team" ? "expert_team" : "expert";
        const itemSourceRoot = this.inferExpertSourceRootFromRel(relPath) || String(sourceRoot).replace(/\\/g, "/");
        out.push({
          catalogKey: `${kind}:${this.normalizeTargetCatalogKey(pluginName)}`,
          item: {
            id: `${kind}:${relPath}`,
            kind,
            label: displayName,
            name: this.optionalText(manifest.agentName, 256) || pluginName,
            path: relPath,
            sourceRoot: itemSourceRoot || undefined,
            refType: "expert_source_file",
            description: relPath,
          },
        });
      } catch {
        // Ignore malformed plugin manifests and fall back to markdown filename heuristics.
      }
    }
    return out;
  }

  private buildExpertTeamElement(rel: string, fileName: string, sourceRoot?: string | null) {
    const normalizedName = fileName.replace(/\.md$/i, "").toLowerCase();
    if (!normalizedName.includes("team-lead")) {
      return null;
    }
    const teamFolder = String(rel.split("/")[0] || "").trim();
    const teamLabel = this.formatFileLabel(teamFolder || fileName, "专家团");
    const teamKey = normalizedName
      .replace(/-team-lead$/i, "")
      .replace(/-prep-\d{4}-\d{2}-\d{2}$/i, "")
      .replace(/-s302z-\d{4}-\d{2}-\d{2}$/i, "");
    return {
      catalogKey: `expert_team:${this.normalizeTargetCatalogKey(teamKey || teamFolder || fileName)}`,
      item: {
        id: `expert_team:${rel}`,
        kind: "expert_team",
        label: teamLabel,
        name: fileName,
        path: rel,
        sourceRoot: this.inferExpertSourceRootFromRel(rel) || this.optionalText(sourceRoot, 1000) || undefined,
        refType: "expert_source_file",
        description: rel,
      },
    };
  }

  private upsertCanonicalExpertTarget(
    targetMap: Map<string, Record<string, unknown>>,
    catalogKey: string,
    candidate: Record<string, unknown>,
  ) {
    const existing = targetMap.get(catalogKey);
    if (!existing) {
      targetMap.set(catalogKey, candidate);
      return;
    }
    const currentScore = this.scoreExpertCatalogPath(String(existing.path || ""));
    const candidateScore = this.scoreExpertCatalogPath(String(candidate.path || ""));
    if (candidateScore < currentScore) {
      targetMap.set(catalogKey, candidate);
    }
  }

  private scoreExpertCatalogPath(rel: string) {
    const normalized = String(rel || "").toLowerCase();
    let score = normalized.split("/").length * 10 + normalized.length;
    if (normalized.includes("-prep-")) score += 500;
    if (normalized.includes("-s302z-")) score += 500;
    if (normalized.includes("isolated")) score += 500;
    if (normalized.includes("联调")) score += 500;
    return score;
  }

  private normalizeTargetCatalogKey(value: string) {
    return String(value || "")
      .replace(/\.md$/i, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  private formatFileLabel(name: string, fallback: string) {
    const normalized = String(name || fallback)
      .replace(/\.md$/i, "")
      .replace(/SKILL$/i, "Skill")
      .replace(/[-_]+/g, " ")
      .trim();
    return normalized || fallback;
  }

  private mcpToolElements() {
    return this.readOntologyMcpToolSeed().items.map((item) => ({
      id: `mcp:${item.name}`,
      kind: "mcp_tool",
      label: item.label.replace(/^[A-Z]\d+\s+/, ""),
      name: item.name,
      refType: "openclaw_mcp_tool",
      description: item.description,
    }));
  }

  private aiControlPanelElements() {
    return [
      { id: "panel:experts", kind: "ai_control_panel", label: "专家团队管理", name: "experts", refType: "route", description: "/ai-control/experts" },
      { id: "panel:skills", kind: "ai_control_panel", label: "技能与能力管理", name: "skills", refType: "route", description: "/ai-control/skills" },
      { id: "panel:apis", kind: "ai_control_panel", label: "接口与连接器配置", name: "apis", refType: "route", description: "/ai-control/apis" },
      { id: "panel:tasks", kind: "ai_control_panel", label: "任务版本治理", name: "tasks", refType: "route", description: "/ai-control/tasks" },
      { id: "panel:assets", kind: "ai_control_panel", label: "统一素材管理", name: "assets", refType: "route", description: "/ai-control/assets" },
      { id: "panel:brand", kind: "ai_control_panel", label: "品牌资产设置", name: "brand", refType: "route", description: "/ai-control/brand" },
    ];
  }

  private async dataObjectElements() {
    const objects = [
      { id: "data:brand", kind: "data_object", label: "品牌事实", name: "Brand", table: "Brand" },
      { id: "data:wf_tasks", kind: "data_object", label: "任务", name: "wf_tasks", table: "wf_tasks" },
      { id: "data:wf_execution_events", kind: "data_object", label: "执行事件证据", name: "wf_execution_events", table: "wf_execution_events" },
      { id: "data:creative_material", kind: "data_object", label: "创作素材", name: "AIControlCenterCreativeMaterial", table: "AIControlCenterCreativeMaterial" },
      { id: "data:video_work", kind: "data_object", label: "视频作品", name: "AIControlCenterVideoWork", table: "AIControlCenterVideoWork" },
      { id: "data:ontology_flow", kind: "data_object", label: "Ontology 编排流程", name: "ontology_orchestration_flows", table: "ontology_orchestration_flows" },
    ];
    const result = [];
    for (const item of objects) {
      result.push({
        ...item,
        refType: "database_table",
        count: await this.safeCountTable(item.table),
        description: item.table,
      });
    }
    return result;
  }

  private async safeCountTable(tableName: string) {
    try {
      if (!(await this.prisma.canUseDatabase()) || !(await this.prisma.tableExists(tableName))) return 0;
      const quoted = `"${tableName.replace(/"/g, "\"\"")}"`;
      const rows = await this.prisma.$queryRawUnsafe<Array<{ count?: bigint | number | string }>>(`SELECT COUNT(*) AS count FROM ${quoted}`);
      return Number(rows[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  private readOntologyAtlas(scope: OntologyDictionaryScope = "all"): { source: string; items: OntologyDictionaryItem[] } {
    const atlasPath = this.findOntologyAtlasPath();
    const raw = readFileSync(atlasPath, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw) as { elements?: Record<string, any> };
    const elements = parsed?.elements && typeof parsed.elements === "object" ? parsed.elements : {};
    const supplementSeed = this.readOntologySupplementSeed();
    const mcpToolSeed = this.readOntologyMcpToolSeed();
    const activeSeed = this.readOntologyActiveSeed();
    const activeIdSet = new Set(
      Object.values(activeSeed.activeIds || {})
        .flatMap((ids) => Array.isArray(ids) ? ids : [])
        .map((id) => this.optionalText(id, 64))
        .filter(Boolean),
    );
    const extraItems = Array.isArray(activeSeed.extraItems) ? activeSeed.extraItems : [];
    const merged = new Map<string, OntologyDictionaryItem>();
    for (const item of Object.values(elements)
      .map((value) => this.toDictionaryItem(value))
      .filter((value): value is OntologyDictionaryItem => Boolean(value))) {
      merged.set(item.id, activeIdSet.has(item.id) ? { ...item, status: "active_seed" } : item);
    }
    for (const item of supplementSeed.items) {
      merged.set(item.id, activeIdSet.has(item.id) ? { ...item, status: "active_seed" } : item);
    }
    for (const item of mcpToolSeed.items) {
      merged.set(item.id, activeIdSet.has(item.id) ? { ...item, status: "active_seed" } : item);
    }
    for (const item of extraItems) {
      merged.set(item.id, item);
    }
    const items = Array.from(merged.values()).filter((item) => scope === "active_seed" ? activeIdSet.has(item.id) : true);
    const sources = [
      atlasPath.includes("ontology-atlas.seed.json")
        ? "apps/server/src/modules/ai-control/data/ontology-atlas.seed.json"
        : "wxd-ontology-element-atlas-20260928/data/atlas.json",
    ];
    if (supplementSeed.source) {
      sources.push(supplementSeed.source);
    }
    if (mcpToolSeed.source) {
      sources.push(mcpToolSeed.source);
    }
    sources.push("apps/server/src/modules/ai-control/data/ontology-active-seed.json");
    return {
      source: sources.join(" + "),
      items,
    };
  }

  private readOntologyActiveSeed(): OntologyActiveSeedConfig {
    const filePath = this.findOntologyActiveSeedPath();
    const raw = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw) as OntologyActiveSeedConfig;
    return {
      metadata: parsed?.metadata || {},
      activeIds: parsed?.activeIds || {},
      extraItems: Array.isArray(parsed?.extraItems)
        ? parsed.extraItems
          .map((item) => this.sanitizeDictionaryItem(item))
          .filter((item): item is OntologyDictionaryItem => Boolean(item))
        : [],
    };
  }

  private findOntologyActiveSeedPath() {
    const candidates = [
      join(process.cwd(), "apps", "server", "src", "modules", "ai-control", "data", "ontology-active-seed.json"),
      join(process.cwd(), "src", "modules", "ai-control", "data", "ontology-active-seed.json"),
      join(process.cwd(), "dist", "apps", "server", "src", "modules", "ai-control", "data", "ontology-active-seed.json"),
    ];
    for (const filePath of candidates) {
      try {
        readFileSync(filePath, "utf8");
        return filePath;
      } catch {
        continue;
      }
    }
    throw new ServiceUnavailableException("未找到 ontology-active-seed.json，当前无法加载 v0.1 初始正式项");
  }

  private findOntologyAtlasPath() {
    const candidates = [
      join(process.cwd(), "apps", "server", "src", "modules", "ai-control", "data", "ontology-atlas.seed.json"),
      join(process.cwd(), "src", "modules", "ai-control", "data", "ontology-atlas.seed.json"),
      join(process.cwd(), "dist", "apps", "server", "src", "modules", "ai-control", "data", "ontology-atlas.seed.json"),
      process.cwd(),
      resolve(process.cwd(), ".."),
      resolve(process.cwd(), "..", ".."),
      resolve(process.cwd(), "..", "..", ".."),
      resolve(process.cwd(), "..", "..", "..", ".."),
      resolve(process.cwd(), "..", "..", "..", "..", ".."),
    ];
    for (const root of candidates) {
      const filePath = root.endsWith(".json")
        ? root
        : join(root, "wxd-ontology-element-atlas-20260928", "data", "atlas.json");
      try {
        readFileSync(filePath, "utf8");
        return filePath;
      } catch {
        continue;
      }
    }
    throw new ServiceUnavailableException("未找到 Ontology atlas.json，当前无法生成五元素字典只读种子");
  }

  private readOntologySupplementSeed(): { source: string; items: OntologyDictionaryItem[] } {
    return this.readOptionalDictionarySeed("ontology-system-supplement.seed.json");
  }

  private readOntologyMcpToolSeed(): { source: string; items: OntologyDictionaryItem[] } {
    return this.readOptionalDictionarySeed("ontology-mcp-tool.seed.json");
  }

  private readOptionalDictionarySeed(fileName: string): { source: string; items: OntologyDictionaryItem[] } {
    const filePath = this.findOptionalOntologySeedPath(fileName);
    if (!filePath) {
      return { source: "", items: [] };
    }
    const raw = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw) as OntologyDictionarySeedConfig;
    return {
      source: `apps/server/src/modules/ai-control/data/${fileName}`,
      items: Array.isArray(parsed?.items)
        ? parsed.items
          .map((item) => this.sanitizeDictionaryItem(item))
          .filter((item): item is OntologyDictionaryItem => Boolean(item))
        : [],
    };
  }

  private findOptionalOntologySeedPath(fileName: string) {
    const candidates = [
      join(process.cwd(), "apps", "server", "src", "modules", "ai-control", "data", fileName),
      join(process.cwd(), "src", "modules", "ai-control", "data", fileName),
      join(process.cwd(), "dist", "apps", "server", "src", "modules", "ai-control", "data", fileName),
    ];
    for (const filePath of candidates) {
      try {
        readFileSync(filePath, "utf8");
        return filePath;
      } catch {
        continue;
      }
    }
    return null;
  }

  private toDictionaryItem(raw: any): OntologyDictionaryItem | null {
    const id = this.optionalText(raw?.id, 64);
    const typeCode = this.optionalText(raw?.type, 8).toUpperCase();
    const elementType = this.mapAtlasType(typeCode);
    const name = this.optionalText(raw?.name, 256);
    if (!id || !elementType || !name) return null;
    const description = this.optionalText(raw?.meaning, 4000) || this.optionalText(raw?.extra, 4000) || "";
    const location = this.optionalText(raw?.location, 1000) || "";
    return {
      id,
      kind: `ontology_${elementType.toLowerCase()}`,
      label: `${id} ${name}`,
      name,
      refType: "ontology_dictionary_seed",
      description,
      elementType,
      status: this.optionalText(raw?.status, 256) || "candidate",
      source: location || "atlas",
      primaryConsumers: this.inferPrimaryConsumers(`${name} ${description} ${location}`),
      bindings: location ? [location] : [],
    };
  }

  private sanitizeDictionaryItem(raw: any): OntologyDictionaryItem | null {
    const id = this.optionalText(raw?.id, 64);
    const elementType = this.optionalText(raw?.elementType, 32) as OntologyDictionaryItem["elementType"] | undefined;
    const name = this.optionalText(raw?.name, 256);
    if (!id || !elementType || !name) return null;
    return {
      id,
      kind: this.optionalText(raw?.kind, 128) || `ontology_${elementType.toLowerCase()}`,
      label: this.optionalText(raw?.label, 256) || `${id} ${name}`,
      name,
      refType: this.optionalText(raw?.refType, 128) || "ontology_dictionary_seed",
      description: this.optionalText(raw?.description, 4000) || "",
      elementType,
      status: this.optionalText(raw?.status, 256) || "active_seed",
      source: this.optionalText(raw?.source, 1000) || "ontology_active_seed",
      primaryConsumers: this.normalizeStringList(raw?.primaryConsumers, [], 8),
      bindings: this.normalizeStringList(raw?.bindings, [], 12),
    };
  }

  private mapAtlasType(typeCode: string): OntologyDictionaryItem["elementType"] | null {
    switch (typeCode) {
      case "O": return "Object";
      case "L": return "Link";
      case "F": return "Function";
      case "A": return "Action";
      case "I": return "Interface";
      default: return null;
    }
  }

  private inferPrimaryConsumers(text: string) {
    const normalized = String(text || "").toLowerCase();
    const consumers = new Set<string>();
    if (!normalized) return [];
    if (/(抖音|douyin|video)/.test(normalized)) consumers.add("抖音");
    if (/(小红书|xiaohongshu)/.test(normalized)) consumers.add("小红书");
    if (/(公众号|wechat)/.test(normalized)) consumers.add("公众号");
    if (/(geo|知识库|knowledge)/.test(normalized)) consumers.add("GEO");
    if (/(达人|creator)/.test(normalized)) consumers.add("达人合作");
    if (/(获客|lead|comment)/.test(normalized)) consumers.add("全域获客");
    if (/(广告|投流|tencent ad)/.test(normalized)) consumers.add("腾讯广告");
    if (/(设计|design)/.test(normalized)) consumers.add("设计");
    if (/(任务|workflow|ontology|contract|证据|版本)/.test(normalized)) consumers.add("Ontology/任务治理");
    if (/(品牌|product|素材|asset)/.test(normalized)) consumers.add("AI 中台通用");
    return Array.from(consumers).slice(0, 6);
  }

  private sanitizeReferences(input: unknown) {
    if (!Array.isArray(input)) return [];
    const unique = new Map<string, OntologyElementReferenceInput>();
    for (const item of input.slice(0, 50)) {
      const id = this.optionalText((item as any)?.id, 256);
      const kind = this.optionalText((item as any)?.kind, 64);
      const label = this.optionalText((item as any)?.label, 256);
      if (!id || !kind || !label) continue;
      unique.set(id, {
        id,
        kind,
        label,
        name: this.optionalText((item as any)?.name, 256),
        refType: this.optionalText((item as any)?.refType, 128),
        path: this.optionalText((item as any)?.path, 1000),
        description: this.optionalText((item as any)?.description, 1000),
        count: this.safeOptionalInt((item as any)?.count),
      });
    }
    return Array.from(unique.values());
  }

  private toNodeCreateInput(flowId: string, node: FiveElementNodeInput, index: number) {
    const nodeKey = this.requiredText(node.nodeKey, "nodeKey 必填", 128);
    return {
      flowId,
      nodeKey,
      nodeType: this.optionalText(node.nodeType, 64) || "stage",
      title: this.requiredText(node.title, "title 必填", 256),
      subtitle: this.optionalText(node.subtitle, 256) || "",
      description: this.optionalText(node.description, 4000) || "",
      positionX: this.safeInt(node.positionX, index * 220),
      positionY: this.safeInt(node.positionY, 0),
      sortOrder: this.safeInt(node.sortOrder, (index + 1) * 100),
      objectJson: this.json(this.normalizeFiveElementJson(node.objectJson)),
      linkJson: this.json(this.normalizeFiveElementJson(node.linkJson)),
      functionJson: this.json(this.normalizeFiveElementJson(node.functionJson)),
      actionJson: this.json(this.normalizeFiveElementJson(node.actionJson)),
      interfaceJson: this.json(this.normalizeFiveElementJson(node.interfaceJson)),
      referencesJson: this.json(node.referencesJson ?? {}),
    };
  }

  private toNodeUpdateInput(node: OntologyNodeDraftInput) {
    const data: Record<string, unknown> = {};
    if (node.nodeType !== undefined) data.nodeType = this.optionalText(node.nodeType, 64) || "stage";
    if (node.title !== undefined) data.title = this.requiredText(node.title, "title 必填", 256);
    if (node.subtitle !== undefined) data.subtitle = this.optionalText(node.subtitle, 256) || "";
    if (node.description !== undefined) data.description = this.optionalText(node.description, 4000) || "";
    if (node.positionX !== undefined) data.positionX = this.safeInt(node.positionX, 0);
    if (node.positionY !== undefined) data.positionY = this.safeInt(node.positionY, 0);
    if (node.sortOrder !== undefined) data.sortOrder = this.safeInt(node.sortOrder, 100);
    if (node.objectJson !== undefined) data.objectJson = this.json(this.normalizeFiveElementJson(node.objectJson));
    if (node.linkJson !== undefined) data.linkJson = this.json(this.normalizeFiveElementJson(node.linkJson));
    if (node.functionJson !== undefined) data.functionJson = this.json(this.normalizeFiveElementJson(node.functionJson));
    if (node.actionJson !== undefined) data.actionJson = this.json(this.normalizeFiveElementJson(node.actionJson));
    if (node.interfaceJson !== undefined) data.interfaceJson = this.json(this.normalizeFiveElementJson(node.interfaceJson));
    if (node.referencesJson !== undefined) data.referencesJson = this.json(node.referencesJson);
    return data;
  }

  private normalizeFiveElementJson(value: unknown) {
    if (typeof value === "string") {
      return value
        .split(/[\n,，、]/g)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => typeof item === "string" ? item.trim() : item)
        .filter((item) => typeof item === "string" ? Boolean(item) : item !== null && item !== undefined);
    }
    return value ?? [];
  }

  private async rebuildSequentialEdges(tx: Prisma.TransactionClient, flowId: string) {
    const nodes = await tx.ontologyOrchestrationNode.findMany({
      where: { flowId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    await tx.ontologyOrchestrationEdge.deleteMany({ where: { flowId } });
    if (nodes.length < 2) return;
    await tx.ontologyOrchestrationEdge.createMany({
      data: nodes.slice(0, -1).map((node, index) => {
        const next = nodes[index + 1];
        return {
          flowId,
          edgeKey: `seq_${index + 1}_${node.nodeKey.slice(0, 40)}_to_${next.nodeKey.slice(0, 40)}`,
          fromNodeKey: node.nodeKey,
          toNodeKey: next.nodeKey,
          label: "下一环节",
          conditionJson: this.json({ mode: "sequential_draft" }),
          sortOrder: (index + 1) * 100,
        };
      }),
    });
  }

  private toEdgeCreateInput(flowId: string, edge: FlowEdgeInput, index: number) {
    return {
      flowId,
      edgeKey: this.requiredText(edge.edgeKey, "edgeKey 必填", 128),
      fromNodeKey: this.requiredText(edge.fromNodeKey, "fromNodeKey 必填", 128),
      toNodeKey: this.requiredText(edge.toNodeKey, "toNodeKey 必填", 128),
      label: this.optionalText(edge.label, 256) || "",
      conditionJson: this.json(edge.conditionJson ?? {}),
      sortOrder: this.safeInt(edge.sortOrder, (index + 1) * 100),
    };
  }

  private toEdgeUpdateInput(edge: OntologyEdgeDraftInput) {
    const data: Record<string, unknown> = {};
    if (edge.fromNodeKey !== undefined) data.fromNodeKey = this.requiredText(edge.fromNodeKey, "fromNodeKey 必填", 128);
    if (edge.toNodeKey !== undefined) data.toNodeKey = this.requiredText(edge.toNodeKey, "toNodeKey 必填", 128);
    if (edge.label !== undefined) data.label = this.optionalText(edge.label, 256) || "";
    if (edge.conditionJson !== undefined) data.conditionJson = this.json(edge.conditionJson);
    if (edge.sortOrder !== undefined) data.sortOrder = this.safeInt(edge.sortOrder, 100);
    return data;
  }

  private async requestAiDraftFromModel(input: {
    brandId: string;
    model?: string;
    targetKind: string;
    targetId: string;
    targetName: string;
    sourcePath: string;
    sourceMarkdown: string;
    dictionaryItems: OntologyDictionaryItem[];
    requireSkillNode: boolean;
  }) {
    const groupedDictionary = {
      object: input.dictionaryItems.filter((item) => item.elementType === "Object").map((item) => `${item.id} ${item.name}`),
      link: input.dictionaryItems.filter((item) => item.elementType === "Link").map((item) => `${item.id} ${item.name}`),
      function: input.dictionaryItems.filter((item) => item.elementType === "Function").map((item) => `${item.id} ${item.name}`),
      action: input.dictionaryItems.filter((item) => item.elementType === "Action").map((item) => `${item.id} ${item.name}`),
      interface: input.dictionaryItems.filter((item) => item.elementType === "Interface").map((item) => `${item.id} ${item.name}`),
    };
    const messages = this.buildAiDraftMessages(input, groupedDictionary, false);
    const userId = `ontology-ai-draft-${this.slugifyText(input.targetId || input.targetName || "target")}`;
    const primaryTimeoutMs = this.resolveAiDraftAttemptTimeoutMs("ONTOLOGY_AI_DRAFT_TIMEOUT_MS", 90000);
    const compactTimeoutMs = this.resolveAiDraftAttemptTimeoutMs(
      "ONTOLOGY_AI_DRAFT_COMPACT_TIMEOUT_MS",
      Math.min(primaryTimeoutMs, 60000),
    );
    let result;
    try {
      result = await this.requestAiDraftChatCompletion({
        brandId: input.brandId,
        model: input.model,
        messages,
        userId,
        timeoutMs: primaryTimeoutMs,
      });
    } catch (error) {
      if (!this.shouldRetryCompactAiDraftPrompt(error)) {
        throw error;
      }
      result = await this.requestAiDraftChatCompletion({
        brandId: input.brandId,
        model: input.model,
        messages: this.buildAiDraftMessages(input, groupedDictionary, true),
        userId,
        timeoutMs: compactTimeoutMs,
      });
    }
    const parsed = this.parseAiDraftJson(result.text);
    return {
      provider: result.provider,
      model: result.model,
      flowName: this.optionalText(parsed.flowName, 256) || `${input.targetName} AI 草案`,
      description: this.optionalText(parsed.description, 4000) || "",
      routingRules: Array.isArray(parsed.routingRules) ? parsed.routingRules : [],
      confirmationGates: Array.isArray(parsed.confirmationGates) ? parsed.confirmationGates : [],
      evidenceRules: Array.isArray(parsed.evidenceRules) ? parsed.evidenceRules : [],
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };
  }

  private buildAiDraftMessages(
    input: {
      targetKind: string;
      targetId: string;
      targetName: string;
      sourcePath: string;
      sourceMarkdown: string;
      requireSkillNode: boolean;
    },
    groupedDictionary: Record<string, string[]>,
    compactPrompt: boolean,
  ) {
    const dictionaryCount = [
      groupedDictionary.object.length,
      groupedDictionary.link.length,
      groupedDictionary.function.length,
      groupedDictionary.action.length,
      groupedDictionary.interface.length,
    ].reduce((sum, count) => sum + count, 0);
    const sourceMarkdown = compactPrompt
      ? this.summarizeAiDraftSourceMarkdown(input.sourceMarkdown, 7200)
      : input.sourceMarkdown.length > 12000
        ? `${input.sourceMarkdown.slice(0, 12000)}\n\n[TRUNCATED]`
        : input.sourceMarkdown;
    const prompt = [
      "你是 AI 智控中心的 Ontology 编排助手。",
      compactPrompt
        ? "请基于配置文档要点，生成一张可手动检查后直接发布的 Ontology 编排草案。"
        : "任务：根据给定专家/专家团配置文档，生成一张“可手动检查后直接发布”的 Ontology 编排草案。",
      "",
      "输出必须是严格 JSON，不要 Markdown，不要解释。",
      "JSON schema:",
      "{",
      '  "flowName": "string",',
      '  "description": "string",',
      '  "routingRules": ["string" | object],',
      '  "confirmationGates": ["string" | object],',
      '  "evidenceRules": ["string" | object],',
      '  "nodes": [',
      "    {",
      '      "nodeKey": "string",',
      '      "nodeType": "stage|expert|skill|tool|data_object|confirmation_gate|evidence",',
      '      "title": "string",',
      '      "subtitle": "string",',
      '      "description": "string",',
      '      "objectIds": ["Oxx"],',
      '      "linkIds": ["Lxx"],',
      '      "functionIds": ["Fxx"],',
      '      "actionIds": ["Axx"],',
      '      "interfaceIds": ["Ixx"]',
      "    }",
      "  ],",
      '  "edges": [',
      "    {",
      '      "edgeKey": "string",',
      '      "fromNodeKey": "string",',
      '      "toNodeKey": "string",',
      '      "label": "string",',
      '      "when": ["string"]',
      "    }",
      "  ]",
      "}",
      "",
      "硬约束：",
      "1. 节点数 4-7 个，必须形成完整可执行路径。",
      input.requireSkillNode
        ? "2. 本次草案必须至少包含 1 个 skill 节点；如果目标是 expert_team，或源文档已出现 skills/use/技能路由信息，不允许只返回 expert 节点；涉及生成、写回、高风险动作时加入 confirmation_gate。"
        : "2. 必须包含 expert 或 skill 节点；当流程需要表达具体技能分发时，优先拆出 skill 节点；涉及生成、写回、高风险动作时加入 confirmation_gate。",
      "3. 五元素只能使用下方字典中存在的 ID；不确定就返回空数组，不要编造新 ID。",
      "4. 边必须按节点 nodeKey 正确引用，形成单一主流程；不要返回孤立节点。",
      "5. 输出必须是已经可编辑的 AI 草案，不是空白模板。",
      "",
      `目标类型：${input.targetKind}`,
      `目标标识：${input.targetId}`,
      `目标名称：${input.targetName}`,
      `源文档路径：${input.sourcePath}`,
      compactPrompt ? "说明：以下文档已做压缩摘录，请优先抓业务职责、Skill 路由、确认闸和交付约束。" : "",
      "",
      `可用五元素字典（candidate_full_catalog，全候选全集，共 ${dictionaryCount} 项）:`,
      "说明：这里不是只给 active_seed 115 项，而是当前系统完整候选全集。你可以使用任何已存在的字典 ID，但绝不能编造新 ID。",
      `Object: ${groupedDictionary.object.join("；")}`,
      `Link: ${groupedDictionary.link.join("；")}`,
      `Function: ${groupedDictionary.function.join("；")}`,
      `Action: ${groupedDictionary.action.join("；")}`,
      `Interface: ${groupedDictionary.interface.join("；")}`,
      "",
      compactPrompt ? "专家/专家团配置文档摘录：" : "专家/专家团配置文档：",
      sourceMarkdown,
    ].filter(Boolean).join("\n");
    return [
      {
        role: "system" as const,
        content: "你负责把专家配置文档翻译为 Ontology 编排草案。你只能输出严格 JSON。",
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ];
  }

  private shouldRetryCompactAiDraftPrompt(error: unknown) {
    if (!(error instanceof ServiceUnavailableException)) {
      return false;
    }
    const message = error.message || "";
    return message.includes("多元探索平台 AI 草案请求失败：fetch failed")
      || message.includes("多元探索平台 AI 草案请求超时");
  }

  private resolveAiDraftAttemptTimeoutMs(envName: string, fallbackMs: number) {
    const raw = Number(process.env[envName] || "");
    if (!Number.isFinite(raw) || raw <= 0) {
      return fallbackMs;
    }
    return Math.max(15000, Math.min(180000, Math.floor(raw)));
  }

  private summarizeAiDraftSourceMarkdown(markdown: string, maxChars = 7200) {
    const normalized = String(markdown || "").replace(/\r\n/g, "\n").trim();
    if (!normalized) {
      return "";
    }
    const frontmatterMatch = normalized.match(/^---\n[\s\S]*?\n---\n*/);
    const frontmatter = frontmatterMatch?.[0]?.trim() || "";
    const body = frontmatter ? normalized.slice(frontmatterMatch?.[0]?.length || 0).trim() : normalized;
    const outlineLines = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) =>
        /^#{1,6}\s/.test(line)
        || /^[-*]\s/.test(line)
        || /^\d+\.\s/.test(line)
        || /^(skills|use|constraint|owner|contract|exceptions)\s*:/i.test(line),
      )
      .slice(0, 120);
    const uniqueOutline = Array.from(new Set(outlineLines));
    const outline = uniqueOutline.length ? uniqueOutline.join("\n") : "";
    const parts: string[] = [];
    if (frontmatter) {
      parts.push(frontmatter);
    }
    if (outline) {
      parts.push(`关键结构摘录：\n${outline}`);
    }
    const usedLength = parts.join("\n\n").length;
    const remainingBudget = Math.max(1800, maxChars - usedLength - 32);
    const excerpt = body.slice(0, remainingBudget).trim();
    if (excerpt) {
      parts.push(`正文摘录：\n${excerpt}${body.length > excerpt.length ? "\n\n[TRUNCATED]" : ""}`);
    }
    const summarized = parts.filter(Boolean).join("\n\n").trim();
    return summarized.length > maxChars
      ? `${summarized.slice(0, maxChars)}\n\n[TRUNCATED]`
      : summarized;
  }

  private async requestAiDraftChatCompletion(input: {
    brandId: string;
    model?: string;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    userId: string;
    timeoutMs: number;
  }) {
    const requestedModel = this.optionalText(input.model, 128)
      || String(process.env.ONTOLOGY_AI_DRAFT_MODEL || "").trim()
      || "gpt-5.5";
    const fallbackDiagnostics: string[] = [];
    if (requestedModel.toLowerCase().startsWith("deepseek-")) {
      try {
        const deepseekOfficial = await this.tryRequestAiDraftViaDeepSeekOfficial({
          ...input,
          model: requestedModel,
        });
        if (deepseekOfficial) {
          return {
            ...deepseekOfficial,
            provider: "deepseek_official",
          };
        }
      } catch (error) {
        if (!this.shouldContinueAiDraftProviderFallback(error)) {
          throw error;
        }
        fallbackDiagnostics.push(this.formatAiDraftProviderFallbackMessage("DeepSeek 官方", error));
      }
    }

    try {
      const preferred = await this.tryRequestAiDraftViaDuoyuanx(input);
      if (preferred) {
        return {
          ...preferred,
          provider: "duoyuanx",
        };
      }
    } catch (error) {
      if (!this.shouldContinueAiDraftProviderFallback(error)) {
        throw error;
      }
      fallbackDiagnostics.push(this.formatAiDraftProviderFallbackMessage("多元探索平台", error));
    }

    try {
      const fallback = await this.glmOpenService.chatComplete(input.brandId, {
        model: process.env.ONTOLOGY_AI_DRAFT_GLM_MODEL || "glm-4-plus",
        temperature: 0.2,
        messages: input.messages,
        userId: input.userId,
        timeoutMs: input.timeoutMs,
      });
      return {
        ...fallback,
        provider: "glm_open",
      };
    } catch (error) {
      const diagnostics = [
        ...fallbackDiagnostics,
        this.formatAiDraftProviderFallbackMessage("GLM Open", error),
      ].filter(Boolean);
      throw new ServiceUnavailableException(
        diagnostics.length
          ? `AI 草案请求失败：${diagnostics.join("；")}`
          : `AI 草案请求失败：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private shouldContinueAiDraftProviderFallback(error: unknown) {
    return error instanceof ServiceUnavailableException;
  }

  private formatAiDraftProviderFallbackMessage(providerLabel: string, error: unknown) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    if (/insufficient balance/i.test(rawMessage)) {
      return `${providerLabel}余额不足，已自动尝试下一条通道`;
    }
    if (/request failed|fetch failed/i.test(rawMessage)) {
      return `${providerLabel}请求失败，已自动尝试下一条通道`;
    }
    if (/超时|timeout/i.test(rawMessage)) {
      return `${providerLabel}请求超时，已自动尝试下一条通道`;
    }
    return `${providerLabel}不可用，已自动尝试下一条通道`;
  }

  private async tryRequestAiDraftViaDeepSeekOfficial(input: {
    brandId: string;
    model?: string;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    userId: string;
    timeoutMs: number;
  }) {
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(
      input.brandId,
      ["https://api.deepseek.com"],
    );
    if (resolution.status !== "resolved" || !resolution.apiKeys.length) {
      return null;
    }
    const requestId = randomUUID();
    const model = this.optionalText(input.model, 128) || "deepseek-v4-flash";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${String(resolution.apiKeys[0] || "").trim().replace(/^Bearer\s+/i, "")}`,
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature: 0.2,
          user: input.userId,
          response_format: { type: "json_object" },
          messages: input.messages,
        }),
        signal: controller.signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new ServiceUnavailableException(
          `DeepSeek 官方 AI 草案请求失败：${response.status}${responseText ? `，${responseText.slice(0, 400)}` : ""}`,
        );
      }
      const payload = JSON.parse(responseText) as Record<string, unknown>;
      return {
        requestId: this.optionalText(payload.id, 128) || requestId,
        model: this.optionalText(payload.model, 128) || model,
        text: this.extractChatCompletionText(payload),
        raw: payload,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ServiceUnavailableException("DeepSeek 官方 AI 草案请求超时");
      }
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        `DeepSeek 官方 AI 草案请求失败：${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private extractChatCompletionText(payload: Record<string, unknown>) {
    const choice = Array.isArray(payload.choices) ? payload.choices[0] as Record<string, unknown> : null;
    const message = this.asRecord(choice?.message);
    const content = this.normalizeChatMessageContent(message?.content);
    if (content) {
      return content;
    }
    return this.normalizeChatMessageContent(message?.reasoning_content);
  }

  private normalizeChatMessageContent(value: unknown) {
    if (typeof value === "string") {
      return value.trim();
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          const record = this.asRecord(item);
          return this.optionalText(record?.text, 20000) || this.optionalText(record?.content, 20000) || "";
        })
        .join("")
        .trim();
    }
    return "";
  }

  private async tryRequestAiDraftViaDuoyuanx(input: {
    brandId: string;
    model?: string;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    userId: string;
    timeoutMs: number;
  }) {
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(
      input.brandId,
      ["https://duoyuanx.com"],
    );
    if (resolution.status !== "resolved" || !resolution.apiKeys.length) {
      return null;
    }
    const requestId = randomUUID();
    const model = this.optionalText(input.model, 128)
      || String(process.env.ONTOLOGY_AI_DRAFT_MODEL || "").trim()
      || "gpt-5.5";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const response = await fetch("https://duoyuanx.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${String(resolution.apiKeys[0] || "").trim().replace(/^Bearer\s+/i, "")}`,
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature: 0.2,
          user: input.userId,
          messages: input.messages,
        }),
        signal: controller.signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new ServiceUnavailableException(
          `多元探索平台 AI 草案请求失败：${response.status}${responseText ? `，${responseText.slice(0, 400)}` : ""}`,
        );
      }
      const payload = JSON.parse(responseText) as Record<string, unknown>;
      return {
        requestId: this.optionalText(payload.id, 128) || requestId,
        model: this.optionalText(payload.model, 128) || model,
        text: this.extractOpenAiStyleMessageText(payload),
        raw: payload,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ServiceUnavailableException("多元探索平台 AI 草案请求超时");
      }
      throw new ServiceUnavailableException(
        `多元探索平台 AI 草案请求失败：${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private extractOpenAiStyleMessageText(payload: Record<string, unknown>) {
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const firstChoice = choices.length ? this.asRecord(choices[0]) : {};
    const message = this.asRecord(firstChoice.message);
    const directContent = this.optionalText(message.content, 200000);
    if (directContent) {
      return directContent;
    }
    const contentParts = Array.isArray(message.content)
      ? message.content
        .map((item) => {
          const part = this.asRecord(item);
          return this.optionalText(part.text, 200000) || this.optionalText(part.content, 200000) || "";
        })
        .filter(Boolean)
      : [];
    return contentParts.join("\n").trim();
  }

  private normalizeAiDraftBrandId(value?: string | null) {
    const normalized = this.optionalText(value, 128);
    return normalized || "brand-demo-cleaning";
  }

  private parseAiDraftJson(rawText: string) {
    const normalized = String(rawText || "").trim();
    if (!normalized) {
      throw new ServiceUnavailableException("AI 草案生成返回为空，暂时无法创建 Ontology 草稿");
    }
    const candidates = [
      normalized,
      normalized.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim(),
    ];
    const jsonStart = normalized.indexOf("{");
    const jsonEnd = normalized.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      candidates.push(normalized.slice(jsonStart, jsonEnd + 1));
    }
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, any>;
        }
      } catch {
        continue;
      }
    }
    throw new ServiceUnavailableException("AI 草案返回格式不是有效 JSON，暂时无法创建 Ontology 草稿");
  }

  private normalizeAiDraftNodes(
    rawNodes: unknown[],
    dictionaryLookup: OntologyDictionaryLookup,
    dictionarySource: string,
    bindingContext?: {
      targetKind?: string;
      targetId?: string;
      targetName?: string;
      sourcePath?: string;
      sourceMarkdown?: string;
    },
  ): FiveElementNodeInput[] {
    const nodes = Array.isArray(rawNodes) ? rawNodes : [];
    return nodes
      .map((item, index) => {
        const node = this.asRecord(item);
        const nodeKey = this.optionalText(node.nodeKey, 128) || `ai_node_${index + 1}`;
        const nodeType = this.normalizeAiNodeType(this.optionalText(node.nodeType, 64));
        const objectIds = this.normalizeGeneratedDictionaryIds(node.objectIds, "Object", dictionaryLookup);
        const linkIds = this.normalizeGeneratedDictionaryIds(node.linkIds, "Link", dictionaryLookup);
        const functionIds = this.normalizeGeneratedDictionaryIds(node.functionIds, "Function", dictionaryLookup);
        const actionIds = this.normalizeGeneratedDictionaryIds(node.actionIds, "Action", dictionaryLookup);
        const interfaceIds = this.normalizeGeneratedDictionaryIds(node.interfaceIds, "Interface", dictionaryLookup);
        const title = this.optionalText(node.title, 256) || `AI 节点 ${index + 1}`;
        const subtitle = this.optionalText(node.subtitle, 256) || "";
        const description = this.optionalText(node.description, 4000) || "";
        const boundElements = this.inferAiDraftNodeBindings(
          {
            nodeKey,
            nodeType,
            title,
            subtitle,
            description,
          },
          bindingContext,
        );
        return {
          nodeKey,
          nodeType,
          title,
          subtitle,
          description,
          sortOrder: (index + 1) * 100,
          positionX: 80 + index * 240,
          positionY: 140 + (index % 2) * 180,
          objectJson: objectIds,
          linkJson: linkIds,
          functionJson: functionIds,
          actionJson: actionIds,
          interfaceJson: interfaceIds,
          referencesJson: {
            source: "ontology_ai_generated_draft",
            dictionarySource,
            ontologyRefs: {
              objectElementIds: objectIds,
              linkElementIds: linkIds,
              functionElementIds: functionIds,
              actionElementIds: actionIds,
              interfaceElementIds: interfaceIds,
            },
            boundElements,
          },
        };
      })
      .filter((item) => item.nodeKey && item.title);
  }

  private shouldRequireAiSkillNode(targetKind: string, sourceMarkdown: string) {
    const normalizedTargetKind = this.optionalText(targetKind, 64).toLowerCase();
    if (normalizedTargetKind === "expert_team") {
      return true;
    }
    return /(^|\n)\s*(skills?|use|skill[_\-\s]?route|技能)\s*:/im.test(String(sourceMarkdown || ""));
  }

  private ensureAiDraftSkillNode(nodes: FiveElementNodeInput[], requireSkillNode: boolean) {
    if (!requireSkillNode || nodes.some((node) => node.nodeType === "skill")) {
      return nodes;
    }
    const expertIndexes = nodes
      .map((node, index) => ({ node, index }))
      .filter((item) => item.node.nodeType === "expert")
      .map((item) => item.index);
    if (!expertIndexes.length) {
      return nodes;
    }
    const targetIndex = expertIndexes.length > 1 ? expertIndexes[expertIndexes.length - 1] : expertIndexes[0];
    return nodes.map((node, index) => {
      if (index !== targetIndex) {
        return node;
      }
      const title = /skill|技能/i.test(node.title || "") ? node.title : `Skill · ${node.title}`;
      const subtitle = /skill|技能/i.test(node.subtitle || "") ? (node.subtitle || "") : (node.subtitle || "技能节点");
      return {
        ...node,
        nodeType: "skill",
        title,
        subtitle,
      };
    });
  }

  private buildExpertTeamRegistryDraft(targetKind: string, sourcePath: string, targetName: string, declaredSourceRoot = "") {
    if (this.optionalText(targetKind, 64).toLowerCase() !== "expert_team") {
      return null;
    }
    type RegistryRow = Record<string, string>;
    type RegistrySkillRow = RegistryRow & { __section: string };
    const sourceRoot = this.resolveExpertSourceRoot(sourcePath, declaredSourceRoot);
    if (!sourceRoot) {
      return null;
    }

    const teamReadme = this.readExpertSourceMarkdown(`${sourceRoot}/README.md`);
    const expertRegistry = this.readExpertSourceMarkdown(`${sourceRoot}/references/expert-registry.md`);
    const skillRegistry = this.readExpertSourceMarkdown(`${sourceRoot}/references/skill-registry.md`);
    const videoSkillRouting = this.readExpertSourceMarkdown(`${sourceRoot}/references/video-skill-routing.md`);
    if (!expertRegistry || !skillRegistry) {
      return null;
    }

    const teamTables = teamReadme ? this.parseMarkdownTables(teamReadme) : [];
    const expertTables = this.parseMarkdownTables(expertRegistry);
    const skillTables = this.parseMarkdownTables(skillRegistry);
    const videoSkillTables = this.parseMarkdownTables(videoSkillRouting);
    const teamRows: RegistryRow[] = teamTables.find((table) => table.headers.includes("Agent ID") && table.headers.includes("角色"))?.rows || [];
    const expertRows: RegistryRow[] = expertTables.find((table) => table.headers.includes("Expert ID") && table.headers.includes("层级"))?.rows || [];
    const registrySkillRows: RegistrySkillRow[] = skillTables
      .filter((table) => table.headers.includes("Skill ID") && table.headers.includes("归属专家"))
      .flatMap((table) => table.rows.map((row) => ({ ...row, __section: table.heading } as RegistrySkillRow)));
    const routingSkillRows: RegistrySkillRow[] = videoSkillTables
      .filter((table) => table.headers.includes("Skill ID") && table.headers.includes("归属专家"))
      .flatMap((table) => table.rows.map((row) => ({
        "Skill ID": row["Skill ID"] || "",
        "归属专家": row["归属专家"] || "",
        "适用场景": row["适用场景"] || "",
        "最低输入": row["主要产物 / 前置要求"] || "",
        "输出产物": row["优先目标"] || row["主要产物 / 前置要求"] || "",
        __section: table.heading || "视频层技能路由",
      } as RegistrySkillRow)));
    const skillRowMap = new Map<string, RegistrySkillRow>();
    [...routingSkillRows, ...registrySkillRows].forEach((row) => {
      const skillId = String(row["Skill ID"] || "").trim().replace(/`/g, "");
      if (!skillId) return;
      skillRowMap.set(skillId, row);
    });
    const skillRows = Array.from(skillRowMap.values());
    if (!expertRows.length || !skillRows.length) {
      return null;
    }

    const expertRoleMap = new Map(teamRows.map((row) => [String(row["Agent ID"] || "").trim(), String(row["角色"] || "").trim()]));
    const startNodeKey = "stage_start";
    const teamLeadId = "douyin-fullflow-ops-team-lead";
    const teamLeadPath = this.optionalText(sourcePath, 500) || `${sourceRoot}/agents/${teamLeadId}.md`;
    const topicExpertId = "douyin-topic-expert";
    const copywritingExpertId = "douyin-copywriting-expert";
    const strategyExpertId = "douyin-strategy-expert";
    const reviewExpertId = "douyin-data-review-expert";
    const videoExperts = expertRows
      .filter((row) => String(row["层级"] || "").includes("视频专家"))
      .map((row) => String(row["Expert ID"] || "").trim().replace(/`/g, ""))
      .filter(Boolean);

    const expertPositions = new Map<string, { x: number; y: number }>([
      ["douyin-fullflow-ops-team-lead", { x: 340, y: 80 }],
      [strategyExpertId, { x: 680, y: 40 }],
      [topicExpertId, { x: 680, y: 280 }],
      [copywritingExpertId, { x: 680, y: 620 }],
      ["douyin-digital-human-video-expert", { x: 1080, y: 40 }],
      ["douyin-drama-video-expert", { x: 1080, y: 360 }],
      ["douyin-brand-promo-video-expert", { x: 1080, y: 680 }],
      ["douyin-explainer-video-expert", { x: 1080, y: 1000 }],
      ["douyin-creative-video-expert", { x: 1080, y: 1320 }],
      [reviewExpertId, { x: 1520, y: 980 }],
    ]);
    const skillLaneOffsets = new Map<string, number>();
    const nodes: FiveElementNodeInput[] = [{
      nodeKey: startNodeKey,
      nodeType: "stage",
      title: "启动编排",
      subtitle: "按团队注册表展开",
      description: `按 ${targetName} 的 expert-registry 与 skill-registry 展开完整专家/Skill 画布。`,
      positionX: 80,
      positionY: 80,
      sortOrder: 100,
      referencesJson: {
        source: "expert_team_registry_compiler",
        boundElements: [
          {
            id: `expert_team:${teamLeadPath}`,
            kind: "expert_team",
            label: targetName,
            name: teamLeadId,
            path: teamLeadPath,
            refType: "expert_source_file",
          },
        ],
      },
    }];
    const edges: FlowEdgeInput[] = [];
    let sortOrder = 200;

    for (const row of expertRows) {
      const expertId = this.normalizeRegistryEntityId(row["Expert ID"]);
      if (!expertId) continue;
      const role = expertRoleMap.get(expertId) || this.optionalText(row["归属家族"], 128) || expertId;
      const downstream = this.extractBacktickIds(String(row["下游"] || "")).join(" / ");
      const relPath = `${sourceRoot}/agents/${expertId}.md`;
      const pos = expertPositions.get(expertId) || { x: 680, y: 80 + sortOrder };
      nodes.push({
        nodeKey: expertId,
        nodeType: "expert",
        title: role,
        subtitle: expertId,
        description: `${this.optionalText(row["核心职责"], 2000) || "负责该专家域标准交付。"}${downstream ? ` 下游：${downstream}` : ""}`,
        positionX: pos.x,
        positionY: pos.y,
        sortOrder,
        referencesJson: {
          source: "expert_team_registry_compiler",
          boundElements: [
            {
              id: `${expertId === teamLeadId ? "expert_team" : "expert"}:${relPath}`,
              kind: expertId === teamLeadId ? "expert_team" : "expert",
              label: role,
              name: expertId,
              path: relPath,
              refType: "expert_source_file",
              description: relPath,
            },
          ],
        },
      });
      sortOrder += 100;
    }

    for (const row of skillRows) {
      const rawSkillId = String(row["Skill ID"] || "");
      const skillId = this.normalizeRegistryEntityId(rawSkillId);
      const owner = this.normalizeRegistrySkillOwner(String(row["归属专家"] || ""));
      if (!skillId || !owner) continue;
      const section = String(row.__section || "");
      const ownerPos = expertPositions.get(owner) || { x: 1080, y: 80 };
      const laneKey = owner || section || "skill";
      const laneIndex = skillLaneOffsets.get(laneKey) || 0;
      skillLaneOffsets.set(laneKey, laneIndex + 1);
      const x = ownerPos.x + (/视频层|数据分析与复盘层/.test(section) ? 360 : 300);
      const y = ownerPos.y + laneIndex * 130;
      const title = skillId;
      const scenario = this.optionalText(row["适用场景"], 256) || "按注册表适用场景执行";
      const path = `${sourceRoot}/skills/${skillId}/SKILL.md`;
      nodes.push({
        nodeKey: skillId,
        nodeType: "skill",
        title,
        subtitle: `${owner} · ${scenario}`,
        description: `最低输入：${this.optionalText(row["最低输入"], 1000) || "按注册表要求"}；输出：${this.optionalText(row["输出产物"], 1000) || "标准交付物"}。`,
        positionX: x,
        positionY: y,
        sortOrder: sortOrder + laneIndex,
        referencesJson: {
          source: "expert_team_registry_compiler",
          boundElements: this.buildRegistrySkillBoundElements({
            rawSkillId,
            skillId,
            title,
            sourceRoot,
            section,
          }),
        },
      });
      edges.push({
        edgeKey: `${owner}_to_${skillId}`,
        fromNodeKey: owner,
        toNodeKey: skillId,
        label: "调用 Skill",
        conditionJson: {
          mode: "expert_team_registry_compiler",
          branch: "skill",
          when: [this.optionalText(row["适用场景"], 256) || "满足对应业务场景"],
          failureAction: [],
        },
        sortOrder: edges.length * 100 + 100,
      });
    }

    const addEdge = (fromNodeKey: string, toNodeKey: string, label: string, when: string) => {
      edges.push({
        edgeKey: `${fromNodeKey}_to_${toNodeKey}_${edges.length + 1}`,
        fromNodeKey,
        toNodeKey,
        label,
        conditionJson: {
          mode: "expert_team_registry_compiler",
          branch: "main",
          when: [when],
          failureAction: [],
        },
        sortOrder: edges.length * 100 + 100,
      });
    };

    addEdge(startNodeKey, "douyin-fullflow-ops-team-lead", "进入主理人", "读取团队入口与任务上下文");
    addEdge("douyin-fullflow-ops-team-lead", strategyExpertId, "标准起跑", "需要先做策略规划");
    addEdge("douyin-fullflow-ops-team-lead", topicExpertId, "快速起跑", "允许跳过策略直接进入选题");
    addEdge(strategyExpertId, topicExpertId, "策略交接", "策略结论已确认");
    addEdge(topicExpertId, copywritingExpertId, "选题交接", "主选题、视频专家与 Skill 已确认");
    for (const expertId of videoExperts) {
      addEdge(copywritingExpertId, expertId, "创作交接", "创作包已完成并进入视频执行");
      addEdge(expertId, reviewExpertId, "进入复盘", "视频执行完成并沉淀结果");
    }
    addEdge(reviewExpertId, strategyExpertId, "回流策略", "周复盘与优化动作已形成");

    return {
      flowName: `${targetName} AI 草案`,
      description: "按团队专家注册表与 Skill 注册表全量展开的编排骨架，专家负责统筹与验收，Skill 负责具体执行。",
      nodes,
      edges,
    };
  }

  private parseMarkdownTables(markdown: string) {
    const lines = String(markdown || "").replace(/\r/g, "").split("\n");
    const out: Array<{ heading: string; headers: string[]; rows: Array<Record<string, string>> }> = [];
    let currentHeading = "";
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
      if (headingMatch) {
        currentHeading = headingMatch[1].trim();
        continue;
      }
      if (!line.startsWith("|")) continue;
      const separator = (lines[index + 1] || "").trim();
      if (!separator.startsWith("|") || !/-{3,}/.test(separator)) continue;
      const headers = this.parseMarkdownTableCells(line);
      const rows: Array<Record<string, string>> = [];
      index += 2;
      while (index < lines.length) {
        const rowLine = (lines[index] || "").trim();
        if (!rowLine.startsWith("|")) {
          index -= 1;
          break;
        }
        const cells = this.parseMarkdownTableCells(rowLine);
        const row: Record<string, string> = {};
        headers.forEach((header, cellIndex) => {
          row[header] = cells[cellIndex] || "";
        });
        rows.push(row);
        index += 1;
      }
      out.push({ heading: currentHeading, headers, rows });
    }
    return out;
  }

  private parseMarkdownTableCells(line: string) {
    return String(line || "")
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  private extractBacktickIds(text: string) {
    return Array.from(String(text || "").matchAll(/`([^`]+)`/g))
      .map((match) => match[1].trim())
      .filter(Boolean);
  }

  private normalizeRegistryEntityId(value: unknown) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const backtickIds = this.extractBacktickIds(raw);
    const candidate = (backtickIds[0] || raw)
      .replace(/`/g, "")
      .replace(/[（(][^）)]*[）)]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return candidate;
  }

  private normalizeRegistrySkillOwner(owner: string) {
    const normalized = this.normalizeRegistryEntityId(owner);
    if (!normalized) return "";
    const ownerAliasMap: Record<string, string> = {
      "数字人": "douyin-digital-human-video-expert",
      "剧情短片": "douyin-drama-video-expert",
      "品牌广告": "douyin-brand-promo-video-expert",
      "科普讲解": "douyin-explainer-video-expert",
      "创意": "douyin-creative-video-expert",
      "创意（辅助）": "douyin-creative-video-expert",
    };
    return ownerAliasMap[normalized] || normalized;
  }

  private buildRegistrySkillBoundElements(input: {
    rawSkillId: string;
    skillId: string;
    title: string;
    sourceRoot: string;
    section: string;
  }) {
    const localSkillPath = `${input.sourceRoot}/skills/${input.skillId}/SKILL.md`;
    if (this.readExpertSourceMarkdown(localSkillPath)) {
      return [{
        id: `skill:${localSkillPath}`,
        kind: "skill",
        label: input.title,
        name: input.skillId,
        path: localSkillPath,
        refType: "expert_source_file",
        description: localSkillPath,
      }];
    }
    const isConnectorCapability = /连接器能力|connector/i.test(input.rawSkillId) || input.skillId === "flova";
    if (isConnectorCapability) {
      const routingRef = `${input.sourceRoot}/references/video-skill-routing.md`;
      return [{
        id: `prompt:${routingRef}`,
        kind: "prompt",
        label: input.title,
        name: input.skillId,
        path: routingRef,
        refType: "expert_source_reference",
        description: routingRef,
      }];
    }
    return [{
      id: `skill:${localSkillPath}`,
      kind: "skill",
      label: input.title,
      name: input.skillId,
      path: localSkillPath,
      refType: "expert_source_file",
      description: localSkillPath,
    }];
  }

  private resolveExpertSourceRoot(sourcePath: string, declaredSourceRoot = "") {
    const normalized = String(sourcePath || "").replace(/\\/g, "/").replace(/\/+$/g, "");
    const declared = String(declaredSourceRoot || "").replace(/\\/g, "/").replace(/\/+$/g, "");
    const candidates = new Set<string>();
    const registerCandidate = (candidate: string) => {
      const normalizedCandidate = String(candidate || "").replace(/\\/g, "/").replace(/\/+$/g, "");
      if (normalizedCandidate) {
        candidates.add(normalizedCandidate);
      }
    };
    const hasRegistryFiles = (root: string) => (
      Boolean(this.readExpertSourceMarkdown(`${root}/references/expert-registry.md`))
      && Boolean(this.readExpertSourceMarkdown(`${root}/references/skill-registry.md`))
    );

    const expertSourceMarker = "/expert-source/";
    if (normalized.includes(expertSourceMarker)) {
      registerCandidate(normalized.slice(0, normalized.indexOf(expertSourceMarker) + expertSourceMarker.length - 1));
    }
    if (normalized.endsWith("/expert-source")) {
      registerCandidate(normalized);
    }

    const folderMarkers = ["/agents/", "/skills/", "/references/", "/avatars/", "/.codebuddy-plugin/"];
    for (const marker of folderMarkers) {
      if (normalized.includes(marker)) {
        registerCandidate(normalized.slice(0, normalized.indexOf(marker)));
      }
    }
    if (normalized === "README.md" || /\/README\.md$/i.test(normalized)) {
      registerCandidate(normalized.replace(/(^|\/)README\.md$/i, ""));
    }

    const parts = normalized.split("/").filter(Boolean);
    const directoryParts = parts.length && /\.[a-z0-9]+$/i.test(parts[parts.length - 1]) ? parts.slice(0, -1) : parts;
    for (let length = directoryParts.length; length >= 1; length -= 1) {
      registerCandidate(directoryParts.slice(0, length).join("/"));
    }

    registerCandidate(declared);
    registerCandidate("A-专家团优化开发交接包/references/expert-source");
    registerCandidate("expert-source");

    for (const candidate of candidates) {
      if (hasRegistryFiles(candidate)) {
        return candidate;
      }
    }
    return "";
  }

  private inferExpertSourceRootFromRel(relPath: string) {
    const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    for (const marker of ["/agents/", "/skills/", "/references/", "/avatars/", "/.codebuddy-plugin/"]) {
      if (normalized.includes(marker)) {
        return normalized.slice(0, normalized.indexOf(marker));
      }
    }
    return "";
  }

  private readExpertSourceMarkdown(relPath: string) {
    const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized || !/\.md$/i.test(normalized)) return "";
    try {
      return MdWriter.readMarkdownAtomic(normalized).md_text.replace(/^\uFEFF/, "");
    } catch {
      return this.readWorkspaceMarkdown(normalized);
    }
  }

  private readWorkspaceMarkdown(relPath: string) {
    const absolute = this.findWorkspaceRelativeFile(relPath);
    if (!absolute) return "";
    try {
      return readFileSync(absolute, "utf8").replace(/^\uFEFF/, "");
    } catch {
      return "";
    }
  }

  private findWorkspaceRelativeFile(relPath: string) {
    const raw = String(relPath || "").replace(/\\/g, "/");
    if (/^[A-Za-z]:\//.test(raw)) {
      try {
        readFileSync(raw, "utf8");
        return raw;
      } catch {
        return "";
      }
    }
    const normalized = raw.replace(/^\/+/, "");
    if (!normalized) return "";
    const candidates = [
      process.env.EXPERT_CONFIG_SOURCE_ROOT || "",
      process.cwd(),
      resolve(process.cwd(), ".."),
      resolve(process.cwd(), "..", ".."),
      resolve(process.cwd(), "..", "..", ".."),
      resolve(process.cwd(), "..", "..", "..", ".."),
      resolve(process.cwd(), "..", "..", "..", "..", ".."),
    ];
    for (const root of candidates) {
      const filePath = join(root, ...normalized.split("/"));
      try {
        readFileSync(filePath, "utf8");
        return filePath;
      } catch {
        continue;
      }
    }
    return "";
  }

  private findWorkspaceRelativeDirectory(relPath: string) {
    const raw = String(relPath || "").replace(/\\/g, "/");
    if (/^[A-Za-z]:\//.test(raw)) {
      try {
        if (statSync(raw).isDirectory()) return raw;
      } catch {
        return "";
      }
      return "";
    }
    const normalized = raw.replace(/^\/+/, "");
    if (!normalized) return "";
    const candidates = [
      process.env.EXPERT_CONFIG_SOURCE_ROOT || "",
      process.cwd(),
      resolve(process.cwd(), ".."),
      resolve(process.cwd(), "..", ".."),
      resolve(process.cwd(), "..", "..", ".."),
      resolve(process.cwd(), "..", "..", "..", ".."),
      resolve(process.cwd(), "..", "..", "..", "..", ".."),
    ];
    for (const root of candidates) {
      const dirPath = join(root, ...normalized.split("/"));
      try {
        if (statSync(dirPath).isDirectory()) return dirPath;
      } catch {
        continue;
      }
    }
    return "";
  }

  private inferAiDraftNodeBindings(
    node: {
      nodeKey: string;
      nodeType: string;
      title: string;
      subtitle?: string;
      description?: string;
    },
    context?: {
      targetKind?: string;
      targetId?: string;
      targetName?: string;
      sourcePath?: string;
      sourceMarkdown?: string;
    },
  ) {
    const sourcePath = this.optionalText(context?.sourcePath, 1000);
    const targetKind = this.optionalText(context?.targetKind, 64).toLowerCase();
    const sourceRoot = this.inferExpertSourceRootFromRel(sourcePath) || sourcePath.replace(/\/[^/]+$/g, "");
    const candidates = this.collectAiDraftBindingCandidates(sourceRoot);
    const contextReferencePaths = this.extractReferencePathsFromText(this.optionalText(context?.sourceMarkdown, 50000), sourceRoot);
    const seen = new Set<string>();
    const out: Array<Record<string, string>> = [];
    const push = (value: Record<string, string> | null) => {
      if (!value?.id || seen.has(value.id)) return;
      seen.add(value.id);
      out.push(value);
    };
    const textHaystack = [node.nodeKey, node.title, node.subtitle, node.description].filter(Boolean).join(" \n ");
    const normalizedHaystack = this.normalizeAiBindingText(textHaystack);
    for (const relPath of this.extractReferencePathsFromText(textHaystack, sourceRoot)) {
      push({
        id: `prompt:${relPath}`,
        kind: "prompt",
        label: relPath.split("/").pop()?.replace(/\.md$/i, "") || relPath,
        name: relPath.split("/").pop() || relPath,
        path: relPath,
        refType: "expert_source_reference",
        description: relPath,
      });
    }
    for (const agent of candidates.agents) {
      const needles = [agent.id, agent.name, agent.label, ...(Array.isArray(agent.aliases) ? agent.aliases : [])].filter(Boolean);
      if (needles.some((item) => this.matchesAiBindingNeedle(normalizedHaystack, item))) {
        push({
          id: `${agent.kind}:${agent.path}`,
          kind: agent.kind,
          label: agent.label,
          name: agent.id,
          path: agent.path,
          refType: "expert_source_file",
          description: agent.path,
        });
      }
    }
    for (const skill of candidates.skills) {
      const needles = [skill.id, skill.name, skill.label, ...(Array.isArray(skill.aliases) ? skill.aliases : [])].filter(Boolean);
      if (needles.some((item) => this.matchesAiBindingNeedle(normalizedHaystack, item))) {
        push({
          id: `skill:${skill.path}`,
          kind: "skill",
          label: skill.label,
          name: skill.id,
          path: skill.path,
          refType: "expert_source_file",
          description: skill.path,
        });
      }
    }
    if (!out.length && node.nodeType === "skill" && candidates.skills.length === 1) {
      const skill = candidates.skills[0];
      push({
        id: `skill:${skill.path}`,
        kind: "skill",
        label: skill.label,
        name: skill.id,
        path: skill.path,
        refType: "expert_source_file",
        description: skill.path,
      });
    }
    if (!out.length && node.nodeType === "skill" && contextReferencePaths.length) {
      for (const relPath of this.pickAiDraftFallbackReferencePaths(contextReferencePaths, node.nodeType)) {
        push({
          id: `prompt:${relPath}`,
          kind: "prompt",
          label: relPath.split("/").pop()?.replace(/\.md$/i, "") || relPath,
          name: relPath.split("/").pop() || relPath,
          path: relPath,
          refType: "expert_source_reference",
          description: relPath,
        });
      }
    }
    if (!out.length && ["expert", "stage", "confirmation_gate", "evidence"].includes(node.nodeType)) {
      const sourceLabel = this.optionalText(context?.targetName, 256) || sourcePath.split("/").pop() || "source";
      const sourceKind = targetKind === "expert_team" ? "expert_team" : "expert";
      if (sourcePath) {
        push({
          id: `${sourceKind}:${sourcePath}`,
          kind: sourceKind,
          label: sourceLabel,
          name: this.optionalText(context?.targetId, 256) || sourceLabel,
          path: sourcePath,
          refType: "expert_source_file",
          description: sourcePath,
        });
      }
      if (["confirmation_gate", "evidence"].includes(node.nodeType)) {
        const reportStandard = `${sourceRoot}/references/report-output-standard.md`;
        if (this.readExpertSourceMarkdown(reportStandard)) {
          push({
            id: `prompt:${reportStandard}`,
            kind: "prompt",
            label: "report-output-standard",
            name: "report-output-standard",
            path: reportStandard,
            refType: "expert_source_reference",
            description: reportStandard,
          });
        }
        for (const relPath of this.pickAiDraftFallbackReferencePaths(contextReferencePaths, node.nodeType)) {
          push({
            id: `prompt:${relPath}`,
            kind: "prompt",
            label: relPath.split("/").pop()?.replace(/\.md$/i, "") || relPath,
            name: relPath.split("/").pop() || relPath,
            path: relPath,
            refType: "expert_source_reference",
            description: relPath,
          });
        }
      }
    }
    return out;
  }

  private collectAiDraftBindingCandidates(sourceRoot: string) {
    const agentsDir = this.findWorkspaceRelativeDirectory(`${sourceRoot}/agents`);
    const skillsDir = this.findWorkspaceRelativeDirectory(`${sourceRoot}/skills`);
    const agents = agentsDir
      ? readdirSync(agentsDir)
        .filter((name) => /\.md$/i.test(name))
        .map((name) => {
          const id = name.replace(/\.md$/i, "");
          const path = `${sourceRoot}/agents/${name}`.replace(/\\/g, "/");
          const aliases = this.extractAiDraftMarkdownAliases(this.readExpertSourceMarkdown(path), id);
          return {
            id,
            name,
            label: aliases[0] || id,
            aliases,
            path,
            kind: /team-lead|omni-growth-expert$/i.test(id) ? "expert_team" : "expert",
          };
        })
      : [];
    const skills = skillsDir
      ? readdirSync(skillsDir)
        .filter((name) => {
          try {
            return statSync(join(skillsDir, name)).isDirectory();
          } catch {
            return false;
          }
        })
        .map((name) => {
          const path = `${sourceRoot}/skills/${name}/SKILL.md`.replace(/\\/g, "/");
          const aliases = this.extractAiDraftMarkdownAliases(this.readExpertSourceMarkdown(path), name);
          return {
            id: name,
            name,
            label: aliases[0] || name,
            aliases,
            path,
          };
        })
      : [];
    return { agents, skills };
  }

  private extractReferencePathsFromText(text: string, sourceRoot: string) {
    return Array.from(new Set(
      Array.from(String(text || "").matchAll(/(?:^|[\s(（`"'“”‘’])((?:references|skills\/[^/\s]+\/references)\/[A-Za-z0-9._\-\/]+\.md)/g))
        .map((match) => `${sourceRoot}/${match[1]}`.replace(/\\/g, "/").replace(/\/+/g, "/"))
        .filter((path) => this.readExpertSourceMarkdown(path)),
    ));
  }

  private extractAiDraftMarkdownAliases(markdown: string, fallbackId = "") {
    const text = String(markdown || "");
    const out: string[] = [];
    const seen = new Set<string>();
    const push = (value: string) => {
      const cleaned = this.cleanAiBindingAlias(value);
      if (!cleaned) return;
      const key = this.normalizeAiBindingText(cleaned);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(cleaned);
    };
    push(fallbackId);
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
    const heading = text.match(/^#\s+(.+)$/m)?.[1] || "";
    const emphasizedName = text.match(/你是\*\*([^*]+)\*\*/)?.[1] || "";
    push(heading);
    push(emphasizedName);
    for (const part of heading.split(/[—\-·•|｜:：]/g)) {
      push(part);
    }
    if (frontmatter?.[1]) {
      for (const key of ["name", "description"]) {
        const match = frontmatter[1].match(new RegExp(`(?:^|\\n)${key}:\\s*([^\\n]+)`, "i"));
        push(match?.[1] || "");
      }
      for (const key of ["displayName", "profession"]) {
        const zh = frontmatter[1].match(new RegExp(`${key}:\\s*[\\r\\n]+\\s*en:\\s*[^\\n]*[\\r\\n]+\\s*zh:\\s*([^\\n]+)`, "i"));
        const zhOnly = frontmatter[1].match(new RegExp(`${key}:\\s*[\\r\\n]+\\s*zh:\\s*([^\\n]+)`, "i"));
        const en = frontmatter[1].match(new RegExp(`${key}:\\s*[\\r\\n]+\\s*en:\\s*([^\\n]+)`, "i"));
        push(zh?.[1] || zhOnly?.[1] || "");
        push(en?.[1] || "");
      }
    }
    return out;
  }

  private cleanAiBindingAlias(value: string) {
    return String(value || "")
      .replace(/^#+\s*/g, "")
      .replace(/[`"'“”‘’]/g, "")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private normalizeAiBindingText(value: string) {
    return String(value || "")
      .toLowerCase()
      .replace(/[`"'“”‘’]/g, "")
      .replace(/[\s·•|｜:：,，。！？、/\\()[\]{}<>《》【】\-—_]+/g, "");
  }

  private matchesAiBindingNeedle(normalizedHaystack: string, needle: string) {
    const normalizedNeedle = this.normalizeAiBindingText(needle);
    return normalizedNeedle.length >= 2 && normalizedHaystack.includes(normalizedNeedle);
  }

  private pickAiDraftFallbackReferencePaths(paths: string[], nodeType: string) {
    const unique = Array.from(new Set((Array.isArray(paths) ? paths : []).filter(Boolean)));
    if (!unique.length) return [];
    const preferred = unique.filter((path) => {
      if (nodeType === "skill") {
        return /(platform|prompt|method|map|routing|skill)/i.test(path);
      }
      return /(report|handoff|contract|method|check|evidence|archive|platform)/i.test(path);
    });
    return (preferred.length ? preferred : unique).slice(0, 2);
  }

  private serializeBoundElementIds(items: unknown) {
    const normalizedItems = Array.isArray(items)
      ? items
      : this.boundElements(items);
    return normalizedItems
      .map((item) => this.optionalText((item as Record<string, unknown>).id, 500))
      .filter(Boolean)
      .sort()
      .join("|");
  }

  private mergeNodeReferencesJson(
    existingJson: unknown,
    boundElements: unknown[],
    input: { updatedBy?: string; note?: string } = {},
  ) {
    const merged = {
      ...this.asRecord(existingJson),
      boundElements: this.sanitizeReferences(boundElements),
      updatedBy: this.optionalText(input.updatedBy, 128) || "ai-control-ui",
      updatedAt: new Date().toISOString(),
      note: this.optionalText(input.note, 500),
    };
    return merged;
  }

  private normalizeAiDraftEdges(rawEdges: unknown[], nodes: FiveElementNodeInput[]): FlowEdgeInput[] {
    const edges = Array.isArray(rawEdges) ? rawEdges : [];
    const nodeKeySet = new Set(nodes.map((node) => node.nodeKey));
    const normalized: FlowEdgeInput[] = [];
    for (const [index, item] of edges.entries()) {
      const edge = this.asRecord(item);
      const fromNodeKey = this.optionalText(edge.fromNodeKey, 128);
      const toNodeKey = this.optionalText(edge.toNodeKey, 128);
      if (!fromNodeKey || !toNodeKey || !nodeKeySet.has(fromNodeKey) || !nodeKeySet.has(toNodeKey)) {
        continue;
      }
      normalized.push({
        edgeKey: this.optionalText(edge.edgeKey, 128) || `${fromNodeKey}_to_${toNodeKey}`,
        fromNodeKey,
        toNodeKey,
        label: this.optionalText(edge.label, 256) || "",
        conditionJson: {
          mode: "ai_generated_draft",
          branch: "success",
          when: this.normalizeStringList(edge.when, [], 8),
          failureAction: [],
        },
        sortOrder: (index + 1) * 100,
      });
    }
    return normalized;
  }

  private normalizeGeneratedDictionaryIds(
    rawValues: unknown,
    elementType: OntologyDictionaryItem["elementType"],
    dictionaryLookup: OntologyDictionaryLookup,
  ) {
    const values = Array.isArray(rawValues)
      ? rawValues
      : typeof rawValues === "string"
        ? rawValues.split(/[\n,，;；]/g)
        : [];
    return Array.from(
      new Set(
        values
          .map((item) => this.optionalText(item, 128))
          .map((item) => this.resolveDictionaryItem(item, elementType, dictionaryLookup)?.id || "")
          .filter(Boolean),
      ),
    ).slice(0, 4);
  }

  private normalizeAiNodeType(rawValue: string) {
    const normalized = String(rawValue || "").trim().toLowerCase();
    if (normalized === "expert") return "expert";
    if (["expert_skill", "skill"].includes(normalized)) return "skill";
    if (["tool", "mcp_tool", "mcp"].includes(normalized)) return "tool";
    if (["data_object", "data"].includes(normalized)) return "data_object";
    if (["confirmation_gate", "gate", "confirm"].includes(normalized)) return "confirmation_gate";
    if (["evidence", "ledger"].includes(normalized)) return "evidence";
    return "stage";
  }

  private resolveAiDraftTargetPath(targetId: string, selectedTarget: Record<string, unknown>) {
    const pathFromTarget = this.optionalText(selectedTarget.path, 1000);
    if (pathFromTarget) return pathFromTarget;
    const normalizedTargetId = this.optionalText(targetId, 256);
    if (!normalizedTargetId) return "";
    const separatorIndex = normalizedTargetId.indexOf(":");
    return separatorIndex >= 0 ? normalizedTargetId.slice(separatorIndex + 1) : "";
  }

  private asRecord(input: unknown) {
    return input && typeof input === "object" && !Array.isArray(input)
      ? input as Record<string, unknown>
      : {};
  }

  private slugifyText(value: unknown) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "draft";
  }

  private sampleNodes(): FiveElementNodeInput[] {
    return [
      {
        nodeKey: "intent",
        nodeType: "function",
        title: "识别业务意图",
        subtitle: "用户一句业务话",
        description: "判断用户是在找素材、生成内容、归档作品还是复盘任务。",
        positionX: 0,
        objectJson: ["O01", "O41"],
        linkJson: ["L01", "L23"],
        functionJson: ["F01", "F03"],
        actionJson: ["A30"],
        interfaceJson: ["I01", "I09", "I11"],
      },
      {
        nodeKey: "expert",
        nodeType: "expert",
        title: "匹配专家/Skill",
        subtitle: "专家团流程",
        description: "命中素材治理专家与可用 Skill，不直接跳到第三方生成。",
        positionX: 240,
        objectJson: ["O43"],
        linkJson: ["L24"],
        functionJson: ["F03", "F27"],
        actionJson: ["A27"],
        interfaceJson: ["I09", "I10", "I11"],
      },
      {
        nodeKey: "material",
        nodeType: "tool",
        title: "调用中台素材库",
        subtitle: "MCP 工具链",
        description: "先搜索素材档案，再按任务上下文筛选可复用素材。",
        positionX: 480,
        objectJson: ["O14", "O41"],
        linkJson: ["L01", "L06", "L23"],
        functionJson: ["F01", "F02", "F28"],
        actionJson: ["A34"],
        interfaceJson: ["I01", "I09", "I12"],
      },
      {
        nodeKey: "evidence",
        nodeType: "evidence",
        title: "写入任务证据",
        subtitle: "治理账本",
        description: "绑定 taskId、stageRunId、actionName 和素材引用。",
        positionX: 720,
        objectJson: ["O41", "O42"],
        linkJson: ["L06", "L23"],
        functionJson: ["F10", "F26"],
        actionJson: ["A31", "A34"],
        interfaceJson: ["I09", "I12"],
      },
    ];
  }

  private sampleEdges(): FlowEdgeInput[] {
    return [
      {
        edgeKey: "intent_to_expert",
        fromNodeKey: "intent",
        toNodeKey: "expert",
        label: "命中素材复用流程",
        conditionJson: {
          mode: "manual_draft",
          branch: "success",
          when: ["已识别为素材复用或参考素材选择意图"],
          failureAction: [],
        },
      },
      {
        edgeKey: "expert_to_material",
        fromNodeKey: "expert",
        toNodeKey: "material",
        label: "进入素材搜索",
        conditionJson: {
          mode: "manual_draft",
          branch: "success",
          when: ["已确认当前专家或 Skill 负责素材检索与筛选"],
          failureAction: [],
        },
      },
      {
        edgeKey: "material_to_evidence",
        fromNodeKey: "material",
        toNodeKey: "evidence",
        label: "选中后记账",
        conditionJson: {
          mode: "manual_draft",
          branch: "success",
          when: ["已选定待复用素材，并取得任务上下文"],
          failureAction: [],
        },
      },
    ];
  }

  private defaultSourceRefs() {
    return {
      expertSource: "A-专家团优化开发交接包/references/expert-source",
      aiControlPanels: ["experts", "skills", "connectors", "tasks", "assets", "brand-control"],
    };
  }

  private defaultRoutingRules() {
    return [
      {
        intent: "找素材/复用素材/给任务选参考素材",
        flowKey: DEFAULT_FLOW_KEY,
        requireTaskContext: true,
      },
    ];
  }

  private defaultConfirmationGates() {
    return [
      {
        gate: "publish_or_generate",
        mode: "blocked",
        reason: "素材复用流程只搜索和记账，不生成、不发布。",
      },
    ];
  }

  private defaultEvidenceRules() {
    return [
      {
        target: "wf_execution_events.evidenceRefsJson",
        evidenceKind: "ai_control_center_material_reuse",
        required: ["taskId", "stageRunId", "materialRefs"],
      },
    ];
  }

  private optionalStatus(value: unknown) {
    const normalized = this.optionalText(value, 32) || "draft";
    return ["draft", "generated", "reviewed", "published", "deprecated"].includes(normalized) ? normalized : "draft";
  }

  private optionalText(value: unknown, maxLength: number) {
    const normalized = String(value ?? "").trim();
    return normalized ? normalized.slice(0, maxLength) : "";
  }

  private optionalNumber(value: unknown) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : undefined;
  }

  private requiredText(value: unknown, message: string, maxLength: number) {
    const normalized = this.optionalText(value, maxLength);
    if (!normalized) {
      throw new BadRequestException(message);
    }
    return normalized;
  }

  private async requireTaskStageBinding(input: { brandId: string; taskId: string; stageRunId: string }) {
    const task = await this.prisma.wfTask.findUnique({
      where: { taskId: input.taskId },
      select: { brandId: true },
    });
    if (!task) {
      throw new BadRequestException(`任务不存在：${input.taskId}`);
    }
    if (task.brandId !== input.brandId) {
      throw new BadRequestException(`任务 ${input.taskId} 不属于品牌 ${input.brandId}`);
    }
    const stage = await this.prisma.wfStageRun.findUnique({
      where: { stageRunId: input.stageRunId },
      select: { taskId: true, stageKey: true },
    });
    if (!stage || stage.taskId !== input.taskId) {
      throw new BadRequestException(`阶段 ${input.stageRunId} 不属于任务 ${input.taskId}`);
    }
    return { brandId: task.brandId, stageKey: stage.stageKey };
  }

  private clampInt(value: unknown, min: number, max: number, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(parsed)));
  }

  private normalizeNodeStatus(value: unknown): "started" | "succeeded" | "failed" | "blocked" {
    const normalized = this.optionalText(value, 32);
    if (["started", "succeeded", "failed", "blocked"].includes(normalized)) {
      return normalized as "started" | "succeeded" | "failed" | "blocked";
    }
    return "started";
  }

  private shortHash(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 16);
  }

  private safeInt(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
  }

  private safeOptionalInt(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
  }

  private resolveNodeConfirmationPolicy(
    plan: Record<string, any>,
    step: Record<string, any>,
    input: OntologyExecutionNodeEvidenceInput,
  ) {
    const requestedRequiresConfirmation = input.requiresConfirmation === true;
    const confirmGateSatisfied = input.confirmGateSatisfied === true;
    const matchedGates = this.matchConfirmationGates(plan.confirmationGates, step);
    const inferredByNodeType = this.optionalText(step.nodeType, 64).toLowerCase() === "confirmation_gate";
    const requiresConfirmation = requestedRequiresConfirmation || inferredByNodeType || matchedGates.length > 0;
    const blockedReason = this.resolveBlockedReason({
      inputReason: input.blockedReason,
      requiresConfirmation,
      confirmGateSatisfied,
      step,
      matchedGates,
    });
    return {
      requiresConfirmation,
      confirmGateSatisfied,
      blockedReason,
      autoMatched: !requestedRequiresConfirmation && (inferredByNodeType || matchedGates.length > 0),
      matchedGates,
    };
  }

  private resolveBlockedReason(input: {
    inputReason?: string;
    requiresConfirmation: boolean;
    confirmGateSatisfied: boolean;
    step: Record<string, any>;
    matchedGates: OntologyConfirmationGateRule[];
  }) {
    const explicitReason = this.optionalText(input.inputReason, 1000);
    if (explicitReason) return explicitReason;
    if (!input.requiresConfirmation || input.confirmGateSatisfied) return "";
    const firstGateReason = input.matchedGates.find((item) => item.reason)?.reason || "";
    if (firstGateReason) return firstGateReason.slice(0, 1000);
    const title = this.optionalText(input.step.title || input.step.nodeKey, 128) || "当前节点";
    const description = this.optionalText(input.step.description, 256);
    const fallback = description
      ? `${title} 需要人工确认：${description}`
      : `${title} 需要人工确认，当前未满足 confirmation gate。`;
    return fallback.slice(0, 1000);
  }

  private matchConfirmationGates(raw: unknown, step: Record<string, any>): OntologyConfirmationGateRule[] {
    const rules = this.normalizeConfirmationGates(raw);
    if (!rules.length) return [];
    return rules.filter((rule) => this.confirmationGateMatchesStep(rule, step));
  }

  private normalizeConfirmationGates(raw: unknown): OntologyConfirmationGateRule[] {
    const candidates = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object"
        ? Object.values(raw as Record<string, unknown>)
        : [];
    const result: OntologyConfirmationGateRule[] = [];
    for (const item of candidates.slice(0, 20)) {
      const gate = this.optionalText((item as any)?.gate ?? (item as any)?.key ?? (item as any)?.name, 128);
      const mode = this.optionalText((item as any)?.mode, 64) || "blocked";
      const reason = this.optionalText((item as any)?.reason, 1000);
      if (!gate) continue;
      result.push({ gate, mode, reason });
    }
    return result;
  }

  private confirmationGateMatchesStep(rule: OntologyConfirmationGateRule, step: Record<string, any>) {
    const nodeType = this.optionalText(step.nodeType, 64).toLowerCase();
    if (nodeType === "confirmation_gate") return true;
    // Gate matching should follow node-facing semantics, not every dictionary description
    // expanded into ontologySelections. Otherwise downstream nodes can be over-matched
    // just because a selected Object/Function mentions words like "交付" or "验收".
    const textualHaystack = [
      step.nodeKey,
      step.nodeType,
      step.title,
      step.subtitle,
      step.description,
      this.compactJson(step.references),
    ].join(" ").toLowerCase();
    const semanticHaystack = [
      textualHaystack,
      this.compactJson(step.fiveElements),
    ].join(" ").toLowerCase();
    const gate = rule.gate.toLowerCase();
    if (/(publish|发布|generate|生成|render|产物|交付)/.test(gate)) {
      return this.matchesTextualGateKeyword(
        textualHaystack,
        /(publish|发布|generate|生成|render|产物|交付|review|验收)/,
        /((不|未|勿|禁止|避免|仅|只).{0,12}(publish|发布|generate|生成|render|产物|交付|review|验收))|((publish|发布|generate|生成|render|产物|交付|review|验收).{0,12}(禁止|不可|不允许|无需|未获))/,
      );
    }
    if (/(writeback|写回|save|保存|commit|落盘)/.test(gate)) {
      return this.matchesTextualGateKeyword(
        textualHaystack,
        /(writeback|写回|save|保存|commit|落盘)/,
        /((不|未|勿|禁止|避免|仅|只).{0,12}(writeback|写回|save|保存|commit|落盘))|((writeback|写回|save|保存|commit|落盘).{0,12}(禁止|不可|不允许|无需|未获))/,
      );
    }
    if (/(external|provider|tool|调用)/.test(gate)) {
      return /(external|provider|tool|调用|mcp)/.test(semanticHaystack);
    }
    return textualHaystack.includes(gate);
  }

  private matchesTextualGateKeyword(text: string, positive: RegExp, negative?: RegExp) {
    const segments = text
      .split(/[，。；;,.、\n\r]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    for (const segment of segments) {
      if (!positive.test(segment)) continue;
      if (negative && negative.test(segment)) continue;
      return true;
    }
    return false;
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}
