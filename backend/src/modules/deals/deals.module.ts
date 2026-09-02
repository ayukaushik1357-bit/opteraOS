import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { DomainEventsModule } from '../../common/events/domain-events.module';

@Module({
  imports: [PrismaModule, DomainEventsModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
