import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { DomainEventsModule } from '../../common/events/domain-events.module';

@Module({
  imports: [PrismaModule, DomainEventsModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
