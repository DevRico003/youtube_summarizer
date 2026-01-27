/**
 * Transcript segment with timestamp information
 * (Defined locally to avoid heavy import chain from transcript.ts)
 */
export interface TranscriptSegment {
  text: string;
  offset: number; // Start time in milliseconds
  duration: number; // Duration in milliseconds
  lang: string;
}

/**
 * Keywords that typically signal a topic transition
 */
const TOPIC_TRANSITION_KEYWORDS = [
  "next topic",
  "moving on",
  "let's talk about",
  "another thing",
  "now let's",
  "turning to",
  "speaking of",
  "on to",
  "next up",
  "let me show you",
  "now we'll",
  "let's move on",
  "the next thing",
  "another point",
  "switching gears",
];

/**
 * Minimum time gap (in milliseconds) that suggests a topic boundary
 */
const MIN_TIME_GAP_MS = 3000;

/**
 * Represents a detected topic boundary
 */
export interface TopicBoundary {
  segmentIndex: number;
  offsetMs: number;
  reason: "time_gap" | "keyword";
}

/**
 * Represents a chunk of transcript content
 */
export interface TranscriptChunk {
  text: string;
  startMs?: number;
  endMs?: number;
  segmentIndices?: number[];
}

/**
 * Detects topic boundaries in timestamped transcript segments
 *
 * Uses two heuristics:
 * 1. Time gaps > 3 seconds between segments (speaker pauses, section breaks)
 * 2. Transition keywords that signal a new topic
 *
 * @param segments - Array of transcript segments with timestamps
 * @returns Array of detected topic boundaries
 */
export function detectTopicBoundaries(
  segments: TranscriptSegment[]
): TopicBoundary[] {
  const boundaries: TopicBoundary[] = [];

  if (segments.length === 0) {
    return boundaries;
  }

  for (let i = 1; i < segments.length; i++) {
    const prevSegment = segments[i - 1];
    const currentSegment = segments[i];

    // Calculate gap between end of previous segment and start of current
    const prevEndMs = prevSegment.offset + prevSegment.duration;
    const gapMs = currentSegment.offset - prevEndMs;

    // Check for time gap boundary
    if (gapMs >= MIN_TIME_GAP_MS) {
      boundaries.push({
        segmentIndex: i,
        offsetMs: currentSegment.offset,
        reason: "time_gap",
      });
      continue; // Don't double-count if both conditions are met
    }

    // Check for keyword boundary
    const textLower = currentSegment.text.toLowerCase();
    const hasTransitionKeyword = TOPIC_TRANSITION_KEYWORDS.some((keyword) =>
      textLower.includes(keyword)
    );

    if (hasTransitionKeyword) {
      boundaries.push({
        segmentIndex: i,
        offsetMs: currentSegment.offset,
        reason: "keyword",
      });
    }
  }

  return boundaries;
}

/**
 * Chunks transcript content for LLM processing
 *
 * When timestamps are available:
 * - Detects topic boundaries and chunks at those points
 * - Each chunk preserves start/end timestamps
 *
 * When timestamps are not available:
 * - Falls back to character-based chunking (7000 chars with 1000 overlap)
 *
 * @param segments - Transcript content (array of segments or plain string)
 * @param hasTimestamps - Whether the content has valid timestamps
 * @returns Array of transcript chunks ready for LLM processing
 */
export function chunkTranscript(
  segments: TranscriptSegment[] | string,
  hasTimestamps: boolean
): TranscriptChunk[] {
  // Handle string content (no timestamps)
  if (typeof segments === "string" || !hasTimestamps) {
    const text =
      typeof segments === "string"
        ? segments
        : segments.map((s) => s.text).join(" ");

    return chunkByCharacters(text);
  }

  // Handle timestamped segments
  return chunkByTopicBoundaries(segments);
}

/**
 * Chunks content by detected topic boundaries
 */
