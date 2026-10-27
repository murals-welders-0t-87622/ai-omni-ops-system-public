import { Body, Controller, Get, Headers, Param, Post, Query, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { WorkAnalysisService } from "./work-analysis.service";
import { isWorkAnalysisWrite, workAnalysisPermission, WORK_ANALYSIS_TOOL_NAMES } from "./work-analysis.tools";
type HeadersMap = Record<string, string | string[] | undefined>;
@Controller("ai-control-center/brands/:brandId/work-analysis")
export class WorkAnalysisController {
  constructor(private readonly auth: AuthService, private readonly analysis: WorkAnalysisService) {}
  @Get(":platform")
  async read(@Headers() headers: HeadersMap, @Param("brandId") brandId: string, @Param("platform") platform: string, @Query() query: Record<string, string>) {
    if (isWorkAnalysisWrite(query.operation || "")) throw new BadRequestException("写操作必须使用POST");
    return this.run(headers, brandId, query.operation || "list_work_analysis_requests", { ...query, platform });
  }
  @Post(":platform")
  async command(@Headers() headers: HeadersMap, @Param("brandId") brandId: string, @Param("platform") platform: string, @Body() body: { operation?: string; input?: Record<string, unknown> }) {
    if (body?.input?.platform && body.input.platform !== platform) throw new BadRequestException("页面平台与提交目标冲突");
    return this.run(headers, brandId, String(body?.operation || ""), { ...body?.input, platform });
  }
  private async run(headers: HeadersMap, brandId: string, operation: string, input: Record<string, unknown>) {
    if (!WORK_ANALYSIS_TOOL_NAMES.includes(operation)) throw new BadRequestException("未知作品拆解操作");
    const auth = await this.auth.resolveRequestAuthContext(headers);
    if (!auth) throw new UnauthorizedException("请先登录");
    await this.auth.assertBrandPermission(brandId, workAnalysisPermission(input.platform), isWorkAnalysisWrite(operation) ? "edit" : "view", auth);
    return this.analysis.execute(operation, brandId, auth.userId, input);
  }
}
