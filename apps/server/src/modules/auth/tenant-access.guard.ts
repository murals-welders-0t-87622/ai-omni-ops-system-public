import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";

/** Lab's standard mode is a multi-user boundary; development headers never grant identity. */
@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly config: AppConfigService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    if (!this.config.isOntologyLab() || this.config.isLocalSingleUserMode()) return true;
    const req = context.switchToHttp().getRequest();
    const route = String(req.path || req.url || "").split("?")[0].toLowerCase().replace(/^\/api(?=\/|$)/, "");
    if (req.method === "OPTIONS" || route === "/health" || /^\/auth\/(login|register|register-config|refresh|feishu\/oauth\/callback)$/.test(route)) return true;
    // Installation credentials are validated by the MCP service, not browser-session auth.
    if (route === "/ai-control-center/mcp" || route === "/ai-control-center/mcp/") return true;
    const actor = await this.auth.resolveRequestAuthContext(req.headers);
    if (!actor?.userId || actor.source !== "token") throw new UnauthorizedException("请先登录");
    const administrative = actor.systemRole === "SUPER_ADMIN" || actor.systemRole === "ADMIN_OPERATOR";
    if (route.startsWith("/ai-control-center/mcp/debug/")
      || /^\/(admin|local-runtime|system-update|ontology-mapper)(?:\/|$)/.test(route)
      || (/^\/ai-control(?:\/|$)/.test(route) && !route.startsWith("/ai-control/assets/"))
      || /^\/brands\/(overview|feishu)(?:\/|$)/.test(route)) {
      if (!administrative) throw new ForbiddenException("当前账号无平台配置权限");
    }
    // Checking all supplied scopes prevents an authorized header from hiding a foreign URL/body.
    const scopes = [actor.brandId, req.params?.brandId, req.query?.brandId, req.body?.brandId, req.body?.brand_id];
    if (route.startsWith("/brands/") && req.params?.id) scopes.push(req.params.id);
    for (const id of new Set(scopes.filter(Boolean))) {
      if (typeof id !== "string") throw new ForbiddenException("品牌参数不合法");
      await this.auth.assertBrandAccess(id, actor);
    }
    if (req.query?.userId && req.query.userId !== actor.userId && !administrative) throw new ForbiddenException("不能访问其他账号的配置");
    if (req.body?.userId && req.body.userId !== actor.userId && !administrative) throw new ForbiddenException("不能代表其他账号执行");
    const referencedTask = req.body?.taskId || req.query?.taskId;
    if (referencedTask && !route.startsWith("/workflow-core/")) {
      const id = String(referencedTask);
      const task = await this.prisma.task.findUnique({where:{id},select:{brandId:true,userId:true}});
      const workflowTask = task ? null : await this.prisma.wfTask.findUnique({where:{taskId:id},select:{brandId:true}});
      const taskBrand = task?.brandId || workflowTask?.brandId;
      if (taskBrand) {
        if (taskBrand !== actor.brandId) throw new ForbiddenException("关联任务不属于当前品牌");
        await this.auth.assertBrandAccess(taskBrand, actor);
      }
      else if (!task || task.userId !== actor.userId) throw new ForbiddenException("关联任务不存在或不可访问");
    }
    const mediaBrand = /^\/works\/brands\/([^/]+)\/assets(?:\/|$)/.exec(route);
    if (mediaBrand && String(req.params?.brandId || decodeURIComponent(mediaBrand[1])) !== actor.brandId) throw new ForbiddenException("素材不属于当前品牌工作区");
    if (route.startsWith("/workflow-core/")) {
      if (!actor.brandId) throw new ForbiddenException("请先选择品牌");
      if (route === "/workflow-core/tasks") req.query.brandId = req.query.brandId || actor.brandId;
      const taskId = req.params?.taskId || req.body?.taskId || req.body?.task_id;
      if (taskId && route !== "/workflow-core/handlers/create_task") {
        const task = await this.prisma.wfTask.findUnique({where:{taskId:String(taskId)},select:{brandId:true}});
        if (!task) throw new ForbiddenException("任务不存在或不可访问");
        await this.auth.assertBrandAccess(task.brandId, actor);
      }
    }
    if (route.startsWith("/ai-control/assets/")) {
      if (!actor.brandId) throw new ForbiddenException("请先选择品牌");
      // The archive previously allowed a missing filter to aggregate every brand.
      req.query.brandId = req.query.brandId || actor.brandId;
      if (route === "/ai-control/assets/storage" && !administrative) {
        let key = String(req.query.storageKey || "");
        try { for (let n = 0; n < 3 && /%[0-9a-f]{2}/i.test(key); n++) key = decodeURIComponent(key); }
        catch { throw new ForbiddenException("文件路径不合法"); }
        const prefixes = ["brands", "works", "materials"].map(p => `${p}/${actor.brandId}/`);
        if (!prefixes.some(p => key.startsWith(p)) || key.includes("\\") || key.includes("\0") || key.split("/").some(p => p === ".." || p === ".")) throw new ForbiddenException("文件不属于当前品牌可访问范围");
      }
    }
    return true;
  }
}
