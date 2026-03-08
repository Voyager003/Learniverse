import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { AdminBootstrapService } from '../src/admin/admin-bootstrap.service.js';

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be configured`);
  }

  return value;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const adminBootstrapService = app.get(AdminBootstrapService);
    const result = await adminBootstrapService.ensureAdminUser({
      email: readRequiredEnv('ADMIN_EMAIL'),
      password: readRequiredEnv('ADMIN_PASSWORD'),
      name: process.env.ADMIN_NAME ?? 'Learniverse Admin',
    });

    const message = result.created
      ? `Admin user created: ${result.user.email}`
      : `Admin user already exists: ${result.user.email}`;
    console.log(message);
  } finally {
    await app.close();
  }
}

void bootstrap();
