import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockFindByPk = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  __esModule: true,
  default: {
    findOne: mockFindOne,
    create: mockCreate,
    findByPk: mockFindByPk,
  },
}));

const signMock = jest.fn();
const verifyMock = jest.fn();

jest.unstable_mockModule('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: signMock,
    verify: verifyMock,
  },
}));

const hashMock = jest.fn();
const compareMock = jest.fn();

jest.unstable_mockModule('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: hashMock,
    compare: compareMock,
  },
}));

const { default: authRoutes } = await import('../routes/auth.js');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
}

describe('Auth routes', () => {
  beforeEach(() => {
    mockFindOne.mockReset();
    mockCreate.mockReset();
    mockFindByPk.mockReset();
    signMock.mockReset();
    verifyMock.mockReset();
    hashMock.mockReset();
    compareMock.mockReset();
  });

  describe('POST /api/auth/register', () => {
    it('requires username, email and password', async () => {
      const app = makeApp();
      const res = await request(app).post('/api/auth/register').send({}).expect(400);
      expect(res.body).toEqual({ message: 'username, email and password are required' });
    });

    it('rejects when email already in use', async () => {
      mockFindOne.mockResolvedValueOnce({ id: 1 });
      const app = makeApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'u1', email: 'e@example.com', password: 'pw' })
        .expect(409);
      expect(res.body).toEqual({ message: 'Email already in use' });
    });

    it('rejects when username already in use', async () => {
      mockFindOne
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 2 }); // username check
      const app = makeApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'u1', email: 'e@example.com', password: 'pw' })
        .expect(409);
      expect(res.body).toEqual({ message: 'Username already in use' });
    });

    it('creates user and returns token on success', async () => {
      mockFindOne
        .mockResolvedValueOnce(null) // email
        .mockResolvedValueOnce(null); // username
      hashMock.mockResolvedValueOnce('hashed');
      mockCreate.mockResolvedValueOnce({ id: 123, username: 'u1', email: 'e@example.com' });
      signMock.mockReturnValueOnce('jwt-token');

      const app = makeApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'u1', email: 'e@example.com', password: 'pw' })
        .expect(201);

      expect(hashMock).toHaveBeenCalledWith('pw', 10);
      expect(mockCreate).toHaveBeenCalledWith({ username: 'u1', email: 'e@example.com', password: 'hashed' });
      expect(signMock).toHaveBeenCalled();
      expect(res.body).toMatchObject({ id: 123, username: 'u1', email: 'e@example.com', token: 'jwt-token' });
    });

    it('handles errors with 500', async () => {
      mockFindOne.mockRejectedValueOnce(new Error('db fail'));
      const app = makeApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'u1', email: 'e@example.com', password: 'pw' })
        .expect(500);
      expect(res.body).toEqual({ message: 'Registration failed' });
    });
  });

  describe('POST /api/auth/login', () => {
    it('requires identifier and password', async () => {
      const app = makeApp();
      const res = await request(app).post('/api/auth/login').send({}).expect(400);
      expect(res.body).toEqual({ message: 'identifier (username or email) and password are required' });
    });

    it('returns 404 when user not found', async () => {
      mockFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const app = makeApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'u1', password: 'pw' })
        .expect(404);
      expect(mockFindOne).toHaveBeenCalledTimes(2);
      expect(res.body).toEqual({ message: 'User not found' });
    });

    it('returns 401 when password invalid', async () => {
      const fakeUser = { id: 5, username: 'u1', email: 'e@example.com', password: 'hashed' };
      mockFindOne.mockResolvedValueOnce(fakeUser); // username lookup
      compareMock.mockResolvedValueOnce(false);

      const app = makeApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'u1', password: 'wrong' })
        .expect(401);
      expect(res.body).toEqual({ message: 'Invalid password' });
    });

    it('logs in successfully and returns token', async () => {
      const fakeUser = { id: 5, username: 'u1', email: 'e@example.com', password: 'hashed' };
      mockFindOne.mockResolvedValueOnce(fakeUser); // username lookup
      compareMock.mockResolvedValueOnce(true);
      signMock.mockReturnValueOnce('jwt-login-token');

      const app = makeApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'u1', password: 'pw' })
        .expect(200);

      expect(compareMock).toHaveBeenCalledWith('pw', 'hashed');
      expect(signMock).toHaveBeenCalled();
      expect(res.body).toMatchObject({ token: 'jwt-login-token', id: 5, username: 'u1', email: 'e@example.com' });
    });
  });

  describe('GET /api/auth/me', () => {
    it('requires bearer token', async () => {
      const app = makeApp();
      const res = await request(app).get('/api/auth/me').expect(401);
      expect(res.body).toEqual({ message: 'Missing token' });
    });

    it('rejects invalid token', async () => {
      verifyMock.mockImplementation(() => {
        throw new Error('bad');
      });
      const app = makeApp();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer badtoken')
        .expect(401);
      expect(res.body).toEqual({ message: 'Invalid token' });
    });

    it('returns 404 when user not found', async () => {
      verifyMock.mockReturnValueOnce({ id: 99 });
      mockFindByPk.mockResolvedValueOnce(null);
      const app = makeApp();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer good')
        .expect(404);
      expect(res.body).toEqual({ message: 'User not found' });
    });

    it('returns user profile on success', async () => {
      verifyMock.mockReturnValueOnce({ id: 99 });
      mockFindByPk.mockResolvedValueOnce({ id: 99, username: 'u1', email: 'e@example.com', createdAt: '2024-01-01', isAdmin: false });
      const app = makeApp();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer good')
        .expect(200);
      expect(mockFindByPk).toHaveBeenCalledWith(99, { attributes: ['id', 'username', 'email', 'createdAt', 'isAdmin'] });
      expect(res.body).toEqual({ id: 99, username: 'u1', email: 'e@example.com', createdAt: '2024-01-01', isAdmin: false });
    });
  });
});

