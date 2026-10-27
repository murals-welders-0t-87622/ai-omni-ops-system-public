import { BRAND_DASHBOARD_DATA } from "./brand-data";
import { CONTENT_DASHBOARD_DATA } from "./content-data";
import { GEO_DASHBOARD_DATA } from "./geo-data";
import { OMNI_DASHBOARD_DATA } from "./omni-data";
import { TRAFFIC_DASHBOARD_DATA } from "./traffic-data";
import { DAREN_DASHBOARD_DATA } from "./daren-data";
import type { DashboardData } from "./types";

export type TabSlugKey =
  | "brand-control"
  | "content-customer"
  | "geo-customer"
  | "omni-channel"
  | "ad-traffic"
  | "daren-collab";

export const STATIC_DASHBOARD_DATA: Record<TabSlugKey, DashboardData> = {
  "brand-control": BRAND_DASHBOARD_DATA,
  "content-customer": CONTENT_DASHBOARD_DATA,
  "geo-customer": GEO_DASHBOARD_DATA,
  "omni-channel": OMNI_DASHBOARD_DATA,
  "ad-traffic": TRAFFIC_DASHBOARD_DATA,
  "daren-collab": DAREN_DASHBOARD_DATA,
};

export const VALID_TAB_SLUGS: TabSlugKey[] = [
  "brand-control",
  "content-customer",
  "geo-customer",
  "omni-channel",
  "ad-traffic",
  "daren-collab",
];

export function isValidTabSlug(slug: string): slug is TabSlugKey {
  return VALID_TAB_SLUGS.includes(slug as TabSlugKey);
}

export function getStaticDashboardData(slug: string): DashboardData {
  if (!isValidTabSlug(slug)) {
    return BRAND_DASHBOARD_DATA;
  }
  return STATIC_DASHBOARD_DATA[slug];
}

export * from "./types";
export * from "./dashboard-data-provider";
