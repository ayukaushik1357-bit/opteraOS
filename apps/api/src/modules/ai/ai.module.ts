import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AIProviderFactory } from './providers/ai-provider.factory';
import { CustomersModule } from '../customers/customers.module';
import { LeadsModule } from '../leads/leads.module';
import { DealsModule } from '../deals/deals.module';
import { TasksModule } from '../tasks/tasks.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { AutomationsModule } from '../automations/automations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsageModule } from '../usage/usage.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    UsageModule,
    CustomersModule,
    LeadsModule,
    DealsModule,
    TasksModule,
    InvoicesModule,
    AutomationsModule,
    NotificationsModule,
  ],
  controllers: [AiController],
  providers: [AiService, AIProviderFactory],
  exports: [AiService, AIProviderFactory],
})
export class AiModule {}
