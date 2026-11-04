const request = require('supertest');
const app = require('../src/app');

describe('Health and Application Foundation Integration Tests', () => {
  describe('GET /api/health', () => {
    it('should return 200 OK with server status and service health', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('services');
      expect(res.body.services).toHaveProperty('api', 'healthy');
      // Accurately reports disconnected status when no live DB connection is present
      expect(res.body.services).toHaveProperty('database', 'disconnected');
    });
  });

  describe('404 Not Found Handling', () => {
    it('should return 404 for undefined routes in a standardized error format', async () => {
      const res = await request(app).get('/api/undefined-endpoint');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('status', 'fail');
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/Route not found/);
    });
  });
});
