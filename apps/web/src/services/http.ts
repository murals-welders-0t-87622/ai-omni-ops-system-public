import { getRuntimeMode } from "../lib/runtime-mode";
import { getAuthSessionGeneration, clearStoredAuthSession, getStoredAuthSession, getStoredCurrentBrandId, setStoredAuthSession, type AuthUser } from "./auth-session";

export const API_BASE_URL = resolveApiBaseUrl();

let refreshPromise: Promise<boolean> | undefined;
let localSingleUserResumePromise: Promise<boolean> | undefined;
const DEFAULT_LOCAL_USER_ID = "local_default_user";
const DEFAULT_LOCAL_BRAND_ID = "local_default_brand";
const DEFAULT_REQUEST_TIMEOUT_MS = 60 * 1000;
const COLLECTORS_REQUEST_TIMEOUT_MS = 90 * 1000;

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await performRequest(path, init);

  if (response.status === 401 && path !== "/auth/refresh" && await refreshAccessToken()) {
    const retried = await performRequest(path, init);
    return readJsonResponse<T>(retried);
  }

  if (response.status === 401 && path !== "/auth/local-single-user/resume" && await resumeLocalSingleUserSession()) {
    const retried = await performRequest(path, init);
    return readJsonResponse<T>(retried);
  }

  return readJsonResponse<T>(response);
}

export async function requestBlobByUrl(url: string, init?: RequestInit): Promise<{
  blob: Blob;
  fileName: string;
  contentType: string;
}> {
  const response = await performRequestUrl(url, init);

  if (response.status === 401 && await refreshAccessToken()) {
    const retried = await performRequestUrl(url, init);
    return readBlobResponse(retried, url);
  }

  return readBlobResponse(response, url);
}

async function performRequest(path: string, init?: RequestInit) {
  return performRequestUrl(resolveRequestUrl(path), init);
}

export async function authenticatedFetch(url: string, init?: RequestInit) { return performRequestUrl(url.startsWith("/api/") ? url : /^https?:/.test(url) ? url : resolveRequestUrl(url), init); }
async function performRequestUrl(url: string, init?: RequestInit) {
  const resolvedPathname = readPathname(url);
  let session = getStoredAuthSession();
  if (await shouldResumeLocalSingleUserSession(resolvedPathname, session)) {
    await resumeLocalSingleUserSession();
    session = getStoredAuthSession();
  }
  const headers = new Headers(init?.headers);
  const isAuthRoute = resolvedPathname.startsWith("/auth/");
  const isFormDataBody = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!headers.has("Content-Type") && !isFormDataBody) {
    headers.set("Content-Type", "application/json");
  }
  const webOrigin = typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:23001";
  const targetOrigin = new URL(url, webOrigin).origin;
  const trusted = targetOrigin === webOrigin || targetOrigin === new URL(API_BASE_URL, webOrigin).origin;
  if (!trusted) { headers.delete("Authorization"); headers.delete("x-brand-id"); }
  if (trusted && !headers.has("Authorization") && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  const normalizedBrandId = getStoredCurrentBrandId();
  if (trusted && !headers.has("x-brand-id") && normalizedBrandId) {
    headers.set("x-brand-id", normalizedBrandId);
  }
  if (typeof window !== "undefined" && !headers.has("x-app-path")) {
    headers.set("x-app-path", window.location.pathname || "/");
  }
  const runtimeMode = getRuntimeMode();
  if (runtimeMode === "local-single-user" && !headers.has("X-Lab-Force-Admin")) {
    headers.set("X-Lab-Force-Admin", "1");
  }

  const controller = new AbortController();
  const timeoutMs = resolvedPathname.startsWith("/collectors/")
    ? COLLECTORS_REQUEST_TIMEOUT_MS
    : DEFAULT_REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const generation = getAuthSessionGeneration();
    const response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
    if (generation !== getAuthSessionGeneration()) throw new Error("账号或品牌已切换，已忽略旧请求结果");
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`请求超时（>${Math.floor(timeoutMs / 1000)}s），请稍后重试`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessTokenOnce().finally(() => {
      refreshPromise = undefined;
    });
  }

  return refreshPromise;
}

async function resumeLocalSingleUserSession() {
  if (!localSingleUserResumePromise) {
    localSingleUserResumePromise = resumeLocalSingleUserSessionOnce().finally(() => {
      localSingleUserResumePromise = undefined;
    });
  }

  return localSingleUserResumePromise;
}

