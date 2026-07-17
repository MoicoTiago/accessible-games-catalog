import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockUserFindByPk = jest.fn();
const mockReviewFindAll = jest.fn();
const mockGameFindAll = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  User: { findByPk: mockUserFindByPk },
  Review: { findAll: mockReviewFindAll },
  Game: { findAll: mockGameFindAll },
  Tag: {},
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

const { default: usersRoutes } = await import('../routes/users.js');

function makeApp(user = null) {
  authMock.user = user;
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRoutes);
  return app;
}

describe('Users routes error paths', () => {
  beforeEach(() => {
    mockUserFindByPk.mockReset();
    mockReviewFindAll.mockReset();
    mockGameFindAll.mockReset();
    authMock.user = null;
  });

  it('handles error when fetching reviews', async () => {
    mockReviewFindAll.mockRejectedValueOnce(new Error('boom'));
    const app = makeApp({ id: 1 });
    const res = await request(app).get('/api/users/1/reviews').expect(500);
    expect(res.body).toEqual({ message: 'Failed to fetch user reviews' });
  });

  it('handles error when loading accessibility preferences', async () => {
    mockUserFindByPk.mockRejectedValueOnce(new Error('oops'));
    const app = makeApp({ id: 1 });
    const res = await request(app)
      .get('/api/users/1/accessibility-preferences')
      .expect(500);
    expect(res.body).toEqual({ message: 'Failed to load accessibility preferences' });
  });

  it('handles error when updating accessibility preferences', async () => {
    mockUserFindByPk.mockRejectedValueOnce(new Error('err'));
    const app = makeApp({ id: 1 });
    const res = await request(app)
      .patch('/api/users/1/accessibility-preferences')
      .send({ visual: true })
      .expect(500);
    expect(res.body).toEqual({ message: 'Failed to update accessibility preferences' });
  });

  it('handles error when loading followed games', async () => {
    mockUserFindByPk.mockRejectedValueOnce(new Error('err2'));
    const app = makeApp({ id: 1 });
    const res = await request(app)
      .get('/api/users/1/followed-games')
      .expect(500);
    expect(res.body).toEqual({ message: 'Failed to load followed games' });
  });

  it('handles error when fetching recommended games', async () => {
    mockUserFindByPk.mockRejectedValueOnce(new Error('err3'));
    const app = makeApp({ id: 1 });
    const res = await request(app)
      .get('/api/users/1/recommended-games')
      .expect(500);
    expect(res.body).toEqual({ message: 'Failed to fetch recommended games' });
  });
});

