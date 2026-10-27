import { NextRequest, NextResponse } from "next/server";

const EXACT_REDIRECTS: Array<{
  pattern: string;
  target: string;
  code: 301 | 302;
  note: string;
}> = [
  {
    pattern: "/",
    target: "/tabs/brand-control",
    code: 302,
    note: "R00 根路径默认首页 → 品牌总控 6 Tab 驾驶舱（A 层）",
  },
  // 注意：/ai-control 裸路径=B层9宫格首页入口，保留9宫格展示，不强制跳A层；用户从A层右上角"进入智控系统"按钮可正常进入B层
  {
    pattern: "/brand-growth",
    target: "/tabs/brand-growth",
    code: 301,
    note: "R01 原8工作台：品牌增长 → AI智控中心（后续Phase5升级为品牌总控）",
  },
  {
    pattern: "/douyin",
    target: "/tabs/content-customer?platform=douyin",
    code: 301,
    note: "R02 原8工作台：抖音 → 内容获客，统一进智控中心",
  },
  {
    pattern: "/xiaohongshu",
    target: "/tabs/content-customer?platform=xiaohongshu",
    code: 301,
    note: "R03 原8工作台：小红书 → 内容获客",
  },
  {
    pattern: "/wechat",
    target: "/tabs/content-customer?platform=wechat",
    code: 301,
    note: "R04 原8工作台：公众号 → 内容获客",
  },
  {
    pattern: "/geo",
    target: "/tabs/geo-customer",
    code: 301,
    note: "R05 原8工作台：GEO → GEO获客 → AI智控",
  },
  {
    pattern: "/all-network-growth",
    target: "/tabs/omni-channel",
    code: 301,
    note: "R06 原8工作台：全网增长 → 全网获客",
  },
  {
    pattern: "/paid-acquisition",
    target: "/tabs/ad-traffic",
    code: 301,
    note: "R07 原8工作台：投流 → 投流获客",
  },
  {
    pattern: "/creator-cooperation",
    target: "/tabs/daren-collab",
    code: 301,
    note: "R08 原8工作台：达人合作 → 达人合作板块",
  },
  {
    pattern: "/admin",
    target: "/ai-control/advanced?section=admin",
    code: 301,
    note: "R09 原Admin → 齿轮Tab 高级设置",
  },
  {
    pattern: "/more-features",
    target: "/ai-control/advanced?section=more-features",
    code: 301,
    note: "R10 原More Features → 齿轮Tab",
  },
  {
    pattern: "/personal/profile",
    target: "/ai-control/brand",
    code: 301,
    note: "R11 旧个人中心·资料 → 板块⑦品牌资产设置",
  },
  {
    pattern: "/personal/media-library",
    target: "/ai-control/assets",
    code: 301,
    note: "R12 旧个人中心·素材库 → 板块⑥统一素材管理",
  },
  {
    pattern: "/personal/works",
    target: "/ai-control/assets",
    code: 301,
    note: "R13 旧个人中心·作品 → 板块⑥作品归档",
  },
  {
    pattern: "/personal/tasks",
    target: "/personal-center/tasks",
    code: 301,
    note: "R14 旧个人中心·任务 → 板块⑤任务版本治理",
  },
  {
    pattern: "/personal/skills",
    target: "/ai-control/skills",
    code: 301,
    note: "R15 旧个人中心·技能 → 板块②技能与能力管理",
  },
  {
    pattern: "/personal/experts",
    target: "/ai-control/experts",
    code: 301,
    note: "R16 旧个人中心·专家 → 板块①专家团队管理",
  },
  {
    pattern: "/personal/prompts",
    target: "/ai-control/prompt-library",
    code: 301,
    note: "R17 旧个人中心·提示词 → 板块④提示词参考库",
  },
  {
    pattern: "/personal/settings",
    target: "/ai-control/advanced?section=settings",
    code: 301,
    note: "R18 旧个人中心·设置 → 齿轮Tab",
  },
  {
    pattern: "/personal/upgrade",
    target: "/ai-control/storage",
    code: 301,
    note: "R19 旧个人中心·升级 → 板块⑧存储与连接器（对应升级中心）",
  },
  {
    pattern: "/personal/help",
    target: "/ai-control/advanced?section=help-docs",
    code: 301,
    note: "R20 旧个人中心·帮助 → 齿轮Tab 帮助文档",
  },
  {
    pattern: "/team",
    target: "/ai-control/advanced?section=saas-team",
    code: 301,
    note: "R21 SAAS遗留：团队协作 → 齿轮兼容Tab",
  },
  {
    pattern: "/invite",
    target: "/ai-control/advanced?section=saas-invite",
    code: 301,
    note: "R22 SAAS遗留：高级·成员邀请（兼容） → 齿轮兼容Tab",
  },
  {
    pattern: "/billing",
    target: "/ai-control/advanced?section=saas-billing",
    code: 301,
    note: "R23 SAAS遗留：点数计费 → 齿轮兼容Tab",
  },
  {
    pattern: "/security",
    target: "/ai-control/advanced?section=security",
    code: 301,
    note: "R24 SAAS遗留：高级·账号与安全 → 齿轮兼容Tab",
  },
];

