import { Body, Controller, Delete, Header, Headers, Param, Patch, Post, Get, Res, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { AIControlCenterInstallationService } from "./openclaw-installation.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("ai-control-center")
export class AIControlCenterInstallationController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawInstallationService: AIControlCenterInstallationService,
  ) {}

  private async requireActor(headers: HeadersMap) {
    const actor = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: false });
    if (!actor?.userId) throw new UnauthorizedException("请先登录");
    return actor;
  }

  @Get("installation-hub/connections")
  @Header("Cache-Control", "no-store")
  async listConnections(@Headers() headers: HeadersMap) {
    return this.openClawInstallationService.getBrandConnections(await this.requireActor(headers));
  }

  @Post("installation-hub/connections")
  @Header("Cache-Control", "no-store")
  async createConnection(@Headers() headers: HeadersMap, @Body() payload: { name?: string; clientKind?: string; access?: "read" | "work" | "brand"; expiresInDays?: number }) {
    return this.openClawInstallationService.createBrandConnection(await this.requireActor(headers), payload);
  }

  @Patch("installation-hub/connections/:connectionId/authorization")
  @Header("Cache-Control", "no-store")
  async updateConnectionAuthorization(@Headers() headers: HeadersMap, @Param("connectionId") connectionId: string, @Body() payload: {access?: "brand";expectedTokenId?:string;expectedAuthorizationHash?:string;confirmed?:boolean;reason?:string}) {
    return this.openClawInstallationService.updateBrandConnectionAuthorization(await this.requireActor(headers),connectionId,payload);
  }

  @Get("installation-hub/connections/:connectionId/authorization-history")
  @Header("Cache-Control", "no-store")
  async connectionAuthorizationHistory(@Headers() headers:HeadersMap,@Param("connectionId") connectionId:string){
    return this.openClawInstallationService.getBrandConnectionGrantHistory(await this.requireActor(headers),connectionId);
  }

  @Patch("installation-hub/connections/:connectionId/production-authorization")
  @Header("Cache-Control", "no-store")
  async updateProductionAuthorization(@Headers() headers: HeadersMap, @Param("connectionId") connectionId: string, @Body() payload: {capabilities?:unknown;expiresInHours?:number;purpose?:string;expectedTokenId?:string;expectedAuthorizationHash?:string;confirmed?:boolean}) {
    return this.openClawInstallationService.updateBrandProductionAuthorization(await this.requireActor(headers),connectionId,payload);
  }

  @Post("installation-hub/connections/:connectionId/rotate")
  @Header("Cache-Control", "no-store")
  async rotateConnection(@Headers() headers: HeadersMap, @Param("connectionId") connectionId: string) {
    return this.openClawInstallationService.rotateBrandConnection(await this.requireActor(headers), connectionId);
  }

  @Delete("installation-hub/connections/:connectionId")
  async revokeConnection(@Headers() headers: HeadersMap, @Param("connectionId") connectionId: string) {
    return this.openClawInstallationService.revokeBrandConnection(await this.requireActor(headers), connectionId);
  }

  @Get("installation-hub/connections/:connectionId/workspace")
  @Header("Cache-Control", "no-store")
  async connectionWorkspace(@Headers() headers: HeadersMap, @Param("connectionId") connectionId: string) {
    return this.openClawInstallationService.getBrandConnectionWorkspace(await this.requireActor(headers), connectionId);
  }

  @Get("installation-hub/connections/:connectionId/configuration")
  @Header("Cache-Control", "no-store")
  async connectionConfiguration(@Headers() headers: HeadersMap, @Param("connectionId") connectionId: string) {
    return this.openClawInstallationService.getBrandConnectionConfiguration(await this.requireActor(headers), connectionId);
  }

  @Get("installation-hub")
  async getInstallationWorkspace(@Headers() headers: HeadersMap) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return this.openClawInstallationService.getInstallationWorkspace(auth);
  }

  @Post("installation-hub/tokens/rotate")
  async rotateInstallationToken(
    @Headers() headers: HeadersMap,
    @Body() payload?: { tokenName?: string; expiresInDays?: number },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return this.openClawInstallationService.rotateInstallationToken(auth, payload);
  }

  @Delete("installation-hub/tokens/:tokenId")
  async revokeInstallationToken(
    @Headers() headers: HeadersMap,
    @Param("tokenId") tokenId: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return this.openClawInstallationService.revokeInstallationToken(auth, tokenId);
  }

  @Get("installation-hub/tokens/:tokenId/reveal")
  async revealInstallationToken(
    @Headers() headers: HeadersMap,
    @Param("tokenId") tokenId: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return this.openClawInstallationService.revealInstallationToken(auth, tokenId);
  }

  @Get("installation-hub/skill-package.zip")
  async downloadSkillPackage(
    @Headers() headers: HeadersMap,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    const file = await this.openClawInstallationService.buildSkillPackage(auth);
    const encodedFileName = encodeURIComponent(file.fileName);
    response.setHeader("Content-Type", file.contentType);
    response.setHeader("Content-Disposition", `attachment; filename="brand-operator-skill.zip"; filename*=UTF-8''${encodedFileName}`);
    response.send(file.buffer);
  }

  @Get("installation-hub/ontology-catalog.md")
  async downloadOntologyCatalog(
    @Headers() headers: HeadersMap,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    const file = await this.openClawInstallationService.buildOntologyCatalogDocument(auth);
    const encodedFileName = encodeURIComponent(file.fileName);
    response.setHeader("Content-Type", file.contentType);
    response.setHeader("Content-Disposition", `inline; filename="ontology-catalog.md"; filename*=UTF-8''${encodedFileName}`);
    response.send(file.buffer);
  }
}
