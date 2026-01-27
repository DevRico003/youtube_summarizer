import { chunkTranscript, detectTopicBoundaries, TranscriptSegment } from '@/lib/chunking';

const makeSegment = (
  text: string,
  offset: number,
  duration: number = 1000
): TranscriptSegment => ({
  text,
  offset,
  duration,
  lang: 'en',
});

describe('chunking', () => {
  describe('detectTopicBoundaries', () => {
    it('detects boundaries based on time gaps', () => {
      const segments: TranscriptSegment[] = [
        makeSegment('Intro', 0, 1000),
        makeSegment('Still intro', 1200, 800),
        makeSegment('New section starts', 5500, 900),
      ];

      const boundaries = detectTopicBoundaries(segments);

      expect(boundaries).toHaveLength(1);
      expect(boundaries[0]).toMatchObject({
        segmentIndex: 2,
        offsetMs: 5500,
        reason: 'time_gap',
      });
    });

    it('detects boundaries based on transition keywords', () => {
      const segments: TranscriptSegment[] = [
        makeSegment('Intro', 0, 1000),
        makeSegment("Now let's talk about the main idea", 1200, 800),
        makeSegment('Details continue', 2100, 700),
      ];

      const boundaries = detectTopicBoundaries(segments);

      expect(boundaries).toHaveLength(1);
      expect(boundaries[0]).toMatchObject({
        segmentIndex: 1,
        offsetMs: 1200,
        reason: 'keyword',
      });
    });
  });

  describe('chunkTranscript', () => {
    it('chunks transcript by topic boundaries when timestamps are available', () => {
      const segments: TranscriptSegment[] = [
        makeSegment('Intro part.', 0, 1000),
        makeSegment('Continuing intro.', 1200, 800),
        makeSegment('Moving on to topic two.', 5000, 1000),
        makeSegment('Another thing we should discuss.', 6200, 900),
      ];

      const chunks = chunkTranscript(segments, true);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toMatchObject({
        text: 'Intro part. Continuing intro.',
        startMs: 0,
        endMs: 2000,
        segmentIndices: [0, 1],
      });
      expect(chunks[1]).toMatchObject({
        text: 'Moving on to topic two.',
        startMs: 5000,
        endMs: 6000,
        segmentIndices: [2],
      });
      expect(chunks[2]).toMatchObject({
        text: 'Another thing we should discuss.',
        startMs: 6200,
        endMs: 7100,
        segmentIndices: [3],
      });
    });

    it('falls back to character-based chunking when timestamps are unavailable', () => {
      const longText = Array.from({ length: 2000 }, () => 'word').join(' ');

      const chunks = chunkTranscript(longText, false);

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(7000);
      });
      expect(chunks[0].text.startsWith('word word')).toBe(true);
      expect(chunks[chunks.length - 1].text.endsWith('word')).toBe(true);
    });
  });
});
