import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DEFAULT_OPENCLAW_WORKSPACE_SCOPE,
  type AIControlCenterWorkspaceScope,
  normalizeAIControlCenterWorkspaceScope,
} from "./openclaw-workspace-scope";

type AIControlCenterGeoVisibilityReportRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  title: string;
  description: string;
  htmlContent: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type AIControlCenterGeoVisibilityReportStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  title: string;
  description: string;
  htmlContent: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterGeoVisibilityReportRecord = AIControlCenterGeoVisibilityReportStoredRecord;

export type AIControlCenterGeoVisibilityReportWorkspace = {
  items: AIControlCenterGeoVisibilityReportRecord[];
  total: number;
};

@Injectable()
export class AIControlCenterGeoVisibilityReportService {
  private bootstrapPromise: Promise<void> | null = null;

  private readonly fallbackItems: AIControlCenterGeoVisibilityReportStoredRecord[] = [];

  constructor(private readonly prismaService: PrismaService) {}

  async listWorkspace(brandId: string, workspaceScope?: string, limit?: number): Promise<AIControlCenterGeoVisibilityReportWorkspace> {
    const items = await this.listRecords(brandId, workspaceScope, limit);
    return {
      items,
      total: items.length,
    };
  }

  async createReport(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    title?: string;
    description?: string;
    htmlContent?: string;
  }): Promise<AIControlCenterGeoVisibilityReportRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeAIControlCenterWorkspaceScope(payload.workspaceScope || "geo");
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const title = this.requireText(payload.title, "请填写报告标题", 160);
    const description = this.requireOptionalText(payload.description, 10_000);
    const htmlContent = this.requireHtmlContent(payload.htmlContent);
    const id = `ai_control_center_geo_visibility_report_${randomUUID()}`;

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        INSERT INTO "AIControlCenterGeoVisibilityReport" (
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "title",
          "description",
          "htmlContent",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${brandId},
          ${workspaceScope},
          ${createdByUserId},
          ${title},
          ${description},
          ${htmlContent},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      const stored = await this.findRecordById(brandId, workspaceScope, id);
      if (!stored) {
        throw new NotFoundException("GEO 可见度诊断报告创建后未找到记录");
      }
      return stored;
    }

    const now = new Date().toISOString();
    const stored: AIControlCenterGeoVisibilityReportStoredRecord = {
      id,
      brandId,
      workspaceScope,
      createdByUserId,
      title,
      description,
      htmlContent,
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackItems.unshift(stored);
    return stored;
  }

  async deleteReport(brandId: string, workspaceScope: string | undefined, reportId: string): Promise<AIControlCenterGeoVisibilityReportRecord> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeAIControlCenterWorkspaceScope(workspaceScope || "geo");
    const normalizedReportId = this.requireText(reportId, "缺少报告 ID");
    const existing = await this.findRecordById(normalizedBrandId, normalizedWorkspaceScope, normalizedReportId);
    if (!existing) {
      throw new NotFoundException("GEO 可见度诊断报告不存在或已删除");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "AIControlCenterGeoVisibilityReport"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${normalizedReportId}
      `;
      return existing;
    }

    const nextItems = this.fallbackItems.filter(
      (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope && item.id === normalizedReportId),
    );
    this.fallbackItems.length = 0;
    this.fallbackItems.push(...nextItems);
    return existing;
  }

  async getReportById(brandId: string, workspaceScope: string | undefined, reportId: string) {
    return this.findRecordById(brandId, workspaceScope, reportId);
  }

  private async listRecords(brandId: string, workspaceScope: string | undefined, limit?: number): Promise<AIControlCenterGeoVisibilityReportRecord[]> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeAIControlCenterWorkspaceScope(workspaceScope || "geo");
    const resolvedLimit = this.normalizeLimit(limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<AIControlCenterGeoVisibilityReportRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "title",
          "description",
          "htmlContent",
          "createdAt",
          "updatedAt"
        FROM "AIControlCenterGeoVisibilityReport"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
        ORDER BY "createdAt" DESC
        LIMIT ${resolvedLimit}
      `;
      return rows.map((item) => this.normalizeRow(item));
    }

    return this.fallbackItems
      .filter((item) => item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, resolvedLimit);
  }

  private async findRecordById(
    brandId: string,
    workspaceScope: string | undefined,
    reportId: string,
  ): Promise<AIControlCenterGeoVisibilityReportRecord | undefined> {
    const normalizedWorkspaceScope = normalizeAIControlCenterWorkspaceScope(workspaceScope || "geo");
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<AIControlCenterGeoVisibilityReportRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "title",
          "description",
          "htmlContent",
          "createdAt",
          "updatedAt"
        FROM "AIControlCenterGeoVisibilityReport"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${reportId}
        LIMIT 1
      `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find(
      (item) => item.brandId === brandId && item.workspaceScope === normalizedWorkspaceScope && item.id === reportId,
    );
  }

  private normalizeRow(row: AIControlCenterGeoVisibilityReportRow): AIControlCenterGeoVisibilityReportStoredRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeAIControlCenterWorkspaceScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      title: String(row.title || "").trim(),
      description: String(row.description || "").trim(),
      htmlContent: String(row.htmlContent || "").trim(),
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

  private requireOptionalText(value: string | undefined, maxLength = 10_000) {
    const normalized = String(value || "").trim();
    return normalized ? normalized.slice(0, maxLength) : "";
  }

  private requireHtmlContent(value: string | undefined) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new BadRequestException("请提供 htmlContent");
    }
    return normalized.slice(0, 2_000_000);
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
        CREATE TABLE IF NOT EXISTS "AIControlCenterGeoVisibilityReport" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT '',
          "description" TEXT NOT NULL DEFAULT '',
          "htmlContent" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.ensureTableColumns("AIControlCenterGeoVisibilityReport", [
        { name: "workspaceScope", definition: `TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'` },
        { name: "description", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "htmlContent", definition: "TEXT NOT NULL DEFAULT ''" },
      ]);
    } else {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AIControlCenterGeoVisibilityReport" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT '',
          "description" TEXT NOT NULL DEFAULT '',
          "htmlContent" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterGeoVisibilityReport"
        ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterGeoVisibilityReport"
        ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterGeoVisibilityReport"
        ADD COLUMN IF NOT EXISTS "htmlContent" TEXT NOT NULL DEFAULT ''
      `);
    }
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "AIControlCenterGeoVisibilityReport"
      SET "workspaceScope" = 'geo'
      WHERE COALESCE(NULLIF(TRIM("workspaceScope"), ''), '') = ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AIControlCenterGeoVisibilityReport_brand_scope_created_idx"
      ON "AIControlCenterGeoVisibilityReport" ("brandId", "workspaceScope", "createdAt" DESC)
    `);
  }
}
