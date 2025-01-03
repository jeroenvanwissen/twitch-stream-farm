import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as tmi from 'tmi.js';
import { PlayerService, playerMovementQueue } from '@libs/player';
import { FieldService } from '@libs/field';
import { MarketplaceService } from '@libs/marketplace';

@Injectable()
export class TwitchService implements OnModuleInit {
  private readonly logger = new Logger(TwitchService.name);
  private client: tmi.Client;

  constructor(
    private readonly fieldService: FieldService,
    private readonly playerService: PlayerService,
    private readonly marketplaceService: MarketplaceService,
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

      const player = await this.playerService.getPlayerByUsername(username);

      if (message.startsWith('!spawn')) {
        // Check if player exists in database, if not.. add player
        if (!player) {
          await this.playerService.createPlayer(username, 37, 4);
        } else {
          await this.playerService.updatePlayer(username, {
            isActive: true,
          });
        }
      }

      if (message.startsWith('!wallet')) {
        if (!player) return;

        this.client.say(
          channel,
          `@${username} you have ${player.coins} coin in your wallet 💰🤑`,
        );
      }

      // INVENTORY
      if (message.startsWith('!inventory')) {
        if (!player) return;

        const inventory = [];
        for (const inventoryEntry of player.inventory) {
          if (inventoryEntry.quantity > 0) {
            inventory.push(`${inventoryEntry.item.name} (${inventoryEntry.item.type.toLowerCase()}): ${inventoryEntry.quantity}`);
          }
        }

        let message = `${username} you don't have anything in your inventory yet... gotta do some work on the farm or buy some seeds at the shop first!`;
        if (inventory.length > 0) {
          message = `${username} your inventory items: ${inventory.join(', ')}`;
        }
        
        this.client.say(
          channel,
          message
        );
      }

      // Command format: !move shop
      // Should move the player to the shop and should stay there for 3 minutes
      // until the player starts moving again or the player is moved by another command
      // The shop is at x:55, y:4 also this needs to be set somewhere in a config file or db settings/config table
      if (message.startsWith('!move shop')) {
        if (!player) return;

        //TODO: These coordinates should come from settings/config
        const shopCoordinates = {x: 55, y: 4};

        await playerMovementQueue.add(
          'move',
          {
            username: username,
            type: 'playerMove',
            x: shopCoordinates.x,
            y: shopCoordinates.y,
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

      if (message.startsWith('!sell')) {
        if (!player) return;

        //TODO: These coordinates should come from settings/config
        const shopCoordinates = {x: 55, y: 4};

        if (player.locationX !== shopCoordinates.x && player.locationY !== shopCoordinates.y) {
          this.client.say(
            channel,
            `@${username} you can only buy/sell items at the shop, use the !move shop command to get there.`
          );
          return;
        }

        
        const args = message.split(' ');
        const itemName = args[1];
        const quantity = args[2] !== undefined ? parseInt(args[2]) : undefined;
        const result = await this.marketplaceService.sellItem(username, itemName, quantity);

        this.client.say(
          channel,
          `@${username} sold ${result.item}(${result.quantity}) for ${result.totalRevenue}`,
        )
      }

      if (message.startsWith('!buy')) {
        if (!player) return;

        //TODO: These coordinates should come from settings/config
        const shopCoordinates = {x: 55, y: 4};

        if (player.locationX !== shopCoordinates.x && player.locationY !== shopCoordinates.y) {
          this.client.say(
            channel,
            `@${username} you can only buy/sell items at the shop, use the !move shop command to get there.`
          );
          return;
        }

        const args = message.split(' ');
        const itemName = args[1];
        const quantity = args[2] !== undefined ? parseInt(args[2]) : undefined;
        const result = await this.marketplaceService.buyItem(username, itemName, quantity);

        this.client.say(
          channel,
          `@${username} bought ${result.item}(${result.quantity}) for ${result.totalCosts})`,
        )
      }


      // Command format: !move field [number]
      if (message.startsWith('!move field')) {
        if (!player) return;

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
