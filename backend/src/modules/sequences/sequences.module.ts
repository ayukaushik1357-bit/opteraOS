import { Module } from '@nestjs/common';
import { SequencesService } from './sequences.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SequencesService],
  exports: [SequencesService],
})
export class SequencesModule {}
