import { Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutopilotDaemonService } from './autopilot-daemon.service';

@Module({
  controllers: [AutomationsController],
  providers: [AutomationsService, AutopilotDaemonService],
  exports: [AutomationsService, AutopilotDaemonService],
})
export class AutomationsModule {}
