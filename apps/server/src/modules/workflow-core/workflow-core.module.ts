import { Module, forwardRef } from "@nestjs/common";
import { WorkflowCoreController } from "./workflow-core.controller";
import { WorkflowCoreService } from "./workflow-core.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { OntologyMapperModule } from "../ontology-mapper/ontology-mapper.module";

@Module({
  imports: [PrismaModule, forwardRef(() => OntologyMapperModule)],
  controllers: [WorkflowCoreController],
  providers: [WorkflowCoreService],
  exports: [WorkflowCoreService],
})
export class WorkflowCoreModule {}
