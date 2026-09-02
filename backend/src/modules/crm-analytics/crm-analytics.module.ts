import { Module } from '@nestjs/common';
import { CRMAnalyticsService } from './crm-analytics.service';
import { CRMAnalyticsController } from './crm-analytics.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CRMAnalyticsController],
  providers: [CRMAnalyticsService],
  exports: [CRMAnalyticsService],
})
export class CRMAnalyticsModule {}
