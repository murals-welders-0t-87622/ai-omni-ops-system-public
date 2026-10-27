import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DEFAULT_OPENCLAW_WORKSPACE_SCOPE,
  type AIControlCenterWorkspaceScope,
  normalizeAIControlCenterWorkspaceScope,
} from "./openclaw-workspace-scope";

type AIControlCenterDailyPlanRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  planDate: string;
  title: string;
  content: string;
  htmlContent: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type AIControlCenterDailyPlanStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: AIControlCenterWorkspaceScope;
  createdByUserId: string;
  planDate: string;
  title: string;
  content: string;
  htmlContent: string;
  createdAt: string;
  updatedAt: string;
};

export type AIControlCenterDailyPlanRecord = AIControlCenterDailyPlanStoredRecord;

export type AIControlCenterDailyPlanWorkspace = {
  items: AIControlCenterDailyPlanRecord[];
  total: number;
};

const AUTO_BACKFILLED_PLAN_TITLE_PREFIX = "自动回填｜";

@Injectable()
export class AIControlCenterDailyPlanService {
  private bootstrapPromise: Promise<void> | null = null;

  private readonly fallbackItems: AIControlCenterDailyPlanStoredRecord[] = [];

  constructor(private readonly prismaService: PrismaService) {}

  async listWorkspace(brandId: string, workspaceScope?: string, limit?: number): Promise<AIControlCenterDailyPlanWorkspace> {
    const items = await this.listRecords(brandId, workspaceScope, limit);
    return {
      items,
      total: items.length,
    };
  }

