import { Module } from '@nestjs/common';
import { PriceListsController } from './pricelists.controller';
import { PriceListsService } from './pricelists.service';

@Module({
  controllers: [PriceListsController],
  providers: [PriceListsService],
  exports: [PriceListsService],
})
export class PriceListsModule {}
