import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Player, PlayerInventory } from '@libs/player';
import { Item, ItemGrowthStage } from '@libs/item';
import { Map } from '@libs/map';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER || 'username',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: process.env.POSTGRES_DB || 'stream-farm',
  synchronize: false,
  entities: [Player, PlayerInventory, Item, ItemGrowthStage, Map],
  migrations: [],
});
