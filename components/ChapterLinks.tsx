'use client';

import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';

interface Topic {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  order: number;
}

interface ChapterLinksProps {
  topics: Topic[];
  videoId: string;
}

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

export function ChapterLinks({ topics, videoId }: ChapterLinksProps) {
  // Sort topics by order
  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => a.order - b.order);
  }, [topics]);

  if (!topics || topics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Chapters
      </h3>
      <ul className="space-y-2">
        {sortedTopics.map((topic) => {
          const seconds = Math.floor(topic.startMs / 1000);
          const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;

          return (
            <li key={topic.id}>
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                  {formatTime(topic.startMs)}
                </span>
                <span className="text-sm flex-1 group-hover:text-primary transition-colors">
                  {topic.title}
                </span>
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
