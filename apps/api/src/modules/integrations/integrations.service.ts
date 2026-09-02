import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const AVAILABLE_INTEGRATIONS = [
  { type: 'razorpay', name: 'Razorpay', category: 'payments', description: 'Accept customer invoice payments', icon: 'razorpay' },
  { type: 'n8n', name: 'n8n', category: 'automation', description: 'Visual workflow automation and API integrations', icon: 'n8n' },
  { type: 'gmail', name: 'Gmail', category: 'communication', description: 'Send and receive emails from Gmail', icon: 'gmail' },
  { type: 'whatsapp', name: 'WhatsApp Business', category: 'communication', description: 'Send automated WhatsApp messages', icon: 'whatsapp' },
  { type: 'slack', name: 'Slack', category: 'communication', description: 'Send alerts and notifications to Slack', icon: 'slack' },
  { type: 'google_calendar', name: 'Google Calendar', category: 'productivity', description: 'Sync tasks and meetings with Google Calendar', icon: 'google_calendar' },
  { type: 'stripe', name: 'Stripe', category: 'payments', description: 'Accept global payments (USD/EUR)', icon: 'stripe' },
  { type: 'webhook', name: 'Webhooks', category: 'developer', description: 'Send real-time events to external systems', icon: 'webhook' },
];

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    const connected = await this.prisma.integration.findMany({ where: { organizationId: orgId } });
    return AVAILABLE_INTEGRATIONS.map((avail) => {
      const existing = connected.find((c) => c.type === avail.type);
      return { ...avail, isActive: existing?.isActive ?? false, connectedAt: existing?.createdAt, errorMessage: existing?.errorMessage };
    });
  }

  async connect(orgId: string, type: string, config: any) {
    return this.prisma.integration.upsert({
      where: { organizationId_type: { organizationId: orgId, type } },
      update: { isActive: true, config, errorMessage: null },
      create: { organizationId: orgId, type, name: type, isActive: true, config },
    });
  }

  async disconnect(orgId: string, type: string) {
    await this.prisma.integration.updateMany({ where: { organizationId: orgId, type }, data: { isActive: false } });
    return { message: `${type} disconnected` };
  }
}
