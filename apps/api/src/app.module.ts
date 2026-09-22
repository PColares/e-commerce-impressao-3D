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
import { StorageModule } from './storage/storage.module.js';
import { UPLOADS_URL_PREFIX, resolveUploadDir } from './storage/local-disk.storage.js';

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
        // Arquivos enviados (fotos de produto). Vem antes do SPA e fica fora do
        // fallback dele, para um arquivo inexistente dar 404 e não o index.html.
        const uploads = {
          rootPath: resolveUploadDir(),
          serveRoot: UPLOADS_URL_PREFIX,
          serveStaticOptions: { fallthrough: false, index: false as const },
        };
        const rootPath = resolveSpaDir();
        if (!existsSync(rootPath)) {
          return [uploads];
        }
        return [
          uploads,
          {
            rootPath,
            // Sem isso o fallback do SPA responderia HTML nas rotas da API.
            exclude: ['/api/{*splat}', `${UPLOADS_URL_PREFIX}/{*splat}`],
          },
        ];
      },
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    CatalogModule,
    QuotesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
