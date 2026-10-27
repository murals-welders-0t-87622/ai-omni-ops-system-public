import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DEFAULT_OPENCLAW_WORKSPACE_SCOPE,
  type AIControlCenterWorkspaceScope,
  normalizeAIControlCenterWorkspaceScope,
} from "./openclaw-workspace-scope";

type AIControlCenterPlatformLeadRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  name: string;
  businessScope: string;
  selectedReason: string;
  contactInfo: string;
  address: string;
  selectedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type AIControlCenterPlatformLeadStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  name: string;
  businessScope: string;
  selectedReason: string;
  contactInfo: string;
  address: string;
  selectedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterPlatformLeadRecord = AIControlCenterPlatformLeadStoredRecord;

export type AIControlCenterPlatformLeadWorkspace = {
  items: AIControlCenterPlatformLeadRecord[];
  total: number;
};

export type AIControlCenterPlatformLeadCreateResult = {
  items: AIControlCenterPlatformLeadRecord[];
  createdCount: number;
  updatedCount: number;
};

@Injectable()
export class AIControlCenterPlatformLeadService {
  private bootstrapPromise: Promise<void> | null = null;

  private readonly fallbackItems: AIControlCenterPlatformLeadStoredRecord[] = [];

  constructor(private readonly prismaService: PrismaService) {}

  async listWorkspace(params: {
    brandId: string;
    workspaceScope?: string;
    limit?: number;
  }): Promise<AIControlCenterPlatformLeadWorkspace> {
    const items = await this.listRecords(params);
    return {
      items,
      total: items.length,
    };
  }

