import { PrivateOperationsService } from "./private-operations.service";
import { PrivateOperationsController } from "./private-operations.controller";
import { AISalesService } from "./ai-sales.service";
import { AISalesController } from "./ai-sales.controller";
import {CommerceService} from "./commerce.service";
import {CommerceController} from "./commerce.controller";
import {OceanAdsService} from "./ocean-ads.service";
import {OceanAdsController} from "./ocean-ads.controller";
import { BrandExecutionProfileService } from "./brand-execution-profile.service";
import { BrandExecutionProfileController } from "./brand-execution-profile.controller";
import { GrowthCockpitService } from "./growth-cockpit.service";
import { GrowthCockpitController } from "./growth-cockpit.controller";
import { GrowthCockpitScheduler } from "./growth-cockpit.scheduler";
import { Module } from "@nestjs/common";
import { WorkAnalysisService } from "./work-analysis.service";
import { WorkAnalysisController } from "./work-analysis.controller";
import { AuthModule } from "../auth/auth.module";
import { BrandsModule } from "../brands/brands.module";
import { CollectorsModule } from "../collectors/collectors.module";
import { FeedbackModule } from "../feedback/feedback.module";
import { PublishingModule } from "../publishing/publishing.module";
import { ReportsModule } from "../reports/reports.module";
import { TasksModule } from "../tasks/tasks.module";
import { UserSkillsModule } from "../user-skills/user-skills.module";
import { WorksModule } from "../works/works.module";
import { AIControlCenterController } from "./openclaw.controller";
import { AIControlCenterCommentController } from "./openclaw-comment.controller";
import { AIControlCenterCommentLeadController } from "./openclaw-comment-lead.controller";
import { AIControlCenterCommentLeadService } from "./openclaw-comment-lead.service";
import { AIControlCenterPlatformLeadController } from "./openclaw-platform-lead.controller";
import { AIControlCenterPlatformLeadService } from "./openclaw-platform-lead.service";
import { AIControlCenterCommentService } from "./openclaw-comment.service";
import { AIControlCenterExplosiveAnalysisController } from "./openclaw-explosive-analysis.controller";
import { AIControlCenterExplosiveAnalysisService } from "./openclaw-explosive-analysis.service";
import { AIControlCenterCreativeMaterialController } from "./openclaw-creative-material.controller";
import { AIControlCenterCreativeMaterialService } from "./openclaw-creative-material.service";
import { AIControlCenterGeoContentController } from "./openclaw-geo-content.controller";
import { AIControlCenterGeoContentService } from "./openclaw-geo-content.service";
import { AIControlCenterDailyPlanController } from "./openclaw-daily-plan.controller";
import { AIControlCenterDailyPlanService } from "./openclaw-daily-plan.service";
import { AIControlCenterInstallationController } from "./openclaw-installation.controller";
import { AIControlCenterInstallationService } from "./openclaw-installation.service";
import { AIControlCenterGeoVisibilityReportController } from "./openclaw-geo-visibility-report.controller";
import { AIControlCenterGeoVisibilityReportService } from "./openclaw-geo-visibility-report.service";
import { AIControlCenterLobsterDiaryController } from "./openclaw-lobster-diary.controller";
import { AIControlCenterLobsterDiaryService } from "./openclaw-lobster-diary.service";
import { AIControlCenterMarketingPlanController } from "./openclaw-marketing-plan.controller";
import { AIControlCenterMarketingPlanService } from "./openclaw-marketing-plan.service";
import { AIControlCenterTencentAdLeadController } from "./openclaw-tencent-ad-lead.controller";
import { AIControlCenterTencentAdLeadService } from "./openclaw-tencent-ad-lead.service";
import { AIControlCenterCreatorCooperationController } from "./openclaw-creator-cooperation.controller";
import { AIControlCenterCreatorCooperationService } from "./openclaw-creator-cooperation.service";
import { AIControlCenterStrategyOptimizationController } from "./openclaw-strategy-optimization.controller";
import { AIControlCenterStrategyOptimizationService } from "./openclaw-strategy-optimization.service";
import { AIControlCenterThirdPartyMediaDeliveryController } from "./openclaw-third-party-media-delivery.controller";
import { AIControlCenterThirdPartyMediaResourceService } from "./openclaw-third-party-media-resource.service";
import { AIControlCenterService } from "./openclaw.service";
import { AIControlCenterVideoWorkController } from "./openclaw-video-work.controller";
import { AIControlCenterVideoWorkService } from "./openclaw-video-work.service";
import { OrdersModule } from "../orders/orders.module";
import { ThirdPartyPlatformsModule } from "../third-party-platforms/third-party-platforms.module";
import { StorageModule } from "../../storage/storage.module";
import { LocalRuntimeModule } from "../local-runtime/local-runtime.module";
import { SchedulerModule } from "../scheduler/scheduler.module";
import { AiControlModule } from "../ai-control/ai-control.module";

