import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipBuckets = new Map<string, RateLimitRecord>();

// Clean up stale buckets every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipBuckets.entries()) {
    if (record.resetAt <= now) {
      ipBuckets.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  prefix?: string;
}

/**
 * Creates an in-memory sliding window rate limiter middleware.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    prefix = 'rl',
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test or development environment, bypass rate limiting so setup/testing is not blocked
    if (
      (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) ||
      process.env.NODE_ENV === 'development'
    ) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${prefix}:${ip}`;
    const now = Date.now();

    let record = ipBuckets.get(key);

    if (!record || record.resetAt <= now) {
      record = {
        count: 1,
        resetAt: now + windowMs,
      };
      ipBuckets.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', resetSeconds);
      return next(new AppError(message, 429, { retryAfterSeconds: resetSeconds }));
    }

    next();
  };
}

// Pre-configured rate limiters for sensitive endpoints
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  prefix: 'login',
});

export const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Too many password reset requests. Please wait an hour before requesting again.',
  prefix: 'forgot_pw',
});
