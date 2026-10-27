import { AuthModule } from "../auth/auth.module";
import { Module } from "@nestjs/common";
import { StorageModule } from "../../storage/storage.module";
import { ThirdPartyPlatformsModule } from "../third-party-platforms/third-party-platforms.module";
import { WorkflowCoreModule } from "../workflow-core/workflow-core.module";
import { AiControlController } from "./ai-control.controller";
import { AiControlAssetArchiveService } from "./ai-control-asset-archive.service";
import { AiControlMdWriterService } from "./ai-control-md-writer.service";
import { AiControlOntologyOrchestrationService } from "./ai-control-ontology-orchestration.service";

@Module({
  imports: [AuthModule, WorkflowCoreModule, StorageModule, ThirdPartyPlatformsModule],
  controllers: [AiControlController],
  providers: [AiControlMdWriterService, AiControlAssetArchiveService, AiControlOntologyOrchestrationService],
  exports: [AiControlMdWriterService, AiControlAssetArchiveService, AiControlOntologyOrchestrationService],
})
export class AiControlModule {}
