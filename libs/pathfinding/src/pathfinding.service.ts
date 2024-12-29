import { Injectable } from '@nestjs/common';
import * as Easystar from 'easystarjs';
import { MapService } from '@libs/map';
import { Player } from '@libs/player';

const TILE_RADIUS = 10;
const TWEEN_DELAY_MULTIPLIER = 30;

@Injectable()
export class PathfindingService {
  private easystar: Easystar.js;
  private grid: number[][];

  constructor(private readonly mapService: MapService) {
    this.easystar = new Easystar.js();
    this.loadMap('map');
  }

  async loadMap(name: string): Promise<void> {
    const map = await this.mapService.getMapByName(name);
    if (!map) {
      throw new Error(`Map ${name} not found`);
    }

    this.grid = map.grid as number[][];
    this.easystar.setGrid(this.grid);
    this.easystar.setAcceptableTiles([0]);
  }

  calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  async generateValidTarget(
    startX: number,
    startY: number,
  ): Promise<{ x: number; y: number }> {
    const validTargets = [];

    // Iterate over the range of tiles based on TILE_RADIUS
    for (let dy = -TILE_RADIUS; dy <= TILE_RADIUS; dy++) {
      for (let dx = -TILE_RADIUS; dx <= TILE_RADIUS; dx++) {
        const x = startX + dx;
        const y = startY + dy;

        // Check bounds and grid value in a single step
        if (
          x >= 0 &&
          y >= 0 &&
          y < this.grid.length &&
          x < this.grid[0].length &&
          this.grid[y][x] === 0
        ) {
          validTargets.push({ x, y });
        }
      }
    }

    // Return a random valid target if any, otherwise fallback to start position
    if (validTargets.length) {
      return validTargets[Math.floor(Math.random() * validTargets.length)];
    }

    return { x: startX, y: startY };
  }

  async findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): Promise<{ x: number; y: number }[] | null> {
    return new Promise((resolve) => {
      this.easystar.findPath(startX, startY, endX, endY, (path) => {
        if (!path) {
          return resolve(null);
        }
        resolve(path);
      });

      this.easystar.calculate();
    });
  }

  async followPath(
    player: Player,
    path: { x: number; y: number }[],
    onStep: (
      player: Player,
      end: { x: number; y: number },
      direction: string,
    ) => Promise<void>,
    onEnd: (player: Player) => Promise<void>,
  ): Promise<void> {
    let index = 0;

    const moveToNextPoint = async (): Promise<void> => {
      if (index >= path.length - 1) {
        // SEND OUT THE moveComplete EVENT
        // this.events$.next({
        //   username,
        //   type: 'moveComplete',
        //   player,
        // });

        await onEnd(player);
        return;
      }

      const [start, end] = [path[index], path[++index]];
      const duration =
        (this.calculateDistance(start.x, start.y, end.x, end.y) / 30) *
        1000 *
        TWEEN_DELAY_MULTIPLIER;

      // Determine direction
      const direction =
        end.x > start.x
          ? 'right'
          : end.x < start.x
            ? 'left'
            : end.y > start.y
              ? 'down'
              : 'up';

      // Callback for each step
      await onStep(player, end, direction);

      setTimeout(moveToNextPoint, duration);
    };

    moveToNextPoint();
  }
}
