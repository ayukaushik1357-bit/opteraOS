import { Module } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { EmailProvider } from './providers/email.provider';

@Module({
  controllers: [CommunicationsController],
  providers: [CommunicationsService, EmailProvider],
  exports: [CommunicationsService, EmailProvider],
})
export class CommunicationsModule {}
