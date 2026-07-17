// filepath: backend/tests/voice.library.test.js
import express from 'express';
import request from 'supertest';
import voiceRouter from '../routes/voice.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/voice', voiceRouter);
  return app;
}

describe('Voice interpreter - library commands', () => {
  it('interprets remove from favourites', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/voice/interpret')
      .send({ transcript: 'please remove tetris from favorites' })
      .expect(200);
    expect(res.body.intent).toEqual({ type: 'library', action: 'remove', list: 'favourites', title: 'tetris', utterance: 'remove tetris from favorites' });
  });

  it('interprets move to wishlist', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/voice/interpret')
      .send({ transcript: 'move aurora quest to wishlist' })
      .expect(200);
    expect(res.body.intent.type).toBe('library');
    expect(res.body.intent.action).toBe('move');
    expect(res.body.intent.list).toBe('wishlist');
    expect(res.body.intent.title).toBe('aurora quest');
  });

  it('interprets add game to favourites even with prefix', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/voice/interpret')
      .send({ transcript: 'platform add game to favourites' })
      .expect(200);
    expect(res.body.intent).toEqual({ type: 'game', action: 'favourites', utterance: 'add game to favourites' });
  });
});
