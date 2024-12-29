import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@libs/database';
import { MapService } from './map.service';
import { Map } from './entities/map.entity';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Map])],
  providers: [MapService],
  exports: [MapService, TypeOrmModule],
})
export class MapModule {}