const PREFIX_REDIRECTS: Array<{
  prefix: string;
  toTarget: (rest: string, reqUrl: URL) => string;
  code: 301 | 302;
}> = [
  {
    prefix: "/more-features/",
    toTarget: (rest) => `/ai-control/advanced?section=more-features&rest=${encodeURIComponent(rest)}`,
    code: 301,
  },
  {
    prefix: "/personal-center/tasks",
    toTarget: () => "/ai-control/task-governance",
    code: 301,
  },
  {
    prefix: "/personal-center/works",
    toTarget: () => "/ai-control/assets",
    code: 301,
  },
  {
    prefix: "/personal-center/skills",
    toTarget: () => "/ai-control/skills",
    code: 301,
  },
  {
    prefix: "/personal-center/team",
    toTarget: () => "/ai-control/advanced?section=saas-team",
    code: 301,
  },
  {
    prefix: "/personal-center/invites",
    toTarget: () => "/ai-control/advanced?section=saas-invite",
    code: 301,
  },
  {
    prefix: "/personal-center/security",
    toTarget: () => "/ai-control/advanced?section=security",
    code: 301,
  },
  {
    prefix: "/personal-center/version",
    toTarget: () => "/ai-control/storage",
    code: 301,
  },
  {
    prefix: "/personal-center/orders",
    toTarget: () => "/ai-control/advanced?section=saas-billing",
    code: 301,
  },
  {
    prefix: "/personal-center/third-party-platforms",
    toTarget: () => "/brand-admin/apis",
    code: 301,
  },
  {
    prefix: "/personal-center/openclaw",
    toTarget: () => "/brand-admin/apis?tab=openclaw",
    code: 301,
  },
  {
    prefix: "/personal-center",
    toTarget: (rest, url) => {
      if (!rest) return "/tabs/brand-control";
      const qs = rest ? `?rest=${encodeURIComponent(rest)}` : url.search ? url.search : "";
      return `/ai-control/advanced${qs || "?section=migrated-personal-center"}`;
    },
    code: 302,
  },
  {
    prefix: "/personal/",
    toTarget: (rest) => `/ai-control/advanced?section=migrated-personal&rest=${encodeURIComponent(rest)}`,
    code: 302,
  },
  {
    prefix: "/membership-purchase",
    toTarget: () => "/ai-control/advanced?section=saas-billing",
    code: 301,
  },
  {
    prefix: "/points-purchase",
    toTarget: () => "/ai-control/advanced?section=saas-billing",
    code: 301,
  },
  {
    prefix: "/orders",
    toTarget: (rest) => `/ai-control/advanced?section=saas-billing&rest=${encodeURIComponent(rest)}`,
    code: 301,
  },
];

function mergeQuery(target: string, originalQs: string): string {
  if (!originalQs) return target;
  const sep = target.includes("?") ? "&" : "?";
  return `${target}${sep}${originalQs.replace(/^\?/, "")}`;
}

function resolvePublicOrigin(req: NextRequest, fallbackOrigin: string): string {
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return fallbackOrigin;
}

function prefixMatches(normalized: string, prefix: string): boolean {
  const cleanPrefix = prefix.replace(/\/+$/, "");
  if (cleanPrefix === "") return false;
  return normalized === cleanPrefix || normalized.startsWith(cleanPrefix + "/");
}

function prefixRest(normalized: string, prefix: string): string {
  const cleanPrefix = prefix.replace(/\/+$/, "");
  return normalized.slice(cleanPrefix.length).replace(/^\/+/, "");
}

export default function middleware(req: NextRequest): NextResponse {
  const { pathname, search, searchParams, origin } = req.nextUrl;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const publicOrigin = resolvePublicOrigin(req, origin);

  if (normalized === "/personal-center/tasks") return NextResponse.next();

  for (const rule of EXACT_REDIRECTS) {
    if (normalized === rule.pattern) {
      const target = mergeQuery(rule.target, search);
      return NextResponse.redirect(new URL(target, publicOrigin), rule.code);
    }
  }

  for (const rule of PREFIX_REDIRECTS) {
    if (prefixMatches(normalized, rule.prefix)) {
      const rest = prefixRest(normalized, rule.prefix);
      const targetBase = rule.toTarget(rest, req.nextUrl);
      const target = mergeQuery(targetBase, search);
      return NextResponse.redirect(new URL(target, publicOrigin), rule.code);
    }
  }

  const looksLikeLegacyDashboard =
    /^\/(brand-growth|douyin|xiaohongshu|wechat|geo|all-network-growth|paid-acquisition|creator-cooperation|more-features|admin|personal(-center)?|team|invite|billing|security|membership-purchase|points-purchase|orders|help)\b/.test(
      normalized,
    );
  if (looksLikeLegacyDashboard) {
    const target = mergeQuery(
      `/ai-control?section=fallback-personal-center&path=${encodeURIComponent(normalized)}`,
      search,
    );
    return NextResponse.redirect(new URL(target, publicOrigin), 302);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|_static|_vercel|static|public|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*|ai-control).*)",
  ],
};
