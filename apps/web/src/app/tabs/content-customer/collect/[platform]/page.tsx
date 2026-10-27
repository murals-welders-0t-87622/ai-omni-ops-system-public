"use client";

import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type {
  DouyinCollectionCardKey,
  XiaohongshuCollectionCardKey,
} from "../../../../(dashboard)/brand-growth/collection-workspace";
import type { WechatMpSubCardKey } from "../../../../(dashboard)/brand-growth/wechat-mp-collection-workspace";

const BrandGrowthWorkspace = dynamic(
  () =>
    import("../../../../(dashboard)/brand-growth/workspace").then(
      (module) => module.BrandGrowthWorkspace,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-10 text-center text-[13px] text-slate-500 shadow-sm">
        正在加载采集工作区…
      </div>
    ),
  },
);

type PlatformKey = "douyin" | "xiaohongshu" | "wechat";
type CollectionPageKey =
  | "douyinCollection"
  | "xiaohongshuCollection"
  | "wechatMpCollection";

type BoardConfig = {
  key: string;
  label: string;
  hint: string;
  forcedCollectionPage: CollectionPageKey;
  forcedDouyinCollectionCard?: DouyinCollectionCardKey;
  forcedXhsCollectionCard?: XiaohongshuCollectionCardKey;
  forcedWechatCollectionCard?: WechatMpSubCardKey;
};

const PLATFORM_CONFIG: Record<
  PlatformKey,
  { label: string; boards: BoardConfig[] }
> = {
  douyin: {
    label: "抖音 / 视频号",
    boards: [
      {
        key: "brandAccounts",
        label: "品牌账号信息",
        hint: "品牌账号池与基础画像",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "brandAccount",
      },
      {
        key: "competitorAccounts",
        label: "竞品账号信息",
        hint: "竞品账号池与对标范围",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "competitorAccount",
      },
      {
        key: "brandWorks",
        label: "品牌作品信息",
        hint: "品牌作品与核心数据",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "brandWorks",
      },
      {
        key: "competitorWorks",
        label: "竞品作品信息",
        hint: "竞品作品列表与表现",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "competitorWorks",
      },
      {
        key: "benchmarkWorks",
        label: "对标作品信息",
        hint: "对标爆款与拆解对象",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "benchmarkWorks",
      },
      {
        key: "searchWorks",
        label: "搜索关键词",
        hint: "搜索结果与关联作品",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "searchWorks",
      },
      {
        key: "keywordRecommendations",
        label: "关键词推荐",
        hint: "推荐词与长尾词结果",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "keywordRecommendations",
      },
      {
        key: "commentData",
        label: "评论数据",
        hint: "评论抽取与用户反馈",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "commentData",
      },
      {
        key: "targetUsers",
        label: "目标用户",
        hint: "目标用户线索池",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "commentData",
      },
      {
        key: "lowFanExplosiveWorks",
        label: "低粉爆款榜",
        hint: "低粉高爆内容池",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "lowFanExplosiveWorks",
      },
      {
        key: "highCompletionRateWorks",
        label: "高完播率榜",
        hint: "高完播内容池",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "highCompletionRateWorks",
      },
      {
        key: "highLikeRateWorks",
        label: "高点赞率榜",
        hint: "高点赞内容池",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "highLikeRateWorks",
      },
      {
        key: "cityHotspots",
        label: "同城热点榜",
        hint: "热点句子与城市趋势",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "cityHotspots",
      },
      {
        key: "creatorSearchResults",
        label: "达人搜索",
        hint: "达人搜索结果池",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "creatorSearch",
      },
      {
        key: "creatorProfiles",
        label: "达人画像",
        hint: "深度画像与资料页",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "creatorResultPool",
      },
      {
        key: "creatorDeepFetchTasks",
        label: "达人深抓任务",
        hint: "深抓任务与处理状态",
        forcedCollectionPage: "douyinCollection",
        forcedDouyinCollectionCard: "creatorDeepFetch",
      },
    ],
  },
  xiaohongshu: {
    label: "小红书",
    boards: [
      {
        key: "brandAccounts",
        label: "品牌账号信息",
        hint: "品牌账号池与基础画像",
        forcedCollectionPage: "xiaohongshuCollection",
        forcedXhsCollectionCard: "brandAccount",
      },
      {
        key: "competitorAccounts",
        label: "竞品账号信息",
        hint: "竞品账号池与对标范围",
        forcedCollectionPage: "xiaohongshuCollection",
        forcedXhsCollectionCard: "competitorAccount",
      },
      {
        key: "brandNotes",
        label: "品牌作品信息",
        hint: "品牌笔记与核心数据",
        forcedCollectionPage: "xiaohongshuCollection",
        forcedXhsCollectionCard: "brandWorks",
      },
      {
        key: "benchmarkNotes",
        label: "对标作品信息",
        hint: "对标笔记与拆解对象",
        forcedCollectionPage: "xiaohongshuCollection",
        forcedXhsCollectionCard: "benchmarkWorks",
      },
      {
        key: "searchNotes",
        label: "搜索笔记",
        hint: "关键词搜索结果",
        forcedCollectionPage: "xiaohongshuCollection",
        forcedXhsCollectionCard: "searchNotes",
      },
      {
        key: "commentData",
        label: "评论数据",
        hint: "评论抽取与用户反馈",
        forcedCollectionPage: "xiaohongshuCollection",
        forcedXhsCollectionCard: "commentData",
      },
      {
        key: "targetUsers",
        label: "目标用户",
        hint: "目标用户线索池",
        forcedCollectionPage: "xiaohongshuCollection",
        forcedXhsCollectionCard: "commentData",
      },
    ],
  },
  wechat: {
    label: "公众号",
    boards: [
      {
        key: "brandAccounts",
        label: "品牌账号信息",
        hint: "公众号账号列表",
        forcedCollectionPage: "wechatMpCollection",
        forcedWechatCollectionCard: "brandAccountData",
      },
      {
        key: "articles",
        label: "品牌作品信息",
        hint: "品牌文章与阅读数据",
        forcedCollectionPage: "wechatMpCollection",
        forcedWechatCollectionCard: "brandAccountData",
      },
      {
        key: "benchmarkArticles",
        label: "对标作品信息",
        hint: "对标文章与表现数据",
        forcedCollectionPage: "wechatMpCollection",
        forcedWechatCollectionCard: "benchmarkWorks",
      },
      {
        key: "searchItems",
        label: "搜索结果",
        hint: "搜一搜结果与文章候选",
        forcedCollectionPage: "wechatMpCollection",
        forcedWechatCollectionCard: "wechatSearch",
      },
    ],
  },
};

