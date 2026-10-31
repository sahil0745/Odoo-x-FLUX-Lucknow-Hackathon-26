import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
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
