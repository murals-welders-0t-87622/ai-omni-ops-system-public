import {Body,Controller,Get,Post,Param,Headers,Query,ForbiddenException} from "@nestjs/common";
import {AuthService} from "../auth/auth.service";
import {OceanAdsService} from "./ocean-ads.service";
@Controller("ai-control-center/brands/:brandId/ocean-ads")
export class OceanAdsController{
 constructor(private readonly auth:AuthService,private readonly ocean:OceanAdsService){}
 private async context(brandId:string,headers:any,edit:boolean){const a=await this.auth.resolveRequestAuthContext(headers);if(!a||a.brandId!==brandId)throw new ForbiddenException("请选择当前品牌工作区");await this.auth.assertBrandPermission(brandId,"brandGrowth.report.topicLibrary",edit?"edit":"view",a);return a;}
 @Get() async workspace(@Param("brandId") brandId:string,@Headers() headers:any,@Query() query:any){const a=await this.context(brandId,headers,false);return this.ocean.run(brandId,a.userId,"ocean_get_workspace",query);}
 @Post("actions") async command(@Param("brandId") brandId:string,@Headers() headers:any,@Body() body:any){if(!body||Object.keys(body).some(k=>!["action","payload"].includes(k)))throw new ForbiddenException("操作格式不正确");const a=await this.context(brandId,headers,!["ocean_get_workspace","ocean_get_sync_status"].includes(body.action));return this.ocean.run(brandId,a.userId,body.action,body.payload||{});}
}
