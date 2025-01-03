import { Module } from '@nestjs/common';
import { TwitchService } from './twitch.service';
import { FieldModule } from '@libs/field';
import { PlayerModule } from '@libs/player';
import { MarketplaceModule } from '@libs/marketplace';

@Module({
  imports: [FieldModule, PlayerModule, MarketplaceModule],
  providers: [TwitchService],
  exports: [TwitchService],
})
export class TwitchModule {}
