import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const verifyMock = jest.fn();
const findByPkMock = jest.fn();

jest.unstable_mockModule('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: verifyMock,
  },
}));

jest.unstable_mockModule('../models/User.js', () => ({
  __esModule: true,
  default: {
    findByPk: findByPkMock,
  },
}));

const { default: authenticateToken } = await import('../middleware/auth.js');

function makeApp() {
  const app = express();
  app.get('/protected', authenticateToken, (req, res) => {
    res.json({ user: req.user });
  });
  return app;
}

describe('authenticateToken middleware', () => {
  beforeEach(() => {
    verifyMock.mockReset();
    findByPkMock.mockReset();
  });

  it('returns 401 when header is missing', async () => {
    const app = makeApp();
    const res = await request(app).get('/protected').expect(401);
    expect(res.body).toEqual({ message: 'Authorization header missing' });
  });

  it('returns 401 when user not found', async () => {
    verifyMock.mockReturnValueOnce({ id: 123 });
    findByPkMock.mockResolvedValueOnce(null);
    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer token')
      .expect(401);
    expect(res.body).toEqual({ message: 'User not found' });
  });

  it('returns 401 on invalid token', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('bad');
    });
    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer bad')
      .expect(401);
    expect(res.body).toEqual({ message: 'Invalid token' });
  });

  it('attaches user and calls next on success', async () => {
    verifyMock.mockReturnValueOnce({ id: 1 });
    findByPkMock.mockResolvedValueOnce({ id: 1, isAdmin: true });
    const app = makeApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer good')
      .expect(200);
    expect(findByPkMock).toHaveBeenCalledWith(1, { attributes: ['id', 'isAdmin'] });
    expect(res.body).toEqual({ user: { id: 1, isAdmin: true } });
  });
});

