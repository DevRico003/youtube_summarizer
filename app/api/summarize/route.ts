import { NextResponse } from "next/server";
import { YoutubeTranscript } from 'youtube-transcript';
import { prisma } from "@/lib/prisma";
import { extractVideoId, createSummaryPrompt } from '@/lib/youtube';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Groq } from "groq-sdk";
import OpenAI from 'openai';
import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import FormData from 'form-data';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

// Add at the top of the file after imports
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error: any) => {
    console.error(`[ERROR] ${message}`, {
      message: error?.message,
      status: error?.status,
      stack: error?.stack,
      cause: error?.cause,
      details: error?.details,
      response: error?.response,
    });
  },
  debug: (message: string, data?: any) => {
    console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

// Initialize API clients only when needed
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// Helper function to get user-friendly model names
const MODEL_NAMES = {
  gemini: "Google Gemini",
  groq: "Groq",
  gpt4: "GPT-4"
};

// Helper function to check API key availability
function checkApiKeyAvailability() {
  return {
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    gpt4: !!process.env.OPENAI_API_KEY
  };
}

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
    .replace(/^(?![#*\-•🎯️])[\s\d]+\.\s*/gm, '') // Remove numbered lists but keep markdown lists
    .trim();
}

// AI Model configuration
const AI_MODELS = {
  gemini: {
    name: "gemini",
    async generateContent(prompt: string) {
      const genAI = getGeminiClient();
      if (!genAI) {
        throw new Error(`${MODEL_NAMES.gemini} API key is not configured. Please add your API key in the settings or choose a different model.`);
      }
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return cleanModelOutput(response.text());
    }
  },
  groq: {
    name: "groq",
    model: "llama-3.3-70b-versatile",
    async generateContent(prompt: string) {
      const groq = getGroqClient();
      if (!groq) {
        throw new Error(`${MODEL_NAMES.groq} API key is not configured. Please add your API key in the settings or choose a different model.`);
      }
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
      const openai = getOpenAIClient();
      if (!openai) {
        throw new Error(`${MODEL_NAMES.gpt4} API key is not configured. Please add your API key in the settings or choose a different model.`);
      }
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

async function downloadAudio(videoId: string): Promise<string> {
  const tempPath = path.join('/tmp', `${videoId}_temp.mp3`);
  const outputPath = path.join('/tmp', `${videoId}.flac`);

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Get only audio format info
    const info = await ytdl.getInfo(videoUrl);
    const audioFormat = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });

    if (!audioFormat) {
      throw new Error('No suitable audio format found');
    }

    // Download audio
    await new Promise<void>((resolve, reject) => {
      const stream = ytdl.downloadFromInfo(info, { format: audioFormat });
      const writeStream = fs.createWriteStream(tempPath);

      stream.pipe(writeStream);

      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      stream.on('error', reject);
    });

    // Convert to FLAC
    await execAsync(`ffmpeg -i ${tempPath} -ar 16000 -ac 1 -c:a flac ${outputPath}`);

    // Cleanup temp file
    fs.unlinkSync(tempPath);

    return outputPath;
  } catch (error: any) {
    // Cleanup on error
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    throw new Error(`Audio download failed: ${error.message}`);
  }
}

async function transcribeWithWhisper(audioPath: string, groq: Groq): Promise<string> {
  try {
    const form = new FormData();
    const audioBuffer = await fs.promises.readFile(audioPath);

    form.append('file', new Blob([audioBuffer], { type: 'audio/flac' }), {
      filename: 'audio.flac',
      contentType: 'audio/flac'
    });
    form.append('model', 'whisper-large-v3');
    form.append('language', 'auto');
    form.append('response_format', 'text');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: form
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error (${response.status}): ${errorText}`);
    }

    const result = await response.text();
    return result;

  } catch (error: any) {
    throw new Error(`Transcription failed: ${error.message}`);
  } finally {
    // Cleanup audio file
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  }
}

async function getTranscript(videoId: string): Promise<{ transcript: string; source: 'whisper'; title: string }> {
  try {
    logger.info('Starting direct video processing for', videoId);

    // Get video info using ytdl-core
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let videoInfo;

    try {
      videoInfo = await ytdl.getBasicInfo(videoUrl);
    } catch (error: any) {
      logger.error('Failed to get video info:', error);
      throw new Error(`Could not access video: ${error.message}`);
    }

    const title = videoInfo.videoDetails.title || 'Untitled Video';

    // Check if Groq API is available for Whisper
    const groq = getGroqClient();
    if (!groq) {
      throw new Error('Groq API key not configured for transcription.');
    }

    // Download audio
    logger.info('Downloading audio...');
    const audioPath = await downloadAudio(videoId);

    // Transcribe with Whisper
    logger.info('Transcribing audio...');
    const transcript = await transcribeWithWhisper(audioPath, groq);

    if (!transcript) {
      throw new Error('Failed to generate transcript');
    }

    return {
      transcript,
      source: 'whisper',
      title
    };

  } catch (error: any) {
    logger.error('Transcription failed:', error);
    throw new Error(`Failed to process video: ${error.message}`);
  }
}

// Add new endpoint to check API key availability
export async function GET(req: Request) {
  return NextResponse.json(checkApiKeyAvailability());
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

      logger.info('Processing video request', {
        videoId,
        language,
        mode,
        aiModel
      });

      if (!AI_MODELS[aiModel as keyof typeof AI_MODELS]) {
        throw new Error(`Invalid AI model selected. Please choose from: ${Object.values(MODEL_NAMES).join(', ')}`);
      }

      const selectedModel = AI_MODELS[aiModel as keyof typeof AI_MODELS];
      logger.info(`Using ${MODEL_NAMES[aiModel as keyof typeof MODEL_NAMES]} model for generation...`);

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
      logger.error('Error processing video:', {
        error,
        stack: error?.stack,
        cause: error?.cause
      });

      await writeProgress({
        type: 'error',
        error: error?.message || 'Failed to process video',
        details: error?.toString() || 'Unknown error'
      }).catch((writeError) => {
        logger.error('Failed to write error progress:', writeError);
      });
    } finally {
      await writer.close().catch((closeError) => {
        logger.error('Failed to close writer:', closeError);
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