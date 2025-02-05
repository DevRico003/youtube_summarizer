import { NextResponse } from "next/server";
import { YoutubeTranscript } from 'youtube-transcript';
import { prisma } from "@/lib/prisma";
import { extractVideoId, createSummaryPrompt } from '@/lib/youtube';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Groq } from "groq-sdk";
import OpenAI from 'openai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to clean model outputs
function cleanModelOutput(text: string): string {
  return text
    // English prefixes
    .replace(/^(Okay|Here'?s?( is)?|Let me|I will|I'll|I can|I would|I am going to|Allow me to|Sure|Of course|Certainly|Alright)[^]*?,\s*/i, '')
    .replace(/^(Here'?s?( is)?|I'?ll?|Let me|I will|I can|I would|I am going to|Allow me to|Sure|Of course|Certainly)[^]*?(summary|translate|breakdown|analysis).*?:\s*/i, '')
    .replace(/^(Based on|According to).*?,\s*/i, '')
    .replace(/^I understand.*?[.!]\s*/i, '')
    .replace(/^(Now|First|Let's),?\s*/i, '')
    .replace(/^(Here are|The following is|This is|Below is).*?:\s*/i, '')
    .replace(/^(I'll provide|Let me break|I'll break|I'll help|I've structured).*?:\s*/i, '')
    .replace(/^(As requested|Following your|In response to).*?:\s*/i, '')
    // German prefixes
    .replace(/^(Okay|Hier( ist)?|Lass mich|Ich werde|Ich kann|Ich würde|Ich möchte|Erlauben Sie mir|Sicher|Natürlich|Gewiss|In Ordnung)[^]*?,\s*/i, '')
    .replace(/^(Hier( ist)?|Ich werde|Lass mich|Ich kann|Ich würde|Ich möchte)[^]*?(Zusammenfassung|Übersetzung|Analyse).*?:\s*/i, '')
    .replace(/^(Basierend auf|Laut|Gemäß).*?,\s*/i, '')
    .replace(/^Ich verstehe.*?[.!]\s*/i, '')
    .replace(/^(Jetzt|Zunächst|Lass uns),?\s*/i, '')
    .replace(/^(Hier sind|Folgendes|Dies ist|Im Folgenden).*?:\s*/i, '')
    .replace(/^(Ich werde|Lass mich|Ich helfe|Ich habe strukturiert).*?:\s*/i, '')
    .replace(/^(Wie gewünscht|Entsprechend Ihrer|Als Antwort auf).*?:\s*/i, '')
    // Remove meta instructions while preserving markdown
    .replace(/^[^:\n🎯🎙️#*\-•]+:\s*/gm, '')  // Remove prefixes but keep markdown and emojis
    .replace(/^(?![#*\-•🎯🎙️])[\s\d]+\.\s*/gm, '') // Remove numbered lists but keep markdown lists
    .trim();
}

// AI Model configuration
const AI_MODELS = {
  gemini: {
    name: "gemini",
    model: genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" }),
    async generateContent(prompt: string) {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return cleanModelOutput(response.text());
    }
  },
  groq: {
    name: "groq",
    model: "llama-3.3-70b-versatile",
    async generateContent(prompt: string) {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a direct and concise summarizer. Respond only with the summary, without any prefixes or meta-commentary. Keep all markdown formatting intact."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: this.model,
        temperature: 0.7,
        max_tokens: 2048,
      });
      return cleanModelOutput(completion.choices[0]?.message?.content || '');
    }
  },
  gpt4: {
    name: "gpt4",
    model: "gpt-4o-mini",
    async generateContent(prompt: string) {
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a direct and concise summarizer. Respond only with the summary, without any prefixes or meta-commentary. Keep all markdown formatting intact."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: this.model,
        temperature: 0.7,
        max_tokens: 2048,
      });
      return cleanModelOutput(completion.choices[0]?.message?.content || '');
    }
  }
};

async function splitTranscriptIntoChunks(transcript: string, chunkSize: number = 7000, overlap: number = 1000): Promise<string[]> {
  const words = transcript.split(' ');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    if (currentLength + word.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      // Keep last few words for overlap
      const overlapWords = currentChunk.slice(-Math.floor(overlap / 10));
      currentChunk = [...overlapWords];
      currentLength = overlapWords.join(' ').length;
    }
    currentChunk.push(word);
    currentLength += word.length + 1; // +1 for space
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

async function getTranscript(videoId: string): Promise<{ transcript: string; source: 'youtube'; title: string }> {
  try {
    // First try YouTube transcripts
    const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);

    // Extract title from first few lines of transcript
    const firstFewLines = transcriptList.slice(0, 5).map(item => item.text).join(' ');
    let title = firstFewLines.split('.')[0].trim();

    // If title is too long, truncate it
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    // If title is too short or seems incomplete, use a generic title
    if (title.length < 10) {
      title = `YouTube Video Summary`;
    }

    return {
      transcript: transcriptList.map(item => item.text).join(' '),
      source: 'youtube',
      title
    };
  } catch (error) {
    console.log('YouTube transcript not available');
    throw new Error('Transcript not available. Currently only supporting videos with subtitles.');
  }
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const writeProgress = async (data: any) => {
    await writer.write(encoder.encode(JSON.stringify(data) + '\n'));
  };

  (async () => {
    try {
      const { url, language, mode, aiModel = 'gemini' } = await req.json();
      const videoId = extractVideoId(url);

      if (!AI_MODELS[aiModel as keyof typeof AI_MODELS]) {
        throw new Error('Invalid AI model selected');
      }

      const selectedModel = AI_MODELS[aiModel as keyof typeof AI_MODELS];
      console.log(`Using ${selectedModel.name} model for generation...`);

      // Check cache first
      const existingSummary = await prisma.summary.findFirst({
        where: {
          videoId,
          language
        }
      });

      if (existingSummary) {
        await writeProgress({
          type: 'complete',
          summary: existingSummary.content,
          source: 'cache',
          status: 'completed'
        });
        await writer.close();
        return;
      }

      // Get transcript
      await writeProgress({
        type: 'progress',
        currentChunk: 0,
        totalChunks: 1,
        stage: 'analyzing',
        message: 'Fetching video transcript...'
      });

      const { transcript, source, title } = await getTranscript(videoId);
      const chunks = await splitTranscriptIntoChunks(transcript);
      const totalChunks = chunks.length;
      const intermediateSummaries = [];

      // Process chunks
      for (let i = 0; i < chunks.length; i++) {
        await writeProgress({
          type: 'progress',
          currentChunk: i + 1,
          totalChunks,
          stage: 'processing',
          message: `Processing section ${i + 1} of ${totalChunks}...`
        });

        const prompt = `Create a detailed summary of section ${i + 1} in ${language}.
        Maintain all important information, arguments, and connections.
        Pay special attention to:
        - Main topics and arguments
        - Important details and examples
        - Connections with other mentioned topics
        - Key statements and conclusions

        Text: ${chunks[i]}`;

        const text = await selectedModel.generateContent(prompt);
        intermediateSummaries.push(text);
      }

      // Generate final summary
      await writeProgress({
        type: 'progress',
        currentChunk: totalChunks,
        totalChunks,
        stage: 'finalizing',
        message: 'Creating final summary...'
      });

      const combinedSummary = intermediateSummaries.join('\n\n=== Next Section ===\n\n');
      const finalPrompt = createSummaryPrompt(combinedSummary, language, mode);
      const summary = await selectedModel.generateContent(finalPrompt);

      if (!summary) {
        throw new Error('No summary content generated');
      }

      // Save to database
      await writeProgress({
        type: 'progress',
        currentChunk: totalChunks,
        totalChunks,
        stage: 'saving',
        message: 'Saving summary to history...'
      });

      try {
        // Check if summary already exists
        const existingSummary = await prisma.summary.findFirst({
          where: {
            videoId,
            language
          }
        });

        let savedSummary;
        if (existingSummary) {
          // Update existing summary
          savedSummary = await prisma.summary.update({
            where: {
              id: existingSummary.id
            },
            data: {
              content: summary,
              mode,
              source,
              updatedAt: new Date()
            }
          });
        } else {
          // Create new summary
          savedSummary = await prisma.summary.create({
            data: {
              videoId,
              title,
              content: summary,
              language,
              mode,
              source
            }
          });
        }

        await writeProgress({
          type: 'complete',
          summary: savedSummary.content,
          source: savedSummary.source || 'youtube',
          status: 'completed'
        });
      } catch (dbError: any) {
        console.warn('Warning: Failed to save to database -', dbError?.message || 'Unknown database error');

        // Still return the summary even if saving failed
        await writeProgress({
          type: 'complete',
          summary,
          source: source || 'youtube',
          status: 'completed',
          warning: 'Failed to save to history'
        });
      }

    } catch (error: any) {
      console.error('Error processing video -', error?.message || 'Unknown error');

      await writeProgress({
        type: 'error',
        error: error?.message || 'Failed to process video',
        details: error?.toString() || 'Unknown error'
      }).catch((writeError) => {
        console.error('Failed to write error progress -', writeError);
      });
    } finally {
      await writer.close().catch((closeError) => {
        console.error('Failed to close writer -', closeError);
      });
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}