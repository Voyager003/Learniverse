import { configValidationSchema } from './config.validation.js';

describe('ConfigValidation', () => {
  it('should pass with default values when no env vars provided', () => {
    const { error, value } = configValidationSchema.validate({});
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.NODE_ENV).toBe('development');
    expect(value.DB_HOST).toBe('localhost');
    expect(value.DB_PORT).toBe(5432);
  });

  it('should pass with valid custom values', () => {
    const env = {
      PORT: 4000,
      NODE_ENV: 'production',
      DB_HOST: '10.0.0.1',
      DB_PORT: 5433,
      DB_USERNAME: 'admin',
      DB_PASSWORD: 'secret',
      DB_DATABASE: 'learniverse_prod',
      MONGODB_URI: 'mongodb://remote:27017/learniverse',
      JWT_SECRET: 'prod-secret',
      JWT_EXPIRES_IN: '30m',
      JWT_REFRESH_SECRET: 'prod-refresh',
      JWT_REFRESH_EXPIRES_IN: '14d',
    };

    const { error, value } = configValidationSchema.validate(env);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(4000);
    expect(value.NODE_ENV).toBe('production');
  });

  it('should reject invalid NODE_ENV', () => {
    const { error } = configValidationSchema.validate({
      NODE_ENV: 'invalid',
    });
    expect(error).toBeDefined();
    expect(error!.message).toContain('NODE_ENV');
  });

  it('should reject non-numeric PORT', () => {
    const { error } = configValidationSchema.validate({
      PORT: 'not-a-number',
    });
    expect(error).toBeDefined();
  });
});
