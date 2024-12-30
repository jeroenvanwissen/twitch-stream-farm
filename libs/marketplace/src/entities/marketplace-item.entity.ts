import { Item } from '@libs/item/entities/item.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('MarketplaceItem', { schema: 'public' })
export class MarketplaceItem {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('decimal', {
    precision: 3,
    scale: 2,
    name: 'basePrice',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  basePrice: number;

  @Column('decimal', {
    precision: 3,
    scale: 2,
    name: 'price',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  price: number;

  @Column('integer', { name: 'quantity' })
  quantity: number;

  @Column('decimal', {
    precision: 3,
    scale: 2,
    name: 'dynamicPriceFactor',
    default: 1.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  dynamicPriceFactor: number;

  @Column('integer', { name: 'itemId' })
  itemId: number;

  @ManyToOne('Item', 'marketplaceItem', {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'itemId', referencedColumnName: 'id' }])
  item: Item;
}
