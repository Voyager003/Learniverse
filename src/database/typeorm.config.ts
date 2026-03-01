import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

const runtimeRoot = existsSync(join(process.cwd(), 'dist')) ? 'dist' : 'src';

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
