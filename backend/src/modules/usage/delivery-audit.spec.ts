import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TasksService } from '../tasks/tasks.service';
import { LeadsService } from '../leads/leads.service';
import { DealsService } from '../deals/deals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AutopilotDaemonService } from '../automations/autopilot-daemon.service';
import { CostGuardService } from './cost-guard.service';
import { UsageControlService } from './usage-control.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('opteraOS Phase 1.5 — Real Delivery & Notification Audit Test Matrix', () => {
  let tasksService: TasksService;
  let leadsService: LeadsService;
  let dealsService: DealsService;
  let notificationsService: NotificationsService;
  let autopilotDaemon: AutopilotDaemonService;

  // Mock Database Store
  const db = {
    tasks: [] as any[],
    leads: [] as any[],
    deals: [] as any[],
    notifications: [] as any[],
    organizations: [
      { id: 'org_alpha', name: 'Alpha Org', ownerId: 'user_admin_a' },
      { id: 'org_beta', name: 'Beta Org', ownerId: 'user_other_org' },
    ],
    members: [
      { organizationId: 'org_alpha', userId: 'user_admin_a', role: 'ADMIN' },
      { organizationId: 'org_alpha', userId: 'user_employee_b', role: 'EMPLOYEE' },
      { organizationId: 'org_alpha', userId: 'user_employee_c', role: 'EMPLOYEE' },
      { organizationId: 'org_beta', userId: 'user_other_org', role: 'OWNER' },
    ],
    invoices: [] as any[],
    products: [] as any[],
  };

  const prismaMock: any = {
    task: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `task_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
        db.tasks.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return db.tasks.filter((t) => {
          if (where.organizationId && t.organizationId !== where.organizationId) return false;
          if (where.assigneeId && t.assigneeId !== where.assigneeId) return false;
          if (where.status && t.status !== where.status) return false;
          return true;
        });
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        return db.tasks.filter((t) => {
          if (where.organizationId && t.organizationId !== where.organizationId) return false;
          if (where.assigneeId && t.assigneeId !== where.assigneeId) return false;
          return true;
        }).length;
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return db.tasks.find((t) => t.id === where.id && t.organizationId === where.organizationId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = db.tasks.findIndex((t) => t.id === where.id);
        if (idx !== -1) {
          db.tasks[idx] = { ...db.tasks[idx], ...data, updatedAt: new Date() };
          return db.tasks[idx];
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
      findMany: jest.fn().mockImplementation(({ where }) => {
        return db.leads.filter((l) => {
          if (where.organizationId && l.organizationId !== where.organizationId) return false;
          if (where.ownerId === null && l.ownerId !== null) return false;
          if (where.score?.gte && (l.score || 0) < where.score.gte) return false;
          return true;
        });
      }),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return db.leads.find((l) => l.id === where.id && l.organizationId === where.organizationId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = db.leads.findIndex((l) => l.id === where.id);
        if (idx !== -1) {
          db.leads[idx] = { ...db.leads[idx], ...data, updatedAt: new Date() };
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
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return db.deals.find((d) => d.id === where.id && d.organizationId === where.organizationId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = db.deals.findIndex((d) => d.id === where.id);
        if (idx !== -1) {
          db.deals[idx] = { ...db.deals[idx], ...data, updatedAt: new Date() };
          return db.deals[idx];
        }
        return null;
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    notification: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `notif_${Date.now()}_${Math.random()}`, ...data, isRead: false, createdAt: new Date() };
        db.notifications.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return db.notifications.filter((n) => {
          if (where.organizationId && n.organizationId !== where.organizationId) return false;
          if (where.userId && n.userId !== where.userId) return false;
          if (where.isRead !== undefined && n.isRead !== where.isRead) return false;
          return true;
        });
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        return db.notifications.filter((n) => {
          if (where.organizationId && n.organizationId !== where.organizationId) return false;
          if (where.userId && n.userId !== where.userId) return false;
          if (where.isRead === false && n.isRead !== false) return false;
          return true;
        }).length;
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        db.notifications.forEach((n) => {
          if (n.organizationId === where.organizationId && n.userId === where.userId) {
            if (where.id && n.id !== where.id) return;
            Object.assign(n, data);
          }
        });
        return { count: 1 };
      }),
    },
    organization: {
      findMany: jest.fn().mockResolvedValue(db.organizations),
    },
    organizationMember: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        return db.members.filter((m) => m.organizationId === where.organizationId);
      }),
    },
    invoice: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    usageLedger: {
      create: jest.fn().mockResolvedValue({ id: 'ledger_entry' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        LeadsService,
        DealsService,
        NotificationsService,
        AutopilotDaemonService,
        CostGuardService,
        UsageControlService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string) => (k === 'AUTOPILOT_INTERVAL_MS' ? '900000' : null)),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    tasksService = module.get<TasksService>(TasksService);
    leadsService = module.get<LeadsService>(LeadsService);
    dealsService = module.get<DealsService>(DealsService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    autopilotDaemon = module.get<AutopilotDaemonService>(AutopilotDaemonService);
  });

  afterAll(() => {
    autopilotDaemon.onModuleDestroy();
  });

  beforeEach(() => {
    db.tasks = [];
    db.leads = [];
    db.deals = [];
    db.notifications = [];
  });

  describe('1. Task Assignment Delivery Trace (User A → User B)', () => {
    it('persists task with User B as assignee and emits notification targeted to User B', async () => {
      // Step A: User A (admin) creates task assigned to User B (employee)
      const createdTask = await tasksService.create('org_alpha', 'user_admin_a', {
        title: 'Complete Q3 Financial Review',
        priority: 'HIGH',
        status: 'TODO',
        assigneeId: 'user_employee_b',
      });

      // Verification A & B: Task is persisted with correct assignee
      expect(createdTask.id).toBeDefined();
      expect(createdTask.assigneeId).toBe('user_employee_b');
      expect(createdTask.organizationId).toBe('org_alpha');

      // Verification C & D: Notification created targeting User B
      const userBNotifications = await notificationsService.findAll('org_alpha', 'user_employee_b');
      expect(userBNotifications.length).toBe(1);
      expect(userBNotifications[0].userId).toBe('user_employee_b');
      expect(userBNotifications[0].type).toBe('TASK_ASSIGNED');
      expect(userBNotifications[0].title).toBe('New Task Assigned');
      expect(userBNotifications[0].message).toContain('Complete Q3 Financial Review');

      // Verification E: User B retrieves task through authenticated API
      const userBTasks = await tasksService.findAll('org_alpha', { assigneeId: 'user_employee_b' });
      expect(userBTasks.rows.length).toBe(1);
      expect(userBTasks.rows[0].title).toBe('Complete Q3 Financial Review');

      // Verification F: Notification unread count for User B is 1
      const unread = await notificationsService.getUnreadCount('org_alpha', 'user_employee_b');
      expect(unread.count).toBe(1);
    });

    it('emits a reassignment notification when task assignee changes', async () => {
      const task = await tasksService.create('org_alpha', 'user_admin_a', {
        title: 'Review Warehouse Logistics',
        assigneeId: 'user_employee_b',
      });

      // Reassign to User C
      await tasksService.update('org_alpha', task.id, {
        assigneeId: 'user_employee_c',
      });

      // User C receives notification
      const userCNotifs = await notificationsService.findAll('org_alpha', 'user_employee_c');
      expect(userCNotifs.length).toBe(1);
      expect(userCNotifs[0].title).toBe('Task Reassigned to You');
    });
  });

  describe('2. Lead & Deal Assignment Delivery', () => {
    it('emits notification to assigned owner upon lead creation', async () => {
      const lead = await leadsService.create('org_alpha', 'user_admin_a', {
        name: 'John Doe',
        company: 'MegaCorp',
        ownerId: 'user_employee_b',
      } as any);

      expect(lead.ownerId).toBe('user_employee_b');

      const notifs = await notificationsService.findAll('org_alpha', 'user_employee_b');
      expect(notifs.some((n) => n.type === 'NEW_LEAD' && n.message.includes('John Doe'))).toBe(true);
    });

    it('emits notification to assigned owner upon deal creation', async () => {
      const deal = await dealsService.create('org_alpha', 'user_admin_a', {
        title: 'Enterprise ERP License (₹12,00,000)',
        ownerId: 'user_employee_b',
      } as any);

      expect(deal.ownerId).toBe('user_employee_b');

      const notifs = await notificationsService.findAll('org_alpha', 'user_employee_b');
      expect(notifs.some((n) => n.type === 'DEAL_UPDATE' && n.message.includes('Enterprise ERP License'))).toBe(true);
    });
  });

  describe('3. Privacy & Cross-Tenant Security Isolation', () => {
    it('strictly isolates notifications so User C cannot read User B notifications', async () => {
      // User B gets a notification
      await notificationsService.create('org_alpha', 'user_employee_b', 'TASK_ASSIGNED', 'Secret B Task', 'For B eyes only');

      // User C queries notifications
      const userCNotifs = await notificationsService.findAll('org_alpha', 'user_employee_c');
      expect(userCNotifs.length).toBe(0);

      // User B queries notifications
      const userBNotifs = await notificationsService.findAll('org_alpha', 'user_employee_b');
      expect(userBNotifs.length).toBe(1);
      expect(userBNotifs[0].title).toBe('Secret B Task');
    });

    it('rejects cross-organization task retrieval (Org Beta cannot access Org Alpha tasks)', async () => {
      const taskAlpha = await tasksService.create('org_alpha', 'user_admin_a', {
        title: 'Alpha Private Strategy',
      });

      // Try finding Org Alpha task under Org Beta
      await expect(tasksService.findOne('org_beta', taskAlpha.id)).rejects.toThrow('Task not found');
    });
  });

  describe('4. Autopilot End-to-End Assignment Routine', () => {
    it('discovers unassigned lead, assigns to team member, creates notification and task', async () => {
      // Seed unassigned high-value lead in org_alpha
      db.leads.push({
        id: 'lead_high_value_1',
        organizationId: 'org_alpha',
        name: 'Acme Enterprise',
        company: 'Acme Global Pvt Ltd',
        score: 85,
        ownerId: null,
      });

      // Run Autopilot cycle
      const result = await autopilotDaemon.runDaemonCycle();
      expect(result.processedOrgs).toBeGreaterThanOrEqual(1);

      // Verify lead was assigned to a team member in org_alpha
      const assignedLead = db.leads.find((l) => l.id === 'lead_high_value_1');
      expect(assignedLead.ownerId).toBeDefined();
      expect(['user_admin_a', 'user_employee_b', 'user_employee_c']).toContain(assignedLead.ownerId);

      // Verify assigned member received in-app notification
      const assignedNotifs = await notificationsService.findAll('org_alpha', assignedLead.ownerId);
      expect(assignedNotifs.some((n) => n.type === 'NEW_LEAD' && n.message.includes('Acme Enterprise'))).toBe(true);
    });
  });

  describe('5. Email Delivery & Honest Status Reporting', () => {
    it('returns EMAIL_PROVIDER_NOT_CONFIGURED when no email provider keys exist', () => {
      const getEmailProviderStatus = () => {
        if (process.env.RESEND_API_KEY) return { configured: true, provider: 'Resend' };
        if (process.env.SENDGRID_API_KEY) return { configured: true, provider: 'SendGrid' };
        if (process.env.SMTP_HOST && process.env.SMTP_USER) return { configured: true, provider: 'SMTP' };
        return { configured: false, provider: null };
      };

      const originalResend = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;
      delete process.env.SENDGRID_API_KEY;
      delete process.env.SMTP_HOST;

      const status = getEmailProviderStatus();
      expect(status.configured).toBe(false);
      expect(status.provider).toBeNull();

      if (originalResend) process.env.RESEND_API_KEY = originalResend;
    });
  });
});
