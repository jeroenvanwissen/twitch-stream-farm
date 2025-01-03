import { Controller, Sse } from '@nestjs/common';
import { EventsService } from '../services/events.service';
import { map } from 'rxjs/operators';
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // TODO: Refactor this to be more generic, it's not only for player-movement
  @Sse('player-movement')
  streamPlayerMovement() {
    return this.eventsService.getEventsStream().pipe(
      map((event) => ({
        id: Date.now(),
        data: event, // Ensure `data` contains the payload
      })),
    );
  }
}
