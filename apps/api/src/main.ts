import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Crealio API')
    .setDescription('API do e-commerce de impressão 3D sob demanda')
    .setVersion('0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3333);
}
// Sem top-level await: a Hostinger carrega o entry com require(), que não aceita
// ESM com await no topo (ver test/require-entry.e2e-spec.ts).
bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
