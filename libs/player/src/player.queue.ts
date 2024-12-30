import { Queue } from 'bullmq';

export const playerMovementQueue = new Queue('player-movement', {
  connection: {
    url:
      process.env.REDIS_HOST && process.env.REDIS_PORT
        ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
        : 'redis://redis:6379',
  },
});
