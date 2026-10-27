import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { WorkflowCoreService } from "./workflow-core.service";
import {
  CreateTaskRequest,
  RegisterArtifactRequest,
  RecordVersionUsageRequest,
  RecordExecutionEventRequest,
  ClaimStageRequest,
  SubmitStageRequest,
  EvaluateStageRequest,
  RecordApprovalRequest,
  RequestChangeRequest,
  PauseTaskRequest,
  ResumeTaskRequest,
  CancelTaskRequest,
  CloseTaskRequest,
  ArchiveTaskRequest,
  ReopenArchiveRequest,
  WfHandlerResponse,
} from "./types";

const WF_API_PREFIX = "workflow-core";

@Controller(WF_API_PREFIX)
export class WorkflowCoreController {
  constructor(private readonly svc: WorkflowCoreService) {}

  @Get("health")
  health(): { ok: boolean; module: string } {
    return { ok: true, module: "workflow-core@phase2-skeleton" };
  }

  @Post("handlers/create_task")
  createTask(@Body() body: CreateTaskRequest): Promise<WfHandlerResponse> {
    return this.svc.createTask(body);
  }

  @Post("handlers/register_artifact")
  registerArtifact(@Body() body: RegisterArtifactRequest): Promise<WfHandlerResponse> {
    return this.svc.registerArtifact(body);
  }

  @Post("handlers/record_version_usage")
  recordVersionUsage(@Body() body: RecordVersionUsageRequest): Promise<WfHandlerResponse> {
    return this.svc.recordVersionUsage(body);
  }

  @Post("handlers/record_execution_event")
  recordExecutionEvent(@Body() body: RecordExecutionEventRequest): Promise<WfHandlerResponse> {
    return this.svc.recordExecutionEvent(body);
  }

  @Post("actions/claim_stage")
  claimStage(@Body() body: ClaimStageRequest): Promise<WfHandlerResponse> {
    return this.svc.claimStage(body);
  }

  @Post("actions/submit_stage")
  submitStage(@Body() body: SubmitStageRequest): Promise<WfHandlerResponse> {
    return this.svc.submitStage(body);
  }

  @Post("actions/evaluate_stage")
  evaluateStage(@Body() body: EvaluateStageRequest): Promise<WfHandlerResponse> {
    return this.svc.evaluateStage(body);
  }

  @Post("actions/record_approval")
  recordApproval(@Body() body: RecordApprovalRequest): Promise<WfHandlerResponse> {
    return this.svc.recordApproval(body);
  }

  @Post("actions/request_change")
  requestChange(@Body() body: RequestChangeRequest): Promise<WfHandlerResponse> {
    return this.svc.requestChange(body);
  }

  @Post("actions/pause_task")
  pauseTask(@Body() body: PauseTaskRequest): Promise<WfHandlerResponse> {
    return this.svc.pauseTask(body);
  }

  @Post("actions/resume_task")
  resumeTask(@Body() body: ResumeTaskRequest): Promise<WfHandlerResponse> {
    return this.svc.resumeTask(body);
  }

  @Post("actions/cancel_task")
  cancelTask(@Body() body: CancelTaskRequest): Promise<WfHandlerResponse> {
    return this.svc.cancelTask(body);
  }

  @Post("actions/close_task")
  closeTask(@Body() body: CloseTaskRequest): Promise<WfHandlerResponse> {
    return this.svc.closeTask(body);
  }

  @Post("actions/archive_task")
  archiveTask(@Body() body: ArchiveTaskRequest): Promise<WfHandlerResponse> {
    return this.svc.archiveTask(body);
  }

  @Post("actions/reopen_archive")
  reopenArchive(@Body() body: ReopenArchiveRequest): Promise<WfHandlerResponse> {
    return this.svc.reopenArchive(body);
  }

  @Get("tasks")
  listTasks(
    @Query("brandId") brandId?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ): Promise<WfHandlerResponse> {
    return this.svc.listTasks("cmd:read.list_tasks", { brandId, status, limit, offset });
  }

  @Get("tasks/:taskId")
  getTask(@Param("taskId") taskId: string): Promise<WfHandlerResponse> {
    return this.svc.getTask(`cmd:read.get_task:${taskId}`, taskId);
  }

  @Get("tasks/:taskId/governance-detail")
  getTaskGovernanceDetail(@Param("taskId") taskId: string): Promise<WfHandlerResponse> {
    return this.svc.getTaskGovernanceDetail(`cmd:read.get_task_governance_detail:${taskId}`, taskId);
  }

  @Get("tasks/:taskId/stage-runs")
  listStageRuns(@Param("taskId") taskId: string): Promise<WfHandlerResponse> {
    return this.svc.listStageRuns(`cmd:read.list_stage_runs:${taskId}`, taskId);
  }

  @Get("tasks/:taskId/artifacts")
  listArtifacts(
    @Param("taskId") taskId: string,
    @Query("kind") kind?: string
  ): Promise<WfHandlerResponse> {
    return this.svc.listArtifacts(`cmd:read.list_artifacts:${taskId}`, taskId, kind);
  }

  @Get("tasks/:taskId/execution-events")
  listExecutionEvents(
    @Param("taskId") taskId: string,
    @Query("stageRunId") stageRunId?: string,
    @Query("eventType") eventType?: string,
    @Query("subjectKind") subjectKind?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ): Promise<WfHandlerResponse> {
    return this.svc.listExecutionEvents(`cmd:read.list_execution_events:${taskId}`, taskId, {
      stageRunId,
      eventType,
      subjectKind,
      limit,
      offset,
    });
  }

  @Get("tasks/:taskId/version-usages")
  listVersionUsages(
    @Param("taskId") taskId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ): Promise<WfHandlerResponse> {
    return this.svc.listVersionUsages(`cmd:read.list_version_usages:${taskId}`, taskId, {
      limit,
      offset,
    });
  }
}
