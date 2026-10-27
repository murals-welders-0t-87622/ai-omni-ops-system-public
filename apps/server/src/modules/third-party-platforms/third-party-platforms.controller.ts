import { Body, Controller, Delete, Header, Get, Headers, Param, Patch, Post, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "../admin/admin-access";
import {
  ThirdPartyPlatformsService,
  type CreateThirdPartyPlatformPayload,
  type UpdateBrandThirdPartyPlatformSecretPayload,
  type UpdateThirdPartyPlatformPayload,
} from "./third-party-platforms.service";

@Controller()
export class ThirdPartyPlatformsController {
  constructor(
    private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService,
    private readonly authService: AuthService,
  ) {}

  @Get("admin/third-party-platforms")
  async listAdminPlatforms(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.thirdPartyPlatformsService.listPlatforms();
  }

  @Post("admin/third-party-platforms")
  async createAdminPlatform(
    @Body() payload: CreateThirdPartyPlatformPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.thirdPartyPlatformsService.createPlatform(payload);
  }

  @Patch("admin/third-party-platforms/:id")
  async updateAdminPlatform(
    @Param("id") id: string,
    @Body() payload: UpdateThirdPartyPlatformPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.thirdPartyPlatformsService.updatePlatform(id, payload);
  }

  @Delete("admin/third-party-platforms/:id")
  async deleteAdminPlatform(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.thirdPartyPlatformsService.deletePlatform(id);
  }

  @Get("third-party-platforms")
  @Header("Cache-Control", "no-store")
  async listUserPlatforms(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth?.brandId) {
      throw new UnauthorizedException("请先登录并进入品牌工作区");
    }
    const access = await this.authService.assertBrandPermission(auth.brandId, "personalCenter.thirdPartyPlatforms", "view", auth);
    const platforms = await this.thirdPartyPlatformsService.listUserPlatforms(access.userId, access.brandId);
    return {
      brandId: access.brandId,
      role: access.role,
      canManage: access.permissions["personalCenter.thirdPartyPlatforms"].edit,
      platforms,
    };
  }

  @Get("third-party-platforms/brand-settings")
  @Header("Cache-Control", "no-store")
  async brandModelSettings(@Headers() headers: Record<string,string|string[]|undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, {fallbackToDefaultUser:false});
    if (!auth?.brandId) throw new UnauthorizedException("请先选择品牌");
    const access = await this.authService.assertBrandPermission(auth.brandId, "personalCenter.thirdPartyPlatforms", "view", auth);
    return {brandId:auth.brandId,canManage:access.permissions["personalCenter.thirdPartyPlatforms"].edit,policy:"brand_owned_credentials",platforms:await this.thirdPartyPlatformsService.listBrandModelSettings(auth.brandId)};
  }

  @Get("third-party-platforms/runtime-access")
  async listUserPlatformRuntimeAccess(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth?.brandId) {
      throw new UnauthorizedException("请先登录并进入品牌工作区");
    }
    const access = await this.authService.assertBrandPermission(auth.brandId, "personalCenter.thirdPartyPlatforms", "view", auth);
    return this.thirdPartyPlatformsService.listBrandRuntimeAccessSummaries(access.brandId);
  }

  @Patch("third-party-platforms/:id/secret")
  @Header("Cache-Control", "no-store")
  async updateUserPlatformSecret(
    @Param("id") id: string,
    @Body() payload: UpdateBrandThirdPartyPlatformSecretPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth?.brandId) {
      throw new UnauthorizedException("请先登录并进入品牌工作区");
    }
    const access = await this.authService.assertBrandPermission(auth.brandId, "personalCenter.thirdPartyPlatforms", "edit", auth);
    return this.thirdPartyPlatformsService.updateBrandPlatformSecret(access.brandId, id, payload);
  }
}
