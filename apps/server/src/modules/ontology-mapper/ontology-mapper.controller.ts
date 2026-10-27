import { Controller, Get, Post, Body, Query, BadRequestException } from "@nestjs/common";
import { OntologyMapperService, OutboxWorkerService } from "./ontology-mapper.service";
import {
  ONT_SCHEMA_VERSION,
  ONT_READ_ONLY_HANDLERS_7,
  OntPreconditionCheckRequest,
  OntMappingRequest,
  OntOutboxAppendRequest,
  OntOutboxDispatchRequest,
  OntReconcileReportRequest,
} from "./types";

@Controller("ontology-mapper")
export class OntologyMapperController {
  constructor(
    private readonly service: OntologyMapperService,
    private readonly worker: OutboxWorkerService,
  ) {}

  @Get("health")
  health() {
    return {
      ok: true,
      schema_version: ONT_SCHEMA_VERSION,
      handlers: [
        "POST /precondition-check",
        "POST /7x3-mapper",
        "POST /outbox/append",
        "POST /outbox/dispatch",
        "GET /read/:handler",
        "POST /reconcile/report",
      ],
      read_only_handlers_7: ONT_READ_ONLY_HANDLERS_7,
    };
  }

  @Post("precondition-check")
  preconditionCheck(@Body() body: OntPreconditionCheckRequest) {
    return this.service.checkPreconditions(body);
  }

  @Post("7x3-mapper")
  mapper7x3(@Body() body: OntMappingRequest) {
    return this.service.getOntology7x3(body);
  }

  @Post("outbox/append")
  outboxAppend(@Body() body: OntOutboxAppendRequest) {
    return this.service.appendOutbox(body);
  }

  @Post("outbox/dispatch")
  outboxDispatch(@Body() body: OntOutboxDispatchRequest) {
    return this.service.dispatchOutbox(body);
  }

  @Get("read")
  readHandler(
    @Query("handler") handler: string,
    @Query("task_id") taskId?: string,
    @Query("limit") limit?: string,
    @Query("stage_run_id") stageRunId?: string
  ) {
    if (!handler) throw new BadRequestException("ONT_MISSING_HANDLER");
    const args: Record<string, unknown> = {};
    if (taskId) args.task_id = taskId;
    if (limit) args.limit = Number(limit);
    if (stageRunId) args.stage_run_id = stageRunId;
    return this.service.getReadOnlyHandler(handler, args);
  }

  @Post("reconcile/report")
  reconcileReport(@Body() body: OntReconcileReportRequest) {
    return this.service.getReconcileReport(body);
  }

  @Post("outbox/tick")
  outboxTick(@Body() body: Record<string, unknown>) {
    return this.worker.runOutboxTick(body ?? {});
  }

  @Get("outbox/summary")
  outboxSummary() {
    return this.worker.getOutboxSummary();
  }
}

@Controller("ai-control/ontology-mapper")
export class AiControlOntologyMapperController {
  constructor(
    private readonly service: OntologyMapperService,
    private readonly worker: OutboxWorkerService,
  ) {}

  @Get("health")
  health() {
    return {
      ok: true,
      schema_version: ONT_SCHEMA_VERSION,
      alias_for: "ontology-mapper",
      read_only_handlers_7: ONT_READ_ONLY_HANDLERS_7,
    };
  }

  @Get("read")
  readHandler(
    @Query("handler") handler: string,
    @Query("task_id") taskId?: string,
    @Query("limit") limit?: string,
    @Query("stage_run_id") stageRunId?: string
  ) {
    if (!handler) throw new BadRequestException("ONT_MISSING_HANDLER");
    const args: Record<string, unknown> = {};
    if (taskId) args.task_id = taskId;
    if (limit) args.limit = Number(limit);
    if (stageRunId) args.stage_run_id = stageRunId;
    return this.service.getReadOnlyHandler(handler, args);
  }

  @Post("outbox/tick")
  outboxTick(@Body() body: Record<string, unknown>) {
    return this.worker.runOutboxTick(body ?? {});
  }

  @Get("outbox/summary")
  outboxSummary() {
    return this.worker.getOutboxSummary();
  }
}
