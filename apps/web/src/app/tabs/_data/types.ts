"use client";

import type { LucideIcon } from "lucide-react";

export interface DashboardKpiCard {
  label: string;
  value: string;
  delta: string;
  subline: string;
  progress: number;
  progressLabel: string;
  progressRight: string;
  gradient?: string;
  accent?: string;
  iconName: string;
  iconBg: string;
  iconTone: string;
}

export interface DashboardChannelProgress {
  name: string;
  tag: string;
  tagTone: string;
  summary: string;
  metrics: string;
  progress: number;
  accent: string;
}

export interface DashboardTimelineStage {
  index: number;
  title: string;
  meta: string;
  tone: "done" | "doing" | "pending";
}

export interface DashboardTaskRow {
  [key: string]: unknown;
  id: string;
  title?: string;
  platform?: string;
  platformTone?: string;
  platformCode?: string;
  stage?: string;
  status: string;
  statusTone: string;
  views?: string;
  likes?: string;
  date?: string;
  owner?: string;
  eta?: string;
  city?: string;
  store?: string;
  lead?: string;
  source?: string;
  tone?: string;
  score?: string;
  plan?: string;
  channel?: string;
  channelTone?: string;
  budget?: string;
  audience?: string;
  target?: string;
  name?: string;
  fans?: string;
  sku?: string;
  terms?: string;
  platforms?: { code: string; tone: string }[];
  published?: string;
}

export interface DashboardTopMaterial {
  name: string;
  reuse: string;
  tagLine: string;
  iconName: string;
  iconBg: string;
  iconTone: string;
  accent?: string;
  roi?: string;
}

export interface ContentSubTab {
  key: string;
  label: string;
  badge?: string;
  badgeTone?: string;
}

export interface ContentExpertChainStep {
  name: string;
  subline: string;
  detail: string;
  tone: "done" | "doing" | "pending";
}

export interface ContentExpertChain {
  title: string;
  steps: ContentExpertChainStep[];
  strategyNote?: string;
}

