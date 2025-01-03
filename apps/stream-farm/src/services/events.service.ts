import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { PlayerService } from '@libs/player';
import { PathfindingService } from '@libs/pathfinding';
import { Field } from '@libs/field/entities/field.entity';
import { FieldService } from '@libs/field';
import { ItemService } from '@libs/item';

type GameEvent = {
  username?: string;
  type: string;
  x?: number;
  y?: number;
  direction?: string;
  field?: Field;
  playerAction?: { username: string; action: string };
};

// Custom error for when player is moving
class PlayerMovingError extends Error {
  constructor(username: string) {
    super(`Player ${username} is already moving`);
    this.name = 'PlayerMovingError';
  }
}

@Injectable()
export class EventsService implements OnModuleInit {
  private readonly logger = new Logger(EventsService.name);
  private events$ = new Subject<GameEvent>();

  constructor(
    private readonly redis: Redis,
    private readonly playerService: PlayerService,
    private readonly pathfindingService: PathfindingService,
    private readonly fieldService: FieldService,
    private readonly itemService: ItemService,
  ) {}

  // Expose the event stream to the controller
  getEventsStream() {
    return this.events$.asObservable();
  }

  // Method to emit game events
  emitEvent(event: GameEvent) {
    this.events$.next(event);
  }

  // Start a BullMQ worker to listen for player-movement jobs
  onModuleInit() {
    const worker = new Worker(
      'player-movement',
      async (job) => {
        const username = job.data.username;
        const lockKey = `player:${username}:lock`;

        // Check if player is already moving
        const player = await this.playerService.getPlayerByUsername(username);
        if (!player) {
          throw new Error(`Job ${job.id}: Player ${username} not found`);
        }
        if (player.isMoving) {
          throw new PlayerMovingError(username);
        }

        try {
          // Acquire lock
          const lockAcquired = await this.redis.set(
            lockKey,
            '1',
            'EX',
            30,
            'NX',
          );
          if (!lockAcquired) {
            this.logger.log(
              `Job ${job.id}: Skipping movement for ${username}: Could not acquire lock`,
            );
            return;
          }

          this.logger.log(
            `Job ${job.id}: Starting movement for ${username} to ${job.data.x},${job.data.y}`,
          );

          // Update player state to moving
          await this.playerService.updatePlayer(username, {
            isMoving: true,
            targetReached: false,
          });

          // Pathfinding logic would go here in a real-world scenario
          const path = await this.pathfindingService.findPath(
            player.locationX,
            player.locationY,
            job.data.x,
            job.data.y,
          );

          if (!path) {
            throw new Error(
              `Job ${job.id}: No path found for ${username} to ${job.data.x},${job.data.y}`,
            );
          }

          await this.pathfindingService.followPath(
            player,
            path,
            // For every step in the path, update player position and notify clients
            async (player, coordinates, direction) => {
              await this.playerService.updatePlayer(player.username, {
                locationX: coordinates.x,
                locationY: coordinates.y,
              });

              this.events$.next({
                username: player.username,
                type: 'playerMove',
                x: coordinates.x,
                y: coordinates.y,
                direction,
              });
            },
            // When the path is completed, update player state
            async (player) => {
              this.events$.next({
                username: player.username,
                type: 'playerStop',
              });

              this.logger.log(
                `Job ${job.id}: Completed movement for ${username} to ${job.data.x},${job.data.y}`,
              );

              // TODO: Add logic to handle player interactions with the target location
              // Field processing, item collection, etc.

              let field = await this.fieldService.getFieldByCoordinates(
                job.data.x,
                job.data.y,
              );

              // Only allow crop planting on SOIL type fields
              if (field && field.type === 'SOIL' && !field.fieldState.crop) {
                // TODO: Refactor this to add a player inventory check to see IF the player even has the seed for this crop.
                const randomCrop =
                  await this.itemService.getRandomItemByType('CROPS');

                this.logger.log(
                  `Job ${job.id}: Player ${username} sowing ${randomCrop.name} on field ${field.id}`,
                );

                if (randomCrop) {
                  field = await this.fieldService.updateFieldState(field.id, {
                    crop: randomCrop, // CHECK THIS
                    stageIndex: 0,
                    stageStartTime: new Date(),
                    cycleStartTime: new Date(),
                    isDry: true,
                    isReadyForHarvest: false,
                    isFertilized: false,
                    hasSummonedPlayerForHarvesting: false,
                    hasSummonedPlayerForSowing: false,
                    hasSummonedPlayerForWatering: false,
                  });

                  this.events$.next({
                    type: 'fieldUpdate',
                    field,
                    playerAction: {
                      username: player.username,
                      action: 'planting',
                    },
                  });

                  // Add a little delay before we do the next action...
                  await new Promise((resolve) => setTimeout(resolve, 5000));
                }
              }

              if (
                field &&
                field.type === 'SOIL' &&
                field.fieldState.crop &&
                field.fieldState.isReadyForHarvest &&
                field.fieldState.hasSummonedPlayerForHarvesting
              ) {
                this.logger.log(
                  `Job ${job.id}: Field ${field.fieldnumber} is ready, harvesting crops`,
                );

                const cropName = field?.fieldState?.crop?.name;

                field = await this.fieldService.updateFieldState(field.id, {
                  crop: null,
                  stageIndex: null,
                  stageStartTime: null,
                  cycleStartTime: null,
                  isDry: true,
                  isReadyForHarvest: false,
                  isFertilized: false,
                  hasSummonedPlayerForHarvesting: false,
                  hasSummonedPlayerForSowing: false,
                  hasSummonedPlayerForWatering: false,
                });

                this.events$.next({
                  type: 'fieldUpdate',
                  field,
                  playerAction: {
                    username: player.username,
                    action: 'sickle',
                  },
                });

                // We always have 3 items of crop on a field right now, this might change in
                // the future where we might add bigger fields....
                // TODO: Change this to a config setting
                await this.playerService.addItemToInventory(
                  player.username,
                  cropName,
                  3,
                );

                // Add a little delay before we do the next action...
                await new Promise((resolve) => setTimeout(resolve, 5000));
              }

              // Delay for a few seconds before marking player as stopped
              await new Promise((resolve) => setTimeout(resolve, 5000));

              await this.playerService.updatePlayer(player.username, {
                isMoving: false,
                targetReached: true,
              });
            },
          );
        } catch (error) {
          this.logger.error(
            `Error processing movement for ${username}:`,
            error,
          );

          // Reset player state in case of error
          await this.playerService.updatePlayer(username, {
            isMoving: false,
            targetReached: true,
          });

          // Re-throw the error to mark job as failed
          // If it's a PlayerMovingError, it will be retried
          // Other errors will fail the job permanently
          throw error;
        } finally {
          // Always clean up the lock
          await this.redis.del(lockKey);
        }
      },
      {
        connection: {
          url:
            process.env.REDIS_HOST && process.env.REDIS_PORT
              ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
              : 'redis://redis:6379',
        },
        concurrency: 5, // Process up to 5 jobs simultaneously
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          count: 100, // Keep last 100 failed jobs
        },
      },
    );

    //    worker.on('completed', (job, result) => {
    //      this.logger.log(`Job ${job.id}: completed successfully ${result}`);
    //    });

    worker.on('failed', (job, err) => {
      // Only keep the job in the queue if it failed due to player moving
      if (err.name !== 'PlayerMovingError') {
        job.remove();
      }
      this.logger.error(`Job ${job?.id}: failed:`, err);
    });

    worker.on('error', (err) => {
      this.logger.error('Worker error:', err);
    });
  }
}
