import { APP_GUARD } from "@nestjs/core";
import { TenantAccessGuard } from "./tenant-access.guard";
import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: TenantAccessGuard }],
  exports: [AuthService],
})
export class AuthModule {}
