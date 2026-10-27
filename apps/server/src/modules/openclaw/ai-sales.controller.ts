import { Body, Controller, ForbiddenException, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { SALES_PERMISSION, SALES_READ_ACTIONS } from "@ai-omni/shared/ai-sales";
import { AISalesService } from "./ai-sales.service";
@Controller("ai-control-center/brands/:brandId/ai-sales")
export class AISalesController {
 constructor(private readonly auth:AuthService,private readonly sales:AISalesService){}
 private async context(id:string,headers:any,action:string){const a=await this.auth.resolveRequestAuthContext(headers);if(!a||a.brandId!==id)throw new ForbiddenException("请选择当前品牌工作区");await this.auth.assertBrandPermission(id,SALES_PERMISSION,SALES_READ_ACTIONS.includes(action)?"view":"edit",a);return a;}
 @Get() async workspace(@Param("brandId") id:string,@Headers() headers:any){const a=await this.context(id,headers,"sales_get_workspace");return this.sales.run(id,a.userId,"sales_get_workspace",{});}
 @Get("records") async list(@Param("brandId") id:string,@Headers() headers:any,@Query() query:any){const a=await this.context(id,headers,"sales_list_records");return this.sales.run(id,a.userId,"sales_list_records",query);}
 @Post("actions") async command(@Param("brandId") id:string,@Headers() headers:any,@Body() body:any){if(!body||Object.keys(body).some(k=>!["action","payload"].includes(k)))throw new ForbiddenException("销售操作格式不正确");const a=await this.context(id,headers,body.action);return this.sales.run(id,a.userId,body.action,body.payload??{});}
}
