import { callWithFallback, type ModelId } from "./llmChain";

/**
 * Represents an extracted topic from the video
 */
export interface ExtractedTopic {
  title: string;
  startMs: number;
  endMs: number;
  order: number;
}

/**
 * Options for topic extraction
 */
export interface TopicExtractionOptions {
  preferredModel?: ModelId;
  minTopics?: number;
  maxTopics?: number;
  userId?: string;
}

/**
 * Result of topic extraction
 */
export interface TopicExtractionResult {
  topics: ExtractedTopic[];
  modelUsed: ModelId;
  tokensUsed?: number;
}

/**
 * Raw topic from LLM response (before validation)
 */
interface RawTopic {
  title: string;
  startMs: number;
  endMs: number;
}

/**
 * Extracts key topics with timestamp ranges from a video transcript and summary.
 *
 * @param transcript - The full transcript text
 * @param summary - The generated summary of the video
 * @param videoDurationMs - Total video duration in milliseconds
 * @param options - Optional configuration
 * @returns Promise<TopicExtractionResult> - Extracted topics with metadata
 */
export async function extractTopics(
  transcript: string,
  summary: string,
  videoDurationMs: number,
  options: TopicExtractionOptions = {}
): Promise<TopicExtractionResult> {
  const { preferredModel, minTopics = 5, maxTopics = 15, userId } = options;

  if (!userId) {
    throw new Error("userId is required for topic extraction");
  }

  const systemPrompt = `You are a video content analyzer. Your task is to identify the main topics discussed in a video based on its transcript and summary. You must output valid JSON only.`;

  const prompt = buildTopicExtractionPrompt(
    transcript,
    summary,
    videoDurationMs,
    minTopics,
    maxTopics
  );

  const llmResult = await callWithFallback(prompt, {
    systemPrompt,
    maxTokens: 2048,
    temperature: 0.3, // Lower temperature for more consistent JSON output
    preferredModel,
    userId,
  });

  // Parse the LLM response
  const rawTopics = parseTopicsFromResponse(llmResult.response);

  // Validate and adjust topics
  const validatedTopics = validateAndAdjustTopics(rawTopics, videoDurationMs);

  // Add order to topics
  const topics: ExtractedTopic[] = validatedTopics.map((topic, index) => ({
    ...topic,
    order: index,
  }));

  return {
    topics,
    modelUsed: llmResult.modelUsed,
    tokensUsed: llmResult.tokensUsed,
  };
}

/**
 * Builds the prompt for topic extraction
 */
function buildTopicExtractionPrompt(
  transcript: string,
  summary: string,
  videoDurationMs: number,
  minTopics: number,
  maxTopics: number
): string {
  const videoDurationFormatted = formatDuration(videoDurationMs);

  return `Analyze this video transcript and summary to identify the main topics discussed.

VIDEO DURATION: ${videoDurationFormatted} (${videoDurationMs} milliseconds)

SUMMARY:
${summary}

TRANSCRIPT:
${transcript.slice(0, 15000)} ${transcript.length > 15000 ? "... [truncated]" : ""}

INSTRUCTIONS:
1. Identify ${minTopics}-${maxTopics} distinct topics covered in the video
2. For each topic, estimate the start and end timestamps based on when the topic is discussed
3. Topics must be CONTIGUOUS - each topic's endMs must equal the next topic's startMs
4. The first topic must start at 0ms
5. The last topic must end at exactly ${videoDurationMs}ms
6. Topic titles should be concise but descriptive (5-10 words)

OUTPUT FORMAT (JSON only, no markdown):
{
  "topics": [
    {
      "title": "Introduction and Overview",
      "startMs": 0,
      "endMs": 45000
    },
    {
      "title": "Second Topic Title",
      "startMs": 45000,
      "endMs": 120000
    }
  ]
}

Important: Output ONLY valid JSON. No explanations, no markdown code blocks, just the JSON object.`;
}

/**
 * Parses topics from the LLM response
 */
