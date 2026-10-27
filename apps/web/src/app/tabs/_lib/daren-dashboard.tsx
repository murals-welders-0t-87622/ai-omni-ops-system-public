"use client";

import { useDashboardData } from "../_data";
import { DashboardRenderer } from "../_lib/dashboard-renderer";

export default function DarenDashboard() {
  const { data, source, error } = useDashboardData("daren-collab");
  return (
    <DashboardRenderer
      data={data}
      source={source}
      fetchError={error}
      theme="daren"
      tabSlug="daren-collab"
    />
  );
}
