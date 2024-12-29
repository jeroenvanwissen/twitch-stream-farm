import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// @Index('Map_pkey', ['id'], { unique: true })
@Index('Map_name_key', ['name'], { unique: true })
@Entity('Map', { schema: 'public' })
export class Map {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('text', { name: 'name' })
  name: string;

  @Column('integer', { name: 'width' })
  width: number;

  @Column('integer', { name: 'height' })
  height: number;

  @Column('jsonb', { name: 'grid' })
  grid: object;

//  @Column('timestamp without time zone', {
//    name: 'createdAt',
//    default: () => 'CURRENT_TIMESTAMP',
//  })
//  createdAt: Date;

//  @Column('timestamp without time zone', { name: 'updatedAt' })
//  updatedAt: Date;
}
