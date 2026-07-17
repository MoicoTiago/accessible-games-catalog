import express from 'express';
import request from 'supertest';
import libraryRoutes from '../routes/library.js';

// Minimal app that mounts the API routes. No DB calls are made for /api/tag-groups.
function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', libraryRoutes);
  return app;
}

describe('GET /api/tag-groups', () => {
  it('returns canonical tag groups including Genres with tags', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/tag-groups').expect(200);

    expect(res.body).toBeTruthy();
    expect(Array.isArray(res.body.groups)).toBe(true);

    const groups = res.body.groups;
    // Find the Genres group by id or label
    const genres = groups.find(g => g?.id === 'genres' || g?.label === 'Genres');
    expect(genres).toBeTruthy();
    expect(Array.isArray(genres.tags)).toBe(true);
    expect(genres.tags.length).toBeGreaterThan(0);

    // A couple of spot checks
    expect(genres.tags).toEqual(
      expect.arrayContaining(['Action','Puzzle','RPG'])
    );
  });
});