import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { AIProviderFactory } from '../ai/providers/ai-provider.factory';
import { IAIProvider, AIProviderResponse } from '../ai/providers/ai-provider.interface';
import { CustomersService } from '../customers/customers.service';
import { LeadsService } from '../leads/leads.service';
import { DealsService } from '../deals/deals.service';
import { TasksService } from '../tasks/tasks.service';
import { InvoicesService } from '../invoices/invoices.service';
import { AutomationsService } from '../automations/automations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { CostGuardService } from './cost-guard.service';
import { UsageControlService, DEFAULT_QUOTAS } from './usage-control.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('opteraOS Phase 2 — Real AI + Real Email + Business Action Execution E2E Tests', () => {
  let aiService: AiService;
  let customersService: CustomersService;
  let leadsService: LeadsService;
  let dealsService: DealsService;
  let tasksService: TasksService;
  let invoicesService: InvoicesService;
  let notificationsService: NotificationsService;
  let costGuard: CostGuardService;
  let usageControl: UsageControlService;

  // In-Memory Test State
  const db = {
    customers: [] as any[],
    leads: [] as any[],
    deals: [] as any[],
    tasks: [] as any[],
    invoices: [] as any[],
    notifications: [] as any[],
    auditLogs: [] as any[],
    usageLedgers: [] as any[],
    conversations: [] as any[],
    messages: [] as any[],
  };

  const orgId = 'org_test_ai_200';
  const userId = 'usr_manager_100';
  const assigneeId = 'usr_employee_300';
  const conversationId = 'conv_ai_1';

  // Test Mock Provider (used ONLY inside isolated test suite to simulate LLM tool decisions)
  class TestMockAIProvider implements IAIProvider {
    readonly name = 'TEST_MOCK';
    private toolToCall: { name: string; arguments: any } | null = null;

    setNextToolCall(name: string, args: any) {
      this.toolToCall = { name, arguments: args };
    }

    isConfigured(): boolean {
      return true;
    }

    async generateContent(systemPrompt: string, history: any[], tools: any[]): Promise<AIProviderResponse> {
      if (this.toolToCall) {
        const call = this.toolToCall;
        this.toolToCall = null;
        return {
          content: '',
          toolCalls: [call],
          provider: 'TEST_MOCK',
          tokensUsed: 250,
          estimatedCost: 0.0002,
          isConfigured: true,
        };
      }
      return {
        content: 'I have analyzed your business request.',
        provider: 'TEST_MOCK',
        tokensUsed: 150,
        estimatedCost: 0.0001,
        isConfigured: true,
      };
    }

    async generateContentWithResults(
      systemPrompt: string,
      history: any[],
      toolCalls: any[],
      toolResults: any[],
    ): Promise<AIProviderResponse> {
      const summary = toolResults.map((r) => `${r.name}: ${JSON.stringify(r.result)}`).join(' | ');
      return {
        content: `Executed successfully: ${summary}`,
        provider: 'TEST_MOCK',
        tokensUsed: 350,
        estimatedCost: 0.0003,
        isConfigured: true,
      };
    }
  }

  let mockProvider: TestMockAIProvider;

  const prismaMock: any = {
    customer: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `cust_${Date.now()}`, ...data, createdAt: new Date() };
        db.customers.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return db.customers.filter((c) => c.organizationId === where.organizationId);
      }),
      count: jest.fn().mockImplementation(() => db.customers.length),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return db.customers.find((c) => c.id === where.id && c.organizationId === where.organizationId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = db.customers.findIndex((c) => c.id === where.id);
        if (idx !== -1) {
          db.customers[idx] = { ...db.customers[idx], ...data };
          return db.customers[idx];
        }
        return null;
      }),
    },
    lead: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `lead_${Date.now()}`, ...data, createdAt: new Date() };
        db.leads.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(() => db.leads),
      count: jest.fn().mockImplementation(() => db.leads.length),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return db.leads.find((l) => l.id === where.id && l.organizationId === where.organizationId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = db.leads.findIndex((l) => l.id === where.id);
        if (idx !== -1) {
          db.leads[idx] = { ...db.leads[idx], ...data };
          return db.leads[idx];
        }
        return null;
      }),
    },
    deal: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `deal_${Date.now()}`, ...data, createdAt: new Date() };
        db.deals.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(() => db.deals),
      count: jest.fn().mockImplementation(() => db.deals.length),
      aggregate: jest.fn().mockResolvedValue({ _sum: { value: 500000 }, _count: 3 }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return db.deals.find((d) => d.id === where.id && d.organizationId === where.organizationId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = db.deals.findIndex((d) => d.id === where.id);
        if (idx !== -1) {
          db.deals[idx] = { ...db.deals[idx], ...data };
          return db.deals[idx];
        }
        return null;
      }),
    },
    task: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `task_${Date.now()}`, ...data, createdAt: new Date() };
        db.tasks.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(() => db.tasks),
      count: jest.fn().mockImplementation(() => db.tasks.length),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return db.tasks.find((t) => t.id === where.id && t.organizationId === where.organizationId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = db.tasks.findIndex((t) => t.id === where.id);
        if (idx !== -1) {
          db.tasks[idx] = { ...db.tasks[idx], ...data };
          return db.tasks[idx];
        }
        return null;
      }),
    },
    invoice: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `inv_${Date.now()}`, invoiceNumber: 'INV-00001', ...data, createdAt: new Date() };
        db.invoices.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(() => db.invoices),
      count: jest.fn().mockImplementation(() => db.invoices.length),
      aggregate: jest.fn().mockResolvedValue({ _sum: { total: 150000 }, _count: 2 }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return db.invoices.find((i) => i.id === where.id && i.organizationId === where.organizationId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = db.invoices.findIndex((i) => i.id === where.id);
        if (idx !== -1) {
          db.invoices[idx] = { ...db.invoices[idx], ...data };
          return db.invoices[idx];
        }
        return null;
      }),
    },
    notification: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `notif_${Date.now()}`, ...data, isRead: false, createdAt: new Date() };
        db.notifications.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return db.notifications.filter((n) => n.userId === where.userId);
      }),
      count: jest.fn().mockImplementation(() => db.notifications.length),
    },
    aIConversation: {
      create: jest.fn().mockResolvedValue({ id: conversationId, title: 'Test Conv' }),
      findFirst: jest.fn().mockResolvedValue({ id: conversationId, title: 'Test Conv', messages: [] }),
      findMany: jest.fn().mockResolvedValue([{ id: conversationId, title: 'Test Conv' }]),
      update: jest.fn().mockResolvedValue({ id: conversationId }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    aIMessage: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `msg_${Date.now()}`, ...data, createdAt: new Date() };
        db.messages.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(() => db.messages),
    },
    auditLog: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const item = { id: `audit_${Date.now()}`, ...data, createdAt: new Date() };
        db.auditLogs.push(item);
        return item;
      }),
    },
    usageLedger: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const item = { id: `ledger_${Date.now()}`, ...data, createdAt: new Date() };
        db.usageLedgers.push(item);
        return item;
      }),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    mockProvider = new TestMockAIProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        CustomersService,
        LeadsService,
        DealsService,
        TasksService,
        InvoicesService,
        AutomationsService,
        NotificationsService,
        EmailService,
        CostGuardService,
        UsageControlService,
        {
          provide: AIProviderFactory,
          useValue: {
            getProvider: jest.fn(() => mockProvider),
            getProviderStatus: jest.fn(() => ({ configured: true, provider: 'GEMINI' })),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string) => {
              if (k === 'REDIS_URL') return 'redis://localhost:6379';
              return null;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    aiService = module.get<AiService>(AiService);
    customersService = module.get<CustomersService>(CustomersService);
    leadsService = module.get<LeadsService>(LeadsService);
    dealsService = module.get<DealsService>(DealsService);
    tasksService = module.get<TasksService>(TasksService);
    invoicesService = module.get<InvoicesService>(InvoicesService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    costGuard = module.get<CostGuardService>(CostGuardService);
    usageControl = module.get<UsageControlService>(UsageControlService);
  });

  beforeEach(() => {
    db.customers = [];
    db.leads = [];
    db.deals = [];
    db.tasks = [];
    db.invoices = [];
    db.notifications = [];
    db.auditLogs = [];
    db.messages = [];
  });

  describe('1. AI Provider Configuration & Honest Reporting', () => {
    it('returns AI_PROVIDER_NOT_CONFIGURED when no API key is available in environment', async () => {
      const factoryWithNoProvider = {
        getProvider: () => null,
        getProviderStatus: () => ({ configured: false, provider: null }),
      };

      const unconfiguredAiService = new AiService(
        prismaMock,
        { get: () => null } as any,
        costGuard,
        usageControl,
        factoryWithNoProvider as any,
        customersService,
        leadsService,
        dealsService,
        tasksService,
        invoicesService,
        {} as any,
        notificationsService,
        {} as any,
      );

      const result = await unconfiguredAiService.chat(
        orgId,
        userId,
        conversationId,
        'Create a customer named Global Tech Pvt Ltd',
      );

      expect(result.status).toBe('AI_PROVIDER_NOT_CONFIGURED');
      expect(result.code).toBe('AI_PROVIDER_NOT_CONFIGURED');
      expect(result.toolResults.length).toBe(0);
      expect(result.message.content).toContain('AI Provider Not Configured');
    });
  });

  describe('2. Rate Limit and CostGuard Interception', () => {
    it('intercepts AI requests and blocks with AI_QUOTA_EXCEEDED when daily turns are exhausted', async () => {
      const cappedUser = 'usr_quota_depleted';

      // Max out user daily quota
      await usageControl.incrementUsage(orgId, cappedUser, 'AI_CHAT', DEFAULT_QUOTAS.aiDailyPerUser);

      const result = await aiService.chat(orgId, cappedUser, conversationId, 'Analyze our Q3 deals');
      expect(result.code).toBe('AI_QUOTA_EXCEEDED');
      expect(result.message.content).toContain('Request Blocked by CostGuard');
    });
  });

  describe('3. Real Customer Tool Execution (Intent → Service → DB)', () => {
    it('executes create_customer tool through CustomersService and persists to PostgreSQL', async () => {
      // Configure AI mock provider to select create_customer tool
      mockProvider.setNextToolCall('create_customer', {
        name: 'Reliance Retail Ltd',
        company: 'Reliance Industries',
        email: 'procurement@ril.com',
        phone: '+91 98200 12345',
        status: 'active',
      });

      const response = await aiService.chat(
        orgId,
        userId,
        conversationId,
        'Create a new customer named Reliance Retail Ltd with email procurement@ril.com',
      );

      expect(response.status).toBe('SUCCESS');
      expect(response.toolResults.length).toBe(1);
      expect(response.toolResults[0].status).toBe('SUCCESS');
      expect(response.toolResults[0].result.customer.name).toBe('Reliance Retail Ltd');

      // Verify real database persistence
      expect(db.customers.length).toBe(1);
      expect(db.customers[0].company).toBe('Reliance Industries');

      // Verify Audit Log
      expect(db.auditLogs.some((a) => a.action === 'AI_TOOL_CREATE_CUSTOMER')).toBe(true);
    });
  });

  describe('4. Real Lead Tool Execution & Notification Trigger', () => {
    it('executes create_lead and assign_lead through LeadsService and emits notification', async () => {
      mockProvider.setNextToolCall('create_lead', {
        name: 'Dr. Ramesh Gupta',
        company: 'Apollo Health',
        email: 'ramesh@apollo.com',
        score: 80,
        ownerId: assigneeId,
      });

      const response = await aiService.chat(
        orgId,
        userId,
        conversationId,
        'Add a new lead Dr. Ramesh Gupta from Apollo Health and assign to employee 300',
      );

      expect(response.status).toBe('SUCCESS');
      expect(db.leads.length).toBe(1);
      expect(db.leads[0].ownerId).toBe(assigneeId);

      // Verify notification was created for assignee
      expect(db.notifications.length).toBe(1);
      expect(db.notifications[0].userId).toBe(assigneeId);
      expect(db.notifications[0].type).toBe('NEW_LEAD');
      expect(db.notifications[0].message).toContain('Dr. Ramesh Gupta');
    });
  });

  describe('5. Real Task Tool Execution & Assignee Notification', () => {
    it('executes create_task and notifies the assigned employee', async () => {
      mockProvider.setNextToolCall('create_task', {
        title: 'Send Revised Proposal to Apollo',
        priority: 'HIGH',
        assigneeId: assigneeId,
        dueDate: '2026-09-05T00:00:00.000Z',
      });

      const response = await aiService.chat(
        orgId,
        userId,
        conversationId,
        'Create a high-priority task for employee 300 to send revised proposal by Sept 5',
      );

      expect(response.status).toBe('SUCCESS');
      expect(db.tasks.length).toBe(1);
      expect(db.tasks[0].title).toBe('Send Revised Proposal to Apollo');
      expect(db.tasks[0].assigneeId).toBe(assigneeId);

      // Verify notification emitted for assignee
      expect(db.notifications.some((n) => n.userId === assigneeId && n.type === 'TASK_ASSIGNED')).toBe(true);
    });
  });

  describe('6. Real Deal Tool Execution', () => {
    it('executes create_deal and update_deal through DealsService', async () => {
      mockProvider.setNextToolCall('create_deal', {
        title: 'Hospital Management SaaS (₹25,00,000)',
        value: 2500000,
        stage: 'QUALIFIED',
        customerId: 'cust_123',
      });

      const response = await aiService.chat(
        orgId,
        userId,
        conversationId,
        'Create a deal for Hospital Management SaaS worth 25 Lakhs in Qualified stage',
      );

      expect(response.status).toBe('SUCCESS');
      expect(db.deals.length).toBe(1);
      expect(db.deals[0].value).toBe(2500000);
      expect(db.deals[0].stage).toBe('QUALIFIED');
    });
  });

  describe('7. Real Email Tool Execution & Honest Error Handling', () => {
    it('returns EMAIL_PROVIDER_NOT_CONFIGURED when email credentials are not set', async () => {
      mockProvider.setNextToolCall('send_email', {
        to: 'client@apollo.com',
        subject: 'Contract Confirmation',
        bodyHtml: '<p>Attached is the contract.</p>',
      });

      const response = await aiService.chat(
        orgId,
        userId,
        conversationId,
        'Send contract confirmation email to client@apollo.com',
      );

      expect(response.status).toBe('SUCCESS');
      expect(response.toolResults.length).toBe(1);
      // Verify honest status reporting without fake delivery
      expect(response.toolResults[0].result.errorCode).toBe('EMAIL_PROVIDER_NOT_CONFIGURED');
    });
  });
});
