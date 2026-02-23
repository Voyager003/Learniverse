import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

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

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (status >= (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
      this.logger.error('Unhandled exception', exception);
    }

    const errorResponse = {
      statusCode: status,
      message:
        typeof message === 'string'
          ? message
          : (message as HttpExceptionObjectResponse).message,
      error:
        typeof message === 'string'
          ? 'Error'
          : ((message as HttpExceptionObjectResponse).error ?? 'Error'),
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
