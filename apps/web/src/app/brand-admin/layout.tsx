import type { ReactNode } from "react";
import { BrandAdminBoundary } from "../../components/brand-admin-boundary";
export default function BrandAdminLayout({ children }: { children: ReactNode }) { return <BrandAdminBoundary>{children}</BrandAdminBoundary>; }
