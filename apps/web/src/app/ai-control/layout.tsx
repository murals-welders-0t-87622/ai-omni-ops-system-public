import type { ReactNode } from "react";
import { PlatformAdminBoundary } from "../../components/platform-admin-boundary";

export default function AiControlLayout({ children }: { children: ReactNode }) {
  return <PlatformAdminBoundary>{children}</PlatformAdminBoundary>;
}