function parseTopicsFromResponse(response: string): RawTopic[] {
  // Try to extract JSON from the response
  let jsonStr = response.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  // Try to find JSON object in the response
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.topics || !Array.isArray(parsed.topics)) {
      throw new Error("Response does not contain a topics array");
    }

    // Validate each topic has required fields
    const topics: RawTopic[] = [];
    for (const topic of parsed.topics) {
      if (
        typeof topic.title !== "string" ||
        typeof topic.startMs !== "number" ||
        typeof topic.endMs !== "number"
      ) {
        console.warn("Skipping invalid topic:", topic);
        continue;
      }

      topics.push({
        title: topic.title,
        startMs: Math.round(topic.startMs),
        endMs: Math.round(topic.endMs),
      });
    }

    if (topics.length === 0) {
      throw new Error("No valid topics found in response");
    }

    return topics;
  } catch (error) {
    throw new Error(
      `Failed to parse topics from LLM response: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validates topics and adjusts boundaries to ensure contiguity.
 *
 * Rules:
 * - Topics must be contiguous (no gaps, no overlaps)
 * - First topic starts at 0ms
 * - Last topic ends at videoDurationMs
 * - Each topic must have a positive duration
 */
function validateAndAdjustTopics(
  topics: RawTopic[],
  videoDurationMs: number
): RawTopic[] {
  if (topics.length === 0) {
    // Return a single topic covering the entire video
    return [
      {
        title: "Full Video Content",
        startMs: 0,
        endMs: videoDurationMs,
      },
    ];
  }

  // Sort topics by startMs
  const sorted = [...topics].sort((a, b) => a.startMs - b.startMs);

  const adjusted: RawTopic[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const topic = sorted[i];
    const prevTopic = adjusted[adjusted.length - 1];
    const nextTopic = sorted[i + 1];

    let startMs: number;
    let endMs: number;

    if (i === 0) {
      // First topic always starts at 0
      startMs = 0;
    } else {
      // Start where previous topic ended
      startMs = prevTopic.endMs;
    }

    if (i === sorted.length - 1) {
      // Last topic always ends at video duration
      endMs = videoDurationMs;
    } else if (nextTopic) {
      // End at the midpoint between this topic's end and next topic's start
      // if there's overlap, or use this topic's end if there's a gap
      if (topic.endMs > nextTopic.startMs) {
        // Overlap - use midpoint
        endMs = Math.round((topic.endMs + nextTopic.startMs) / 2);
      } else if (topic.endMs < nextTopic.startMs) {
        // Gap - extend to fill gap (use midpoint)
        endMs = Math.round((topic.endMs + nextTopic.startMs) / 2);
      } else {
        // Exactly aligned
        endMs = topic.endMs;
      }
    } else {
      endMs = topic.endMs;
    }

    // Ensure minimum duration (at least 1 second)
    if (endMs - startMs < 1000) {
      endMs = Math.min(startMs + 1000, videoDurationMs);
    }

    adjusted.push({
      title: topic.title,
      startMs,
      endMs,
    });
  }

  // Final pass to ensure complete contiguity
  return enforceContiguity(adjusted, videoDurationMs);
}

/**
 * Final enforcement of contiguity rules
 */
function enforceContiguity(
  topics: RawTopic[],
  videoDurationMs: number
): RawTopic[] {
  if (topics.length === 0) {
    return [
      {
        title: "Full Video Content",
        startMs: 0,
        endMs: videoDurationMs,
      },
    ];
  }

  const result: RawTopic[] = [];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];

    // First topic must start at 0
    const startMs = i === 0 ? 0 : result[i - 1].endMs;

    // Last topic must end at video duration
    const endMs = i === topics.length - 1 ? videoDurationMs : topic.endMs;

    // Ensure valid duration
    if (endMs <= startMs) {
      // Skip this topic if it would have invalid duration
      // (This should rarely happen after previous adjustments)
      continue;
    }

    result.push({
      title: topic.title,
      startMs,
      endMs,
    });
  }

  // If we ended up with no valid topics, return single topic
  if (result.length === 0) {
    return [
      {
        title: "Full Video Content",
        startMs: 0,
        endMs: videoDurationMs,
      },
    ];
  }

  // Ensure last topic ends at video duration
  result[result.length - 1].endMs = videoDurationMs;

  return result;
}

/**
 * Formats duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
