import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(5000),
    API_PREFIX: z.string().default('/api/v1'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    DATABASE_URL: z
      .string()
      .default('postgresql://postgres:postgres@localhost:5432/brightloop_subscriptions?schema=public'),
    FRONTEND_URL: z.string().default('http://localhost:5173'),
    DEFAULT_CURRENCY: z.string().default('USD'),
    JWT_ACCESS_SECRET: z
      .string()
      .min(16)
      .default('default_dev_access_secret_min_32_characters_long_12345'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(16)
      .default('default_dev_refresh_secret_min_32_characters_long_12345'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    // Email / SMTP configuration (Optional for local dev, uses console logger adapter if omitted)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().default('Brightloop <noreply@brightloop.local>'),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        const isDefaultAccess =
          data.JWT_ACCESS_SECRET === 'default_dev_access_secret_min_32_characters_long_12345';
        const isDefaultRefresh =
          data.JWT_REFRESH_SECRET === 'default_dev_refresh_secret_min_32_characters_long_12345';
        return !isDefaultAccess && !isDefaultRefresh;
      }
      return true;
    },
    {
      message:
        'Production deployments must configure unique, non-default JWT_ACCESS_SECRET and JWT_REFRESH_SECRET',
    }
  );

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;
