import { interpretTranscript } from './intent.js';

describe('interpretTranscript (heuristic, tolerant)', () => {
  it('recognises reset filters with filler', () => {
    expect(interpretTranscript('hey platform please reset all filters')).toEqual({ type: 'reset-filters', utterance: 'reset all filters' });
  });

  it('recognises navigate search', () => {
    expect(interpretTranscript('can you open search page')).toEqual({ type: 'navigate', target: 'search', utterance: 'open search page' });
  });

  it('recognises scroll', () => {
    expect(interpretTranscript('please scroll down a bit')).toEqual({ type: 'scroll', direction: 'down', utterance: 'scroll down a bit' });
  });

  it('parses search query with filler', () => {
    expect(interpretTranscript('hey platform maybe show puzzle games')).toEqual({ type: 'search', query: 'puzzle games', utterance: 'show puzzle games' });
  });

  it('maps genre mentions to filter tags', () => {
    expect(interpretTranscript('hey platform maybe show puzzle games')).toEqual({
      type: 'filter',
      tag: 'Puzzle',
      utterance: 'show puzzle games'
    });
  });

  it('parses filter tags with filler and and-joins', () => {
    expect(interpretTranscript('could you apply filters color blind mode and high contrast')).toEqual({
      type: 'filter',
      tags: ['color blind mode', 'high contrast'],
      utterance: 'apply filters color blind mode and high contrast'
    });
  });
});
