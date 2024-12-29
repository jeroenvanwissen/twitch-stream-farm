import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ItemGrowthStage } from './item-growthstage.entity';
import { FieldState } from '@libs/field/entities/field-state.entity';
import { PlayerInventory } from '@libs/player/entities/player-inventory.entity';

@Index('Item_name_type_key', ['name', 'type'], { unique: true })
@Entity('Item', { schema: 'public' })
export class Item {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('text', { name: 'name' })
  name: string;

  @Column('text', { name: 'description' })
  description: string;

  @Column('enum', { name: 'type', enum: ['CROPS', 'SEED', 'FERTILIZER'] })
  type: 'CROPS' | 'SEED' | 'FERTILIZER';

  @OneToMany(() => ItemGrowthStage, (itemGrowthStage) => itemGrowthStage.item, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  growthStages: ItemGrowthStage[];

  @OneToMany(() => PlayerInventory, (inventory) => inventory.item, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  inventory: PlayerInventory[];

  @OneToMany('MarketplaceItem', 'item', {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  marketplaceItem: any[];

  @OneToMany('MarketplaceLogbook', 'item', {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  marketplaceLogbooks: any[];

  @OneToMany(() => FieldState, (fieldState) => fieldState.crop, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  fieldStates: FieldState[];
}
