import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import FormData from 'form-data';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

export async function POST(req: Request) {
  try {
    const groq = getGroqClient();
    if (!groq) {
      return NextResponse.json(
        { error: 'Groq API key not configured' },
        { status: 500 }
      );
    }

    // Create a temporary directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Get the form data from the request
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Save the audio file temporarily
    const tempInputPath = path.join(tempDir, 'input.wav');
    const tempOutputPath = path.join(tempDir, 'output.flac');

    // Convert the File to Buffer and save it
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempInputPath, buffer);

    try {
      // Convert to FLAC format with correct parameters for Whisper
      await execAsync(`ffmpeg -i ${tempInputPath} -ar 16000 -ac 1 -c:a flac ${tempOutputPath}`);

      // Create form data for Groq API
      const form = new FormData();
      const fileStream = fs.createReadStream(tempOutputPath);
      form.append('file', fileStream, {
        filename: 'audio.flac',
        contentType: 'audio/flac'
      });
      form.append('model', 'whisper-large-v3-turbo');
      form.append('language', 'auto');
      form.append('response_format', 'text');
      form.append('temperature', '0.0');

      // Make request to Groq API
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          ...form.getHeaders()
        },
        // @ts-ignore - form-data is compatible with node-fetch
        body: form
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      return NextResponse.json({ text: data.text });

    } finally {
      // Clean up temporary files
      try {
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
      } catch (error) {
        console.error('Error cleaning up temporary files:', error);
      }
    }
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error.message || 'Transcription failed' },
      { status: 500 }
    );
  }
}