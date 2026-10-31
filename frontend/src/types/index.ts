export interface HealthResponse {
  success: boolean;
  application: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  environment: string;
  version: string;
  database: {
    connected: boolean;
    status: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  details?: unknown;
}
