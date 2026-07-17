import GameTag from '../models/GameTag.js';

// We only use build() to validate the shape; we do not hit the real DB

describe('GameTag model (real model)', () => {
  it('can build an instance with gameId and tagId', () => {
    const gt = GameTag.build({ gameId: 1, tagId: 2 });
    expect(gt.gameId).toBe(1);
    expect(gt.tagId).toBe(2);
  });
});
