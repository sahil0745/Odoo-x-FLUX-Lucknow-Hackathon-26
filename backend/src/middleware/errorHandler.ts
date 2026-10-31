import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
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
  // 1. Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Validation failed',
      details: formattedErrors,
    });
    return;
  }

  // 2. Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json({
        success: false,
        statusCode: 409,
        message: `A record with this ${target} already exists`,
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'The requested resource was not found',
      });
      return;
    }

    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Operation failed due to a foreign key constraint restriction',
      });
      return;
    }
  }

  // 3. Handle AppError and general operational errors
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
