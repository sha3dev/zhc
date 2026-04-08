import type { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../errors/app-error.js';
import { logger } from '../observability/logger.js';

export function errorHandler(error: unknown, context: Context): Response {
  if (error instanceof ZodError) {
    const validationError = new ValidationError('Invalid request data', {
      details: error.flatten(),
    });
    context.status(validationError.statusCode as 400);
    return context.json({
      code: validationError.code,
      details: validationError.details,
      message: validationError.message,
    });
  }

  if (error instanceof AppError) {
    context.status(error.statusCode as 400);
    return context.json({
      code: error.code,
      details: error.details,
      message: error.message,
    });
  }

  logger.error('Unhandled request error', { error });

  context.status(500);
  return context.json({
    code: 'internal_server_error',
    message: 'Unexpected server error',
  });
}
