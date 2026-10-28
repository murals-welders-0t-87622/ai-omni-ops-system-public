/** Only accept the exact local output of this brand's design task. Remote provider URLs are not controlled storage. */
export function designImageMedia(url: string, serverBase: string, brandId: string, taskId: string) {
  try {
    const parsed = new URL(url), base = new URL(serverBase);
    if (parsed.origin !== base.origin || parsed.pathname !== `/api/works/brands/${brandId}/assets` || parsed.hash || [...parsed.searchParams.keys()].some(k => k !== "fileName") || parsed.searchParams.getAll("fileName").length !== 1) return null;
    const name = parsed.searchParams.get("fileName") || "";
    const match = name.match(/^([a-zA-Z0-9_-]+)-cover-1\.(png|jpg|jpeg|webp)$/i);
    if (!match || match[1] !== taskId) return null;
    const extension = match[2].toLowerCase();
    return { storageKey: `works/${brandId}/${name}`, mimeType: extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg" };
  } catch { return null; }
}

export async function registerDesignImageMedia(db: any, info: { url: string; serverBase: string; brandId: string; taskId: string; userId: string; title: string }) {
  const media = designImageMedia(info.url, info.serverBase, info.brandId, info.taskId);
  if (!media || !await db.canUseDatabase()) return null;
  const where = { brandId: info.brandId, taskId: info.taskId, storageKey: media.storageKey };
  const existing = await db.mediaAsset.findFirst({ where });
  return existing || db.mediaAsset.create({ data: { userId: info.userId, ...where, title: info.title, mediaType: "IMAGE", sourceUrl: info.url, mimeType: media.mimeType } });
}
