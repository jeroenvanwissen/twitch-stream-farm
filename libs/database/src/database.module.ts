import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database.config';
import { DatabaseService } from './database.service';
import { Field } from '@libs/field/entities/field.entity';
import { FieldState } from '@libs/field/entities/field-state.entity';
import { Item } from '@libs/item/entities/item.entity';
import { ItemGrowthStage } from '@libs/item/entities/item-growthstage.entity';
import { Map } from '@libs/map/entities/map.entity';
import { MarketplaceItem } from '@libs/marketplace/entities/marketplace-item.entity';
import { MarketplaceLogbook } from '@libs/marketplace/entities/marketplace-logbook.entity';
import { Player } from '@libs/player/entities/player.entity';
import { PlayerInventory } from '@libs/player/entities/player-inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([
      Field,
      FieldState,
      Item,
      ItemGrowthStage,
      Map,
      MarketplaceItem,
      MarketplaceLogbook,
      Player,
      PlayerInventory,
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
