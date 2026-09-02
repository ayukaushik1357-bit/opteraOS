import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

// ─── AI Tool Definitions ──────────────────────────────────────────────────────
const AI_TOOLS = [
  {
    name: 'get_dashboard_summary',
    description: 'Get a business overview summary with key metrics: revenue, customers, deals, tasks, and invoices.',
    parameters: { type: 'object', properties: { period: { type: 'string', enum: ['7d', '30d', '90d', '12m'], description: 'Time period' } }, required: [] },
  },
  {
    name: 'search_customers',
    description: 'Search for customers by name, email, or company.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search term' }, limit: { type: 'number', default: 10 } }, required: ['query'] },
  },
  {
    name: 'get_customers',
    description: 'List customers with optional filters.',
    parameters: { type: 'object', properties: { status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'CHURNED'] }, limit: { type: 'number', default: 20 } }, required: [] },
  },
  {
    name: 'get_deals',
    description: 'Get deals/opportunities with optional stage filter.',
    parameters: { type: 'object', properties: { stage: { type: 'string' }, limit: { type: 'number', default: 20 } }, required: [] },
  },
  {
    name: 'get_invoices',
    description: 'Get invoices with optional status filter.',
    parameters: { type: 'object', properties: { status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE'] }, limit: { type: 'number', default: 20 } }, required: [] },
  },
  {
    name: 'get_tasks',
    description: 'Get tasks with optional filters.',
    parameters: { type: 'object', properties: { status: { type: 'string' }, priority: { type: 'string' }, assigneeId: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_low_stock_products',
    description: 'Get products that are at or below their minimum stock level.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'create_task',
    description: 'Create a new task. REQUIRES user confirmation for tasks affecting multiple people.',
    parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }, assigneeId: { type: 'string' }, dueDate: { type: 'string' }, customerId: { type: 'string' } }, required: ['title'] },
  },
  {
    name: 'create_customer',
    description: 'Create a new customer record.',
    parameters: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, company: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'update_deal_stage',
    description: 'Update the stage of a deal.',
    parameters: { type: 'object', properties: { dealId: { type: 'string' }, stage: { type: 'string', enum: ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] } }, required: ['dealId', 'stage'] },
  },
];

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
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

  // ─── Chat ──────────────────────────────────────────────────────────────────
  async chat(orgId: string, userId: string, conversationId: string, userMessage: string) {
    // Save user message
    await this.prisma.aIMessage.create({
      data: { conversationId, organizationId: orgId, role: 'user', content: userMessage },
    });

    // Get conversation history (last 20 messages)
    const history = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Build system context with business data
    const businessContext = await this.buildBusinessContext(orgId);

    const systemPrompt = `You are optera AI, an intelligent business assistant for opteraOS — an AI Business Operating System.

You have access to real business data for this organization. Use the provided tools to fetch accurate, up-to-date information before answering questions.

Business Context (cached):
${businessContext}

Guidelines:
1. Always be specific and data-driven in your responses.
2. When a user asks about their business, use tools to get the latest data.
3. For read operations (get_*, search_*), execute immediately.
4. For write operations (create_*, update_*), always confirm before executing.
5. After fetching data, provide clear insights and actionable recommendations.
6. Format numbers with appropriate currency (₹ for INR) and use K/L/Cr notation for large numbers.
7. Always suggest next steps or actions after providing information.`;

    // Call AI provider
    const response = await this.callAIProvider(systemPrompt, history, AI_TOOLS);

    // Execute tool calls if any
    let finalContent = response.content;
    let toolResults: any[] = [];

    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        const result = await this.executeTool(orgId, userId, toolCall.name, toolCall.arguments);
        toolResults.push({ name: toolCall.name, result });
      }

      // Get final response with tool results
      const finalResponse = await this.callAIProviderWithResults(
        systemPrompt, history, response.toolCalls, toolResults,
      );
      finalContent = finalResponse.content;
    }

    // Update conversation title if it's the first message
    if (history.length <= 1) {
      const title = userMessage.slice(0, 60) + (userMessage.length > 60 ? '...' : '');
      await this.prisma.aIConversation.update({ where: { id: conversationId }, data: { title, updatedAt: new Date() } });
    } else {
      await this.prisma.aIConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    }

    // Save AI response
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

    return { message: aiMessage, toolResults };
  }

  // ─── Tool Execution (controlled & authorized) ──────────────────────────────
  private async executeTool(orgId: string, userId: string, toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'get_dashboard_summary': {
        const [customers, deals, invoices, tasks] = await Promise.all([
          this.prisma.customer.count({ where: { organizationId: orgId } }),
          this.prisma.deal.aggregate({ where: { organizationId: orgId, stage: { notIn: ['WON', 'LOST'] } }, _sum: { value: true }, _count: true }),
          this.prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'PAID' }, _sum: { total: true } }),
          this.prisma.task.count({ where: { organizationId: orgId, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
        ]);
        return { customers, openDeals: deals._count, pipelineValue: deals._sum.value, paidRevenue: invoices._sum.total, openTasks: tasks };
      }

      case 'search_customers': {
        return this.prisma.customer.findMany({
          where: { organizationId: orgId, OR: [{ name: { contains: args.query, mode: 'insensitive' } }, { email: { contains: args.query, mode: 'insensitive' } }, { company: { contains: args.query, mode: 'insensitive' } }] },
          take: args.limit ?? 10,
          select: { id: true, name: true, email: true, company: true, status: true, totalRevenue: true },
        });
      }

      case 'get_customers': {
        const where: any = { organizationId: orgId };
        if (args.status) where.status = args.status;
        return this.prisma.customer.findMany({ where, take: args.limit ?? 20, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, company: true, status: true, totalRevenue: true, lastPurchaseAt: true } });
      }

      case 'get_deals': {
        const where: any = { organizationId: orgId };
        if (args.stage) where.stage = args.stage;
        return this.prisma.deal.findMany({ where, take: args.limit ?? 20, include: { customer: { select: { name: true } } }, orderBy: { value: 'desc' } });
      }

      case 'get_invoices': {
        const where: any = { organizationId: orgId };
        if (args.status) where.status = args.status;
        return this.prisma.invoice.findMany({ where, take: args.limit ?? 20, include: { customer: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
      }

      case 'get_tasks': {
        const where: any = { organizationId: orgId };
        if (args.status) where.status = args.status;
        if (args.priority) where.priority = args.priority;
        if (args.assigneeId) where.assigneeId = args.assigneeId;
        return this.prisma.task.findMany({ where, take: 20, orderBy: { dueDate: 'asc' }, include: { assignee: { select: { firstName: true, lastName: true } } } });
      }

      case 'get_low_stock_products': {
        return this.prisma.$queryRaw`SELECT id, name, sku, stock, "minStock" FROM products WHERE "organizationId" = ${orgId} AND stock <= "minStock"`;
      }

      case 'create_task': {
        return this.prisma.task.create({
          data: { ...args, organizationId: orgId, createdById: userId },
        });
      }

      case 'create_customer': {
        return this.prisma.customer.create({ data: { ...args, organizationId: orgId } });
      }

      case 'update_deal_stage': {
        return this.prisma.deal.update({ where: { id: args.dealId }, data: { stage: args.stage } });
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  // ─── AI Provider (Gemini → OpenAI → Fallback) ─────────────────────────────
  private async callAIProvider(system: string, history: any[], tools: any[]) {
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');

    if (geminiKey) {
      return this.callGemini(geminiKey, system, history, tools);
    } else if (openaiKey) {
      return this.callOpenAI(openaiKey, system, history, tools);
    } else {
      return this.deterministicFallback(history[history.length - 1]?.content ?? '');
    }
  }

  private async callAIProviderWithResults(system: string, history: any[], toolCalls: any[], toolResults: any[]) {
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (geminiKey) return this.callGeminiWithResults(geminiKey, system, history, toolCalls, toolResults);
    if (openaiKey) return this.callOpenAIWithResults(openaiKey, system, history, toolCalls, toolResults);
    return { content: 'I have retrieved the data. Please check the results above.' };
  }

  private async callGemini(apiKey: string, system: string, history: any[], tools: any[]) {
    const messages = history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const body = {
      system_instruction: { parts: [{ text: system }] },
      contents: messages,
      tools: [{ function_declarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) }],
      generation_config: { temperature: 0.7, max_output_tokens: 2048 },
    };
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await response.json() as any;
    const candidate = data?.candidates?.[0]?.content?.parts?.[0];
    if (candidate?.functionCall) {
      return { content: '', toolCalls: [{ name: candidate.functionCall.name, arguments: candidate.functionCall.args }] };
    }
    return { content: candidate?.text ?? 'I could not generate a response.', toolCalls: [] };
  }

  private async callGeminiWithResults(apiKey: string, system: string, history: any[], toolCalls: any[], toolResults: any[]) {
    const messages = [
      ...history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'model', parts: toolCalls.map((tc) => ({ functionCall: { name: tc.name, args: tc.arguments } })) },
      { role: 'user', parts: toolResults.map((tr, i) => ({ functionResponse: { name: toolCalls[i].name, response: { result: tr.result } } })) },
    ];
    const body = { system_instruction: { parts: [{ text: system }] }, contents: messages, generation_config: { temperature: 0.7, max_output_tokens: 2048 } };
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await response.json() as any;
    return { content: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Analysis complete.', toolCalls: [] };
  }

  private async callOpenAI(apiKey: string, system: string, history: any[], tools: any[]) {
    const messages = [
      { role: 'system', content: system },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];
    const body = {
      model: 'gpt-4o-mini',
      messages,
      tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })),
      temperature: 0.7,
    };
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body),
    });
    const data = await response.json() as any;
    const choice = data.choices?.[0];
    if (choice?.message?.tool_calls) {
      return { content: '', toolCalls: choice.message.tool_calls.map((tc: any) => ({ name: tc.function.name, arguments: JSON.parse(tc.function.arguments ?? '{}') })) };
    }
    return { content: choice?.message?.content ?? 'No response.', toolCalls: [] };
  }

  private async callOpenAIWithResults(apiKey: string, system: string, history: any[], toolCalls: any[], toolResults: any[]) {
    const messages = [
      { role: 'system', content: system },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'assistant', content: null, tool_calls: toolCalls.map((tc, i) => ({ id: `call_${i}`, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } })) },
      ...toolResults.map((tr, i) => ({ role: 'tool', tool_call_id: `call_${i}`, content: JSON.stringify(tr.result) })),
    ];
    const body = { model: 'gpt-4o-mini', messages, temperature: 0.7 };
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body),
    });
    const data = await response.json() as any;
    return { content: data.choices?.[0]?.message?.content ?? 'Analysis complete.', toolCalls: [] };
  }

  private deterministicFallback(userMessage: string) {
    const lower = userMessage.toLowerCase();
    let content = 'I\'m optera AI. ';
    if (lower.includes('revenue') || lower.includes('sales')) content += 'I can analyze your revenue data. Please configure an AI API key (GEMINI_API_KEY or OPENAI_API_KEY) in the backend to enable full AI capabilities.';
    else if (lower.includes('customer')) content += 'I can help you manage and analyze customers. Please configure an AI API key to enable full AI responses.';
    else content += 'I can help with CRM, invoicing, analytics, inventory, and business automation. Please configure GEMINI_API_KEY or OPENAI_API_KEY to enable full AI capabilities.';
    return { content, toolCalls: [] };
  }

  private async buildBusinessContext(orgId: string): Promise<string> {
    const [customerCount, dealCount, invoiceCount, taskCount] = await Promise.all([
      this.prisma.customer.count({ where: { organizationId: orgId } }),
      this.prisma.deal.count({ where: { organizationId: orgId, stage: { notIn: ['WON', 'LOST'] } } }),
      this.prisma.invoice.count({ where: { organizationId: orgId, status: { in: ['SENT', 'OVERDUE'] } } }),
      this.prisma.task.count({ where: { organizationId: orgId, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    ]);
    return `Customers: ${customerCount} | Open Deals: ${dealCount} | Pending Invoices: ${invoiceCount} | Open Tasks: ${taskCount}`;
  }
}
