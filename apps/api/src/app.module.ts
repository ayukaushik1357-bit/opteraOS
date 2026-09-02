import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CustomersModule } from './modules/customers/customers.module';
import { LeadsModule } from './modules/leads/leads.module';
import { DealsModule } from './modules/deals/deals.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ActivitiesModule } from './modules/activities/activities.module';

import { UsageModule } from './modules/usage/usage.module';
import { EmailModule } from './modules/email/email.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module';
import { HelpdeskModule } from './modules/helpdesk/helpdesk.module';
import { PriceListsModule } from './modules/pricelists/pricelists.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { HrModule } from './modules/hr/hr.module';
import { DiscussModule } from './modules/discuss/discuss.module';

@Module({
  imports: [
    // ── Config ────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate Limiting ──────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long', ttl: 60000, limit: 300 },
    ]),

    // ── Database ───────────────────────────────────────────────────────────
    PrismaModule,

    // ── Core Usage & Cost Protection ───────────────────────────────────────
    UsageModule,
    EmailModule,

    // ── Feature Modules ────────────────────────────────────────────────────
    AuthModule,
    OrganizationsModule,
    CustomersModule,
    LeadsModule,
    DealsModule,
    TasksModule,
    InvoicesModule,
    OrdersModule,
    ProductsModule,
    AnalyticsModule,
    AiModule,
    AutomationsModule,
    PaymentsModule,
    NotificationsModule,
    AuditLogsModule,
    IntegrationsModule,
    CampaignsModule,
    ActivitiesModule,
    ContactsModule,
    CompaniesModule,
    QuotationsModule,
    AccountingModule,
    PurchaseModule,
    ManufacturingModule,
    HelpdeskModule,
    PriceListsModule,
    ProjectsModule,
    HrModule,
    DiscussModule,
  ],
})
export class AppModule {}
