import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { OntologyMapperService, OutboxWorkerService } from "./ontology-mapper.service";
import { AiControlOntologyMapperController, OntologyMapperController } from "./ontology-mapper.controller";

@Module({
  imports: [PrismaModule],
  providers: [OntologyMapperService, OutboxWorkerService],
  controllers: [OntologyMapperController, AiControlOntologyMapperController],
  exports: [OntologyMapperService, OutboxWorkerService],
})
export class OntologyMapperModule {}
