import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { ERROR_MESSAGES } from '../constants/error-messages.constant.js';
import {
  IDEMPOTENCY_STATUS,
  IdempotencyKey,
} from './entities/idempotency-key.entity.js';

const UNIQUE_VIOLATION_CODE = '23505';
const MAX_IDEMPOTENCY_KEY_LENGTH = 255;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const PROCESSING_WAIT_RETRIES = 20;
const PROCESSING_WAIT_MS = 100;

interface ExecuteOptions<T> {
  userId: string;
  method: string;
  path: string;
  key?: string;
  payload: unknown;
  run: () => Promise<T>;
  replay: (record: IdempotencyKey) => Promise<T>;
  serializeResult?: (result: T) => unknown;
  successStatus?: number;
}

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyRepository: Repository<IdempotencyKey>,
  ) {}

  async execute<T>(options: ExecuteOptions<T>): Promise<T> {
    const normalizedKey = this.normalizeKey(options.key);
    if (!normalizedKey) {
      return options.run();
    }

    const requestHash = this.hashPayload(options.payload);
    const scope = {
      userId: options.userId,
      method: options.method.toUpperCase(),
      path: options.path,
      key: normalizedKey,
    };

    const existing = await this.findActiveRecord(scope);
    if (existing) {
      return this.resolveExistingRecord(existing, requestHash, options.replay);
    }

    const processing = await this.createProcessingRecord({
      ...scope,
      requestHash,
    });

    if (!processing) {
      const raced = await this.findActiveRecord(scope);
      if (raced) {
        return this.resolveExistingRecord(raced, requestHash, options.replay);
      }
      return options.run();
    }

    try {
      const result = await options.run();
      const serialized = options.serializeResult
        ? options.serializeResult(result)
        : (result as unknown);
      const responseBody = this.normalizeResponseBody(serialized);
      processing.status = IDEMPOTENCY_STATUS.COMPLETED;
      processing.responseStatus = options.successStatus ?? 201;
      processing.responseBody = responseBody;
      await this.idempotencyRepository.save(processing);
      return result;
    } catch (error) {
      await this.idempotencyRepository.delete({ id: processing.id });
      throw error;
    }
  }

  private async resolveExistingRecord<T>(
    record: IdempotencyKey,
    requestHash: string,
    replay: (record: IdempotencyKey) => Promise<T>,
  ): Promise<T> {
    this.assertRequestHash(record.requestHash, requestHash);

    if (record.status === IDEMPOTENCY_STATUS.COMPLETED) {
      return replay(record);
    }

    const completed = await this.waitForCompletion(record.id);
    if (!completed) {
      throw new ConflictException(
        ERROR_MESSAGES.IDEMPOTENCY_REQUEST_IN_PROGRESS,
      );
    }

    this.assertRequestHash(completed.requestHash, requestHash);
    return replay(completed);
  }

  private async waitForCompletion(id: string): Promise<IdempotencyKey | null> {
    for (let attempt = 0; attempt < PROCESSING_WAIT_RETRIES; attempt += 1) {
      await this.delay(PROCESSING_WAIT_MS);
      const latest = await this.idempotencyRepository.findOne({
        where: { id },
      });

      if (!latest) {
        return null;
      }

      if (latest.status === IDEMPOTENCY_STATUS.COMPLETED) {
        return latest;
      }
    }

    return null;
  }

  private async createProcessingRecord(input: {
    userId: string;
    method: string;
    path: string;
    key: string;
    requestHash: string;
  }): Promise<IdempotencyKey | null> {
    const record = this.idempotencyRepository.create({
      ...input,
      status: IDEMPOTENCY_STATUS.PROCESSING,
      responseStatus: null,
      responseBody: null,
      expiresAt: new Date(Date.now() + DEFAULT_TTL_MS),
    });

    try {
      return await this.idempotencyRepository.save(record);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return null;
      }
      throw error;
    }
  }

  private async findActiveRecord(scope: {
    userId: string;
    method: string;
    path: string;
    key: string;
  }): Promise<IdempotencyKey | null> {
    const now = new Date();
    return this.idempotencyRepository
      .createQueryBuilder('record')
      .where('record.userId = :userId', { userId: scope.userId })
      .andWhere('record.method = :method', { method: scope.method })
      .andWhere('record.path = :path', { path: scope.path })
      .andWhere('record.key = :key', { key: scope.key })
      .andWhere('record.expiresAt > :now', { now })
      .getOne();
  }

  private normalizeKey(key?: string): string | null {
    if (key === undefined) {
      return null;
    }

    const normalized = key.trim();
    if (normalized.length === 0) {
      return null;
    }

    if (normalized.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      throw new BadRequestException(ERROR_MESSAGES.IDEMPOTENCY_KEY_TOO_LONG);
    }

    return normalized;
  }

  private assertRequestHash(storedHash: string, incomingHash: string): void {
    if (storedHash !== incomingHash) {
      throw new ConflictException(
        ERROR_MESSAGES.IDEMPOTENCY_KEY_PAYLOAD_MISMATCH,
      );
    }
  }

  private hashPayload(payload: unknown): string {
    return createHash('sha256')
      .update(this.stableStringify(payload))
      .digest('hex');
  }

  private stableStringify(value: unknown): string {
    return JSON.stringify(this.canonicalize(value));
  }

  private normalizeResponseBody(
    value: unknown,
  ): Record<string, unknown> | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'object') {
      return value as Record<string, unknown>;
    }

    return { value };
  }

  private canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.canonicalize(item));
    }

    if (value && typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(objectValue).sort()) {
        sorted[key] = this.canonicalize(objectValue[key]);
      }
      return sorted;
    }

    return value;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as Record<string, unknown>)['code'] ===
        UNIQUE_VIOLATION_CODE
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
