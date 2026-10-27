import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service";
import { GrowthCockpitService } from "./growth-cockpit.service";
@Injectable()
export class GrowthCockpitScheduler implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout; private running = false; private readonly logger = new Logger(GrowthCockpitScheduler.name);
  constructor(private readonly config: AppConfigService, private readonly cockpit: GrowthCockpitService) {}
  onModuleInit() { // Dedicated Lab plan checker. Never enables SchedulerService or calls providers/models.
    if (!this.config.isOntologyLab()) return;
    this.timer = setInterval(() => { if (this.running) return; this.running = true; void this.cockpit.runDue().catch(() => this.logger.warn("计划只读检查失败，未伪报成功；下次重试")).finally(() => { this.running = false; }); }, 60000); this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
}
