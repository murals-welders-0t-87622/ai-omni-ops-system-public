import { Body, Controller, Get, Headers, Param, Post, Query, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { GrowthCockpitService } from "./growth-cockpit.service";
import { GROWTH_COCKPIT_NAMES, growthWrite } from "./growth-cockpit.tools";
@Controller("ai-control-center/brands/:brandId/growth-cockpit")
export class GrowthCockpitController {
  constructor(private readonly auth: AuthService, private readonly cockpit: GrowthCockpitService) {}
  @Get() async read(@Headers() headers: any, @Param("brandId") brandId: string, @Query() input: any) { const operation = String(input.operation || "get_growth_cockpit"); if (growthWrite(operation)) throw new BadRequestException("写操作必须使用POST"); return this.run(headers, brandId, operation, input); }
  @Post() async write(@Headers() headers: any, @Param("brandId") brandId: string, @Body() body: any) { return this.run(headers, brandId, String(body?.operation || ""), body?.input || {}); }
  private async run(headers: any, brandId: string, operation: string, input: any) { if (!GROWTH_COCKPIT_NAMES.includes(operation)) throw new BadRequestException("未知驾驶舱操作"); const actor = await this.auth.resolveRequestAuthContext(headers); if (!actor) throw new UnauthorizedException("请先登录"); await this.auth.assertBrandAccess(brandId, actor); return this.cockpit.execute(operation, brandId, actor, input); }
}
