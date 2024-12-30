import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@libs/database';
import { PlayerService } from './player.service';
import { Player } from './entities/player.entity';
import { PlayerInventory } from './entities/player-inventory.entity';
import { ItemModule } from '@libs/item';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Player, PlayerInventory]),
    ItemModule,
  ],
  providers: [PlayerService],
  exports: [PlayerService, TypeOrmModule],
})
export class PlayerModule {}
