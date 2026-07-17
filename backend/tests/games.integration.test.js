import request from 'supertest';
import { describe, it, expect } from '@jest/globals';

import app from '../app.js';
import { sequelize } from '../config/db.js';
import '../models/index.js';
import { seedGames } from '../config/seedGames.js';

// Only run these when DB_DIALECT=sqlite is configured externally.
const maybeDescribe = process.env.DB_DIALECT === 'sqlite' ? describe : describe.skip;

maybeDescribe('Integration: Games API with SQLite', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await seedGames();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('GET /api/games returns seeded games', async () => {
    const res = await request(app).get('/api/games').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    // Spot check shape
    const g = res.body[0];
    expect(g).toHaveProperty('title');
    expect(g).toHaveProperty('tags');
  });

  it('GET /api/games/search?tags=Puzzle returns games that include Puzzle', async () => {
    const res = await request(app).get('/api/games/search?tags=Puzzle').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    // All results should include the tag
    for (const g of res.body) {
      expect(g.tags).toEqual(expect.arrayContaining(['Puzzle']));
    }
  });

  it('GET /api/games/search?q=puzzle returns titles/platforms matching text', async () => {
    const res = await request(app).get('/api/games/search?q=puzzle').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const g of res.body) {
      const t = `${g.title} ${g.platform}`.toLowerCase();
      expect(t).toContain('puzzle');
    }
  });
});
