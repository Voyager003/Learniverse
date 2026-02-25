// Shared type-safe response interfaces for E2E test supertest body assertions

export interface SuccessBody<T> {
  data: T;
  statusCode: number;
}

export interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
