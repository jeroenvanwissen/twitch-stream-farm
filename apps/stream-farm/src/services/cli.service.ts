import { Injectable, OnModuleInit } from '@nestjs/common';
import { Command } from 'commander';
import { PlayerService, playerMovementQueue } from '@libs/player';
import { FieldService } from '@libs/field';
import { ItemService, Item } from '@libs/item';
import { MarketplaceService } from '@libs/marketplace';

import Table from 'cli-table3';
import * as fs from 'fs';
import { MapService } from '@libs/map';

@Injectable()
export class CliService implements OnModuleInit {
  private program: Command;

  constructor(
    private readonly playerService: PlayerService,
    private readonly fieldService: FieldService,
    private readonly itemService: ItemService,
    private readonly mapService: MapService,
    private readonly marketplaceService: MarketplaceService,
  ) {
    this.program = new Command();
  }

  onModuleInit() {
    this.program
      .name('stream-farm-cli')
      .description('CLI for managing the farming game')
      .version('1.0.0');

    this.program
      .command('reset-players')
      .description(
        'Reset the isMoving and targetReach booleans for all players',
      )
      .action(async () => {
        await this.playerService.resetPlayers();
        process.exit(0);
      });

    this.program
      .command('sync <type> [args...]')
      .description('Sync data from a file to the database')
      .action(async (type: string, args: unknown) => {
        let name: string;
        let file: fs.PathOrFileDescriptor;

        if (type === 'map') {
          [name, file] = args as [string, fs.PathOrFileDescriptor];
          await this.mapService.processMap(name, file);
        }

        if (type === 'fields') {
          [file] = args as [fs.PathOrFileDescriptor];
          await this.fieldService.updateFieldsFromJson(file);
        }

        if (type === 'items') {
          [file] = args as [fs.PathOrFileDescriptor];
          const fileContent = fs.readFileSync(file, 'utf-8');
          const jsonData = JSON.parse(fileContent);
          await this.itemService.addItems(jsonData);
        }
        process.exit(0);
      });

    this.program
      .command('add-marketplace-item <type> <itemname> <price> <quantity>')
      .description('Add an item to the marketplace')
      .action(
        async (
          type: string,
          itemname: string,
          price: number,
          quantity: number,
        ) => {
          const item = await this.itemService.getItemByNameAndType(
            itemname,
            type.toUpperCase() as Item['type'],
          );

          if (!item) {
            console.error('Item not found');
            process.exit(1);
          }

          const marketplaceItem =
            await this.marketplaceService.addMarketplaceItem(
              item,
              price,
              quantity,
            );
          console.log(marketplaceItem);
          process.exit(0);
        },
      );

    this.program
      .command('reset-fields')
      .description('Reset all fields')
      .action(async () => {
        await this.fieldService.resetFields();
        process.exit(0);
      });

    this.program
      .command('field-status')
      .description('Returns list of fields and what crops they contain')
      .action(async () => {
        const fields = await this.fieldService.getAllFields();

        const table = new Table({
          head: ['Field', 'Crops', 'Stage', 'Ready for Harvest', 'Dry'],
          colWidths: [15, 15, 7, 20, 6],
        });

        for (const field of fields) {
          const sortedGrowthStages = field.fieldState.crop?.growthStages?.sort(
            (a, b) => b.stageIndex - a.stageIndex,
          );

          table.push([
            field.fieldnumber,
            field.fieldState?.crop?.name || 'None',
            sortedGrowthStages?.length > 0
              ? `${field.fieldState?.stageIndex}/${sortedGrowthStages?.[0]?.stageIndex}`
              : '',
            field.fieldState?.isReadyForHarvest,
            field.fieldState?.isDry,
          ]);
        }

        console.log('Field status');
        console.log(table.toString());

        process.exit(0);
      });

    this.program
      .command('in <username> <itemname> <amount>')
      .description('')
      .action(async (username: string, itemname: string, amount: number) => {
        await this.playerService.addItemToInventory(username, itemname, amount);
        process.exit(0);
      });

    this.program
      .command('inventory <username>')
      .description('Check player inventory')
      .action(async (username: string) => {
        const player = await this.playerService.getPlayerByUsername(username);

        if (!player) process.exit(0);

        const table = new Table({
          head: ['Item', 'Type', 'Quantity'],
          colWidths: [15, 15, 10],
        });

        for (const inventoryEntry of player.inventory) {
          table.push([
            inventoryEntry.item.name,
            inventoryEntry.item.type,
            inventoryEntry.quantity,
          ]);
        }

        console.log(`Inventory for ${player.username}`);
        console.log(table.toString());

        process.exit(0);
      });

    this.program
      .command('sell <username> <itemname> [amount]')
      .description('Sell item')
      .action(async (username: string, itemname: string, amount: number) => {
        await this.marketplaceService.sellItem(username, itemname, amount);
        process.exit(0);
      });

    // this.program
    //   .command('buy <username> <itemname> <amount>')
    //   .description('Buy item')
    //   .action(async (username: string, itemname: string, amount: number) => {
    //     process.exit(0);
    //   });

    this.program
      .command('move <username> <target> [number]')
      .description('Move player to a specific target')
      .action(async (username: string, target: string, number: number) => {
        if (target === 'field' && !isNaN(number)) {
          const field = await this.fieldService.getFieldByNumber(number);
          if (!field) {
            console.log(`Field ${number} not found`);
            process.exit(1);
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
        }
        process.exit(0);
      });
  }

  async run(argv: string[]) {
    await this.program.parseAsync(argv);
  }
}
