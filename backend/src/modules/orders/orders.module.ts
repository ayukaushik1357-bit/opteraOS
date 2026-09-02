import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SequencesModule } from '../sequences/sequences.module';
import { DomainEventsModule } from '../../common/events/domain-events.module';

@Module({
  imports: [PrismaModule, SequencesModule, DomainEventsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
