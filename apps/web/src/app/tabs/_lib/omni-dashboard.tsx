"use client";

import { useDashboardData } from "../_data";
import { DashboardRenderer } from "../_lib/dashboard-renderer";

export default function OmniDashboard() {
  const { data, source, error } = useDashboardData("omni-channel");
  return (
    <DashboardRenderer
      data={data}
      source={source}
      fetchError={error}
      theme="omni"
      tabSlug="omni-channel"
    />
  );
}
