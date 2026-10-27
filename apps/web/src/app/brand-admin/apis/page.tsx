import { Suspense } from "react";
import BrandApisWorkspace from "../../../components/brand-apis-workspace";
export default function BrandApisPage() {
  return <Suspense fallback={<p role="status">正在读取接口配置…</p>}><BrandApisWorkspace /></Suspense>;
}
