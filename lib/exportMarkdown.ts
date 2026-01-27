/**
 * Markdown export utility for summaries
 */

interface Topic {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  order: number;
}

interface Summary {
  title: string;
  content: string;
}

/**
 * Format milliseconds to a readable time string (MM:SS or HH:MM:SS for long videos)
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Generate YouTube URL with timestamp
 */
function generateYouTubeLink(videoId: string, startMs: number): string {
  const seconds = Math.floor(startMs / 1000);
  return `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;
}

/**
 * Generate a markdown string from summary data
 *
 * @param summary - The summary object with title and content
 * @param topics - Array of topics with timestamps
 * @param videoId - The YouTube video ID
 * @returns Markdown formatted string
 */
export function generateMarkdown(
  summary: Summary,
  topics: Topic[],
  videoId: string
): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${summary.title}`);
  lines.push('');

  // Video link
  lines.push(`**Video:** [Watch on YouTube](https://www.youtube.com/watch?v=${videoId})`);
  lines.push('');

  // Chapter links (if topics exist)
  if (topics.length > 0) {
    lines.push('## Chapters');
    lines.push('');

    // Sort topics by order
    const sortedTopics = [...topics].sort((a, b) => a.order - b.order);

    for (const topic of sortedTopics) {
      const timestamp = formatTime(topic.startMs);
      const link = generateYouTubeLink(videoId, topic.startMs);
      lines.push(`- [${timestamp}](${link}) - ${topic.title}`);
    }

    lines.push('');
  }

  // Summary content
  lines.push('## Summary');
  lines.push('');
  lines.push(summary.content);
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Generated with YouTube Summarizer*');

  return lines.join('\n');
}
