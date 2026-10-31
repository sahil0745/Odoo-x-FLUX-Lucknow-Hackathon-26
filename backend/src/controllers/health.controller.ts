import { Request, Response } from 'express';
import { env } from '../config/env';
import { checkDatabaseConnection } from '../config/database';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const dbStatus = await checkDatabaseConnection();

  res.status(200).json({
    success: true,
    application: 'Subscription Management System',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: '1.0.0',
    database: {
      connected: dbStatus.connected,
      status: dbStatus.connected ? 'ready' : 'awaiting_postgresql_connection',
    },
  });
}
