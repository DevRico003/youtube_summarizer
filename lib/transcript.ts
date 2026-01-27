import { getSupadataClient } from "./supadata";

/**
 * Transcript segment with timestamp information
 */
export interface TranscriptSegment {
  text: string;
  offset: number; // Start time in milliseconds
  duration: number; // Duration in milliseconds
  lang: string;
}

/**
 * Structured transcript result
 */
export interface TranscriptResult {
  content: TranscriptSegment[] | string;
  lang: string;
  availableLangs: string[];
  hasTimestamps: boolean;
}

/**
 * Error thrown when transcript fetching fails
 */
export class TranscriptError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "TranscriptError";
  }
}

/**
 * Fetches transcript for a video URL using Supadata SDK
 *
 * Strategy:
 * 1. Try mode='native' first (1 credit) - returns existing transcripts with timestamps
 * 2. On failure, fallback to mode='auto' - tries native, then generates with AI
 *
 * @param videoUrl - The YouTube video URL
 * @returns Structured transcript with content, language info, and timestamp indicator
 * @throws TranscriptError if all methods fail or Supadata is not configured
 */
export async function fetchTranscript(
  videoUrl: string
): Promise<TranscriptResult> {
  const client = await getSupadataClient();

  if (!client) {
    throw new TranscriptError(
      "Supadata is not configured. Please add your Supadata API key in settings.",
      "SUPADATA_NOT_CONFIGURED"
    );
  }

  // First, try native mode (cheaper - 1 credit, uses existing transcripts)
  try {
    const nativeResult = await client.transcript({
      url: videoUrl,
      mode: "native",
      text: false, // Request timestamps
    });

    // Check if we got a job ID (async processing) instead of transcript
    if ("jobId" in nativeResult) {
      // Poll for results - native mode shouldn't usually need this
      // but handle it just in case
      const jobResult = await pollForTranscriptResult(client, nativeResult.jobId);
      return formatTranscriptResult(jobResult, true);
    }

    // Direct result - native transcripts always have timestamps
    return formatTranscriptResult(nativeResult, true);
  } catch (nativeError) {
    // Native mode failed (no existing transcript available)
    // Fall back to auto mode
    console.log(
      "Native transcript not available, falling back to auto mode:",
      nativeError instanceof Error ? nativeError.message : "Unknown error"
    );
  }

  // Fallback to auto mode (tries native, then generates with AI)
  try {
    const autoResult = await client.transcript({
      url: videoUrl,
      mode: "auto",
      text: false, // Request timestamps
    });

    // Check if we got a job ID (async processing for AI generation)
    if ("jobId" in autoResult) {
      const jobResult = await pollForTranscriptResult(client, autoResult.jobId);
      // AI-generated transcripts may or may not have reliable timestamps
      const hasTimestamps = isTimestampedContent(jobResult.content);
      return formatTranscriptResult(jobResult, hasTimestamps);
    }

    // Direct result
    const hasTimestamps = isTimestampedContent(autoResult.content);
    return formatTranscriptResult(autoResult, hasTimestamps);
  } catch (autoError) {
    const errorMessage =
      autoError instanceof Error ? autoError.message : "Unknown error";
    throw new TranscriptError(
      `Failed to fetch transcript: ${errorMessage}`,
      "TRANSCRIPT_FETCH_FAILED"
    );
  }
}

/**
 * Polls for transcript job result
 * @param client - Supadata client instance
 * @param jobId - Job ID to poll
 * @returns Transcript result
 */
async function pollForTranscriptResult(
  client: Awaited<ReturnType<typeof getSupadataClient>>,
  jobId: string
): Promise<{ content: TranscriptSegment[] | string; lang: string; availableLangs: string[] }> {
  if (!client) {
    throw new TranscriptError(
      "Supadata client not available",
      "CLIENT_NOT_AVAILABLE"
    );
  }

  const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
  const pollInterval = 2000; // 2 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const jobResult = await client.transcript.getJobStatus(jobId);

    if (jobResult.status === "completed") {
      // JobResult<Transcript> has the transcript in the result property
      if (!jobResult.result) {
        throw new TranscriptError(
          "Transcript job completed but no result returned",
          "NO_RESULT"
        );
      }
      return {
        content: jobResult.result.content as TranscriptSegment[] | string,
        lang: jobResult.result.lang || "unknown",
        availableLangs: jobResult.result.availableLangs || [],
      };
    }

    if (jobResult.status === "failed") {
      const errorMessage = jobResult.error?.message || "Unknown error";
      throw new TranscriptError(
        `Transcript job failed: ${errorMessage}`,
        "JOB_FAILED"
      );
    }

    // Job is still queued or active, wait and retry
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new TranscriptError(
    "Transcript job timed out after 60 seconds",
    "JOB_TIMEOUT"
  );
}

/**
 * Checks if content has timestamp information
 */
function isTimestampedContent(
  content: TranscriptSegment[] | string
): boolean {
  if (typeof content === "string") {
    return false;
  }

  if (!Array.isArray(content) || content.length === 0) {
    return false;
  }

  // Check if segments have valid offset values
  return content.some(
    (segment) =>
      typeof segment.offset === "number" &&
      typeof segment.duration === "number" &&
      segment.offset >= 0
  );
}

/**
 * Formats the transcript API response into our standard result format
 */
function formatTranscriptResult(
  apiResult: { content: TranscriptSegment[] | string; lang: string; availableLangs?: string[] },
  hasTimestamps: boolean
): TranscriptResult {
  return {
    content: apiResult.content,
    lang: apiResult.lang || "unknown",
    availableLangs: apiResult.availableLangs || [],
    hasTimestamps,
  };
}
