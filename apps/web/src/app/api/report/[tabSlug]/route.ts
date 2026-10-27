import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "请在当前品牌的具体业务板块导出数据；共享演示周报已停用。" }, { status: 409 });
}
export const dynamic = "force-dynamic";
