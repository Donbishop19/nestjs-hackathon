import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import 'dotenv/config';

function formatValidationErrors(
  errors: ValidationError[],
  parentProperty = '',
): Array<{ property: string; message: string }> {
  return errors.flatMap((error) => {
    const property = parentProperty
      ? `${parentProperty}.${error.property}`
      : error.property;
    const messages = error.constraints
      ? Object.values(error.constraints).map((message) => ({
          property,
          message,
        }))
      : [];

    return [
      ...messages,
      ...formatValidationErrors(error.children ?? [], property),
    ];
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) =>
        new BadRequestException(formatValidationErrors(errors)),
    }),
  );
  app.useGlobalInterceptors(app.get(ResponseInterceptor));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
