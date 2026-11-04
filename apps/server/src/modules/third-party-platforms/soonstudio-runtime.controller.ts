import { Body, Controller, Get, Headers, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { SoonStudioRuntimeService, type SoonStudioSubmitPayload } from './soonstudio-runtime.service';

@Controller('third-party-platforms/soonstudio')
export class SoonStudioRuntimeController {
  constructor(private readonly auth: AuthService, private readonly runtime: SoonStudioRuntimeService) {}
  private async actor(headers: Record<string, string | string[] | undefined>, edit = false) {
    const actor = await this.auth.resolveRequestAuthContext(headers, { fallbackToDefaultUser: false });
    if (!actor?.brandId || !actor.userId || actor.source !== 'token') throw new UnauthorizedException('请先登录并选择品牌');
    await this.auth.assertBrandPermission(actor.brandId, 'personalCenter.works', edit ? 'edit' : 'view', actor);
    return actor as typeof actor & { brandId: string; userId: string };
  }
  @Get('models') async models(@Headers() headers: Record<string, string | string[] | undefined>, @Query() query: any) { await this.actor(headers); return this.runtime.listModels(query); }
  @Get('models/:model') async model(@Headers() headers: Record<string, string | string[] | undefined>, @Param('model') model: string) { await this.actor(headers); return this.runtime.getModel(model); }
  @Post('jobs') async submit(@Headers() headers: Record<string, string | string[] | undefined>, @Body() body: SoonStudioSubmitPayload) { const actor = await this.actor(headers, true); return this.runtime.submit(actor.brandId, body, actor.userId); }
  @Get('jobs/:id') async read(@Headers() headers: Record<string, string | string[] | undefined>, @Param('id') id: string) { return this.runtime.read((await this.actor(headers)).brandId, id); }
  @Post('jobs/:id/refresh') async refresh(@Headers() headers: Record<string, string | string[] | undefined>, @Param('id') id: string) { return this.runtime.refresh((await this.actor(headers, true)).brandId, id); }
}
