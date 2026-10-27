"use client";

import { useDashboardData } from "../_data";
import { DashboardRenderer } from "../_lib/dashboard-renderer";

export default function GeoDashboard() {
  const { data, source, error } = useDashboardData("geo-customer");
  return (
    <DashboardRenderer
      data={data}
      source={source}
      fetchError={error}
      theme="geo"
      tabSlug="geo-customer"
    />
  );
}
