import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Player } from './entities/player.entity';
import { PlayerInventory } from './entities/player-inventory.entity'
import { Item, ItemService } from '@libs/item'

@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,

    @InjectRepository(PlayerInventory)
    private readonly playerInventoryRepository: Repository<PlayerInventory>,

    private readonly itemService: ItemService,
  ) {}

  /**
   * Retrieves all players.
   *
   * @returns {Promise<Player[]>} A promise that resolves to an array of all players.
   */
  async getAllPlayers(): Promise<Player[]> {
    return this.playerRepository.find({
      relations: ['inventory', 'inventory.item'],
    });
  }

  /**
   * Retrieve all idle players.
   *
   * @returns {Promise<Player[]>} A promise that resolves to an array of all idle players.
   */
  async getIdlePlayers(): Promise<Player[]> {
    return this.playerRepository.find({
      where: {
        isActive: true,
        isDisabled: false,
        isMoving: false,
        targetReached: true,
      },
      relations: ['inventory', 'inventory.item'],
    });
  }

  /**
   * Retrieves a player by their username.
   *
   * @param {string} username - The username of the player to retrieve.
   * @returns {Promise<Player>} A promise that resolves to the player with the specified username.
   */
  async getPlayerByUsername(username: string): Promise<Player> {
    return this.playerRepository.findOne({
      where: {
        username,
      },
      relations: ['inventory', 'inventory.item'],
    });
  }

  /**
   * Updates a player's data if the player exists.
   *
   * @param {string} username - The username of the player to update.
   * @param {Partial<Player>} updateData - The data to update for the player.
   * @returns {Promise<Player>} A promise that resolves to the updated player or null if player not found.
   */
  async updatePlayer(
    username: string,
    updateData: Partial<Player>,
  ): Promise<Player | null> {
    const player = await this.getPlayerByUsername(username);

    if (!player) {
      return null;
    }

    Object.assign(player, updateData);
    return this.playerRepository.save(player);
  }

  /**
   * Resets the isMoving and targetReached booleans for all players.
   *
   * @returns {Promise<void>}
   */
  async resetPlayers(): Promise<void> {
    await this.playerRepository.update(
      {},
      {
        isMoving: false,
        targetReached: true,
        locationX: 5,
        locationY: 5,
      },
    );
  }

  /**
   * Gets the closest active and non-disabled player to the specified coordinates.
   *
   * @param {number} x - The x coordinate to measure distance from.
   * @param {number} y - The y coordinate to measure distance from.
   * @returns {Promise<Player>} A promise that resolves to the closest player or null if no players found.
   */
  async getClosestPlayerByCoordinates(
    x: number,
    y: number,
  ): Promise<Player | null> {
    return this.playerRepository
      .createQueryBuilder('player')
      .select('player.*')
      .addSelect(
        `SQRT(POWER(player.locationX - ${x}, 2) + POWER(player.locationY - ${y}, 2))`,
        'distance',
      )
      .where('player.isActive = :isActive', { isActive: true })
      .andWhere('player.isDisabled = :isDisabled', { isDisabled: false })
      .orderBy('distance', 'ASC')
      .limit(1)
      .getRawOne();
  }


  // TODO: Refactor this part to allow player: Player instead of username....?  
  async addItemToInventory(username: string, itemname: string, amount: number) {
    const player = await this.getPlayerByUsername(username);

    if (!player) {
      return null;
    }

    if (player.inventory?.length > 0) {
      let itemEntry = player.inventory.find(entry => entry.item.name === itemname && entry.item.type === 'CROPS');

      if (itemEntry) {
        itemEntry.quantity = Number(itemEntry.quantity) + Number(amount);
        const result = await this.playerInventoryRepository.save(itemEntry);
      } else {
        await this.findItemAndAddToInventory(player, itemname, amount);
      }
    } else {
      await this.findItemAndAddToInventory(player, itemname, amount);
    }

    console.log('Added items to inventory....');
  }

  private async findItemAndAddToInventory(player: Player, itemname: string, amount: number): Promise<PlayerInventory | null> {
    const item = await this.itemService.getItemByNameAndType(itemname, 'CROPS');
    if (!item) {
      return null;
    }

    return await this.playerInventoryRepository.save({
      quantity: Number(amount),
      harvestedCycles: null,
      item,
      player
    });
  }
}
