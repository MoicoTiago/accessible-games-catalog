import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

const mockReviewFindAll = jest.fn();
const mockUserFindByPk = jest.fn();
const mockGameFindByPk = jest.fn();
const mockGameFindAll = jest.fn();
const mockBcryptCompare = jest.fn();
const mockBcryptGenSalt = jest.fn();
const mockBcryptHash = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Review: { findAll: mockReviewFindAll },
  Game: { findByPk: mockGameFindByPk, findAll: mockGameFindAll },
  User: { findByPk: mockUserFindByPk },
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

jest.unstable_mockModule('bcryptjs', () => ({
  __esModule: true,
  default: {
    compare: mockBcryptCompare,
    genSalt: mockBcryptGenSalt,
    hash: mockBcryptHash,
  },
}));

const { default: usersRoutes } = await import('../routes/users.js');

function makeApp(user = null) {
  authMock.user = user;
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRoutes);
  return app;
}

describe('Users routes', () => {
  beforeEach(() => {
    mockReviewFindAll.mockReset();
    mockUserFindByPk.mockReset();
    mockGameFindByPk.mockReset();
    mockGameFindAll.mockReset();
    mockBcryptCompare.mockReset();
    mockBcryptGenSalt.mockReset();
    mockBcryptHash.mockReset();
    authMock.user = null;
  });

  describe('GET /api/users/:id/reviews', () => {
    it('validates id and ownership', async () => {
      const app = makeApp({ id: 1 });
      await request(app).get('/api/users/abc/reviews').expect(400);

      const app2 = makeApp({ id: 2 });
      const res = await request(app2).get('/api/users/1/reviews').expect(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
    });

    it('returns mapped reviews', async () => {
      mockReviewFindAll.mockResolvedValueOnce([
        {
          id: 10,
          rating: 4,
          comment: 'Nice',
          createdAt: '2024-01-01',
          game: { id: 3, title: 'G' },
        },
      ]);

      const app = makeApp({ id: 1 });
      const res = await request(app).get('/api/users/1/reviews').expect(200);

      expect(mockReviewFindAll).toHaveBeenCalledTimes(1);
      const opts = mockReviewFindAll.mock.calls[0][0];
      expect(opts).toMatchObject({
        where: { userId: 1 },
        order: [['createdAt', 'DESC']],
      });
      expect(Array.isArray(opts.include)).toBe(true);
      expect(opts.include[0]).toMatchObject({
        as: 'game',
        attributes: ['id', 'title'],
      });

      expect(res.body).toEqual([
        {
          id: 10,
          rating: 4,
          comment: 'Nice',
          createdAt: '2024-01-01',
          game: { id: 3, title: 'G' },
        },
      ]);
    });
  });

  describe('GET /api/users/:id/accessibility-preferences', () => {
    it('returns default prefs when none set', async () => {
      mockUserFindByPk.mockResolvedValueOnce({ id: 1, accessibilityPreferences: null });
      const app = makeApp({ id: 1 });
      const res = await request(app).get('/api/users/1/accessibility-preferences').expect(200);
      expect(res.body).toEqual({ visual: false, motor: false, cognitive: false, hearing: false });
    });

    it('requires ownership and existing user', async () => {
      const app = makeApp({ id: 2 });
      await request(app).get('/api/users/1/accessibility-preferences').expect(403);

      mockUserFindByPk.mockResolvedValueOnce(null);
      const app2 = makeApp({ id: 1 });
      const res = await request(app2).get('/api/users/1/accessibility-preferences').expect(404);
      expect(res.body).toEqual({ message: 'User not found' });
    });
  });

  describe('PUT /api/users/:id/accessibility', () => {
    it('404s when user not found', async () => {
      mockUserFindByPk.mockResolvedValueOnce(null);
      const app = makeApp();
      const res = await request(app)
        .put('/api/users/1/accessibility')
        .send({ visual: true })
        .expect(404);
      expect(res.body).toEqual({ message: 'User not found' });
    });

    it('updates preferences', async () => {
      const save = jest.fn();
      const user = { id: 1, accessibilityPreferences: null, save };
      mockUserFindByPk.mockResolvedValueOnce(user);
      const app = makeApp();
      const body = { visual: true, motor: false };
      const res = await request(app)
        .put('/api/users/1/accessibility')
        .send(body)
        .expect(200);
      expect(user.accessibilityPreferences).toEqual(body);
      expect(save).toHaveBeenCalled();
      expect(res.body).toEqual({ message: 'Preferences updated', preferences: body });
    });
  });

  describe('PATCH /api/users/:id/accessibility-preferences', () => {
    it('enforces id and ownership', async () => {
      const app = makeApp({ id: 1 });
      await request(app).patch('/api/users/abc/accessibility-preferences').expect(400);

      const app2 = makeApp({ id: 2 });
      await request(app2).patch('/api/users/1/accessibility-preferences').expect(403);
    });

    it('404s when user not found', async () => {
      mockUserFindByPk.mockResolvedValueOnce(null);
      const app = makeApp({ id: 1 });
      const res = await request(app)
        .patch('/api/users/1/accessibility-preferences')
        .send({ visual: true })
        .expect(404);
      expect(res.body).toEqual({ message: 'User not found' });
    });

    it('normalizes boolean flags and saves', async () => {
      const save = jest.fn();
      const user = { id: 1, accessibilityPreferences: null, save };
      mockUserFindByPk.mockResolvedValueOnce(user);
      const app = makeApp({ id: 1 });
      const res = await request(app)
        .patch('/api/users/1/accessibility-preferences')
        .send({ visual: 1, motor: 0, cognitive: 'yes', hearing: '' })
        .expect(200);

      expect(user.accessibilityPreferences).toEqual({
        visual: true,
        motor: false,
        cognitive: true,
        hearing: false,
      });
      expect(save).toHaveBeenCalled();
      expect(res.body).toEqual(user.accessibilityPreferences);
    });
  });

  describe('POST /api/users/:id/follow/:gameId', () => {
    it('validates ids and ownership', async () => {
      const app = makeApp({ id: 1 });
      await request(app).post('/api/users/abc/follow/1').expect(400);

      const app2 = makeApp({ id: 2 });
      const res = await request(app2).post('/api/users/1/follow/1').expect(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
    });

    it('404s if user or game missing', async () => {
      mockUserFindByPk.mockResolvedValueOnce(null);
      const app = makeApp({ id: 1 });
      const res = await request(app).post('/api/users/1/follow/1').expect(404);
      expect(res.body).toEqual({ message: 'User or game not found' });
    });

    it('follows game', async () => {
      const addFollowedGame = jest.fn();
      const user = { id: 1, addFollowedGame };
      const game = { id: 5 };
      mockUserFindByPk.mockResolvedValueOnce(user);
      mockGameFindByPk.mockResolvedValueOnce(game);
      const app = makeApp({ id: 1 });
      const res = await request(app).post('/api/users/1/follow/5').expect(201);
      expect(addFollowedGame).toHaveBeenCalledWith(game);
      expect(res.body).toEqual({ message: 'Followed', gameId: 5 });
    });
  });

  describe('DELETE /api/users/:id/follow/:gameId', () => {
    it('unfollows game', async () => {
      const removeFollowedGame = jest.fn();
      const user = { id: 1, removeFollowedGame };
      const game = { id: 5 };
      mockUserFindByPk.mockResolvedValueOnce(user);
      mockGameFindByPk.mockResolvedValueOnce(game);
      const app = makeApp({ id: 1 });
      const res = await request(app).delete('/api/users/1/follow/5').expect(200);
      expect(removeFollowedGame).toHaveBeenCalledWith(game);
      expect(res.body).toEqual({ message: 'Unfollowed', gameId: 5 });
    });
  });

  describe('GET /api/users/:id/followed-games', () => {
    it('returns mapped followed games', async () => {
      const user = {
        id: 1,
        followedGames: [
          { id: 2, title: 'Game1', thumbImages: ['/img1.jpg'] },
          { id: 3, title: 'Game2', thumbImages: null },
        ],
      };
      mockUserFindByPk.mockResolvedValueOnce(user);
      const app = makeApp({ id: 1 });
      const res = await request(app).get('/api/users/1/followed-games').expect(200);
      expect(res.body).toEqual([
        { id: 2, title: 'Game1', images: ['/img1.jpg'] },
        { id: 3, title: 'Game2', images: [] },
      ]);
    });
  });

  describe('PATCH /api/users/:id (profile)', () => {
    it('enforces ownership and fields', async () => {
      const app = makeApp({ id: 2 });
      await request(app).patch('/api/users/1').send({ username: 'x' }).expect(403);

      const app2 = makeApp({ id: 1 });
      const res2 = await request(app2).patch('/api/users/1').send({}).expect(400);
      expect(res2.body).toEqual({ error: 'No fields to update' });
    });

    it('404s when user not found', async () => {
      mockUserFindByPk.mockResolvedValueOnce(null);
      const app = makeApp({ id: 1 });
      const res = await request(app).patch('/api/users/1').send({ username: 'x' }).expect(404);
      expect(res.body).toEqual({ error: 'User not found' });
    });

    it('updates username and email', async () => {
      const save = jest.fn();
      const user = { id: 1, username: 'old', email: 'old@example.com', createdAt: '2024-01-01', save };
      mockUserFindByPk.mockResolvedValueOnce(user);
      const app = makeApp({ id: 1 });
      const res = await request(app)
        .patch('/api/users/1')
        .send({ username: ' new ', email: ' new@example.com ' })
        .expect(200);
      expect(user.username).toBe('new');
      expect(user.email).toBe('new@example.com');
      expect(save).toHaveBeenCalled();
      expect(res.body).toEqual({ id: 1, username: 'new', email: 'new@example.com', createdAt: '2024-01-01' });
    });
  });

  describe('PATCH /api/users/:id/password', () => {
    it('validates ownership and fields', async () => {
      const app = makeApp({ id: 2 });
      await request(app).patch('/api/users/1/password').send({ currentPassword: 'a', newPassword: 'b' }).expect(403);

      const app2 = makeApp({ id: 1 });
      const res2 = await request(app2).patch('/api/users/1/password').send({}).expect(400);
      expect(res2.body).toEqual({ error: 'Current and new password required' });
    });

    it('handles missing user and wrong current password', async () => {
      mockUserFindByPk.mockResolvedValueOnce(null);
      const app = makeApp({ id: 1 });
      const res = await request(app)
        .patch('/api/users/1/password')
        .send({ currentPassword: 'a', newPassword: 'b' })
        .expect(404);
      expect(res.body).toEqual({ error: 'User not found' });

      const user = { id: 1, password: 'hashed' };
      mockUserFindByPk.mockResolvedValueOnce(user);
      mockBcryptCompare.mockResolvedValueOnce(false);
      const app2 = makeApp({ id: 1 });
      const res2 = await request(app2)
        .patch('/api/users/1/password')
        .send({ currentPassword: 'a', newPassword: 'b' })
        .expect(400);
      expect(res2.body).toEqual({ error: 'Current password incorrect' });
    });

    it('changes password on success', async () => {
      const save = jest.fn();
      const user = { id: 1, password: 'oldhash', save };
      mockUserFindByPk.mockResolvedValueOnce(user);
      mockBcryptCompare.mockResolvedValueOnce(true);
      mockBcryptGenSalt.mockResolvedValueOnce('salt');
      mockBcryptHash.mockResolvedValueOnce('newhash');
      const app = makeApp({ id: 1 });
      const res = await request(app)
        .patch('/api/users/1/password')
        .send({ currentPassword: 'a', newPassword: 'b' })
        .expect(200);
      expect(mockBcryptCompare).toHaveBeenCalledWith('a', 'oldhash');
      expect(mockBcryptGenSalt).toHaveBeenCalledWith(10);
      expect(mockBcryptHash).toHaveBeenCalledWith('b', 'salt');
      expect(user.password).toBe('newhash');
      expect(save).toHaveBeenCalled();
      expect(res.body).toEqual({ success: true });
    });
  });

  describe('GET /api/users/:id/recommended-games', () => {
    it('returns [] when no prefs or no matching games', async () => {
      mockUserFindByPk.mockResolvedValueOnce({ id: 1, accessibilityPreferences: {} });
      const app = makeApp({ id: 1 });
      const res = await request(app).get('/api/users/1/recommended-games').expect(200);
      expect(res.body).toEqual([]);
    });

    it('returns filtered high-level tags for matching games', async () => {
      mockUserFindByPk.mockResolvedValueOnce({
        id: 1,
        accessibilityPreferences: { visual: true, motor: true, cognitive: false, hearing: false },
      });
      // First query: find games that match at least one interest tag
      mockGameFindAll
        .mockResolvedValueOnce([{ id: 10 }])
        .mockResolvedValueOnce([
          { id: 10, title: 'Game A', platform: 'PC', rating: 4.5, thumbImages: ['/a.jpg'], tags: [{ name: 'Vision' }, { name: 'Motor' }, { name: 'Puzzle' }] },
        ]);

      const app = makeApp({ id: 1 });
      const res = await request(app).get('/api/users/1/recommended-games').expect(200);

      // First call filters by interest tags (Vision + Motor)
      const includeArg = mockGameFindAll.mock.calls[0][0].include?.[0];
      expect(includeArg?.where?.name?.[Op.in]).toEqual(['Vision', 'Motor']);

      expect(res.body).toEqual([
        {
          id: 10,
          title: 'Game A',
          platform: 'PC',
          rating: 4.5,
          images: ['/a.jpg'],
          tags: ['Vision', 'Motor'],
        },
      ]);
    });
  });
});
