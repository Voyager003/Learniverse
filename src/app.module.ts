import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { CommonModule } from './common/common.module.js';
import {
  appConfig,
  databaseConfig,
  mongodbConfig,
  jwtConfig,
  configValidationSchema,
} from './config/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, mongodbConfig, jwtConfig],
      validationSchema: configValidationSchema,
    }),
    DatabaseModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