@Module({
  imports: [AuthModule, TasksModule, BrandsModule, ReportsModule, UserSkillsModule, WorksModule, CollectorsModule, FeedbackModule, PublishingModule, ThirdPartyPlatformsModule, OrdersModule, StorageModule, LocalRuntimeModule, SchedulerModule, AiControlModule],
  controllers: [
    BrandExecutionProfileController,
    GrowthCockpitController,
    WorkAnalysisController,
    AIControlCenterController,
    AIControlCenterCommentController,
    AIControlCenterCommentLeadController,
    AIControlCenterPlatformLeadController,
    AIControlCenterExplosiveAnalysisController,
    AIControlCenterInstallationController,
    AIControlCenterGeoVisibilityReportController,
    AIControlCenterGeoContentController,
    AIControlCenterThirdPartyMediaDeliveryController,
    AIControlCenterLobsterDiaryController,
    AIControlCenterMarketingPlanController,
    AIControlCenterTencentAdLeadController,
    OceanAdsController,
    CommerceController,
    AISalesController,
    PrivateOperationsController,
    AIControlCenterCreatorCooperationController,
    AIControlCenterStrategyOptimizationController,
    AIControlCenterDailyPlanController,
    AIControlCenterCreativeMaterialController,
    AIControlCenterVideoWorkController,
  ],
  providers: [
    BrandExecutionProfileService,
    GrowthCockpitService, GrowthCockpitScheduler,
    WorkAnalysisService,
    AIControlCenterService,
    AIControlCenterCommentService,
    AIControlCenterCommentLeadService,
    AIControlCenterPlatformLeadService,
    AIControlCenterExplosiveAnalysisService,
    AIControlCenterInstallationService,
    AIControlCenterGeoVisibilityReportService,
    AIControlCenterGeoContentService,
    AIControlCenterThirdPartyMediaResourceService,
    AIControlCenterLobsterDiaryService,
    AIControlCenterMarketingPlanService,
    AIControlCenterTencentAdLeadService,
    OceanAdsService,
    CommerceService,
    AISalesService,
    PrivateOperationsService,
    AIControlCenterCreatorCooperationService,
    AIControlCenterStrategyOptimizationService,
    AIControlCenterDailyPlanService,
    AIControlCenterCreativeMaterialService,
    AIControlCenterVideoWorkService,
  ],
  exports: [
    AIControlCenterService,
    AIControlCenterCommentService,
    AIControlCenterCommentLeadService,
    AIControlCenterPlatformLeadService,
    AIControlCenterExplosiveAnalysisService,
    AIControlCenterInstallationService,
    AIControlCenterGeoVisibilityReportService,
    AIControlCenterGeoContentService,
    AIControlCenterThirdPartyMediaResourceService,
    AIControlCenterLobsterDiaryService,
    AIControlCenterMarketingPlanService,
    AIControlCenterTencentAdLeadService,
    OceanAdsService,
    CommerceService,
    AISalesService,
    PrivateOperationsService,
    AIControlCenterCreatorCooperationService,
    AIControlCenterStrategyOptimizationService,
    AIControlCenterDailyPlanService,
    AIControlCenterCreativeMaterialService,
    AIControlCenterVideoWorkService,
  ],
})
export class AIControlCenterModule {}
