import fs from 'fs';
import path from 'path';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ITiledMap,
  ITiledMapLayer,
  ITiledMapProperty,
  ITiledMapTileset,
  ITiledMapTileLayer,
} from '@workadventure/tiled-map-type-guard';

type TileProperty = {
  name: string;
  type: string;
  value: boolean | string | number;
};

interface TileProperties {
  properties: TileProperty[];
}

interface TileData {
  properties?: TileProperty[];
}

type TiledTileset = ITiledMapTileset & {
  firstgid: number;
  tiles?: { [key: string]: TileData };
};

import { Map } from './entities/map.entity';

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
    const tileProperties = this.buildTilePropertyMap(mapData);
    const grid = this.generateGrid(mapData, tileProperties);
    await this.mapRepository.upsert({
      name,
      height: mapData.height,
      width: mapData.width,
      grid,
    }, ['name']);
  }

  buildTilePropertyMap(mapData: ITiledMap): { [id: number]: TileProperties } {
    const tileProperties: { [id: number]: TileProperties } = {};

    // Process tilesets in reverse order so later tilesets can override properties
    [...mapData.tilesets].reverse().forEach((tileset) => {
      const castedTileset = tileset as TiledTileset;
      const firstGid = castedTileset.firstgid;
      const tiles = castedTileset.tiles;

      console.log(`Processing tileset with firstGid: ${firstGid}`);

      if (tiles) {
        Object.entries(tiles).forEach(([tileId, tileData]) => {
          if (tileData.properties) {
            const globalId = firstGid + parseInt(tileId, 10);
            const existingProps = tileProperties[globalId]?.properties || [];

            // Merge properties, with new ones taking precedence
            const mergedProps = [...existingProps];
            tileData.properties.forEach((newProp) => {
              const existingIndex = mergedProps.findIndex(
                (p) => p.name === newProp.name,
              );
              if (existingIndex >= 0) {
                mergedProps[existingIndex] = {
                  name: newProp.name,
                  type: newProp.type,
                  value: newProp.value,
                };
                console.log(
                  `Overriding property ${newProp.name} for tile ${globalId}`,
                );
              } else {
                mergedProps.push({
                  name: newProp.name,
                  type: newProp.type,
                  value: newProp.value,
                });
                console.log(
                  `Adding new property ${newProp.name} for tile ${globalId}`,
                );
              }
            });

            tileProperties[globalId] = {
              properties: mergedProps,
            };
          }
        });
      }
    });

    return tileProperties;
  }

  private getLayerDepth(layer: ITiledMapLayer): number {
    return (
      (layer.properties?.find((p) => p.name === 'depth')?.value as number) || 0
    );
  }

  private getAllLayers(mapData: ITiledMap): ITiledMapTileLayer[] {
    const layers: ITiledMapTileLayer[] = [];

    const processLayer = (layer: ITiledMapLayer, groupName?: string) => {
      if (layer.type === 'tilelayer' && layer.visible) {
        const depth = this.getLayerDepth(layer);
        console.log(
          `Processing layer: ${layer.name}${groupName ? ` (in ${groupName})` : ''}, depth: ${depth}`,
        );
        layers.push(layer as ITiledMapTileLayer);
      } else if (layer.type === 'group' && layer.visible) {
        const groupDepth = this.getLayerDepth(layer);
        console.log(`Processing group: ${layer.name}, depth: ${groupDepth}`);
        layer.layers.forEach((l) => processLayer(l, layer.name));
      }
    };

    mapData.layers.forEach((layer) => processLayer(layer));
    const sortedLayers = layers.sort(
      (a, b) => this.getLayerDepth(a) - this.getLayerDepth(b),
    );

    console.log('\nFinal layer processing order:');
    sortedLayers.forEach((layer) => {
      console.log(`- ${layer.name} (depth: ${this.getLayerDepth(layer)})`);
    });

    return sortedLayers;
  }

  generateGrid(
    mapData: ITiledMap,
    tileProperties: { [id: number]: TileProperties },
  ): number[][] {
    const grid: number[][] = [];
    const width: number = mapData.width;
    const height: number = mapData.height;
    const layers = this.getAllLayers(mapData);

    // Initialize grid with walkable tiles
    for (let y = 0; y < height; y++) {
      const row = new Array(width).fill(0);
      grid.push(row);
    }

    // Process each position
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let collides = false;
        let walkable = true;

        // Process all layers at this position in depth order
        layers.forEach((layer) => {
          const depth = this.getLayerDepth(layer);
          const { processedCollides, processedWalkable } = this.processLayer(
            layer,
            width,
            x,
            y,
            tileProperties,
            collides,
            walkable,
          );

          // If any layer has collides=true, the tile is not walkable
          collides = collides || processedCollides;
          if (processedCollides) {
            walkable = false;
          } else {
            walkable = walkable && processedWalkable;
          }
        });

        // Set final grid value
        if (!walkable) {
          grid[y][x] = 1;
        }
      }
    }

    return grid;
  }

  processLayer(
    layer: ITiledMapTileLayer,
    width: number,
    x: number,
    y: number,
    tileProperties: { [id: number]: TileProperties },
    prevCollides: boolean,
    prevWalkable: boolean,
  ): { processedCollides: boolean; processedWalkable: boolean } {
    const index: number = y * width + x;
    const globalTileId: number = layer.data[index] as number;

    // Return previous values by default
    let collides = prevCollides;
    let walkable = prevWalkable;

    // Check if there's a tile at this position
    if (globalTileId && globalTileId !== 0) {
      console.log(
        `Found tile ${globalTileId} at (${x},${y}) in layer ${layer.name}`,
      );

      // First check for explicit properties
      if (tileProperties[globalTileId]) {
        const properties = tileProperties[globalTileId].properties;

        // Process collides property only if explicitly set
        const collidesProp = properties.find(
          (property) => property.name === 'collides',
        );
        if (collidesProp) {
          collides = collidesProp.value as boolean;
          if (collides) {
            console.log(
              `Tile at (${x},${y}) in layer ${layer.name} collides (explicit property)`,
            );
          }
        }

        // Process walkable property only if explicitly set
        const walkableProp = properties.find(
          (property) => property.name === 'walkable',
        );
        if (walkableProp) {
          walkable = walkableProp.value as boolean;
          if (!walkable) {
            console.log(
              `Tile at (${x},${y}) in layer ${layer.name} is not walkable (explicit property)`,
            );
          }
        }
      } else if (
        // If no explicit properties, check if this is a building/wall/fence layer
        layer.name.toLowerCase().includes('building') ||
        layer.name.toLowerCase().includes('wall') ||
        layer.name.toLowerCase().includes('fence')
      ) {
        if (layer.name.toLowerCase().includes('building')) {
          // For buildings, check if this is a top or bottom tile
          const aboveIndex = (y - 1) * width + x;
          const belowIndex = (y + 1) * width + x;
          const hasTileAbove = y > 0 && layer.data[aboveIndex] !== 0;
          const hasTileBelow =
            y < layer.height - 1 && layer.data[belowIndex] !== 0;

          if (!hasTileAbove || !hasTileBelow) {
            // Top or bottom edge of building - make it walkable
            collides = false;
            walkable = true;
            console.log(
              `Tile at (${x},${y}) in layer ${layer.name} is walkable (building edge)`,
            );
          } else {
            // Middle of building - make it non-walkable
            collides = true;
            walkable = false;
            console.log(
              `Tile at (${x},${y}) in layer ${layer.name} is non-walkable (building middle)`,
            );
          }
        } else {
          // Walls and fences are always non-walkable
          collides = true;
          walkable = false;
          console.log(
            `Tile at (${x},${y}) in layer ${layer.name} is non-walkable (wall/fence)`,
          );
        }
      }
    }

    return {
      processedCollides: collides,
      processedWalkable: walkable,
    };
  }
}
