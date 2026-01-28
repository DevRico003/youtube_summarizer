'use client';

import { useState, useMemo } from 'react';

interface Topic {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  order: number;
}

interface TimelineProps {
  topics: Topic[];
  videoDuration: number; // in milliseconds
  videoId: string;
}

// Color palette for topics
const TOPIC_COLORS = [
  'bg-blue-500 hover:bg-blue-600',
  'bg-green-500 hover:bg-green-600',
  'bg-purple-500 hover:bg-purple-600',
  'bg-orange-500 hover:bg-orange-600',
  'bg-pink-500 hover:bg-pink-600',
  'bg-teal-500 hover:bg-teal-600',
  'bg-indigo-500 hover:bg-indigo-600',
  'bg-red-500 hover:bg-red-600',
  'bg-yellow-500 hover:bg-yellow-600',
  'bg-cyan-500 hover:bg-cyan-600',
];

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

export function Timeline({ topics, videoDuration, videoId }: TimelineProps) {
  const [hoveredTopic, setHoveredTopic] = useState<Topic | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Sort topics by order
  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => a.order - b.order);
  }, [topics]);

  // Handle click to open YouTube at timestamp
  const handleClick = (startMs: number) => {
    const seconds = Math.floor(startMs / 1000);
    const url = `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle mouse enter
  const handleMouseEnter = (topic: Topic, event: React.MouseEvent) => {
    setHoveredTopic(topic);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredTopic(null);
  };

  if (!topics || topics.length === 0 || videoDuration <= 0) {
    return null;
  }

  return (
    <div className="relative w-full">
      {/* Timeline bar */}
      <div className="flex w-full h-8 rounded-lg overflow-hidden shadow-sm border border-border">
        {sortedTopics.map((topic, index) => {
          const duration = topic.endMs - topic.startMs;
          const widthPercent = (duration / videoDuration) * 100;
          const colorClass = TOPIC_COLORS[index % TOPIC_COLORS.length];

          return (
            <button
              key={topic.id}
              className={`${colorClass} transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`}
              style={{ width: `${widthPercent}%` }}
              onClick={() => handleClick(topic.startMs)}
              onMouseEnter={(e) => handleMouseEnter(topic, e)}
              onMouseLeave={handleMouseLeave}
              aria-label={`${topic.title} - ${formatTime(topic.startMs)} to ${formatTime(topic.endMs)}`}
            />
          );
        })}
      </div>

      {/* Time markers */}
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{formatTime(0)}</span>
        <span>{formatTime(videoDuration)}</span>
      </div>

      {/* Tooltip */}
      {hoveredTopic && (
        <div
          className="fixed z-50 px-3 py-2 text-sm bg-popover text-popover-foreground border border-border rounded-md shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 8,
          }}
        >
          <div className="font-medium">{hoveredTopic.title}</div>
          <div className="text-muted-foreground text-xs">
            {formatTime(hoveredTopic.startMs)} - {formatTime(hoveredTopic.endMs)}
          </div>
        </div>
      )}
    </div>
  );
}
