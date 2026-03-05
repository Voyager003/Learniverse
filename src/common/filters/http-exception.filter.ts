import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ERROR_MESSAGES } from '../constants/error-messages.constant.js';

interface HttpExceptionObjectResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, message } = this.resolveException(exception);

    if (status >= (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
      this.logger.error('Unhandled exception', exception);
    }

    const errorResponse = {
      statusCode: status,
      message: typeof message === 'string' ? message : message.message,
      error: typeof message === 'string' ? 'Error' : (message.error ?? 'Error'),
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }

  private resolveException(exception: unknown): {
    status: number;
    message: string | HttpExceptionObjectResponse;
  } {
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: exception.getResponse() as
          | string
          | HttpExceptionObjectResponse,
      };
    }

    const postgresErrorCode = this.readPostgresErrorCode(exception);
    if (postgresErrorCode) {
      return this.resolvePostgresError(postgresErrorCode);
    }

    const mongoDuplicateCode = this.readMongoDuplicateCode(exception);
    if (mongoDuplicateCode === 11000) {
      return {
        status: HttpStatus.CONFLICT,
        message: ERROR_MESSAGES.DUPLICATE_RESOURCE,
      };
    }

    const mongoErrorName = this.readMongoErrorName(exception);
    if (
      mongoErrorName === 'ValidationError' ||
      mongoErrorName === 'CastError'
    ) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_INPUT_FORMAT,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private resolvePostgresError(code: string): {
    status: number;
    message: string;
  } {
    if (code === '23505') {
      return {
        status: HttpStatus.CONFLICT,
        message: ERROR_MESSAGES.DUPLICATE_RESOURCE,
      };
    }

    if (code === '23503') {
      return {
        status: HttpStatus.CONFLICT,
        message: ERROR_MESSAGES.INVALID_REFERENCE,
      };
    }

    if (code === '22P02') {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_INPUT_FORMAT,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private readPostgresErrorCode(exception: unknown): string | null {
    if (!exception || typeof exception !== 'object') {
      return null;
    }

    const driverError = (exception as Record<string, unknown>)['driverError'];
    if (!driverError || typeof driverError !== 'object') {
      return null;
    }

    const code = (driverError as Record<string, unknown>)['code'];
    return typeof code === 'string' ? code : null;
  }

  private readMongoDuplicateCode(exception: unknown): number | null {
    if (!exception || typeof exception !== 'object') {
      return null;
    }

    const code = (exception as Record<string, unknown>)['code'];
    return typeof code === 'number' ? code : null;
  }

  private readMongoErrorName(exception: unknown): string | null {
    if (!exception || typeof exception !== 'object') {
      return null;
    }

    const name = (exception as Record<string, unknown>)['name'];
    return typeof name === 'string' ? name : null;
  }
}
