import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@libs/database';
import { ItemService } from './item.service';
import { Item } from './entities/item.entity';
import { ItemGrowthStage } from './entities/item-growthstage.entity';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Item, ItemGrowthStage])],
  providers: [ItemService],
  exports: [ItemService, TypeOrmModule],
})
export class ItemModule {}
