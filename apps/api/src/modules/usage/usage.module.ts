import { Module, Global } from '@nestjs/common';
import { UsageControlService } from './usage-control.service';
import { CostGuardService } from './cost-guard.service';
import { UsageController } from './usage.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [UsageController],
  providers: [UsageControlService, CostGuardService],
  exports: [UsageControlService, CostGuardService],
})
export class UsageModule {}
