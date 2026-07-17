import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockFindAll = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Game: { findAll: mockFindAll },
  Tag: {},
}));

const { default: libraryRoutes } = await import('../routes/library.js');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', libraryRoutes);
  return app;
}

describe('Library routes error handling', () => {
  beforeEach(() => {
    mockFindAll.mockReset();
  });

  it('returns 500 when /games query fails', async () => {
    mockFindAll.mockRejectedValueOnce(new Error('db fail'));
    const app = makeApp();
    const res = await request(app).get('/api/games').expect(500);
    expect(res.body).toEqual({ message: 'Unable to load games' });
  });

  it('returns 500 when /games/search query fails', async () => {
    mockFindAll.mockRejectedValueOnce(new Error('search fail'));
    const app = makeApp();
    const res = await request(app).get('/api/games/search?q=test').expect(500);
    expect(res.body).toEqual({ message: 'Unable to search games' });
  });
});

