"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Clock, FileText } from "lucide-react"

interface TranscriptSegment {
  id: string
  text: string
  offset: number
  duration: number
  order: number
}

interface Topic {
  id: string
  title: string
  startMs: number
  endMs: number
  order: number
}

interface TranscriptWithTimestampsProps {
  segments: TranscriptSegment[]
  topics: Topic[]
  videoId: string
}

/**
 * Format milliseconds to MM:SS or HH:MM:SS
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

/**
 * Build YouTube URL with timestamp
 */
function buildYouTubeUrl(videoId: string, offsetMs: number): string {
  const seconds = Math.floor(offsetMs / 1000)
  return `https://www.youtube.com/watch?v=${videoId}&t=${seconds}`
}

/**
 * Group segments by chapter/topic
 */
function groupSegmentsByTopic(segments: TranscriptSegment[], topics: Topic[]): Map<string, TranscriptSegment[]> {
  const grouped = new Map<string, TranscriptSegment[]>()

  // Initialize with topics
  topics.forEach((topic) => {
    grouped.set(topic.id, [])
  })

  // Add an "uncategorized" group for segments before first topic or after last
  grouped.set("uncategorized", [])

  // Assign segments to topics based on their offset
  segments.forEach((segment) => {
    const segmentStart = segment.offset

    // Find the topic that contains this segment
    let assigned = false
    for (const topic of topics) {
      // Segment falls within or overlaps with topic range
      if (segmentStart >= topic.startMs && segmentStart < topic.endMs) {
        const existing = grouped.get(topic.id) || []
        existing.push(segment)
        grouped.set(topic.id, existing)
        assigned = true
        break
      }
    }

    if (!assigned) {
      const uncategorized = grouped.get("uncategorized") || []
      uncategorized.push(segment)
      grouped.set("uncategorized", uncategorized)
    }
  })

  return grouped
}

export function TranscriptWithTimestamps({
  segments,
  topics,
  videoId,
}: TranscriptWithTimestampsProps) {
  const groupedSegments = useMemo(() => {
    return groupSegmentsByTopic(segments, topics)
  }, [segments, topics])

  if (!segments || segments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Transcript not available</p>
        <p className="text-xs mt-1 opacity-70">
          This summary was created before transcript storage was enabled
        </p>
      </div>
    )
  }

  // If no topics, just show all segments flat
  if (topics.length === 0) {
    return (
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {segments.map((segment, index) => (
          <motion.div
            key={segment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <a
              href={buildYouTubeUrl(videoId, segment.offset)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-mono text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              <Clock className="w-3 h-3" />
              {formatTime(segment.offset)}
            </a>
            <p className="text-sm text-slate-700 leading-relaxed">{segment.text}</p>
          </motion.div>
        ))}
      </div>
    )
  }

  // Render segments grouped by topic
  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
      {topics.map((topic, topicIndex) => {
        const topicSegments = groupedSegments.get(topic.id) || []
        if (topicSegments.length === 0) return null

        return (
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: topicIndex * 0.05 }}
            className="space-y-2"
          >
            {/* Topic Header */}
            <div className="flex items-center gap-2 py-2 border-b border-slate-100">
              <a
                href={buildYouTubeUrl(videoId, topic.startMs)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-indigo-600 hover:text-indigo-700 hover:underline flex-shrink-0"
              >
                {formatTime(topic.startMs)}
              </a>
              <h4 className="font-medium text-sm text-slate-900">{topic.title}</h4>
            </div>

            {/* Segments for this topic */}
            <div className="space-y-1 pl-2">
              {topicSegments.map((segment, segIndex) => (
                <motion.div
                  key={segment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: topicIndex * 0.05 + segIndex * 0.01 }}
                  className="flex items-start gap-3 p-1.5 rounded hover:bg-slate-50 transition-colors"
                >
                  <a
                    href={buildYouTubeUrl(videoId, segment.offset)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-xs font-mono text-slate-400 hover:text-indigo-600 hover:underline pt-0.5"
                  >
                    {formatTime(segment.offset)}
                  </a>
                  <p className="text-sm text-slate-600 leading-relaxed">{segment.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )
      })}

      {/* Uncategorized segments */}
      {(() => {
        const uncategorized = groupedSegments.get("uncategorized") || []
        if (uncategorized.length === 0) return null

        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 py-2 border-b border-slate-100">
              <span className="text-xs font-mono text-slate-400 flex-shrink-0">--:--</span>
              <h4 className="font-medium text-sm text-slate-500">Other</h4>
            </div>
            <div className="space-y-1 pl-2">
              {uncategorized.map((segment, index) => (
                <motion.div
                  key={segment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className="flex items-start gap-3 p-1.5 rounded hover:bg-slate-50 transition-colors"
                >
                  <a
                    href={buildYouTubeUrl(videoId, segment.offset)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-xs font-mono text-slate-400 hover:text-indigo-600 hover:underline pt-0.5"
                  >
                    {formatTime(segment.offset)}
                  </a>
                  <p className="text-sm text-slate-600 leading-relaxed">{segment.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )
      })()}
    </div>
  )
}
