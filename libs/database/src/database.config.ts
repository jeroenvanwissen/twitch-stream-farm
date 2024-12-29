import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Player } from '@libs/player/entities/player.entity';
import { PlayerInventory } from '@libs/player/entities/player-inventory.entity';
import { Item } from '@libs/item/entities/item.entity';
import { ItemGrowthStage } from '@libs/item/entities/item-growthstage.entity';
import { Map } from '@libs/map/entities/map.entity';
import { Field } from '@libs/field/entities/field.entity';
import { FieldState } from '@libs/field/entities/field-state.entity';
import { MarketplaceItem } from '@libs/marketplace/entities/marketplace-item.entity';
import { MarketplaceLogbook } from '@libs/marketplace/entities/marketplace-logbook.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER || 'username',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: process.env.POSTGRES_DB || 'stream-farm',
  entities: [
    Player,
    PlayerInventory,
    Item,
    ItemGrowthStage,
    Map,
    MarketplaceItem,
    MarketplaceLogbook,
    Field,
    FieldState,
  ],
  synchronize: process.env.NODE_ENV !== 'production',
  autoLoadEntities: true,
  logging: ['error', 'warn', 'schema'],
};
