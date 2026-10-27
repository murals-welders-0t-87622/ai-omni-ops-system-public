import { Metadata } from "next";
import StorageConnectorsWorkspace from "../StorageConnectorsWorkspace.client";

export const metadata: Metadata = {
  title: "AI 智控中心 · 存储与连接器",
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function AiControlStoragePage() {
  return <StorageConnectorsWorkspace />;
}
