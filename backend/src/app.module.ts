import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { DomainEventsModule } from './common/events/domain-events.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

// Core Business Platform Modules
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { TagsModule } from './modules/tags/tags.module';
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { TeamsModule } from './modules/teams/teams.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { SearchModule } from './modules/search/search.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';

// CRM & Sales Modules
import { SequencesModule } from './modules/sequences/sequences.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { PricelistsModule } from './modules/pricelists/pricelists.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { CRMAnalyticsModule } from './modules/crm-analytics/crm-analytics.module';

// Existing / Supporting Modules
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
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { HelpdeskModule } from './modules/helpdesk/helpdesk.module';
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

    // ── Database & Global Events ───────────────────────────────────────────
    PrismaModule,
    DomainEventsModule,

    // ── Core Platform Modules ───────────────────────────────────────────────
    AuthModule,
    OrganizationsModule,
    UsersModule,
    ContactsModule,
    CompaniesModule,
    AddressesModule,
    TagsModule,
    CustomFieldsModule,
    CommentsModule,
    AttachmentsModule,
    DepartmentsModule,
    TeamsModule,
    EmployeesModule,
    CommunicationsModule,
    SearchModule,
    ActivitiesModule,
    NotificationsModule,
    AuditLogsModule,

    // ── CRM & Sales Engine Modules ──────────────────────────────────────────
    SequencesModule,
    PipelinesModule,
    PricelistsModule,
    QuotationsModule,
    TemplatesModule,
    CRMAnalyticsModule,
    CustomersModule,
    LeadsModule,
    DealsModule,
    OrdersModule,
    ProductsModule,

    // ── Major Business & Operational Modules ────────────────────────────────
    TasksModule,
    InvoicesModule,
    AnalyticsModule,
    AiModule,
    AutomationsModule,
    PaymentsModule,
    IntegrationsModule,
    CampaignsModule,
    AccountingModule,
    PurchaseModule,
    ManufacturingModule,
    ProjectsModule,
    HelpdeskModule,
    HrModule,
    DiscussModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
