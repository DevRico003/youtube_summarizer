"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ExternalLink } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface CollapsibleChapterProps {
  title: string
  timestamp?: string
  youtubeLink?: string
  content: string
  index: number
  color: string
  defaultExpanded?: boolean
}

export function CollapsibleChapter({
  title,
  timestamp,
  youtubeLink,
  content,
  index,
  color,
  defaultExpanded = false,
}: CollapsibleChapterProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-slate-200 rounded-xl overflow-hidden bg-white"
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        {/* Color indicator */}
        <div
          className="w-1.5 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />

        {/* Chapter info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">
              Chapter {index + 1}
            </span>
            {timestamp && (
              <span className="text-xs text-slate-400 tabular-nums">
                {timestamp}
              </span>
            )}
          </div>
          <h3 className="font-medium text-slate-800 line-clamp-1">{title}</h3>
        </div>

        {/* YouTube link */}
        {youtubeLink && (
          <a
            href={youtubeLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
            aria-label="Watch on YouTube"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {/* Expand/collapse indicator */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="p-1"
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </button>

      {/* Content - Collapsible */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="pl-4 border-l-2 border-slate-100">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Parse the chapter-based summary content into structured sections
 */
export interface ParsedSummary {
  title: string
  overview: string
  recommendedChapters: Array<{
    name: string
    reason: string
    link?: string
  }>
  chapters: Array<{
    title: string
    timestamp?: string
    link?: string
    content: string
    transition?: string
  }>
  conclusion: string
  rawContent: string
}

export function parseSummaryContent(content: string): ParsedSummary | null {
  try {
    const result: ParsedSummary = {
      title: "",
      overview: "",
      recommendedChapters: [],
      chapters: [],
      conclusion: "",
      rawContent: content,
    }

    // Extract title
    const titleMatch = content.match(/\*\*Title\*\*:\s*(.+?)(?:\n|$)/i)
    if (titleMatch) {
      result.title = titleMatch[1].trim()
    }

    // Extract overview
    const overviewMatch = content.match(/\*\*Overview\*\*:\s*([\s\S]+?)(?=\n\n|\*\*Recommended)/i)
    if (overviewMatch) {
      result.overview = overviewMatch[1].trim()
    }

    // Extract recommended chapters
    const recommendedSection = content.match(/\*\*Recommended Chapters to Watch\*\*:?\s*([\s\S]*?)(?=---|\n##)/i)
    if (recommendedSection) {
      const recLines = recommendedSection[1].split("\n").filter(line => line.trim().startsWith("-"))
      result.recommendedChapters = recLines.map(line => {
        const cleanLine = line.replace(/^-\s*/, "").trim()

        // Match: **Chapter Name** - Reason [(Timestamp)](link). (with optional trailing punctuation)
        // Or: [Chapter Name](link) - Reason
        const fullMatch = cleanLine.match(/^(.+?)\s*-\s*(.+?)\s*\[([^\]]+)\]\(([^)]+)\)\.?$/)
        if (fullMatch) {
          return {
            name: fullMatch[1].trim().replace(/^\*\*|\*\*$/g, ""), // Remove ** markdown
            reason: fullMatch[2].trim(),
            link: fullMatch[4],
          }
        }

        // Fallback: [Name](link) - reason (old format)
        const linkFirstMatch = cleanLine.match(/\[([^\]]+)\]\(([^)]+)\)\s*-?\s*(.*)/)
        if (linkFirstMatch) {
          return {
            name: linkFirstMatch[1],
            link: linkFirstMatch[2],
            reason: linkFirstMatch[3] || "",
          }
        }

        // Fallback: just name - reason (no link)
        const simpleMatch = cleanLine.match(/([^-]+)\s*-\s*(.*)/)
        if (simpleMatch) {
          return {
            name: simpleMatch[1].trim(),
            reason: simpleMatch[2].trim(),
          }
        }

        return { name: cleanLine, reason: "" }
      })
    }

    // Extract chapters using ## Chapter pattern
    const chapterPattern = /##\s*(?:Chapter\s*\d+:\s*)?(.+?)(?:\s*[[(]?([\d:]+)[)\]]?)?\s*(?:\[[^\]]*\]\(([^)]+)\))?\n([\s\S]*?)(?=##|---|\*\*Conclusion|\*\*Fazit|$)/gi
    let chapterMatch
    while ((chapterMatch = chapterPattern.exec(content)) !== null) {
      const [, title, timestamp, linkUrl, chapterContent] = chapterMatch

      // Extract transition if present
      let mainContent = chapterContent
      let transition = ""
      const transitionMatch = chapterContent.match(/→\s*\*([^*]+)\*/i)
      if (transitionMatch) {
        transition = transitionMatch[1].trim()
        mainContent = chapterContent.replace(/→\s*\*[^*]+\*/i, "").trim()
      }

      result.chapters.push({
        title: title.replace(/[[\]]/g, "").trim(),
        timestamp: timestamp || undefined,
        link: linkUrl || undefined,
        content: mainContent.trim(),
        transition: transition || undefined,
      })
    }

    // Extract conclusion
    const conclusionMatch = content.match(/\*\*(?:Conclusion|Fazit|Conclusión|Conclusione|Conclusion)\*\*:\s*([\s\S]*?)$/i)
    if (conclusionMatch) {
      result.conclusion = conclusionMatch[1].trim()
    }

    // Only return parsed result if we found at least some structure
    if (result.title || result.chapters.length > 0 || result.overview) {
      return result
    }

    return null
  } catch (error) {
    console.error("Failed to parse summary content:", error)
    return null
  }
}

// Chapter colors for visual variety
export const CHAPTER_COLORS = [
  "hsl(245, 70%, 65%)",   // Indigo
  "hsl(175, 60%, 50%)",   // Teal
  "hsl(280, 55%, 60%)",   // Purple
  "hsl(320, 60%, 60%)",   // Pink
  "hsl(200, 65%, 55%)",   // Blue
  "hsl(150, 55%, 50%)",   // Green
  "hsl(30, 80%, 60%)",    // Orange
  "hsl(0, 70%, 65%)",     // Red
]

export function getChapterColor(index: number): string {
  return CHAPTER_COLORS[index % CHAPTER_COLORS.length]
}
