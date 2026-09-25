import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CostGuardService } from '../usage/cost-guard.service';
import { UsageControlService } from '../usage/usage-control.service';
import { AIProviderFactory } from './providers/ai-provider.factory';
import { CustomersService } from '../customers/customers.service';
import { LeadsService } from '../leads/leads.service';
import { DealsService } from '../deals/deals.service';
import { TasksService } from '../tasks/tasks.service';
import { InvoicesService } from '../invoices/invoices.service';
import { AutomationsService } from '../automations/automations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

// ─── AI Tool Definitions for Business Operations ─────────────────────────────
export const AI_TOOLS = [
  {
    name: 'get_dashboard_summary',
    description: 'Get a business overview summary with key metrics: revenue, customers, deals, tasks, and invoices.',
    parameters: {
      type: 'object',
      properties: { period: { type: 'string', enum: ['7d', '30d', '90d', '12m'], description: 'Time period' } },
      required: [],
    },
  },
  {
    name: 'search_customers',
    description: 'Search for customers by name, email, or company.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search term' }, limit: { type: 'number', default: 10 } },
      required: ['query'],
    },
  },
  {
    name: 'get_customer',
    description: 'Get detailed information for a specific customer by ID.',
    parameters: {
      type: 'object',
      properties: { customerId: { type: 'string', description: 'Customer UUID' } },
      required: ['customerId'],
    },
  },
  {
    name: 'create_customer',
    description: 'Create a new customer record in the CRM.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Customer full name or contact name' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        company: { type: 'string', description: 'Company name' },
        status: { type: 'string', enum: ['active', 'prospect', 'churned'], default: 'prospect' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_customer',
    description: 'Update an existing customer record.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer UUID' },
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        company: { type: 'string' },
        status: { type: 'string', enum: ['active', 'prospect', 'churned'] },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'search_leads',
    description: 'Search and filter leads in the pipeline.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search name, email, or company' },
        stage: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'] },
        limit: { type: 'number', default: 20 },
      },
      required: [],
    },
  },
  {
    name: 'get_lead',
    description: 'Get detailed information for a specific lead.',
    parameters: {
      type: 'object',
      properties: { leadId: { type: 'string', description: 'Lead UUID' } },
      required: ['leadId'],
    },
  },
  {
    name: 'create_lead',
    description: 'Create a new lead opportunity.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Lead contact name' },
        company: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        stage: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'], default: 'NEW' },
        score: { type: 'number', description: 'Lead quality score (0-100)', default: 50 },
        ownerId: { type: 'string', description: 'Assigned employee user ID' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_lead',
    description: 'Update a lead stage or details.',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        stage: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'] },
        score: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['leadId'],
    },
  },
  {
    name: 'assign_lead',
    description: 'Assign a lead to a team member (emits in-app notification).',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        ownerId: { type: 'string', description: 'Team member user ID to assign' },
      },
      required: ['leadId', 'ownerId'],
    },
  },
  {
    name: 'search_deals',
    description: 'Search deals/opportunities in the sales pipeline.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        stage: { type: 'string', enum: ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] },
        limit: { type: 'number', default: 20 },
      },
      required: [],
    },
  },
  {
    name: 'get_deal',
    description: 'Get details for a specific deal.',
    parameters: {
      type: 'object',
      properties: { dealId: { type: 'string' } },
      required: ['dealId'],
    },
  },
  {
    name: 'create_deal',
    description: 'Create a new sales deal.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Deal name/title' },
        value: { type: 'number', description: 'Monetary value' },
        stage: { type: 'string', enum: ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'], default: 'NEW' },
        customerId: { type: 'string', description: 'Associated customer UUID' },
        ownerId: { type: 'string', description: 'Assigned employee user ID' },
      },
      required: ['title', 'customerId'],
    },
  },
  {
    name: 'update_deal',
    description: 'Update deal stage or monetary value.',
    parameters: {
      type: 'object',
      properties: {
        dealId: { type: 'string' },
        stage: { type: 'string', enum: ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] },
        value: { type: 'number' },
      },
      required: ['dealId'],
    },
  },
  {
    name: 'search_tasks',
    description: 'Search tasks with status and assignee filters.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        assigneeId: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new operational task and optionally assign to an employee.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
        assigneeId: { type: 'string', description: 'Assigned team member user ID' },
        dueDate: { type: 'string', description: 'ISO date string' },
        customerId: { type: 'string' },
        dealId: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update task properties or reassign.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        assigneeId: { type: 'string' },
        dueDate: { type: 'string' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'assign_task',
    description: 'Assign or reassign a task to an employee (emits notification).',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        assigneeId: { type: 'string' },
      },
      required: ['taskId', 'assigneeId'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as COMPLETED.',
    parameters: {
      type: 'object',
      properties: { taskId: { type: 'string' } },
      required: ['taskId'],
    },
  },
  {
    name: 'search_invoices',
    description: 'Search and list invoices with status filter.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] },
        customerId: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'get_invoice',
    description: 'Get invoice details including line items.',
    parameters: {
      type: 'object',
      properties: { invoiceId: { type: 'string' } },
      required: ['invoiceId'],
    },
  },
  {
    name: 'create_invoice',
    description: 'Create a new invoice for a customer.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string' },
        dueDate: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unitPrice: { type: 'number' },
              taxRate: { type: 'number' },
            },
            required: ['name', 'quantity', 'unitPrice'],
          },
        },
        notes: { type: 'string' },
      },
      required: ['customerId', 'items'],
    },
  },
  {
    name: 'send_email',
    description: 'Send a transactional email to a customer or team member.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        bodyHtml: { type: 'string', description: 'HTML email body' },
      },
      required: ['to', 'subject', 'bodyHtml'],
    },
  },
  {
    name: 'create_autopilot',
    description: 'Create a new background automation workflow.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        triggerType: { type: 'string', default: 'SCHEDULE' },
      },
      required: ['name'],
    },
  },
  {
    name: 'pause_autopilot',
    description: 'Pause an active automation workflow.',
    parameters: {
      type: 'object',
      properties: { workflowId: { type: 'string' } },
      required: ['workflowId'],
    },
  },
  {
    name: 'resume_autopilot',
    description: 'Resume a paused automation workflow.',
    parameters: {
      type: 'object',
      properties: { workflowId: { type: 'string' } },
      required: ['workflowId'],
    },
  },
  {
    name: 'run_autopilot',
    description: 'Trigger immediate execution of an automation workflow.',
    parameters: {
      type: 'object',
      properties: { workflowId: { type: 'string' } },
      required: ['workflowId'],
    },
  },
  {
    name: 'get_low_stock_products',
    description: 'Get products that are at or below minimum inventory levels.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private costGuard: CostGuardService,
    private usageControl: UsageControlService,
    private providerFactory: AIProviderFactory,
    private customersService: CustomersService,
    private leadsService: LeadsService,
    private dealsService: DealsService,
    private tasksService: TasksService,
    private invoicesService: InvoicesService,
    private automationsService: AutomationsService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  // ─── Conversations ─────────────────────────────────────────────────────────
  async listConversations(orgId: string, userId: string) {
    return this.prisma.aIConversation.findMany({
      where: { organizationId: orgId, userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async createConversation(orgId: string, userId: string, title?: string) {
    return this.prisma.aIConversation.create({
      data: { organizationId: orgId, userId, title: title ?? 'New Conversation' },
    });
  }

  async getConversation(orgId: string, userId: string, id: string) {
    return this.prisma.aIConversation.findFirst({
      where: { id, organizationId: orgId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async renameConversation(orgId: string, userId: string, id: string, title: string) {
    return this.prisma.aIConversation.updateMany({
      where: { id, organizationId: orgId, userId },
      data: { title },
    });
  }

  async deleteConversation(orgId: string, userId: string, id: string) {
    await this.prisma.aIConversation.deleteMany({ where: { id, organizationId: orgId, userId } });
    return { message: 'Conversation deleted' };
  }

  // ─── Main Chat Handler (with Domain Tool Routing) ──────────────────────────
  async chat(orgId: string, userId: string, conversationId: string, userMessage: string) {
    // 1. Save user message
    await this.prisma.aIMessage.create({
      data: { conversationId, organizationId: orgId, role: 'user', content: userMessage },
    });

    // 2. Pre-flight CostGuard budget check (Rate limit & Quota enforcement)
    const budgetCheck = await this.costGuard.evaluateBudget(orgId, userId, 'AI_CHAT');
    if (!budgetCheck.allowed) {
      const blockedMsg = await this.prisma.aIMessage.create({
        data: {
          conversationId,
          organizationId: orgId,
          role: 'assistant',
          content: `⚠️ **Request Blocked by CostGuard**: ${budgetCheck.error}\n\nDaily query quota has been reached. Quotas reset at UTC midnight.`,
        },
      });
      return {
        message: blockedMsg,
        toolResults: [],
        status: 'AI_QUOTA_EXCEEDED',
        code: 'AI_QUOTA_EXCEEDED',
        error: budgetCheck.error,
      };
    }

    // 3. Resolve active AI Provider
    const provider = this.providerFactory.getProvider();
    if (!provider) {
      this.logger.warn('🛑 AI Provider Unconfigured. Halting request without mock output.');
      const unconfiguredMsg = await this.prisma.aIMessage.create({
        data: {
          conversationId,
          organizationId: orgId,
          role: 'assistant',
          content:
            '⚠️ **AI Provider Not Configured**\n\nNo production AI provider credentials were found. Please configure `GEMINI_API_KEY` (recommended) or `OPENAI_API_KEY` in your environment variables to enable generative business AI operations.',
        },
      });

      await this.costGuard.recordUsage({
        organizationId: orgId,
        userId,
        operation: 'AI_CHAT',
        provider: 'NONE',
        service: 'chat',
        requestCount: 1,
        tokensUsed: 0,
        estimatedCost: 0,
        status: 'BLOCKED_BY_CONFIGURATION',
      });

      return {
        message: unconfiguredMsg,
        toolResults: [],
        status: 'AI_PROVIDER_NOT_CONFIGURED',
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        error: 'AI_PROVIDER_NOT_CONFIGURED: Set GEMINI_API_KEY or OPENAI_API_KEY in .env',
      };
    }

    // 4. Retrieve conversation history (capped at 15 messages for cost control)
    let history: any[] = [];
    try {
      history = await this.prisma.aIMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 15,
      });
    } catch {}

    if (!history.length || history[history.length - 1].content !== userMessage) {
      history.push({ role: 'user', content: userMessage });
    }

    // 5. Build tenant-isolated business context
    const businessContext = await this.buildBusinessContext(orgId);
    const systemPrompt = `You are optera AI, an intelligent business operating system assistant.
You have access to real business tools. Execute real operations using the provided tools.

Business Context (Tenant Isolated):
${businessContext}

Execution Rules:
1. When asked to perform an action (create customer, assign lead, make invoice, send email), select the appropriate tool.
2. For read operations, execute immediately.
3. For destructive operations (e.g. mass deletion), ask the user for confirmation first.
4. When a multi-step operation is requested, execute tools sequentially and report the exact status of each step.
5. Never fabricate success when a tool fails. Report the actual backend result accurately.`;

    try {
      // 6. Call Provider for Intent & Tool Selection
      const response = await provider.generateContent(systemPrompt, history, AI_TOOLS);

      let finalContent = response.content;
      const toolResults: Array<{ name: string; result: any; status: 'SUCCESS' | 'FAILED'; error?: string }> = [];

      // 7. Execute Domain Service Tools if requested (capped at 5 tools to prevent runaway loops)
      if (response.toolCalls && response.toolCalls.length > 0) {
        const safeCalls = response.toolCalls.slice(0, 5);

        for (const toolCall of safeCalls) {
          const startTime = Date.now();
          let result: any;
          let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
          let errorMessage: string | undefined;

          try {
            result = await this.executeDomainTool(orgId, userId, toolCall.name, toolCall.arguments);
          } catch (err: any) {
            status = 'FAILED';
            errorMessage = err.message || 'Tool execution failed';
            result = { error: errorMessage, success: false };
            this.logger.error(`AI Tool ${toolCall.name} failed: ${errorMessage}`);
          }

          const latency = Date.now() - startTime;
          toolResults.push({ name: toolCall.name, result, status, error: errorMessage });

          // Record Tool Audit Log
          try {
            await this.prisma.auditLog.create({
              data: {
                organizationId: orgId,
                userId,
                action: `AI_TOOL_${toolCall.name.toUpperCase()}`,
                resource: 'AI_AGENT',
                resourceId: conversationId,
                metadata: {
                  tool: toolCall.name,
                  arguments: toolCall.arguments,
                  status,
                  latencyMs: latency,
                  error: errorMessage,
                },
              },
            });
          } catch {}
        }

        // 8. Re-invoke Provider with real domain execution results to synthesize truthful response
        const resultResponse = await provider.generateContentWithResults(
          systemPrompt,
          history,
          safeCalls,
          toolResults,
        );
        finalContent = resultResponse.content;
      }

      // 9. Record real token consumption in UsageLedger
      await this.costGuard.recordUsage({
        organizationId: orgId,
        userId,
        operation: 'AI_CHAT',
        provider: response.provider,
        service: 'chat',
        requestCount: 1,
        tokensUsed: response.tokensUsed || 400,
        estimatedCost: response.estimatedCost || 0.0005,
        status: 'SUCCESS',
      });

      // 10. Update conversation title if first message
      if (history.length <= 1) {
        const title = userMessage.slice(0, 60) + (userMessage.length > 60 ? '...' : '');
        await this.prisma.aIConversation.update({
          where: { id: conversationId },
          data: { title, updatedAt: new Date() },
        });
      } else {
        await this.prisma.aIConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
      }

      // 11. Save AI Response
      const aiMessage = await this.prisma.aIMessage.create({
        data: {
          conversationId,
          organizationId: orgId,
          role: 'assistant',
          content: finalContent,
          toolCalls: response.toolCalls ?? undefined,
          toolResults: toolResults.length > 0 ? toolResults : undefined,
        },
      });

      return {
        message: aiMessage,
        toolResults,
        status: 'SUCCESS',
      };
    } catch (err: any) {
      this.logger.error(`AI execution failure: ${err.message}`);

      const errMessage = await this.prisma.aIMessage.create({
        data: {
          conversationId,
          organizationId: orgId,
          role: 'assistant',
          content: `⚠️ **AI Execution Error**: ${err.message}`,
        },
      });

      await this.costGuard.recordUsage({
        organizationId: orgId,
        userId,
        operation: 'AI_CHAT',
        provider: provider.name,
        service: 'chat',
        requestCount: 1,
        tokensUsed: 0,
        estimatedCost: 0,
        status: 'FAILED',
      });

      return {
        message: errMessage,
        toolResults: [],
        status: 'AI_TOOL_FAILED',
        error: err.message,
      };
    }
  }

  // ─── Real Domain Tool Router (Strictly calls Domain Services) ──────────────
  private async executeDomainTool(orgId: string, userId: string, toolName: string, args: any): Promise<any> {
    switch (toolName) {
      // ── Dashboard ──────────────────────────────────────────────────────────
      case 'get_dashboard_summary': {
        const [customers, deals, invoices, tasks] = await Promise.all([
          this.prisma.customer.count({ where: { organizationId: orgId } }),
          this.prisma.deal.aggregate({ where: { organizationId: orgId, stage: { notIn: ['WON', 'LOST'] } }, _sum: { value: true }, _count: true }),
          this.prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'PAID' }, _sum: { total: true } }),
          this.prisma.task.count({ where: { organizationId: orgId, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
        ]);
        return {
          totalCustomers: customers,
          openDeals: deals._count,
          pipelineValue: deals._sum.value || 0,
          paidRevenue: invoices._sum.total || 0,
          openTasks: tasks,
        };
      }

      // ── Customers ──────────────────────────────────────────────────────────
      case 'search_customers': {
        return this.customersService.findAll(orgId, {
          search: args.query,
          pageSize: args.limit || 10,
        } as any);
      }

      case 'get_customer': {
        return this.customersService.findOne(orgId, args.customerId);
      }

      case 'create_customer': {
        const created = await this.customersService.create(orgId, {
          name: args.name,
          email: args.email,
          phone: args.phone,
          company: args.company,
          status: args.status || 'prospect',
        } as any);
        return { success: true, customer: created, message: `Customer "${created.name}" created successfully.` };
      }

      case 'update_customer': {
        const updated = await this.customersService.update(orgId, args.customerId, args);
        return { success: true, customer: updated, message: `Customer updated successfully.` };
      }

      // ── Leads ──────────────────────────────────────────────────────────────
      case 'search_leads': {
        return this.leadsService.findAll(orgId, {
          search: args.search,
          stage: args.stage,
          pageSize: args.limit || 20,
        });
      }

      case 'get_lead': {
        return this.leadsService.findOne(orgId, args.leadId);
      }

      case 'create_lead': {
        const created = await this.leadsService.create(orgId, userId, {
          name: args.name,
          company: args.company,
          email: args.email,
          phone: args.phone,
          stage: args.stage || 'NEW',
          score: args.score || 50,
          ownerId: args.ownerId,
        } as any);
        return { success: true, lead: created, message: `Lead "${created.name}" created successfully.` };
      }

      case 'update_lead': {
        const updated = await this.leadsService.update(orgId, args.leadId, args);
        return { success: true, lead: updated, message: `Lead updated successfully.` };
      }

      case 'assign_lead': {
        const updated = await this.leadsService.update(orgId, args.leadId, { ownerId: args.ownerId });
        return { success: true, lead: updated, message: `Lead assigned successfully to user ${args.ownerId}.` };
      }

      // ── Deals ──────────────────────────────────────────────────────────────
      case 'search_deals': {
        return this.dealsService.findAll(orgId, {
          search: args.search,
          stage: args.stage,
          pageSize: args.limit || 20,
        });
      }

      case 'get_deal': {
        return this.dealsService.findOne(orgId, args.dealId);
      }

      case 'create_deal': {
        const created = await this.dealsService.create(orgId, userId, {
          title: args.title,
          value: args.value || 0,
          stage: args.stage || 'NEW',
          customerId: args.customerId,
          ownerId: args.ownerId,
        } as any);
        return { success: true, deal: created, message: `Deal "${created.title}" created successfully.` };
      }

      case 'update_deal': {
        const updated = await this.dealsService.update(orgId, args.dealId, args);
        return { success: true, deal: updated, message: `Deal updated successfully.` };
      }

      // ── Tasks ──────────────────────────────────────────────────────────────
      case 'search_tasks': {
        return this.tasksService.findAll(orgId, args);
      }

      case 'get_task': {
        return this.tasksService.findOne(orgId, args.taskId);
      }

      case 'create_task': {
        const created = await this.tasksService.create(orgId, userId, {
          title: args.title,
          description: args.description,
          priority: args.priority || 'MEDIUM',
          assigneeId: args.assigneeId,
          dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
          customerId: args.customerId,
          dealId: args.dealId,
        });
        return { success: true, task: created, message: `Task "${created.title}" created successfully.` };
      }

      case 'update_task': {
        const updated = await this.tasksService.update(orgId, args.taskId, args);
        return { success: true, task: updated, message: `Task updated successfully.` };
      }

      case 'assign_task': {
        const updated = await this.tasksService.update(orgId, args.taskId, { assigneeId: args.assigneeId });
        return { success: true, task: updated, message: `Task assigned successfully.` };
      }

      case 'complete_task': {
        const completed = await this.tasksService.complete(orgId, args.taskId);
        return { success: true, task: completed, message: `Task marked as COMPLETED.` };
      }

      // ── Invoices ───────────────────────────────────────────────────────────
      case 'search_invoices': {
        return this.invoicesService.findAll(orgId, args);
      }

      case 'get_invoice': {
        return this.invoicesService.findOne(orgId, args.invoiceId);
      }

      case 'create_invoice': {
        const created = await this.invoicesService.create(orgId, args);
        return { success: true, invoice: created, message: `Invoice ${created.invoiceNumber} created.` };
      }

      case 'update_invoice': {
        const updated = await this.invoicesService.update(orgId, args.invoiceId, args);
        return { success: true, invoice: updated, message: `Invoice updated.` };
      }

      // ── Email (Channel 3 with CostGuard Check) ─────────────────────────────
      case 'send_email': {
        // Pre-flight Email quota check
        const emailQuota = await this.costGuard.evaluateBudget(orgId, userId, 'EMAIL_SEND');
        if (!emailQuota.allowed) {
          return { success: false, error: emailQuota.error, code: 'EMAIL_QUOTA_EXCEEDED' };
        }

        const emailResult = await this.emailService.send({
          to: args.to,
          subject: args.subject,
          html: args.bodyHtml,
        });

        if (emailResult.success) {
          await this.costGuard.recordUsage({
            organizationId: orgId,
            userId,
            operation: 'EMAIL_SEND',
            provider: emailResult.provider || 'SMTP',
            service: 'transactional_email',
            requestCount: 1,
            tokensUsed: 0,
            estimatedCost: 0.0001,
            status: 'SUCCESS',
          });
          return { success: true, messageId: emailResult.messageId, message: `Email sent successfully to ${args.to}.` };
        }

        await this.costGuard.recordUsage({
          organizationId: orgId,
          userId,
          operation: 'EMAIL_SEND',
          provider: 'EMAIL_SERVICE',
          service: 'transactional_email',
          status: emailResult.errorCode === 'EMAIL_PROVIDER_NOT_CONFIGURED' ? 'BLOCKED_BY_CONFIGURATION' : 'FAILED',
        });

        return {
          success: false,
          error: emailResult.error || 'Failed to send email',
          errorCode: emailResult.errorCode,
        };
      }

      // ── Autopilot & Workflows ──────────────────────────────────────────────
      case 'create_autopilot': {
        const created = await this.automationsService.create(orgId, {
          name: args.name,
          description: args.description,
          triggerType: args.triggerType || 'SCHEDULE',
        });
        return { success: true, workflow: created, message: `Autopilot workflow "${created.name}" created.` };
      }

      case 'pause_autopilot': {
        const paused = await this.automationsService.pause(orgId, args.workflowId);
        return { success: true, workflow: paused, message: `Autopilot workflow paused.` };
      }

      case 'resume_autopilot': {
        const resumed = await this.automationsService.resume(orgId, args.workflowId);
        return { success: true, workflow: resumed, message: `Autopilot workflow resumed.` };
      }

      case 'run_autopilot': {
        const result = await this.automationsService.execute(orgId, args.workflowId);
        return { success: true, execution: result, message: `Autopilot workflow executed.` };
      }

      case 'get_low_stock_products': {
        const lowStock: any[] = await this.prisma.$queryRaw`
          SELECT id, name, sku, stock, "minStock" FROM products WHERE "organizationId" = ${orgId} AND stock <= "minStock"
        `;
        return { products: lowStock, count: lowStock.length };
      }

      default:
        throw new Error(`Unknown AI Tool: "${toolName}"`);
    }
  }

  private async buildBusinessContext(orgId: string): Promise<string> {
    const [customerCount, dealCount, invoiceCount, taskCount] = await Promise.all([
      this.prisma.customer.count({ where: { organizationId: orgId } }),
      this.prisma.deal.count({ where: { organizationId: orgId, stage: { notIn: ['WON', 'LOST'] } } }),
      this.prisma.invoice.count({ where: { organizationId: orgId, status: { in: ['SENT', 'OVERDUE'] } } }),
      this.prisma.task.count({ where: { organizationId: orgId, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    ]);
    return `Active Customers: ${customerCount} | Open Deals: ${dealCount} | Pending Invoices: ${invoiceCount} | Open Tasks: ${taskCount}`;
  }
}
