"use client";

import { useDashboardData } from "../_data";
import { DashboardRenderer } from "../_lib/dashboard-renderer";

export default function TrafficDashboard() {
  const { data, source, error } = useDashboardData("ad-traffic");
  return (
    <DashboardRenderer
      data={data}
      source={source}
      fetchError={error}
      theme="traffic"
      tabSlug="ad-traffic"
    />
  );
}
