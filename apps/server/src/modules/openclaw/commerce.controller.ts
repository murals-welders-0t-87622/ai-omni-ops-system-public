import { Body, Controller, Get, Headers, Param, Post, Query, ForbiddenException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { commerceArea, CommerceService } from "./commerce.service";

@Controller("ai-control-center/brands/:brandId/commerce")
export class CommerceController {
  constructor(private readonly auth: AuthService, private readonly commerce: CommerceService) {}
  private async context(brandId: string, headers: any, action: string, payload: any) {
    const a = await this.auth.resolveRequestAuthContext(headers);
    if (!a || a.brandId !== brandId) throw new ForbiddenException("请选择当前品牌工作区");
    const area = commerceArea(action, payload);
    await this.auth.assertBrandPermission(brandId, area === "detail" ? "brandGrowth.library.products" : "brandGrowth.report.growthReport", ["commerce_get_workspace", "commerce_get_detail_history", "commerce_get_detail_reference"].includes(action) ? "view" : "edit", a);
    return a;
  }
  @Get() async workspace(@Param("brandId") id: string, @Headers() headers: any, @Query() query: any) {
    const a = await this.context(id, headers, "commerce_get_workspace", query);
    return this.commerce.run(id, a.userId, "commerce_get_workspace", query);
  }
  @Post("actions") async command(@Param("brandId") id: string, @Headers() headers: any, @Body() body: any) {
    if (!body || Object.keys(body).some(k => !["action", "payload"].includes(k))) throw new ForbiddenException("操作格式不正确");
    const a = await this.context(id, headers, body.action, body.payload || {});
    return this.commerce.run(id, a.userId, body.action, body.payload || {});
  }
}
