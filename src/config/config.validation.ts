import Joi from 'joi';

export const configValidationSchema = Joi.object({
  // App
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  APP_CORS_ORIGINS: Joi.string().allow('').default(''),

  // PostgreSQL
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_DATABASE: Joi.string().default('learniverse'),

  // MongoDB
  MONGODB_URI: Joi.string().default('mongodb://localhost:27017/learniverse'),

  // JWT
  JWT_SECRET: Joi.string().default('dev-secret'),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().default('dev-refresh-secret'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
});
