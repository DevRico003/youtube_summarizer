import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/summarize/route';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    summary: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock transcript fetching
jest.mock('@/lib/transcript', () => ({
  fetchTranscript: jest.fn(),
  TranscriptError: class TranscriptError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'TranscriptError';
      this.code = code;
    }
  },
}));

// Mock LLM chain
jest.mock('@/lib/llmChain', () => ({
  callWithFallback: jest.fn(),
  getAvailableModels: jest.fn(),
}));

// Mock topic extraction
jest.mock('@/lib/topicExtraction', () => ({
  extractTopics: jest.fn(),
}));

// Mock usage logger
jest.mock('@/lib/usageLogger', () => ({
  logApiUsage: jest.fn().mockResolvedValue(undefined),
}));

// Mock apiAuth
jest.mock('@/lib/apiAuth', () => ({
  authenticateRequest: jest.fn().mockReturnValue({
    success: true,
    userId: 'test-user-id',
  }),
}));

// Mock rate limiting to always allow requests in tests
jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 10 }),
  getClientIp: jest.fn().mockReturnValue('test-ip'),
}));

// Import mocks after setting them up
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
import { fetchTranscript, TranscriptError } from '@/lib/transcript';
import { callWithFallback, getAvailableModels } from '@/lib/llmChain';
import { extractTopics } from '@/lib/topicExtraction';

const mockedFetchTranscript = fetchTranscript as jest.MockedFunction<typeof fetchTranscript>;
const mockedCallWithFallback = callWithFallback as jest.MockedFunction<typeof callWithFallback>;
const mockedGetAvailableModels = getAvailableModels as jest.MockedFunction<typeof getAvailableModels>;
const mockedExtractTopics = extractTopics as jest.MockedFunction<typeof extractTopics>;

