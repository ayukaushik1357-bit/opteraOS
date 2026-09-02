import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, EmailSendResult } from './providers/email.provider';
import { SendEmailDto } from './dto/send-email.dto';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { ActorType } from '@prisma/client';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async sendEmail(
    orgId: string,
    userId: string | null,
    dto: SendEmailDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ): Promise<EmailSendResult> {
    const result = await this.emailProvider.send(dto);

    // Emit domain event and create audit log
    await this.domainEvents.emit({
      eventName: 'communication.email.sent',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'email',
      resourceId: result.messageId,
      requestId,
      source: 'communications-service',
      metadata: {
        to: dto.to,
        subject: dto.subject,
        provider: result.provider,
      },
      data: result,
    });

    return result;
  }
}
