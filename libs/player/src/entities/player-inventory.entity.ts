import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Player } from './player.entity';

@Entity('PlayerInventory', { schema: 'public' })
export class PlayerInventory {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('integer', { name: 'quantity' })
  quantity: number;

  @Column('timestamp', { name: 'harvestedCycles', nullable: true, array: true })
  harvestedCycles: string[] | null;

  @Column('integer', { name: 'itemId', nullable: true })
  itemId: number;

  @ManyToOne('Item', 'inventory', {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'itemId', referencedColumnName: 'id' }])
  item: any;

  @ManyToOne(() => Player, (player) => player.inventory, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'playerId', referencedColumnName: 'id' }])
  player: Player;
}
