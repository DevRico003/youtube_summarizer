import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractVideoId } from "@/lib/youtube";
import { fetchTranscript, type TranscriptSegment } from "@/lib/transcript";
import { chunkTranscript, type TranscriptChunk } from "@/lib/chunking";
import { callWithFallback, getAvailableModels, type ModelId } from "@/lib/llmChain";
import { extractTopics, type ExtractedTopic } from "@/lib/topicExtraction";
import { logApiUsage } from "@/lib/usageLogger";

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
  modelUsed: ModelId;
  source: "cache" | "generated";
}

/**
 * GET handler - Returns available models
 */
export async function GET() {
  try {
    const models = await getAvailableModels();
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get available models" },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Generate a video summary
 * Accepts: { url: string, detailLevel?: number }
 * Returns: Streaming progress events
 */
export async function POST(req: Request) {
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
      const { url, detailLevel = 3 } = body;

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

      // Check cache first
      const existingSummary = await prisma.summary.findUnique({
        where: { videoId },
        include: {
          topics: {
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

      const transcriptResult = await fetchTranscript(url);
      const { content: transcriptContent, hasTimestamps } = transcriptResult;

      // Log Supadata usage
      await logApiUsage(null, "supadata", "transcript", hasTimestamps ? 1 : 2, 0);

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

      const { summary, modelUsed, tokensUsed } = await generateSummary(
        chunks,
        detailLevel
      );

      // Log LLM usage
      await logApiUsage(null, modelUsed, "summary", 0, tokensUsed || 0);

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
            videoDurationMs
          );
          topics = topicResult.topics;

          // Log LLM usage for topic extraction
          await logApiUsage(
            null,
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

      // Save to database
      const savedSummary = await prisma.summary.create({
        data: {
          videoId,
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
        },
        include: {
          topics: {
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
          modelUsed,
          source: "generated",
        },
        status: "completed",
      });
    } catch (error) {
      console.error("Summarize error:", error);

      await writeProgress({
        type: "error",
        error: error instanceof Error ? error.message : "Failed to generate summary",
        details: error instanceof Error ? error.stack : undefined,
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
 * Generate summary from transcript chunks using LLM fallback chain
 */
async function generateSummary(
  chunks: TranscriptChunk[],
  detailLevel: number
): Promise<{ summary: string; modelUsed: ModelId; tokensUsed?: number }> {
  const detailDescriptions: Record<number, string> = {
    1: "very brief (2-3 sentences)",
    2: "concise (1 paragraph)",
    3: "balanced (2-3 paragraphs)",
    4: "detailed (4-5 paragraphs)",
    5: "comprehensive (full breakdown with all details)",
  };

  const detailDescription = detailDescriptions[detailLevel] || detailDescriptions[3];

  // For single chunk, generate directly
  if (chunks.length === 1) {
    const prompt = buildSummaryPrompt(chunks[0].text, detailDescription);
    const result = await callWithFallback(prompt, {
      systemPrompt: "You are a helpful assistant that creates clear, well-structured video summaries.",
      maxTokens: 4096,
      temperature: 0.7,
    });

    return {
      summary: result.response,
      modelUsed: result.modelUsed,
      tokensUsed: result.tokensUsed,
    };
  }

  // For multiple chunks, summarize each and then combine
  const chunkSummaries: string[] = [];
  let totalTokens = 0;
  let lastModelUsed: ModelId = "glm-4.7";

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const timeInfo = chunk.startMs !== undefined && chunk.endMs !== undefined
      ? ` (${formatTime(chunk.startMs)} - ${formatTime(chunk.endMs)})`
      : "";

    const prompt = `Summarize this section${timeInfo} of a video transcript. Be concise but capture the key points:

${chunk.text}`;

    const result = await callWithFallback(prompt, {
      systemPrompt: "You are a helpful assistant that creates concise section summaries.",
      maxTokens: 1024,
      temperature: 0.7,
    });

    chunkSummaries.push(result.response);
    totalTokens += result.tokensUsed || 0;
    lastModelUsed = result.modelUsed;
  }

  // Combine chunk summaries into final summary
  const combinedSummary = chunkSummaries.join("\n\n---\n\n");
  const finalPrompt = buildSummaryPrompt(combinedSummary, detailDescription, true);

  const finalResult = await callWithFallback(finalPrompt, {
    systemPrompt: "You are a helpful assistant that creates clear, well-structured video summaries.",
    maxTokens: 4096,
    temperature: 0.7,
  });

  return {
    summary: finalResult.response,
    modelUsed: finalResult.modelUsed,
    tokensUsed: totalTokens + (finalResult.tokensUsed || 0),
  };
}

/**
 * Build the summary prompt based on detail level
 */
function buildSummaryPrompt(
  text: string,
  detailDescription: string,
  isCombinedSections: boolean = false
): string {
  const contextNote = isCombinedSections
    ? "These are summaries of different sections of a video. Create a unified summary that flows naturally."
    : "This is a video transcript.";

  return `${contextNote}

Create a ${detailDescription} summary with the following structure:

**Title**: A descriptive title for the video

**Overview**: Brief introduction and context

**Key Points**: Main topics and arguments discussed

**Takeaways**: Practical insights and conclusions

Content to summarize:
${text}

Ensure the summary is comprehensive enough for someone who hasn't watched the video.`;
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
