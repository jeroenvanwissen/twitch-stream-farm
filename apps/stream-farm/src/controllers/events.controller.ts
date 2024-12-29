import { Controller, Sse } from '@nestjs/common';
import { EventsService } from '../services/events.service';
import { map } from 'rxjs/operators';
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

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
