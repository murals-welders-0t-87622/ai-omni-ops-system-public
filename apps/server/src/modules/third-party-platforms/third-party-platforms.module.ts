import { Module } from "@nestjs/common";
import { ApiProvidersModule } from "../admin/api-providers.module";
import { AuthModule } from "../auth/auth.module";
import { ChanjingOpenApiService } from "../works/chanjing-open-api.service";
import { GlmOpenService } from "./glm-open.service";
import { LocalAsrService } from "./local-asr.service";
import { LocalOcrService } from "./local-ocr.service";
import { RuanwenjieMediaService } from "./ruanwenjie-media.service";
import { ThirdPartyPlatformsController } from "./third-party-platforms.controller";
import { ThirdPartyPlatformsService } from "./third-party-platforms.service";
import { VolcengineMusicService } from "./volcengine-music.service";
import { SoonStudioRuntimeController } from "./soonstudio-runtime.controller";
import { SoonStudioRuntimeService } from "./soonstudio-runtime.service";

@Module({
  imports: [AuthModule, ApiProvidersModule],
  controllers: [ThirdPartyPlatformsController, SoonStudioRuntimeController],
  providers: [ThirdPartyPlatformsService, ChanjingOpenApiService, GlmOpenService, LocalAsrService, LocalOcrService, VolcengineMusicService, RuanwenjieMediaService, SoonStudioRuntimeService],
  exports: [ThirdPartyPlatformsService, GlmOpenService, LocalAsrService, LocalOcrService, VolcengineMusicService, RuanwenjieMediaService, SoonStudioRuntimeService],
})
export class ThirdPartyPlatformsModule {}
