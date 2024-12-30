import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { Redis } from 'ioredis';

import { AppController } from './controllers/app.controller';
import { CronService } from './services/cron.service';
import { EventsController } from './controllers/events.controller';
import { EventsService } from './services/events.service';

import { DatabaseModule } from '@libs/database';
import { FieldModule } from '@libs/field';
import { ItemModule } from '@libs/item';
import { MapModule } from '@libs/map';
import { PathfindingModule } from '@libs/pathfinding';
import { PlayerModule } from '@libs/player';
import { TwitchModule } from '@libs/twitch';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    FieldModule,
    ItemModule,
    MapModule,
    PathfindingModule,
    PlayerModule,
    TwitchModule,
  ],
  controllers: [AppController, EventsController],
  providers: [
    EventsService,
    CronService,
    {
      provide: Redis,
      useFactory: () => {
        return new Redis(
          process.env.REDIS_HOST && process.env.REDIS_PORT
            ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
            : 'redis://redis:6379',
        );
      },
    },
  ],
})
export class AppModule {}
