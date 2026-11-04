/** Soft retirement removes new configuration/execution choices without deleting
 * old receipts, provider records or encrypted brand credentials. Do not add
 * these IDs/hosts to the destructive DECOMMISSIONED cleanup sets. */
export const RETIRED_PLATFORM_IDS = new Set(['platform_https_xjjuhe_site']);
export const RETIRED_API_PROVIDER_IDS = new Set([
  'provider_runtime_text_xjjuhe',
  'provider_runtime_image_xjjuhe',
  'provider_runtime_video_xjjuhe',
]);

export function isRetiredPlatformBaseUrl(value: unknown) {
  if (typeof value !== 'string') return false;
  try {
    const host = new URL(value.trim()).hostname.toLowerCase();
    return host === 'xjjuhe.site' || host.endsWith('.xjjuhe.site');
  } catch { return false; }
}

export function isRetiredPlatform(value: { id?: string; baseUrl?: string }) {
  return RETIRED_PLATFORM_IDS.has(value.id || '') || isRetiredPlatformBaseUrl(value.baseUrl);
}

export function isRetiredApiProvider(value: { id?: string; baseUrl?: string; extraParams?: Record<string, unknown> }) {
  const bases = value.extraParams?.baseUrls;
  const platforms = value.extraParams?.platformBaseUrls;
  return RETIRED_API_PROVIDER_IDS.has(value.id || '') || isRetiredPlatformBaseUrl(value.baseUrl)
    || (Array.isArray(bases) && bases.some(isRetiredPlatformBaseUrl))
    || (Array.isArray(platforms) && platforms.some(isRetiredPlatformBaseUrl));
}
