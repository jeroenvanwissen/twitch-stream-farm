import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from './events.service';
import { FieldService } from '@libs/field';
import { PathfindingService } from '@libs/pathfinding';
import { PlayerService } from '@libs/player';
import { playerMovementQueue } from '@libs/player';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly playerService: PlayerService,
    private readonly pathfindingService: PathfindingService,
    private readonly fieldService: FieldService,
    private readonly eventsService: EventsService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handle10MinCron() {
    // getRandomEmptyField already filters for SOIL fields
    const field = await this.fieldService.getRandomEmptyField();

    if (!field) {
      return;
    }

    const player = await this.playerService.getClosestPlayerByCoordinates(
      field.signX,
      field.signY,
    );

    if (!player) {
      return;
    }

    await playerMovementQueue.add(
      'move',
      {
        username: player.username,
        type: 'playerMove',
        x: field.signX,
        y: field.signY,
      },
      {
        attempts: 5, // Retry up to 5 times if player is moving
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay
        },
        removeOnComplete: true,
        removeOnFail: true, // Remove failed jobs by default
      },
    );
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handle10SecCron() {
    // Field growth cycle

    // getFieldsWithCrops already filters for SOIL fields
    const fields = await this.fieldService.getFieldsWithCrops();

    for (let field of fields) {
      // Skip non-SOIL fields
      if (field.type !== 'SOIL') {
        break;
      }

      const sortedGrowthStages = field.fieldState.crop?.growthStages?.sort(
        (a, b) => b.stageIndex - a.stageIndex,
      );

      // if (
      //   field.fieldState.isDry &&
      //   !field.fieldState.hasSummonedPlayerForWatering
      // ) {
      //   // Summon player to water the field
      //   const player = await this.playerService.getClosestPlayerByCoordinates(
      //     field.signX,
      //     field.signY,
      //   );

      //   if (player) {
      //     this.logger.log(`Summoning player ${player.username} to water field`);

      //     await this.fieldService.updateFieldState(field.id, {
      //       hasSummonedPlayerForWatering: true,
      //     });

      //     await playerMovementQueue.add(
      //       'move',
      //       {
      //         username: player.username,
      //         type: 'playerMove',
      //         x: field.signX,
      //         y: field.signY,
      //       },
      //       {
      //         attempts: 5,
      //         backoff: {
      //           type: 'exponential',
      //           delay: 5000,
      //         },
      //         removeOnComplete: true,
      //         removeOnFail: true,
      //       },
      //     );
      //   }
      //   continue;
      // }

      // If the crops on field is fully grown, summon a player to harvest it
      if (
        !field.fieldState.hasSummonedPlayerForHarvesting &&
        sortedGrowthStages?.[0]?.stageIndex &&
        field.fieldState.stageIndex === sortedGrowthStages[0].stageIndex
      ) {
        const player = await this.playerService.getClosestPlayerByCoordinates(
          field.signX,
          field.signY,
        );

        if (player) {
          this.logger.log(
            `Summoning player ${player.username} to harvest field`,
          );

          field = await this.fieldService.updateFieldState(field.id, {
            hasSummonedPlayerForHarvesting: true,
            isReadyForHarvest: true,
          });

          await playerMovementQueue.add(
            'move',
            {
              username: player.username,
              type: 'playerMove',
              x: field.signX,
              y: field.signY,
            },
            {
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
              removeOnComplete: true,
              removeOnFail: true,
            },
          );
        }
        continue;
      }

      const currentStage = field.fieldState.crop?.growthStages?.find(
        (stage) => stage.stageIndex === field.fieldState.stageIndex,
      );

      if (!currentStage) {
        continue;
      }

      const currentDateTime = new Date();
      const stageEndDateTime = new Date(field.fieldState.stageStartTime);
      stageEndDateTime.setMilliseconds(
        stageEndDateTime.getMilliseconds() + currentStage.duration,
      );

      if (currentDateTime < stageEndDateTime) {
        // The current stage is still ongoing we don't need to update the field
        continue;
      }

      // Only increment stage if we haven't reached the final stage
      if (
        sortedGrowthStages?.[0]?.stageIndex &&
        field.fieldState.stageIndex !== sortedGrowthStages[0].stageIndex
      ) {
        field = await this.fieldService.updateFieldState(field.id, {
          stageIndex: field.fieldState.stageIndex + 1,
          stageStartTime: new Date(),
        });

        this.eventsService.emitEvent({ type: 'fieldUpdate', field });
      }
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handle5SecCron() {
    // Get all idle players from the player service and start generating new target coordinates
    const players = await this.playerService.getIdlePlayers();

    for (const player of players) {
      // Check if player already has pending jobs
      const pendingJobs = await playerMovementQueue.getJobs([
        'waiting',
        'active',
        'delayed',
      ]);
      const hasPlayerJob = pendingJobs.some(
        (job) => job.data.username === player.username,
      );

      if (!hasPlayerJob) {
        // Generate new valid x,y coordinates for the player only if they don't have pending jobs
        const { x, y } = await this.pathfindingService.generateValidTarget(
          player.locationX,
          player.locationY,
        );

        await playerMovementQueue.add(
          'move',
          {
            username: player.username,
            type: 'playerMove',
            x,
            y,
          },
          {
            attempts: 5, // Retry up to 5 times if player is moving
            backoff: {
              type: 'exponential',
              delay: 5000, // Start with 5 second delay
            },
            removeOnComplete: true,
            removeOnFail: true, // Remove failed jobs by default
          },
        );

        this.logger.log(`Adding coordinates ${x},${y} to the movement queue for player ${player.username}`);
      }
    }
  }
}
