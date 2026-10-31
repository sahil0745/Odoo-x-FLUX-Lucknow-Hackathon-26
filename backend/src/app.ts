import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import v1Router from './routes';

export function createApp(): Application {
  const app = express();

  // 1. Helmet security headers
  app.use(helmet());

  // 2. Cookie parser for HttpOnly refresh tokens
  app.use(cookieParser());

  // 3. CORS configuration (Strict explicit origins, zero wildcards with credentials)
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  if (env.FRONTEND_URL && !allowedOrigins.includes(env.FRONTEND_URL)) {
    allowedOrigins.push(env.FRONTEND_URL);
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) && origin !== '*') {
          return callback(null, true);
        }
        return callback(new Error(`Origin '${origin}' not permitted by CORS policy`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 4. Request body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 5. Request Logging middleware
  app.use(requestLogger);

  // 6. Root route redirect to API prefix
  app.get('/', (_req, res) => {
    res.redirect(env.API_PREFIX);
  });

  // 7. Mount versioned API routes
  app.use(env.API_PREFIX, v1Router);

  // 8. 404 handler for unmatched routes
  app.use(notFoundHandler);

  // 9. Centralized error handling middleware
  app.use(errorHandler);

  return app;
}
