import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractVideoId } from "@/lib/youtube";
import { fetchTranscript, TranscriptError } from "@/lib/transcript";
import { chunkTranscript, type TranscriptChunk } from "@/lib/chunking";
import { callWithFallback, getAvailableModels, type ModelId } from "@/lib/llmChain";
import { extractTopics, type ExtractedTopic } from "@/lib/topicExtraction";
import { logApiUsage } from "@/lib/usageLogger";
import { authenticateRequest } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * Progress event types for streaming responses
 */
type ProgressEvent =
  | { type: "progress"; stage: Stage; message: string; detail?: string }
  | { type: "complete"; summary: SummaryResult; status: "completed" }
  | { type: "error"; error: string; details?: string };

/**
 * Summary stages for progress tracking
 */
type Stage = "fetching_transcript" | "analyzing_topics" | "generating_summary" | "building_timeline";

/**
 * Summary result structure
 */
interface SummaryResult {
  id: string;
  videoId: string;
  title: string;
  content: string;
  hasTimestamps: boolean;
  topics: Array<{
    id: string;
    title: string;
    startMs: number;
    endMs: number;
    order: number;
  }>;
  transcriptSegments: Array<{
    id: string;
    text: string;
    offset: number;
    duration: number;
    order: number;
  }>;
  modelUsed: ModelId;
  source: "cache" | "generated";
}

/**
 * GET handler - Returns available models for the user
 */
export async function GET(req: NextRequest) {
  // Authenticate request
  const auth = authenticateRequest(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const models = await getAvailableModels(auth.userId);
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json(
      { error: "Failed to get available models" },
      { status: 500 }
    );
  }
}

/**
 * Supported output languages for summaries
 */
type OutputLanguage = "de" | "en" | "fr" | "es" | "it";

const LANGUAGE_NAMES: Record<OutputLanguage, string> = {
  de: "German",
  en: "English",
  fr: "French",
  es: "Spanish",
  it: "Italian",
};

/**
 * POST handler - Generate a video summary
 * Accepts: { url: string, detailLevel?: number, language?: OutputLanguage }
 * Returns: Streaming progress events
 */