async function refreshAccessTokenOnce() {
  const session = getStoredAuthSession();
  const generation = getAuthSessionGeneration();
  if (!session?.refreshToken) {
    clearStoredAuthSession();
    return false;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: session.refreshToken,
    }),
    cache: "no-store",
  });

  if (generation !== getAuthSessionGeneration()) return false;
  if (!response.ok) {
    clearStoredAuthSession();
    return false;
  }

  const payload = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
    currentBrandId?: string;
    brands?: Array<{ id: string; brandName: string; industry: string; role: string }>;
    user?: AuthUser;
  };

  if (generation !== getAuthSessionGeneration()) return false;
  setStoredAuthSession({
    ...session,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    currentBrandId: payload.currentBrandId ?? session.currentBrandId,
    brands: payload.brands ?? session.brands,
    user: payload.user ?? session.user,
  });
  return true;
}

async function resumeLocalSingleUserSessionOnce() {
  if (getRuntimeMode() !== "local-single-user") {
    return false;
  }

  const response = await fetch(`${API_BASE_URL}/auth/local-single-user/resume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
    currentBrandId?: string;
    brands?: Array<{ id: string; brandName: string; industry: string; role: string }>;
    user?: AuthUser;
  };

  setStoredAuthSession({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    currentBrandId: payload.currentBrandId,
    brands: payload.brands ?? [],
    user: payload.user,
  });
  return true;
}

async function shouldResumeLocalSingleUserSession(
  resolvedPathname: string,
  session: ReturnType<typeof getStoredAuthSession>,
) {
  if (getRuntimeMode() !== "local-single-user") {
    return false;
  }
  if (resolvedPathname === "/auth/local-single-user/resume") {
    return false;
  }
  if (resolvedPathname.startsWith("/auth/")) {
    return false;
  }
  if (typeof window !== "undefined") {
    const currentPathname = window.location.pathname || "/";
    if (
      currentPathname.startsWith("/login")
      || currentPathname.startsWith("/register")
      || currentPathname.startsWith("/admin/login")
    ) {
      return false;
    }
  }
  if (!session?.accessToken || !session?.refreshToken) {
    return true;
  }
  if (session.user?.id === DEFAULT_LOCAL_USER_ID) {
    return true;
  }
  if (session.currentBrandId === DEFAULT_LOCAL_BRAND_ID) {
    return true;
  }
  return (session.brands || []).some((item) => item.id === DEFAULT_LOCAL_BRAND_ID);
}

async function readJsonResponse<T>(response: Response) {
  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function readBlobResponse(response: Response, fallbackUrl: string) {
  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `Request failed: ${response.status}`);
  }

  const blob = await response.blob();
  const contentType = response.headers.get("content-type") || blob.type || "application/octet-stream";
  const disposition = response.headers.get("content-disposition") || "";
  const fileName = extractFileNameFromDisposition(disposition) || extractFileNameFromUrl(fallbackUrl) || "media";

  return {
    blob,
    fileName,
    contentType,
  };
}

export function jsonRequest<T>(path: string, method: string, body: unknown) {
  return request<T>(path, {
    method,
    body: JSON.stringify(body),
  });
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        return payload.message.join("；");
      }
      if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message.trim();
      }
    }

    const text = await response.text();
    if (text.trim()) {
      const trimmed = text.trim();
      if (response.status === 413 || /Request Entity Too Large/i.test(trimmed)) {
        return "上传文件过大，已超过当前线上上传网关限制，请先压缩视频后重试。";
      }
      if (/<html[\s>]/i.test(trimmed) || /<body[\s>]/i.test(trimmed) || /502 Bad Gateway/i.test(trimmed)) {
        return "上游服务暂时不可用（502 Bad Gateway），请稍后重试";
      }
      return trimmed;
    }
  } catch {
    // Fall through to the generic status message.
  }

  return `Request failed: ${response.status}`;
}

function resolveApiBaseUrl() {
  if (typeof window !== "undefined" && getRuntimeMode() === "local-single-user") {
    return `${window.location.origin}/api`;
  }

  const configured = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }

  return "http://127.0.0.1:3011/api";
}

function resolveRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

function readPathname(url: string) {
  try {
    if (/^https?:\/\//i.test(url)) {
      return new URL(url).pathname;
    }
  } catch {
    return url;
  }

  return url;
}

function extractFileNameFromDisposition(disposition: string) {
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = disposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return "";
}

function extractFileNameFromUrl(url: string) {
  try {
    const target = new URL(url);
    const candidate = target.pathname.split("/").pop() || "";
    return candidate.trim();
  } catch {
    return "";
  }
}
