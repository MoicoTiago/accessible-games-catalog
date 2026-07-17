import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockGameFindByPk = jest.fn();
const mockGameDestroy = jest.fn();
const mockGameReportCreate = jest.fn();
const mockGameReportFindAll = jest.fn();
const mockGameReportFindByPk = jest.fn();
const mockGameReportUpdate = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Game: { findByPk: mockGameFindByPk },
  Tag: {},
  Review: {},
  User: {},
  GameReport: {
    create: mockGameReportCreate,
    findAll: mockGameReportFindAll,
    findByPk: mockGameReportFindByPk,
    update: mockGameReportUpdate,
  },
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

describe('Game reports and admin routes', () => {
  beforeEach(() => {
    mockGameFindByPk.mockReset();
    mockGameDestroy.mockReset();
    mockGameReportCreate.mockReset();
    mockGameReportFindAll.mockReset();
    mockGameReportFindByPk.mockReset();
    mockGameReportUpdate.mockReset();
    authMock.user = null;
  });

  describe('POST /api/games/:id/reports', () => {
    it('requires authentication', async () => {
      const app = makeApp(null);
      const res = await request(app)
        .post('/api/games/1/reports')
        .send({ message: 'bad content' })
        .expect(401);
      expect(res.body).toEqual({ message: 'Not authenticated' });
    });

    it('validates numeric game id', async () => {
      const app = makeApp({ id: 1 });
      const res = await request(app)
        .post('/api/games/abc/reports')
        .send({ message: 'bad content' })
        .expect(400);
      expect(res.body).toEqual({ message: 'Invalid game id' });
    });

    it('validates message presence', async () => {
      const app = makeApp({ id: 1 });
      const res = await request(app)
        .post('/api/games/1/reports')
        .send({})
        .expect(400);
      expect(res.body).toEqual({ message: 'Message is required' });
    });

    it('returns 404 when game not found', async () => {
      mockGameFindByPk.mockResolvedValueOnce(null);
      const app = makeApp({ id: 1 });
      const res = await request(app)
        .post('/api/games/1/reports')
        .send({ message: '  spam  ' })
        .expect(404);
      expect(res.body).toEqual({ message: 'Game not found' });
    });

    it('creates report and returns 201', async () => {
      mockGameFindByPk.mockResolvedValueOnce({ id: 1 });
      mockGameReportCreate.mockResolvedValueOnce({});
      const app = makeApp({ id: 7 });
      await request(app)
        .post('/api/games/1/reports')
        .send({ message: '  offensive  ' })
        .expect(201);

      expect(mockGameReportCreate).toHaveBeenCalledWith({
        gameId: 1,
        userId: 7,
        message: 'offensive',
        status: false,
      });
    });
  });

  describe('GET /api/games/reports', () => {
    it('requires admin', async () => {
      const app = makeApp({ id: 1, isAdmin: false });
      const res = await request(app).get('/api/games/reports').expect(403);
      expect(res.body).toEqual({ message: 'Admins only' });
    });

    it('returns mapped reports for admin', async () => {
      mockGameReportFindAll.mockResolvedValueOnce([
        {
          id: 1,
          message: 'm1',
          status: false,
          createdAt: '2024-01-01',
          user: { id: 2 },
          game: { id: 3, title: 'G' },
        },
        {
          id: 2,
          message: 'm2',
          status: true,
          createdAt: '2024-01-02',
          user: null,
          game: null,
        },
      ]);

      const app = makeApp({ id: 99, isAdmin: true });
      const res = await request(app).get('/api/games/reports').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual([
        {
          id: 1,
          message: 'm1',
          status: false,
          createdAt: '2024-01-01',
          userId: 2,
          game: { id: 3, title: 'G' },
        },
        {
          id: 2,
          message: 'm2',
          status: true,
          createdAt: '2024-01-02',
          userId: null,
          game: null,
        },
      ]);
    });
  });

  describe('PATCH /api/games/reports/:id', () => {
    it('requires admin', async () => {
      const app = makeApp({ id: 1, isAdmin: false });
      const res = await request(app).patch('/api/games/reports/1').expect(403);
      expect(res.body).toEqual({ message: 'Admins only' });
    });

    it('validates numeric report id', async () => {
      const app = makeApp({ id: 1, isAdmin: true });
      const res = await request(app).patch('/api/games/reports/abc').expect(400);
      expect(res.body).toEqual({ message: 'Invalid report id' });
    });

    it('returns 404 if report missing', async () => {
      mockGameReportFindByPk.mockResolvedValueOnce(null);
      const app = makeApp({ id: 1, isAdmin: true });
      const res = await request(app).patch('/api/games/reports/1').expect(404);
      expect(res.body).toEqual({ message: 'Report not found' });
    });

    it('marks report as resolved', async () => {
      const save = jest.fn();
      mockGameReportFindByPk.mockResolvedValueOnce({ id: 1, status: false, save });
      const app = makeApp({ id: 1, isAdmin: true });
      await request(app).patch('/api/games/reports/1').expect(204);
      expect(save).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/games/:id', () => {
    it('requires admin', async () => {
      const app = makeApp({ id: 1, isAdmin: false });
      const res = await request(app).delete('/api/games/1').expect(403);
      expect(res.body).toEqual({ message: 'Admins only' });
    });

    it('validates id', async () => {
      const app = makeApp({ id: 1, isAdmin: true });
      const res = await request(app).delete('/api/games/abc').expect(400);
      expect(res.body).toEqual({ message: 'Invalid id' });
    });

    it('returns 404 if game not found', async () => {
      mockGameFindByPk.mockResolvedValueOnce(null);
      const app = makeApp({ id: 1, isAdmin: true });
      const res = await request(app).delete('/api/games/1').expect(404);
      expect(res.body).toEqual({ message: 'Game not found' });
    });

    it('marks reports resolved and deletes game', async () => {
      mockGameFindByPk.mockResolvedValueOnce({ id: 1, destroy: mockGameDestroy });
      mockGameReportUpdate.mockResolvedValueOnce([1]);

      const app = makeApp({ id: 1, isAdmin: true });
      await request(app).delete('/api/games/1').expect(204);

      expect(mockGameReportUpdate).toHaveBeenCalledWith({ status: true }, { where: { gameId: 1 } });
      expect(mockGameDestroy).toHaveBeenCalled();
    });
  });
});

