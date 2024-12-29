import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@libs/database';
import { FieldService } from './field.service';
import { Field } from './entities/field.entity';
import { FieldState } from './entities/field-state.entity';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Field, FieldState])],
  providers: [FieldService],
  exports: [FieldService, TypeOrmModule],
})
export class FieldModule {}
