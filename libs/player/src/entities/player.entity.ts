import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlayerInventory } from './player-inventory.entity';

@Index('Player_username_key', ['username'], { unique: true })
@Entity('Player')
export class Player {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('text', { name: 'username' })
  username: string;

  @Column('double precision', { name: 'coins' })
  coins: number;

  @Column('integer', { name: 'xp' })
  xp: number;

  @Column('integer', { name: 'level' })
  level: number;

  @Column('boolean', { name: 'isActive', default: () => 'false' })
  isActive: boolean;

  @Column('boolean', { name: 'isDisabled', default: () => 'false' })
  isDisabled: boolean;

  @Column('boolean', { name: 'isMoving', default: () => 'false' })
  isMoving: boolean;

  @Column('boolean', { name: 'targetReached', default: () => 'true' })
  targetReached: boolean;

  @Column('integer', { name: 'locationX' })
  locationX: number;

  @Column('integer', { name: 'locationY' })
  locationY: number;

  @Column('timestamp without time zone', {
    name: 'createdAt',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updatedAt' })
  updatedAt: Date;

  @OneToMany(
    () => PlayerInventory,
    (playerInventory) => playerInventory.player,
    {
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },
  )
  inventory: PlayerInventory[];
}
