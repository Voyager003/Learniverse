import { TransformInterceptor } from './transform.interceptor.js';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('응답 데이터를 statusCode와 함께 래핑해야 한다', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of({ id: 1, name: 'Test' }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result).toEqual({
        data: { id: 1, name: 'Test' },
        statusCode: 200,
      });
      done();
    });
  });

  it('null 데이터를 처리해야 한다', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 204 }),
      }),
    } as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of(null),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result).toEqual({
        data: null,
        statusCode: 204,
      });
      done();
    });
  });

  it('배열 데이터를 처리해야 한다', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of([{ id: 1 }, { id: 2 }]),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result).toEqual({
        data: [{ id: 1 }, { id: 2 }],
        statusCode: 200,
      });
      done();
    });
  });
});
