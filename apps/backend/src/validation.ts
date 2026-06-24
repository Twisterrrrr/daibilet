import type { IncomingMessage } from 'node:http';
import { z } from 'zod';
import { readJsonBody } from './http.js';

export interface ValidationErrorDto {
  error: 'validation_error';
  issues: Array<{
    path: string;
    message: string;
  }>;
}

export class RequestValidationError extends Error {
  readonly issues: ValidationErrorDto['issues'];

  constructor(error: z.ZodError) {
    super('Request validation failed');
    this.name = 'RequestValidationError';
    this.issues = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }

  toDto(): ValidationErrorDto {
    return {
      error: 'validation_error',
      issues: this.issues,
    };
  }
}

export function parseSearchParams<Schema extends z.ZodType>(
  schema: Schema,
  searchParams: URLSearchParams,
): z.infer<Schema> {
  const payload: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    payload[key] = values.length > 1 ? values : values[0] || '';
  }
  return parseWithSchema(schema, payload);
}

export async function parseJsonBody<Schema extends z.ZodType>(
  schema: Schema,
  request: IncomingMessage,
): Promise<z.infer<Schema>> {
  const payload = await readJsonBody<unknown>(request);
  return parseWithSchema(schema, payload);
}

export function parseWithSchema<Schema extends z.ZodType>(schema: Schema, payload: unknown): z.infer<Schema> {
  const result = schema.safeParse(payload);
  if (!result.success) throw new RequestValidationError(result.error);
  return result.data;
}

export function isRequestValidationError(error: unknown): error is RequestValidationError {
  return error instanceof RequestValidationError;
}

