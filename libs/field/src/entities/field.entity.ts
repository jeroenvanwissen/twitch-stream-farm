import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FieldState } from './field-state.entity';

@Index('Field_fieldStateId_key', ['fieldStateId'], { unique: true })
@Index('Field_fieldnumber_key', ['fieldnumber'], { unique: true })
@Entity('Field')
export class Field {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('integer', { name: 'fieldnumber' })
  fieldnumber: number;

  @Column('enum', { name: 'type', enum: ['SOIL', 'GRASS'] })
  type: 'SOIL' | 'GRASS';

  @Column('integer', { name: 'locationX' })
  locationX: number;

  @Column('integer', { name: 'locationY' })
  locationY: number;

  @Column('integer', { name: 'width' })
  width: number;

  @Column('integer', { name: 'height' })
  height: number;

  @Column('integer', { name: 'signX' })
  signX: number;

  @Column('integer', { name: 'signY' })
  signY: number;

  @Column('integer', { name: 'fieldStateId' })
  fieldStateId: number;

  @OneToOne(() => FieldState, (fieldState) => fieldState.field, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'fieldStateId', referencedColumnName: 'id' }])
  fieldState: FieldState;
}