  async createLeads(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    items: Array<{
      id?: string;
      name: string;
      businessScope: string;
      selectedReason: string;
      contactInfo: string;
      address: string;
      selectedAt?: string;
    }>;
  }): Promise<AIControlCenterPlatformLeadCreateResult> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeAIControlCenterWorkspaceScope(payload.workspaceScope || "all_network_growth");
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    if (!Array.isArray(payload.items) || !payload.items.length) {
      throw new BadRequestException("items 至少需要一条平台获客记录");
    }

    const result: AIControlCenterPlatformLeadCreateResult = {
      items: [],
      createdCount: 0,
      updatedCount: 0,
    };

    for (const item of payload.items) {
      const upserted = await this.upsertLead({
        brandId,
        workspaceScope,
        createdByUserId,
        id: item.id,
        name: item.name,
        businessScope: item.businessScope,
        selectedReason: item.selectedReason,
        contactInfo: item.contactInfo,
        address: item.address,
        selectedAt: item.selectedAt,
      });
      result.items.push(upserted.item);
      if (upserted.created) {
        result.createdCount += 1;
      } else {
        result.updatedCount += 1;
      }
    }

    return result;
  }

  async deleteLead(brandId: string, workspaceScope: string | undefined, leadId: string) {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeAIControlCenterWorkspaceScope(workspaceScope || "all_network_growth");
    const normalizedLeadId = this.requireText(leadId, "缺少平台获客 ID");
    const existing = await this.findById(normalizedBrandId, normalizedWorkspaceScope, normalizedLeadId);
    if (!existing) {
      throw new NotFoundException("平台获客记录不存在或已删除");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "AIControlCenterPlatformLead"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${normalizedLeadId}
      `;
      return existing;
    }

    const nextItems = this.fallbackItems.filter(
      (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope && item.id === normalizedLeadId),
    );
    this.fallbackItems.length = 0;
    this.fallbackItems.push(...nextItems);
    return existing;
  }

  private async upsertLead(payload: {
    brandId: string;
    workspaceScope: AIControlCenterWorkspaceScope;
    createdByUserId: string;
    id?: string;
    name: string;
    businessScope: string;
    selectedReason: string;
    contactInfo: string;
    address: string;
    selectedAt?: string;
  }) {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeAIControlCenterWorkspaceScope(payload.workspaceScope);
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const id = this.normalizeOptionalText(payload.id, 120);
    const name = this.requireText(payload.name, "缺少名称", 200);
    const businessScope = this.requireText(payload.businessScope, "缺少业务范围", 2000);
    const selectedReason = this.requireText(payload.selectedReason, "缺少入选理由", 2000);
    const contactInfo = this.requireText(payload.contactInfo, "缺少联系方式", 500);
    const address = this.requireText(payload.address, "缺少地址", 500);
    const selectedAt = this.normalizeDateInput(payload.selectedAt);

    const existing = await this.findExistingLead({
      brandId,
      workspaceScope,
      id,
      name,
      contactInfo,
      address,
    });

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      if (existing) {
        await this.prismaService.$executeRaw`
          UPDATE "AIControlCenterPlatformLead"
          SET "createdByUserId" = ${createdByUserId},
              "name" = ${name},
              "businessScope" = ${businessScope},
              "selectedReason" = ${selectedReason},
              "contactInfo" = ${contactInfo},
              "address" = ${address},
              "selectedAt" = ${new Date(selectedAt)},
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${existing.id}
        `;
        const updated = await this.findById(brandId, workspaceScope, existing.id);
        if (!updated) {
          throw new NotFoundException("平台获客记录更新后未找到");
        }
        return { item: updated, created: false };
      }

      const nextId = id || `ai_control_center_platform_lead_${randomUUID()}`;
      await this.prismaService.$executeRaw`
        INSERT INTO "AIControlCenterPlatformLead" (
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "name",
          "businessScope",
          "selectedReason",
          "contactInfo",
          "address",
          "selectedAt",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${nextId},
          ${brandId},
          ${workspaceScope},
          ${createdByUserId},
          ${name},
          ${businessScope},
          ${selectedReason},
          ${contactInfo},
          ${address},
          ${new Date(selectedAt)},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      const created = await this.findById(brandId, workspaceScope, nextId);
      if (!created) {
        throw new NotFoundException("平台获客记录创建后未找到");
      }
      return { item: created, created: true };
    }

    const now = new Date().toISOString();
    if (existing) {
      const updated: AIControlCenterPlatformLeadStoredRecord = {
        ...existing,
        createdByUserId,
        name,
        businessScope,
        selectedReason,
        contactInfo,
        address,
        selectedAt,
        updatedAt: now,
      };
      const index = this.fallbackItems.findIndex((item) => item.id === existing.id);
      if (index >= 0) {
        this.fallbackItems[index] = updated;
      }
      return { item: updated, created: false };
    }

    const created: AIControlCenterPlatformLeadStoredRecord = {
      id: id || `ai_control_center_platform_lead_${randomUUID()}`,
      brandId,
      workspaceScope,
      createdByUserId,
      name,
      businessScope,
      selectedReason,
      contactInfo,
      address,
      selectedAt,
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackItems.unshift(created);
    return { item: created, created: true };
  }

  private async listRecords(params: {
    brandId: string;
    workspaceScope?: string;
    limit?: number;
  }) {
    const brandId = this.requireText(params.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeAIControlCenterWorkspaceScope(params.workspaceScope || "all_network_growth");
    const limit = this.normalizeLimit(params.limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<AIControlCenterPlatformLeadRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "name",
          "businessScope",
          "selectedReason",
          "contactInfo",
          "address",
          "selectedAt",
          "createdAt",
          "updatedAt"
        FROM "AIControlCenterPlatformLead"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${workspaceScope}
        ORDER BY "selectedAt" DESC, "createdAt" DESC
        LIMIT ${limit}
      `;
      return rows.map((row) => this.normalizeRow(row));
    }

    return this.fallbackItems
      .filter((item) => item.brandId === brandId && item.workspaceScope === workspaceScope)
      .sort((left, right) => right.selectedAt.localeCompare(left.selectedAt))
      .slice(0, limit);
  }

  private async findById(brandId: string, workspaceScope: AIControlCenterWorkspaceScope, leadId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<AIControlCenterPlatformLeadRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "name",
          "businessScope",
          "selectedReason",
          "contactInfo",
          "address",
          "selectedAt",
          "createdAt",
          "updatedAt"
        FROM "AIControlCenterPlatformLead"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${workspaceScope}
          AND "id" = ${leadId}
        LIMIT 1
      `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find(
      (item) => item.brandId === brandId && item.workspaceScope === workspaceScope && item.id === leadId,
    );
  }

  private async findExistingLead(params: {
    brandId: string;
    workspaceScope: AIControlCenterWorkspaceScope;
    id?: string;
    name: string;
    contactInfo: string;
    address: string;
  }) {
    const id = this.normalizeOptionalText(params.id, 120);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = id
        ? await this.prismaService.$queryRaw<AIControlCenterPlatformLeadRow[]>`
          SELECT
            "id",
            "brandId",
            "workspaceScope",
            "createdByUserId",
            "name",
            "businessScope",
            "selectedReason",
            "contactInfo",
            "address",
            "selectedAt",
            "createdAt",
            "updatedAt"
          FROM "AIControlCenterPlatformLead"
          WHERE "brandId" = ${params.brandId}
            AND "workspaceScope" = ${params.workspaceScope}
            AND "id" = ${id}
          LIMIT 1
        `
        : await this.prismaService.$queryRaw<AIControlCenterPlatformLeadRow[]>`
          SELECT
            "id",
            "brandId",
            "workspaceScope",
            "createdByUserId",
            "name",
            "businessScope",
            "selectedReason",
            "contactInfo",
            "address",
            "selectedAt",
            "createdAt",
            "updatedAt"
          FROM "AIControlCenterPlatformLead"
          WHERE "brandId" = ${params.brandId}
            AND "workspaceScope" = ${params.workspaceScope}
            AND "name" = ${params.name}
            AND "contactInfo" = ${params.contactInfo}
            AND "address" = ${params.address}
          LIMIT 1
        `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find((item) => {
      if (item.brandId !== params.brandId || item.workspaceScope !== params.workspaceScope) {
        return false;
      }
      if (id) {
        return item.id === id;
      }
      return item.name === params.name && item.contactInfo === params.contactInfo && item.address === params.address;
    });
  }

  private normalizeRow(row: AIControlCenterPlatformLeadRow): AIControlCenterPlatformLeadStoredRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeAIControlCenterWorkspaceScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      name: String(row.name || "").trim(),
      businessScope: String(row.businessScope || "").trim(),
      selectedReason: String(row.selectedReason || "").trim(),
      contactInfo: String(row.contactInfo || "").trim(),
      address: String(row.address || "").trim(),
      selectedAt: this.normalizeDate(row.selectedAt),
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

  private normalizeDateInput(value?: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return new Date().toISOString();
    }
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("selectedAt 不是合法时间");
    }
    return date.toISOString();
  }

  private requireText(value: string | undefined, message: string, maxLength = 200) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }
    return normalized.slice(0, maxLength);
  }

  private normalizeOptionalText(value: string | undefined, maxLength = 200) {
    const normalized = String(value || "").trim();
    return normalized ? normalized.slice(0, maxLength) : "";
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
        CREATE TABLE IF NOT EXISTS "AIControlCenterPlatformLead" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "name" TEXT NOT NULL DEFAULT '',
          "businessScope" TEXT NOT NULL DEFAULT '',
          "selectedReason" TEXT NOT NULL DEFAULT '',
          "contactInfo" TEXT NOT NULL DEFAULT '',
          "address" TEXT NOT NULL DEFAULT '',
          "selectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.ensureTableColumns("AIControlCenterPlatformLead", [
        { name: "workspaceScope", definition: `TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'` },
        { name: "createdByUserId", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "name", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "businessScope", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "selectedReason", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "contactInfo", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "address", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "selectedAt", definition: "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP" },
      ]);
    } else {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AIControlCenterPlatformLead" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "name" TEXT NOT NULL DEFAULT '',
          "businessScope" TEXT NOT NULL DEFAULT '',
          "selectedReason" TEXT NOT NULL DEFAULT '',
          "contactInfo" TEXT NOT NULL DEFAULT '',
          "address" TEXT NOT NULL DEFAULT '',
          "selectedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterPlatformLead"
        ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterPlatformLead"
        ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterPlatformLead"
        ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterPlatformLead"
        ADD COLUMN IF NOT EXISTS "businessScope" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterPlatformLead"
        ADD COLUMN IF NOT EXISTS "selectedReason" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterPlatformLead"
        ADD COLUMN IF NOT EXISTS "contactInfo" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterPlatformLead"
        ADD COLUMN IF NOT EXISTS "address" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterPlatformLead"
        ADD COLUMN IF NOT EXISTS "selectedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);
    }
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AIControlCenterPlatformLead_brand_scope_selected_idx"
      ON "AIControlCenterPlatformLead" ("brandId", "workspaceScope", "selectedAt" DESC)
    `);
  }
}
