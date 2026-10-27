import type { Metadata } from "next";
import { SystemDemoWorkbench } from "./SystemDemoWorkbench.client";

export const metadata: Metadata = {
  title: "整套系统前端 Demo",
  description: "用于向技术团队展示 AI 全域运营系统的前台信息架构、智控后台和模块拆解的可点击演示页。",
};

export default function SystemDemoPage() {
  return <SystemDemoWorkbench />;
}
