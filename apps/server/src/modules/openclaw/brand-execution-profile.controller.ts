import { Body,Controller,Get,Header,Headers,Param,Patch,Post,UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { BrandExecutionProfileService } from "./brand-execution-profile.service";
@Controller("brands/:brandId/execution-profile")
export class BrandExecutionProfileController {
 constructor(private readonly auth:AuthService,private readonly profiles:BrandExecutionProfileService){}
 private async actor(headers:any){const a=await this.auth.resolveRequestAuthContext(headers,{fallbackToDefaultUser:false});if(!a?.userId)throw new UnauthorizedException("请先登录");return a;}
 @Get() @Header("Cache-Control","no-store") async read(@Headers() h:any,@Param("brandId") b:string){return this.profiles.workspace(b,await this.actor(h));}
 @Patch() async save(@Headers() h:any,@Param("brandId") b:string,@Body() input:any){return this.profiles.save(b,await this.actor(h),input);}
 @Post("publish") async publish(@Headers() h:any,@Param("brandId") b:string,@Body() input:any){return this.profiles.publish(b,await this.actor(h),input);}
}
