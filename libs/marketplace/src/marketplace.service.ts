import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MarketplaceItem } from './entities/marketplace-item.entity';
import { MarketplaceLogbook } from './entities/marketplace-logbook.entity';
import { Repository } from 'typeorm';
import { Item, ItemService } from '@libs/item';
import { Player, PlayerInventory } from '@libs/player';
import { ITiledMapWangColor } from '@workadventure/tiled-map-type-guard';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(MarketplaceItem)
    private readonly marketplaceItemRepository: Repository<MarketplaceItem>,

    @InjectRepository(MarketplaceLogbook)
    private readonly marketplaceLogbookRepository: Repository<MarketplaceLogbook>,

    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,

    @InjectRepository(PlayerInventory)
    private readonly playerInventoryRepository: Repository<PlayerInventory>,

    private readonly itemService: ItemService,
  ) {}

  async addMarketplaceItem(
    item: Item,
    basePrice: number,
    quantity: number,
  ): Promise<MarketplaceItem> {
    // Generate price from basePrice * dynamicPriceFactor ( defaults to 1.0 )
    const dynamicPriceFactor: number = 1.0;

    return await this.marketplaceItemRepository.save({
      basePrice: Number(basePrice),
      price: basePrice * dynamicPriceFactor,
      dynamicPriceFactor: Number(dynamicPriceFactor),
      quantity: Number(quantity),
      item,
    });
  }

  async buyItem(
    username: string,
    itemname: string,
    quantity: number,
  ): Promise<{item: string, quantity: number, totalCosts: number}> {
    const totalCosts = 0;

    //TODO: Insert buying seed logic here

    return {
      item: `seed - ${itemname}`,
      quantity,
      totalCosts,
    }   
  }

  async sellItem(
    username: string,
    itemname: string,
    quantity?: number,
  ): Promise<{item: string, quantity: number, totalRevenue: number}> {
    const playerInventory = await this.playerInventoryRepository.findOne({
      where: {
        item: {
          type: 'CROPS',
          name: itemname,
        },
        player: {
          username,
        },
      },
      relations: ['item', 'player'],
    });

    if (!playerInventory) {
      throw new Error('Player does not have item in inventory');
    }

    // If we didn't define a quantity, sell all items in inventory
    // If the quantity is higher than the player's inventory, sell all items
    if (quantity === undefined || quantity > playerInventory.quantity) {
      quantity = playerInventory.quantity;
    }

    // Check in the marketplace if the item exists
    const marketplaceItem = await this.marketplaceItemRepository.findOne({
      where: {
        item: playerInventory.item,
      },
    });

    if (!marketplaceItem) {
      throw new Error("Item can't be sold to the marketplace");
    }

    const itemPrice = marketplaceItem.price;
    const totalRevenue = playerInventory.quantity * itemPrice;

    await this.playerRepository.update(
      {
        id: playerInventory.player.id,
      },
      {
        coins: Number(playerInventory.player.coins + totalRevenue),
      },
    );

    // Remove item from player inventory ( set quantity to 0 )
    await this.playerInventoryRepository.update(
      {
        id: playerInventory.id,
      },
      {
        quantity: 0,
      },
    );

    // Add item to marketplace logbook
    await this.marketplaceLogbookRepository.save({
      item: playerInventory.item,
      quantity: playerInventory.quantity,
    });

    // Add quantity / 18 in the marketplace from the same item but as type SEED

    // Find the item with type SEED
    const seedItem = await this.itemService.getItemByNameAndType(
      playerInventory.item.name,
      'SEED',
    );
    if (!seedItem) {
      throw new Error('Seed item not found');
    }

    // Calculate the quantity to add
    const quantityToAdd = Math.floor(playerInventory.quantity / 6);
    const seedPrice = itemPrice * 0.5;

    // Check if the item exists in the marketplace
    const seedMarketplaceItem = await this.marketplaceItemRepository.findOne({
      where: { item: seedItem },
    });

    if (seedMarketplaceItem) {
      // Update existing marketplace item
      seedMarketplaceItem.quantity += quantityToAdd;
      await this.marketplaceItemRepository.save(seedMarketplaceItem);
    } else {
      // Create new marketplace item
      await this.marketplaceItemRepository.save({
        item: seedItem,
        basePrice: seedPrice,
        price: seedPrice,
        dynamicPriceFactor: 1.0,
        quantity: quantityToAdd,
      });
    }

    return {
      item: `crops - ${itemname}`,
      quantity,
      totalRevenue,
    }
  }
}