export interface DashboardData {
  tabSlug: string;
  tabTitle: string;
  breadcrumb: string;
  heroTitle: string;
  heroPillTone: string;
  heroPillLabel: string;
  heroAccentDot: string;
  ctaExportLabel: string;
  ctaActionLabel: string;
  ctaActionHref: string;
  ctaActionGradient: string;
  permissionBanner?: {
    tone: string;
    text: string;
  } | null;
  kpiCards: DashboardKpiCard[];
  channelSectionTitle: string;
  channelSectionAccent: string;
  channelProgress: DashboardChannelProgress[];
  timelineTitle: string;
  timelineAccent: string;
  timelineStages: DashboardTimelineStage[];
  taskSectionTitle: string;
  taskSectionAccent: string;
  taskSectionCtaLabel?: string;
  taskSectionCtaHref?: string;
  taskTable: {
    headers: string[];
    rows: DashboardTaskRow[];
  };
  topSectionTitle: string;
  topSectionAccent: string;
  topCtaLabel?: string;
  topCtaHref?: string;
  topMaterials: DashboardTopMaterial[];
  taskTableType:
    | "recentWorks"
    | "pipelineTasks"
    | "geoLeads"
    | "crossPosts"
    | "plans"
    | "partners";
  useContentCustomLayout?: boolean;
  contentPlatformTabs?: {
    key: string;
    label: string;
    hint: string;
    tone: string;
    active: boolean;
  }[];
  contentStageTabs?: {
    index: number;
    title: string;
    tone?: "done" | "doing" | "pending";
    active?: boolean;
  }[];
  contentTopCards?: {
    title: string;
    subtitle?: string;
    badge?: string;
    body: string;
    bulletList?: string[];
    footer?: string;
    accentColor?: string;
    iconName?: string;
  }[];
  contentCalendar?: {
    yearMonthLabel: string;
    days: { date: number; tone?: string; label?: string; week?: boolean }[];
  };
  contentTopicLibrary?: {
    title: string;
    subtitle: string;
    items: { tag: string; tone: string; title: string; hint: string }[];
  };
  contentCreationPanel?:
    | {
        projectTitle: string;
        rightStatus: string;
        subTabs: { key: string; label: string; hint?: string; accent?: string }[];
        activeSubTab: string;
        promptBlock: {
          title: string;
          caption: string;
          autoInjectTags: string[];
          startButton: string;
          notes: string[];
          footer: string;
        };
        generatedImages: {
          label: string;
          tone: string;
          placeholder?: "animal" | "sparkles" | "box" | "plus";
        }[];
        expertChain: {
          title: string;
          steps: { name: string; subline: string; detail: string; tone: "done" | "doing" | "pending" }[];
          strategyNote?: string;
        };
      }
    | null;
  contentSubTabsByPlatform?: Record<string, ContentSubTab[]>;
  contentExpertChain?: ContentExpertChain;
  useGeoCustomLayout?: boolean;
  geoRegionTabs?: {
    key: string;
    label: string;
    hint: string;
    tone: string;
    active: boolean;
  }[];
  geoStageTabs?: {
    index: number;
    title: string;
    tone?: "done" | "doing" | "pending";
    active?: boolean;
  }[];
  geoTopCards?: {
    title: string;
    subtitle?: string;
    badge?: string;
    body: string;
    bulletList?: string[];
    footer?: string;
    accentColor?: string;
    iconName?: string;
  }[];
  geoCoverageMap?: {
    title: string;
    subtitle: string;
    regions: { name: string; tone: string; count: string; delta: string; lead: string; progress: number }[];
  };
  geoFenceLibrary?: {
    title: string;
    subtitle: string;
    items: { tag: string; tone: string; title: string; hint: string }[];
  };
  geoLeadsPanel?: {
    projectTitle: string;
    rightStatus: string;
    subTabs: { key: string; label: string; hint?: string; accent?: string }[];
    activeSubTab: string;
    dispatchBlock: {
      title: string;
      caption: string;
      autoInjectTags: string[];
      startButton: string;
      notes: string[];
      footer: string;
    };
    nearbyStores: {
      label: string;
      tone: string;
      placeholder?: "animal" | "sparkles" | "box" | "plus";
    }[];
    salesChain: {
      title: string;
      steps: { name: string; subline: string; detail: string; tone: "done" | "doing" | "pending" }[];
      strategyNote?: string;
    };
  };
  useOmniCustomLayout?: boolean;
  omniPlatformTabs?: {
    key: string;
    label: string;
    hint: string;
    tone: string;
    active: boolean;
  }[];
  omniStageTabs?: {
    index: number;
    title: string;
    tone?: "done" | "doing" | "pending";
    active?: boolean;
  }[];
  omniTopCards?: {
    title: string;
    subtitle?: string;
    badge?: string;
    body: string;
    bulletList?: string[];
    footer?: string;
    accentColor?: string;
    iconName?: string;
  }[];
  omniDistributionCalendar?: {
    yearMonthLabel: string;
    days: { date: number; tone?: string; label?: string; week?: boolean }[];
  };
  omniViralLibrary?: {
    title: string;
    subtitle: string;
    items: { tag: string; tone: string; title: string; hint: string }[];
  };
  omniDispatchPanel?: {
    projectTitle: string;
    rightStatus: string;
    subTabs: { key: string; label: string; hint?: string; accent?: string }[];
    activeSubTab: string;
    publishBlock: {
      title: string;
      caption: string;
      autoInjectTags: string[];
      startButton: string;
      notes: string[];
      footer: string;
    };
    generatedAssets: {
      label: string;
      tone: string;
      placeholder?: "animal" | "sparkles" | "box" | "plus";
    }[];
    opsChain: {
      title: string;
      steps: { name: string; subline: string; detail: string; tone: "done" | "doing" | "pending" }[];
      strategyNote?: string;
    };
  };
  useTrafficCustomLayout?: boolean;
  trafficMediaTabs?: {
    key: string;
    label: string;
    hint: string;
    tone: string;
    active: boolean;
  }[];
  trafficStageTabs?: {
    index: number;
    title: string;
    tone?: "done" | "doing" | "pending";
    active?: boolean;
  }[];
  trafficTopCards?: {
    title: string;
    subtitle?: string;
    badge?: string;
    body: string;
    bulletList?: string[];
    footer?: string;
    accentColor?: string;
    iconName?: string;
  }[];
  trafficBudgetCalendar?: {
    yearMonthLabel: string;
    days: { date: number; tone?: string; label?: string; week?: boolean }[];
  };
  trafficCreativesLibrary?: {
    title: string;
    subtitle: string;
    items: { tag: string; tone: string; title: string; hint: string }[];
  };
  trafficCampaignPanel?: {
    projectTitle: string;
    rightStatus: string;
    subTabs: { key: string; label: string; hint?: string; accent?: string }[];
    activeSubTab: string;
    launchBlock: {
      title: string;
      caption: string;
      autoInjectTags: string[];
      startButton: string;
      notes: string[];
      footer: string;
    };
    plannedPlans: {
      label: string;
      tone: string;
      placeholder?: "animal" | "sparkles" | "box" | "plus";
    }[];
    adChain: {
      title: string;
      steps: { name: string; subline: string; detail: string; tone: "done" | "doing" | "pending" }[];
      strategyNote?: string;
    };
  };
  useDarenCustomLayout?: boolean;
  darenMatrixTabs?: {
    key: string;
    label: string;
    hint: string;
    tone: string;
    active: boolean;
  }[];
  darenStageTabs?: {
    index: number;
    title: string;
    tone?: "done" | "doing" | "pending";
    active?: boolean;
  }[];
  darenTopCards?: {
    title: string;
    subtitle?: string;
    badge?: string;
    body: string;
    bulletList?: string[];
    footer?: string;
    accentColor?: string;
    iconName?: string;
  }[];
  darenCollabFunnel?: {
    title: string;
    subtitle: string;
    tiers: { name: string; tone: string; count: string; delta: string; conversion: string; progress: number }[];
  };
  darenTalentLibrary?: {
    title: string;
    subtitle: string;
    items: { tag: string; tone: string; title: string; hint: string }[];
  };
  darenCollabPanel?: {
    projectTitle: string;
    rightStatus: string;
    subTabs: { key: string; label: string; hint?: string; accent?: string }[];
    activeSubTab: string;
    collabBlock: {
      title: string;
      caption: string;
      autoInjectTags: string[];
      startButton: string;
      notes: string[];
      footer: string;
    };
    collabTalents: {
      label: string;
      tone: string;
      placeholder?: "animal" | "sparkles" | "box" | "plus";
    }[];
    creatorChain: {
      title: string;
      steps: { name: string; subline: string; detail: string; tone: "done" | "doing" | "pending" }[];
      strategyNote?: string;
    };
  };
}

export interface DashboardApiResponse {
  ok: boolean;
  source: "sqlite" | "static";
  fetchedAt: string;
  tabSlug: string;
  data: DashboardData;
  error?: string;
}