function normalizePlatform(value: string | string[] | undefined): PlatformKey {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (
    normalized === "douyin" ||
    normalized === "xiaohongshu" ||
    normalized === "wechat"
  ) {
    return normalized;
  }
  return "douyin";
}

export default function ContentCollectPlatformPage() {
  const params = useParams<{ platform: string }>();
  const searchParams = useSearchParams();
  const platform = normalizePlatform(params?.platform);
  const platformConfig = PLATFORM_CONFIG[platform];
  const boardKey = searchParams.get("board") || platformConfig.boards[0]?.key || "";
  const currentBoard =
    platformConfig.boards.find((item) => item.key === boardKey) ||
    platformConfig.boards[0];
  const navigateTo = (href: string) => {
    window.location.assign(href);
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navigateTo("/tabs/content-customer")}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回内容获客
          </button>
          <div>
            <div className="text-[12px] text-slate-500">
              首页 · 内容获客 · 采集数据
            </div>
            <h1 className="mt-1 text-[24px] font-bold tracking-tight text-slate-900">
              {platformConfig.label} · 采集数据
            </h1>
            <p className="mt-2 text-[12.5px] text-slate-500">
              直接在下方工作区切换并操作真实采集功能。
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        {(["douyin", "xiaohongshu", "wechat"] as PlatformKey[]).map((item) => {
          const active = item === platform;
          return (
            <button
              type="button"
              key={item}
              onClick={() => navigateTo(`/tabs/content-customer/collect/${item}`)}
              className={`inline-flex items-center rounded-full px-4 py-2 text-[12.5px] font-medium ring-1 transition ${
                active
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {PLATFORM_CONFIG[item].label}
            </button>
          );
        })}
      </section>

      <BrandGrowthWorkspace
        embedded
        forcedCollectionPage={currentBoard.forcedCollectionPage}
        forcedDouyinCollectionCard={currentBoard.forcedDouyinCollectionCard}
        forcedXhsCollectionCard={currentBoard.forcedXhsCollectionCard}
        forcedWechatCollectionCard={currentBoard.forcedWechatCollectionCard}
      />
    </div>
  );
}
