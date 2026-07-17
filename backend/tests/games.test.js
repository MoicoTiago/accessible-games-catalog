import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

// Mock the Sequelize models module that routes use
const mockFindAll = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Game: { findAll: mockFindAll },
  Tag: {}
}));

const { default: libraryRoutes } = await import('../routes/library.js');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', libraryRoutes);
  return app;
}

describe('Games API (mocked DB)', () => {
  beforeEach(() => {
    mockFindAll.mockReset();
  });

  it('GET /api/games maps games and sorts tags', async () => {
    mockFindAll.mockResolvedValue([
      { id: 1, title: 'Alpha', platform: 'Web', releaseDate: null, rating: 3, thumbImages: [], tags: [{ name: 'Puzzle' }, { name: 'Action' }] },
      { id: 2, title: 'Beta', platform: 'Mobile', releaseDate: null, rating: 4, thumbImages: [], tags: [{ name: 'RPG' }] }
    ]);

    const app = makeApp();
    const res = await request(app).get('/api/games').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const first = res.body.find(x => x.id === 1);
    expect(first.tags).toEqual(['Action','Puzzle']); // sorted
  });

  it('GET /api/games/search without filters delegates to same mapping', async () => {
    mockFindAll.mockResolvedValue([
      { id: 3, title: 'Gamma', platform: 'PC', releaseDate: null, rating: 5, thumbImages: [], tags: [{ name: 'Strategy' }, { name: 'Adventure' }] }
    ]);

    const app = makeApp();
    const res = await request(app).get('/api/games/search').expect(200);

    expect(res.body).toEqual([
      {
        id: 3,
        title: 'Gamma',
        platform: 'PC',
        releaseDate: null,
        rating: 5,
        images: [],
        tags: ['Adventure', 'Strategy']
      }
    ]);
    expect(mockFindAll).toHaveBeenCalled();
  });

  it('GET /api/games/search with valid tags builds include.where and having', async () => {
    mockFindAll.mockResolvedValue([]);

    const app = makeApp();
    const res = await request(app).get('/api/games/search?tags=Puzzle,Action').expect(200);

    expect(Array.isArray(res.body)).toBe(true);

    // Inspect the options passed to Game.findAll
    expect(mockFindAll).toHaveBeenCalledTimes(1);
    const opts = mockFindAll.mock.calls[0][0];
    expect(opts).toBeTruthy();
    expect(Array.isArray(opts.include)).toBe(true);
    const inc = opts.include[0];
    expect(inc.where).toBeTruthy();
    expect(inc.where.name[Op.in]).toEqual(['Puzzle','Action']);
    expect(opts.group).toEqual(['Game.id']);
    expect(opts.having).toBeTruthy();
  });

  it('GET /api/games/search with unknown tags ignores them and does not use having', async () => {
    mockFindAll.mockResolvedValue([]);

    const app = makeApp();
    const res = await request(app).get('/api/games/search?tags=NotATag').expect(200);

    expect(Array.isArray(res.body)).toBe(true);

    // In this branch the route should treat it as no valid filters (fallback path)
    expect(mockFindAll).toHaveBeenCalledTimes(1);
    const opts = mockFindAll.mock.calls[0][0];
    expect(opts).toBeTruthy();
    // Fallback path should not include group/having and include.where should be undefined
    const inc = opts.include[0];
    expect(inc.where).toBeUndefined();
    expect(opts.group).toBeUndefined();
    expect(opts.having).toBeUndefined();
  });
});
