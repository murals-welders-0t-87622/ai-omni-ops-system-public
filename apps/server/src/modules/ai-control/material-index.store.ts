import { ConflictException, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { MaterialIndex, MaterialRef } from "./material-index.contract";

export class MaterialIndexStore {
  constructor(private readonly prisma: PrismaService) {}
  async list(brandId: string) {
    if (!await this.prisma.tableExists("MaterialArchiveRevision")) return [];
    const rows = await this.prisma.$queryRaw<any[]>`SELECT DISTINCT ON ("evidenceTable", "recordId") * FROM "MaterialArchiveRevision" WHERE "brandId"=${brandId} ORDER BY "evidenceTable", "recordId", "revision" DESC`;
    return rows.map(r => ({ ...r, data: JSON.parse(r.payloadJson) as MaterialIndex }));
  }
  async append(brandId: string, actorId: string, ref: MaterialRef, expectedRevision: number, next: (previous: MaterialIndex | undefined, tx: Prisma.TransactionClient) => MaterialIndex | Promise<MaterialIndex>, operation: string) {
    if (!await this.prisma.tableExists("MaterialArchiveRevision")) throw new ServiceUnavailableException("素材索引迁移尚未安装，未写入记录");
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new ConflictException("请重新读取当前素材版本");
    return this.prisma.$transaction(async tx => {
      // Serialize index updates within a brand so cross-record version edges cannot race into a cycle.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`material-index:${brandId}`}))::text`;
      const key = `${brandId}:${ref.table}:${ref.recordId}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
      const rows = await tx.$queryRaw<any[]>`SELECT * FROM "MaterialArchiveRevision" WHERE "brandId"=${brandId} AND "evidenceTable"=${ref.table} AND "recordId"=${ref.recordId} ORDER BY "revision" DESC LIMIT 1`;
      const previous = rows[0];
      if ((previous?.revision || 0) !== expectedRevision) throw new ConflictException("素材索引已变化，请刷新后再保存");
      const data = await next(previous ? JSON.parse(previous.payloadJson) : undefined, tx), revision = expectedRevision + 1, id = `mar_${randomUUID()}`;
      if (data.supersedes) {
        const latest = await tx.$queryRaw<any[]>`SELECT DISTINCT ON ("evidenceTable", "recordId") "evidenceTable", "recordId", "payloadJson" FROM "MaterialArchiveRevision" WHERE "brandId"=${brandId} ORDER BY "evidenceTable", "recordId", "revision" DESC`;
        const edges = new Map(latest.map(r => [`${r.evidenceTable}:${r.recordId}`, JSON.parse(r.payloadJson).supersedes]));
        const seen = new Set([`${ref.table}:${ref.recordId}`]); let edge: any = data.supersedes;
        while (edge) { const k = `${edge.table}:${edge.recordId}`; if (seen.has(k)) throw new ConflictException("版本关系不能成环，请刷新素材索引"); seen.add(k); edge = edges.get(k); }
      }
      await tx.$executeRaw`INSERT INTO "MaterialArchiveRevision" ("id","brandId","evidenceTable","recordId","revision","actorId","operation","payloadJson") VALUES (${id},${brandId},${ref.table},${ref.recordId},${revision},${actorId},${operation},${JSON.stringify(data)})`;
      return { revision, data };
    });
  }
}
