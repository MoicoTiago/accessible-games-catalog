import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockReviewCreate = jest.fn();
const mockReviewFindAll = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Game: {},
  Tag: {},
  Review: {
    create: mockReviewCreate,
    findAll: mockReviewFindAll,
  },
  User: {},
  GameReport: {},
  ReviewVote: {},
}));

const authMock = jest.fn((req, _res, next) => {
  req.user = authMock.user || null;
  next();
});

jest.unstable_mockModule('../middleware/auth.js', () => ({
  __esModule: true,
  default: authMock,
}));

const { default: gamesRoutes } = await import('../routes/games.js');

function makeApp(user = null) {
  authMock.user = user;
  const app = express();
  app.use(express.json());
  app.use('/api/games', gamesRoutes);
  return app;
}

describe('Game reviews routes', () => {
  beforeEach(() => {
    mockReviewCreate.mockReset();
    mockReviewFindAll.mockReset();
    authMock.user = null;
  });

  describe('POST /api/games/:id/reviews', () => {
    it('requires authentication', async () => {
      const app = makeApp(null);
      const res = await request(app)
        .post('/api/games/1/reviews')
        .send({ rating: 5, comment: 'Nice' })
        .expect(401);
      expect(res.body).toEqual({ message: 'Not authenticated' });
    });

    it('requires rating', async () => {
      const app = makeApp({ id: 1 });
      const res = await request(app)
        .post('/api/games/1/reviews')
        .send({ comment: 'Nice' })
        .expect(400);
      expect(res.body).toEqual({ message: 'rating is required' });
    });

    it('creates review', async () => {
      mockReviewCreate.mockResolvedValueOnce({ id: 10, rating: 4, comment: 'Cool', gameId: '1', userId: 7 });
      const app = makeApp({ id: 7 });
      const res = await request(app)
        .post('/api/games/1/reviews')
        .send({ rating: 4, comment: 'Cool' })
        .expect(201);

      expect(mockReviewCreate).toHaveBeenCalledWith({ rating: 4, comment: 'Cool', gameId: '1', userId: 7 });
      expect(res.body).toEqual({ id: 10, rating: 4, comment: 'Cool', gameId: '1', userId: 7 });
    });
  });

  describe('GET /api/games/:id/reviews', () => {
    it('returns reviews for a game', async () => {
      mockReviewFindAll.mockResolvedValueOnce([
        {
          id: 1,
          rating: 5,
          comment: 'Great',
          createdAt: '2024-01-01',
          user: { id: 2, username: 'u1', email: 'e@example.com' },
        },
      ]);

      const app = makeApp();
      const res = await request(app).get('/api/games/1/reviews').expect(200);
      expect(mockReviewFindAll).toHaveBeenCalledTimes(1);
      const opts = mockReviewFindAll.mock.calls[0][0];
      expect(opts).toMatchObject({
        where: { gameId: '1' },
        order: [['createdAt', 'DESC']],
      });
      expect(Array.isArray(opts.include)).toBe(true);
      expect(opts.include[0]).toMatchObject({
        as: 'user',
        attributes: ['id', 'username', 'email'],
      });
      expect(opts.include[1]).toMatchObject({
        as: 'votes',
        attributes: ['userId', 'value'],
      });

      expect(res.body).toEqual([
        {
          id: 1,
          rating: 5,
          comment: 'Great',
          createdAt: '2024-01-01',
          likes: 0,
          dislikes: 0,
          myVote: 0,
          user: { id: 2, username: 'u1', email: 'e@example.com' },
        },
      ]);
    });
  });
});
