import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockGameFindAll = jest.fn();
const mockGameFindByPk = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Game: {
    findAll: mockGameFindAll,
    findByPk: mockGameFindByPk,
  },
  Tag: {},
  Review: {},
  User: {},
  GameReport: {},
  ReviewVote: {},
}));

jest.unstable_mockModule('../middleware/auth.js', () => ({
  __esModule: true,
  default: (req, _res, next) => {
    req.user = { id: 1, isAdmin: true };
    next();
  },
}));

const { default: gamesRoutes } = await import('../routes/games.js');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/games', gamesRoutes);
  return app;
}

describe('Games router core endpoints', () => {
  beforeEach(() => {
    mockGameFindAll.mockReset();
    mockGameFindByPk.mockReset();
  });

  describe('GET /api/games', () => {
    it('serializes games with tags, reviews and images', async () => {
      mockGameFindAll.mockResolvedValueOnce([
        {
          id: 1,
          title: 'Test Game',
          platform: 'PC',
          developer: 'Dev',
          category: 'Action',
          releaseDate: '2024-01-01',
          rating: 4.5,
          description: 'desc',
          thumbImages: ['img1.jpg', '/img2.jpg', '   '],
          tags: [
            { id: 10, name: 'Puzzle' },
          ],
          reviews: [
            {
              id: 5,
              rating: 4,
              comment: 'Good',
              createdAt: '2024-02-01',
              user: { id: 2, username: 'alice' },
            },
            {
              id: 6,
              rating: 3,
              comment: 'Ok',
              createdAt: '2024-02-02',
              user: null,
            },
          ],
        },
      ]);

      const app = makeApp();
      const res = await request(app).get('/api/games').expect(200);

      expect(mockGameFindAll).toHaveBeenCalledTimes(1);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toEqual({
        id: 1,
        name: 'Test Game',
        platform: 'PC',
        developer: 'Dev',
        category: 'Action',
        releaseDate: '2024-01-01',
        rating: 4.5,
        description: 'desc',
        images: ['/img1.jpg', '/img2.jpg'],
        tags: [{ id: 10, name: 'Puzzle' }],
        reviews: [
          {
            id: 5,
            rating: 4,
            comment: 'Good',
            createdAt: '2024-02-01',
            user: { id: 2, username: 'alice' },
          },
          {
            id: 6,
            rating: 3,
            comment: 'Ok',
            createdAt: '2024-02-02',
            user: null,
          },
        ],
      });
    });

    it('returns 500 when Game.findAll throws', async () => {
      mockGameFindAll.mockRejectedValueOnce(new Error('boom'));
      const app = makeApp();
      const res = await request(app).get('/api/games').expect(500);
      expect(res.body).toEqual({ error: 'boom' });
    });
  });

  describe('GET /api/games/:id', () => {
    it('rejects non-numeric id', async () => {
      const app = makeApp();
      const res = await request(app).get('/api/games/abc').expect(400);
      expect(res.body).toEqual({ error: 'Invalid id' });
    });

    it('returns 404 when game not found', async () => {
      mockGameFindByPk.mockResolvedValueOnce(null);
      const app = makeApp();
      const res = await request(app).get('/api/games/99').expect(404);
      expect(res.body).toEqual({ error: 'Game not found' });
    });

    it('returns serialized game when found', async () => {
      mockGameFindByPk.mockResolvedValueOnce({
        id: 2,
        title: 'Detail Game',
        platform: 'Web',
        developer: 'Dev2',
        category: 'Puzzle',
        releaseDate: '2024-03-01',
        rating: 5,
        description: 'long',
        thumbImages: null,
        tags: [],
        reviews: [],
      });
      const app = makeApp();
      const res = await request(app).get('/api/games/2').expect(200);
      expect(res.body).toEqual({
        id: 2,
        name: 'Detail Game',
        platform: 'Web',
        developer: 'Dev2',
        category: 'Puzzle',
        releaseDate: '2024-03-01',
        rating: 5,
        description: 'long',
        images: [],
        tags: [],
        reviews: [],
      });
    });

    it('returns 500 when Game.findByPk throws', async () => {
      mockGameFindByPk.mockRejectedValueOnce(new Error('db down'));
      const app = makeApp();
      const res = await request(app).get('/api/games/1').expect(500);
      expect(res.body).toEqual({ error: 'db down' });
    });
  });
});

