import { NextResponse } from "next/server";
import { dashboardLayoutOnly } from "../../../tabs/_data/layout-only";
import {
  getStaticDashboardData,
  isValidTabSlug,
  VALID_TAB_SLUGS,
} from "../../../tabs/_data";
import type { DashboardData, DashboardApiResponse } from "../../../tabs/_data";

function seedIfMissing(slug: string): DashboardData {
  return dashboardLayoutOnly(getStaticDashboardData(slug));
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
        data: dashboardLayoutOnly(getStaticDashboardData("brand-control")),
        error: `invalid tabSlug: ${slug}; valid: ${VALID_TAB_SLUGS.join(",")}`,
      } satisfies DashboardApiResponse,
      { status: 400 },
    );
  }

  try {
    const data = seedIfMissing(slug);
    return NextResponse.json({
      ok: true,
      source: "static",
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
      data: dashboardLayoutOnly(getStaticDashboardData(slug)),
      error: msg,
    } satisfies DashboardApiResponse);
  }
}

export const dynamic = "force-dynamic";
