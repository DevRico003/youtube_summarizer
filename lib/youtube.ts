const VALID_YOUTUBE_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'm.youtube.com'
];

export function extractVideoId(youtube_url: string): string {
  const url = youtube_url.trim();

  // Security check: Only allow valid YouTube domains
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    if (!VALID_YOUTUBE_DOMAINS.includes(hostname)) {
      throw new Error("Invalid domain");
    }
  } catch (error) {
    // If URL constructor threw, check if it's just a video ID (11 chars)
    if (error instanceof TypeError) {
      if (!/^[0-9A-Za-z_-]{11}$/.test(url)) {
        throw new Error("Invalid YouTube URL or video ID");
      }
      return url;
    }
    // Re-throw domain validation errors
    throw error;
  }

  const patterns = [
    /(?:v=|\/)([0-9A-Za-z_-]{11}).*/,      // Standard and shared URLs
    /(?:embed\/)([0-9A-Za-z_-]{11})/,       // Embed URLs
    /(?:youtu\.be\/)([0-9A-Za-z_-]{11})/,   // Shortened URLs
    /(?:shorts\/)([0-9A-Za-z_-]{11})/,      // YouTube Shorts
    /^([0-9A-Za-z_-]{11})$/                 // Just the video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  throw new Error("Could not extract video ID from URL");
}

export const AVAILABLE_LANGUAGES = {
  'English': 'en',
  'German': 'de'
} as const;

export function createSummaryPrompt(text: string, targetLanguage: string, mode: 'video' | 'podcast' = 'video') {
  const languagePrompts = {
    'en': {
      title: 'TITLE',
      overview: 'OVERVIEW',
      keyPoints: 'KEY POINTS',
      takeaways: 'MAIN TAKEAWAYS',
      context: 'CONTEXT & IMPLICATIONS'
    },
    'de': {
      title: 'TITEL',
      overview: 'ÜBERBLICK',
      keyPoints: 'KERNPUNKTE',
      takeaways: 'HAUPTERKENNTNISSE',
      context: 'KONTEXT & AUSWIRKUNGEN'
    }
  };

  const prompts = languagePrompts[targetLanguage as keyof typeof languagePrompts] || languagePrompts.en;

  if (mode === 'podcast') {
    return `Please provide a detailed podcast-style summary of the following content in ${targetLanguage}.
    Structure your response as follows:

    🎙️ ${prompts.title}: Create an engaging title

    🎧 ${prompts.overview} (3-5 sentences):
    - Provide a detailed context and main purpose

    🔍 ${prompts.keyPoints}:
    - Deep dive into the main arguments
    - Include specific examples and anecdotes
    - Highlight unique perspectives and expert opinions

    📈 ${prompts.takeaways}:
    - List 5-7 practical insights
    - Explain their significance and potential impact

    🌐 ${prompts.context}:
    - Broader context discussion
    - Future implications and expert predictions

    Text to summarize: ${text}

    Ensure the summary is comprehensive enough for someone who hasn't seen the original content.`;
  }

  return `Please provide a detailed summary of the following content in ${targetLanguage}.
  Structure your response as follows:

  🎯 ${prompts.title}: Create a descriptive title

  📝 ${prompts.overview} (2-3 sentences):
  - Provide a brief context and main purpose

  🔑 ${prompts.keyPoints}:
  - Extract and explain the main arguments
  - Include specific examples
  - Highlight unique perspectives

  💡 ${prompts.takeaways}:
  - List 3-5 practical insights
  - Explain their significance

  🔄 ${prompts.context}:
  - Broader context discussion
  - Future implications

  Text to summarize: ${text}

  Ensure the summary is comprehensive enough for someone who hasn't seen the original content.`;
}