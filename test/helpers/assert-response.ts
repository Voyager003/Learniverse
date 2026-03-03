import { Response } from 'supertest';
import { ErrorBody, SuccessBody } from './test-interfaces';

export function expectSuccessEnvelope<T>(
  res: Response,
  expectedStatus: number,
): SuccessBody<T> {
  const body = res.body as SuccessBody<T>;
  expect(body).toHaveProperty('data');
  expect(body).toHaveProperty('statusCode', expectedStatus);
  return body;
}

export function expectErrorEnvelope(
  res: Response,
  expectedStatus: number,
  expectedMessage?: string | string[],
): ErrorBody {
  const body = res.body as ErrorBody;
  expect(body).toHaveProperty('statusCode', expectedStatus);
  expect(body).toHaveProperty('error');
  expect(typeof body.error).toBe('string');
  expect(body).toHaveProperty('timestamp');
  expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);

  if (expectedMessage !== undefined) {
    expect(body.message).toEqual(expectedMessage);
  }

  return body;
}
