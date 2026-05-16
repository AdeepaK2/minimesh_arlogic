import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function resolveCorsOrigins(): string[] {
  const configured = process.env.FRONTEND_ORIGIN?.trim();
  const defaults = ['http://localhost:3000', 'http://127.0.0.1:3000'];

  if (!configured) {
    return defaults;
  }

  return [...new Set([configured, ...defaults])];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = resolveCorsOrigins();

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