  async createPlan(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    planDate?: string;
    title?: string;
    content?: string;
    htmlContent?: string;
  }): Promise<AIControlCenterDailyPlanRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeAIControlCenterWorkspaceScope(payload.workspaceScope);
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const planDate = this.normalizePlanDate(payload.planDate);
    const title = this.requireText(payload.title, "请填写标题", 120);
    const rawContent = this.requireOptionalText(payload.content, 20_000);
    const rawHtmlContent = this.requireOptionalText(payload.htmlContent, 500_000);
    if (!rawContent && !rawHtmlContent) {
      throw new BadRequestException("请填写内容或 HTML 正文");
    }
    const content = rawContent || this.buildPlainTextSummaryFromHtml(rawHtmlContent);
    const htmlContent = rawHtmlContent || this.buildFallbackHtmlContent({ title, planDate, content });
    const id = `ai_control_center_daily_plan_${randomUUID()}`;

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        INSERT INTO "AIControlCenterDailyPlan" (
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "planDate",
          "title",
          "content",
          "htmlContent",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${brandId},
          ${workspaceScope},
          ${createdByUserId},
          ${planDate},
          ${title},
          ${content},
          ${htmlContent},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      const stored = await this.findRecordById(brandId, workspaceScope, id);
      if (!stored) {
        throw new NotFoundException("每日计划创建后未找到记录");
      }
      return stored;
    }

    const now = new Date().toISOString();
    const stored: AIControlCenterDailyPlanStoredRecord = {
      id,
      brandId,
      workspaceScope,
      createdByUserId,
      planDate,
      title,
      content,
      htmlContent,
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackItems.unshift(stored);
    return stored;
  }

  async deletePlan(brandId: string, workspaceScope: string | undefined, planId: string): Promise<AIControlCenterDailyPlanRecord> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeAIControlCenterWorkspaceScope(workspaceScope);
    const normalizedPlanId = this.requireText(planId, "缺少计划 ID");
    const existing = await this.findRecordById(normalizedBrandId, normalizedWorkspaceScope, normalizedPlanId);
    if (!existing) {
      throw new NotFoundException("每日计划不存在或已删除");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "AIControlCenterDailyPlan"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${normalizedPlanId}
      `;
      return existing;
    }

    const nextItems = this.fallbackItems.filter(
      (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope && item.id === normalizedPlanId),
    );
    this.fallbackItems.length = 0;
    this.fallbackItems.push(...nextItems);
    return existing;
  }

  private async listRecords(brandId: string, workspaceScope: string | undefined, limit?: number): Promise<AIControlCenterDailyPlanRecord[]> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeAIControlCenterWorkspaceScope(workspaceScope);
    const resolvedLimit = this.normalizeLimit(limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<AIControlCenterDailyPlanRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "planDate",
          "title",
          "content",
          "htmlContent",
          "createdAt",
          "updatedAt"
        FROM "AIControlCenterDailyPlan"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
        ORDER BY "planDate" DESC, "createdAt" DESC
        LIMIT ${resolvedLimit}
      `;
      return rows.map((item) => this.normalizeRow(item)).filter((item) => this.isVisiblePlanRecord(item));
    }

    return this.fallbackItems
      .filter((item) => item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope)
      .filter((item) => this.isVisiblePlanRecord(item))
      .sort((left, right) => {
        if (left.planDate === right.planDate) {
          return right.createdAt.localeCompare(left.createdAt);
        }
        return right.planDate.localeCompare(left.planDate);
      })
      .slice(0, resolvedLimit);
  }

  private async findRecordById(
    brandId: string,
    workspaceScope: string | undefined,
    planId: string,
  ): Promise<AIControlCenterDailyPlanRecord | undefined> {
    const normalizedWorkspaceScope = normalizeAIControlCenterWorkspaceScope(workspaceScope);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<AIControlCenterDailyPlanRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "planDate",
          "title",
          "content",
          "htmlContent",
          "createdAt",
          "updatedAt"
        FROM "AIControlCenterDailyPlan"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${planId}
        LIMIT 1
      `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find(
      (item) => item.brandId === brandId && item.workspaceScope === normalizedWorkspaceScope && item.id === planId,
    );
  }

  private normalizeRow(row: AIControlCenterDailyPlanRow): AIControlCenterDailyPlanStoredRecord {
    const title = String(row.title || "").trim();
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeAIControlCenterWorkspaceScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      planDate: String(row.planDate || "").trim(),
      title: title.startsWith(AUTO_BACKFILLED_PLAN_TITLE_PREFIX)
        ? title.slice(AUTO_BACKFILLED_PLAN_TITLE_PREFIX.length).trim() || title
        : title,
      content: String(row.content || "").trim(),
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

  private requireOptionalText(value: string | undefined, maxLength = 20_000) {
    const normalized = String(value || "").trim();
    return normalized ? normalized.slice(0, maxLength) : "";
  }

  private buildPlainTextSummaryFromHtml(html: string) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20_000);
  }

  private buildFallbackHtmlContent(payload: { title: string; planDate: string; content: string }) {
    const escapedTitle = this.escapeHtml(payload.title);
    const escapedPlanDate = this.escapeHtml(payload.planDate);
    const escapedParagraphs = payload.content
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${this.escapeHtml(line)}</p>`)
      .join("");
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapedTitle}</title><style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:32px;}main{max-width:880px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:32px;box-shadow:0 10px 30px rgba(15,23,42,.08);}h1{margin:0 0 8px;font-size:28px;}p.meta{margin:0 0 24px;color:#64748b;font-size:14px;}section{display:grid;gap:14px;}p{margin:0;line-height:1.8;white-space:pre-wrap;word-break:break-word;}</style></head><body><main><h1>${escapedTitle}</h1><p class="meta">计划日期：${escapedPlanDate}</p><section>${escapedParagraphs || "<p>暂无正文</p>"}</section></main></body></html>`;
  }

  private escapeHtml(value: string) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private isVisiblePlanRecord(item: AIControlCenterDailyPlanStoredRecord) {
    return Boolean(item.title || item.content || item.htmlContent);
  }

  private normalizePlanDate(value?: string) {
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
        CREATE TABLE IF NOT EXISTS "AIControlCenterDailyPlan" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "planDate" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT '',
          "content" TEXT NOT NULL DEFAULT '',
          "htmlContent" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.ensureTableColumns("AIControlCenterDailyPlan", [
        { name: "workspaceScope", definition: `TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'` },
        { name: "htmlContent", definition: "TEXT NOT NULL DEFAULT ''" },
      ]);
    } else {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AIControlCenterDailyPlan" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "planDate" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT '',
          "content" TEXT NOT NULL DEFAULT '',
          "htmlContent" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterDailyPlan"
        ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "AIControlCenterDailyPlan"
        ADD COLUMN IF NOT EXISTS "htmlContent" TEXT NOT NULL DEFAULT ''
      `);
    }
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "AIControlCenterDailyPlan"
      SET "workspaceScope" = '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      WHERE "workspaceScope" IS NULL
         OR TRIM("workspaceScope") = ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "AIControlCenterDailyPlan"
      SET "htmlContent" = CASE
        WHEN COALESCE(NULLIF(TRIM("htmlContent"), ''), '') <> '' THEN "htmlContent"
        WHEN COALESCE(NULLIF(TRIM("content"), ''), '') = '' THEN ''
        ELSE '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>' || "title" || '</title></head><body><main><h1>' || "title" || '</h1><p>计划日期：' || "planDate" || '</p><pre>' || "content" || '</pre></main></body></html>'
      END
      WHERE COALESCE(NULLIF(TRIM("htmlContent"), ''), '') = ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AIControlCenterDailyPlan_brand_date_idx"
      ON "AIControlCenterDailyPlan" ("brandId", "planDate" DESC, "createdAt" DESC)
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AIControlCenterDailyPlan_brand_scope_date_idx"
      ON "AIControlCenterDailyPlan" ("brandId", "workspaceScope", "planDate" DESC, "createdAt" DESC)
    `);
  }
}
