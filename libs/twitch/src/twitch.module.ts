import { Module } from '@nestjs/common';
import { TwitchService } from './twitch.service';
import { FieldModule } from '@libs/field';

@Module({
  imports: [FieldModule],
  providers: [TwitchService],
  exports: [TwitchService],
})
export class TwitchModule {}
