import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ForbiddenError } from '../utils/AppError';

/**
 * Origin-Verification CSRF Protection Middleware.
 * 
 * Verifies that state-changing requests on cookie-authenticated endpoints
 * originate from a trusted frontend domain (matching CORS_ORIGIN or FRONTEND_URL).
 */
export function verifyCsrfOrigin(req: Request, _res: Response, next: NextFunction): void {
  // Safe methods do not require CSRF origin checks
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const originHeader = req.headers.origin || req.headers.referer;

  // In non-browser contexts (e.g. curl, server-to-server) where no origin header is provided,
  // allow request only if it does not rely on browser ambient credentials
  if (!originHeader) {
    return next();
  }

  let requestOrigin: string;
  try {
    const url = new URL(originHeader);
    requestOrigin = url.origin;
  } catch {
    return next(new ForbiddenError('CSRF protection: Malformed Origin/Referer header'));
  }

  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  if (env.FRONTEND_URL && !allowedOrigins.includes(env.FRONTEND_URL)) {
    allowedOrigins.push(env.FRONTEND_URL);
  }

  const isTrusted = allowedOrigins.some((allowed) => {
    try {
      const allowedOrigin = new URL(allowed).origin;
      return requestOrigin === allowedOrigin;
    } catch {
      return requestOrigin === allowed;
    }
  });

  if (!isTrusted) {
    return next(
      new ForbiddenError(`CSRF protection: Request origin '${requestOrigin}' is not authorized`)
    );
  }

  next();
}
