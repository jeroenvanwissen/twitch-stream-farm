import { Module } from '@nestjs/common';
import { TwitchService } from './twitch.service';
import { FieldModule } from '@libs/field';
import { PlayerModule } from '@libs/player';

@Module({
  imports: [FieldModule, PlayerModule],
  providers: [TwitchService],
  exports: [TwitchService],
})
export class TwitchModule {}
