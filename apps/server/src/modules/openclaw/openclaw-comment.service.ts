import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DEFAULT_OPENCLAW_WORKSPACE_SCOPE,
  type AIControlCenterWorkspaceScope,
  normalizeAIControlCenterWorkspaceScope,
} from "./openclaw-workspace-scope";

const OPENCLAW_COMMENT_RESOURCE_TYPES = ["creative_material", "daily_plan", "explosive_analysis", "lobster_diary", "strategy_optimization", "marketing_plan", "growth_report", "video_work", "tencent_ad_lead"] as const;

export type AIControlCenterCommentResourceType = (typeof OPENCLAW_COMMENT_RESOURCE_TYPES)[number];

type AIControlCenterCommentRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  resourceType: string;
  resourceId: string;
  createdByUserId: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type AIControlCenterCommentStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  resourceType: AIControlCenterCommentResourceType;
  resourceId: string;
  createdByUserId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterCommentRecord = AIControlCenterCommentStoredRecord;

export type AIControlCenterCommentWorkspace = {
  items: AIControlCenterCommentRecord[];
  total: number;
};

@Injectable()
export class AIControlCenterCommentService {
  private bootstrapPromise: Promise<void> | null = null;

  private readonly fallbackItems: AIControlCenterCommentStoredRecord[] = [];

  constructor(private readonly prismaService: PrismaService) {}

  async listWorkspace(params: {
    brandId: string;
    workspaceScope?: string;
    resourceType?: string;
    resourceId?: string;
    limit?: number;
  }): Promise<AIControlCenterCommentWorkspace> {
    const items = await this.listRecords(params);
    return {
      items,
      total: items.length,
    };
  }

  async createComment(payload: {
    brandId: string;
    workspaceScope?: string;
    resourceType?: string;
    resourceId?: string;
    createdByUserId: string;
    content?: string;
  }): Promise<AIControlCenterCommentRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeAIControlCenterWorkspaceScope(payload.workspaceScope);
    const resourceType = this.normalizeResourceType(payload.resourceType);
    const resourceId = this.requireText(payload.resourceId, "缺少内容 ID", 200);
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const content = this.requireText(payload.content, "留言内容不能为空", 5000);
    const id = `ai_control_center_comment_${randomUUID()}`;

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        INSERT INTO "AIControlCenterComment" (
          "id",
          "brandId",
          "workspaceScope",
          "resourceType",
          "resourceId",
          "createdByUserId",
          "content",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${brandId},
          ${workspaceScope},
          ${resourceType},
          ${resourceId},
          ${createdByUserId},
          ${content},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      const workspace = await this.listWorkspace({
        brandId,
        workspaceScope,
        resourceType,
        resourceId,
      });
      return workspace.items[workspace.items.length - 1] || workspace.items[0];
    }

    const now = new Date().toISOString();
    const stored: AIControlCenterCommentStoredRecord = {
      id,
      brandId,
      workspaceScope,
      resourceType,
      resourceId,
      createdByUserId,
      content,
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackItems.push(stored);
    return stored;
  }

  private async listRecords(params: {
    brandId: string;
    workspaceScope?: string;
    resourceType?: string;
    resourceId?: string;
    limit?: number;
  }): Promise<AIControlCenterCommentRecord[]> {
    const brandId = this.requireText(params.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeAIControlCenterWorkspaceScope(params.workspaceScope);
    const resourceType = this.normalizeResourceType(params.resourceType);
    const resourceId = this.requireText(params.resourceId, "缺少内容 ID", 200);
    const limit = this.normalizeLimit(params.limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<AIControlCenterCommentRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "resourceType",
          "resourceId",
          "createdByUserId",
          "content",
          "createdAt",
          "updatedAt"
        FROM "AIControlCenterComment"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${workspaceScope}
          AND "resourceType" = ${resourceType}
          AND "resourceId" = ${resourceId}
        ORDER BY "createdAt" ASC
        LIMIT ${limit}
      `;
      return rows.map((row) => this.normalizeRow(row));
    }

    return this.fallbackItems
      .filter(
        (item) =>
          item.brandId === brandId
          && item.workspaceScope === workspaceScope
          && item.resourceType === resourceType
          && item.resourceId === resourceId,
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit);
  }

  private normalizeRow(row: AIControlCenterCommentRow): AIControlCenterCommentStoredRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeAIControlCenterWorkspaceScope(row.workspaceScope),
      resourceType: this.normalizeResourceType(row.resourceType),
      resourceId: String(row.resourceId || "").trim(),
      createdByUserId: String(row.createdByUserId || "").trim(),
      content: String(row.content || "").trim(),
      createdAt: this.normalizeDate(row.createdAt),
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private normalizeDate(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value || new Date().toISOString());
  }

  private requireText(value: string | undefined, message: string, maxLength = 200) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }
    return normalized.slice(0, maxLength);
  }

  private normalizeResourceType(value?: string): AIControlCenterCommentResourceType {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException("缺少内容类型");
    }
    if (!OPENCLAW_COMMENT_RESOURCE_TYPES.includes(normalized as AIControlCenterCommentResourceType)) {
      throw new BadRequestException("不支持的内容类型");
    }
    return normalized as AIControlCenterCommentResourceType;
  }

  private normalizeLimit(limit?: number) {
    if (!Number.isFinite(limit) || Number(limit) <= 0) {
      return 100;
    }
    return Math.min(200, Math.floor(Number(limit)));
  }

  private async ensureTableReady() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapTable();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapTable() {
    if (!(await this.prismaService.canUseDatabase())) {
      return;
    }
    if (this.prismaService.isLocalSqliteMode()) {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AIControlCenterComment" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "resourceType" TEXT NOT NULL,
          "resourceId" TEXT NOT NULL,
          "createdByUserId" TEXT NOT NULL,
          "content" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.ensureTableColumns("AIControlCenterComment", [
        { name: "workspaceScope", definition: `TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'` },
        { name: "resourceType", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "resourceId", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "content", definition: "TEXT NOT NULL DEFAULT ''" },
      ]);
    } else {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AIControlCenterComment" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "resourceType" TEXT NOT NULL,
          "resourceId" TEXT NOT NULL,
          "createdByUserId" TEXT NOT NULL,
          "content" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterComment"
        ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterComment"
        ADD COLUMN IF NOT EXISTS "resourceType" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterComment"
        ADD COLUMN IF NOT EXISTS "resourceId" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterComment"
        ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT ''
      `);
    }
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "AIControlCenterComment"
      SET "workspaceScope" = '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      WHERE COALESCE(NULLIF(TRIM("workspaceScope"), ''), '') = ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AIControlCenterComment_brand_scope_resource_created_idx"
      ON "AIControlCenterComment" ("brandId", "workspaceScope", "resourceType", "resourceId", "createdAt" ASC)
    `);
  }
}
