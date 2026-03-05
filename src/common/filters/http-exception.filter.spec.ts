import { HttpExceptionFilter } from './http-exception.filter.js';
import {
  HttpException,
  HttpStatus,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/error-messages.constant.js';
interface MockResponse {
  status: jest.Mock & { (): MockResponse };
  json: jest.Mock & { (): MockResponse };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: MockResponse;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis() as MockResponse['status'],
      json: jest.fn().mockReturnThis() as MockResponse['json'],
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: (): MockResponse => mockResponse,
        getRequest: () => ({ url: '/test' }),
      }),
    } as unknown as ArgumentsHost;

    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('문자열 메시지를 가진 HttpException을 처리해야 한다', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Not Found',
        timestamp: expect.any(String) as string,
      }),
    );
  });

  it('객체 응답을 가진 HttpException을 처리해야 한다', () => {
    const exception = new HttpException(
      { message: 'Validation failed', error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
      }),
    );
  });

  it('알 수 없는 예외를 500으로 처리해야 한다', () => {
    const exception = new Error('Something broke');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });

  it('Postgres unique 위반을 409로 매핑해야 한다', () => {
    const exception = {
      driverError: { code: '23505' },
    };

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: ERROR_MESSAGES.DUPLICATE_RESOURCE,
      }),
    );
  });

  it('Mongo duplicate key 에러를 409로 매핑해야 한다', () => {
    const exception = {
      code: 11000,
    };

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: ERROR_MESSAGES.DUPLICATE_RESOURCE,
      }),
    );
  });

  it('Mongo validation 에러를 400으로 매핑해야 한다', () => {
    const exception = {
      name: 'ValidationError',
    };

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ERROR_MESSAGES.INVALID_INPUT_FORMAT,
      }),
    );
  });
});