export async function POST(req: NextRequest) {
  // Rate limit check (10 requests per minute per IP)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp, 10, 60 * 1000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfterMs: rateLimit.retryAfterMs,
        message: "Too many requests. Please wait before trying again."
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.retryAfterMs || 60000) / 1000)),
          'X-RateLimit-Remaining': '0',
        }
      }
    );
  }

  // Authenticate request first (before starting stream)
  const auth = authenticateRequest(req);
  if (!auth.success) {
    return auth.response;
  }

  const userId = auth.userId;
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const writeProgress = async (event: ProgressEvent) => {
    await writer.write(encoder.encode(JSON.stringify(event) + "\n"));
  };

  // Process the request asynchronously
  (async () => {
    try {
      const body = await req.json();
      const { url, detailLevel = 3, language = "en" } = body as {
        url: string;
        detailLevel?: number;
        language?: OutputLanguage;
      };

      if (!url) {
        await writeProgress({
          type: "error",
          error: "URL is required",
        });
        await writer.close();
        return;
      }

      // Extract video ID
      let videoId: string;
      try {
        videoId = extractVideoId(url);
      } catch {
        await writeProgress({
          type: "error",
          error: "Invalid YouTube URL",
          details: "Could not extract video ID from the provided URL",
        });
        await writer.close();
        return;
      }

      // Check cache first (per-user cache)
      const existingSummary = await prisma.summary.findUnique({
        where: {
          videoId_userId: {
            videoId,
            userId,
          },
        },
        include: {
          topics: {
            orderBy: { order: "asc" },
          },
          transcriptSegments: {
            orderBy: { order: "asc" },
          },
        },
      });

      if (existingSummary) {
        await writeProgress({
          type: "complete",
          summary: {
            id: existingSummary.id,
            videoId: existingSummary.videoId,
            title: existingSummary.title,
            content: existingSummary.content,
            hasTimestamps: existingSummary.hasTimestamps,
            topics: existingSummary.topics.map((t) => ({
              id: t.id,
              title: t.title,
              startMs: t.startMs,
              endMs: t.endMs,
              order: t.order,
            })),
            transcriptSegments: existingSummary.transcriptSegments.map((s) => ({
              id: s.id,
              text: s.text,
              offset: s.offset,
              duration: s.duration,
              order: s.order,
            })),
            modelUsed: "glm-4.7", // Default for cached results
            source: "cache",
          },
          status: "completed",
        });
        await writer.close();
        return;
      }

      // Stage 1: Fetch Transcript
      await writeProgress({
        type: "progress",
        stage: "fetching_transcript",
        message: "Fetching video transcript...",
      });

      const transcriptResult = await fetchTranscript(url, userId);
      const { content: transcriptContent, hasTimestamps } = transcriptResult;

      // Log Supadata usage
      await logApiUsage(userId, "supadata", "transcript", hasTimestamps ? 1 : 2, 0);

      // Convert transcript content to string for storage and LLM processing
      const transcriptText = Array.isArray(transcriptContent)
        ? transcriptContent.map((s) => s.text).join(" ")
        : transcriptContent;

      // Calculate video duration from transcript segments
      let videoDurationMs = 0;
      if (Array.isArray(transcriptContent) && transcriptContent.length > 0) {
        const lastSegment = transcriptContent[transcriptContent.length - 1];
        videoDurationMs = lastSegment.offset + lastSegment.duration;
      }

      // Stage 2: Analyzing Topics (Smart Chunking)
      await writeProgress({
        type: "progress",
        stage: "analyzing_topics",
        message: "Analyzing content structure...",
      });

      const chunks = chunkTranscript(transcriptContent, hasTimestamps);

      // Stage 3: Generate Summary
      await writeProgress({
        type: "progress",
        stage: "generating_summary",
        message: "Generating summary...",
        detail: `Processing ${chunks.length} content sections`,
      });

      const { summary, modelUsed, tokensUsed } = await generateChapterBasedSummary(
        chunks,
        detailLevel,
        language as OutputLanguage,
        videoId,
        userId
      );

      // Log LLM usage
      await logApiUsage(userId, modelUsed, "summary", 0, tokensUsed || 0);

      // Extract title from summary or generate one
      const title = extractTitleFromSummary(summary) || `Video Summary - ${videoId}`;

      // Stage 4: Build Timeline (Topic Extraction)
      let topics: ExtractedTopic[] = [];
      if (hasTimestamps && videoDurationMs > 0) {
        await writeProgress({
          type: "progress",
          stage: "building_timeline",
          message: "Extracting topics for timeline...",
        });

        try {
          const topicResult = await extractTopics(
            transcriptText,
            summary,
            videoDurationMs,
            { userId }
          );
          topics = topicResult.topics;

          // Log LLM usage for topic extraction
          await logApiUsage(
            userId,
            topicResult.modelUsed,
            "topic_extraction",
            0,
            topicResult.tokensUsed || 0
          );
        } catch (topicError) {
          // Topic extraction is optional - continue without topics
          console.warn("Topic extraction failed:", topicError);
        }
      }

      // Save transcript segments if available
      const transcriptSegmentsData = Array.isArray(transcriptContent)
        ? transcriptContent.map((segment, index) => ({
            text: segment.text,
            offset: segment.offset,
            duration: segment.duration,
            order: index,
          }))
        : [];

      // Save to database
      const savedSummary = await prisma.summary.create({
        data: {
          videoId,
          userId,
          title,
          content: summary,
          transcript: transcriptText,
          hasTimestamps,
          topics: {
            create: topics.map((topic) => ({
              title: topic.title,
              startMs: topic.startMs,
              endMs: topic.endMs,
              order: topic.order,
            })),
          },
          transcriptSegments: {
            create: transcriptSegmentsData,
          },
        },
        include: {
          topics: {
            orderBy: { order: "asc" },
          },
          transcriptSegments: {
            orderBy: { order: "asc" },
          },
        },
      });

      // Return complete result
      await writeProgress({
        type: "complete",
        summary: {
          id: savedSummary.id,
          videoId: savedSummary.videoId,
          title: savedSummary.title,
          content: savedSummary.content,
          hasTimestamps: savedSummary.hasTimestamps,
          topics: savedSummary.topics.map((t) => ({
            id: t.id,
            title: t.title,
            startMs: t.startMs,
            endMs: t.endMs,
            order: t.order,
          })),
          transcriptSegments: savedSummary.transcriptSegments.map((s) => ({
            id: s.id,
            text: s.text,
            offset: s.offset,
            duration: s.duration,
            order: s.order,
          })),
          modelUsed,
          source: "generated",
        },
        status: "completed",
      });
    } catch (error) {
      console.error("Summarize error:", error);

      // Provide user-friendly error messages based on error type
      let errorMessage = "Failed to generate summary";
      let errorDetails: string | undefined;

      if (error instanceof TranscriptError) {
        switch (error.code) {
          case "RATE_LIMIT_EXCEEDED":
            errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
            break;
          case "QUOTA_EXCEEDED":
            errorMessage = "Monthly API quota exceeded. Please check your Supadata dashboard or wait for reset.";
            break;
          case "UNAUTHORIZED":
            errorMessage = "Invalid API key. Please check your Supadata API key in settings.";
            break;
          case "SUPADATA_NOT_CONFIGURED":
            errorMessage = "Supadata is not configured. Please add your API key in settings.";
            break;
          default:
            errorMessage = error.message;
        }
        errorDetails = `Error code: ${error.code}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack;
      }

      await writeProgress({
        type: "error",
        error: errorMessage,
        details: errorDetails,
      });
    } finally {
      await writer.close().catch(() => {
        // Ignore close errors
      });
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Detail level configuration for chapter-based summaries
 */
interface DetailConfig {
  description: string;
  bulletPointsPerChapter: number;
  showTransitions: boolean;
  topChaptersOnly: boolean;
  topChapterCount?: number;
}

const DETAIL_CONFIGS: Record<number, DetailConfig> = {
  1: {
    description: "very brief",
    bulletPointsPerChapter: 1,
    showTransitions: false,
    topChaptersOnly: true,
    topChapterCount: 3,
  },
  2: {
    description: "concise",
    bulletPointsPerChapter: 2,
    showTransitions: false,
    topChaptersOnly: true,
    topChapterCount: 3,
  },
  3: {
    description: "balanced",
    bulletPointsPerChapter: 3,
    showTransitions: false,
    topChaptersOnly: false,
  },
  4: {
    description: "detailed",
    bulletPointsPerChapter: 4,
    showTransitions: true,
    topChaptersOnly: false,
  },
  5: {
    description: "comprehensive",
    bulletPointsPerChapter: 5,
    showTransitions: true,
    topChaptersOnly: false,
  },
};

/**
 * Generate chapter-based summary from transcript chunks
 */
async function generateChapterBasedSummary(
  chunks: TranscriptChunk[],
  detailLevel: number,
  language: OutputLanguage,
  videoId: string,
  userId: string
): Promise<{ summary: string; modelUsed: ModelId; tokensUsed?: number }> {
  const config = DETAIL_CONFIGS[detailLevel] || DETAIL_CONFIGS[3];
  const languageName = LANGUAGE_NAMES[language] || "English";

  // Combine all chunks into a single transcript
  const fullTranscript = chunks
    .map((chunk) => {
      if (chunk.startMs !== undefined && chunk.endMs !== undefined) {
        return `[${formatTime(chunk.startMs)} - ${formatTime(chunk.endMs)}]\n${chunk.text}`;
      }
      return chunk.text;
    })
    .join("\n\n");

  // Build the chapter-based summary prompt
  const systemPrompt = `You are an expert video content analyst creating comprehensive, chapter-based summaries. Your summaries should allow someone to fully understand the video's content, context, and value without watching it.

Key principles:
- Structure the summary around chapters/topics in the video
- Create flowing narrative with highlighted key points
- Show how chapters connect and build upon each other
- Be factual and neutral, never critical
- Use clear, engaging language`;

  const userPrompt = buildChapterBasedPrompt(
    fullTranscript,
    videoId,
    config,
    languageName
  );

  const result = await callWithFallback(userPrompt, {
    systemPrompt,
    maxTokens: 6144,
    temperature: 0.7,
    userId,
  });

  return {
    summary: result.response,
    modelUsed: result.modelUsed,
    tokensUsed: result.tokensUsed,
  };
}

/**
 * Build the chapter-based summary prompt
 */
function buildChapterBasedPrompt(
  transcript: string,
  videoId: string,
  config: DetailConfig,
  languageName: string
): string {
  const bulletPointInstruction = config.bulletPointsPerChapter <= 2
    ? `- Include only ${config.bulletPointsPerChapter} key bullet point(s) per chapter`
    : `- Include ${config.bulletPointsPerChapter} detailed bullet points per chapter`;

  const transitionInstruction = config.showTransitions
    ? `- Add a transition note (→ *Connection to next chapter: [explanation]*) showing how each chapter leads to the next`
    : "";

  const chapterScopeInstruction = config.topChaptersOnly
    ? `- Focus on the top ${config.topChapterCount} most important chapters in detail
- Briefly mention other chapters in a single line each`
    : `- Cover all identified chapters with appropriate depth`;

  return `Analyze this video transcript and create a ${config.description} chapter-based summary.

**IMPORTANT: Write the entire summary in ${languageName}.**

**Transcript:**
${transcript.slice(0, 25000)}${transcript.length > 25000 ? "\n\n[Transcript truncated...]" : ""}

**Instructions:**
1. First, identify the main chapters/topics discussed in the video based on natural topic transitions
2. Then create a structured summary following the format below

**Output Format:**

**Title**: [Descriptive title for the video content]

**Overview**: [2-3 sentences providing context - what this video covers and who it's for]

**Recommended Chapters to Watch**:
- [Chapter Name] - [Reason why this is worth watching in full] [(Timestamp)](https://youtube.com/watch?v=${videoId}&t=XXs)
- [Another Chapter] - [Reason] [(Timestamp)](https://youtube.com/watch?v=${videoId}&t=XXs)

---

## Chapter 1: [Chapter Title] [(Timestamp)](https://youtube.com/watch?v=${videoId}&t=XXs)
[2-3 sentence flowing summary of this chapter's content]
${bulletPointInstruction}
${transitionInstruction}

## Chapter 2: [Chapter Title] [(Timestamp)](https://youtube.com/watch?v=${videoId}&t=XXs)
[Continue with same structure...]

---

**Conclusion**: [Key takeaways and practical applications from the video]

**Formatting Rules:**
${chapterScopeInstruction}
- Format timestamps as clickable links: [(MM:SS)](https://youtube.com/watch?v=${videoId}&t=XXs)
- Use **bold** for key terms and concepts
- Ensure chapter headings include the timestamp link
- Be factual and neutral - summarize, don't critique`;
}

/**
 * Extract title from the generated summary
 */
function extractTitleFromSummary(summary: string): string | null {
  // Look for **Title**: or # Title patterns
  const titlePatterns = [
    /\*\*Title\*\*:\s*(.+)/i,
    /^#\s+(.+)/m,
    /^Title:\s*(.+)/mi,
  ];

  for (const pattern of titlePatterns) {
    const match = summary.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Format milliseconds to human-readable time string
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