describe('Summarize API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create NextRequest with JSON body and auth header
  const createRequest = (body: object, url: string = 'http://localhost:3000/api/summarize'): NextRequest => {
    return new NextRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(body),
    });
  };

  // Helper to create GET NextRequest with auth header
  const createGetRequest = (url: string = 'http://localhost:3000/api/summarize'): NextRequest => {
    return new NextRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
      },
    });
  };

  // Helper to parse streaming response
  const parseStreamResponse = async (response: Response): Promise<object[]> => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const events: object[] = [];
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            events.push(JSON.parse(line));
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        events.push(JSON.parse(buffer));
      } catch {
        // Skip invalid JSON
      }
    }

    return events;
  };

  describe('GET /api/summarize', () => {
    it('should return available models', async () => {
      mockedGetAvailableModels.mockResolvedValue([
        { id: 'glm-4.7', name: 'GLM-4.7', available: true, group: 'zai' },
        { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', available: true, group: 'zai' },
        { id: 'gemini-3-flash', name: 'Gemini 3 Flash', available: true, group: 'openrouter' },
        { id: 'gemini', name: 'Gemini 1.5 Flash', available: false, group: 'legacy' },
        { id: 'groq', name: 'Llama 3.1 (Groq)', available: false, group: 'legacy' },
        { id: 'openai', name: 'GPT-4o Mini', available: false, group: 'legacy' },
      ]);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.models).toHaveLength(6);
      expect(data.models[0]).toEqual({
        id: 'glm-4.7',
        name: 'GLM-4.7',
        available: true,
        group: 'zai',
      });
    });

    it('should return 500 when getAvailableModels fails', async () => {
      mockedGetAvailableModels.mockRejectedValue(new Error('Failed to check models'));

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get available models');
    });
  });

  describe('POST /api/summarize - Validation', () => {
    it('should return error when URL is missing', async () => {
      const request = createRequest({});
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const errorEvent = events.find((e: any) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect((errorEvent as any).error).toBe('URL is required');
    });

    it('should return error when URL is empty string', async () => {
      const request = createRequest({ url: '' });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const errorEvent = events.find((e: any) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect((errorEvent as any).error).toBe('URL is required');
    });

    it('should return error for invalid YouTube URL', async () => {
      const request = createRequest({ url: 'https://example.com/video/abc' });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const errorEvent = events.find((e: any) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect((errorEvent as any).error).toBe('Invalid YouTube URL');
      expect((errorEvent as any).details).toBe('Could not extract video ID from the provided URL');
    });

    it('should return error for malformed URL', async () => {
      const request = createRequest({ url: 'not-a-url' });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const errorEvent = events.find((e: any) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect((errorEvent as any).error).toBe('Invalid YouTube URL');
    });

    it('should return error for YouTube URL without video ID', async () => {
      const request = createRequest({ url: 'https://www.youtube.com/' });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const errorEvent = events.find((e: any) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect((errorEvent as any).error).toBe('Invalid YouTube URL');
    });
  });

  describe('POST /api/summarize - Cache', () => {
    it('should return cached summary if exists', async () => {
      const videoId = 'dQw4w9WgXcQ';
      const cachedSummary = {
        id: 'summary-123',
        videoId,
        title: 'Cached Video Summary',
        content: 'This is a cached summary',
        transcript: 'Original transcript',
        hasTimestamps: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        topics: [
          { id: 'topic-1', title: 'Introduction', startMs: 0, endMs: 30000, order: 0, summaryId: 'summary-123', createdAt: new Date(), updatedAt: new Date() },
          { id: 'topic-2', title: 'Main Content', startMs: 30000, endMs: 120000, order: 1, summaryId: 'summary-123', createdAt: new Date(), updatedAt: new Date() },
        ],
        transcriptSegments: [
          { id: 'seg-1', text: 'Original transcript', offset: 0, duration: 30000, order: 0, summaryId: 'summary-123', createdAt: new Date() },
        ],
      };

      (mockedPrisma.summary.findUnique as jest.Mock).mockResolvedValue(cachedSummary);

      const request = createRequest({ url: `https://www.youtube.com/watch?v=${videoId}` });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
      expect((completeEvent as any).summary.source).toBe('cache');
      expect((completeEvent as any).summary.id).toBe('summary-123');
      expect((completeEvent as any).summary.topics).toHaveLength(2);

      // Should not attempt to fetch transcript
      expect(mockedFetchTranscript).not.toHaveBeenCalled();
    });

    it('should return cached summary for youtu.be URL format', async () => {
      const videoId = 'dQw4w9WgXcQ';
      const cachedSummary = {
        id: 'summary-456',
        videoId,
        title: 'Cached Video',
        content: 'Summary content',
        transcript: 'Transcript',
        hasTimestamps: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        topics: [],
        transcriptSegments: [],
      };

      (mockedPrisma.summary.findUnique as jest.Mock).mockResolvedValue(cachedSummary);

      const request = createRequest({ url: `https://youtu.be/${videoId}` });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
      expect((completeEvent as any).summary.source).toBe('cache');
    });
  });

  describe('POST /api/summarize - Supadata/Transcript Errors', () => {
    beforeEach(() => {
      // No cached summary
      (mockedPrisma.summary.findUnique as jest.Mock).mockResolvedValue(null);
    });

    it('should return error when Supadata is not configured', async () => {
      const TranscriptErrorClass = (await import('@/lib/transcript')).TranscriptError;
      mockedFetchTranscript.mockRejectedValue(
        new TranscriptErrorClass(
          'Supadata is not configured. Please add your Supadata API key in settings.',
          'SUPADATA_NOT_CONFIGURED'
        )
      );

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      // Should have progress event for fetching transcript
      const progressEvent = events.find((e: any) => e.type === 'progress' && e.stage === 'fetching_transcript');
      expect(progressEvent).toBeDefined();

      // Should have error event
      const errorEvent = events.find((e: any) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect((errorEvent as any).error).toContain('Supadata is not configured');
    });

    it('should return error when transcript fetch fails', async () => {
      const TranscriptErrorClass = (await import('@/lib/transcript')).TranscriptError;
      mockedFetchTranscript.mockRejectedValue(
        new TranscriptErrorClass('Failed to fetch transcript: Network error', 'TRANSCRIPT_FETCH_FAILED')
      );

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const errorEvent = events.find((e: any) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect((errorEvent as any).error).toContain('Failed to fetch transcript');
    });
  });

  describe('POST /api/summarize - Successful Generation', () => {
    const videoId = 'testVideo123';
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    beforeEach(() => {
      // No cached summary
      (mockedPrisma.summary.findUnique as jest.Mock).mockResolvedValue(null);
    });

    it('should generate summary successfully with timestamps', async () => {
      // Mock transcript with timestamps
      mockedFetchTranscript.mockResolvedValue({
        content: [
          { text: 'Hello and welcome to this video.', offset: 0, duration: 5000, lang: 'en' },
          { text: 'Today we will discuss important topics.', offset: 5000, duration: 5000, lang: 'en' },
          { text: 'Let us begin with the introduction.', offset: 10000, duration: 5000, lang: 'en' },
        ],
        lang: 'en',
        availableLangs: ['en'],
        hasTimestamps: true,
      });

      // Mock LLM response
      mockedCallWithFallback.mockResolvedValue({
        response: '**Title**: Test Video Summary\n\n**Overview**: This is a test summary of the video content.',
        modelUsed: 'glm-4.7',
        tokensUsed: 500,
      });

      // Mock topic extraction
      mockedExtractTopics.mockResolvedValue({
        topics: [
          { title: 'Introduction', startMs: 0, endMs: 7500, order: 0 },
          { title: 'Main Content', startMs: 7500, endMs: 15000, order: 1 },
        ],
        modelUsed: 'glm-4.7',
        tokensUsed: 200,
      });

      // Mock summary creation
      const createdSummary = {
        id: 'new-summary-id',
        videoId,
        title: 'Test Video Summary',
        content: '**Title**: Test Video Summary\n\n**Overview**: This is a test summary of the video content.',
        transcript: 'Hello and welcome to this video. Today we will discuss important topics. Let us begin with the introduction.',
        hasTimestamps: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        topics: [
          { id: 'topic-1', title: 'Introduction', startMs: 0, endMs: 7500, order: 0, summaryId: 'new-summary-id', createdAt: new Date(), updatedAt: new Date() },
          { id: 'topic-2', title: 'Main Content', startMs: 7500, endMs: 15000, order: 1, summaryId: 'new-summary-id', createdAt: new Date(), updatedAt: new Date() },
        ],
        transcriptSegments: [
          { id: 'seg-1', text: 'Hello and welcome to this video.', offset: 0, duration: 5000, order: 0, summaryId: 'new-summary-id', createdAt: new Date() },
          { id: 'seg-2', text: 'Today we will discuss important topics.', offset: 5000, duration: 5000, order: 1, summaryId: 'new-summary-id', createdAt: new Date() },
          { id: 'seg-3', text: 'Let us begin with the introduction.', offset: 10000, duration: 5000, order: 2, summaryId: 'new-summary-id', createdAt: new Date() },
        ],
      };
      (mockedPrisma.summary.create as jest.Mock).mockResolvedValue(createdSummary);

      const request = createRequest({ url: videoUrl, detailLevel: 3 });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      // Check progress events
      const stages = events
        .filter((e: any) => e.type === 'progress')
        .map((e: any) => e.stage);
      expect(stages).toContain('fetching_transcript');
      expect(stages).toContain('analyzing_topics');
      expect(stages).toContain('generating_summary');
      expect(stages).toContain('building_timeline');

      // Check complete event
      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
      expect((completeEvent as any).summary.source).toBe('generated');
      expect((completeEvent as any).summary.videoId).toBe(videoId);
      expect((completeEvent as any).summary.hasTimestamps).toBe(true);
      expect((completeEvent as any).summary.topics).toHaveLength(2);
      expect((completeEvent as any).summary.modelUsed).toBe('glm-4.7');
    });

    it('should generate summary successfully without timestamps', async () => {
      // Mock transcript without timestamps (plain string)
      mockedFetchTranscript.mockResolvedValue({
        content: 'This is a plain text transcript without timestamps. It contains the video content in text form.',
        lang: 'en',
        availableLangs: ['en'],
        hasTimestamps: false,
      });

      // Mock LLM response
      mockedCallWithFallback.mockResolvedValue({
        response: '**Title**: Plain Text Summary\n\n**Overview**: Summary of plain text content.',
        modelUsed: 'gemini',
        tokensUsed: 300,
      });

      // Mock summary creation (no topics when no timestamps)
      const createdSummary = {
        id: 'plain-summary-id',
        videoId,
        title: 'Plain Text Summary',
        content: '**Title**: Plain Text Summary\n\n**Overview**: Summary of plain text content.',
        transcript: 'This is a plain text transcript without timestamps.',
        hasTimestamps: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        topics: [],
        transcriptSegments: [],
      };
      (mockedPrisma.summary.create as jest.Mock).mockResolvedValue(createdSummary);

      const request = createRequest({ url: videoUrl });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      // Should NOT have building_timeline stage when no timestamps
      const stages = events
        .filter((e: any) => e.type === 'progress')
        .map((e: any) => e.stage);
      expect(stages).toContain('fetching_transcript');
      expect(stages).toContain('analyzing_topics');
      expect(stages).toContain('generating_summary');
      expect(stages).not.toContain('building_timeline');

      // Check complete event
      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
      expect((completeEvent as any).summary.hasTimestamps).toBe(false);
      expect((completeEvent as any).summary.topics).toHaveLength(0);

      // extractTopics should not be called
      expect(mockedExtractTopics).not.toHaveBeenCalled();
    });

    it('should handle topic extraction failure gracefully', async () => {
      // Mock transcript with timestamps
      mockedFetchTranscript.mockResolvedValue({
        content: [
          { text: 'Video content here.', offset: 0, duration: 10000, lang: 'en' },
        ],
        lang: 'en',
        availableLangs: ['en'],
        hasTimestamps: true,
      });

      // Mock LLM response
      mockedCallWithFallback.mockResolvedValue({
        response: '**Title**: Summary\n\n**Overview**: Content summary.',
        modelUsed: 'groq',
        tokensUsed: 250,
      });

      // Mock topic extraction failure
      mockedExtractTopics.mockRejectedValue(new Error('Topic extraction failed'));

      // Mock summary creation (with empty topics due to extraction failure)
      const createdSummary = {
        id: 'fallback-summary-id',
        videoId,
        title: 'Summary',
        content: '**Title**: Summary\n\n**Overview**: Content summary.',
        transcript: 'Video content here.',
        hasTimestamps: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        topics: [], // Empty due to extraction failure
        transcriptSegments: [
          { id: 'seg-1', text: 'Video content here.', offset: 0, duration: 10000, order: 0, summaryId: 'fallback-summary-id', createdAt: new Date() },
        ],
      };
      (mockedPrisma.summary.create as jest.Mock).mockResolvedValue(createdSummary);

      const request = createRequest({ url: videoUrl });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      // Should still complete successfully
      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
      expect((completeEvent as any).summary.topics).toHaveLength(0);
      // No error event should be present
      const errorEvent = events.find((e: any) => e.type === 'error');
      expect(errorEvent).toBeUndefined();
    });

    it('should use default detail level when not specified', async () => {
      // Mock transcript
      mockedFetchTranscript.mockResolvedValue({
        content: [
          { text: 'Content.', offset: 0, duration: 5000, lang: 'en' },
        ],
        lang: 'en',
        availableLangs: ['en'],
        hasTimestamps: true,
      });

      // Mock LLM response
      mockedCallWithFallback.mockResolvedValue({
        response: '**Title**: Default Detail Summary\n\n**Overview**: Summary.',
        modelUsed: 'glm-4.7',
        tokensUsed: 100,
      });

      // Mock topic extraction (empty due to short video)
      mockedExtractTopics.mockResolvedValue({
        topics: [],
        modelUsed: 'glm-4.7',
        tokensUsed: 50,
      });

      // Mock summary creation
      const createdSummary = {
        id: 'default-detail-summary',
        videoId,
        title: 'Default Detail Summary',
        content: '**Title**: Default Detail Summary\n\n**Overview**: Summary.',
        transcript: 'Content.',
        hasTimestamps: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        topics: [],
        transcriptSegments: [
          { id: 'seg-1', text: 'Content.', offset: 0, duration: 5000, order: 0, summaryId: 'default-detail-summary', createdAt: new Date() },
        ],
      };
      (mockedPrisma.summary.create as jest.Mock).mockResolvedValue(createdSummary);

      const request = createRequest({ url: videoUrl }); // No detailLevel specified
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
      // The API should use default detail level 3
    });
  });

  describe('POST /api/summarize - LLM Failures', () => {
    const videoUrl = 'https://www.youtube.com/watch?v=llmFailTest1';

    beforeEach(() => {
      // No cached summary
      (mockedPrisma.summary.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock successful transcript fetch
      mockedFetchTranscript.mockResolvedValue({
        content: [
          { text: 'Some content.', offset: 0, duration: 5000, lang: 'en' },
        ],
        lang: 'en',
        availableLangs: ['en'],
        hasTimestamps: true,
      });
    });

    it('should return error when all LLM models fail', async () => {
      mockedCallWithFallback.mockRejectedValue(
        new Error('All models failed. Errors: glm-4.7: API error; gemini: API error; groq: API error; openai: API error')
      );

      const request = createRequest({ url: videoUrl });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const errorEvent = events.find((e: any) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect((errorEvent as any).error).toContain('All models failed');
    });
  });

  describe('POST /api/summarize - Database Errors', () => {
    const videoUrl = 'https://www.youtube.com/watch?v=dbErrorTest';

    beforeEach(() => {
      // No cached summary
      (mockedPrisma.summary.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock successful transcript fetch
      mockedFetchTranscript.mockResolvedValue({
        content: [
          { text: 'Content.', offset: 0, duration: 5000, lang: 'en' },
        ],
        lang: 'en',
        availableLangs: ['en'],
        hasTimestamps: true,
      });

      // Mock successful LLM response
      mockedCallWithFallback.mockResolvedValue({
        response: '**Title**: Summary\n\n**Overview**: Content.',
        modelUsed: 'glm-4.7',
        tokensUsed: 100,
      });

      // Mock topic extraction
      mockedExtractTopics.mockResolvedValue({
        topics: [],
        modelUsed: 'glm-4.7',
        tokensUsed: 50,
      });
    });

    it('should return error when database write fails', async () => {
      (mockedPrisma.summary.create as jest.Mock).mockRejectedValue(
        new Error('Database write error')
      );

      const request = createRequest({ url: videoUrl });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const errorEvent = events.find((e: any) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect((errorEvent as any).error).toContain('Database write error');
    });

    it('should return error when cache check fails', async () => {
      (mockedPrisma.summary.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      const request = createRequest({ url: videoUrl });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const errorEvent = events.find((e: any) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect((errorEvent as any).error).toContain('Database connection error');
    });
  });

  describe('POST /api/summarize - URL Formats', () => {
    beforeEach(() => {
      // Set up mocks for successful flow
      (mockedPrisma.summary.findUnique as jest.Mock).mockResolvedValue(null);
      mockedFetchTranscript.mockResolvedValue({
        content: [{ text: 'Content.', offset: 0, duration: 5000, lang: 'en' }],
        lang: 'en',
        availableLangs: ['en'],
        hasTimestamps: true,
      });
      mockedCallWithFallback.mockResolvedValue({
        response: '**Title**: Summary\n\n**Overview**: Content.',
        modelUsed: 'glm-4.7',
        tokensUsed: 100,
      });
      mockedExtractTopics.mockResolvedValue({
        topics: [],
        modelUsed: 'glm-4.7',
        tokensUsed: 50,
      });
      (mockedPrisma.summary.create as jest.Mock).mockResolvedValue({
        id: 'test-id',
        videoId: 'dQw4w9WgXcQ',
        title: 'Summary',
        content: 'Content',
        transcript: 'Content.',
        hasTimestamps: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        topics: [],
        transcriptSegments: [
          { id: 'seg-1', text: 'Content.', offset: 0, duration: 5000, order: 0, summaryId: 'test-id', createdAt: new Date() },
        ],
      });
    });

    it('should handle standard YouTube URL', async () => {
      const request = createRequest({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
    });

    it('should handle YouTube Shorts URL', async () => {
      const request = createRequest({ url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
    });

    it('should handle YouTube embed URL', async () => {
      const request = createRequest({ url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
    });

    it('should handle youtu.be shortened URL', async () => {
      const request = createRequest({ url: 'https://youtu.be/dQw4w9WgXcQ' });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
    });

    it('should handle YouTube URL with extra query parameters', async () => {
      const request = createRequest({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s&list=PLtest' });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
    });
  });

  describe('POST /api/summarize - Title Extraction', () => {
    const videoId = 'titleTestId1';
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    beforeEach(() => {
      (mockedPrisma.summary.findUnique as jest.Mock).mockResolvedValue(null);
      mockedFetchTranscript.mockResolvedValue({
        content: [{ text: 'Content.', offset: 0, duration: 5000, lang: 'en' }],
        lang: 'en',
        availableLangs: ['en'],
        hasTimestamps: true,
      });
      mockedExtractTopics.mockResolvedValue({
        topics: [],
        modelUsed: 'glm-4.7',
        tokensUsed: 50,
      });
    });

    it('should extract title from **Title**: format', async () => {
      mockedCallWithFallback.mockResolvedValue({
        response: '**Title**: Extracted Title Here\n\n**Overview**: Summary content.',
        modelUsed: 'glm-4.7',
        tokensUsed: 100,
      });

      (mockedPrisma.summary.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          id: 'title-test-id',
          videoId: videoId,
          title: args.data.title,
          content: args.data.content,
          transcript: args.data.transcript,
          hasTimestamps: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          topics: [],
          transcriptSegments: [
            { id: 'seg-1', text: 'Content.', offset: 0, duration: 5000, order: 0, summaryId: 'title-test-id', createdAt: new Date() },
          ],
        });
      });

      const request = createRequest({ url: videoUrl });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
      expect((completeEvent as any).summary.title).toBe('Extracted Title Here');
    });

    it('should use fallback title when no title found in summary', async () => {
      mockedCallWithFallback.mockResolvedValue({
        response: 'This is just a summary without any title format.',
        modelUsed: 'glm-4.7',
        tokensUsed: 100,
      });

      (mockedPrisma.summary.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          id: 'fallback-title-id',
          videoId: videoId,
          title: args.data.title,
          content: args.data.content,
          transcript: args.data.transcript,
          hasTimestamps: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          topics: [],
          transcriptSegments: [
            { id: 'seg-1', text: 'Content.', offset: 0, duration: 5000, order: 0, summaryId: 'fallback-title-id', createdAt: new Date() },
          ],
        });
      });

      const request = createRequest({ url: videoUrl });
      const response = await POST(request);
      const events = await parseStreamResponse(response);

      const completeEvent = events.find((e: any) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
      expect((completeEvent as any).summary.title).toContain('Video Summary');
    });
  });

  describe('POST /api/summarize - Streaming Response', () => {
    it('should return proper streaming headers', async () => {
      const request = createRequest({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
      const response = await POST(request);

      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });
  });
});
