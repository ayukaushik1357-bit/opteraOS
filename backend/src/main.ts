import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // ─── Security Middleware ──────────────────────────────────────────────────
  app.use(helmet.default());
  app.use(cookieParser());

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Org-Id',
      'X-Correlation-Id',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Correlation-Id', 'X-Request-Id'],
  });

  // ─── Global Prefix ────────────────────────────────────────────────────────
  const prefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(prefix);

  // ─── Global Interceptors & Exception Filter ───────────────────────────────
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // ─── Validation ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger Documentation ────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('opteraOS API')
      .setDescription('AI Business Operating System — Core Platform & Enterprise Modules API')
      .setVersion('2.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & Sessions')
      .addTag('organizations', 'Multi-tenant Organizations')
      .addTag('users', 'User Profiles & Directory')
      .addTag('contacts', 'Universal Polymorphic Contacts')
      .addTag('companies', 'B2B Business Entities & Hierarchies')
      .addTag('addresses', 'Polymorphic Addresses')
      .addTag('tags', 'Universal Dynamic Tags')
      .addTag('custom-fields', 'Extensible Custom Fields Engine')
      .addTag('comments', 'Universal Notes & Threaded Comments')
      .addTag('attachments', 'File Metadata & Storage Records')
      .addTag('departments', 'Hierarchical Organization Departments')
      .addTag('teams', 'Cross-functional Teams & Roster')
      .addTag('employees', 'Employee Directory & Lifecycle')
      .addTag('communications', 'Outbound Email & Communications Engine')
      .addTag('search', 'Global Cross-Entity Search')
      .addTag('activities', 'Universal Timeline & Activities')
      .addTag('notifications', 'In-app & Realtime Notifications')
      .addTag('audit-logs', 'Immutable Multi-Tenant Audit Trail')
      .addTag('customers', 'CRM — Customers')
      .addTag('leads', 'CRM — Leads')
      .addTag('deals', 'CRM — Deals')
      .addTag('tasks', 'Tasks & Productivity')
      .addTag('invoices', 'Invoicing')
      .addTag('orders', 'Orders')
      .addTag('products', 'Products & Inventory')
      .addTag('analytics', 'Business Analytics')
      .addTag('ai', 'AI Assistant & Autopilot')
      .addTag('automations', 'Workflow Automation')
      .addTag('payments', 'Payments (Razorpay)')
      .addTag('integrations', 'Third-party Integrations')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    console.log(`📚 Swagger docs: http://localhost:${process.env.PORT || 3001}/docs`);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 opteraOS API running at http://localhost:${port}/${prefix}`);
}

bootstrap();
