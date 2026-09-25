import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import * as helmet from 'helmet';
import { AppModule } from './app.module';

function validateProductionEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const dbUrl = process.env.DATABASE_URL;

    const errors: string[] = [];
    if (!dbUrl || dbUrl.includes('opteraos_dev_pass')) {
      errors.push('DATABASE_URL is missing or using default development password.');
    }
    if (!accessSecret || accessSecret.includes('your_jwt_access_secret') || accessSecret.length < 64) {
      errors.push('JWT_ACCESS_SECRET must be at least 64 random characters (cannot use development placeholder).');
    }
    if (!refreshSecret || refreshSecret.includes('your_jwt_refresh_secret') || refreshSecret.length < 64) {
      errors.push('JWT_REFRESH_SECRET must be at least 64 random characters (cannot use development placeholder).');
    }

    if (errors.length > 0) {
      console.error('❌ PRODUCTION BOOTSTRAP FAILED: Insecure environment configuration detected.');
      errors.forEach((err) => console.error(`  - ${err}`));
      process.exit(1);
    }
  }
}

async function bootstrap() {
  validateProductionEnvironment();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // ─── Security Middleware ──────────────────────────────────────────────────
  app.use(helmet.default());
  app.use(cookieParser());

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const isDev = process.env.NODE_ENV !== 'production';
  const customOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8080,http://localhost:3000,http://127.0.0.1:8080,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: isDev
      ? (origin, callback) => {
          // In development, allow requests from any localhost/127.0.0.1 port or no-origin (mobile/curl/Postman)
          if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || customOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(null, true); // Permissive in development
          }
        }
      : customOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Org-Id',
      'X-Correlation-Id',
      'X-Request-Id',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['X-Correlation-Id', 'X-Request-Id'],
  });

  // ─── Global Prefix ────────────────────────────────────────────────────────
  const prefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(prefix);

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
      .setDescription('AI Business Operating System — REST API (Direct Access Model)')
      .setVersion('2.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & Sessions')
      .addTag('organizations', 'Multi-tenant Organizations')
      .addTag('customers', 'CRM — Customers')
      .addTag('leads', 'CRM — Leads')
      .addTag('deals', 'CRM — Deals')
      .addTag('tasks', 'Tasks & Productivity')
      .addTag('invoices', 'Invoicing')
      .addTag('orders', 'Orders')
      .addTag('products', 'Products & Inventory')
      .addTag('analytics', 'Business Analytics')
      .addTag('ai', 'AI Assistant & Tools')
      .addTag('automations', 'Workflow Automation & Autopilot')
      .addTag('usage', 'API Cost & Usage Controls')
      .addTag('payments', 'Invoice Payments')
      .addTag('notifications', 'Notifications')
      .addTag('audit-logs', 'Audit Logs')
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
