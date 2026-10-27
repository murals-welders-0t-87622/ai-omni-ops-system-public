import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({message:"请在当前品牌的具体业务板块创建任务；共享演示启动入口已停用。"}, {status:410});
}
