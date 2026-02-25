import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  MongoDBContainer,
  StartedMongoDBContainer,
} from '@testcontainers/mongodb';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
  mongoConnection: Connection;
  postgresContainer: StartedPostgreSqlContainer;
  mongoContainer: StartedMongoDBContainer;
}

export async function createTestApp(): Promise<TestContext> {
  // 1. Start containers in parallel
  const [postgresContainer, mongoContainer] = await Promise.all([
    new PostgreSqlContainer('postgres:16-alpine').start(),
    new MongoDBContainer('mongo:7').start(),
  ]);

  // 2. Set env vars from running containers
  process.env.DB_HOST = postgresContainer.getHost();
  process.env.DB_PORT = postgresContainer.getPort().toString();
  process.env.DB_USERNAME = postgresContainer.getUsername();
  process.env.DB_PASSWORD = postgresContainer.getPassword();
  process.env.DB_DATABASE = postgresContainer.getDatabase();
  const mongoUri = mongoContainer.getConnectionString();
  process.env.MONGODB_URI = `${mongoUri.endsWith('/') ? mongoUri : mongoUri + '/'}learniverse_test?directConnection=true`;

  // 3. Create NestJS app
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Mirror main.ts global configuration
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();

  return {
    app,
    dataSource: moduleFixture.get(DataSource),
    mongoConnection: moduleFixture.get<Connection>(getConnectionToken()),
    postgresContainer,
    mongoContainer,
  };
}

export async function teardownTestApp(ctx: TestContext): Promise<void> {
  if (ctx?.app) await ctx.app.close();
  if (ctx?.postgresContainer) await ctx.postgresContainer.stop();
  if (ctx?.mongoContainer) await ctx.mongoContainer.stop();
}