function chunkByTopicBoundaries(
  segments: TranscriptSegment[]
): TranscriptChunk[] {
  if (segments.length === 0) {
    return [];
  }

  const boundaries = detectTopicBoundaries(segments);
  const chunks: TranscriptChunk[] = [];

  // If no boundaries detected, return as single chunk
  if (boundaries.length === 0) {
    const text = segments.map((s) => s.text).join(" ");
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    return [
      {
        text,
        startMs: firstSegment.offset,
        endMs: lastSegment.offset + lastSegment.duration,
        segmentIndices: segments.map((_, idx) => idx),
      },
    ];
  }

  // Create chunks between boundaries
  let currentStartIdx = 0;

  for (const boundary of boundaries) {
    // Create chunk from currentStartIdx to boundary (exclusive)
    if (boundary.segmentIndex > currentStartIdx) {
      const chunkSegments = segments.slice(currentStartIdx, boundary.segmentIndex);
      const text = chunkSegments.map((s) => s.text).join(" ");
      const firstSegment = chunkSegments[0];
      const lastSegment = chunkSegments[chunkSegments.length - 1];

      chunks.push({
        text,
        startMs: firstSegment.offset,
        endMs: lastSegment.offset + lastSegment.duration,
        segmentIndices: Array.from(
          { length: boundary.segmentIndex - currentStartIdx },
          (_, i) => currentStartIdx + i
        ),
      });
    }

    currentStartIdx = boundary.segmentIndex;
  }

  // Don't forget the last chunk (from last boundary to end)
  if (currentStartIdx < segments.length) {
    const chunkSegments = segments.slice(currentStartIdx);
    const text = chunkSegments.map((s) => s.text).join(" ");
    const firstSegment = chunkSegments[0];
    const lastSegment = chunkSegments[chunkSegments.length - 1];

    chunks.push({
      text,
      startMs: firstSegment.offset,
      endMs: lastSegment.offset + lastSegment.duration,
      segmentIndices: Array.from(
        { length: segments.length - currentStartIdx },
        (_, i) => currentStartIdx + i
      ),
    });
  }

  return chunks;
}

/**
 * Chunks text by character count with overlap
 * Used as fallback when timestamps are not available
 *
 * @param text - Plain text to chunk
 * @param chunkSize - Maximum characters per chunk (default: 7000)
 * @param overlap - Overlap between chunks (default: 1000)
 */
function chunkByCharacters(
  text: string,
  chunkSize: number = 7000,
  overlap: number = 1000
): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];

  if (text.length === 0) {
    return chunks;
  }

  if (text.length <= chunkSize) {
    return [{ text }];
  }

  let startPos = 0;

  while (startPos < text.length) {
    let endPos = Math.min(startPos + chunkSize, text.length);

    // Try to break at a sentence boundary or word boundary if not at end
    if (endPos < text.length) {
      // Look for sentence boundary (. ! ?) within last 200 chars of chunk
      const searchStart = Math.max(endPos - 200, startPos);
      const searchText = text.slice(searchStart, endPos);

      // Find last sentence-ending punctuation followed by space
      const sentenceEnd = Math.max(
        searchText.lastIndexOf(". "),
        searchText.lastIndexOf("! "),
        searchText.lastIndexOf("? ")
      );

      if (sentenceEnd !== -1) {
        endPos = searchStart + sentenceEnd + 2; // Include the punctuation and space
      } else {
        // Fall back to word boundary
        const lastSpace = text.lastIndexOf(" ", endPos);
        if (lastSpace > startPos) {
          endPos = lastSpace + 1;
        }
      }
    }

    chunks.push({
      text: text.slice(startPos, endPos).trim(),
    });

    // Stop after the final chunk
    if (endPos >= text.length) {
      break;
    }

    // Move start position with overlap
    const nextStart = Math.max(endPos - overlap, 0);

    // Prevent infinite loops if overlap prevents forward progress
    if (nextStart <= startPos) {
      break;
    }

    startPos = nextStart;
  }

  return chunks;
}
