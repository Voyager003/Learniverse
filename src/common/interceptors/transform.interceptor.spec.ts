import { TransformInterceptor } from './transform.interceptor.js';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap response data with statusCode', (done) => {
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

  it('should handle null data', (done) => {
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

  it('should handle array data', (done) => {
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
