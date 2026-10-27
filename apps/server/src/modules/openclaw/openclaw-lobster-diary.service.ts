import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DEFAULT_OPENCLAW_WORKSPACE_SCOPE,
  type AIControlCenterWorkspaceScope,
  normalizeAIControlCenterWorkspaceScope,
} from "./openclaw-workspace-scope";

type AIControlCenterLobsterDiaryRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  diaryDate: string;
  title: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type AIControlCenterLobsterDiaryStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  diaryDate: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterLobsterDiaryRecord = AIControlCenterLobsterDiaryStoredRecord;

export type AIControlCenterLobsterDiaryWorkspace = {
  items: AIControlCenterLobsterDiaryRecord[];
  total: number;
};

@Injectable()
export class AIControlCenterLobsterDiaryService {
  private bootstrapPromise: Promise<void> | null = null;

  private readonly fallbackItems: AIControlCenterLobsterDiaryStoredRecord[] = [];

  constructor(private readonly prismaService: PrismaService) {}

  async listWorkspace(brandId: string, workspaceScope?: string, limit?: number): Promise<AIControlCenterLobsterDiaryWorkspace> {
    const items = await this.listRecords(brandId, workspaceScope, limit);
    return {
      items,
      total: items.length,
    };
  }

  async createDiary(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    diaryDate?: string;
    title?: string;
    content?: string;
  }): Promise<AIControlCenterLobsterDiaryRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeAIControlCenterWorkspaceScope(payload.workspaceScope);
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const diaryDate = this.normalizeDiaryDate(payload.diaryDate);
    const title = this.requireText(payload.title, "请填写标题", 120);
    const content = this.requireText(payload.content, "请填写内容", 20_000);
    const id = `ai_control_center_lobster_diary_${randomUUID()}`;

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        INSERT INTO "AIControlCenterLobsterDiary" (
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "diaryDate",
          "title",
          "content",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${brandId},
          ${workspaceScope},
          ${createdByUserId},
          ${diaryDate},
          ${title},
          ${content},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      const stored = await this.findRecordById(brandId, workspaceScope, id);
      if (!stored) {
        throw new NotFoundException("龙虾日记创建后未找到记录");
      }
      return stored;
    }

    const now = new Date().toISOString();
    const stored: AIControlCenterLobsterDiaryStoredRecord = {
      id,
      brandId,
      workspaceScope,
      createdByUserId,
      diaryDate,
      title,
      content,
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackItems.unshift(stored);
    return stored;
  }

  async deleteDiary(brandId: string, workspaceScope: string | undefined, diaryId: string): Promise<AIControlCenterLobsterDiaryRecord> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeAIControlCenterWorkspaceScope(workspaceScope);
    const normalizedDiaryId = this.requireText(diaryId, "缺少日记 ID");
    const existing = await this.findRecordById(normalizedBrandId, normalizedWorkspaceScope, normalizedDiaryId);
    if (!existing) {
      throw new NotFoundException("龙虾日记不存在或已删除");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "AIControlCenterLobsterDiary"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${normalizedDiaryId}
      `;
      return existing;
    }

    const nextItems = this.fallbackItems.filter(
      (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope && item.id === normalizedDiaryId),
    );
    this.fallbackItems.length = 0;
    this.fallbackItems.push(...nextItems);
    return existing;
  }

  async updateDiary(payload: {
    brandId: string;
    workspaceScope?: string;
    diaryId: string;
    diaryDate?: string;
    title?: string;
    content?: string;
  }): Promise<AIControlCenterLobsterDiaryRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeAIControlCenterWorkspaceScope(payload.workspaceScope);
    const diaryId = this.requireText(payload.diaryId, "缺少日记 ID");
    const existing = await this.findRecordById(brandId, workspaceScope, diaryId);
    if (!existing) {
      throw new NotFoundException("龙虾日记不存在或已删除");
    }

    const diaryDate = this.normalizeDiaryDate(payload.diaryDate || existing.diaryDate);
    const title = this.requireText(payload.title ?? existing.title, "请填写标题", 120);
    const content = this.requireText(payload.content ?? existing.content, "请填写内容", 20_000);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        UPDATE "AIControlCenterLobsterDiary"
        SET "diaryDate" = ${diaryDate},
            "title" = ${title},
            "content" = ${content},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${workspaceScope}
          AND "id" = ${diaryId}
      `;
      const stored = await this.findRecordById(brandId, workspaceScope, diaryId);
      if (!stored) {
        throw new NotFoundException("龙虾日记更新后未找到记录");
      }
      return stored;
    }

    const index = this.fallbackItems.findIndex(
      (item) => item.brandId === brandId && item.workspaceScope === workspaceScope && item.id === diaryId,
    );
    if (index < 0) {
      throw new NotFoundException("龙虾日记不存在或已删除");
    }
    const updated: AIControlCenterLobsterDiaryStoredRecord = {
      ...this.fallbackItems[index],
      diaryDate,
      title,
      content,
      updatedAt: new Date().toISOString(),
    };
    this.fallbackItems.splice(index, 1, updated);
    return updated;
  }

  private async listRecords(
    brandId: string,
    workspaceScope: string | undefined,
    limit?: number,
  ): Promise<AIControlCenterLobsterDiaryRecord[]> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeAIControlCenterWorkspaceScope(workspaceScope);
    const resolvedLimit = this.normalizeLimit(limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<AIControlCenterLobsterDiaryRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "diaryDate",
          "title",
          "content",
          "createdAt",
          "updatedAt"
        FROM "AIControlCenterLobsterDiary"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
        ORDER BY "diaryDate" DESC, "createdAt" DESC
        LIMIT ${resolvedLimit}
      `;
      return rows.map((item) => this.normalizeRow(item));
    }

    return this.fallbackItems
      .filter((item) => item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope)
      .sort((left, right) => {
        if (left.diaryDate === right.diaryDate) {
          return right.createdAt.localeCompare(left.createdAt);
        }
        return right.diaryDate.localeCompare(left.diaryDate);
      })
      .slice(0, resolvedLimit);
  }

  private async findRecordById(
    brandId: string,
    workspaceScope: string | undefined,
    diaryId: string,
  ): Promise<AIControlCenterLobsterDiaryRecord | undefined> {
    const normalizedWorkspaceScope = normalizeAIControlCenterWorkspaceScope(workspaceScope);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<AIControlCenterLobsterDiaryRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "diaryDate",
          "title",
          "content",
          "createdAt",
          "updatedAt"
        FROM "AIControlCenterLobsterDiary"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${diaryId}
        LIMIT 1
      `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find(
      (item) => item.brandId === brandId && item.workspaceScope === normalizedWorkspaceScope && item.id === diaryId,
    );
  }

  private normalizeRow(row: AIControlCenterLobsterDiaryRow): AIControlCenterLobsterDiaryStoredRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeAIControlCenterWorkspaceScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      diaryDate: String(row.diaryDate || "").trim(),
      title: String(row.title || "").trim(),
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

  private normalizeDiaryDate(value?: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new BadRequestException("请填写日期");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new BadRequestException("日期格式必须为 YYYY-MM-DD");
    }
    return normalized;
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
        CREATE TABLE IF NOT EXISTS "AIControlCenterLobsterDiary" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "diaryDate" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT '',
          "content" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.ensureTableColumns("AIControlCenterLobsterDiary", [
        { name: "workspaceScope", definition: `TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'` },
      ]);
    } else {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AIControlCenterLobsterDiary" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "diaryDate" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT '',
          "content" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterLobsterDiary"
        ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      `);
    }
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "AIControlCenterLobsterDiary"
      SET "workspaceScope" = '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      WHERE "workspaceScope" IS NULL
         OR TRIM("workspaceScope") = ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AIControlCenterLobsterDiary_brand_date_idx"
      ON "AIControlCenterLobsterDiary" ("brandId", "diaryDate" DESC, "createdAt" DESC)
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AIControlCenterLobsterDiary_brand_scope_date_idx"
      ON "AIControlCenterLobsterDiary" ("brandId", "workspaceScope", "diaryDate" DESC, "createdAt" DESC)
    `);
  }
}
