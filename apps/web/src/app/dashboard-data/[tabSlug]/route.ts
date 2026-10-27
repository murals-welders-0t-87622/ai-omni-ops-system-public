import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import {
  getStaticDashboardData,
  isValidTabSlug,
  VALID_TAB_SLUGS,
} from "../../tabs/_data";
import type { DashboardData, DashboardApiResponse } from "../../tabs/_data";

const DB_DIR =
  process.env.DASHBOARD_DB_DIR ||
  path.join(process.cwd(), ".data", "dashboards");

function resolveDbPath(slug: string) {
  return path.join(DB_DIR, `${slug}.json`);
}

function ensureDir() {
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
}

function seedIfMissing(slug: string): DashboardData {
  ensureDir();
  const filePath = resolveDbPath(slug);
  const staticData = getStaticDashboardData(slug);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as DashboardData;
      if (parsed && parsed.tabSlug === slug) return parsed;
    }
  } catch {
    /* corrupted -> reseed */
  }
  try {
    fs.writeFileSync(filePath, JSON.stringify(staticData, null, 2), "utf-8");
  } catch {
    /* write permission issue -> fallback to in-memory static */
  }
  return staticData;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ tabSlug: string }> },
) {
  const params = await ctx.params;
  const slug = params.tabSlug;
  const fetchedAt = new Date().toISOString();

  if (!isValidTabSlug(slug)) {
    return NextResponse.json(
      {
        ok: false,
        source: "static",
        fetchedAt,
        tabSlug: slug,
        data: getStaticDashboardData("brand-control"),
        error: `invalid tabSlug: ${slug}; valid: ${VALID_TAB_SLUGS.join(",")}`,
      } satisfies DashboardApiResponse,
      { status: 400 },
    );
  }

  try {
    const data = seedIfMissing(slug);
    return NextResponse.json({
      ok: true,
      source: "sqlite",
      fetchedAt,
      tabSlug: slug,
      data,
    } satisfies DashboardApiResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      ok: true,
      source: "static",
      fetchedAt,
      tabSlug: slug,
      data: getStaticDashboardData(slug),
      error: msg,
    } satisfies DashboardApiResponse);
  }
}

export const dynamic = "force-dynamic";
