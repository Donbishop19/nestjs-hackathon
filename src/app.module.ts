import { ArcjetGuard, ArcjetModule, fixedWindow, shield } from '@arcjet/nest';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { auth } from './auth.js';
import { PrismaModule } from './lib/database/prisma.module.js';
import { UserModule } from './module/user/user.module.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { HackathonModule } from './module/hackathon/hackathon.module.js';

import 'dotenv/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UserModule,
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: '2mb' },
        urlencoded: { limit: '2mb', extended: true },
        rawBody: true,
      },
    }),
    ArcjetModule.forRootAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        key: config.getOrThrow<string>('ARCJET_KEY'),
        rules: [
          shield({ mode: 'LIVE' }),
          fixedWindow({
            mode: 'LIVE',
            max: 10,
            window: '60s',
          }),
        ],
      }),
    }),
    HackathonModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ArcjetGuard,
    },
    ResponseInterceptor,
  ],
})
export class AppModule {}
