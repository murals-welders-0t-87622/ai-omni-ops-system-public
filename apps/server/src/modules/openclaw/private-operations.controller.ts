import { Body, Controller, ForbiddenException, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { PRIVATE_OPS_PERMISSION, PRIVATE_OPS_READ_ACTIONS } from "@ai-omni/shared/private-operations";
import { SALES_PERMISSION } from "@ai-omni/shared/ai-sales";
import { PrivateOperationsService } from "./private-operations.service";
@Controller("ai-control-center/brands/:brandId/private-operations")
export class PrivateOperationsController {
 constructor(private readonly auth:AuthService,private readonly operations:PrivateOperationsService){}
 private async context(brandId:string,headers:any,action:string,p:any={}){
  const a=await this.auth.resolveRequestAuthContext(headers);if(!a||a.brandId!==brandId)throw new ForbiddenException("请选择当前品牌工作区");
  await this.auth.assertBrandPermission(brandId,PRIVATE_OPS_PERMISSION,PRIVATE_OPS_READ_ACTIONS.includes(action)?"view":"edit",a);
  // Every private workspace can contain customer identities, including saved plans.
  await this.auth.assertBrandPermission(brandId,SALES_PERMISSION,PRIVATE_OPS_READ_ACTIONS.includes(action)?"view":"edit",a);return a;
 }
 @Get() async workspace(@Param("brandId") id:string,@Headers() h:any){const a=await this.context(id,h,"private_get_workspace");return this.operations.run(id,a.userId,"private_get_workspace",{});}
 @Get("records") async list(@Param("brandId") id:string,@Headers() h:any,@Query() q:any){const a=await this.context(id,h,"private_list_records",q);return this.operations.run(id,a.userId,"private_list_records",q);}
 @Post("actions") async command(@Param("brandId") id:string,@Headers() h:any,@Body() b:any){if(!b||Object.keys(b).some(k=>!["action","payload"].includes(k)))throw new ForbiddenException("操作格式不正确");const a=await this.context(id,h,b.action,b.payload);return this.operations.run(id,a.userId,b.action,b.payload??{});}
}
