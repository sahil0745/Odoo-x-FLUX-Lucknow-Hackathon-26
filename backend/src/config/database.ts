import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Non-blocking database connectivity check.
 * Used during health check or boot to verify PostgreSQL availability without crashing the process.
 */
export async function checkDatabaseConnection(): Promise<{ connected: boolean; message?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, message: 'Database connected successfully' };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown database connection error';
    return { connected: false, message: errMessage };
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected cleanly');
  } catch (error) {
    logger.error('Error disconnecting database', error);
  }
}
