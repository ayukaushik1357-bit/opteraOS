import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';

@Module({
  imports: [NotificationsModule],
  controllers: [LeadsController],
  providers: [LeadsService, OrgMemberGuard],
  exports: [LeadsService],
})
export class LeadsModule {}
