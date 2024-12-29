import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Item } from './entities/item.entity';
import { ItemGrowthStage } from './entities/item-growthstage.entity';

@Injectable()
export class ItemService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,

    @InjectRepository(ItemGrowthStage)
    private readonly itemGrowthStageRepository: Repository<ItemGrowthStage>,
  ) {}

  async getAllItemsByType(type: Item['type']): Promise<Item[]> {
    return this.itemRepository.find({
      where: {
        type,
      },
      relations: ['growthStages'],
    });
  }

  async getRandomItemByType(type: Item['type']): Promise<Item> {
    const items = await this.getAllItemsByType(type);

    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex];
  }

  async getItemByNameAndType(name: string, type: Item['type']): Promise<Item> {
    return this.itemRepository.findOne({
      where: {
        name,
        type,
      },
      relations: ['growthStages'],
    });
  }

  async addItems(items: Item[]): Promise<void> {
    for (const item of items) {
      let existingItem = await this.getItemByNameAndType(item.name, item.type);

      if (!existingItem) {
        existingItem = await this.itemRepository.save(item);
      } else {
        await this.itemRepository.update(
          {
            id: existingItem.id,
          },
          {
            description: item.description,
          },
        );
      }

      for (const growthStage of item.growthStages) {
        const existingGrowthStage =
          await this.itemGrowthStageRepository.findOne({
            where: {
              item: {
                id: existingItem.id,
              },
              stageIndex: growthStage.stageIndex,
            },
          });

        if (!existingGrowthStage) {
          await this.itemGrowthStageRepository.save({
            stageIndex: growthStage.stageIndex,
            stageTileId: growthStage.stageTileId,
            duration: growthStage.duration * 1000,
            item: existingItem,
          });
        } else {
          await this.itemGrowthStageRepository.update(
            {
              item: {
                id: existingItem.id,
              },
              stageIndex: existingGrowthStage.stageIndex,
            },
            {
              stageTileId: growthStage.stageTileId,
              duration: growthStage.duration * 1000,
            },
          );
        }
      }
    }
  }
}
