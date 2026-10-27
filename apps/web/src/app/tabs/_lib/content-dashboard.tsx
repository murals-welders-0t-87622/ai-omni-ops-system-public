"use client";

import { useDashboardData } from "../_data";
import { DashboardRenderer } from "../_lib/dashboard-renderer";

export default function ContentDashboard() {
  const { data, source, error } = useDashboardData("content-customer");
  return (
    <DashboardRenderer
      data={data}
      source={source}
      fetchError={error}
      theme="content"
      tabSlug="content-customer"
    />
  );
}
