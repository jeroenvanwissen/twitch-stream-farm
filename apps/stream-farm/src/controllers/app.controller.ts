import { Controller, Get } from '@nestjs/common';
import { MapService } from '@libs/map';
import { PlayerService } from '@libs/player';
import { ItemService } from '@libs/item';
import { FieldService } from '@libs/field';

@Controller()
export class AppController {
  constructor(
    private readonly mapService: MapService,
    private readonly playerService: PlayerService,
    private readonly itemService: ItemService,
    private readonly fieldService: FieldService,
  ) {}

  @Get('game')
  async getGame(): Promise<string> {
    // Retrieve the map named 'bigmap'.
    const map = await this.mapService.getMapByName('map');

    // Retrieve all players usernames and locations.
    const players = (await this.playerService.getAllPlayers()).map(
      (player) => ({
        username: player.username,
        location: { x: player.locationX, y: player.locationY },
      }),
    );

    // Retrieve all crops and their growth stages.
    const crops = await this.itemService.getAllItemsByType('CROPS');

    // Retrieve all fields
    const fields = (await this.fieldService.getAllFields()).map((field) => ({
      startXY: [field.locationX, field.locationY],
      endXY: [
        field.locationX + field.width - 1,
        field.locationY + field.height - 1,
      ],
      signXY: [field.signX, field.signY],
      number: field.fieldnumber,
      state: field.fieldState,
      type: field.type,
    }));

    return JSON.stringify({
      map: {
        name: map.name,
        width: map.width,
        height: map.height,
        grid: map.grid,
      },
      players,
      crops,
      fields,
    });
  }
}
