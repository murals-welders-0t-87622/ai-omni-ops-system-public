"use client";

import { useDashboardData } from "../_data";
import { DashboardRenderer } from "../_lib/dashboard-renderer";

export default function BrandDashboard() {
  const { data, source, error } = useDashboardData("brand-control");
  return (
    <DashboardRenderer
      data={data}
      source={source}
      fetchError={error}
      theme="brand"
      tabSlug="brand-control"
    />
  );
}
