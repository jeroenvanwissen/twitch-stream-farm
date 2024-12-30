import fs from 'fs';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Map } from './entities/map.entity';

import {
  ITiledMap,
  ITiledMapLayer,
  ITiledMapTileset,
  ITiledMapTileLayer,
} from '@workadventure/tiled-map-type-guard';

type TileProperty = {
  name: string;
  type: string;
  value: boolean | string | number;
};

interface TileData {
  id: string;
  properties?: TileProperty[];
}

type TiledTileset = ITiledMapTileset & {
  firstgid: number;
  tiles?: { [key: string]: TileData };
};


@Injectable()
export class MapService {
  constructor(
    @InjectRepository(Map)
    private mapRepository: Repository<Map>,
  ) {}

  /**
   * Retrieves a map by its name.
   *
   * @param {string} name - The name of the map to retrieve.
   * @returns {Promise<Map>} A promise that resolves to the map with the specified name.
   */
  async getMapByName(name: string): Promise<any> {
    return this.mapRepository.findOne({
      where: {
        name: name,
      },
    });
  }

  async processMap(name: string, file: any): Promise<void> {
    const fileContent = fs.readFileSync(file, 'utf-8');
    const mapData: ITiledMap = JSON.parse(fileContent);
    const grid = this.generateGrid(mapData);
    await this.mapRepository.upsert(
      {
        name,
        height: mapData.height,
        width: mapData.width,
        grid,
      },
      ['name'],
    );
  }

  private getLayerDepth(layer: ITiledMapLayer): number {
    return (
      (layer.properties?.find((p) => p.name === 'depth')?.value as number) || 0
    );
  }

  private getAllLayers(mapData: ITiledMap): ITiledMapTileLayer[] {
    const layers: ITiledMapTileLayer[] = [];
    const processLayer = (layer: ITiledMapLayer) => {
      if (layer.type === 'tilelayer' && layer.visible) {
        layers.push(layer as ITiledMapTileLayer);
      } else if (layer.type === 'group' && layer.visible) {
        layer.layers.forEach((l) => processLayer(l));
      }
    };

    mapData.layers.forEach((layer) => processLayer(layer));
    const sortedLayers = layers.sort(
      (a, b) => this.getLayerDepth(a) - this.getLayerDepth(b),
    );

    return sortedLayers;
  }

  generateGrid(mapData: ITiledMap): number[][] {
    const grid: number[][] = [];
    const width: number = mapData.width;
    const height: number = mapData.height;
    const layers = this.getAllLayers(mapData);

    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        let collides: boolean;
        let walkable: boolean;

        layers.forEach((layer: ITiledMapTileLayer) => {
          const tile = this.getTileAt(x, y, layer, mapData.tilesets);

          collides = collides || false;
          if (tile?.properties?.collides !== undefined) {
            collides = tile.properties.collides || false;
          }

          walkable = walkable || false;
          if (tile?.properties?.walkable !== undefined) {
            walkable = tile.properties.walkable || false;
          }
        });

        if (collides || !walkable) {
          row.push(1);
          continue;
        } else {
          row.push(0);
          continue;
        }
      }

      grid.push(row);
    }

    return grid;
  }

  getTileAt(
    x: number,
    y: number,
    layer: ITiledMapTileLayer,
    tilesets: ITiledMapTileset[],
  ): any {
    const index: number = y * layer.width + x;
    const globalTileId: number = layer.data[index] as number;

    if (globalTileId && globalTileId !== 0) {
      for (const tileset of tilesets as TiledTileset[]) {
        const firstGid = tileset.firstgid;
        const tiles: any = tileset.tiles;

        if (globalTileId >= firstGid && tiles) {
          const tileId = globalTileId - firstGid;
          const tile = tiles.find((t) => t.id === tileId);

          if (tile && tile.properties) {
            const collides = tile.properties.find((p) => p.name === 'collides')
              ?.value as boolean | undefined;
            const walkable = tile.properties.find((p) => p.name === 'walkable')
              ?.value as boolean | undefined;

            return {
              properties: {
                collides: collides,
                walkable: walkable,
              },
            };
          }
        }
      }
    }

    return {
      properties: {},
    };
  }
}
