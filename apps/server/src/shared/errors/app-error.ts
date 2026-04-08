export interface AppErrorOptions {
  cause?: unknown;
  details?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;
  override readonly cause?: unknown;

  constructor(message: string, code: string, statusCode: number, options: AppErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, 'validation_error', 400, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, 'not_found', 404, options);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, 'conflict', 409, options);
  }
}

export class InfrastructureError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, 'infrastructure_error', 500, options);
  }
}
