import type { UserAccessFeatureKey } from "../../../../packages/shared/src/user-access";

export type AuthUser = {
  id: string;
  mobile: string;
  email: string;
  emailVerified: boolean;
  nickname: string;
  avatarUrl: string;
  status: "ACTIVE" | "DISABLED";
  membership: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  systemRole: "USER" | "SUPER_ADMIN" | "ADMIN_OPERATOR" | "FINANCE_OPERATOR" | "SUPPORT_OPERATOR";
  accessExpiresAt: string | null;
  allowedFeatureKeys: UserAccessFeatureKey[];
  hasFullFeatureAccess: boolean;
  pointsBalance: number;
};

export type AuthBrand = {
  id: string;
  brandName: string;
  industry: string;
  role: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  currentBrandId?: string;
  brands: AuthBrand[];
  user?: AuthUser;
};

const AUTH_SESSION_STORAGE_KEY = "ai-omni-auth-session";
const CURRENT_BRAND_CONTEXT_STORAGE_KEY = "ai-omni-current-brand-context";
let authGeneration = 0;
export function getAuthSessionGeneration() { return authGeneration; }
function principal(session?: Partial<AuthSession>) { return `${session?.user?.id || ""}:${session?.currentBrandId || ""}`; }
export function requireCurrentBrandId() {
  const id = getStoredCurrentBrandId();
  if (!id) throw new Error("请先登录并选择品牌");
  return id;
}
export const AUTH_SESSION_CHANGED_EVENT = "ai-omni-auth-session-changed";

export type StoredBrandContext = {
  id: string;
  brandName: string;
  industry: string;
  role: string;
};

function normalizeBrandIdFromSession(session?: Partial<AuthSession>, fallbackBrandId?: string) {
  const brands = Array.isArray(session?.brands) ? session?.brands : [];
  const normalizedCurrentBrandId = String(session?.currentBrandId || "").trim();
  if (normalizedCurrentBrandId && brands.some((item) => item.id === normalizedCurrentBrandId)) {
    return normalizedCurrentBrandId;
  }
  const normalizedFallbackBrandId = String(fallbackBrandId || "").trim();
  if (normalizedFallbackBrandId && brands.some((item) => item.id === normalizedFallbackBrandId)) {
    return normalizedFallbackBrandId;
  }
  return brands[0]?.id;
}

function emitAuthSessionChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGED_EVENT));
}

function resolveStoredBrandContextFromSession(session: AuthSession): StoredBrandContext | undefined {
  const preferredId = normalizeBrandIdFromSession(session);
  if (!preferredId) {
    return undefined;
  }
  const matched = session.brands?.find((item) => item.id === preferredId) || session.brands?.[0];
  return {
    id: preferredId,
    brandName: matched?.brandName || preferredId,
    industry: matched?.industry || "未填写",
    role: matched?.role || "OWNER",
  };
}

export function getStoredAuthSession(): AuthSession | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  // Claim legacy shared state once; other tabs must log in independently.
  if (!window.sessionStorage.getItem("ai-omni-session-migrated-v2")) {
    window.sessionStorage.setItem("ai-omni-session-migrated-v2", "1");
    const legacy = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY) && legacy) window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, legacy);
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(CURRENT_BRAND_CONTEXT_STORAGE_KEY);
  }
  const raw = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return undefined;
  }
}

export function setStoredAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedSession: AuthSession = {
    ...session,
    currentBrandId: normalizeBrandIdFromSession(session),
  };
  if (principal(getStoredAuthSession()) !== principal(normalizedSession)) authGeneration++;
  window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
  const currentBrand = resolveStoredBrandContextFromSession(normalizedSession);
  if (currentBrand) {
    window.sessionStorage.setItem(CURRENT_BRAND_CONTEXT_STORAGE_KEY, JSON.stringify(currentBrand));
  } else {
    window.sessionStorage.removeItem(CURRENT_BRAND_CONTEXT_STORAGE_KEY);
  }
  emitAuthSessionChanged();
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  authGeneration++;
  window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(CURRENT_BRAND_CONTEXT_STORAGE_KEY);
  emitAuthSessionChanged();
}

export function getStoredCurrentBrandContext(): StoredBrandContext | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const raw = window.sessionStorage.getItem(CURRENT_BRAND_CONTEXT_STORAGE_KEY);
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as StoredBrandContext;
  } catch {
    window.sessionStorage.removeItem(CURRENT_BRAND_CONTEXT_STORAGE_KEY);
    return undefined;
  }
}

export function setStoredCurrentBrandContext(context: StoredBrandContext) {
  if (typeof window === "undefined") {
    return;
  }
  const session = getStoredAuthSession();
  if (!session?.brands.some(b => b.id === context.id)) throw new Error("当前账号无权选择该品牌");
  setStoredAuthSession({ ...session, currentBrandId: context.id });
}

export function mergeStoredAuthSession(next: Partial<AuthSession>) {
  const current = getStoredAuthSession();
  if (!current) {
    return undefined;
  }

  const merged: AuthSession = {
    ...current,
    ...next,
    brands: next.brands ?? current.brands,
    accessToken: next.accessToken ?? current.accessToken,
    refreshToken: next.refreshToken ?? current.refreshToken,
    currentBrandId: next.currentBrandId ?? current.currentBrandId,
    user: next.user ?? current.user,
  };
  setStoredAuthSession(merged);
  return merged;
}

export function getStoredCurrentBrandId(fallbackBrandId?: string) {
  const session = getStoredAuthSession();
  const currentBrand = getStoredCurrentBrandContext();
  const normalizedFromSession = normalizeBrandIdFromSession(session, fallbackBrandId);
  if (normalizedFromSession) {
    return normalizedFromSession;
  }
  if (currentBrand?.id && session?.brands?.some((item) => item.id === currentBrand.id)) {
    return currentBrand.id;
  }
  return undefined;
}
