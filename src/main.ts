import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin:
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : 'https://chess-c3e21.web.app',
    },
  });
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
