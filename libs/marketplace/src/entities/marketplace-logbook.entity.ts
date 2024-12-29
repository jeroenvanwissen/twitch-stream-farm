import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('MarketplaceLogbook', { schema: 'public' })
export class MarketplaceLogbook {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('integer', { name: 'itemId' })
  itemId: number;

  @ManyToOne('Item', 'marketplaceLogbooks', {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'itemId', referencedColumnName: 'id' }])
  item: any;

  @Column('integer', { name: 'quantity' })
  quantity: number;

  @Column('timestamp without time zone', {
    name: 'createdAt',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
