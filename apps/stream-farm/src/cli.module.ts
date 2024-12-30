import { Module } from '@nestjs/common';
import { CliService } from './services/cli.service';
import { PlayerModule } from '@libs/player';
import { FieldModule } from '@libs/field';
import { DatabaseModule } from '@libs/database';
import { ItemModule } from '@libs/item';
import { MarketplaceModule } from '@libs/marketplace';
import { MapModule } from '@libs/map'; 

@Module({
  imports: [
    DatabaseModule,
    PlayerModule,
    FieldModule,
    ItemModule,
    MarketplaceModule,
    MapModule,
  ],
  providers: [CliService],
})
export class CliModule {}
