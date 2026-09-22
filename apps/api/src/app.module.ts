import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { QuotesModule } from './quotes/quotes.module.js';
import { AdminModule } from './admin/admin.module.js';

// Em produção este processo também serve o build do Vue — a Hostinger implanta
// um único app Node. Em desenvolvimento quem serve o front é o Vite.
// O caminho é resolvido na inicialização (não no import) para respeitar o
// SPA_DIR definido em runtime.
export function resolveSpaDir(): string {
  return process.env.SPA_DIR ?? join(process.cwd(), 'public');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRootAsync({
      useFactory: () => {
        const rootPath = resolveSpaDir();
        if (!existsSync(rootPath)) {
          return [];
        }
        return [
          {
            rootPath,
            // Sem isso o fallback do SPA responderia HTML nas rotas da API.
            exclude: ['/api/{*splat}'],
          },
        ];
      },
    }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    QuotesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
