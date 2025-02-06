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
    logger.info(`Starting audio download for video ${videoId}`);

    // First download the audio
    await new Promise<void>((resolve, reject) => {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      logger.debug(`Downloading from URL: ${videoUrl}`);

      const stream = ytdl(videoUrl, {
        quality: 'lowestaudio',
        filter: 'audioonly',
      });

      stream.on('info', (info, format) => {
        logger.debug('Stream info:', {
          format: format.container,
          quality: format.quality,
          audioCodec: format.audioCodec,
          bitrate: format.audioBitrate
        });
      });

      stream.pipe(fs.createWriteStream(tempPath))
        .on('finish', () => {
          logger.info(`Audio download completed: ${tempPath}`);
          resolve();
        })
        .on('error', (error) => {
          logger.error('Error during audio download:', error);
          reject(error);
        });
    });

    // Convert to optimal format for Whisper
    logger.info('Converting audio to FLAC format...');
    await execAsync(`ffmpeg -i ${tempPath} -ar 16000 -ac 1 -c:a flac ${outputPath}`);
    logger.info('Audio conversion completed');

    // Verify the output file
    const stats = fs.statSync(outputPath);
    logger.debug('Output file details:', {
      size: stats.size,
      path: outputPath
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);
    logger.info('Temporary MP3 file cleaned up');

    return outputPath;
  } catch (error) {
    logger.error('Error in downloadAudio:', error);
    // Clean up any files in case of error
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    throw error;
  }
}

async function transcribeWithWhisper(audioPath: string, groq: Groq): Promise<string> {
  try {
    logger.info('Starting transcription process');

    // Verify input file
    const inputStats = fs.statSync(audioPath);
    logger.debug('Input file details:', {
      size: inputStats.size,
      path: audioPath
    });

    // Read file as buffer
    const audioBuffer = await fs.promises.readFile(audioPath);
    logger.info(`Read audio file of size: ${audioBuffer.length} bytes`);

    // Create form data
    const form = new FormData();

    // Create a proper file object
    const file = new Blob([audioBuffer], { type: 'audio/flac' });
    form.append('file', file, {
      filename: 'audio.flac',
      contentType: 'audio/flac'
    });

    // Add required parameters
    form.append('model', 'whisper-large-v3');
    form.append('language', 'auto');
    form.append('response_format', 'text');

    logger.debug('Request parameters:', {
      model: 'whisper-large-v3',
      fileSize: audioBuffer.length,
      contentType: 'audio/flac'
    });

    try {
      logger.info('Sending request to Groq API...');
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: form
      });

      logger.info(`Received response with status: ${response.status}`);
      const responseText = await response.text();
      logger.debug('Raw response:', responseText);

      if (!response.ok) {
        let errorMessage = `API request failed: ${response.statusText} (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          logger.error('API error details:', errorData);
          errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch (e) {
          logger.error('Failed to parse error response:', e);
          errorMessage += ` - ${responseText}`;
        }
        throw new Error(errorMessage);
      }

      try {
        const data = JSON.parse(responseText);
        logger.info('Successfully parsed response');
        return data.text;
      } catch (e) {
        logger.info('Response was not JSON, using raw text');
        return responseText;
      }

    } catch (error: any) {
      logger.error('Transcription request failed:', error);
      throw new Error(`Whisper transcription failed: ${error.message || 'Unknown error'}`);
    }
  } finally {
    // Cleanup: Delete the temporary audio file
    try {
      await fs.promises.unlink(audioPath);
      logger.info('Cleaned up temporary audio file');
    } catch (error) {
      logger.error('Failed to delete temporary audio file:', error);
    }
  }
}

async function getTranscript(videoId: string): Promise<{ transcript: string; source: 'youtube' | 'whisper'; title: string }> {
  try {
    // First try YouTube transcripts
    const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);

    // Extract title and process transcript as before
    const firstFewLines = transcriptList.slice(0, 5).map(item => item.text).join(' ');
    let title = firstFewLines.split('.')[0].trim();

    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    if (title.length < 10) {
      title = `YouTube Video Summary`;
    }

    return {
      transcript: transcriptList.map(item => item.text).join(' '),
      source: 'youtube',
      title
    };
  } catch (error) {
    console.log('YouTube transcript not available, falling back to Whisper...');

    // Get video info for title
    const videoInfo = await ytdl.getInfo(videoId);
    const title = videoInfo.videoDetails.title;

    // Check if Groq API is available
    const groq = getGroqClient();
    if (!groq) {
      throw new Error('Transcript not available and Groq API key not configured for Whisper fallback.');
    }

    try {
      // Download audio
      const audioPath = await downloadAudio(videoId);
      console.log('Audio downloaded successfully');

      // Transcribe with Whisper
      const transcript = await transcribeWithWhisper(audioPath, groq);
      console.log('Transcription completed successfully');

      return {
        transcript,
        source: 'whisper',
        title
      };
    } catch (whisperError) {
      console.error('Whisper transcription failed:', whisperError);
      throw new Error('Failed to get transcript from both YouTube and Whisper. Please ensure the video has subtitles or try again later.');
    }
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

      if (!AI_MODELS[aiModel as keyof typeof AI_MODELS]) {
        throw new Error(`Invalid AI model selected. Please choose from: ${Object.values(MODEL_NAMES).join(', ')}`);
      }

      const selectedModel = AI_MODELS[aiModel as keyof typeof AI_MODELS];
      console.log(`Using ${MODEL_NAMES[aiModel as keyof typeof MODEL_NAMES]} model for generation...`);

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