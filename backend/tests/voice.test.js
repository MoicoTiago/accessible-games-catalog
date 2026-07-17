import express from 'express';
import request from 'supertest';
import voiceRouter from '../routes/voice.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/voice', voiceRouter);
  return app;
}

describe('POST /api/voice/interpret (heuristic intent)', () => {
  it('400s when transcript is missing', async () => {
    const app = makeApp();
    await request(app).post('/api/voice/interpret').send({}).expect(400);
  });

  it('returns an intent for a fuzzy query (search/filter acceptable)', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/voice/interpret')
      .send({ transcript: 'hey platform maybe show puzzle games' })
      .expect(200);

    expect(res.body.intent).toBeTruthy();
    expect(['search', 'filter']).toContain(res.body.intent.type);
  });
});
