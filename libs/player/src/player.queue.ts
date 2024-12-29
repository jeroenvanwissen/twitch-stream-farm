import { Queue } from 'bullmq';

export const playerMovementQueue = new Queue('player-movement', {
  connection: {
    url:
      `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` ||
      'redis://redis:6379',
    // host: process.env.REDIS_HOST || 'localhost',
    // port: parseInt(process.env.REDIS_PORT) || 6379,
  },
});
