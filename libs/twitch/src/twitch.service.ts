import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as tmi from 'tmi.js';
import { PlayerService, playerMovementQueue } from '@libs/player';
import { FieldService } from '@libs/field';

@Injectable()
export class TwitchService implements OnModuleInit {
  private readonly logger = new Logger(TwitchService.name);
  private client: tmi.Client;

  constructor(
    private readonly fieldService: FieldService,
    private readonly playerService: PlayerService,
  ) {
    this.client = new tmi.Client({
      channels: [process.env.TWITCH_CHANNEL],
      identity: {
        username: process.env.TWITCH_BOT_USERNAME,
        password: process.env.TWITCH_BOT_TOKEN,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Connected to Twitch chat');
      this.setupChatCommands();

      // When player joins, update player status to active
      this.client.on('join', async (_channel, username, self) => {
        if (self) return;
        await this.playerService.updatePlayer(username, { isActive: true });
      });

      // When player leaves, update player status to inactive
      this.client.on('part', async (_channel, username, self) => {
        if (self) return;
        await this.playerService.updatePlayer(username, { isActive: false });
      });

    } catch (error) {
      this.logger.error('Failed to connect to Twitch chat:', error);
    }
  }

  private setupChatCommands() {
    this.client.on('message', async (channel, tags, message, self) => {
      if (self) return; // Ignore messages from the bot itself

      const username = tags.username;
      if (!username) return;

      if (message.startsWith('!spawn')) {
        // Check if player exists in database, if not.. add player
        const player = await this.playerService.getPlayerByUsername(username);
        if (!player) {
          await this.playerService.createPlayer(username, 37, 4);
        } else {
          await this.playerService.updatePlayer(username, {
            isActive: true,
          });
        }
      }

      // Command format: !move shop
      // Should move the player to the shop and should stay there for 3 minutes
      // until the player starts moving again or the player is moved by another command

      // Command format: !move field [number]
      if (message.startsWith('!move field')) {
        const fieldNumber = parseInt(message.split(' ')[2]);

        if (isNaN(fieldNumber)) {
          this.client.say(
            channel,
            `@${username} Invalid field number. Usage: !move field [number]`,
          );
          return;
        }

        try {
          const field = await this.fieldService.getFieldByNumber(fieldNumber);

          if (!field) {
            this.client.say(
              channel,
              `@${username} Field ${fieldNumber} not found`,
            );
            return;
          }

          await playerMovementQueue.add(
            'move',
            {
              username: username,
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

          this.client.say(
            channel,
            `@${username} Moving to field ${fieldNumber}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to add movement job for ${username}:`,
            error,
          );
          this.client.say(
            channel,
            `@${username} Failed to process movement command`,
          );
        }
      }
    });
  }
}
