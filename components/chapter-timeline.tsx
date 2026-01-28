"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { ExternalLink, Play } from "lucide-react"
import { cn } from "@/lib/utils"

interface Topic {
  id: string
  title: string
  startMs: number
  endMs: number
  order: number
}

interface ChapterTimelineProps {
  topics: Topic[]
  videoId: string
  totalDuration?: number
  className?: string
  variant?: "default" | "compact"
}

// Generate a soft pastel color based on position
function getChapterColor(index: number): string {
  const colors = [
    "hsl(245, 70%, 65%)",   // Indigo
    "hsl(175, 60%, 50%)",   // Teal
    "hsl(280, 55%, 60%)",   // Purple
    "hsl(320, 60%, 60%)",   // Pink
    "hsl(200, 65%, 55%)",   // Blue
    "hsl(150, 55%, 50%)",   // Green
    "hsl(30, 80%, 60%)",    // Orange
    "hsl(0, 70%, 65%)",     // Red
  ]
  return colors[index % colors.length]
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function ChapterTimeline({
  topics,
  videoId,
  totalDuration,
  className,
  variant = "default",
}: ChapterTimelineProps) {
  // Sort topics by order
  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => a.order - b.order)
  }, [topics])

  // Calculate total duration from topics if not provided
  const duration = useMemo(() => {
    if (totalDuration) return totalDuration
    const lastTopic = sortedTopics[sortedTopics.length - 1]
    return lastTopic ? lastTopic.endMs : 0
  }, [totalDuration, sortedTopics])

  if (!topics || topics.length === 0) {
    return null
  }

  if (variant === "compact") {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Mini Timeline bar */}
        <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden">
          {sortedTopics.map((topic, index) => {
            const startPercent = (topic.startMs / duration) * 100
            const widthPercent = ((topic.endMs - topic.startMs) / duration) * 100
            const color = getChapterColor(index)

            return (
              <motion.div
                key={topic.id}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="absolute h-full origin-left"
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  backgroundColor: color,
                }}
              />
            )
          })}
        </div>

        {/* Compact Chapter list */}
        <ul className="space-y-1">
          {sortedTopics.map((topic, index) => {
            const seconds = Math.floor(topic.startMs / 1000)
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`
            const color = getChapterColor(index)

            return (
              <motion.li
                key={topic.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-all duration-200"
                >
                  {/* Color dot */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />

                  {/* Timestamp */}
                  <span className="text-xs font-medium text-slate-400 tabular-nums min-w-[3rem]">
                    {formatTime(topic.startMs)}
                  </span>

                  {/* Title */}
                  <span className="flex-1 text-sm text-slate-700 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {topic.title}
                  </span>

                  {/* External link icon */}
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </a>
              </motion.li>
            )
          })}
        </ul>
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
        <Play className="w-4 h-4" />
        Chapters
      </h3>

      {/* Timeline bar */}
      <div className="relative h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
        {sortedTopics.map((topic, index) => {
          const startPercent = (topic.startMs / duration) * 100
          const widthPercent = ((topic.endMs - topic.startMs) / duration) * 100
          const color = getChapterColor(index)

          return (
            <motion.div
              key={topic.id}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="absolute h-full origin-left"
              style={{
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
                backgroundColor: color,
              }}
            />
          )
        })}
      </div>

      {/* Chapter list */}
      <ul className="space-y-2">
        {sortedTopics.map((topic, index) => {
          const seconds = Math.floor(topic.startMs / 1000)
          const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`
          const color = getChapterColor(index)

          return (
            <motion.li
              key={topic.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-all duration-200"
              >
                {/* Color indicator */}
                <div
                  className="w-1 h-full min-h-[2rem] rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />

                {/* Timestamp */}
                <span className="text-sm font-mono text-slate-400 whitespace-nowrap min-w-[4rem]">
                  {formatTime(topic.startMs)}
                </span>

                {/* Title */}
                <span className="flex-1 text-sm text-slate-700 group-hover:text-indigo-600 transition-colors">
                  {topic.title}
                </span>

                {/* External link icon */}
                <ExternalLink className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
              </a>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
