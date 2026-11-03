/** Route known local backend media URLs through the current web origin. */
export function archivePreviewSource(source: string, webOrigin: string): string {
  try {
    const web = new URL(webOrigin);
    const target = new URL(source, webOrigin);
    const loopback = (host: string) => host === "localhost" || host === "127.0.0.1";
    const pairedPort = (web.port === "23001" && target.port === "23011")
      || (web.port === "13001" && target.port === "13011");
    const mediaPath = /^\/api\/works\/brands\/[^/]+\/assets$/.test(target.pathname)
      || target.pathname === "/api/ai-control/assets/storage";
    if (loopback(web.hostname) && loopback(target.hostname) && pairedPort
      && target.protocol === web.protocol && mediaPath && !target.username && !target.password) {
      return `${target.pathname}${target.search}`;
    }
  } catch {
    // Keep unrecognized addresses unchanged; never forward credentials to them.
  }
  return source;
}

export function isArchiveTaskNavigation(source: string, webOrigin: string): boolean {
  try {
    const base = new URL(webOrigin);
    const target = new URL(source, base);
    return target.origin === base.origin && (
      target.pathname === "/ai-control/task-governance"
      || target.pathname === "/personal-center/tasks"
      || target.pathname.startsWith("/personal-center/tasks/")
    );
  } catch {
    return false;
  }
}
