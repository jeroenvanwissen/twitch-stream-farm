import { Module } from '@nestjs/common';
import { PathfindingService } from './pathfinding.service';
import { MapModule } from '@libs/map';

@Module({
  imports: [MapModule],
  providers: [PathfindingService],
  exports: [PathfindingService],
})
export class PathfindingModule {}
