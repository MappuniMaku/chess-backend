import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ValidationError } from './common/validation-error';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin:
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : 'https://chess-c3e21.web.app',
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      exceptionFactory: (validationErrors = []) => {
        return new ValidationError(
          validationErrors.reduce((acc, err) => {
            const { property, constraints } = err;
            const failReasons = Object.keys(constraints);
            return {
              ...acc,
              [property]: failReasons[failReasons.length - 1],
            };
          }, {}),
        );
      },
    }),
  );
  app.use(helmet());
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
