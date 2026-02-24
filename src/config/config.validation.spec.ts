import { configValidationSchema } from './config.validation.js';

interface ValidatedEnv {
  PORT: number;
  NODE_ENV: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
}

describe('ConfigValidation', () => {
  it('환경변수가 없을 때 기본값으로 검증을 통과해야 한다', () => {
    const { error, value } = configValidationSchema.validate({}) as {
      error: undefined;
      value: ValidatedEnv;
    };
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.NODE_ENV).toBe('development');
    expect(value.DB_HOST).toBe('localhost');
    expect(value.DB_PORT).toBe(5432);
  });

  it('유효한 커스텀 값으로 검증을 통과해야 한다', () => {
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

    const { error, value } = configValidationSchema.validate(env) as {
      error: undefined;
      value: ValidatedEnv;
    };
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(4000);
    expect(value.NODE_ENV).toBe('production');
  });

  it('유효하지 않은 NODE_ENV를 거부해야 한다', () => {
    const { error } = configValidationSchema.validate({
      NODE_ENV: 'invalid',
    });
    expect(error).toBeDefined();
    expect(error!.message).toContain('NODE_ENV');
  });

  it('숫자가 아닌 PORT를 거부해야 한다', () => {
    const { error } = configValidationSchema.validate({
      PORT: 'not-a-number',
    });
    expect(error).toBeDefined();
  });
});
