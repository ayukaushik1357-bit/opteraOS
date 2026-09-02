import { Module } from '@nestjs/common';
import { PricelistsService } from './pricelists.service';
import { PricelistsController } from './pricelists.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PricelistsController],
  providers: [PricelistsService],
  exports: [PricelistsService],
})
export class PricelistsModule {}
