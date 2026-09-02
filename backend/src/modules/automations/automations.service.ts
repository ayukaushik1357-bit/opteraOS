import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AutomationsService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async findAll(orgId: string, query: any = {}) {
    const { status } = query;
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    return this.prisma.workflow.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { executions: true } } } });
  }

  async findOne(orgId: string, id: string) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, organizationId: orgId }, include: { executions: { orderBy: { createdAt: 'desc' }, take: 20 } } });
    if (!wf) throw new NotFoundException('Workflow not found');
    return wf;
  }

  async create(orgId: string, dto: any) {
    return this.prisma.workflow.create({ data: { ...dto, organizationId: orgId, status: 'ACTIVE' } });
  }

  async update(orgId: string, id: string, dto: any) {
    await this.findOne(orgId, id);
    return this.prisma.workflow.update({ where: { id }, data: dto });
  }

  async pause(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.workflow.update({ where: { id }, data: { status: 'PAUSED' } });
  }

  async resume(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.workflow.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.workflow.delete({ where: { id } });
    return { message: 'Workflow deleted' };
  }

  async execute(orgId: string, id: string, triggerData?: any) {
    const workflow = await this.findOne(orgId, id);
    if (workflow.status === 'PAUSED') return { error: 'Workflow is paused' };

    const execution = await this.prisma.workflowExecution.create({
      data: { organizationId: orgId, workflowId: id, status: 'RUNNING', triggerData, startedAt: new Date() },
    });

    // Trigger n8n if configured
    const n8nUrl = this.config.get('N8N_WEBHOOK_BASE_URL');
    if (n8nUrl && workflow.n8nWorkflowId) {
      try {
        const resp = await fetch(`${n8nUrl}/${workflow.n8nWorkflowId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, workflowId: id, executionId: execution.id, triggerData }),
        });
        const result = await resp.json();
        await this.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: { status: 'COMPLETED', result, completedAt: new Date() },
        });
        await this.prisma.workflow.update({ where: { id }, data: { lastRunAt: new Date(), runCount: { increment: 1 } } });
        return { execution, result };
      } catch (err: any) {
        await this.prisma.workflowExecution.update({ where: { id: execution.id }, data: { status: 'FAILED', error: err.message, completedAt: new Date() } });
        await this.prisma.workflow.update({ where: { id }, data: { errorCount: { increment: 1 } } });
        return { execution, error: err.message };
      }
    }

    // Simulate execution for demo
    await this.prisma.workflowExecution.update({ where: { id: execution.id }, data: { status: 'COMPLETED', completedAt: new Date(), result: { message: 'Executed successfully (no n8n)' } } });
    await this.prisma.workflow.update({ where: { id }, data: { lastRunAt: new Date(), runCount: { increment: 1 } } });
    return { execution, message: 'Workflow executed' };
  }

  async getExecutions(orgId: string, id: string) {
    return this.prisma.workflowExecution.findMany({ where: { workflowId: id, organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
}
