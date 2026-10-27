import type { DashboardData } from "./types";
/** Shared metadata contains navigation only, never a prior brand's cached operating figures. */
export function dashboardLayoutOnly(source: DashboardData): DashboardData {
  const layout = structuredClone(source);
  layout.kpiCards = layout.kpiCards.map(k=>({...k,value:"—",delta:"",subline:"在当前品牌工作区查看",progress:0,progressLabel:"",progressRight:""}));
  layout.channelProgress = []; layout.timelineStages = []; layout.taskTable.rows = []; layout.topMaterials = [];
  layout.contentCalendar = undefined; layout.contentTopicLibrary = undefined; layout.contentCreationPanel = undefined;
  layout.geoCoverageMap = undefined; layout.geoFenceLibrary = undefined; layout.geoLeadsPanel = undefined;
  layout.contentTopCards = []; layout.geoTopCards = []; layout.omniTopCards = []; layout.trafficTopCards = []; layout.darenTopCards = [];
  // Keep controls and method descriptions while removing sample executions and business records.
  const metadata = layout as unknown as Record<string, any>;
  for (const name of ["omniDistributionCalendar", "omniViralLibrary", "trafficBudgetCalendar", "trafficCreativesLibrary", "darenCollabFunnel", "darenTalentLibrary"]) metadata[name] = undefined;
  for (const name of ["omniDispatchPanel", "trafficCampaignPanel", "darenCollabPanel"]) {
    const panel = metadata[name];
    if (!panel) continue;
    panel.projectTitle = "当前品牌工作区"; panel.rightStatus = "尚无执行记录";
    for (const key of ["generatedAssets", "plannedPlans", "matchedCreators", "matchedTalents", "cooperationRows", "collabTalents"]) if (Array.isArray(panel[key])) panel[key] = [];
    for (const chain of [panel.opsChain, panel.adChain, panel.creatorChain]) for (const step of chain?.steps || []) step.tone = "pending";
  }
  return layout;
}
