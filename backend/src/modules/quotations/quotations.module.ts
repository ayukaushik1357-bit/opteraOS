import { Module } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SequencesModule } from '../sequences/sequences.module';
import { CommunicationsModule } from '../communications/communications.module';
import { DomainEventsModule } from '../../common/events/domain-events.module';

@Module({
  imports: [PrismaModule, SequencesModule, CommunicationsModule, DomainEventsModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
