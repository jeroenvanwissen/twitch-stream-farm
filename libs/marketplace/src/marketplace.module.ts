import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@libs/database';
import { ItemModule } from '@libs/item';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceItem } from './entities/marketplace-item.entity';
import { MarketplaceLogbook } from './entities/marketplace-logbook.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([MarketplaceItem, MarketplaceLogbook]),
    ItemModule,
  ],
  providers: [MarketplaceService],
  exports: [MarketplaceService, TypeOrmModule],
})
export class MarketplaceModule {}
