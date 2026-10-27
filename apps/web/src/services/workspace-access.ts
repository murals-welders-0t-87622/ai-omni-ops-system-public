import type { AuthSession } from "./auth-session";
export function isPlatformAdministrator(session?: AuthSession) {
  return !!session?.user && ["SUPER_ADMIN", "ADMIN_OPERATOR"].includes(session.user.systemRole);
}
export function canManageCurrentBrand(session?: AuthSession) {
  if (!session?.user || !session.currentBrandId) return false;
  const brand = session.brands.find(b => b.id === session.currentBrandId);
  return !!brand && ["OWNER", "ADMIN"].includes(brand.role);
}
/** Navigation hint only. Server membership/permissions remain authoritative. */
export function controlWorkspaceDestination(session?: AuthSession) {
  if (canManageCurrentBrand(session)) return "/brand-admin";
  return isPlatformAdministrator(session) ? "/ai-control" : undefined;
}

/** Shared archive opened through the platform route returns to the permitted workspace. */
export function archiveControlDestination(session?: AuthSession) {
  return isPlatformAdministrator(session) ? "/ai-control" : controlWorkspaceDestination(session) || "/tabs/brand-control";
}
