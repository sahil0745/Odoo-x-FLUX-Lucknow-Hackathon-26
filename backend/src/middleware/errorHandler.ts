import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn(`[ErrorHandler] Validation failed for ${req.method} ${req.originalUrl}`, {
      errors: formattedErrors,
    });

    res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Validation failed',
      details: formattedErrors,
    });
    return;
  }

  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const message = isAppError ? err.message : 'Internal server error';
  const details = isAppError ? err.details : undefined;

  logger.error(`[ErrorHandler] ${req.method} ${req.originalUrl} failed: ${err.message}`, {
    stack: err.stack,
    details,
  });

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(details ? { details } : {}),
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
