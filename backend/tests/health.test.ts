import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Health Check API', () => {
  const app = createApp();

  it('GET /api/v1/health returns 200 with valid health metadata', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('application', 'Subscription Management System');
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('environment');
    expect(res.body).toHaveProperty('database');
  });

  it('GET /api/v1/non-existent returns 404 with standard error format', async () => {
    const res = await request(app).get('/api/v1/non-existent');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('statusCode', 404);
    expect(res.body).toHaveProperty('message');
  });
});
