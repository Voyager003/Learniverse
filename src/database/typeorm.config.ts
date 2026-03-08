import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

// The TypeORM CLI runs outside Nest's ConfigModule, so it must load .env itself.
loadEnv({ path: join(process.cwd(), '.env') });

const runtimeRoot = existsSync(join(process.cwd(), 'dist', 'src'))
  ? join('dist', 'src')
  : 'src';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'learniverse',
  synchronize: false,
  entities: [join(process.cwd(), runtimeRoot, '**', '*.entity.{ts,js}')],
  migrations: [
    join(process.cwd(), runtimeRoot, 'database', 'migrations', '*.{ts,js}'),
  ],
});

export default AppDataSource;
