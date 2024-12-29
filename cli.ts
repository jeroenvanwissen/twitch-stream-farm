import 'tsconfig-paths/register';
import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { NestFactory } from '@nestjs/core';
import { CliModule } from './apps/stream-farm/src/cli.module';
import { CliService } from './apps/stream-farm/src/services/cli.service';

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(CliModule, {
      logger: ['error', 'warn'], // Enable error and warning logs
    });

    const cliService = app.get(CliService);
    await cliService.run(process.argv);

    await app.close();
  } catch (error) {
    console.error('CLI Error:', error);
    process.exit(1);
  }
}

bootstrap();
