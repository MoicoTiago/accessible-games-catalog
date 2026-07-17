import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

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

describe('Library search filters', () => {
  beforeEach(() => {
    mockFindAll.mockReset();
  });

  it('ignores unknown tags and applies HAVING count for valid tags', async () => {
    mockFindAll.mockResolvedValueOnce([
      {
        id: 1,
        title: 'Puzzle Game',
        platform: 'PC',
        releaseDate: '2024-01-01',
        rating: 4.5,
        thumbImages: ['/a.jpg'],
        tags: [{ name: 'Puzzle' }],
      },
    ]);

    const app = makeApp();
    const res = await request(app)
      .get('/api/games/search')
      .query({ q: '', tags: 'Puzzle,UnknownTag' })
      .expect(200);

    const callArgs = mockFindAll.mock.calls[0][0];
    const includeArg = callArgs.include?.[0];
    expect(includeArg?.where?.name?.[Op.in]).toEqual(['Puzzle']);
    expect(callArgs.having?.val || String(callArgs.having)).toContain('COUNT');

    expect(res.body).toEqual([
      {
        id: 1,
        title: 'Puzzle Game',
        platform: 'PC',
        releaseDate: '2024-01-01',
        rating: 4.5,
        images: ['/a.jpg'],
        tags: ['Puzzle'],
      },
    ]);
  });
});
