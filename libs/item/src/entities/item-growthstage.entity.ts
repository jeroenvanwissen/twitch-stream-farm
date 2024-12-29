import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Item } from './item.entity';

@Entity('ItemGrowthStage', { schema: 'public' })
export class ItemGrowthStage {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('integer', { name: 'stageIndex' })
  stageIndex: number;

  @Column('integer', { name: 'stageTileId' })
  stageTileId: number;

  @Column('integer', { name: 'duration' })
  duration: number;

  @ManyToOne(() => Item, (item) => item.growthStages, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'itemId', referencedColumnName: 'id' }])
  item: Item;
}
