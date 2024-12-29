import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Field } from './field.entity';
import { Item } from '@libs/item/entities/item.entity';

@Entity('FieldState', { schema: 'public' })
export class FieldState {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('timestamp without time zone', {
    name: 'cycleStartTime',
    nullable: true,
  })
  cycleStartTime: Date | null;

  @Column('boolean', {
    name: 'hasSummonedPlayerForSowing',
    default: () => 'false',
  })
  hasSummonedPlayerForSowing: boolean;

  @Column('boolean', {
    name: 'hasSummonedPlayerForHarvesting',
    default: () => 'false',
  })
  hasSummonedPlayerForHarvesting: boolean;

  @Column('boolean', {
    name: 'hasSummonedPlayerForWatering',
    default: () => 'false',
  })
  hasSummonedPlayerForWatering: boolean;

  @Column('boolean', { name: 'isDry', default: () => 'true' })
  isDry: boolean;

  @Column('boolean', { name: 'isFertilized', default: () => 'false' })
  isFertilized: boolean;

  @Column('boolean', { name: 'isReadyForHarvest', default: () => 'false' })
  isReadyForHarvest: boolean;

  @Column('boolean', { name: 'isWatered', default: () => 'false' })
  isWatered: boolean;

  @Column('integer', { name: 'stageIndex', nullable: true })
  stageIndex: number | null;

  @Column('timestamp without time zone', {
    name: 'stageStartTime',
    nullable: true,
  })
  stageStartTime: Date | null;

  @OneToOne(() => Field, (field) => field.fieldState, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  field: Field;

  @ManyToOne(() => Item, (item) => item.fieldStates, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'cropId', referencedColumnName: 'id' }])
  crop: Item;
}
